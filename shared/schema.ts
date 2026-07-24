import { pgTable, text, uuid, timestamp, boolean, integer, decimal, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Users table (customers)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 50 }).unique(),
  password: text("password"),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 100 }),
  address: text("address"),
  googleId: text("google_id"),
  appleId: text("apple_id"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Customers table (alias for users)
export const customers = users;

// User addresses table
export const userAddresses = pgTable("user_addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // تمت الإضافة: home, work, other
  title: varchar("title", { length: 100 }).notNull(),
  address: text("address").notNull(),
  details: text("details"), // تمت الإضافة
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Categories table
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 100 }).notNull(),
  image: text("image"), // تمت الإضافة: صورة القسم
  type: varchar("type", { length: 50 }).default("primary"), // primary, secondary, style
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Restaurants table (Stores)
export const restaurants = pgTable("restaurants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  image: text("image").notNull(),
  phone: varchar("phone", { length: 20 }),
  rating: varchar("rating", { length: 10 }).default("0.0"),
  reviewCount: integer("review_count").default(0),
  deliveryTime: varchar("delivery_time", { length: 50 }).notNull(),
  isOpen: boolean("is_open").default(true).notNull(),
  minimumOrder: decimal("minimum_order", { precision: 10, scale: 2 }).default("0"),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0"),
  perKmFee: decimal("per_km_fee", { precision: 10, scale: 2 }).default("0"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("0"),
  categoryId: uuid("category_id").references(() => categories.id),
  openingTime: varchar("opening_time", { length: 50 }).default("08:00"),
  closingTime: varchar("closing_time", { length: 50 }).default("23:00"),
  workingDays: varchar("working_days", { length: 50 }).default("0,1,2,3,4,5,6"),
  isTemporarilyClosed: boolean("is_temporarily_closed").default(false),
  temporaryCloseReason: text("temporary_close_reason"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  address: text("address"),
  isFeatured: boolean("is_featured").default(false),
  isNew: boolean("is_new").default(false),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Menu items table (Products)
export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  brand: varchar("brand", { length: 100 }), // تمت الإضافة
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  image: text("image").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  sizes: text("sizes"), // JSON or comma separated: S,M,L,XL
  colors: text("colors"), // JSON or comma separated: Red,Blue,Green
  salesCount: integer("sales_count").default(0), // عدد المبيعات
  rating: varchar("rating", { length: 10 }).default("0.0"),
  reviewCount: integer("review_count").default(0),
  isAvailable: boolean("is_available").default(true).notNull(),
  isSpecialOffer: boolean("is_special_offer").default(false).notNull(),
  isFeatured: boolean("is_featured").default(false), // الأكثر مبيعاً أو مميز
  isNew: boolean("is_new").default(false), // وصل حديثاً
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
});

// Drivers table - بدون مصادقة
export const drivers = pgTable("drivers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  password: text("password").notNull(), // إضافة حقل كلمة المرور
  isAvailable: boolean("is_available").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("70"), // نسبة السائق من رسوم التوصيل
  paymentMode: varchar("payment_mode", { length: 20 }).default("commission").notNull(), // commission or salary
  salaryAmount: decimal("salary_amount", { precision: 10, scale: 2 }).default("0"), // الراتب الشهري إن وجد
  email: varchar("email", { length: 100 }),
  vehicleType: varchar("vehicle_type", { length: 50 }),
  vehicleNumber: varchar("vehicle_number", { length: 50 }),
  currentLocation: varchar("current_location", { length: 200 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  earnings: decimal("earnings", { precision: 10, scale: 2 }).default("0"),
  completedOrders: integer("completed_orders").default(0).notNull(),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0.00"), // متوسط تقييم السائق
  reviewCount: integer("review_count").default(0), // عدد التقييمات
  allowProfileEdit: boolean("allow_profile_edit").default(true), // السماح للسائق بتعديل ملفه الشخصي
  canViewWallet: boolean("can_view_wallet").default(true), // السماح برؤية المحفظة
  canViewStats: boolean("can_view_stats").default(true), // السماح برؤية الإحصائيات
  canToggleAvailability: boolean("can_toggle_availability").default(true), // السماح بتغيير حالة التوفر
  notes: text("notes"), // ملاحظات عن السائق
  joinDate: timestamp("join_date").defaultNow(), // تاريخ الانضمام
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Orders table
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 100 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
  customerEmail: varchar("customer_email", { length: 100 }),
  customerId: uuid("customer_id").references(() => users.id),
  deliveryAddress: text("delivery_address").notNull(),
  customerLocationLat: decimal("customer_location_lat", { precision: 10, scale: 8 }), // إحداثيات العميل
  customerLocationLng: decimal("customer_location_lng", { precision: 11, scale: 8 }), // إحداثيات العميل
  notes: text("notes"),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  items: text("items").notNull(), // JSON string
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  estimatedTime: varchar("estimated_time", { length: 50 }).default("30-45 دقيقة"),
  deliveryPreference: varchar("delivery_preference", { length: 20 }).default("now"), // now, later
  scheduledDate: varchar("scheduled_date", { length: 50 }),
  scheduledTimeSlot: varchar("scheduled_time_slot", { length: 100 }),
  driverEarnings: decimal("driver_earnings", { precision: 10, scale: 2 }).default("0"),
  driverCommissionRate: decimal("driver_commission_rate", { precision: 5, scale: 2 }).default("0"),
  driverCommissionAmount: decimal("driver_commission_amount", { precision: 10, scale: 2 }).default("0"),
  commissionProcessed: boolean("commission_processed").default(false).notNull(),
  restaurantEarnings: decimal("restaurant_earnings", { precision: 10, scale: 2 }).default("0"),
  companyEarnings: decimal("company_earnings", { precision: 10, scale: 2 }).default("0"),
  distance: decimal("distance", { precision: 10, scale: 2 }).default("0"),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  restaurantName: varchar("restaurant_name", { length: 200 }), // اسم المطعم للسهولة
  restaurantPhone: varchar("restaurant_phone", { length: 20 }), // رقم هاتف المطعم للسهولة
  driverId: uuid("driver_id").references(() => drivers.id),
  isRated: boolean("is_rated").default(false).notNull(), // تمت الإضافة: هل تم تقييم الطلب
  // حقول خدمة وصل لي
  isWaselLi: boolean("is_wasel_li").default(false).notNull(),
  pickupAddress: text("pickup_address"),
  pickupLocationLat: decimal("pickup_location_lat", { precision: 10, scale: 8 }),
  pickupLocationLng: decimal("pickup_location_lng", { precision: 11, scale: 8 }),
  pickupPhone: varchar("pickup_phone", { length: 20 }),
  pickupName: varchar("pickup_name", { length: 100 }),
  waselLiItemType: varchar("wasel_li_item_type", { length: 100 }),
  // حقول الطلبات الآجلة
  isScheduled: boolean("is_scheduled").default(false).notNull(),
  scheduledDateTime: timestamp("scheduled_date_time"),
  isScheduledOrderSent: boolean("is_scheduled_order_sent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Special offers table
export const specialOffers = pgTable("special_offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(), // تم تغيير إلى notNull
  image: text("image").notNull(), // تمت الإضافة
  // نوع العرض: 'discount' (خصم) | 'bundle' (مجموعة منتجات بسعر محدد)
  offerType: varchar("offer_type", { length: 20 }).default("discount").notNull(),
  // حقول الخصم
  discountPercent: integer("discount_percent"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }),
  minimumOrder: decimal("minimum_order", { precision: 10, scale: 2 }).default("0"),
  // نطاق تطبيق الخصم: 'store' (كامل المتجر) | 'section' (قسم محدد) | 'category' (تصنيف محدد)
  discountScope: varchar("discount_scope", { length: 20 }).default("store"),
  // حقول المجموعة (bundle)
  bundlePrice: decimal("bundle_price", { precision: 10, scale: 2 }),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id), // ربط العرض بمطعم محدد
  categoryId: uuid("category_id").references(() => categories.id), // ربط العرض بتصنيف محدد
  sectionId: uuid("section_id").references(() => restaurantSections.id), // ربط العرض بقسم داخل المتجر
  validUntil: timestamp("valid_until"),
  showBadge: boolean("show_badge").default(true), // إظهار أو إخفاء الملصق
  badgeText1: varchar("badge_text_1", { length: 50 }).default("طازج يومياً"), // النص الأول (مثلاً: طازج يومياً)
  badgeText2: varchar("badge_text_2", { length: 50 }).default("عروض حصرية"), // النص الثاني (مثلاً: عروض حصرية)
  menuItemId: uuid("menu_item_id").references(() => menuItems.id), // ربط العرض بمنتج محدد
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Admin users table - بدون مصادقة
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  username: varchar("username", { length: 50 }).unique(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  password: text("password"), // كلمة مرور مشفرة (bcrypt)
  userType: varchar("user_type", { length: 50 }).default("admin").notNull(), // admin | sub_admin
  permissions: text("permissions"), // JSON: قائمة الصلاحيات للمدير المساعد
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// System settings table
export const systemSettingsTable = pgTable("system_settings_table", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).unique().notNull(),
  value: text("value").notNull(),
  category: varchar("category", { length: 100 }).default("general"),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// UI settings table alias
export const systemSettings = systemSettingsTable;
export const uiSettings = systemSettingsTable;

// Restaurant sections table
export const restaurantSections = pgTable("restaurant_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Ratings table
export const ratings = pgTable("ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  customerName: varchar("customer_name", { length: 100 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  recipientType: varchar("recipient_type", { length: 50 }).notNull(),
  recipientId: text("recipient_id"), // تم التغيير من uuid إلى text لدعم الهوية بالهاتف للمستخدمين غير المسجلين
  orderId: uuid("order_id"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Order tracking table
export const orderTracking = pgTable("order_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  message: text("message").notNull(),
  createdBy: text("created_by").notNull(), // تم التغيير من uuid إلى text لدعم "system" أو "admin" أو رقم الهاتف
  createdByType: varchar("created_by_type", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Wallets table
export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerPhone: varchar("customer_phone", { length: 20 }).unique().notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Wallet transactions table
export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletId: uuid("wallet_id").references(() => wallets.id),
  type: varchar("type", { length: 50 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  orderId: uuid("order_id").references(() => orders.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Restaurant earnings table
export const restaurantEarnings = pgTable("restaurant_earnings", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  ownerName: varchar("owner_name", { length: 100 }).notNull(),
  ownerPhone: varchar("owner_phone", { length: 20 }).notNull(),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0.00"),
  pendingAmount: decimal("pending_amount", { precision: 10, scale: 2 }).default("0.00"),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cart table - جدول السلة
export const cart = pgTable("cart", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  menuItemId: uuid("menu_item_id").references(() => menuItems.id).notNull(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  specialInstructions: text("special_instructions"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// Favorites table - جدول المفضلة
export const favorites = pgTable("favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  menuItemId: uuid("menu_item_id").references(() => menuItems.id),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// New tables for Advanced Features
export const driverReviews = pgTable("driver_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").references(() => drivers.id).notNull(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const driverEarningsTable = pgTable("driver_earnings_table", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").references(() => drivers.id).notNull(),
  totalEarned: decimal("total_earned", { precision: 10, scale: 2 }).default("0"),
  withdrawn: decimal("withdrawn", { precision: 10, scale: 2 }).default("0"),
  pending: decimal("pending", { precision: 10, scale: 2 }).default("0"),
  lastPaidAt: timestamp("last_paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const driverWallets = pgTable("driver_wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").references(() => drivers.id).notNull().unique(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Driver balance table (Admin interface expects these specific fields)
export const driverBalances = pgTable("driver_balances", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").references(() => drivers.id).notNull().unique(),
  totalBalance: decimal("total_balance", { precision: 10, scale: 2 }).default("0").notNull(),
  availableBalance: decimal("available_balance", { precision: 10, scale: 2 }).default("0").notNull(),
  withdrawnAmount: decimal("withdrawn_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  pendingAmount: decimal("pending_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Driver transactions table
export const driverTransactions = pgTable("driver_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").references(() => drivers.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // commission, salary, bonus, deduction, withdrawal
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }).default("0"),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).default("0"),
  referenceId: varchar("reference_id", { length: 100 }), // orderId or withdrawalId
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Driver commissions table
export const driverCommissions = pgTable("driver_commissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").references(() => drivers.id).notNull(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  orderAmount: decimal("order_amount", { precision: 10, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // pending, approved, paid
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Driver withdrawals table
export const driverWithdrawals = pgTable("driver_withdrawals", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").references(() => drivers.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // pending, approved, rejected, completed
  bankDetails: text("bank_details"),
  adminNotes: text("admin_notes"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const restaurantWallets = pgTable("restaurant_wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull().unique(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const commissionSettings = pgTable("commission_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 50 }).notNull(), // default, restaurant, driver
  entityId: uuid("entity_id"), // null if default
  commissionPercent: decimal("commission_percent", { precision: 5, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // driver, restaurant
  entityId: uuid("entity_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // pending, approved, rejected, completed
  bankDetails: text("bank_details"),
  adminNotes: text("admin_notes"),
  rejectionReason: text("rejection_reason"),
  approvedBy: uuid("approved_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const driverWorkSessions = pgTable("driver_work_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").references(() => drivers.id).notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  isActive: boolean("is_active").default(true).notNull(),
  totalDeliveries: integer("total_deliveries").default(0),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// HR Management Tables
export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  position: varchar("position", { length: 50 }).notNull(), // admin, manager, support, accountant, hr
  department: varchar("department", { length: 50 }).notNull(),
  branch: varchar("branch", { length: 50 }).default("الفرع الرئيسي"), // تمت الإضافة: الفرع
  salary: decimal("salary", { precision: 10, scale: 2 }).notNull(),
  hireDate: timestamp("hire_date").defaultNow().notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, inactive, on_leave, terminated
  address: text("address"),
  emergencyContact: varchar("emergency_contact", { length: 100 }),
  permissions: text("permissions"), // JSON string or comma-separated
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const attendance = pgTable("attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id").references(() => employees.id).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  status: varchar("status", { length: 20 }).notNull(), // present, absent, late, early_leave, on_leave
  hoursWorked: decimal("hours_worked", { precision: 4, scale: 2 }),
  notes: text("notes"),
});

export const leaveRequests = pgTable("leave_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id").references(() => employees.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // annual, sick, emergency, unpaid
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, approved, rejected
  reason: text("reason"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

// ======= نظام نقاط الولاء =======
export const loyaltyPoints = pgTable("loyalty_points", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  totalPoints: integer("total_points").default(0).notNull(),
  redeemedPoints: integer("redeemed_points").default(0).notNull(),
  availablePoints: integer("available_points").default(0).notNull(),
  tier: varchar("tier", { length: 20 }).default("bronze").notNull(), // bronze, silver, gold, platinum
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  orderId: uuid("order_id").references(() => orders.id),
  type: varchar("type", { length: 30 }).notNull(), // earned, redeemed, expired, bonus
  points: integer("points").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ======= نظام التذاكر والدعم الفني =======
export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  customerName: varchar("customer_name", { length: 100 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
  orderId: uuid("order_id").references(() => orders.id),
  category: varchar("category", { length: 50 }).notNull(), // delivery, quality, payment, driver, other
  subject: varchar("subject", { length: 200 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 30 }).default("open").notNull(), // open, in_progress, resolved, closed
  priority: varchar("priority", { length: 20 }).default("normal").notNull(), // low, normal, high, urgent
  assignedTo: uuid("assigned_to").references(() => adminUsers.id),
  adminResponse: text("admin_response"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ======= نظام الإحالة والدعوة =======
export const referralCodes = pgTable("referral_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  totalReferrals: integer("total_referrals").default(0).notNull(),
  totalEarned: decimal("total_earned", { precision: 10, scale: 2 }).default("0").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const referralUsages = pgTable("referral_usages", {
  id: uuid("id").primaryKey().defaultRandom(),
  referralCodeId: uuid("referral_code_id").references(() => referralCodes.id).notNull(),
  referrerId: uuid("referrer_id").references(() => users.id).notNull(),
  referredUserId: uuid("referred_user_id").references(() => users.id).notNull(),
  pointsAwarded: integer("points_awarded").default(0),
  discountAwarded: decimal("discount_awarded", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ======= رموز الأجهزة للإشعارات =======
export const deviceTokens = pgTable("device_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  driverId: uuid("driver_id").references(() => drivers.id),
  token: text("token").notNull().unique(),
  platform: varchar("platform", { length: 20 }).notNull(), // android, ios, web
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ======= بوابة المطعم الشريك =======
export const restaurantUsers = pgTable("restaurant_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  password: text("password").notNull(),
  role: varchar("role", { length: 30 }).default("owner").notNull(), // owner, manager, staff
  isActive: boolean("is_active").default(true).notNull(),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).partial({
  id: true,
  createdAt: true,
  isActive: true,
});
export const selectUserSchema = createSelectSchema(users);
export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertUserAddressSchema = createInsertSchema(userAddresses).partial({
  id: true,
  createdAt: true,
  isDefault: true,
});
export const selectUserAddressSchema = createSelectSchema(userAddresses);
export type UserAddress = z.infer<typeof selectUserAddressSchema>;
export type InsertUserAddress = z.infer<typeof insertUserAddressSchema>;

export const insertCategorySchema = createInsertSchema(categories).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  sortOrder: true,
  type: true,
});
export const selectCategorySchema = createSelectSchema(categories);
export type Category = z.infer<typeof selectCategorySchema>;
export type CategoryInsert = z.infer<typeof insertCategorySchema>; // Alias for compatibility
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export const insertRestaurantSchema = createInsertSchema(restaurants).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  isOpen: true,
  isFeatured: true,
  isNew: true,
  isTemporarilyClosed: true,
  rating: true,
  reviewCount: true,
  minimumOrder: true,
  deliveryFee: true,
  perKmFee: true,
  commissionRate: true,
  openingTime: true,
  closingTime: true,
  workingDays: true,
});
export const selectRestaurantSchema = createSelectSchema(restaurants);
export type Restaurant = z.infer<typeof selectRestaurantSchema>;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;

export const insertMenuItemSchema = createInsertSchema(menuItems).partial({
  id: true,
  isAvailable: true,
  isSpecialOffer: true,
  brand: true,
  sizes: true,
  colors: true,
  salesCount: true,
  rating: true,
  reviewCount: true,
  isFeatured: true,
  isNew: true,
});
export const selectMenuItemSchema = createSelectSchema(menuItems);
export type MenuItem = z.infer<typeof selectMenuItemSchema>;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

export const insertOrderSchema = createInsertSchema(orders).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  orderNumber: true,
  distance: true,
  driverEarnings: true,
  restaurantEarnings: true,
  companyEarnings: true,
  isRated: true,
});
export const selectOrderSchema = createSelectSchema(orders);
export type Order = z.infer<typeof selectOrderSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export const insertDriverSchema = createInsertSchema(drivers).extend({
  commissionRate: z.preprocess((val) => val === null || val === undefined ? undefined : String(val), z.string().optional()),
  salaryAmount: z.preprocess((val) => val === null || val === undefined ? undefined : String(val), z.string().optional()),
  earnings: z.preprocess((val) => val === null || val === undefined ? undefined : String(val), z.string().optional()),
  averageRating: z.preprocess((val) => val === null || val === undefined ? undefined : String(val), z.string().optional()),
  reviewCount: z.number().optional(),
}).partial({
  id: true,
  createdAt: true,
  isAvailable: true,
  isActive: true,
  paymentMode: true,
  email: true,
  vehicleType: true,
  vehicleNumber: true,
  currentLocation: true,
  updatedAt: true,
  allowProfileEdit: true,
  notes: true,
  joinDate: true,
});
export const selectDriverSchema = createSelectSchema(drivers);
export type Driver = z.infer<typeof selectDriverSchema>;
export type InsertDriver = z.infer<typeof insertDriverSchema>;

export const insertSpecialOfferSchema = createInsertSchema(specialOffers).partial({
  id: true,
  createdAt: true,
  isActive: true,
  minimumOrder: true,
});
export const selectSpecialOfferSchema = createSelectSchema(specialOffers);
export type SpecialOffer = z.infer<typeof selectSpecialOfferSchema>;
export type InsertSpecialOffer = z.infer<typeof insertSpecialOfferSchema>;

export const insertAdminUserSchema = createInsertSchema(adminUsers).partial({
  id: true,
  createdAt: true,
  isActive: true,
  userType: true,
});
export const selectAdminUserSchema = createSelectSchema(adminUsers);
export type AdminUser = z.infer<typeof selectAdminUserSchema>;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;

export const insertUiSettingsSchema = createInsertSchema(uiSettings).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  category: true,
});
export const selectUiSettingsSchema = createSelectSchema(uiSettings);
export type UiSettings = z.infer<typeof selectUiSettingsSchema>;
export type InsertUiSettings = z.infer<typeof insertUiSettingsSchema>;

export const insertRestaurantSectionSchema = createInsertSchema(restaurantSections).partial({
  id: true,
  createdAt: true,
  isActive: true,
  sortOrder: true,
});
export const selectRestaurantSectionSchema = createSelectSchema(restaurantSections);
export type RestaurantSection = z.infer<typeof selectRestaurantSectionSchema>;
export type InsertRestaurantSection = z.infer<typeof insertRestaurantSectionSchema>;

export const insertRatingSchema = createInsertSchema(ratings).partial({
  id: true,
  createdAt: true,
  isApproved: true,
});
export const selectRatingSchema = createSelectSchema(ratings);
export type Rating = z.infer<typeof selectRatingSchema>;
export type InsertRating = z.infer<typeof insertRatingSchema>;

export const insertNotificationSchema = createInsertSchema(notifications).partial({
  id: true,
  createdAt: true,
  isRead: true,
});
export const selectNotificationSchema = createSelectSchema(notifications);
export type Notification = z.infer<typeof selectNotificationSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export const insertWalletSchema = createInsertSchema(wallets).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  balance: true,
});
export const selectWalletSchema = createSelectSchema(wallets);
export type Wallet = z.infer<typeof selectWalletSchema>;
export type InsertWallet = z.infer<typeof insertWalletSchema>;

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).partial({
  id: true,
  createdAt: true,
});
export const selectWalletTransactionSchema = createSelectSchema(walletTransactions);
export type WalletTransaction = z.infer<typeof selectWalletTransactionSchema>;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;

export const insertSystemSettingsSchema = createInsertSchema(systemSettingsTable).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
});
export const selectSystemSettingsSchema = createSelectSchema(systemSettingsTable);
export type SystemSettings = z.infer<typeof selectSystemSettingsSchema>;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;

export const insertRestaurantEarningsSchema = createInsertSchema(restaurantEarnings).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  totalEarnings: true,
  pendingAmount: true,
  paidAmount: true,
});
export const selectRestaurantEarningsSchema = createSelectSchema(restaurantEarnings);
export type RestaurantEarnings = z.infer<typeof selectRestaurantEarningsSchema>;
export type InsertRestaurantEarnings = z.infer<typeof insertRestaurantEarningsSchema>;

export const insertCartSchema = createInsertSchema(cart).partial({
  id: true,
  addedAt: true,
  quantity: true,
});
export const selectCartSchema = createSelectSchema(cart);
export type Cart = z.infer<typeof selectCartSchema>;
export type InsertCart = z.infer<typeof insertCartSchema>;

export const insertFavoritesSchema = createInsertSchema(favorites).partial({
  id: true,
  addedAt: true,
});
export const selectFavoritesSchema = createSelectSchema(favorites);
export type Favorites = z.infer<typeof selectFavoritesSchema>;
export type InsertFavorites = z.infer<typeof insertFavoritesSchema>;

// New schemas for Advanced Features
export const insertDriverReviewSchema = createInsertSchema(driverReviews).partial({
  id: true,
  createdAt: true,
});
export const selectDriverReviewSchema = createSelectSchema(driverReviews);
export type DriverReview = z.infer<typeof selectDriverReviewSchema>;
export type InsertDriverReview = z.infer<typeof insertDriverReviewSchema>;

export const insertDriverEarningsSchema = createInsertSchema(driverEarningsTable).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalEarned: true,
  withdrawn: true,
  pending: true,
});
export const selectDriverEarningsSchema = createSelectSchema(driverEarningsTable);
export type DriverEarnings = z.infer<typeof selectDriverEarningsSchema>;
export type InsertDriverEarnings = z.infer<typeof insertDriverEarningsSchema>;

export const insertDriverWalletSchema = createInsertSchema(driverWallets).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  balance: true,
});
export const selectDriverWalletSchema = createSelectSchema(driverWallets);
export type DriverWallet = z.infer<typeof selectDriverWalletSchema>;
export type InsertDriverWallet = z.infer<typeof insertDriverWalletSchema>;

export const insertDriverBalanceSchema = createInsertSchema(driverBalances).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalBalance: true,
  availableBalance: true,
  withdrawnAmount: true,
  pendingAmount: true,
});
export const selectDriverBalanceSchema = createSelectSchema(driverBalances);
export type DriverBalance = z.infer<typeof selectDriverBalanceSchema>;
export type InsertDriverBalance = z.infer<typeof insertDriverBalanceSchema>;

export const insertDriverTransactionSchema = createInsertSchema(driverTransactions).partial({
  id: true,
  createdAt: true,
  balanceBefore: true,
  balanceAfter: true,
});
export const selectDriverTransactionSchema = createSelectSchema(driverTransactions);
export type DriverTransaction = z.infer<typeof selectDriverTransactionSchema>;
export type InsertDriverTransaction = z.infer<typeof insertDriverTransactionSchema>;

export const insertDriverCommissionSchema = createInsertSchema(driverCommissions).partial({
  id: true,
  createdAt: true,
  status: true,
});
export const selectDriverCommissionSchema = createSelectSchema(driverCommissions);
export type DriverCommission = z.infer<typeof selectDriverCommissionSchema>;
export type InsertDriverCommission = z.infer<typeof insertDriverCommissionSchema>;

export const insertDriverWithdrawalSchema = createInsertSchema(driverWithdrawals).partial({
  id: true,
  createdAt: true,
  status: true,
  processedAt: true,
});
export const selectDriverWithdrawalSchema = createSelectSchema(driverWithdrawals);
export type DriverWithdrawal = z.infer<typeof selectDriverWithdrawalSchema>;
export type InsertDriverWithdrawal = z.infer<typeof insertDriverWithdrawalSchema>;

export const insertRestaurantWalletSchema = createInsertSchema(restaurantWallets).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  balance: true,
});
export const selectRestaurantWalletSchema = createSelectSchema(restaurantWallets);
export type RestaurantWallet = z.infer<typeof selectRestaurantWalletSchema>;
export type InsertRestaurantWallet = z.infer<typeof insertRestaurantWalletSchema>;

export const insertCommissionSettingsSchema = createInsertSchema(commissionSettings).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
});
export const selectCommissionSettingsSchema = createSelectSchema(commissionSettings);
export type CommissionSettings = z.infer<typeof selectCommissionSettingsSchema>;
export type InsertCommissionSettings = z.infer<typeof insertCommissionSettingsSchema>;

export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequests).partial({
  id: true,
  submittedAt: true,
  updatedAt: true,
  status: true,
});
export const selectWithdrawalRequestSchema = createSelectSchema(withdrawalRequests);
export type WithdrawalRequest = z.infer<typeof selectWithdrawalRequestSchema>;
export type InsertWithdrawalRequest = z.infer<typeof insertWithdrawalRequestSchema>;

export const insertDriverWorkSessionSchema = createInsertSchema(driverWorkSessions).partial({
  id: true,
  startTime: true,
  isActive: true,
  totalDeliveries: true,
  totalEarnings: true,
  createdAt: true,
});
export const selectDriverWorkSessionSchema = createSelectSchema(driverWorkSessions);
export type DriverWorkSession = z.infer<typeof selectDriverWorkSessionSchema>;
export type InsertDriverWorkSession = z.infer<typeof insertDriverWorkSessionSchema>;

export const insertEmployeeSchema = createInsertSchema(employees).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  hireDate: true,
  status: true,
  permissions: true,
  department: true,
  position: true,
  salary: true,
  address: true,
  emergencyContact: true,
  branch: true,
});
export const selectEmployeeSchema = createSelectSchema(employees);
export type Employee = z.infer<typeof selectEmployeeSchema>;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export const insertAttendanceSchema = createInsertSchema(attendance).partial({
  id: true,
  date: true,
  checkIn: true,
  checkOut: true,
  status: true,
  hoursWorked: true,
  notes: true,
});
export const selectAttendanceSchema = createSelectSchema(attendance);
export type Attendance = z.infer<typeof selectAttendanceSchema>;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).partial({
  id: true,
  status: true,
  submittedAt: true,
  reason: true,
});
export const selectLeaveRequestSchema = createSelectSchema(leaveRequests);
export type LeaveRequest = z.infer<typeof selectLeaveRequestSchema>;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;


// Delivery fee settings table
export const deliveryFeeSettings = pgTable("delivery_fee_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id), // null for global settings
  type: varchar("type", { length: 50 }).default("per_km").notNull(), // fixed, per_km, zone_based, restaurant_custom
  baseFee: decimal("base_fee", { precision: 10, scale: 2 }).default("0"),
  perKmFee: decimal("per_km_fee", { precision: 10, scale: 2 }).default("0"),
  minFee: decimal("min_fee", { precision: 10, scale: 2 }).default("0"),
  maxFee: decimal("max_fee", { precision: 10, scale: 2 }).default("1000"),
  freeDeliveryThreshold: decimal("free_delivery_threshold", { precision: 10, scale: 2 }).default("0"),
  storeLat: decimal("store_lat", { precision: 10, scale: 8 }),
  storeLng: decimal("store_lng", { precision: 11, scale: 8 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Delivery zones table
export const deliveryZones = pgTable("delivery_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  minDistance: decimal("min_distance", { precision: 10, scale: 2 }).default("0"),
  maxDistance: decimal("max_distance", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull(),
  estimatedTime: varchar("estimated_time", { length: 50 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Company financial reports table
export const financialReports = pgTable("financial_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  periodType: varchar("period_type", { length: 20 }).notNull(), // daily, weekly, monthly, yearly
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalOrders: integer("total_orders").default(0),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0"),
  totalDeliveryFees: decimal("total_delivery_fees", { precision: 12, scale: 2 }).default("0"),
  totalDriverEarnings: decimal("total_driver_earnings", { precision: 12, scale: 2 }).default("0"),
  totalRestaurantEarnings: decimal("total_restaurant_earnings", { precision: 12, scale: 2 }).default("0"),
  totalCompanyProfit: decimal("total_company_profit", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Re-export schemas
export const insertDeliveryFeeSettingsSchema = createInsertSchema(deliveryFeeSettings).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  baseFee: true,
  perKmFee: true,
  minFee: true,
  maxFee: true,
  freeDeliveryThreshold: true,
  storeLat: true,
  storeLng: true,
});
export const selectDeliveryFeeSettingsSchema = createSelectSchema(deliveryFeeSettings);
export type DeliveryFeeSetting = z.infer<typeof selectDeliveryFeeSettingsSchema>;
export type InsertDeliveryFeeSetting = z.infer<typeof insertDeliveryFeeSettingsSchema>;

export const insertDeliveryZoneSchema = createInsertSchema(deliveryZones).partial({
  id: true,
  createdAt: true,
  isActive: true,
  minDistance: true,
  description: true,
  estimatedTime: true,
});
export const selectDeliveryZoneSchema = createSelectSchema(deliveryZones);
export type DeliveryZone = z.infer<typeof selectDeliveryZoneSchema>;
export type InsertDeliveryZone = z.infer<typeof insertDeliveryZoneSchema>;

export const insertFinancialReportSchema = createInsertSchema(financialReports).partial({
  id: true,
  createdAt: true,
  totalOrders: true,
  totalRevenue: true,
  totalDeliveryFees: true,
  totalDriverEarnings: true,
  totalRestaurantEarnings: true,
  totalCompanyProfit: true,
});
export const selectFinancialReportSchema = createSelectSchema(financialReports);
export type FinancialReport = z.infer<typeof selectFinancialReportSchema>;
export type InsertFinancialReport = z.infer<typeof insertFinancialReportSchema>;

// Geo-Zones table (Polygons)
export const geoZones = pgTable("geo_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  coordinates: text("coordinates").notNull(), // JSON string representing polygon coordinates
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Delivery Rules table
export const deliveryRules = pgTable("delivery_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  ruleType: varchar("rule_type", { length: 50 }).notNull(), // distance, order_value, zone
  minDistance: decimal("min_distance", { precision: 10, scale: 2 }),
  maxDistance: decimal("max_distance", { precision: 10, scale: 2 }),
  minOrderValue: decimal("min_order_value", { precision: 10, scale: 2 }),
  maxOrderValue: decimal("max_order_value", { precision: 10, scale: 2 }),
  geoZoneId: uuid("geo_zone_id").references(() => geoZones.id),
  fee: decimal("fee", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Delivery Discounts table
export const deliveryDiscounts = pgTable("delivery_discounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  discountType: varchar("discount_type", { length: 50 }).notNull(), // percentage, fixed_amount
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderValue: decimal("min_order_value", { precision: 10, scale: 2 }),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for new tables
export const insertGeoZoneSchema = createInsertSchema(geoZones).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
});
export const selectGeoZoneSchema = createSelectSchema(geoZones);
export type GeoZone = z.infer<typeof selectGeoZoneSchema>;
export type InsertGeoZone = z.infer<typeof insertGeoZoneSchema>;

export const insertDeliveryRuleSchema = createInsertSchema(deliveryRules).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  priority: true,
});
export const selectDeliveryRuleSchema = createSelectSchema(deliveryRules);
export type DeliveryRule = z.infer<typeof selectDeliveryRuleSchema>;
export type InsertDeliveryRule = z.infer<typeof insertDeliveryRuleSchema>;

export const insertDeliveryDiscountSchema = createInsertSchema(deliveryDiscounts).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
});
export const selectDeliveryDiscountSchema = createSelectSchema(deliveryDiscounts);
export type DeliveryDiscount = z.infer<typeof selectDeliveryDiscountSchema>;
export type InsertDeliveryDiscount = z.infer<typeof insertDeliveryDiscountSchema>;

// Messages table for chat
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id),
  senderId: uuid("sender_id").notNull(),
  senderType: varchar("sender_type", { length: 50 }).notNull(), // customer, driver, restaurant, admin
  receiverId: uuid("receiver_id").notNull(),
  receiverType: varchar("receiver_type", { length: 50 }).notNull(), // customer, driver, restaurant, admin
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).partial({
  id: true,
  createdAt: true,
  isRead: true,
});
export const selectMessageSchema = createSelectSchema(messages);
export type Message = z.infer<typeof selectMessageSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id").references(() => adminUsers.id).notNull(),
  action: varchar("action", { length: 100 }).notNull(), // e.g., update_order_status
  entityType: varchar("entity_type", { length: 50 }).notNull(), // order, restaurant, driver, etc.
  entityId: uuid("entity_id").notNull(),
  oldData: text("old_data"), // JSON string
  newData: text("new_data"), // JSON string
  ipAddress: varchar("ip_address", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).partial({
  id: true,
  createdAt: true,
});
export const selectAuditLogSchema = createSelectSchema(auditLogs);
export type AuditLog = z.infer<typeof selectAuditLogSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Payment gateways table
export const paymentGateways = pgTable("payment_gateways", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(), // Stripe, PayPal, Local Card, Cash
  type: varchar("type", { length: 50 }).notNull(), // online, offline
  config: text("config"), // JSON configuration (API keys, etc.)
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPaymentGatewaySchema = createInsertSchema(paymentGateways).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  isDefault: true,
});
export const selectPaymentGatewaySchema = createSelectSchema(paymentGateways);
export type PaymentGateway = z.infer<typeof selectPaymentGatewaySchema>;
export type InsertPaymentGateway = z.infer<typeof insertPaymentGatewaySchema>;

// Payment Methods table (Saudi payment methods: Mada, STC Pay, Apple Pay, etc.)
export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // card, wallet, cash, bank_transfer
  provider: varchar("provider", { length: 50 }).notNull(), // mada, stc_pay, apple_pay, visa, mastercard, cash, bank
  icon: varchar("icon", { length: 200 }),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  isOnline: boolean("is_online").default(true).notNull(),
  requiresDocument: boolean("requires_document").default(false).notNull(),
  sortOrder: integer("sort_order").default(0),
  config: text("config"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  isOnline: true,
  requiresDocument: true,
  sortOrder: true,
});
export const selectPaymentMethodSchema = createSelectSchema(paymentMethods);
export type PaymentMethod = z.infer<typeof selectPaymentMethodSchema>;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;

// Payment Method Documents table (bank accounts, IBAN, etc.)
export const paymentMethodDocuments = pgTable("payment_method_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentMethodId: uuid("payment_method_id").references(() => paymentMethods.id).notNull(),
  documentType: varchar("document_type", { length: 100 }).notNull(), // iban, account_number, merchant_id, etc.
  label: varchar("label", { length: 200 }).notNull(),
  value: text("value").notNull(),
  isVisible: boolean("is_visible").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPaymentMethodDocumentSchema = createInsertSchema(paymentMethodDocuments).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  isVisible: true,
});
export const selectPaymentMethodDocumentSchema = createSelectSchema(paymentMethodDocuments);
export type PaymentMethodDocument = z.infer<typeof selectPaymentMethodDocumentSchema>;
export type InsertPaymentMethodDocument = z.infer<typeof insertPaymentMethodDocumentSchema>;

// Coupons table
export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  nameAr: varchar("name_ar", { length: 200 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 20 }).notNull().default("percentage"), // percentage, fixed
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  minOrderValue: decimal("min_order_value", { precision: 10, scale: 2 }).default("0"),
  maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").default(0).notNull(),
  perUserLimit: integer("per_user_limit").default(1),
  applicableFor: varchar("applicable_for", { length: 50 }).default("all"), // all, new_users, specific_restaurant
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  categoryId: uuid("category_id").references(() => categories.id),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCouponSchema = createInsertSchema(coupons).partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  usageCount: true,
  description: true,
  maxDiscount: true,
  usageLimit: true,
  perUserLimit: true,
  applicableFor: true,
  restaurantId: true,
  categoryId: true,
  startDate: true,
  endDate: true,
  minOrderValue: true,
});
export const selectCouponSchema = createSelectSchema(coupons);
export type Coupon = z.infer<typeof selectCouponSchema>;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;

// Coupon usages table (track who used which coupon)
export const couponUsages = pgTable("coupon_usages", {
  id: uuid("id").primaryKey().defaultRandom(),
  couponId: uuid("coupon_id").references(() => coupons.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  userPhone: varchar("user_phone", { length: 20 }),
  orderId: uuid("order_id").references(() => orders.id),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCouponUsageSchema = createInsertSchema(couponUsages).partial({
  id: true,
  createdAt: true,
  userId: true,
  userPhone: true,
  orderId: true,
});
export const selectCouponUsageSchema = createSelectSchema(couponUsages);
export type CouponUsage = z.infer<typeof selectCouponUsageSchema>;
export type InsertCouponUsage = z.infer<typeof insertCouponUsageSchema>;

// Wasalni (وصل لي) Requests table
export const wasalniRequests = pgTable("wasalni_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestNumber: varchar("request_number", { length: 50 }).notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
  customerId: uuid("customer_id").references(() => users.id),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  fromLat: decimal("from_lat", { precision: 10, scale: 8 }),
  fromLng: decimal("from_lng", { precision: 11, scale: 8 }),
  toLat: decimal("to_lat", { precision: 10, scale: 8 }),
  toLng: decimal("to_lng", { precision: 11, scale: 8 }),
  orderType: varchar("order_type", { length: 100 }).default("طعام"),
  notes: text("notes"),
  scheduledDate: varchar("scheduled_date", { length: 20 }),
  scheduledTime: varchar("scheduled_time", { length: 20 }),
  estimatedFee: decimal("estimated_fee", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  driverId: uuid("driver_id").references(() => drivers.id),
  cancelReason: text("cancel_reason"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWasalniRequestSchema = createInsertSchema(wasalniRequests).partial({
  id: true,
  requestNumber: true,
  customerId: true,
  fromLat: true,
  fromLng: true,
  toLat: true,
  toLng: true,
  orderType: true,
  notes: true,
  scheduledDate: true,
  scheduledTime: true,
  estimatedFee: true,
  status: true,
  driverId: true,
  cancelReason: true,
  adminNotes: true,
  createdAt: true,
  updatedAt: true,
});
export const selectWasalniRequestSchema = createSelectSchema(wasalniRequests);
export type WasalniRequest = z.infer<typeof selectWasalniRequestSchema>;
export type InsertWasalniRequest = z.infer<typeof insertWasalniRequestSchema>;
