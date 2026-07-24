import express from "express";
import { storage } from "../storage.js";
import * as schema from "../../shared/schema.js";
import { eq, desc, and, or, like, sql } from "drizzle-orm";

const router = express.Router();

// التحقق من حالة التطبيق
router.get("/app-status", async (req, res) => {
  try {
    const { opening, closing, status } = req.query;
    const openingTime = opening as string || '08:00';
    const closingTime = closing as string || '23:00';
    const storeStatus = status as string || 'auto';

    if (storeStatus === 'closed') {
      return res.json({ isOpen: false, message: "التطبيق مغلق حالياً من قِبل الإدارة", openingTime, closingTime });
    }

    if (storeStatus === 'force_open') {
      return res.json({ isOpen: true, message: "مفتوح بقرار الإدارة", openingTime, closingTime });
    }

    const now = new Date();
    // الحصول على الوقت الحالي بتوقيت اليمن/السعودية (UTC+3)
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Riyadh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const currentTime = formatter.format(now);
    
    const timeToMinutes = (t: string) => { 
      const [h, m] = t.split(':').map(Number); 
      return (h || 0) * 60 + (m || 0); 
    };
    
    const current = timeToMinutes(currentTime);
    const open = timeToMinutes(openingTime);
    const close = timeToMinutes(closingTime);
    
    let appIsOpen = false;
    if (close > open) {
      appIsOpen = current >= open && current < close;
    } else if (close < open) {
      appIsOpen = current >= open || current < close;
    } else {
      appIsOpen = true;
    }

    if (!appIsOpen) {
      const isBeforeOpen = current < open;
      const whenOpen = isBeforeOpen ? `يفتح اليوم الساعة ${openingTime}` : `يفتح غداً الساعة ${openingTime}`;
      return res.json({ 
        isOpen: false, 
        message: `التطبيق مغلق حالياً. ${whenOpen}`,
        openingTime,
        closingTime
      });
    }

    res.json({ isOpen: true, message: `مفتوح حتى ${closingTime}`, openingTime, closingTime });
  } catch (error) {
    res.status(500).json({ isOpen: false, message: "خطأ في التحقق من حالة التطبيق" });
  }
});

// جلب التصنيفات
router.get("/categories", async (req, res) => {
  try {
    const categories = await storage.getCategories();
    res.json(categories);
  } catch (error) {
    console.error("خطأ في جلب التصنيفات:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب المطاعم
router.get("/restaurants", async (req, res) => {
  try {
    const { categoryId, search } = req.query;
    
    let restaurants;
    if (search) {
      restaurants = await storage.searchRestaurants(`%${search}%`, categoryId as string);
    } else if (categoryId && categoryId !== 'all') {
      restaurants = await storage.getRestaurantsByCategory(categoryId as string);
    } else {
      restaurants = await storage.getRestaurants();
    }

    res.json(restaurants);
  } catch (error) {
    console.error("خطأ في جلب المطاعم:", error);
    res.status(500).json({ message: "Failed to fetch restaurants" });
  }
});

// جلب تفاصيل مطعم محدد
router.get("/restaurants/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const restaurant = await storage.getRestaurant(id);

    if (!restaurant) {
      return res.status(404).json({ message: "المطعم غير موجود" });
    }

    res.json(restaurant);
  } catch (error) {
    console.error("خطأ في جلب تفاصيل المطعم:", error);
    res.status(500).json({ message: "Failed to fetch restaurant" });
  }
});

// جلب قائمة مطعم
router.get("/restaurants/:id/menu", async (req, res) => {
  try {
    const { id } = req.params;
    
    // التحقق من وجود المطعم
    const restaurant = await storage.getRestaurant(id);

    if (!restaurant) {
      return res.status(404).json({ message: "المطعم غير موجود" });
    }

    // جلب عناصر القائمة
    const menuItems = await storage.getMenuItems(id);

    res.json({
      restaurant,
      menu: [],
      allItems: menuItems
    });
  } catch (error) {
    console.error("خطأ في جلب قائمة المطعم:", error);
    res.status(500).json({ message: "Failed to fetch menu items" });
  }
});

// جلب أقسام المطعم
router.get("/restaurants/:id/sections", async (req, res) => {
  try {
    const { id } = req.params;
    const sections = await storage.getRestaurantSections(id);
    res.json(sections);
  } catch (error) {
    console.error("خطأ في جلب أقسام المطعم:", error);
    res.status(500).json({ message: "Failed to fetch restaurant sections" });
  }
});

// تقييم مطعم مباشرة
router.post("/restaurants/:id/rate", async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, customerName } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "التقييم يجب أن يكون بين 1 و 5" });
    }

    const restaurant = await storage.getRestaurant(id);
    if (!restaurant) {
      return res.status(404).json({ message: "المطعم غير موجود" });
    }

    const ratingData = {
      restaurantId: id,
      customerName: customerName || "زائر",
      rating: Number(rating),
      comment: comment || null,
      isApproved: false,
    };

    const newRating = await storage.createRating(ratingData as any);
    res.status(201).json({ success: true, rating: newRating });
  } catch (error) {
    console.error("خطأ في إرسال التقييم:", error);
    res.status(500).json({ message: "فشل في إرسال التقييم" });
  }
});

