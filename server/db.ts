// @ts-nocheck
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { 
  adminUsers, categories, restaurantSections, restaurants, 
  menuItems, users, customers, userAddresses, orders, specialOffers, 
  notifications, ratings, systemSettingsTable as systemSettings, drivers, orderTracking,
  cart, favorites, employees, attendance, leaveRequests, driverEarningsTable,
  driverBalances, driverTransactions, driverCommissions, driverWithdrawals,
  deliveryFeeSettings, deliveryZones, financialReports,
  geoZones, deliveryRules, deliveryDiscounts,
  messages, auditLogs, paymentGateways,
  paymentMethods, paymentMethodDocuments, coupons, couponUsages, restaurantWallets, wasalniRequests,
  driverReviews, walletTransactions, loyaltyTransactions, supportTickets,
  type AdminUser, type InsertAdminUser,
  type Category, type InsertCategory,
  type Restaurant, type InsertRestaurant,
  type RestaurantSection, type InsertRestaurantSection,
  type MenuItem, type InsertMenuItem,
  type User, type InsertUser,
  type UserAddress, type InsertUserAddress,
  type Order, type InsertOrder,
  type SpecialOffer, type InsertSpecialOffer,
  type Notification, type InsertNotification,
  type Rating, type InsertRating,
  type SystemSettings, type InsertSystemSettings,
  type Driver, type InsertDriver,
  type Cart, type InsertCart,
  type Favorites, type InsertFavorites,
  type Employee, type InsertEmployee,
  type Attendance, type InsertAttendance,
  type LeaveRequest, type InsertLeaveRequest,
  type DriverBalance, type InsertDriverBalance,
  type DriverTransaction, type InsertDriverTransaction,
  type DriverCommission, type InsertDriverCommission,
  type DriverWithdrawal, type InsertDriverWithdrawal,
  type GeoZone, type InsertGeoZone,
  type DeliveryRule, type InsertDeliveryRule,
  type DeliveryDiscount, type InsertDeliveryDiscount,
  type Message, type InsertMessage,
  type AuditLog, type InsertAuditLog,
  type PaymentGateway, type InsertPaymentGateway,
  type PaymentMethod, type InsertPaymentMethod,
  type PaymentMethodDocument, type InsertPaymentMethodDocument,
  type Coupon, type InsertCoupon,
  type CouponUsage, type InsertCouponUsage
} from "@shared/schema";
import { IStorage } from "./storage";
import { eq, and, desc, sql, or, like, asc, inArray, isNull } from "drizzle-orm";

