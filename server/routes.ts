import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "./storage";
import { dbStorage } from "./db";
import { log } from "./viteServer";
import { broadcastSettingsChanged } from "./broadcast";
import authRoutes from "./routes/auth";
import { customerRoutes } from "./routes/customer";
import driverRoutes from "./routes/driver";
import ordersRoutes from "./routes/orders";
import deliveryFeeRoutes from "./routes/delivery-fees";
import { adminRoutes } from "./routes/admin";
import { registerAdvancedRoutes } from "./routes/advanced";
import { publicRoutes } from "./routes/public";
import restaurantAccountsRouter from "./routes/restaurant-accounts";
import flutterRouter from "./routes/flutter";
import wasalniRouter from "./routes/wasalni";
import imageUploadRouter from "./imageUpload";
import { ensureUploadsDir, UPLOADS_DIR } from "./localStorage";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { 
  insertRestaurantSchema, 
  insertMenuItemSchema, 
  insertOrderSchema, 
  insertDriverSchema, 
  insertCategorySchema, 
  insertSpecialOfferSchema,
  insertUiSettingsSchema,
  insertRestaurantSectionSchema,
  insertRatingSchema,
  insertNotificationSchema,
  insertWalletSchema,
  insertWalletTransactionSchema,
  insertSystemSettingsSchema,
  insertRestaurantEarningsSchema,
  insertUserSchema,
  insertCartSchema,
  insertFavoritesSchema,
  orders
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eq, and, gte, lte, desc, isNull } from "drizzle-orm";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {

  // Ensure uploads directory exists
  ensureUploadsDir();

  // Serve uploaded images as static files
  app.use('/uploads', express.static(UPLOADS_DIR));

  // ✅ Serve TWA Digital Asset Links (.well-known) so the Android wrapper
  // verifies ownership and hides the browser top URL bar.
  app.get('/.well-known/assetlinks.json', (_req, res) => {
    try {
      const filePath = path.resolve(import.meta.dirname, '..', 'client', 'public', 'well-known', 'assetlinks.json');
      res.type('application/json').sendFile(filePath);
    } catch (err) {
      res.status(404).json({ error: 'assetlinks.json not found' });
    }
  });

  // Image upload routes (local disk storage)
  app.use('/api/images', imageUploadRouter);

  // Auth Routes
  app.use("/api/auth", authRoutes);

  // Admin and Advanced Routes
  app.use("/api/admin", adminRoutes);
  registerAdvancedRoutes(app);

  // Users
  app.get("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب بيانات المستخدم" });
    }
  });

  app.get("/api/users/username/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب بيانات المستخدم" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: "بيانات المستخدم غير صحيحة" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(id, validatedData);
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "بيانات المستخدم غير صحيحة" });
    }
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Category write operations are only available through /api/admin/categories

  // Enhanced Restaurants with filtering - مطاعم محسنة مع التصفية
  app.get("/api/restaurants", async (req, res) => {
    try {
      const { 
        categoryId, 
        lat, 
        lon, 
        sortBy, 
        isFeatured, 
        isNew, 
        search, 
        radius, 
        isOpen 
      } = req.query;
      
      const filters = {
        categoryId: categoryId as string,
        userLatitude: lat ? parseFloat(lat as string) : undefined,
        userLongitude: lon ? parseFloat(lon as string) : undefined,
        sortBy: sortBy as 'name' | 'rating' | 'deliveryTime' | 'distance' | 'newest',
        isFeatured: isFeatured === 'true',
        isNew: isNew === 'true',
        search: search as string,
        radius: radius ? parseFloat(radius as string) : undefined,
        isOpen: isOpen !== undefined ? isOpen === 'true' : undefined
      };
      
      const restaurants = await storage.getRestaurants(filters);
      res.json(restaurants);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      res.status(500).json({ message: "Failed to fetch restaurants" });
    }
  });

  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      res.json(restaurant);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch restaurant" });
    }
  });

  // Restaurant write operations are only available through /api/admin/restaurants

  // Menu Items
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getAllMenuItems();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/featured", async (req, res) => {
    try {
      const products = await storage.getAllMenuItems();
      const featured = products.filter(p => p.isFeatured);
      res.json(featured.length > 0 ? featured : products.slice(0, 12));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch featured products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.getMenuItem(id);
      if (!item) {
        return res.status(404).json({ message: "المنتج غير موجود" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "فشل في جلب بيانات المنتج" });
    }
  });

  app.get("/api/restaurants/:restaurantId/menu", async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const allItems = await storage.getMenuItems(restaurantId);
      res.json({ allItems });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  // Menu item write operations are only available through /api/admin/menu-items

  // Orders routes are now handled by the dedicated orders router in routes/orders.ts at the bottom
  // Drivers routes are now handled by the dedicated driver router in routes/driver.ts at the bottom

  // Special Offers
  app.get("/api/special-offers", async (req, res) => {
    try {
      log("🔍 Storage type: " + storage.constructor.name);
      
      // Disable caching to see changes
      res.set('Cache-Control', 'no-store');
      
      const { active, restaurantId, offerType } = req.query;
      let offers;
      
      // Default to active offers for homepage
      if (active === 'false') {
        offers = await storage.getSpecialOffers();
      } else {
        offers = await storage.getActiveSpecialOffers();
      }

      // فلترة حسب المتجر
      if (restaurantId) {
        offers = offers.filter((o: any) => o.restaurantId === restaurantId);
      }

      // فلترة حسب نوع العرض
      if (offerType) {
        offers = offers.filter((o: any) => (o.offerType || 'discount') === offerType);
      }
      
      log("📊 Found offers: " + offers.length + " offers");
      res.json(offers);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log("خطأ في جلب العروض الخاصة: " + errorMessage);
      res.status(500).json({ message: "Failed to fetch special offers" });
    }
  });

  // Special offer write operations are only available through /api/admin/special-offers

  // Favorites Routes
  app.get("/api/favorites/restaurants/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const favorites = await storage.getFavoriteRestaurants(userId);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch favorite restaurants" });
    }
  });

  app.get("/api/favorites/products/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const favorites = await storage.getFavoriteProducts(userId);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch favorite products" });
    }
  });

  app.post("/api/favorites", async (req, res) => {
    try {
      const validatedData = insertFavoritesSchema.parse(req.body);
      const favorite = await storage.addToFavorites(validatedData);
      res.status(201).json(favorite);
    } catch (error) {
      res.status(400).json({ message: "Invalid favorite data" });
    }
  });

  app.delete("/api/favorites", async (req, res) => {
    try {
      const { userId, restaurantId, menuItemId } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      const success = await storage.removeFromFavorites(userId as string, restaurantId as string, menuItemId as string);
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Favorite not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  app.get("/api/favorites/check", async (req, res) => {
    try {
      const { userId, restaurantId, menuItemId } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      let isFavorite = false;
      if (restaurantId) {
        isFavorite = await storage.isRestaurantFavorite(userId as string, restaurantId as string);
      } else if (menuItemId) {
        isFavorite = await storage.isProductFavorite(userId as string, menuItemId as string);
      }
      
      res.json({ isFavorite });
    } catch (error) {
      res.status(500).json({ message: "Failed to check favorite" });
    }
  });

  // ===========================================
  // Bootstrap endpoint - يُجمّع كل البيانات الأولية للتطبيق في طلب واحد
  // يُستهلك من شاشة السبلاش لتحضير الكاش قبل دخول المستخدم للتطبيق
  // ===========================================
  app.get("/api/bootstrap", async (req, res) => {
    try {
      const { phone, customerId } = req.query as { phone?: string; customerId?: string };

      // تشغيل كل الاستعلامات بالتوازي لخفض زمن الاستجابة
      const [
        uiSettings,
        categories,
        restaurants,
        specialOffers,
        paymentMethodsRaw,
      ] = await Promise.all([
        storage.getUiSettings().catch(() => []),
        storage.getCategories().catch(() => []),
        storage.getRestaurants({}).catch(() => []),
        storage.getActiveSpecialOffers().catch(() => []),
        (storage as any).getActivePaymentMethods?.().catch(() => []) ?? Promise.resolve([]),
      ]);

      // إثراء طرق الدفع بالمستندات (نفس سلوك /api/payment-methods)
      const paymentMethods = await Promise.all(
        (paymentMethodsRaw || []).map(async (m: any) => {
          try {
            const docs = await (storage as any).getPaymentMethodDocuments?.(m.id) ?? [];
            return { ...m, documents: docs };
          } catch {
            return { ...m, documents: [] };
          }
        })
      );

      // بيانات خاصة بالعميل (اختيارية حسب المعرّف المُمرَّر)
      let customerData: {
        addresses: any[];
        orders: any[];
        notifications: any[];
        unreadCount: number;
      } | null = null;

      if (phone || customerId) {
        const [addresses, orders, allNotifs] = await Promise.all([
          customerId
            ? (storage as any).getUserAddresses?.(customerId).catch(() => []) ?? Promise.resolve([])
            : Promise.resolve([]),
          (phone || customerId)
            ? storage.getOrdersByCustomer(phone || '', customerId as any).catch(() => [])
            : Promise.resolve([]),
          (storage as any).getNotifications?.('customer').catch(() => []) ?? Promise.resolve([]),
        ]);

        const myNotifications = (allNotifs || []).filter((n: any) => {
          if (!n.recipientId || n.recipientId === 'all') return true;
          if (customerId && n.recipientId === customerId) return true;
          if (phone && n.recipientId === phone) return true;
          return false;
        });
        myNotifications.sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        customerData = {
          addresses: addresses || [],
          orders: orders || [],
          notifications: myNotifications.slice(0, 30),
          unreadCount: myNotifications.filter((n: any) => !n.isRead).length,
        };
      }

      res.set('Cache-Control', 'no-store');
      res.json({
        uiSettings,
        categories,
        restaurants,
        specialOffers,
        paymentMethods,
        customer: customerData,
        serverTime: Date.now(),
      });
    } catch (error) {
      console.error('Error in /api/bootstrap:', error);
      res.status(500).json({ message: 'Failed to load bootstrap data' });
    }
  });

  // UI Settings Routes
  app.get("/api/ui-settings", async (req, res) => {
    try {
      const settings = await storage.getUiSettings();
      res.json(settings);
    } catch (error) {
      console.error('خطأ في جلب إعدادات الواجهة:', error);
      res.status(500).json({ message: "Failed to fetch UI settings" });
    }
  });

  app.post("/api/ui-settings/bulk", async (req, res) => {
    try {
      const settingsMap = req.body;
      if (!settingsMap || typeof settingsMap !== 'object') {
        return res.status(400).json({ message: "بيانات غير صالحة" });
      }

      for (const [key, value] of Object.entries(settingsMap)) {
        if (value !== undefined && value !== null) {
          await storage.updateUiSetting(key, String(value));
          broadcastSettingsChanged(key);
        }
      }

      res.json({ success: true, message: "تم تحديث إعدادات الواجهة بنجاح" });
    } catch (error) {
      console.error('خطأ في تحديث إعدادات الواجهة دفعة واحدة:', error);
      res.status(500).json({ message: "Failed to bulk update UI settings" });
    }
  });

  app.get("/api/ui-settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getUiSetting(key);
      if (!setting) {
        return res.status(404).json({ message: "الإعداد غير موجود" });
      }
      res.json(setting);
    } catch (error) {
      console.error('خطأ في جلب إعداد الواجهة:', error);
      res.status(500).json({ message: "Failed to fetch UI setting" });
    }
  });

  app.put("/api/ui-settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      if (value === undefined || value === null) {
        return res.status(400).json({ message: "قيمة الإعداد مطلوبة" });
      }

      const updated = await storage.updateUiSetting(key, String(value));
      if (!updated) {
        return res.status(400).json({ message: "فشل تحديث الإعداد" });
      }
      
      // بث التحديث عبر WebSocket
      broadcastSettingsChanged(key);

      res.json(updated);
    } catch (error) {
      console.error('خطأ في تحديث إعداد الواجهة:', error);
      res.status(500).json({ message: "Failed to update UI setting" });
    }
  });

  // Order Tracking Route
  app.get("/api/orders/:id/track", async (req, res) => {
    try {
      const { id } = req.params;
      let orderData = await storage.getOrder(id);
      let isWaselLi = false;

      // If not found in regular orders, check wasalni requests
      if (!orderData) {
        const wasalniOrder = await storage.getWasalniRequest(id);
        if (wasalniOrder) {
          isWaselLi = true;
          // Map wasalni structure to order structure for tracking page
          orderData = {
            ...wasalniOrder,
            orderNumber: wasalniOrder.requestNumber,
            deliveryAddress: wasalniOrder.toAddress,
            customerLocationLat: wasalniOrder.toLat,
            customerLocationLng: wasalniOrder.toLng,
            total: wasalniOrder.estimatedFee,
            items: [], // Wasalni has no items list usually
            isWaselLi: true,
            pickupAddress: wasalniOrder.fromAddress,
            pickupLocationLat: wasalniOrder.fromLat,
            pickupLocationLng: wasalniOrder.fromLng,
            waselLiItemType: wasalniOrder.orderType,
            restaurantName: "وصل لي"
          };
        }
      }
      
      if (!orderData) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      // Fetch actual tracking from database
      const trackingEntries = await storage.getOrderTracking(id);
      
      // If no tracking entries exist, create a fallback based on status
      let tracking = trackingEntries.map((t, index) => ({
        id: t.id || String(index + 1),
        status: t.status,
        message: t.message,
        timestamp: t.createdAt,
        createdByType: t.createdByType
      }));

      if (tracking.length === 0) {
        const baseTime = new Date(orderData.createdAt);
        
        if (orderData.status === 'pending' || orderData.status === 'confirmed' || orderData.status === 'preparing' || 
            orderData.status === 'on_way' || orderData.status === 'delivered') {
          tracking.push({
            id: '1',
            status: 'pending',
            message: isWaselLi ? 'تم استلام طلب وصل لي' : 'تم استلام الطلب',
            timestamp: baseTime,
            createdByType: 'system'
          });
        }
        
        if (orderData.status === 'confirmed' || orderData.status === 'preparing' || orderData.status === 'on_way' || orderData.status === 'delivered') {
          tracking.push({
            id: '2',
            status: 'confirmed',
            message: isWaselLi ? 'تم قبول طلبك وجاري تعيين سائق' : 'تم تأكيد الطلب من المطعم',
            timestamp: new Date(baseTime.getTime() + 5 * 60000),
            createdByType: isWaselLi ? 'system' : 'restaurant'
          });
        }
        
        if (orderData.status === 'preparing' || orderData.status === 'on_way' || orderData.status === 'delivered') {
          tracking.push({
            id: '3',
            status: 'preparing',
            message: isWaselLi ? 'السائق في الطريق لنقطة الاستلام' : 'جاري تحضير الطلب',
            timestamp: new Date(baseTime.getTime() + 10 * 60000),
            createdByType: isWaselLi ? 'driver' : 'restaurant'
          });
        }
        
        if (orderData.status === 'on_way' || orderData.status === 'delivered') {
          tracking.push({
            id: '4',
            status: 'on_way',
            message: isWaselLi ? 'السائق استلم الغرض وهو في الطريق إليك' : 'الطلب في الطريق إليك',
            timestamp: new Date(baseTime.getTime() + 20 * 60000),
            createdByType: 'driver'
          });
        }
        
        if (orderData.status === 'delivered') {
          tracking.push({
            id: '5',
            status: 'delivered',
            message: isWaselLi ? 'تم توصيل طلب وصل لي بنجاح' : 'تم تسليم الطلب بنجاح',
            timestamp: new Date(baseTime.getTime() + 35 * 60000),
            createdByType: 'driver'
          });
        }
      }
      
      // Parse items if they're stored as JSON string
      let parsedItems = [];
      try {
        parsedItems = typeof orderData.items === 'string' ? JSON.parse(orderData.items) : orderData.items;
      } catch (e) {
        parsedItems = [];
      }

      res.json({
        order: {
          ...orderData,
          items: parsedItems,
          total: parseFloat(orderData.total || '0')
        },
        tracking
      });
    } catch (error) {
      console.error("خطأ في تتبع الطلب:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Driver-specific order endpoints are handled in routes/orders.ts

  app.get("/api/drivers/:id/orders", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.query;
      
      // Get all orders and filter by driver
      const allOrders = await storage.getOrders();
      let driverOrders = allOrders.filter(order => order.driverId === id);
      
      if (status) {
        driverOrders = driverOrders.filter(order => order.status === status);
      }
      
      // Sort by creation date (newest first)
      driverOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json(driverOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch driver orders" });
    }
  });

  app.put("/api/drivers/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, latitude, longitude } = req.body;
      
      const driver = await storage.updateDriver(id, {
        isAvailable: status === 'available',
        currentLocation: latitude && longitude ? `${latitude},${longitude}` : undefined,
      });
      
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }
      
      res.json(driver);
    } catch (error) {
      res.status(400).json({ message: "Failed to update driver status" });
    }
  });

  // Driver dashboard routes

  app.get("/api/drivers/:id/stats", async (req, res) => {
    try {
      const { id } = req.params;
      const { period = 'today' } = req.query;
      
      // Validate UUID format (supports both with and without hyphens)
      const uuidRe = /^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$/i;
      if (!id || id.length < 8 || !uuidRe.test(id.replace(/-/g, ''))) {
        return res.status(400).json({ message: "Invalid driver id format" });
      }
      
      // Check if driver exists
      const driver = await storage.getDriver(id);
      if (!driver) {
        // Return zero stats for non-existent driver to keep client stable
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        return res.json({
          totalOrders: 0,
          totalEarnings: 0,
          avgOrderValue: 0,
          period,
          startDate,
          endDate: new Date()
        });
      }
      
      let startDate: Date;
      const endDate = new Date();
      
      switch (period) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        default:
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
      }
      
      // Get all orders and filter by driver and status
      const allOrders = await storage.getOrders();
      const driverOrders = allOrders.filter(order => 
        order.driverId === id && 
        order.status === 'delivered' &&
        new Date(order.createdAt) >= startDate &&
        new Date(order.createdAt) <= endDate
      );
      
      const totalEarnings = driverOrders.reduce((sum: number, order: any) => {
        // Prefer driverEarnings for driver-specific calculations
        const amount = order.driverEarnings ?? order.totalAmount ?? order.total ?? 0;
        return sum + parseFloat(amount.toString() || '0');
      }, 0);
      
      const stats = {
        totalOrders: driverOrders.length,
        totalEarnings,
        avgOrderValue: driverOrders.length > 0 ? totalEarnings / driverOrders.length : 0,
        period,
        startDate,
        endDate
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch driver stats" });
    }
  });

  // Available orders for drivers are handled in routes/orders.ts

  // ================= RESTAURANT SECTIONS API =================
  app.get("/api/restaurants/:restaurantId/sections", async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const sections = await storage.getRestaurantSections(restaurantId);
      res.json(sections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sections" });
    }
  });

  // ================= RATINGS & REVIEWS API - DISABLED =================
  // Ratings functionality temporarily disabled - would require additional database methods

  // ================= NOTIFICATIONS API =================
  app.get("/api/notifications", async (req, res) => {
    try {
      const { recipientType, recipientId, unread } = req.query;
      const notifications = await storage.getNotifications(
        recipientType as string, 
        recipientId as string, 
        unread === 'true'
      );
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const validatedData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(validatedData);
      res.status(201).json(notification);
    } catch (error) {
      res.status(400).json({ message: "Invalid notification data" });
    }
  });

  app.put("/api/notifications/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const notification = await storage.markNotificationAsRead(id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      res.status(400).json({ message: "Failed to update notification" });
    }
  });

  // ================= WALLET & PAYMENTS API - DISABLED =================
  // Wallet functionality temporarily disabled - would require additional database methods

  // ================= SYSTEM SETTINGS API - DISABLED =================
  // System settings functionality temporarily disabled - would require additional database methods

  // ================= RESTAURANT EARNINGS API - DISABLED =================
  // Restaurant earnings functionality temporarily disabled - would require additional database methods

  // ================= ANALYTICS & REPORTS API - DISABLED =================
  // Analytics functionality temporarily disabled - would require additional database methods

  // ================= ADVANCED ORDER MANAGEMENT =================
  app.get("/api/orders/track/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      let driverLocation = null;
      if (order.driverId) {
        const driver = await storage.getDriver(order.driverId);
        if (driver) {
          driverLocation = driver.currentLocation;
        }
      }
      
      res.json({
        ...order,
        driverLocation
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to track order" });
    }
  });

  // Enhanced Search Routes - مسارات البحث المحسنة
  app.get("/api/search", async (req, res) => {
    try {
      const { 
        q: query, 
        category, 
        lat, 
        lon,
        sortBy,
        isFeatured,
        isNew,
        radius,
        type
      } = req.query;
      
      if (!query) {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      const userLocation = (lat && lon) ? { lat: parseFloat(lat as string), lon: parseFloat(lon as string) } : undefined;
      
      const results: any = {};
      
      if (!type || type === 'restaurants') {
        const filters = {
          search: query as string,
          categoryId: category as string,
          sortBy: sortBy as 'name' | 'rating' | 'deliveryTime' | 'distance' | 'newest',
          isFeatured: isFeatured === 'true',
          isNew: isNew === 'true',
          userLatitude: userLocation?.lat,
          userLongitude: userLocation?.lon,
          radius: radius ? parseFloat(radius as string) : undefined
        };
        results.restaurants = await storage.getRestaurants(filters);
      }
      
      if (!type || type === 'categories') {
        results.categories = await storage.searchCategories(query as string);
      }
      
      if (!type || type === 'menu-items') {
        results.menuItems = await storage.searchMenuItemsAdvanced(query as string);
      }
      
      const total = (results.restaurants?.length || 0) + 
                   (results.categories?.length || 0) + 
                   (results.menuItems?.length || 0);

      res.json({ ...results, total });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Cart endpoints - مسارات السلة
  app.get("/api/cart/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const cartItems = await storage.getCartItems(userId);
      res.json(cartItems);
    } catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).json({ message: 'Failed to fetch cart items' });
    }
  });

  app.post("/api/cart", async (req, res) => {
    try {
      const validatedData = insertCartSchema.parse(req.body);
      const newItem = await storage.addToCart(validatedData);
      res.status(201).json(newItem);
    } catch (error) {
      console.error('Error adding to cart:', error);
      res.status(500).json({ message: 'Failed to add item to cart' });
    }
  });

  app.put("/api/cart/:cartId", async (req, res) => {
    try {
      const { cartId } = req.params;
      const { quantity } = req.body;
      
      if (quantity <= 0) {
        await storage.removeFromCart(cartId);
        res.json({ message: 'Item removed from cart' });
      } else {
        const updatedItem = await storage.updateCartItem(cartId, quantity);
        res.json(updatedItem);
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
      res.status(500).json({ message: 'Failed to update cart item' });
    }
  });

  app.delete("/api/cart/:cartId", async (req, res) => {
    try {
      const { cartId } = req.params;
      const success = await storage.removeFromCart(cartId);
      
      if (success) {
        res.json({ message: 'Item removed from cart' });
      } else {
        res.status(404).json({ message: 'Cart item not found' });
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      res.status(500).json({ message: 'Failed to remove item from cart' });
    }
  });

  app.delete("/api/cart/clear/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const success = await storage.clearCart(userId);
      
      if (success) {
        res.json({ message: 'Cart cleared successfully' });
      } else {
        res.status(404).json({ message: 'No cart items found for user' });
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      res.status(500).json({ message: 'Failed to clear cart' });
    }
  });

  // Favorites endpoints - مسارات المفضلة
  app.get("/api/favorites/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const favorites = await storage.getFavoriteRestaurants(userId);
      res.json(favorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      res.status(500).json({ message: 'Failed to fetch favorite restaurants' });
    }
  });

  app.post("/api/favorites", async (req, res) => {
    try {
      const validatedData = insertFavoritesSchema.parse(req.body);
      const newFavorite = await storage.addToFavorites(validatedData);
      res.status(201).json(newFavorite);
    } catch (error) {
      console.error('Error adding to favorites:', error);
      res.status(500).json({ message: 'Failed to add restaurant to favorites' });
    }
  });

  app.delete("/api/favorites/:userId/:restaurantId", async (req, res) => {
    try {
      const { userId, restaurantId } = req.params;
      const success = await storage.removeFromFavorites(userId, restaurantId);
      
      if (success) {
        res.json({ message: 'Restaurant removed from favorites' });
      } else {
        res.status(404).json({ message: 'Favorite not found' });
      }
    } catch (error) {
      console.error('Error removing from favorites:', error);
      res.status(500).json({ message: 'Failed to remove restaurant from favorites' });
    }
  });

  app.get("/api/favorites/check/:userId/:restaurantId", async (req, res) => {
    try {
      const { userId, restaurantId } = req.params;
      const isFavorite = await storage.isRestaurantFavorite(userId, restaurantId);
      res.json({ isFavorite });
    } catch (error) {
      console.error('Error checking favorite status:', error);
      res.status(500).json({ message: 'Failed to check favorite status' });
    }
  });

  // تم حذف مسارات المصادقة - لا حاجة لها
  
  // Register auth routes
  app.use("/api/auth", authRoutes);
  
  // Register admin routes
  app.use("/api/admin", adminRoutes);
  
  // Register customer routes
  app.use("/api/customer", customerRoutes);
  
  // Register driver routes (plural for consistency)
  app.use("/api/drivers", driverRoutes);
  
  // Register orders routes
  app.use("/api/orders", ordersRoutes);

  // Register delivery fee routes
  app.use("/api/delivery-fees", deliveryFeeRoutes);

  // Register restaurant accounts routes
  app.use("/api/restaurant-accounts", restaurantAccountsRouter);

  // Register Flutter API routes
  app.use("/api/flutter", flutterRouter);

  // Register Wasalni (وصل لي) routes
  app.use("/api/wasalni", wasalniRouter);

  // Register public routes (including Flutter API)
  app.use("/api", publicRoutes);

  // Enhanced notifications endpoint
  app.get("/api/notifications", async (req, res) => {
    try {
      const { recipientType, recipientId, unread } = req.query;
      const notifications = await storage.getNotifications(
        recipientType as string, 
        recipientId as string, 
        unread === 'true'
      );
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Customer notifications endpoint - by phone or customerId
  app.get("/api/notifications/customer", async (req, res) => {
    try {
      const { phone, customerId } = req.query;
      if (!phone && !customerId) {
        return res.status(400).json({ message: "phone or customerId required" });
      }
      // Get ALL customer notifications (both read and unread) - no unread filter
      const allNotifs = await storage.getNotifications('customer');
      const filtered = allNotifs.filter((n: any) => {
        // إذا كان الإشعار موجه لجميع العملاء (recipientId هو null)
        if (!n.recipientId || n.recipientId === 'all') return true;
        
        // إذا كان الإشعار موجه لعميل محدد
        if (customerId && n.recipientId === customerId) return true;
        if (phone && n.recipientId === phone) return true;
        
        return false;
      });
      filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(filtered);
    } catch (error) {
      console.error('Error fetching customer notifications:', error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark all customer notifications as read
  app.put("/api/notifications/customer/mark-all-read", async (req, res) => {
    try {
      const { phone, customerId } = req.body;
      if (!phone && !customerId) {
        return res.status(400).json({ message: "phone or customerId required" });
      }
      const allNotifs = await storage.getNotifications('customer');
      const unread = allNotifs.filter((n: any) => {
        if (n.isRead) return false;
        if (!n.recipientId || n.recipientId === 'all') return true;
        if (customerId && n.recipientId === customerId) return true;
        if (phone && n.recipientId === phone) return true;
        return false;
      });
      await Promise.all(unread.map((n: any) => (storage as any).markNotificationAsRead(n.id)));

      // بث حدث المزامنة لجميع أجهزة العميل لتحديث الشارة فوراً
      if (global.WS_MANAGER) {
        const payload = { allRead: true, count: unread.length };
        if (customerId) global.WS_MANAGER.sendToUser(customerId, 'notifications_updated', payload);
        if (phone) global.WS_MANAGER.sendToUser(phone, 'notifications_updated', payload);
      }

      res.json({ success: true, markedCount: unread.length });
    } catch (error) {
      console.error('Error marking customer notifications as read:', error);
      res.status(500).json({ message: "Failed to mark notifications as read" });
    }
  });

  // Mark notification as read
  app.put("/api/notifications/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const notification = await (storage as any).markNotificationAsRead(id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      // بث المزامنة للمستلم لتحديث الشارة على بقية الأجهزة/التبويبات
      if (global.WS_MANAGER && notification.recipientId) {
        const payload = { id: notification.id, isRead: true };
        if (notification.recipientType === 'driver') {
          global.WS_MANAGER.sendToDriver(notification.recipientId, 'notifications_updated', payload);
        } else {
          global.WS_MANAGER.sendToUser(notification.recipientId, 'notifications_updated', payload);
        }
      }

      res.json(notification);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  // Public Payment Methods Route
  app.get("/api/payment-methods", async (req, res) => {
    try {
      const methods = await (storage as any).getActivePaymentMethods();
      const methodsWithDocs = await Promise.all(methods.map(async (m: any) => {
        const docs = await (storage as any).getPaymentMethodDocuments(m.id);
        return { ...m, documents: docs };
      }));
      res.json(methodsWithDocs);
    } catch (error) {
      console.error("خطأ في جلب طرق الدفع:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Coupon Validation Route
  app.post("/api/coupons/validate", async (req, res) => {
    try {
      const { code, orderValue, userId, userPhone } = req.body;
      if (!code) return res.status(400).json({ error: "كود الكوبون مطلوب" });
      if (!orderValue) return res.status(400).json({ error: "قيمة الطلب مطلوبة" });
      const result = await (storage as any).validateCoupon(code, parseFloat(orderValue), userId, userPhone);
      res.json(result);
    } catch (error) {
      console.error("خطأ في التحقق من الكوبون:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
