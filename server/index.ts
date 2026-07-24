import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { eq, lt, gt, isNotNull, inArray, and, sql } from "drizzle-orm";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupWebSockets } from "./socket";
import { registerBroadcast } from "./broadcast";
import { setupVite, serveStatic, log } from "./viteServer";
import { seedDefaultData, ensureDefaultSettings } from "./seed";
import { ensureTablesExist } from "./autoMigrate";
import { storage } from "./storage";

const app = express();

// Enable gzip compression for all responses - major performance improvement
app.use(compression({
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6,        // Balanced compression level
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

// Disable ETag caching to fix special offers not updating
app.set('etag', false);

// Smart caching for API routes
app.use('/api', (req, res, next) => {
  // Disable cache for mutation requests and auth-sensitive endpoints
  if (req.method !== 'GET') {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  } else if (req.path.includes('/special-offers') || req.path.includes('/settings')) {
    // Short cache for frequently changing public data
    res.set('Cache-Control', 'public, max-age=30');
  }
  next();
});

// Lightweight request logger (no JSON capture overhead)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    await ensureTablesExist();
    const server = await registerRoutes(app);
    
    // Setup WebSockets
    const ws = setupWebSockets(server);
    app.set('ws', ws);
    global.WS_MANAGER = ws;
    registerBroadcast(ws.broadcast);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });

    // Seed database with default data if using DatabaseStorage
    if (storage.constructor.name === 'DatabaseStorage') {
      log('🌱 Seeding database with default data...');
      await seedDefaultData();
      // ضمان وجود جميع إعدادات الواجهة الافتراضية (يعمل عند كل تشغيل)
      await ensureDefaultSettings();
    }

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    const port = parseInt(process.env.PORT || '3000', 10);
    server.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });

    setInterval(async () => {
      // ===== تنبيه الطلبات التي مرّ عليها 15 دقيقة دون تعيين سائق =====
      try {
        const allOrdersForAlert = await storage.getOrders();
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const alertedMap: Map<string, number> = ((globalThis as any).__unassignedAlerts ||= new Map());
        // تنظيف العناصر القديمة (أقدم من 24 ساعة)
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        for (const [k, v] of alertedMap) if (v < dayAgo) alertedMap.delete(k);

        const stale = allOrdersForAlert.filter((o: any) => {
          if (o.driverId) return false;
          const status = String(o.status || '').toLowerCase();
          if (!['pending', 'confirmed', 'preparing', 'ready'].includes(status)) return false;
          const createdAt = o.createdAt ? new Date(o.createdAt) : null;
          if (!createdAt || isNaN(createdAt.getTime())) return false;
          if (createdAt > fifteenMinutesAgo) return false;
          // لا تنبّه أكثر من مرة لنفس الطلب خلال نفس الساعة
          const lastAlerted = alertedMap.get(o.id);
          if (lastAlerted && (Date.now() - lastAlerted) < 60 * 60 * 1000) return false;
          return true;
        });

        if (stale.length > 0) {
          const wsServer = app.get('ws');
          for (const order of stale) {
            alertedMap.set((order as any).id, Date.now());
            const minutes = Math.floor((Date.now() - new Date((order as any).createdAt).getTime()) / 60000);
            const message = `الطلب رقم ${(order as any).orderNumber} لم يُسند إلى سائق منذ ${minutes} دقيقة`;
            try {
              await storage.createNotification({
                type: 'order_unassigned_alert',
                title: '⚠️ طلب بدون سائق',
                message,
                recipientType: 'admin',
                recipientId: null,
                orderId: (order as any).id,
                isRead: false,
              });
            } catch (e) { console.error('خطأ في إنشاء إشعار الإسناد المتأخر:', e); }
            if (wsServer && typeof wsServer.sendToAdmin === 'function') {
              wsServer.sendToAdmin('order_unassigned_alert', {
                orderId: (order as any).id,
                orderNumber: (order as any).orderNumber,
                customerName: (order as any).customerName,
                minutes,
                message,
              });
            }
          }
        }
      } catch (e) { console.error('خطأ في تنبيه الطلبات غير المُسندة:', e); }

      // ===== تنظيف دوري كل ساعة: حذف الإشعارات > 24 ساعة والطلبات المنتهية > يومين =====
      try {
        const counterKey = '__cleanupCounter';
        const counter: number = ((globalThis as any)[counterKey] || 0) + 1;
        (globalThis as any)[counterKey] = counter;
        // 60 = كل ساعة (لأن المؤقت يعمل كل دقيقة). نُشغّل التنظيف عند بدء التشغيل ثم كل ساعة.
        const shouldRun = counter === 1 || counter % 60 === 0;
        if (shouldRun && (storage as any).db) {
          const db = (storage as any).db;
          const schema = await import("../shared/schema");
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

          // ---- 1) حذف الإشعارات الأقدم من 24 ساعة ----
          // (نستثني إشعارات تحذير حذف التتبع حتى يراها العميل قبل الحذف)
          try {
            const deletedNotifs = await db
              .delete(schema.notifications)
              .where(and(
                lt(schema.notifications.createdAt, oneDayAgo),
                sql`${schema.notifications.type} <> 'order_tracking_deletion_warning'`,
              ))
              .returning({ id: schema.notifications.id });
            if (deletedNotifs?.length) log(`🧹 تم حذف ${deletedNotifs.length} إشعاراً قديماً (>24 ساعة)`);
          } catch (e) { console.error('خطأ في حذف الإشعارات القديمة:', e); }

          // ---- 1.5) إرسال تحذير حذف التتبع للعملاء المسجلين قبل 24 ساعة من الحذف ----
          // الطلبات المنتهية للعملاء المسجلين (customerId IS NOT NULL) التي مر عليها بين 23 و 25 ساعة
          // ولم يُرسل لها تحذير من قبل.
          try {
            const TERMINAL = ['delivered', 'cancelled', 'refunded', 'rejected', 'completed'];
            const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);
            const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

            const candidateOrders = await db
              .select({
                id: schema.orders.id,
                orderNumber: schema.orders.orderNumber,
                customerId: schema.orders.customerId,
                customerPhone: schema.orders.customerPhone,
              })
              .from(schema.orders)
              .where(and(
                inArray(schema.orders.status, TERMINAL),
                lt(schema.orders.createdAt, twentyThreeHoursAgo),
                gt(schema.orders.createdAt, twentyFiveHoursAgo),
                isNotNull(schema.orders.customerId),
              ));

            for (const order of candidateOrders) {
              try {
                // تحقق من عدم إرسال تحذير سابق لنفس الطلب
                const existing = await db
                  .select({ id: schema.notifications.id })
                  .from(schema.notifications)
                  .where(and(
                    eq(schema.notifications.orderId, order.id),
                    eq(schema.notifications.type, 'order_tracking_deletion_warning'),
                  ))
                  .limit(1);
                if (existing.length > 0) continue;

                const recipients = Array.from(new Set([order.customerId, order.customerPhone].filter(Boolean))) as string[];
                for (const rid of recipients) {
                  await storage.createNotification({
                    type: 'order_tracking_deletion_warning',
                    title: '🗑️ تنبيه: سيتم حذف بيانات تتبع طلبك',
                    message: `سيتم حذف بيانات تتبع طلبك رقم ${order.orderNumber} خلال 24 ساعة. يرجى الاحتفاظ بأي معلومات مهمة قبل ذلك.`,
                    recipientType: 'customer',
                    recipientId: rid,
                    orderId: order.id,
                    isRead: false,
                  });
                }
              } catch (e) {
                console.error(`خطأ في إرسال تحذير حذف التتبع للطلب ${order.id}:`, e);
              }
            }
            if (candidateOrders.length > 0) {
              log(`📨 تم فحص ${candidateOrders.length} طلباً لتحذيرات حذف التتبع`);
            }
          } catch (e) { console.error('خطأ في إرسال تحذيرات حذف التتبع:', e); }

          // ---- 2) حذف الطلبات المنتهية الأقدم من يومين (وكل سجلاتها المرتبطة) ----
          try {
            const TERMINAL = ['delivered', 'cancelled', 'refunded', 'rejected', 'completed'];
            const oldOrders = await db
              .select({ id: schema.orders.id })
              .from(schema.orders)
              .where(and(
                lt(schema.orders.createdAt, twoDaysAgo),
                inArray(schema.orders.status, TERMINAL),
              ));

            if (oldOrders.length > 0) {
              const oldIds = oldOrders.map((o: any) => o.id);

              // حذف السجلات التابعة بالترتيب الآمن (FKs تشير إلى orders.id)
              const childTables: any[] = [
                schema.orderTracking,
                schema.ratings,
                schema.driverReviews,
                schema.driverCommissions,
                schema.walletTransactions,
                schema.loyaltyTransactions,
                schema.supportTickets,
                schema.messages,
                schema.couponUsages,
              ].filter(Boolean);

              for (const tbl of childTables) {
                try {
                  await db.delete(tbl).where(inArray((tbl as any).orderId, oldIds));
                } catch (e) {
                  console.error(`خطأ في حذف سجلات تابعة من جدول ${(tbl as any)[Symbol.for('drizzle:Name')] || ''}:`, e);
                }
              }

              // حذف إشعارات الطلبات (لا توجد علاقة FK لكن نُنظّفها يدوياً)
              try {
                await db.delete(schema.notifications).where(inArray(schema.notifications.orderId, oldIds));
              } catch (_) {}

              // حذف الطلبات نفسها
              try {
                const deletedOrders = await db
                  .delete(schema.orders)
                  .where(inArray(schema.orders.id, oldIds))
                  .returning({ id: schema.orders.id });
                if (deletedOrders?.length) log(`🧹 تم حذف ${deletedOrders.length} طلب منتهي قديم (>يومين)`);
              } catch (e) {
                console.error('فشل حذف الطلبات القديمة (قد يكون بسبب علاقة لم تُحذف):', e);
              }
            }
          } catch (e) { console.error('خطأ في حذف الطلبات القديمة:', e); }

          // ---- 3) حذف طلبات وصل لي المنتهية الأقدم من يومين ----
          try {
            if (schema.wasalniRequests) {
              const TERMINAL_WASALNI = ['delivered', 'cancelled', 'completed', 'rejected'];
              const deletedWasalni = await db
                .delete(schema.wasalniRequests)
                .where(and(
                  lt(schema.wasalniRequests.createdAt, twoDaysAgo),
                  inArray(schema.wasalniRequests.status, TERMINAL_WASALNI),
                ))
                .returning({ id: schema.wasalniRequests.id });
              if (deletedWasalni?.length) log(`🧹 تم حذف ${deletedWasalni.length} طلب "وصل لي" منتهي قديم`);
            }
          } catch (e) { console.error('خطأ في حذف طلبات وصل لي القديمة:', e); }
        }
      } catch (e) { console.error('خطأ في مهمة التنظيف الدورية:', e); }
    }, 60 * 1000);

  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();