// Helper function to configure SSL for cloud PostgreSQL instances
function getSslOption(url: string) {
  if (!url) return undefined;
  // إذا كان الرابط يحتوي على sslmode=disable، لا تستخدم SSL
  if (url.includes("sslmode=disable") || url.includes("ssl=false")) {
    return false;
  }
  const isCloudProvider = url.includes("render.com") || url.includes("dpg-") || url.includes("neon.tech") || url.includes("supabase") || url.includes("aws");
  if (isCloudProvider || process.env.DB_SSL === "true") {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

// Database connection
let db: ReturnType<typeof drizzle> | null = null;
let sqlClient: ReturnType<typeof postgres> | null = null;

// Memory caches for read-heavy static data to make APIs ultra-fast
let uiSettingsMemoryCache: { data: any[]; timestamp: number } | null = null;
let categoriesMemoryCache: { data: any[]; timestamp: number } | null = null;

export function getDb() {
  if (!db) {
    // Use DATABASE_URL from environment variables
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.warn("⚠️ DATABASE_URL is not set in environment variables. Database operations will require DATABASE_URL.");
      return new Proxy({}, {
        get(_target, prop) {
          if (prop === 'then') return undefined;
          return () => {
            throw new Error("DATABASE_URL must be defined in environment variables to execute database operations");
          };
        }
      }) as unknown as ReturnType<typeof drizzle>;
    }
    
    console.log("🗺️ Using PostgreSQL database connection...");  // Debug log
    console.log("🔗 DATABASE_URL exists:", !!databaseUrl);
    
    // Use DATABASE_URL for PostgreSQL connection with SSL support for Render PostgreSQL
    sqlClient = postgres(databaseUrl, {
      ssl: getSslOption(databaseUrl),
      onnotice: (notice) => console.log('🔔 DB Notice:', notice.message),
      max: 20,
      idle_timeout: 30,
      connect_timeout: 15,
      on_error: (err) => {
        console.error('💣 DB Connection Error:', err.message);
      },
    });
    
    // Test the connection immediately and periodically
    const verifyConnection = async () => {
      try {
        if (sqlClient) {
          await sqlClient`SELECT 1`;
          console.log("✅ Render PostgreSQL database connection verified successfully at", new Date().toLocaleTimeString());
        }
      } catch (err: any) {
        console.error("❌ Database connection failed:", err?.message || err);
      }
    };

    verifyConnection();
    
    // Periodically verify connection every 5 minutes
    setInterval(verifyConnection, 5 * 60 * 1000);
    
    // Pass schema to enable db.query functionality
    const schema = {
      adminUsers,
      categories,
      restaurantSections,
      restaurants,
      menuItems,
      users,
      customers,
      userAddresses,
      orders,
      specialOffers,
      notifications,
      ratings,
      systemSettings,
      drivers,
      orderTracking,
      cart,
      favorites,
      employees,
      attendance,
      leaveRequests,
      geoZones,
      deliveryRules,
      deliveryDiscounts
    };
    
    db = drizzle(sqlClient, { schema });
  }
  return db;
}

// ... rest of the DatabaseStorage class remains the same

export class DatabaseStorage {
  get db() {
    return getDb();
  }

  // Admin Authentication
  async createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser> {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminUser.password, salt);
    const [newAdmin] = await this.db.insert(adminUsers).values({ ...adminUser, password: hashedPassword }).returning();
    return newAdmin;
  }

  async getAdminByEmail(emailOrUsername: string): Promise<AdminUser | undefined> {
    const result = await this.db.select().from(adminUsers).where(
      or(
        eq(adminUsers.email, emailOrUsername),
        eq(adminUsers.username, emailOrUsername)
      )
    );
    return result[0];
  }

  async getAdminByPhone(phone: string): Promise<AdminUser | undefined> {
    const result = await this.db.select().from(adminUsers).where(
      eq(adminUsers.phone, phone)
    );
    return result[0];
  }

  async getAdminById(id: string): Promise<AdminUser | undefined> {
    const result = await this.db.select().from(adminUsers).where(
      eq(adminUsers.id, id)
    );
    return result[0];
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    return await this.db.select().from(adminUsers);
  }

  async deleteAdminUser(id: string): Promise<boolean> {
    try {
      const result = await this.db.delete(adminUsers).where(eq(adminUsers.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting admin user:', error);
      throw error;
    }
  }

  // تم حذف وظائف AdminSession - لم تعد مطلوبة بعد إزالة نظام المصادقة

  // Users
  async getUsers(): Promise<User[]> {
    const result = await this.db.select().from(users);
    return Array.isArray(result) ? result : [];
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(user.password, salt);
    const [newUser] = await this.db.insert(users).values({ ...user, password: hashedPassword }).returning();
    return newUser;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    let updateData = { ...userData };
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(userData.password, salt);
    }
    const [updated] = await this.db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      // Set customerId to null in orders
      await this.db.update(orders).set({ customerId: null }).where(eq(orders.customerId, id));
      // Delete user addresses
      await this.db.delete(userAddresses).where(eq(userAddresses.userId, id));
      // Delete from cart
      await this.db.delete(cart).where(eq(cart.userId, id));
      // Delete from favorites
      await this.db.delete(favorites).where(eq(favorites.userId, id));
      // Delete notifications
      await this.db.delete(notifications).where(and(eq(notifications.recipientId, id), eq(notifications.recipientType, 'customer')));

      const result = await this.db.delete(users).where(eq(users.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    const now = Date.now();
    if (categoriesMemoryCache && (now - categoriesMemoryCache.timestamp < 15000)) {
      return categoriesMemoryCache.data;
    }
    try {
      const result = await this.db.select().from(categories);
      const data = Array.isArray(result) ? result : [];
      categoriesMemoryCache = { data, timestamp: now };
      return data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return categoriesMemoryCache?.data || [];
    }
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    categoriesMemoryCache = null;
    const [newCategory] = await this.db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    categoriesMemoryCache = null;
    const [updated] = await this.db.update(categories).set(category).where(eq(categories.id, id)).returning();
    return updated;
  }

  async deleteCategory(id: string): Promise<boolean> {
    categoriesMemoryCache = null;
    try {
      // Set categoryId to null in restaurants
      await this.db.update(restaurants).set({ categoryId: null }).where(eq(restaurants.categoryId, id));
      // Delete special offers linked to this category
      await this.db.delete(specialOffers).where(eq(specialOffers.categoryId, id));
      
      const result = await this.db.delete(categories).where(eq(categories.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  // Restaurants
  async getMainRestaurant(): Promise<Restaurant | undefined> {
    try {
      const allRestaurants = await this.db.select().from(restaurants);
      return allRestaurants.find(r => r.name.includes('السريع ون')) || allRestaurants[0];
    } catch (error) {
      console.error('Error fetching main restaurant:', error);
      return undefined;
    }
  }

  async getRestaurant(id: string): Promise<Restaurant | undefined> {
    const [restaurant] = await this.db.select().from(restaurants).where(eq(restaurants.id, id));
    return restaurant;
  }

  async getRestaurantsByCategory(categoryId: string): Promise<Restaurant[]> {
    return await this.db.select().from(restaurants).where(eq(restaurants.categoryId, categoryId));
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const [newRestaurant] = await this.db.insert(restaurants).values(restaurant).returning();
    return newRestaurant;
  }

  async updateRestaurant(id: string, restaurant: Partial<InsertRestaurant>): Promise<Restaurant | undefined> {
    const [updated] = await this.db.update(restaurants).set(restaurant).where(eq(restaurants.id, id)).returning();
    return updated;
  }

  async deleteRestaurant(id: string): Promise<boolean> {
    try {
      // Set restaurantId to null in menuItems
      await this.db.update(menuItems).set({ restaurantId: null }).where(eq(menuItems.restaurantId, id));
      // Set restaurantId to null in orders
      await this.db.update(orders).set({ restaurantId: null }).where(eq(orders.restaurantId, id));
      // Delete restaurant sections
      await this.db.delete(restaurantSections).where(eq(restaurantSections.restaurantId, id));
      // Delete ratings
      await this.db.delete(ratings).where(eq(ratings.restaurantId, id));
      // Delete special offers
      await this.db.delete(specialOffers).where(eq(specialOffers.restaurantId, id));
      // Delete from favorites
      await this.db.delete(favorites).where(eq(favorites.restaurantId, id));
      // Delete from cart
      await this.db.delete(cart).where(eq(cart.restaurantId, id));
      // Delete from deliveryFeeSettings
      await this.db.delete(deliveryFeeSettings).where(eq(deliveryFeeSettings.restaurantId, id));

      const result = await this.db.delete(restaurants).where(eq(restaurants.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      throw error;
    }
  }

  // Menu Items
  async getRestaurantSections(restaurantId: string): Promise<RestaurantSection[]> {
    return await this.db
      .select()
      .from(restaurantSections)
      .where(eq(restaurantSections.restaurantId, restaurantId))
      .orderBy(restaurantSections.sortOrder);
  }

  async createRestaurantSection(section: InsertRestaurantSection): Promise<RestaurantSection> {
    const [newSection] = await this.db.insert(restaurantSections).values(section).returning();
    return newSection;
  }

  async updateRestaurantSection(id: string, section: Partial<InsertRestaurantSection>): Promise<RestaurantSection | undefined> {
    const [updated] = await this.db.update(restaurantSections).set(section).where(eq(restaurantSections.id, id)).returning();
    return updated;
  }

  async deleteRestaurantSection(id: string): Promise<boolean> {
    const result = await this.db.delete(restaurantSections).where(eq(restaurantSections.id, id)).returning();
    return result.length > 0;
  }

  async getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    if (restaurantId === 'all') {
      return await this.db.select().from(menuItems);
    }
    return await this.db.select().from(menuItems).where(eq(menuItems.restaurantId, restaurantId));
  }

  async getAllMenuItems(): Promise<MenuItem[]> {
    return await this.db.select().from(menuItems);
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    const [item] = await this.db.select().from(menuItems).where(eq(menuItems.id, id));
    return item;
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const [newItem] = await this.db.insert(menuItems).values(menuItem).returning();
    return newItem;
  }

  async updateMenuItem(id: string, menuItem: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const [updated] = await this.db.update(menuItems).set(menuItem).where(eq(menuItems.id, id)).returning();
    return updated;
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    try {
      // Delete from cart
      await this.db.delete(cart).where(eq(cart.menuItemId, id));
      // Delete from favorites
      await this.db.delete(favorites).where(eq(favorites.menuItemId, id));
      // Delete special offers
      await this.db.delete(specialOffers).where(eq(specialOffers.menuItemId, id));
      
      const result = await this.db.delete(menuItems).where(eq(menuItems.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting menu item:', error);
      throw error;
    }
  }

  // Orders
  async getOrders(): Promise<any[]> {
    try {
      const result = await this.db.select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        customerEmail: orders.customerEmail,
        customerId: orders.customerId,
        deliveryAddress: orders.deliveryAddress,
        customerLocationLat: orders.customerLocationLat,
        customerLocationLng: orders.customerLocationLng,
        notes: orders.notes,
        paymentMethod: orders.paymentMethod,
        status: orders.status,
        items: orders.items,
        subtotal: orders.subtotal,
        deliveryFee: orders.deliveryFee,
        total: orders.total,
        totalAmount: orders.totalAmount,
        estimatedTime: orders.estimatedTime,
        driverEarnings: orders.driverEarnings,
        restaurantEarnings: orders.restaurantEarnings,
        companyEarnings: orders.companyEarnings,
        distance: orders.distance,
        restaurantId: orders.restaurantId,
        driverId: orders.driverId,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        restaurantName: restaurants.name,
        restaurantPhone: restaurants.phone,
        restaurantAddress: restaurants.address,
        restaurantImage: restaurants.image,
        restaurantLatitude: restaurants.latitude,
        restaurantLongitude: restaurants.longitude,
        driverName: drivers.name,
        driverPhone: drivers.phone,
      })
      .from(orders)
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .leftJoin(drivers, eq(orders.driverId, drivers.id))
      .orderBy(desc(orders.createdAt));
      
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  async getOrder(id: string): Promise<any | undefined> {
    try {
      const [order] = await this.db.select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        customerEmail: orders.customerEmail,
        customerId: orders.customerId,
        deliveryAddress: orders.deliveryAddress,
        customerLocationLat: orders.customerLocationLat,
        customerLocationLng: orders.customerLocationLng,
        notes: orders.notes,
        paymentMethod: orders.paymentMethod,
        status: orders.status,
        items: orders.items,
        subtotal: orders.subtotal,
        deliveryFee: orders.deliveryFee,
        total: orders.total,
        totalAmount: orders.totalAmount,
        estimatedTime: orders.estimatedTime,
        driverEarnings: orders.driverEarnings,
        restaurantEarnings: orders.restaurantEarnings,
        companyEarnings: orders.companyEarnings,
        distance: orders.distance,
        restaurantId: orders.restaurantId,
        driverId: orders.driverId,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        restaurantName: restaurants.name,
        restaurantPhone: restaurants.phone,
        restaurantAddress: restaurants.address,
        restaurantImage: restaurants.image,
        restaurantLatitude: restaurants.latitude,
        restaurantLongitude: restaurants.longitude,
        driverName: drivers.name,
        driverPhone: drivers.phone,
      })
      .from(orders)
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .leftJoin(drivers, eq(orders.driverId, drivers.id))
      .where(eq(orders.id, id));
      
      return order;
    } catch (error) {
      console.error('Error fetching order:', error);
      return undefined;
    }
  }

  async getOrdersByRestaurant(restaurantId: string): Promise<any[]> {
    try {
      const result = await this.db.select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        deliveryAddress: orders.deliveryAddress,
        status: orders.status,
        items: orders.items,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
        restaurantName: restaurants.name,
      })
      .from(orders)
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .where(eq(orders.restaurantId, restaurantId))
      .orderBy(desc(orders.createdAt));
      
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching restaurant orders:', error);
      return [];
    }
  }

  async getOrdersByCustomer(phone: string, customerId?: string): Promise<any[]> {
    try {
      const cleanPhone = (phone || '').trim().replace(/\s+/g, '');
      // مطابقة برقم الهاتف (مع تجاهل المسافات) أو بمعرّف الحساب لضمان ظهور كل طلبات العميل
      const matchClause = customerId
        ? sql`(REPLACE(${orders.customerPhone}, ' ', '') = ${cleanPhone} OR ${orders.customerId} = ${customerId})`
        : sql`REPLACE(${orders.customerPhone}, ' ', '') = ${cleanPhone}`;
      const result = await this.db.select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        customerEmail: orders.customerEmail,
        customerId: orders.customerId,
        deliveryAddress: orders.deliveryAddress,
        customerLocationLat: orders.customerLocationLat,
        customerLocationLng: orders.customerLocationLng,
        notes: orders.notes,
        paymentMethod: orders.paymentMethod,
        status: orders.status,
        items: orders.items,
        subtotal: orders.subtotal,
        deliveryFee: orders.deliveryFee,
        total: orders.total,
        totalAmount: orders.totalAmount,
        estimatedTime: orders.estimatedTime,
        driverEarnings: orders.driverEarnings,
        restaurantEarnings: orders.restaurantEarnings,
        companyEarnings: orders.companyEarnings,
        distance: orders.distance,
        restaurantId: orders.restaurantId,
        driverId: orders.driverId,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        restaurantName: restaurants.name,
        restaurantPhone: restaurants.phone,
        restaurantAddress: restaurants.address,
        restaurantImage: restaurants.image,
        driverName: drivers.name,
        driverPhone: drivers.phone,
      })
      .from(orders)
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .leftJoin(drivers, eq(orders.driverId, drivers.id))
      .where(matchClause)
      .orderBy(desc(orders.createdAt));
      
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      return [];
    }
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await this.db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updated] = await this.db.update(orders).set(order).where(eq(orders.id, id)).returning();
    return updated;
  }

  // Wasalni
  async getWasalniRequest(id: string): Promise<any | undefined> {
    try {
      const [request] = await this.db.select({
        id: wasalniRequests.id,
        requestNumber: wasalniRequests.requestNumber,
        customerName: wasalniRequests.customerName,
        customerPhone: wasalniRequests.customerPhone,
        customerId: wasalniRequests.customerId,
        fromAddress: wasalniRequests.fromAddress,
        toAddress: wasalniRequests.toAddress,
        fromLat: wasalniRequests.fromLat,
        fromLng: wasalniRequests.fromLng,
        toLat: wasalniRequests.toLat,
        toLng: wasalniRequests.toLng,
        orderType: wasalniRequests.orderType,
        notes: wasalniRequests.notes,
        status: wasalniRequests.status,
        driverId: wasalniRequests.driverId,
        estimatedFee: wasalniRequests.estimatedFee,
        createdAt: wasalniRequests.createdAt,
        updatedAt: wasalniRequests.updatedAt,
        driverName: drivers.name,
        driverPhone: drivers.phone,
      })
      .from(wasalniRequests)
      .leftJoin(drivers, eq(wasalniRequests.driverId, drivers.id))
      .where(eq(wasalniRequests.id, id));
      
      return request;
    } catch (error) {
      console.error('Error fetching wasalni request:', error);
      return undefined;
    }
  }

  async updateWasalniRequest(id: string, data: any): Promise<any | undefined> {
    try {
      const [updated] = await this.db.update(wasalniRequests)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(wasalniRequests.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating wasalni request:', error);
      return undefined;
    }
  }

  // Drivers
  async getDrivers(): Promise<Driver[]> {
    const result = await this.db.select().from(drivers);
    return Array.isArray(result) ? result : [];
  }

  async getDriver(id: string): Promise<Driver | undefined> {
    const [driver] = await this.db.select().from(drivers).where(eq(drivers.id, id));
    return driver;
  }

  async getAvailableDrivers(): Promise<Driver[]> {
    return await this.db.select().from(drivers).where(
      and(
        eq(drivers.isAvailable, true),
        eq(drivers.isActive, true)
      )
    );
  }

  async getClosestDrivers(lat: number, lon: number, limit: number = 5): Promise<(Driver & { distance: number })[]> {
    const availableDrivers = await this.getAvailableDrivers();
    
    const driversWithDistance = availableDrivers
      .filter(driver => driver.latitude !== null && driver.longitude !== null)
      .map(driver => {
        const distance = this.calculateDistance(
          lat,
          lon,
          parseFloat(driver.latitude!),
          parseFloat(driver.longitude!)
        );
        return { ...driver, distance };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
      
    return driversWithDistance;
  }

  async createDriver(driver: InsertDriver): Promise<Driver> {
    try {
      // التحقق من وجود سائق بنفس رقم الهاتف
      const [existingDriver] = await this.db.select().from(drivers).where(eq(drivers.phone, driver.phone)).limit(1);
      if (existingDriver) {
        throw new Error("رقم الهاتف هذا مسجل مسبقاً لسائق آخر");
      }

      // 0. تشفير كلمة المرور إذا كانت موجودة
      let finalDriverData = { ...driver };
      if (driver.password) {
        const salt = await bcrypt.genSalt(10);
        finalDriverData.password = await bcrypt.hash(driver.password, salt);
      }

      // 1. إضافة السائق
      const [newDriver] = await this.db.insert(drivers).values(finalDriverData).returning();
      
      if (!newDriver) {
        throw new Error("فشل في إنشاء السائق");
      }

      // 2. إنشاء سجل أرباح للسائق
      try {
        await this.db.insert(driverEarningsTable).values({
          driverId: newDriver.id,
          totalEarned: "0",
          withdrawn: "0",
          pending: "0"
        });
      } catch (earningsError) {
        console.error("خطأ في إنشاء سجل أرباح السائق:", earningsError);
      }

      // 3. إنشاء سجل رصيد للسائق
      try {
        await this.db.insert(driverBalances).values({
          driverId: newDriver.id,
          totalBalance: "0",
          availableBalance: "0",
          withdrawnAmount: "0",
          pendingAmount: "0"
        });
      } catch (balanceError) {
        console.error("خطأ في إنشاء سجل رصيد السائق:", balanceError);
      }

      return newDriver;
    } catch (error) {
      console.error("Error in createDriver:", error);
      throw error;
    }
  }

  async updateDriver(id: string, driver: Partial<InsertDriver>): Promise<Driver | undefined> {
    let updateData = { ...driver };
    if (driver.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(driver.password, salt);
    }
    const [updated] = await this.db.update(drivers).set(updateData).where(eq(drivers.id, id)).returning();
    
    // إرسال تحديث الموقع عبر WebSocket لضمان تتبع حي في لوحة التحكم
    if (updated && (driver.latitude || driver.longitude) && global.WS_MANAGER) {
      global.WS_MANAGER.broadcast('driver_location', {
        driverId: id,
        latitude: updated.latitude,
        longitude: updated.longitude,
        currentLocation: updated.currentLocation,
        timestamp: Date.now()
      });
    }

    return updated;
  }

  async deleteDriver(id: string): Promise<boolean> {
    try {
      // Set driverId to null in orders and other tables
      await this.db.update(orders).set({ driverId: null }).where(eq(orders.driverId, id));
      await this.db.update(orderTracking).set({ createdBy: null }).where(and(eq(orderTracking.createdBy, id), eq(orderTracking.createdByType, 'driver')));
      
      // Delete from related driver tables
      await this.db.delete(driverBalances).where(eq(driverBalances.driverId, id));
      await this.db.delete(driverTransactions).where(eq(driverTransactions.driverId, id));
      await this.db.delete(driverCommissions).where(eq(driverCommissions.driverId, id));
      await this.db.delete(driverWithdrawals).where(eq(driverWithdrawals.driverId, id));
      await this.db.delete(driverEarningsTable).where(eq(driverEarningsTable.driverId, id));
      
      const result = await this.db.delete(drivers).where(eq(drivers.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting driver:', error);
      throw error;
    }
  }

  // Special Offers
  async getSpecialOffers(): Promise<SpecialOffer[]> {
    const result = await this.db.select().from(specialOffers);
    return Array.isArray(result) ? result : [];
  }

  async getActiveSpecialOffers(): Promise<SpecialOffer[]> {
    const result = await this.db.select().from(specialOffers).where(eq(specialOffers.isActive, true));
    return Array.isArray(result) ? result : [];
  }

  async createSpecialOffer(offer: InsertSpecialOffer): Promise<SpecialOffer> {
    const [newOffer] = await this.db.insert(specialOffers).values(offer).returning();
    return newOffer;
  }

  async updateSpecialOffer(id: string, offer: Partial<InsertSpecialOffer>): Promise<SpecialOffer | undefined> {
    const [updated] = await this.db.update(specialOffers).set(offer).where(eq(specialOffers.id, id)).returning();
    return updated;
  }

  async deleteSpecialOffer(id: string): Promise<boolean> {
    const result = await this.db.delete(specialOffers).where(eq(specialOffers.id, id));
    return result.rowCount > 0;
  }

  // Search methods - removed duplicate methods, keeping enhanced versions below

  // UI Settings (using systemSettings)
  async getUiSettings(): Promise<SystemSettings[]> {
    const now = Date.now();
    if (uiSettingsMemoryCache && (now - uiSettingsMemoryCache.timestamp < 15000)) {
      return uiSettingsMemoryCache.data;
    }
    try {
      const result = await this.db.select().from(systemSettings);
      const data = Array.isArray(result) ? result : [];
      uiSettingsMemoryCache = { data, timestamp: now };
      return data;
    } catch (error) {
      console.error('Error fetching UI settings:', error);
      return uiSettingsMemoryCache?.data || [];
    }
  }

  async getUiSetting(key: string): Promise<SystemSettings | undefined> {
    const settingsList = await this.getUiSettings();
    return settingsList.find((s) => s.key === key);
  }

  async updateUiSetting(key: string, value: string): Promise<SystemSettings | undefined> {
    uiSettingsMemoryCache = null;
    try {
      // Try to update existing setting
      const [updated] = await this.db.update(systemSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(systemSettings.key, key))
        .returning();
      
      if (updated) {
        return updated;
      }
      
      // If no rows were updated, create new setting
      const [newSetting] = await this.db.insert(systemSettings)
        .values({
          key,
          value,
          category: 'ui',
          description: `UI setting: ${key}`,
          isActive: true
        })
        .returning();
      
      return newSetting;
    } catch (error) {
      console.error('Error updating UI setting:', error);
      return undefined;
    }
  }

  async createUiSetting(setting: InsertSystemSettings): Promise<SystemSettings> {
    uiSettingsMemoryCache = null;
    const [newSetting] = await this.db.insert(systemSettings).values(setting).returning();
    return newSetting;
  }

  async deleteUiSetting(key: string): Promise<boolean> {
    uiSettingsMemoryCache = null;
    const result = await this.db.delete(systemSettings).where(eq(systemSettings.key, key));
    return result.rowCount > 0;
  }

  // Notifications
async getNotifications(recipientType?: string, recipientId?: string, unread?: boolean): Promise<Notification[]> {
  try {
    const conditions = [];
    if (recipientType) {
      conditions.push(eq(notifications.recipientType, recipientType));
    }
    if (recipientId) {
      conditions.push(
        or(
          eq(notifications.recipientId, recipientId),
          isNull(notifications.recipientId),
          eq(notifications.recipientId, 'all')
        )
      );
    }
    if (unread !== undefined) {
      conditions.push(eq(notifications.isRead, !unread));
    }
    
    if (conditions.length > 0) {
      return await this.db.select().from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt));
    }
    
    return await this.db.select().from(notifications)
      .orderBy(desc(notifications.createdAt));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const [newNotification] = await this.db.insert(notifications).values(notification).returning();

      // Notify client if WebSocket manager is available
      if (global.WS_MANAGER) {
        // Send based on recipient type
        if (notification.recipientType === 'customer' || notification.recipientType === 'all' || notification.recipientType === 'flutter') {
          if (!notification.recipientId || notification.recipientId === 'all') {
            // Broadcast to all if it's a global notification
            global.WS_MANAGER.broadcast('NEW_NOTIFICATION', newNotification);
          } else {
            // إرسال للمعرّف المحدد (UUID أو رقم هاتف)
            global.WS_MANAGER.sendToUser(notification.recipientId, 'NEW_NOTIFICATION', newNotification);

            // ضمان وصول الإشعار للعميل سواء كان متصلاً برقم الهاتف أو بمعرّف الحساب
            // عبر استخراج المعرّف الآخر من الطلب المرتبط وإرساله أيضاً
            if (notification.orderId) {
              try {
                const [orderRow] = await this.db.select({
                  customerId: orders.customerId,
                  customerPhone: orders.customerPhone,
                }).from(orders).where(eq(orders.id, notification.orderId)).limit(1);

                if (orderRow) {
                  const altIds = [orderRow.customerId, orderRow.customerPhone]
                    .filter((v): v is string => !!v && v !== notification.recipientId);
                  for (const altId of altIds) {
                    global.WS_MANAGER.sendToUser(altId, 'NEW_NOTIFICATION', newNotification);
                  }
                }
              } catch (lookupErr) {
                // فشل البحث عن المعرّف البديل لا يوقف العملية
                console.error('Notification fallback lookup failed:', lookupErr);
              }
            }
          }
          // إعلام لوحة التحكم بأي إشعار عميل جديد للمراقبة العامة
          global.WS_MANAGER.sendToAdmin('NEW_NOTIFICATION', newNotification);
        } else if (notification.recipientType === 'driver' && notification.recipientId) {
          global.WS_MANAGER.sendToDriver(notification.recipientId, 'NEW_NOTIFICATION', newNotification);
          global.WS_MANAGER.sendToAdmin('NEW_NOTIFICATION', newNotification);
        } else if (notification.recipientType === 'admin') {
          // إرسال واحد فقط للمدير لتجنب التكرار
          global.WS_MANAGER.sendToAdmin('NEW_NOTIFICATION', newNotification);
        }
      }

      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    try {
      const [updated] = await this.db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return undefined;
    }
  }


  async createOrderTracking(tracking: InsertOrderTracking): Promise<OrderTracking> {
    const [newTracking] = await this.db.insert(orderTracking).values({
      orderId: tracking.orderId,
      status: tracking.status,
      message: tracking.message,
      createdBy: tracking.createdBy,
      createdByType: tracking.createdByType,
      createdAt: new Date()
    }).returning();
    return newTracking;
  }

  async getOrderTracking(orderId: string) {
    try {
      // Fetch actual tracking from database instead of mock data
      const tracking = await this.db.select()
        .from(orderTracking)
        .where(eq(orderTracking.orderId, orderId))
        .orderBy(asc(orderTracking.createdAt));
      
      return tracking;
    } catch (error) {
      console.error('Error getting order tracking:', error);
      return [];
    }
  }

  // Enhanced Search Functions
  async searchRestaurants(searchTerm: string, categoryId?: string, userLocation?: {lat: number, lon: number}): Promise<Restaurant[]> {
    const conditions = [
      eq(restaurants.isActive, true),
      or(
        like(restaurants.name, `%${searchTerm}%`),
        like(restaurants.description, `%${searchTerm}%`),
        like(restaurants.address, `%${searchTerm}%`)
      )
    ];
    
    if (categoryId) {
      conditions.push(eq(restaurants.categoryId, categoryId));
    }
    
    const result = await this.db.select().from(restaurants)
      .where(and(...conditions))
      .orderBy(restaurants.name);
    
    const restaurants_list = Array.isArray(result) ? result : [];
    
    // Add distance if user location is provided
    if (userLocation) {
      return restaurants_list.map(restaurant => ({
        ...restaurant,
        distance: restaurant.latitude && restaurant.longitude ? 
          this.calculateDistance(
            userLocation.lat,
            userLocation.lon,
            parseFloat(restaurant.latitude),
            parseFloat(restaurant.longitude)
          ) : null
      }));
    }
    
    return restaurants_list;
  }

  async searchCategories(searchTerm: string): Promise<Category[]> {
    const result = await this.db.select().from(categories)
      .where(
        and(
          eq(categories.isActive, true),
          like(categories.name, `%${searchTerm}%`)
        )
      )
      .orderBy(categories.name);
    return Array.isArray(result) ? result : [];
  }

  async searchMenuItems(searchTerm: string): Promise<MenuItem[]> {
    const result = await this.db.select().from(menuItems)
      .where(
        and(
          eq(menuItems.isAvailable, true),
          or(
            like(menuItems.name, `%${searchTerm}%`),
            like(menuItems.description, `%${searchTerm}%`),
            like(menuItems.category, `%${searchTerm}%`)
          )
        )
      )
      .orderBy(menuItems.name);
    return Array.isArray(result) ? result : [];
  }

  // Enhanced Restaurant Functions with Search and Filtering
  async getRestaurants(filters?: { 
    categoryId?: string; 
    area?: string; 
    isOpen?: boolean;
    isFeatured?: boolean;
    isNew?: boolean;
    search?: string;
    sortBy?: 'name' | 'rating' | 'deliveryTime' | 'distance' | 'newest';
    userLatitude?: number;
    userLongitude?: number;
    radius?: number; // in kilometers
  }): Promise<Restaurant[]> {
    const conditions = [eq(restaurants.isActive, true)];
    
    if (filters?.categoryId) {
      conditions.push(eq(restaurants.categoryId, filters.categoryId));
    }
    
    if (filters?.isOpen !== undefined) {
      conditions.push(eq(restaurants.isOpen, filters.isOpen));
    }
    
    if (filters?.isFeatured) {
      conditions.push(eq(restaurants.isFeatured, true));
    }
    
    if (filters?.isNew) {
      conditions.push(eq(restaurants.isNew, true));
    }
    
    if (filters?.search) {
      conditions.push(
        sql`(
          ${restaurants.name} ILIKE ${'%' + filters.search + '%'} OR
          COALESCE(${restaurants.description}, '') ILIKE ${'%' + filters.search + '%'} OR
          COALESCE(${restaurants.address}, '') ILIKE ${'%' + filters.search + '%'}
        )`
      );
    }
    
    // Build and execute query with temporary type assertion for compilation
    let baseQuery: any = this.db.select().from(restaurants);
    
    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions));
    }
    
    // Apply sorting
    switch (filters?.sortBy) {
      case 'rating':
        // Convert varchar rating to numeric for proper sorting
        baseQuery = baseQuery.orderBy(sql`(${restaurants.rating})::numeric DESC`);
        break;
      case 'deliveryTime':
        baseQuery = baseQuery.orderBy(asc(restaurants.deliveryTime));
        break;
      case 'newest':
        baseQuery = baseQuery.orderBy(desc(restaurants.createdAt));
        break;
      case 'distance':
        // Will handle distance sorting in the application layer
        baseQuery = baseQuery.orderBy(restaurants.name);
        break;
      default:
        baseQuery = baseQuery.orderBy(restaurants.name);
    }
    
    const result = await baseQuery;
    const restaurants_list = Array.isArray(result) ? result : [];
    
    // If user location is provided and we're sorting by distance
    if (filters?.userLatitude && filters?.userLongitude && filters?.sortBy === 'distance') {
      return this.sortRestaurantsByDistance(
        restaurants_list, 
        filters.userLatitude, 
        filters.userLongitude,
        filters.radius
      );
    }
    
    // Filter by radius if provided
    if (filters?.userLatitude && filters?.userLongitude && filters?.radius) {
      return restaurants_list.filter(restaurant => {
        if (!restaurant.latitude || !restaurant.longitude) return false;
        const distance = this.calculateDistance(
          filters.userLatitude!,
          filters.userLongitude!,
          parseFloat(restaurant.latitude),
          parseFloat(restaurant.longitude)
        );
        return distance <= filters.radius!;
      });
    }
    
    return restaurants_list;
  }

  // Distance calculation using Haversine formula
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Sort restaurants by distance
  private sortRestaurantsByDistance(
    restaurants_list: Restaurant[], 
    userLat: number, 
    userLon: number,
    maxDistance?: number
  ): Restaurant[] {
    return restaurants_list
      .filter(restaurant => {
        if (!restaurant.latitude || !restaurant.longitude) return false;
        if (!maxDistance) return true;
        
        const distance = this.calculateDistance(
          userLat,
          userLon,
          parseFloat(restaurant.latitude),
          parseFloat(restaurant.longitude)
        );
        return distance <= maxDistance;
      })
      .map(restaurant => ({
        ...restaurant,
        distance: restaurant.latitude && restaurant.longitude ? 
          this.calculateDistance(
            userLat,
            userLon,
            parseFloat(restaurant.latitude),
            parseFloat(restaurant.longitude)
          ) : null
      }))
      .sort((a, b) => (a.distance || 999) - (b.distance || 999));
  }

  // Enhanced search for menu items
  async searchMenuItemsAdvanced(searchTerm: string, restaurantId?: string): Promise<any[]> {
    const conditions = [
      eq(menuItems.isAvailable, true),
      // or(eq(restaurants.isActive, true), isNull(menuItems.restaurantId)), // Allow products without restaurant or from active restaurants
      or(
        like(menuItems.name, `%${searchTerm}%`),
        like(menuItems.description, `%${searchTerm}%`),
        like(menuItems.category, `%${searchTerm}%`)
      )
    ];
    
    if (restaurantId) {
      conditions.push(eq(menuItems.restaurantId, restaurantId));
    }
    
    const query = this.db.select({
      id: menuItems.id,
      name: menuItems.name,
      description: menuItems.description,
      price: menuItems.price,
      originalPrice: menuItems.originalPrice,
      image: menuItems.image,
      category: menuItems.category,
      isAvailable: menuItems.isAvailable,
      isSpecialOffer: menuItems.isSpecialOffer,
      restaurant: {
        id: restaurants.id,
        name: restaurants.name,
        image: restaurants.image,
        deliveryTime: restaurants.deliveryTime,
        deliveryFee: restaurants.deliveryFee
      }
    })
    .from(menuItems)
    .leftJoin(restaurants, eq(menuItems.restaurantId, restaurants.id))
    .where(and(...conditions))
    .orderBy(menuItems.name);
    
    const result = await query;
    return Array.isArray(result) ? result : [];
  }

  // Order Functions
  async getOrderById(id: string): Promise<any | undefined> {
    try {
      const [order] = await this.db.select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        customerEmail: orders.customerEmail,
        customerId: orders.customerId,
        deliveryAddress: orders.deliveryAddress,
        customerLocationLat: orders.customerLocationLat,
        customerLocationLng: orders.customerLocationLng,
        notes: orders.notes,
        paymentMethod: orders.paymentMethod,
        status: orders.status,
        items: orders.items,
        subtotal: orders.subtotal,
        deliveryFee: orders.deliveryFee,
        total: orders.total,
        totalAmount: orders.totalAmount,
        estimatedTime: orders.estimatedTime,
        driverEarnings: orders.driverEarnings,
        restaurantId: orders.restaurantId,
        driverId: orders.driverId,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        restaurantName: restaurants.name,
        restaurantPhone: restaurants.phone,
        restaurantAddress: restaurants.address,
        restaurantImage: restaurants.image,
      })
      .from(orders)
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .where(eq(orders.id, id));
      
      return order;
    } catch (error) {
      console.error('Error fetching order by id:', error);
      return undefined;
    }
  }

  async getCustomerOrders(customerPhone: string): Promise<any[]> {
    try {
      const result = await this.db.select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        deliveryAddress: orders.deliveryAddress,
        status: orders.status,
        items: orders.items,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
        restaurantId: orders.restaurantId,
        restaurantName: restaurants.name,
        restaurantImage: restaurants.image,
      })
      .from(orders)
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .where(eq(orders.customerPhone, customerPhone))
      .orderBy(desc(orders.createdAt));
      
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      return [];
    }
  }

  async updateOrderStatus(orderId: string, status: string): Promise<Order | undefined> {
    const [updated] = await this.db.update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return updated;
  }

  // Cart Functions - وظائف السلة
  async getCartItems(userId: string): Promise<any[]> {
    try {
      const result = await this.db.select({
        id: cart.id,
        quantity: cart.quantity,
        specialInstructions: cart.specialInstructions,
        addedAt: cart.addedAt,
        menuItem: {
          id: menuItems.id,
          name: menuItems.name,
          description: menuItems.description,
          price: menuItems.price,
          image: menuItems.image,
          category: menuItems.category
        },
        restaurant: {
          id: restaurants.id,
          name: restaurants.name,
          image: restaurants.image,
          deliveryFee: restaurants.deliveryFee
        }
      })
      .from(cart)
      .leftJoin(menuItems, eq(cart.menuItemId, menuItems.id))
      .leftJoin(restaurants, eq(cart.restaurantId, restaurants.id))
      .where(eq(cart.userId, userId))
      .orderBy(desc(cart.addedAt));
      
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching cart items:', error);
      return [];
    }
  }

  async addToCart(cartItem: InsertCart): Promise<Cart> {
    try {
      // Check if item already exists in cart
      const existingItemResult = await this.db.select().from(cart)
        .where(
          and(
            eq(cart.userId, cartItem.userId),
            eq(cart.menuItemId, cartItem.menuItemId)
          )
        );
      
      const existingItem = Array.isArray(existingItemResult) ? existingItemResult : [];
      
      if (existingItem.length > 0) {
        // Update quantity
        const [updated] = await this.db.update(cart)
          .set({ 
            quantity: sql`${cart.quantity} + ${cartItem.quantity || 1}`,
            addedAt: new Date()
          })
          .where(eq(cart.id, existingItem[0].id))
          .returning();
        return updated;
      } else {
        // Add new item
        const [newItem] = await this.db.insert(cart).values(cartItem).returning();
        return newItem;
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }

  async updateCartItem(cartId: string, quantity: number): Promise<Cart | undefined> {
    if (quantity <= 0) {
      await this.db.delete(cart).where(eq(cart.id, cartId));
      return undefined;
    }
    
    const [updated] = await this.db.update(cart)
      .set({ quantity, addedAt: new Date() })
      .where(eq(cart.id, cartId))
      .returning();
    return updated;
  }

  async removeFromCart(cartId: string): Promise<boolean> {
    const result = await this.db.delete(cart).where(eq(cart.id, cartId));
    return result.rowCount > 0;
  }

  async clearCart(userId: string): Promise<boolean> {
    const result = await this.db.delete(cart).where(eq(cart.userId, userId));
    return result.rowCount > 0;
  }

  // Favorites Functions - وظائف المفضلة
  async getFavoriteRestaurants(userId: string): Promise<Restaurant[]> {
    try {
      const result = await this.db.select()
      .from(restaurants)
      .innerJoin(favorites, eq(favorites.restaurantId, restaurants.id))
      .where(
        and(
          eq(favorites.userId, userId),
          eq(restaurants.isActive, true)
        )
      )
      .orderBy(desc(favorites.addedAt));
      
      return Array.isArray(result) ? result.map(row => row.restaurants) : [];
    } catch (error) {
      console.error('Error fetching favorite restaurants:', error);
      return [];
    }
  }

  async getFavoriteProducts(userId: string): Promise<MenuItem[]> {
    try {
      const result = await this.db.select()
      .from(menuItems)
      .innerJoin(favorites, eq(favorites.menuItemId, menuItems.id))
      .where(
        and(
          eq(favorites.userId, userId),
          eq(menuItems.isAvailable, true)
        )
      )
      .orderBy(desc(favorites.addedAt));
      
      return Array.isArray(result) ? result.map(row => row.menu_items) : [];
    } catch (error) {
      console.error('Error fetching favorite products:', error);
      return [];
    }
  }

  async addToFavorites(favorite: InsertFavorites): Promise<Favorites> {
    const [newFavorite] = await this.db.insert(favorites)
      .values(favorite)
      .returning();
    return newFavorite;
  }

  async removeFromFavorites(userId: string, restaurantId?: string, menuItemId?: string): Promise<boolean> {
    const conditions = [eq(favorites.userId, userId)];
    
    if (restaurantId) {
      conditions.push(eq(favorites.restaurantId, restaurantId));
    }
    if (menuItemId) {
      conditions.push(eq(favorites.menuItemId, menuItemId));
    }
    
    if (conditions.length === 1) return false;

    const result = await this.db.delete(favorites)
      .where(and(...conditions));
    return result.rowCount > 0;
  }

  async isRestaurantFavorite(userId: string, restaurantId: string): Promise<boolean> {
    const result = await this.db.select().from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.restaurantId, restaurantId)
        )
      );
    return result.length > 0;
  }

  async isProductFavorite(userId: string, menuItemId: string): Promise<boolean> {
    const result = await this.db.select().from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.menuItemId, menuItemId)
        )
      );
    return result.length > 0;
  }

  // User Addresses
  async getUserAddresses(userId: string): Promise<UserAddress[]> {
    try {
      const result = await this.db.select().from(userAddresses)
        .where(eq(userAddresses.userId, userId))
        .orderBy(desc(userAddresses.isDefault), desc(userAddresses.createdAt));
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching user addresses:', error);
      return [];
    }
  }

  async createUserAddress(userId: string, address: InsertUserAddress): Promise<UserAddress> {
    // If this is being set as default, unset other defaults for this user
    if (address.isDefault) {
      await this.db.update(userAddresses)
        .set({ isDefault: false })
        .where(
          and(
            eq(userAddresses.userId, userId),
            eq(userAddresses.isDefault, true)
          )
        );
    }

    const [newAddress] = await this.db.insert(userAddresses)
      .values({
        ...address,
        userId,
        isDefault: address.isDefault ?? false
      })
      .returning();
    return newAddress;
  }

  async updateUserAddress(addressId: string, userId: string, address: Partial<InsertUserAddress>): Promise<UserAddress | undefined> {
    // Verify ownership
    const existingAddress = await this.db.select().from(userAddresses)
      .where(
        and(
          eq(userAddresses.id, addressId),
          eq(userAddresses.userId, userId)
        )
      );
    
    if (existingAddress.length === 0) {
      return undefined;
    }

    // If this is being set as default, unset other defaults for this user
    if (address.isDefault) {
      await this.db.update(userAddresses)
        .set({ isDefault: false })
        .where(
          and(
            eq(userAddresses.userId, userId),
            eq(userAddresses.isDefault, true)
          )
        );
    }

    const [updated] = await this.db.update(userAddresses)
      .set(address)
      .where(eq(userAddresses.id, addressId))
      .returning();
    return updated;
  }

  async deleteUserAddress(addressId: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(userAddresses)
      .where(
        and(
          eq(userAddresses.id, addressId),
          eq(userAddresses.userId, userId)
        )
      );
    return result.rowCount > 0;
  }

  // Ratings
  async getRatings(orderId?: string, restaurantId?: string): Promise<Rating[]> {
    try {
      let query = this.db.select().from(ratings);
      
      if (orderId && restaurantId) {
        query = query.where(
          and(
            eq(ratings.orderId, orderId),
            eq(ratings.restaurantId, restaurantId)
          )
        );
      } else if (orderId) {
        query = query.where(eq(ratings.orderId, orderId));
      } else if (restaurantId) {
        query = query.where(eq(ratings.restaurantId, restaurantId));
      }
      
      const result = await query.orderBy(desc(ratings.createdAt));
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching ratings:', error);
      return [];
    }
  }

  async createRating(rating: InsertRating): Promise<Rating> {
    const [newRating] = await this.db.insert(ratings)
      .values({
        ...rating,
        isApproved: rating.isApproved ?? false
      })
      .returning();
    return newRating;
  }

  // Delivery Fee Settings
  async getDeliveryFeeSettings(restaurantId?: string): Promise<any | undefined> {
    try {
      const conditions = [eq(deliveryFeeSettings.isActive, true)];
      if (restaurantId) {
        conditions.push(eq(deliveryFeeSettings.restaurantId, restaurantId));
      } else {
        conditions.push(isNull(deliveryFeeSettings.restaurantId));
      }
      
      const [settings] = await this.db.select().from(deliveryFeeSettings)
        .where(and(...conditions))
        .orderBy(desc(deliveryFeeSettings.updatedAt));
      
      return settings;
    } catch (error) {
      console.error('Error fetching delivery fee settings:', error);
      return undefined;
    }
  }

  async createDeliveryFeeSettings(settings: any): Promise<any> {
    const [newSettings] = await this.db.insert(deliveryFeeSettings).values(settings).returning();
    return newSettings;
  }

  async updateDeliveryFeeSettings(id: string, settings: any): Promise<any> {
    const [updated] = await this.db.update(deliveryFeeSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(deliveryFeeSettings.id, id))
      .returning();
    return updated;
  }

  // Delivery Zones
  async getDeliveryZones(): Promise<any[]> {
    try {
      return await this.db.select().from(deliveryZones).where(eq(deliveryZones.isActive, true));
    } catch (error) {
      console.error('Error fetching delivery zones:', error);
      return [];
    }
  }

  async createDeliveryZone(zone: any): Promise<any> {
    const [newZone] = await this.db.insert(deliveryZones).values(zone).returning();
    return newZone;
  }

  async updateDeliveryZone(id: string, zone: any): Promise<any> {
    const [updated] = await this.db.update(deliveryZones)
      .set(zone)
      .where(eq(deliveryZones.id, id))
      .returning();
    return updated;
  }

  async deleteDeliveryZone(id: string): Promise<boolean> {
    const result = await this.db.update(deliveryZones)
      .set({ isActive: false })
      .where(eq(deliveryZones.id, id));
    return result.rowCount > 0;
  }

  // Financial Reports
  async createFinancialReport(report: any): Promise<any> {
    const [newReport] = await this.db.insert(financialReports).values(report).returning();
    return newReport;
  }

  async getFinancialReports(type?: string): Promise<any[]> {
    let query = this.db.select().from(financialReports);
    if (type) {
      query = query.where(eq(financialReports.periodType, type));
    }
    return await query.orderBy(desc(financialReports.startDate));
  }

  // HR Management
  async getEmployees(): Promise<Employee[]> {
    try {
      const result = await this.db.select().from(employees).orderBy(asc(employees.name));
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await this.db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await this.db.insert(employees).values(employee).returning();
    return newEmployee;
  }

  async updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [updated] = await this.db.update(employees)
      .set({ ...employee, updatedAt: new Date() })
      .where(eq(employees.id, id))
      .returning();
    return updated;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const result = await this.db.delete(employees).where(eq(employees.id, id));
    return result.rowCount > 0;
  }

  async getAttendance(employeeId?: string, date?: Date): Promise<Attendance[]> {
    try {
      let query = this.db.select().from(attendance);
      const conditions = [];
      
      if (employeeId) {
        conditions.push(eq(attendance.employeeId, employeeId));
      }
      
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        conditions.push(sql`${attendance.date} >= ${startOfDay} AND ${attendance.date} <= ${endOfDay}`);
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const result = await query.orderBy(desc(attendance.date));
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return [];
    }
  }

  async createAttendance(att: InsertAttendance): Promise<Attendance> {
    const [newAttendance] = await this.db.insert(attendance).values(att).returning();
    return newAttendance;
  }

  async updateAttendance(id: string, att: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const [updated] = await this.db.update(attendance)
      .set(att)
      .where(eq(attendance.id, id))
      .returning();
    return updated;
  }

  async getLeaveRequests(employeeId?: string): Promise<LeaveRequest[]> {
    try {
      let query = this.db.select().from(leaveRequests);
      
      if (employeeId) {
        query = query.where(eq(leaveRequests.employeeId, employeeId));
      }
      
      const result = await query.orderBy(desc(leaveRequests.submittedAt));
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      return [];
    }
  }

  async createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest> {
    const [newRequest] = await this.db.insert(leaveRequests).values(request).returning();
    return newRequest;
  }

  async updateLeaveRequest(id: string, request: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined> {
    const [updated] = await this.db.update(leaveRequests)
      .set(request)
      .where(eq(leaveRequests.id, id))
      .returning();
    return updated;
  }

  // ==================== دوال إدارة أرصدة السائقين ====================

  async getDriverBalance(driverId: string): Promise<DriverBalance | null> {
    const [balance] = await this.db.select().from(driverBalances).where(eq(driverBalances.driverId, driverId));
    return balance || null;
  }

  async createDriverBalance(data: InsertDriverBalance): Promise<DriverBalance> {
    const [balance] = await this.db.insert(driverBalances).values(data).returning();
    return balance;
  }

  async updateDriverBalance(driverId: string, data: { amount: number; type: string; description: string; orderId?: any; }): Promise<DriverBalance> {
    const existingBalance = await this.getDriverBalance(driverId);
    
    if (!existingBalance) {
      // إذا لم يكن هناك رصيد، قم بإنشائه
      return await this.createDriverBalance({
        driverId,
        totalBalance: data.type === 'deduction' || data.type === 'withdrawal' ? (-data.amount).toString() : data.amount.toString(),
        availableBalance: data.type === 'deduction' || data.type === 'withdrawal' ? (-data.amount).toString() : data.amount.toString(),
        withdrawnAmount: data.type === 'withdrawal' ? data.amount.toString() : "0",
        pendingAmount: "0"
      });
    }

    const currentTotal = parseFloat(existingBalance.totalBalance);
    const currentAvailable = parseFloat(existingBalance.availableBalance);
    const currentWithdrawn = parseFloat(existingBalance.withdrawnAmount);

    let newTotal = currentTotal;
    let newAvailable = currentAvailable;
    let newWithdrawn = currentWithdrawn;

    if (data.type === 'commission' || data.type === 'salary' || data.type === 'bonus') {
      newTotal += data.amount;
      newAvailable += data.amount;
    } else if (data.type === 'deduction') {
      newTotal -= data.amount;
      newAvailable -= data.amount;
    } else if (data.type === 'withdrawal') {
      newAvailable -= data.amount;
      newWithdrawn += data.amount;
    }

    const [updated] = await this.db.update(driverBalances)
      .set({
        totalBalance: newTotal.toString(),
        availableBalance: newAvailable.toString(),
        withdrawnAmount: newWithdrawn.toString(),
        updatedAt: new Date()
      })
      .where(eq(driverBalances.driverId, driverId))
      .returning();

    return updated;
  }

  // ==================== معاملات السائقين ====================

  async createDriverTransaction(data: Omit<DriverTransaction, 'id' | 'createdAt' | 'balanceBefore' | 'balanceAfter'>): Promise<DriverTransaction> {
    const balance = await this.getDriverBalance(data.driverId);
    const balanceBefore = balance ? parseFloat(balance.availableBalance) : 0;
    
    // تحديث الرصيد أولاً
    await this.updateDriverBalance(data.driverId, { 
      amount: parseFloat(data.amount.toString()), 
      type: data.type,
      description: data.description || `عملية رصيد: ${data.type}`,
      orderId: data.referenceId
    });
    
    const newBalance = await this.getDriverBalance(data.driverId);
    const balanceAfter = newBalance ? parseFloat(newBalance.availableBalance) : balanceBefore;

    const [transaction] = await this.db.insert(driverTransactions).values({
      ...data,
      balanceBefore: balanceBefore.toString(),
      balanceAfter: balanceAfter.toString()
    }).returning();

    return transaction;
  }

  async getDriverTransactions(driverId: string): Promise<DriverTransaction[]> {
    return await this.db.select().from(driverTransactions)
      .where(eq(driverTransactions.driverId, driverId))
      .orderBy(desc(driverTransactions.createdAt));
  }

  async getDriverTransactionsByType(driverId: string, type: string): Promise<DriverTransaction[]> {
    return await this.db.select().from(driverTransactions)
      .where(and(
        eq(driverTransactions.driverId, driverId),
        eq(driverTransactions.type, type)
      ))
      .orderBy(desc(driverTransactions.createdAt));
  }

  // ==================== عمولات السائقين ====================

  async createDriverCommission(data: Omit<DriverCommission, 'id' | 'createdAt'>): Promise<DriverCommission> {
    const [commission] = await this.db.insert(driverCommissions).values(data).returning();
    
    // إضافة معاملة ورصيد عند إنشاء عمولة (إذا كانت الحالة معتمدة)
    if (data.status === 'approved') {
      await this.createDriverTransaction({
        driverId: data.driverId,
        type: 'commission',
        amount: data.commissionAmount,
        description: `عمولة طلب رقم: ${data.orderId}`,
        referenceId: data.orderId
      });
    }

    return commission;
  }

  async getDriverCommissions(driverId: string): Promise<DriverCommission[]> {
    return await this.db.select().from(driverCommissions)
      .where(eq(driverCommissions.driverId, driverId))
      .orderBy(desc(driverCommissions.createdAt));
  }

  async getDriverCommissionById(id: string): Promise<DriverCommission | null> {
    const [commission] = await this.db.select().from(driverCommissions).where(eq(driverCommissions.id, id));
    return commission || null;
  }

  async updateDriverCommission(id: string, data: Partial<DriverCommission>): Promise<DriverCommission | null> {
    const existing = await this.getDriverCommissionById(id);
    if (!existing) return null;

    const [updated] = await this.db.update(driverCommissions)
      .set(data)
      .where(eq(driverCommissions.id, id))
      .returning();

    // إذا تغيرت الحالة إلى approved، أضف المعاملة
    if (data.status === 'approved' && existing.status !== 'approved') {
      await this.createDriverTransaction({
        driverId: updated.driverId,
        type: 'commission',
        amount: updated.commissionAmount,
        description: `عمولة طلب رقم: ${updated.orderId}`,
        referenceId: updated.orderId
      });
    }

    return updated;
  }

  // ==================== سحوبات السائقين ====================

  async createDriverWithdrawal(data: Omit<DriverWithdrawal, 'id' | 'createdAt'>): Promise<DriverWithdrawal> {
    const [withdrawal] = await this.db.insert(driverWithdrawals).values(data).returning();
    return withdrawal;
  }

  async getDriverWithdrawals(driverId: string): Promise<DriverWithdrawal[]> {
    return await this.db.select().from(driverWithdrawals)
      .where(eq(driverWithdrawals.driverId, driverId))
      .orderBy(desc(driverWithdrawals.createdAt));
  }

  async getDriverWithdrawalById(id: string): Promise<DriverWithdrawal | null> {
    const [withdrawal] = await this.db.select().from(driverWithdrawals).where(eq(driverWithdrawals.id, id));
    return withdrawal || null;
  }

  async updateWithdrawal(id: string, data: Partial<DriverWithdrawal>): Promise<DriverWithdrawal | null> {
    const existing = await this.getDriverWithdrawalById(id);
    if (!existing) return null;

    const [updated] = await this.db.update(driverWithdrawals)
      .set({ ...data, processedAt: data.status === 'completed' ? new Date() : undefined })
      .where(eq(driverWithdrawals.id, id))
      .returning();

    // إذا اكتمل السحب، أضف معاملة خصم من الرصيد المتاح
    if (data.status === 'completed' && existing.status !== 'completed') {
      await this.createDriverTransaction({
        driverId: updated.driverId,
        type: 'withdrawal',
        amount: updated.amount,
        description: `سحب رصيد مكتمل`,
        referenceId: updated.id
      });
    }

    return updated;
  }

  async updateOrderCommission(id: string, data: { commissionRate: number; commissionAmount: string; commissionProcessed: boolean }): Promise<Order | undefined> {
    const [updated] = await this.db.update(orders)
      .set({
        driverEarnings: data.commissionAmount,
        // هنا نفترض أن الحقول موجودة في الطلب أو نحتاج لإضافتها
      })
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  // Geo-Zones methods
  async getGeoZones(): Promise<GeoZone[]> {
    return await this.db.select().from(geoZones);
  }

  async getGeoZone(id: string): Promise<GeoZone | undefined> {
    const [zone] = await this.db.select().from(geoZones).where(eq(geoZones.id, id));
    return zone;
  }

  async createGeoZone(zone: InsertGeoZone): Promise<GeoZone> {
    const [newZone] = await this.db.insert(geoZones).values(zone).returning();
    return newZone;
  }

  async updateGeoZone(id: string, zone: Partial<InsertGeoZone>): Promise<GeoZone | undefined> {
    const [updated] = await this.db.update(geoZones).set({ ...zone, updatedAt: new Date() }).where(eq(geoZones.id, id)).returning();
    return updated;
  }

  async deleteGeoZone(id: string): Promise<boolean> {
    const result = await this.db.delete(geoZones).where(eq(geoZones.id, id));
    return result.rowCount > 0;
  }

  // Delivery Rules methods
  async getDeliveryRules(): Promise<DeliveryRule[]> {
    return await this.db.select().from(deliveryRules).orderBy(desc(deliveryRules.priority));
  }

  async getDeliveryRule(id: string): Promise<DeliveryRule | undefined> {
    const [rule] = await this.db.select().from(deliveryRules).where(eq(deliveryRules.id, id));
    return rule;
  }

  async createDeliveryRule(rule: InsertDeliveryRule): Promise<DeliveryRule> {
    const [newRule] = await this.db.insert(deliveryRules).values(rule).returning();
    return newRule;
  }

  async updateDeliveryRule(id: string, rule: Partial<InsertDeliveryRule>): Promise<DeliveryRule | undefined> {
    const [updated] = await this.db.update(deliveryRules).set({ ...rule, updatedAt: new Date() }).where(eq(deliveryRules.id, id)).returning();
    return updated;
  }

  async deleteDeliveryRule(id: string): Promise<boolean> {
    const result = await this.db.delete(deliveryRules).where(eq(deliveryRules.id, id));
    return result.rowCount > 0;
  }

  // Delivery Discounts methods
  async getDeliveryDiscounts(): Promise<DeliveryDiscount[]> {
    return await this.db.select().from(deliveryDiscounts);
  }

  async createDeliveryDiscount(discount: InsertDeliveryDiscount): Promise<DeliveryDiscount> {
    const [newDiscount] = await this.db.insert(deliveryDiscounts).values(discount).returning();
    return newDiscount;
  }

  async updateDeliveryDiscount(id: string, discount: Partial<InsertDeliveryDiscount>): Promise<DeliveryDiscount | undefined> {
    const [updated] = await this.db.update(deliveryDiscounts).set({ ...discount, updatedAt: new Date() }).where(eq(deliveryDiscounts.id, id)).returning();
    return updated;
  }

  async deleteDeliveryDiscount(id: string): Promise<boolean> {
    const result = await this.db.delete(deliveryDiscounts).where(eq(deliveryDiscounts.id, id));
    return result.rowCount > 0;
  }

  // طلبات السحب (النظام المتقدم)
  async createWithdrawalRequest(data: InsertWithdrawalRequest): Promise<WithdrawalRequest> {
    const [request] = await this.db.insert(withdrawalRequests).values(data).returning();
    return request;
  }

  async getWithdrawalRequests(entityId: string, entityType: string): Promise<WithdrawalRequest[]> {
    return await this.db.select().from(withdrawalRequests)
      .where(and(
        eq(withdrawalRequests.entityId, entityId),
        eq(withdrawalRequests.entityType, entityType)
      ))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async getPendingWithdrawalRequests(): Promise<WithdrawalRequest[]> {
    return await this.db.select().from(withdrawalRequests)
      .where(eq(withdrawalRequests.status, 'pending'))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async updateWithdrawalRequest(id: string, updates: Partial<InsertWithdrawalRequest>): Promise<WithdrawalRequest> {
    const [request] = await this.db.update(withdrawalRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(withdrawalRequests.id, id))
      .returning();
    return request;
  }

  // Centralized Order Completion Logic
  async completeOrder(orderId: string): Promise<Order | undefined> {
    try {
      const order = await this.getOrder(orderId);
      if (!order) return undefined;
      if (order.status === 'delivered') return order;

      // 1. Update order status
      const [updatedOrder] = await this.db.update(orders)
        .set({ 
          status: 'delivered', 
          updatedAt: new Date(),
          actualDeliveryTime: new Date(),
          commissionProcessed: true
        })
        .where(eq(orders.id, orderId))
        .returning();

      // 2. Update Driver Earnings and Balance
      if (order.driverId) {
        const driverEarnings = parseFloat(order.driverEarnings?.toString() || order.driverCommissionAmount?.toString() || '0');
        
        if (driverEarnings > 0) {
          // ملاحظة: createDriverCommission تستدعي createDriverTransaction داخلياً
          // والتي بدورها تستدعي updateDriverBalance - لذا لا نستدعي updateDriverBalance مباشرة
          // لتجنب مضاعفة الرصيد

          // Create Driver Commission entry (تتولى تحديث الرصيد داخلياً عبر createDriverTransaction)
          await this.createDriverCommission({
            driverId: order.driverId,
            orderId: order.id,
            orderAmount: parseFloat(order.totalAmount?.toString() || '0'),
            commissionRate: parseFloat(order.driverCommissionRate?.toString() || '70'),
            commissionAmount: driverEarnings,
            status: 'approved'
          });

          // Update driver stats in drivers table
          const driver = await this.getDriver(order.driverId);
          if (driver) {
            const currentEarnings = parseFloat(driver.earnings?.toString() || '0');
            await this.updateDriver(order.driverId, {
              completedOrders: (driver.completedOrders || 0) + 1,
              earnings: (currentEarnings + driverEarnings).toString(),
              isAvailable: true
            });
          }
        } else {
          // Just free the driver if no earnings
          await this.updateDriver(order.driverId, { isAvailable: true });
        }
      }

      // 3. Update Restaurant Earnings and Wallet
      if (order.restaurantId) {
        const restaurantEarnings = parseFloat(order.restaurantEarnings?.toString() || '0');
        if (restaurantEarnings > 0) {
          // Ensure restaurant wallet exists
          let [rWallet] = await this.db.select().from(restaurantWallets).where(eq(restaurantWallets.restaurantId, order.restaurantId));
          if (!rWallet) {
            [rWallet] = await this.db.insert(restaurantWallets).values({
              restaurantId: order.restaurantId,
              balance: "0",
              isActive: true
            }).returning();
          }

          const currentBalance = parseFloat(rWallet.balance?.toString() || "0");
          await this.db.update(restaurantWallets)
            .set({ 
              balance: (currentBalance + restaurantEarnings).toString(),
              updatedAt: new Date()
            })
            .where(eq(restaurantWallets.restaurantId, order.restaurantId));
        }
      }

      // 4. Create Order Tracking entry
      await this.createOrderTracking({
        orderId: order.id,
        status: 'delivered',
        message: 'تم تسليم الطلب بنجاح وتحديث الحسابات المادية',
        createdBy: 'system',
        createdByType: 'system'
      });

      // 5. حذف فوري لبيانات الزائر (طلبات بدون حساب) فور التسليم:
      // الزائر = customerId IS NULL. نحذف الإشعارات والتتبع والطلب نفسه.
      // العميل المسجل: تُحذف بياناته بعد يومين عبر مهمة التنظيف الدورية.
      if (!order.customerId) {
        try {
          // إعطاء فرصة قصيرة للواجهة لتظهر "تم التسليم" قبل الحذف
          setTimeout(() => {
            this.deleteOrderAndAssociated(order.id).catch((err) => {
              console.error('فشل حذف بيانات طلب الزائر بعد التسليم:', err);
            });
          }, 15 * 1000);
        } catch (e) {
          console.error('خطأ في جدولة حذف بيانات طلب الزائر:', e);
        }
      }

      return updatedOrder;
    } catch (error) {
      console.error('Error completing order:', error);
      throw error;
    }
  }

  // حذف طلب وكافة سجلاته التابعة + إشعاراته (يستخدم لطلبات الزوار فور التسليم
  // ولمهمة التنظيف الدورية للطلبات المنتهية الأقدم من يومين).
  async deleteOrderAndAssociated(orderId: string): Promise<void> {
    try {
      const childTables: any[] = [
        orderTracking,
        ratings,
        driverReviews,
        driverCommissions,
        walletTransactions,
        loyaltyTransactions,
        supportTickets,
        messages,
        couponUsages,
      ].filter(Boolean);

      for (const tbl of childTables) {
        try {
          await this.db.delete(tbl).where(eq((tbl as any).orderId, orderId));
        } catch (e) {
          console.error(`خطأ في حذف سجلات تابعة من جدول ${(tbl as any)[Symbol.for('drizzle:Name')] || ''}:`, e);
        }
      }

      try {
        await this.db.delete(notifications).where(eq(notifications.orderId, orderId));
      } catch (_) {}

      try {
        await this.db.delete(orders).where(eq(orders.id, orderId));
      } catch (e) {
        console.error('فشل حذف الطلب:', e);
      }
    } catch (error) {
      console.error('Error deleting order and associated data:', error);
      throw error;
    }
  }

  // Chat/Messages
  async getMessages(orderId: string): Promise<Message[]> {
    return await this.db.select().from(messages)
      .where(eq(messages.orderId, orderId))
      .orderBy(asc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await this.db.insert(messages).values(message).returning();
    return newMessage;
  }

  async markMessagesAsRead(orderId: string, receiverId: string): Promise<void> {
    await this.db.update(messages)
      .set({ isRead: true })
      .where(and(
        eq(messages.orderId, orderId),
        eq(messages.receiverId, receiverId)
      ));
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await this.db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogs(filters?: any): Promise<AuditLog[]> {
    let query = this.db.select().from(auditLogs);
    if (filters?.adminId) {
      // @ts-ignore
      query = query.where(eq(auditLogs.adminId, filters.adminId));
    }
    return await query.orderBy(desc(auditLogs.createdAt));
  }

  // Payment Gateways
  async getPaymentGateways(): Promise<PaymentGateway[]> {
    return await this.db.select().from(paymentGateways);
  }

  async getActivePaymentGateways(): Promise<PaymentGateway[]> {
    return await this.db.select().from(paymentGateways).where(eq(paymentGateways.isActive, true));
  }

  async createPaymentGateway(gateway: InsertPaymentGateway): Promise<PaymentGateway> {
    const [newGateway] = await this.db.insert(paymentGateways).values(gateway).returning();
    return newGateway;
  }

  async updatePaymentGateway(id: string, gateway: Partial<InsertPaymentGateway>): Promise<PaymentGateway | undefined> {
    const [updated] = await this.db.update(paymentGateways).set({ ...gateway, updatedAt: new Date() }).where(eq(paymentGateways.id, id)).returning();
    return updated;
  }

  async deletePaymentGateway(id: string): Promise<boolean> {
    const result = await this.db.delete(paymentGateways).where(eq(paymentGateways.id, id));
    return result.rowCount > 0;
  }

  // Payment Methods (Saudi payment methods)
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return await this.db.select().from(paymentMethods).orderBy(asc(paymentMethods.sortOrder));
  }

  async getActivePaymentMethods(): Promise<PaymentMethod[]> {
    return await this.db.select().from(paymentMethods).where(eq(paymentMethods.isActive, true)).orderBy(asc(paymentMethods.sortOrder));
  }

  async getPaymentMethod(id: string): Promise<PaymentMethod | undefined> {
    const [method] = await this.db.select().from(paymentMethods).where(eq(paymentMethods.id, id));
    return method;
  }

  async createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod> {
    const [newMethod] = await this.db.insert(paymentMethods).values(method).returning();
    return newMethod;
  }

  async updatePaymentMethod(id: string, method: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined> {
    const [updated] = await this.db.update(paymentMethods).set({ ...method, updatedAt: new Date() }).where(eq(paymentMethods.id, id)).returning();
    return updated;
  }

  async deletePaymentMethod(id: string): Promise<boolean> {
    await this.db.delete(paymentMethodDocuments).where(eq(paymentMethodDocuments.paymentMethodId, id));
    const result = await this.db.delete(paymentMethods).where(eq(paymentMethods.id, id));
    return result.rowCount > 0;
  }

  async getPaymentMethodDocuments(paymentMethodId: string): Promise<PaymentMethodDocument[]> {
    return await this.db.select().from(paymentMethodDocuments).where(eq(paymentMethodDocuments.paymentMethodId, paymentMethodId));
  }

  async createPaymentMethodDocument(doc: InsertPaymentMethodDocument): Promise<PaymentMethodDocument> {
    const [newDoc] = await this.db.insert(paymentMethodDocuments).values(doc).returning();
    return newDoc;
  }

  async updatePaymentMethodDocument(id: string, doc: Partial<InsertPaymentMethodDocument>): Promise<PaymentMethodDocument | undefined> {
    const [updated] = await this.db.update(paymentMethodDocuments).set({ ...doc, updatedAt: new Date() }).where(eq(paymentMethodDocuments.id, id)).returning();
    return updated;
  }

  async deletePaymentMethodDocument(id: string): Promise<boolean> {
    const result = await this.db.delete(paymentMethodDocuments).where(eq(paymentMethodDocuments.id, id));
    return result.rowCount > 0;
  }

  // Coupons
  async getCoupons(): Promise<Coupon[]> {
    return await this.db.select().from(coupons).orderBy(desc(coupons.createdAt));
  }

  async getCouponByCode(code: string): Promise<Coupon | undefined> {
    const [coupon] = await this.db.select().from(coupons).where(eq(coupons.code, code.toUpperCase()));
    return coupon;
  }

  async createCoupon(couponData: InsertCoupon): Promise<Coupon> {
    const data: any = { ...couponData, code: couponData.code.toUpperCase() };
    if (data.startDate && typeof data.startDate === 'string') data.startDate = new Date(data.startDate);
    if (data.endDate && typeof data.endDate === 'string') data.endDate = new Date(data.endDate);
    const [newCoupon] = await this.db.insert(coupons).values(data).returning();
    return newCoupon;
  }

  async updateCoupon(id: string, couponData: Partial<InsertCoupon>): Promise<Coupon | undefined> {
    const updateData: any = { ...couponData, updatedAt: new Date() };
    if (updateData.code) updateData.code = updateData.code.toUpperCase();
    if (updateData.startDate && typeof updateData.startDate === 'string') updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate && typeof updateData.endDate === 'string') updateData.endDate = new Date(updateData.endDate);
    const [updated] = await this.db.update(coupons).set(updateData).where(eq(coupons.id, id)).returning();
    return updated;
  }

  async deleteCoupon(id: string): Promise<boolean> {
    const result = await this.db.delete(coupons).where(eq(coupons.id, id));
    return result.rowCount > 0;
  }

  async validateCoupon(code: string, orderValue: number, userId?: string, userPhone?: string): Promise<{ valid: boolean; coupon?: Coupon; discount?: number; message?: string }> {
    const coupon = await this.getCouponByCode(code);
    if (!coupon) return { valid: false, message: "الكوبون غير موجود" };
    if (!coupon.isActive) return { valid: false, message: "الكوبون غير نشط" };
    
    const now = new Date();
    if (coupon.startDate && new Date(coupon.startDate) > now) return { valid: false, message: "الكوبون لم يبدأ بعد" };
    if (coupon.endDate && new Date(coupon.endDate) < now) return { valid: false, message: "انتهت صلاحية الكوبون" };
    if (coupon.minOrderValue && orderValue < parseFloat(String(coupon.minOrderValue))) {
      return { valid: false, message: `الحد الأدنى للطلب ${coupon.minOrderValue} ريال` };
    }
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, message: "تم استنفاذ الكوبون" };
    }

    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (orderValue * parseFloat(String(coupon.value))) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, parseFloat(String(coupon.maxDiscount)));
    } else {
      discount = parseFloat(String(coupon.value));
    }
    discount = Math.min(discount, orderValue);

    return { valid: true, coupon, discount };
  }

  async useCoupon(couponId: string, data: InsertCouponUsage): Promise<void> {
    await this.db.insert(couponUsages).values(data);
    await this.db.update(coupons).set({ usageCount: sql`${coupons.usageCount} + 1` }).where(eq(coupons.id, couponId));
  }

  // Detailed Reports
  async getDetailedReport(filters: any): Promise<any> {
    const { type, startDate, endDate } = filters || {};
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const allOrders = await this.db.select().from(orders)
      .where(and(sql`${orders.createdAt} >= ${start}`, sql`${orders.createdAt} <= ${end}`));

    const statusLabel: Record<string, string> = {
      pending: 'قيد الانتظار',
      confirmed: 'مؤكد',
      preparing: 'قيد التحضير',
      ready: 'جاهز',
      picked_up: 'تم الاستلام',
      on_way: 'في الطريق',
      delivered: 'تم التوصيل',
      cancelled: 'ملغى',
    };
    const statusColor: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      preparing: 'bg-orange-100 text-orange-700',
      ready: 'bg-purple-100 text-purple-700',
      picked_up: 'bg-indigo-100 text-indigo-700',
      on_way: 'bg-cyan-100 text-cyan-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };

    if (type === 'orders') {
      const total = allOrders.reduce((s, o) => s + parseFloat(String(o.total || 0)), 0);
      const delivered = allOrders.filter(o => o.status === 'delivered').length;
      const cancelled = allOrders.filter(o => o.status === 'cancelled').length;
      const avgOrder = allOrders.length > 0 ? (total / allOrders.length).toFixed(2) : '0';
      const summary = [
        { name: 'إجمالي الطلبات', details: `من ${start.toLocaleDateString('ar')} إلى ${end.toLocaleDateString('ar')}`, value: `${allOrders.length} طلب`, status: 'إجمالي', statusColor: 'bg-blue-100 text-blue-700' },
        { name: 'إجمالي الإيرادات', details: 'مجموع قيم جميع الطلبات', value: `${total.toFixed(2)} ر.س`, status: 'إيرادات', statusColor: 'bg-green-100 text-green-700' },
        { name: 'طلبات مكتملة', details: 'الطلبات التي تم توصيلها بنجاح', value: `${delivered} طلب`, status: 'مكتمل', statusColor: 'bg-green-100 text-green-700' },
        { name: 'طلبات ملغاة', details: 'الطلبات التي تم إلغاؤها', value: `${cancelled} طلب`, status: 'ملغى', statusColor: 'bg-red-100 text-red-700' },
        { name: 'معدل إتمام الطلبات', details: 'نسبة الطلبات المكتملة', value: allOrders.length > 0 ? `${((delivered / allOrders.length) * 100).toFixed(1)}%` : '0%', status: 'نسبة', statusColor: 'bg-purple-100 text-purple-700' },
        { name: 'متوسط قيمة الطلب', details: 'متوسط قيمة الطلب الواحد', value: `${avgOrder} ر.س`, status: 'متوسط', statusColor: 'bg-orange-100 text-orange-700' },
      ];
      const orderRows = allOrders.slice(0, 50).map(o => ({
        name: `طلب #${o.orderNumber || o.id}`,
        details: `${new Date(o.createdAt!).toLocaleDateString('ar')} - ${o.customerName || 'عميل'}`,
        value: `${parseFloat(String(o.total || 0)).toFixed(2)} ر.س`,
        status: statusLabel[o.status || ''] || o.status || '',
        statusColor: statusColor[o.status || ''] || 'bg-gray-100 text-gray-700',
      }));
      return { data: [...summary, ...orderRows] };
    }

    if (!type || type === 'products') {
      const items = await this.db.select().from(menuItems);
      const data = items.map(item => ({
        name: item.name,
        details: item.category || '',
        value: `${parseFloat(String(item.price || 0)).toFixed(2)} ر.س`,
        status: item.isAvailable ? 'متاح' : 'غير متاح',
        statusColor: item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
      }));
      return { data };
    }

    if (type === 'drivers') {
      const driversData = await this.db.select().from(drivers);
      const data = driversData.map(d => ({
        name: d.name || d.phone,
        details: d.phone || '',
        value: `${allOrders.filter(o => o.driverId === d.id).length} توصيلة`,
        status: d.isActive ? 'نشط' : 'غير نشط',
        statusColor: d.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700',
      }));
      return { data };
    }

    if (type === 'customers') {
      const usersData = await this.db.select().from(users);
      const data = usersData.map(u => ({
        name: u.name || u.phone,
        details: u.phone || '',
        value: `${allOrders.filter(o => o.customerId === u.id).length} طلب`,
        status: u.isActive ? 'نشط' : 'غير نشط',
        statusColor: u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700',
      }));
      return { data };
    }

    if (type === 'admins') {
      const adminsData = await this.db.select().from(adminUsers);
      const data = adminsData.map((a: any) => ({
        name: a.name || a.email,
        details: a.phone || a.email || '',
        value: a.userType === 'admin' ? 'مدير رئيسي' : 'مشرف فرعي',
        status: a.isActive ? 'نشط' : 'غير نشط',
        statusColor: a.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
      }));
      return { data };
    }

    const total = allOrders.reduce((s, o) => s + parseFloat(String(o.total || 0)), 0);
    const delivered = allOrders.filter(o => o.status === 'delivered').length;
    const cancelled = allOrders.filter(o => o.status === 'cancelled').length;
    return {
      data: [
        { name: 'إجمالي الطلبات', details: `من ${start.toLocaleDateString('ar')} إلى ${end.toLocaleDateString('ar')}`, value: `${allOrders.length} طلب`, status: 'إجمالي', statusColor: 'bg-blue-100 text-blue-700' },
        { name: 'إجمالي الإيرادات', details: 'مجموع قيم جميع الطلبات', value: `${total.toFixed(2)} ر.س`, status: 'إيرادات', statusColor: 'bg-green-100 text-green-700' },
        { name: 'طلبات مكتملة', details: 'الطلبات التي تم توصيلها', value: `${delivered} طلب`, status: 'مكتمل', statusColor: 'bg-green-100 text-green-700' },
        { name: 'طلبات ملغاة', details: 'الطلبات التي تم إلغاؤها', value: `${cancelled} طلب`, status: 'ملغى', statusColor: 'bg-red-100 text-red-700' },
        { name: 'معدل الإتمام', details: 'نسبة الطلبات المكتملة', value: allOrders.length > 0 ? `${((delivered / allOrders.length) * 100).toFixed(1)}%` : '0%', status: 'نسبة', statusColor: 'bg-purple-100 text-purple-700' },
      ]
    };
  }
}

export const dbStorage = new DatabaseStorage();
