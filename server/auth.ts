import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { storage } from './storage';
import { 
  type InsertAdminUser, 
  type User,
  type Driver,
  type AdminUser
} from '@shared/schema';

// نوع بيانات الجلسة
interface SessionData {
  adminId: string;
  userType: string;
  expiresAt: Date;
}

// نوع إدخال الجلسة
interface InsertAdminSession {
  adminId: string;
  token: string;
  userType: string;
  expiresAt: Date;
}

// مخزن الجلسات في الذاكرة
const sessionStore = new Map<string, SessionData>();

// دوال إدارة الجلسات
function createAdminSession(data: InsertAdminSession): void {
  sessionStore.set(data.token, {
    adminId: data.adminId,
    userType: data.userType,
    expiresAt: data.expiresAt
  });
}

function getAdminSession(token: string): SessionData | null {
  return sessionStore.get(token) || null;
}

function deleteAdminSession(token: string): boolean {
  return sessionStore.delete(token);
}

// نوع المستخدم الموحد للمصادقة
export interface AuthUser {
  id: string;
  name: string;
  username?: string;
  email?: string;
  phone?: string;
  userType: 'customer' | 'driver' | 'admin';
  isActive: boolean;
}

// نتيجة المصادقة
export interface AuthResult {
  success: boolean;
  token?: string;
  user?: AuthUser;
  message?: string;
}

// خدمة المصادقة الموحدة
export class UnifiedAuthService {
  // تشفير كلمة المرور
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  // التحقق من كلمة المرور
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // البحث عن المستخدم بالمعرف (اسم المستخدم، البريد الإلكتروني، أو رقم الهاتف)
  async findUserByIdentifier(identifier: string, userType?: 'customer' | 'driver' | 'admin'): Promise<AuthUser | null> {
    try {
      // البحث في جدول المستخدمين (العملاء)
      if (!userType || userType === 'customer') {
        const users = await storage.getAllUsers();
        const user = users.find(u => 
          u.username === identifier || 
          u.email === identifier || 
          u.phone === identifier
        );
        if (user) {
          return {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email || undefined,
            phone: user.phone || undefined,
            userType: 'customer',
            isActive: user.isActive
          };
        }
      }

      // البحث في جدول السائقين
      if (!userType || userType === 'driver') {
        const drivers = await storage.getAllDrivers();
        const driver = drivers.find(d => 
          d.username === identifier || 
          d.email === identifier || 
          d.phone === identifier
        );
        if (driver) {
          return {
            id: driver.id,
            name: driver.name,
            username: driver.username || undefined,
            email: driver.email || undefined,
            phone: driver.phone,
            userType: 'driver',
            isActive: driver.isActive
          };
        }
      }

      // البحث في جدول المديرين
      if (!userType || userType === 'admin') {
        const admins = await storage.getAllAdminUsers();
        const admin = admins.find(a => 
          a.username === identifier || 
          a.email === identifier || 
          a.phone === identifier
        );
        if (admin) {
          return {
            id: admin.id,
            name: admin.name,
            username: admin.username || undefined,
            email: admin.email,
            phone: admin.phone || undefined,
            userType: 'admin',
            isActive: admin.isActive
          };
        }
      }

      return null;
    } catch (error) {
      console.error('خطأ في البحث عن المستخدم:', error);
      return null;
    }
  }

  // الحصول على كلمة المرور المشفرة للمستخدم
  async getUserPassword(user: AuthUser): Promise<string | null> {
    try {
      switch (user.userType) {
        case 'customer':
          const customerUser = await storage.getUserById(user.id);
          return customerUser?.password || null;
        
        case 'driver':
          const driver = await storage.getDriverById(user.id);
          return driver?.password || null;
        
        case 'admin':
          const admin = await storage.getAdminById(user.id);
          return admin?.password || null;
        
        default:
          return null;
      }
    } catch (error) {
      console.error('خطأ في الحصول على كلمة المرور:', error);
      return null;
    }
  }

  // تسجيل الدخول الموحد
  async login(identifier: string, password: string, userType?: 'customer' | 'driver' | 'admin'): Promise<AuthResult> {
    try {
      console.log('🔍 محاولة تسجيل دخول للمعرف:', identifier, 'نوع المستخدم:', userType || 'جميع الأنواع');
      
      // البحث عن المستخدم
      const user = await this.findUserByIdentifier(identifier, userType);
      if (!user) {
        return { 
          success: false, 
          message: 'بيانات الدخول غير صحيحة' 
        };
      }

      console.log('✅ تم العثور على المستخدم:', user.name, 'النوع:', user.userType);

      // التحقق من حالة الحساب
      if (!user.isActive) {
        return { 
          success: false, 
          message: 'الحساب غير مفعل' 
        };
      }

      // التحقق من كلمة المرور
      const hashedPassword = await this.getUserPassword(user);
      if (!hashedPassword) {
        return { 
          success: false, 
          message: 'خطأ في الحصول على بيانات المستخدم' 
        };
      }

      const isPasswordValid = await this.verifyPassword(password, hashedPassword);
      if (!isPasswordValid) {
        return { 
          success: false, 
          message: 'بيانات الدخول غير صحيحة' 
        };
      }

      // إنشاء الجلسة
      const token = randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 ساعة

      const sessionData: InsertAdminSession = {
        adminId: user.id,
        token,
        userType: user.userType,
        expiresAt
      };

      createAdminSession(sessionData);

      console.log('🎉 تم تسجيل الدخول بنجاح للمستخدم:', user.name);
      
      return { 
        success: true, 
        token, 
        user,
        message: 'تم تسجيل الدخول بنجاح' 
      };

    } catch (error) {
      console.error('خطأ في تسجيل الدخول:', error);
      return { 
        success: false, 
        message: 'حدث خطأ في الخادم' 
      };
    }
  }

