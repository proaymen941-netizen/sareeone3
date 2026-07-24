import { dbStorage } from './db';

// القائمة الكاملة للإعدادات الافتراضية - يتم التحقق منها وإضافتها عند كل تشغيل
const defaultUiSettings = [
  // إعدادات التنقل
  { key: "show_categories", value: "true", category: "navigation", description: "عرض تصنيفات المطاعم في الصفحة الرئيسية" },
  { key: "show_search_bar", value: "true", category: "navigation", description: "عرض شريط البحث في الصفحة الرئيسية" },
  { key: "show_special_offers", value: "true", category: "navigation", description: "عرض العروض الخاصة والتخفيضات" },
  { key: "show_orders_page", value: "true", category: "navigation", description: "عرض صفحة الطلبات في التنقل" },
  { key: "show_track_orders_page", value: "true", category: "navigation", description: "عرض صفحة تتبع الطلبات في التنقل" },
  { key: "show_admin_panel", value: "true", category: "navigation", description: "عرض لوحة التحكم الإدارية" },
  { key: "show_delivery_app", value: "true", category: "navigation", description: "عرض تطبيق التوصيل" },
  { key: "show_hero_section", value: "true", category: "navigation", description: "عرض البانر الرئيسي المتحرك" },
  { key: "show_featured_products", value: "true", category: "navigation", description: "عرض المنتجات المميزة" },
  { key: "show_wasalni_service", value: "true", category: "navigation", description: "عرض خدمة وصل لي في الصفحة الرئيسية" },
  { key: "wasalni_base_fee", value: "5", category: "delivery", description: "رسوم خدمة وصل لي الأساسية" },
  { key: "bottom_bar_enabled", value: "true", category: "navigation", description: "إظهار شريط التنقل السفلي" },
  // إعدادات عامة
  { key: "app_name", value: "السريع ون", category: "general", description: "اسم التطبيق" },
  { key: "app_theme", value: "#ec3714", category: "general", description: "اللون الأساسي للتطبيق (hex)" },
  { key: "delivery_fee_default", value: "5", category: "general", description: "رسوم التوصيل الافتراضية (ريال)" },
  { key: "minimum_order_default", value: "25", category: "general", description: "الحد الأدنى لقيمة الطلب (ريال)" },
  // إعدادات التوصيل
  { key: "delivery_base_fee", value: "5", category: "delivery", description: "الرسوم الأساسية للتوصيل (ريال)" },
  { key: "min_delivery_fee", value: "5", category: "delivery", description: "الحد الأدنى لرسوم التوصيل (ريال)" },
  { key: "delivery_fee_per_km", value: "2", category: "delivery", description: "رسوم التوصيل لكل كيلومتر (ريال)" },
  // إعدادات المتجر
  { key: "store_lat", value: "15.3694", category: "store", description: "خط العرض لموقع المتجر" },
  { key: "store_lng", value: "44.1910", category: "store", description: "خط الطول لموقع المتجر" },
  { key: "opening_time", value: "08:00", category: "store", description: "وقت فتح المتجر" },
  { key: "closing_time", value: "23:00", category: "store", description: "وقت إغلاق المتجر" },
  { key: "store_status", value: "open", category: "store", description: "حالة المتجر الحالية" },
  // إعدادات الهوية البصرية
  { key: "header_logo_url", value: "", category: "branding", description: "شعار الشريط العلوي" },
  { key: "sidebar_image_url", value: "", category: "branding", description: "صورة خلفية القائمة الجانبية" },
  { key: "sidebar_logo_url", value: "", category: "branding", description: "شعار القائمة الجانبية (إذا كان مختلفاً عن شعار الهيدر)" },
  { key: "show_sidebar_logo", value: "true", category: "branding", description: "إظهار شعار القائمة الجانبية" },
  { key: "sidebar_tagline", value: "خدمة التوصيل الأسرع في المملكة", category: "branding", description: "الشعار النصي في القائمة الجانبية" },
  { key: "address_text", value: "أختار العنوان", category: "branding", description: "نص عنوان الموقع في الشريط العلوي" },
  // إعدادات الشاشة الرئيسية - بانر العروض
  { key: "offer_banner_1_title", value: "عروض حصرية يومية للتوصيل", category: "home", description: "عنوان البانر الأول" },
  { key: "offer_banner_1_subtitle", value: "اطلب الآن واستمتع بأسرع توصيل", category: "home", description: "نص البانر الأول" },
  { key: "offer_banner_2_title", value: "اكتشف أحدث العروض والخصومات", category: "home", description: "عنوان البانر الثاني" },
  { key: "offer_banner_2_subtitle", value: "خصومات حصرية على الطلبات", category: "home", description: "نص البانر الثاني" },
  // إعدادات أزرار التصنيف والصفحة الرئيسية
  { key: "btn_tab_all", value: "الكل", category: "home", description: "نص تبويب كل المطاعم" },
  { key: "btn_tab_nearest", value: "الأقرب", category: "home", description: "نص تبويب الأقرب" },
  { key: "btn_tab_new", value: "الجديدة", category: "home", description: "نص تبويب الجديدة" },
  { key: "btn_tab_favorites", value: "المفضلة", category: "home", description: "نص تبويب المفضلة" },
  { key: "btn_shop_now", value: "تسوق الآن", category: "home", description: "نص زر التسوق" },
  { key: "text_all_categories", value: "كل التصنيفات", category: "home", description: "نص زر كل التصنيفات" },
  { key: "app_version", value: "1.0.0", category: "general", description: "إصدار التطبيق" },
  { key: "top_bar_logo_url", value: "", category: "branding", description: "شعار الشريط العلوي الثانوي" },
  { key: "logo_animation_duration", value: "2.5", category: "branding", description: "مدة ظهور الشعار (ثواني)" },
  // إعدادات شاشة الترحيب
  { key: "show_splash_screen", value: "true", category: "splash", description: "عرض شاشة الترحيب" },
  { key: "splash_image_url", value: "", category: "splash", description: "صورة شاشة الترحيب" },
  { key: "splash_image_url_2", value: "", category: "splash", description: "صورة إضافية للترحيب" },
  { key: "splash_title", value: "السريع ون", category: "splash", description: "عنوان شاشة الترحيب" },
  { key: "splash_subtitle", value: "أفضل الخضار والفواكه الطازجة توصل لبابك", category: "splash", description: "نص الترحيب" },
  { key: "splash_button_text", value: "ابدأ الآن", category: "splash", description: "نص زر البداية" },
  // إعدادات الدعم والتواصل
  { key: "show_support_button", value: "true", category: "support", description: "إظهار زر الدعم في الشريط السفلي" },
  { key: "support_whatsapp", value: "", category: "support", description: "رقم واتساب الدعم" },
  { key: "support_phone", value: "", category: "support", description: "رقم الهاتف المباشر" },
  { key: "text_support_title", value: "نحن معك 🌟", category: "support", description: "عنوان نافذة الدعم" },
  // إعدادات المشاركة والقائمة الجانبية
  { key: "show_share_button", value: "true", category: "sidebar", description: "إظهار زر المشاركة في القائمة" },
  { key: "show_contact_button", value: "true", category: "sidebar", description: "إظهار زر التواصل في القائمة" },
  { key: "share_text", value: "جرب السريع ون الآن!", category: "sidebar", description: "نص المشاركة" },
  { key: "share_url", value: "", category: "sidebar", description: "رابط المشاركة" },
  // إعدادات الخصوصية
  { key: "show_privacy_button", value: "true", category: "privacy", description: "إظهار زر سياسة الخصوصية" },
  { key: "privacy_policy_text", value: "", category: "privacy", description: "نص سياسة الخصوصية" },
  // إعدادات السلة والدفع
  { key: "show_payment_cards", value: "true", category: "cart", description: "إظهار بطاقات الدفع في السلة" },
  { key: "show_coupon_box_always", value: "true", category: "cart", description: "إظهار صندوق الكوبون دائمًا" },
  { key: "coupon_min_order_value", value: "0", category: "cart", description: "الحد الأدنى لقيمة الطلب لإظهار صندوق الكوبون (0 = دائماً)" },
  { key: "show_cash_payment", value: "true", category: "cart", description: "إظهار خيار الدفع نقداً" },
  { key: "show_bank_transfer", value: "false", category: "cart", description: "إظهار خيار التحويل البنكي" },
  { key: "cart_checkout_button_text", value: "تأكيد الطلب", category: "cart", description: "نص زر الدفع" },
  { key: "cart_checkout_note", value: "", category: "cart", description: "رسالة تحت زر التأكيد" },
  // إعدادات تطبيق السائق - إظهار/إخفاء الصفحات
  { key: "driver_show_wallet", value: "true", category: "driver", description: "إظهار صفحة المحفظة للسائق" },
  { key: "driver_show_stats", value: "true", category: "driver", description: "إظهار صفحة الإحصائيات للسائق" },
  { key: "driver_show_profile", value: "true", category: "driver", description: "إظهار صفحة الملف الشخصي للسائق" },
  { key: "driver_show_history", value: "true", category: "driver", description: "إظهار سجل التوصيل للسائق" },
  // إعدادات ساعات عمل الموصلين والطلبات المؤجلة
  { key: "driver_start_time", value: "09:00", category: "driver", description: "وقت بدء دوام الموصلين (مثال: 09:00)" },
  { key: "driver_end_time", value: "21:00", category: "driver", description: "وقت انتهاء دوام الموصلين (مثال: 21:00)" },
  { key: "enable_scheduled_orders", value: "true", category: "driver", description: "السماح للعملاء بجدولة الطلبات خارج ساعات الموصلين" },
];