// جلب العروض الخاصة
router.get("/special-offers", async (req, res) => {
  try {
    console.log("🔍 Storage type:", storage.constructor.name);
    
    // Disable caching to see changes
    res.set('Cache-Control', 'no-store');
    
    const { active } = req.query;
    let offers;
    
    // Default to active offers for homepage
    if (active === 'false') {
      offers = await storage.getSpecialOffers();
    } else {
      offers = await storage.getActiveSpecialOffers();
    }
    
    console.log("📊 Found offers:", offers.length, offers);
    res.json(offers);
  } catch (error) {
    console.error("خطأ في جلب العروض الخاصة:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إنشاء طلب جديد
router.post("/orders", async (req, res) => {
  try {
    const orderData = req.body;
    
    // توليد رقم طلب فريد
    const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    const newOrderData = {
      ...orderData,
      orderNumber,
      status: "pending",
      paymentStatus: "pending"
    };

    const [newOrder] = await db.insert(schema.orders)
      .values(newOrderData)
      .returning();

    // إضافة تتبع للطلب
    await db.insert(schema.orderTracking).values({
      orderId: newOrder.id,
      status: "pending",
      message: "تم إنشاء الطلب بنجاح",
      createdByType: 'system'
    });

    // إشعار المطعم (يمكن إضافة WebSocket هنا)
    
    res.json(newOrder);
  } catch (error) {
    console.error("خطأ في إنشاء الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تتبع الطلب
router.get("/orders/:id/track", async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await db.query.orders.findFirst({
      where: eq(schema.orders.id, id),
    });

    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    // جلب تتبع الطلب
    const tracking = await db.query.orderTracking.findMany({
      where: eq(schema.orderTracking.orderId, id),
      orderBy: desc(schema.orderTracking.timestamp!)
    });

    res.json({
      order,
      tracking
    });
  } catch (error) {
    console.error("خطأ في تتبع الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب إعدادات النظام العامة
router.get("/settings", async (req, res) => {
  try {
    const settings = await db.query.systemSettings.findMany({
      where: eq(schema.systemSettings.isPublic, true)
    });
    
    // تحويل الإعدادات إلى كائن
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as any);
    
    res.json(settingsObject);
  } catch (error) {
    console.error("خطأ في جلب الإعدادات:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// البحث العام
router.get("/search", async (req, res) => {
  try {
    const { q, type = 'all' } = req.query;
    
    if (!q) {
      return res.json({ restaurants: [], categories: [], menuItems: [] });
    }

    const searchTerm = `%${q}%`;
    let results: any = { restaurants: [], categories: [], menuItems: [] };

    if (type === 'all' || type === 'restaurants') {
      results.restaurants = await storage.searchRestaurants(searchTerm);
    }

    if (type === 'all' || type === 'categories') {
      results.categories = await storage.searchCategories(searchTerm);
    }

    if (type === 'all' || type === 'menu') {
      results.menuItems = await storage.searchMenuItems(searchTerm);
    }

    res.json(results);
  } catch (error) {
    console.error("خطأ في البحث:", error);
    res.status(500).json({ message: "Failed to search" });
  }
});

// التحقق من صحة الكوبون - للعملاء
router.post("/coupons/validate", async (req, res) => {
  try {
    const { code, orderValue, categoryIds } = req.body;
    if (!code) return res.status(400).json({ valid: false, message: "كود الكوبون مطلوب" });

    const result = await storage.validateCoupon(code, orderValue || 0);

    if (!result.valid) {
      return res.json(result);
    }

    // التحقق من تصنيف الكوبون
    if (result.coupon?.categoryId && categoryIds?.length > 0) {
      const couponCategoryId = String(result.coupon.categoryId);
      const cartCategories = categoryIds.map((id: any) => String(id));
      if (!cartCategories.includes(couponCategoryId)) {
        return res.json({
          valid: false,
          message: "هذا الكوبون مخصص لتصنيف معين لا يوجد في سلتك"
        });
      }
    }

    res.json(result);
  } catch (error) {
    console.error("خطأ في التحقق من الكوبون:", error);
    res.status(500).json({ valid: false, message: "خطأ في التحقق من الكوبون" });
  }
});

// ==========================================
// 📱 Flutter App Configuration API
// ==========================================
router.get("/flutter/app-config", async (req, res) => {
  try {
    const settingKeys = [
      'splash_image_url', 'splash_image_url2', 'splash_title', 'splash_subtitle',
      'splash_background_color', 'splash_duration', 'logo_url', 'app_name',
      'primary_color', 'secondary_color', 'accent_color', 'store_status',
      'privacy_policy_text', 'show_splash_screen'
    ];

    const settings: Record<string, string> = {};
    for (const key of settingKeys) {
      try {
        const setting = await storage.getUiSetting(key);
        if (setting) settings[key] = String(setting.value ?? '');
      } catch {}
    }

    const webAppUrl = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : process.env.REPL_SLUG
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
        : process.env.WEB_APP_URL || '';

    res.json({
      success: true,
      config: {
        splashEnabled: settings['show_splash_screen'] !== 'false',
        splashImageUrl: settings['splash_image_url'] || '',
        splashImageUrl2: settings['splash_image_url2'] || '',
        splashTitle: settings['splash_title'] || 'السريع ون',
        splashSubtitle: settings['splash_subtitle'] || 'متجر الخضار والفواكه',
        splashBackgroundColor: settings['splash_background_color'] || '#FFFFFF',
        splashDuration: parseInt(settings['splash_duration'] || '3000'),
        logoUrl: settings['logo_url'] || '',
        appName: settings['app_name'] || 'السريع ون',
        appVersion: '1.0.0',
        primaryColor: settings['primary_color'] || '#4CAF50',
        secondaryColor: settings['secondary_color'] || '#FF9800',
        accentColor: settings['accent_color'] || '#2196F3',
        webAppUrl: webAppUrl,
        storeStatus: settings['store_status'] || 'open',
        privacyPolicyText: settings['privacy_policy_text'] || '',
      }
    });
  } catch (error) {
    console.error("Flutter config error:", error);
    res.json({
      success: false,
      config: {
        splashEnabled: true,
        splashImageUrl: '',
        splashImageUrl2: '',
        splashTitle: 'السريع ون',
        splashSubtitle: 'متجر الخضار والفواكه',
        splashBackgroundColor: '#FFFFFF',
        splashDuration: 3000,
        logoUrl: '',
        appName: 'السريع ون',
        appVersion: '1.0.0',
        primaryColor: '#4CAF50',
        secondaryColor: '#FF9800',
        accentColor: '#2196F3',
        webAppUrl: '',
        storeStatus: 'open',
        privacyPolicyText: '',
      }
    });
  }
});

export { router as publicRoutes };