  // التحقق من صحة الجلسة
  async validateSession(token: string): Promise<{ valid: boolean; user?: AuthUser }> {
    try {
      const session = await storage.getAdminSession(token);
      if (!session) {
        return { valid: false };
      }

      // التحقق من انتهاء صلاحية الجلسة
      if (new Date() > session.expiresAt) {
        await storage.deleteAdminSession(token);
        return { valid: false };
      }

      // الحصول على بيانات المستخدم حسب النوع
      let user: AuthUser | null = null;
      
      switch (session.userType) {
        case 'customer':
          const customer = await storage.getUserById(session.adminId!);
          if (customer) {
            user = {
              id: customer.id,
              name: customer.name,
              username: customer.username,
              email: customer.email || undefined,
              phone: customer.phone || undefined,
              userType: 'customer',
              isActive: customer.isActive
            };
          }
          break;
          
        case 'driver':
          const driver = await storage.getDriverById(session.adminId!);
          if (driver) {
            user = {
              id: driver.id,
              name: driver.name,
              username: driver.username || undefined,
              email: driver.email || undefined,
              phone: driver.phone,
              userType: 'driver',
              isActive: driver.isActive
            };
          }
          break;
          
        case 'admin':
          const admin = await storage.getAdminById(session.adminId!);
          if (admin) {
            user = {
              id: admin.id,
              name: admin.name,
              username: admin.username || undefined,
              email: admin.email,
              phone: admin.phone || undefined,
              userType: 'admin',
              isActive: admin.isActive
            };
          }
          break;
      }

      if (!user) {
        return { valid: false };
      }

      return { valid: true, user };
    } catch (error) {
      console.error('خطأ في التحقق من الجلسة:', error);
      return { valid: false };
    }
  }

  // تسجيل الخروج
  async logout(token: string): Promise<boolean> {
    try {
      return await storage.deleteAdminSession(token);
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
      return false;
    }
  }

  // إنشاء مستخدم جديد
  async createUser(userData: {
    name: string;
    username?: string;
    email?: string;
    phone?: string;
    password: string;
    userType: 'customer' | 'driver' | 'admin';
    isActive?: boolean;
  }): Promise<AuthResult> {
    try {
      const hashedPassword = await this.hashPassword(userData.password);
      
      switch (userData.userType) {
        case 'customer':
          if (!userData.username) {
            return { success: false, message: 'اسم المستخدم مطلوب للعملاء' };
          }
          const newUser = await storage.createUser({
            name: userData.name,
            username: userData.username,
            email: userData.email || '',
            phone: userData.phone || '',
            password: hashedPassword,
            address: '',
            isActive: userData.isActive ?? true
          });
          return { 
            success: true, 
            user: {
              id: newUser.id,
              name: newUser.name,
              username: newUser.username,
              email: newUser.email || undefined,
              phone: newUser.phone || undefined,
              userType: 'customer',
              isActive: newUser.isActive
            },
            message: 'تم إنشاء حساب العميل بنجاح'
          };

        case 'driver':
          if (!userData.phone) {
            return { success: false, message: 'رقم الهاتف مطلوب للسائقين' };
          }
          const newDriver = await storage.createDriver({
            name: userData.name,
            username: userData.username,
            email: userData.email,
            phone: userData.phone,
            password: hashedPassword,
            userType: 'driver',
            isAvailable: true,
            isActive: userData.isActive ?? true,
            currentLocation: '',
            earnings: '0'
          });
          return { 
            success: true, 
            user: {
              id: newDriver.id,
              name: newDriver.name,
              username: newDriver.username || undefined,
              email: newDriver.email || undefined,
              phone: newDriver.phone,
              userType: 'driver',
              isActive: newDriver.isActive
            },
            message: 'تم إنشاء حساب السائق بنجاح'
          };

        case 'admin':
          if (!userData.email) {
            return { success: false, message: 'البريد الإلكتروني مطلوب للمديرين' };
          }
          const newAdmin = await storage.createAdminUser({
            name: userData.name,
            username: userData.username,
            email: userData.email,
            phone: userData.phone,
            password: hashedPassword,
            userType: 'admin',
            isActive: userData.isActive ?? true
          });
          return { 
            success: true, 
            user: {
              id: newAdmin.id,
              name: newAdmin.name,
              username: newAdmin.username || undefined,
              email: newAdmin.email,
              phone: newAdmin.phone || undefined,
              userType: 'admin',
              isActive: newAdmin.isActive
            },
            message: 'تم إنشاء حساب المدير بنجاح'
          };

        default:
          return { success: false, message: 'نوع المستخدم غير صحيح' };
      }
    } catch (error) {
      console.error('خطأ في إنشاء المستخدم:', error);
      return { success: false, message: 'حدث خطأ في إنشاء الحساب' };
    }
  }
}

// إنشاء مثيل خدمة المصادقة الموحدة
export const unifiedAuthService = new UnifiedAuthService();