// ضمان وجود الإعدادات الافتراضية في قاعدة البيانات (لكل تشغيل)
export async function ensureDefaultSettings() {
  try {
    const existing = await dbStorage.getUiSettings();
    const existingKeys = new Set(existing.map(s => s.key));
    let added = 0;
    for (const setting of defaultUiSettings) {
      if (!existingKeys.has(setting.key)) {
        await dbStorage.createUiSetting(setting);
        added++;
      }
    }
    if (added > 0) {
      console.log(`⚙️ أُضيفت ${added} إعدادات واجهة جديدة إلى قاعدة البيانات`);
    }
  } catch (error) {
    console.error('خطأ في ضمان الإعدادات الافتراضية:', error);
  }
}

export async function seedDefaultData() {
  try {
    console.log('🌱 Starting database seeding...');

    // التحقق من وجود البيانات لتجنب التكرار
    const existingCategories = await dbStorage.getCategories();
    if (existingCategories.length > 0) {
      console.log('✓ Database already seeded, skipping initial data...');
      return;
    }

    // Seed categories
    const categories = [
      { name: "خضروات", icon: "https://images.unsplash.com/photo-1566385101042-1a000c1268c4?q=80&w=200&auto=format&fit=crop", isActive: true, sortOrder: 0 },
      { name: "فواكه", icon: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?q=80&w=200&auto=format&fit=crop", isActive: true, sortOrder: 1 },
      { name: "ورقيات", icon: "https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=200&auto=format&fit=crop", isActive: true, sortOrder: 2 },
      { name: "تمور", icon: "https://images.unsplash.com/photo-1596701062351-be5f6a45556d?q=80&w=200&auto=format&fit=crop", isActive: true, sortOrder: 3 },
      { name: "فواكه مجففة", icon: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=200&auto=format&fit=crop", isActive: true, sortOrder: 4 },
    ];

    console.log('📂 Seeding categories...');
    const seededCategories = [];
    for (const categoryData of categories) {
      const category = await dbStorage.createCategory(categoryData);
      seededCategories.push(category);
      console.log(`  ✓ Created category: ${category.name}`);
    }

    // Seed restaurants
    const restaurants = [
      {
        name: "متجر السريع ون",
        description: "أجود أنواع الفواكه والخضروات الطازجة يومياً",
        image: "https://images.unsplash.com/photo-1542838132-92c53300491e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        phone: "+967777777777",
        rating: "5.0",
        reviewCount: 1500,
        deliveryTime: "20-40 دقيقة",
        isOpen: true,
        minimumOrder: "10",
        deliveryFee: "2",
        categoryId: seededCategories[0].id,
        openingTime: "07:00",
        closingTime: "22:00",
        workingDays: "0,1,2,3,4,5,6",
        isTemporarilyClosed: false,
        address: "صنعاء، حي حدة",
        latitude: "15.3694",
        longitude: "44.1910",
        isFeatured: true,
        isNew: true,
        isActive: true,
      },
      {
        name: "حلويات الشام",
        description: "أفضل الحلويات الشامية والعربية",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        phone: "+967779876543",
        rating: "4.6",
        reviewCount: 2341,
        deliveryTime: "30-45 دقيقة",
        isOpen: true,
        minimumOrder: "15",
        deliveryFee: "3",
        categoryId: seededCategories[2].id, // حلويات
        openingTime: "08:00",
        closingTime: "23:00",
        workingDays: "0,1,2,3,4,5,6",
        isTemporarilyClosed: false,
        address: "صنعاء، اليمن",
        latitude: "15.3547",
        longitude: "44.2066",
        isFeatured: false,
        isNew: true,
        isActive: true,
      },
      {
        name: "مقهى العروبة",
        description: "مقهى شعبي بالطابع العربي الأصيل",
        image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        phone: "+967771111111",
        rating: "4.5",
        reviewCount: 1876,
        deliveryTime: "يفتح في 8:00 ص",
        isOpen: true,
        minimumOrder: "20",
        deliveryFee: "4",
        categoryId: seededCategories[1].id, // مقاهي
        openingTime: "08:00",
        closingTime: "23:00",
        workingDays: "0,1,2,3,4,5,6",
        isTemporarilyClosed: false,
        address: "صنعاء، اليمن",
        latitude: "15.3400",
        longitude: "44.1947",
        isFeatured: false,
        isNew: false,
        isActive: true,
      }
    ];

    console.log('🏪 Seeding restaurants...');
    const seededRestaurants = [];
    for (const restaurantData of restaurants) {
      const restaurant = await dbStorage.createRestaurant(restaurantData);
      seededRestaurants.push(restaurant);
      console.log(`  ✓ Created restaurant: ${restaurant.name}`);
    }

    // Seed menu items
    const menuItems = [
      {
        name: "عربكة بالقشطة والعسل",
        description: "حلوى يمنية تقليدية بالقشطة الطازجة والعسل الطبيعي",
        price: "55",
        image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200",
        category: "وجبات رمضان",
        isAvailable: true,
        isSpecialOffer: false,
        restaurantId: seededRestaurants[0].id,
      },
      {
        name: "معصوب بالقشطة والعسل",
        description: "طبق يمني شعبي بالموز والقشطة والعسل",
        price: "55",
        image: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200",
        category: "وجبات رمضان",
        isAvailable: true,
        isSpecialOffer: false,
        restaurantId: seededRestaurants[0].id,
      },
      {
        name: "كنافة نابلسية",
        description: "كنافة نابلسية بالجبنة والقطر",
        price: "45",
        image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200",
        category: "حلويات شرقية",
        isAvailable: true,
        isSpecialOffer: true,
        originalPrice: "50",
        restaurantId: seededRestaurants[1].id,
      },
      {
        name: "بقلاوة بالفستق",
        description: "بقلاوة محشية بالفستق الحلبي",
        price: "35",
        image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200",
        category: "حلويات شرقية",
        isAvailable: true,
        isSpecialOffer: false,
        restaurantId: seededRestaurants[1].id,
      }
    ];

    console.log('🍽️ Seeding menu items...');
    for (const menuItemData of menuItems) {
      const menuItem = await dbStorage.createMenuItem(menuItemData);
      console.log(`  ✓ Created menu item: ${menuItem.name}`);
    }

    // زرع إعدادات الواجهة باستخدام القائمة الشاملة
    console.log('⚙️ Seeding UI settings...');
    for (const settingData of defaultUiSettings) {
      const setting = await dbStorage.createUiSetting(settingData);
      console.log(`  ✓ Created UI setting: ${setting.key}`);
    }

    // Create default admin user
    const adminUsers = [
      {
        name: "مدير النظام الرئيسي",
        email: "admin@alsarie-one.com",
        username: "admin",
        phone: "+967777777777",
        password: "777146387", // كلمة مرور غير مشفرة للاختبار
        userType: "admin",
        isActive: true,
      },
      {
        name: "مدير فرعي",
        email: "manager@alsarie-one.com", 
        username: "manager",
        phone: "+967777777778",
        password: "manager123",
        userType: "admin",
        isActive: true,
      }
    ];

    console.log('👤 Seeding admin users...');
    for (const adminData of adminUsers) {
      const createdAdmin = await dbStorage.createAdminUser(adminData);
      console.log(`  ✓ Created admin user: ${createdAdmin.name}`);
    }

    // Create default drivers
    const defaultDrivers = [
      {
        name: "أحمد محمد السائق",
        phone: "+967771234567",
        password: "123456",
        isAvailable: true,
        isActive: true,
        currentLocation: "صنعاء، شارع الزبيري",
        earnings: "2500",
      },
      {
        name: "علي حسن السائق",
        phone: "+967779876543",
        password: "123456",
        isAvailable: true,
        isActive: true,
        currentLocation: "صنعاء، شارع السبعين",
        earnings: "3200",
      }
    ];

    console.log('🚗 Seeding drivers...');
    for (const driverData of defaultDrivers) {
      const createdDriver = await dbStorage.createDriver(driverData);
      console.log(`  ✓ Created driver: ${createdDriver.name}`);
    }

    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Seeded: ${categories.length} categories, ${restaurants.length} restaurants, ${menuItems.length} menu items, ${defaultUiSettings.length} UI settings, ${adminUsers.length} admin users, ${defaultDrivers.length} drivers`);

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}