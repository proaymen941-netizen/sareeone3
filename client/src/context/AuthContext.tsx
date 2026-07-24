import React, { createContext, useContext, useState, useEffect } from 'react';

// نوع المستخدم الموحد
export interface AuthUser {
  id: string;
  name: string;
  username?: string;
  email?: string;
  phone?: string;
  userType: 'customer' | 'driver' | 'admin';
  isActive: boolean;
}

// حالة المصادقة
interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

// نوع السياق
interface AuthContextType extends AuthState {
  login: (identifier: string, password: string, userType?: 'customer' | 'driver' | 'admin') => Promise<{ success: boolean; message: string }>;
  register: (userData: any) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: true,
  });

  // التحقق من الجلسة المحفوظة عند بدء التطبيق
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await validateToken(token);
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('خطأ في تهيئة المصادقة:', error);
      clearAuthState();
    }
  };

  const validateToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        // حفظ رقم الهاتف في localStorage لاستخدامه في صفحة الطلبات والإشعارات
        if (userData.user?.phone) {
          localStorage.setItem('customer_phone', userData.user.phone);
        }
        setAuthState({
          isAuthenticated: true,
          user: userData.user,
          token: token,
          loading: false,
        });
      } else {
        clearAuthState();
      }
    } catch (error) {
      console.error('خطأ في التحقق من الرمز:', error);
      clearAuthState();
    }
  };

  const clearAuthState = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('customer_phone');
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
    });
  };

  const login = async (
    identifier: string, 
    password: string, 
    userType?: 'customer' | 'driver' | 'admin'
  ): Promise<{ success: boolean; message: string }> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));

      let endpoint = '/api/auth/login';
      let body: any = { identifier, password };

      if (userType === 'admin') {
        endpoint = '/api/auth/admin/login';
        body = { email: identifier, password };
      } else if (userType === 'driver') {
        endpoint = '/api/auth/driver/login';
        body = { phone: identifier, password };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        localStorage.setItem('auth_token', result.token);
        // حفظ رقم الهاتف لاستخدامه في جلب الطلبات والإشعارات
        if (result.user?.phone) {
          localStorage.setItem('customer_phone', result.user.phone);
        }
        setAuthState({
          isAuthenticated: true,
          user: result.user,
          token: result.token,
          loading: false,
        });
        return { success: true, message: result.message || 'تم تسجيل الدخول بنجاح' };
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
        return { success: false, message: result.message || 'فشل في تسجيل الدخول' };
      }
    } catch (error) {
      console.error('خطأ في تسجيل الدخول:', error);
      setAuthState(prev => ({ ...prev, loading: false }));
      return { success: false, message: 'حدث خطأ غير متوقع' };
    }
  };

  const register = async (userData: any): Promise<{ success: boolean; message: string }> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        localStorage.setItem('auth_token', result.token);
        // حفظ رقم الهاتف لاستخدامه في جلب الطلبات والإشعارات
        if (result.user?.phone) {
          localStorage.setItem('customer_phone', result.user.phone);
        }
        setAuthState({
          isAuthenticated: true,
          user: result.user,
          token: result.token,
          loading: false,
        });
        return { success: true, message: result.message || 'تم إنشاء الحساب بنجاح' };
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
        return { success: false, message: result.message || 'فشل في إنشاء الحساب' };
      }
    } catch (error) {
      console.error('خطأ في التسجيل:', error);
      setAuthState(prev => ({ ...prev, loading: false }));
      return { success: false, message: 'حدث خطأ غير متوقع' };
    }
  };

  const logout = async () => {
    try {
      const token = authState.token;
      if (token) {
        // إشعار الخادم بتسجيل الخروج
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
    } finally {
      clearAuthState();
    }
  };

  const refreshUser = async () => {
    if (authState.token) {
      await validateToken(authState.token);
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};