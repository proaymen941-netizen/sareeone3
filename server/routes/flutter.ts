import express from "express";
import { storage } from "../storage.js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { deviceTokens, notifications } from "../../shared/schema.js";
import { eq, and, gt, desc, or } from "drizzle-orm";

const router = express.Router();

let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const isCloudProvider = url.includes("render.com") || url.includes("dpg-") || url.includes("neon.tech") || url.includes("supabase") || url.includes("aws");
  const hasSslMode = url.includes("sslmode=") || url.includes("ssl=");
  const ssl = (isCloudProvider || hasSslMode || process.env.NODE_ENV === "production" || process.env.DB_SSL === "true") ? { rejectUnauthorized: false } : undefined;
  const client = postgres(url, { max: 5, ssl });
  _db = drizzle(client);
  return _db;
}

// GET /api/flutter/app-config
// يُعيد إعدادات التطبيق للـ Flutter app
router.get("/app-config", async (req, res) => {
  try {
    const settings = await storage.getUiSettings();

    const getValue = (key: string, fallback: any = "") => {
      if (!Array.isArray(settings)) return fallback;
      const setting = settings.find((s: any) => s.key === key);
      return setting ? setting.value : fallback;
    };

    const serverUrl = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : `http://localhost:${process.env.PORT || 5000}`;

    const config = {
      splashEnabled: getValue("splashEnabled", "true") !== "false",
      splashImageUrl: getValue("splashImageUrl", ""),
      splashImageUrl2: getValue("splashImageUrl2", ""),
      splashTitle: getValue("splashTitle", "السريع ون"),
      splashSubtitle: getValue("splashSubtitle", "متجر الخضار والفواكه"),
      splashBackgroundColor: getValue("splashBackgroundColor", "#FFFFFF"),
      splashDuration: parseInt(getValue("splashDuration", "3000"), 10),
      appName: getValue("appName", "السريع ون"),
      appVersion: getValue("appVersion", "1.1.0"),
      primaryColor: getValue("primaryColor", "#E53935"),
      secondaryColor: getValue("secondaryColor", "#4CAF50"),
      accentColor: getValue("accentColor", "#FF9800"),
      logoUrl: getValue("logoUrl", ""),
      webAppUrl: getValue("webAppUrl", serverUrl),
      storeStatus: getValue("storeStatus", "open"),
      privacyPolicyText: getValue("privacyPolicyText", ""),
      showSearchBar: getValue("showSearchBar", "true") !== "false",
      showCategories: getValue("showCategories", "true") !== "false",
      showSpecialOffers: getValue("showSpecialOffers", "true") !== "false",
      showSupportButton: getValue("showSupportButton", "true") !== "false",
      supportWhatsapp: getValue("supportWhatsapp", "966500000000"),
      openingTime: getValue("openingTime", "08:00"),
      closingTime: getValue("closingTime", "23:00"),
      serverUrl,
    };

    res.json({ success: true, config });
  } catch (error) {
    console.error("خطأ في جلب إعدادات Flutter:", error);
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

// POST /api/flutter/register-token
// يسجّل رمز FCM لجهاز المستخدم
router.post("/register-token", async (req, res) => {
  try {
    const { token, platform } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "Token مطلوب" });
    }

    const db = getDb();

    await db
      .insert(deviceTokens)
      .values({
        token,
        platform: platform || "android",
        isActive: true,
      })
      .onConflictDoUpdate({
        target: deviceTokens.token,
        set: {
          platform: platform || "android",
          isActive: true,
          updatedAt: new Date(),
        },
      });

    res.json({ success: true, message: "تم تسجيل الجهاز بنجاح" });
  } catch (error) {
    console.error("خطأ في تسجيل رمز FCM:", error);
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

// POST /api/flutter/deregister-token
// يلغي تسجيل رمز FCM عند تسجيل الخروج
router.post("/deregister-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "Token مطلوب" });
    }

    const db = getDb();

    await db
      .update(deviceTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(deviceTokens.token, token));

    res.json({ success: true, message: "تم إلغاء تسجيل الجهاز" });
  } catch (error) {
    console.error("خطأ في إلغاء رمز FCM:", error);
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

// GET /api/flutter/notifications/poll?since=<ISO_TIMESTAMP>
// تطبيق Flutter يستدعي هذا endpoint دورياً لجلب الإشعارات الجديدة
// يُعيد إشعارات من نوع "all" أو "customer" أُنشئت بعد الـ timestamp المحدد
router.get("/notifications/poll", async (req, res) => {
  try {
    const db = getDb();
    const since = req.query.since as string | undefined;

    let sinceDate: Date;
    if (since) {
      sinceDate = new Date(since);
      if (isNaN(sinceDate.getTime())) {
        sinceDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      }
    } else {
      sinceDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    const newNotifications = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        recipientType: notifications.recipientType,
        orderId: notifications.orderId,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(
        and(
          or(
            eq(notifications.recipientType, "all"),
            eq(notifications.recipientType, "customer"),
            eq(notifications.recipientType, "flutter")
          ),
          gt(notifications.createdAt, sinceDate)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    res.json({
      success: true,
      notifications: newNotifications,
      count: newNotifications.length,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("خطأ في جلب إشعارات Flutter:", error);
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

// POST /api/flutter/notifications/send
// لوحة التحكم ترسل إشعار مباشرة لكل أجهزة Flutter
router.post("/notifications/send", async (req, res) => {
  try {
    const { title, message, type = "info", recipientType = "flutter" } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: "العنوان والمحتوى مطلوبان" });
    }

    const db = getDb();

    const newNotification = await storage.createNotification({
        type,
        title,
        message,
        recipientType,
        recipientId: null,
        isRead: false,
      });

    res.json({
      success: true,
      message: "تم إرسال الإشعار بنجاح لجميع أجهزة التطبيق",
      notification: newNotification,
    });
  } catch (error) {
    console.error("خطأ في إرسال إشعار Flutter:", error);
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

// POST /api/flutter/notifications/send-targeted
// إرسال إشعار موجّه لفئة محددة
router.post("/notifications/send-targeted", async (req, res) => {
  try {
    const { title, message, type = "info", recipientType = "all", recipientId = null } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: "العنوان والمحتوى مطلوبان" });
    }

    const db = getDb();

    const newNotification = await storage.createNotification({
        type,
        title,
        message,
        recipientType,
        recipientId: recipientId || null,
        isRead: false,
      });

    const recipientLabel =
      recipientType === 'all' ? 'جميع المستخدمين' :
      recipientType === 'customer' ? 'العملاء' :
      recipientType === 'driver' ? 'السائقين' :
      recipientType === 'flutter' ? 'مستخدمي التطبيق' :
      'مستخدم محدد';

    res.json({
      success: true,
      message: `تم إرسال الإشعار بنجاح إلى ${recipientLabel}`,
      notification: newNotification,
    });
  } catch (error) {
    console.error("خطأ في إرسال الإشعار الموجّه:", error);
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

// GET /api/flutter/notifications/history
// سجل جميع الإشعارات المرسلة
router.get("/notifications/history", async (req, res) => {
  try {
    const db = getDb();
    const { recipientType, type: notifType, limit: limitStr, offset: offsetStr } = req.query;

    const limitNum = parseInt(limitStr as string) || 50;
    const offsetNum = parseInt(offsetStr as string) || 0;

    let query = db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt));

    const allNotifications = await query;

    let filtered = allNotifications;
    if (recipientType && recipientType !== 'all') {
      filtered = filtered.filter(n => n.recipientType === recipientType);
    }
    if (notifType) {
      filtered = filtered.filter(n => n.type === notifType);
    }

    const paginated = filtered.slice(offsetNum, offsetNum + limitNum);
    const unreadCount = filtered.filter(n => !n.isRead).length;

    res.json({
      success: true,
      notifications: paginated,
      total: filtered.length,
      unreadCount,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error("خطأ في جلب سجل الإشعارات:", error);
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

// DELETE /api/flutter/notifications/:id
// حذف إشعار
router.delete("/notifications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    await db.delete(notifications).where(eq(notifications.id, id));

    res.json({ success: true, message: "تم حذف الإشعار بنجاح" });
  } catch (error) {
    console.error("خطأ في حذف الإشعار:", error);
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

// GET /api/flutter/notifications/stats
// إحصائيات الإشعارات
router.get("/notifications/stats", async (req, res) => {
  try {
    const db = getDb();
    const allNotifications = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
    const deviceCount = await db.select().from(deviceTokens).where(eq(deviceTokens.isActive, true));

    const total = allNotifications.length;
    const unread = allNotifications.filter(n => !n.isRead).length;
    const byType: Record<string, number> = {};
    const byRecipient: Record<string, number> = {};

    allNotifications.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
      byRecipient[n.recipientType] = (byRecipient[n.recipientType] || 0) + 1;
    });

    res.json({
      success: true,
      total,
      unread,
      readRate: total > 0 ? ((total - unread) / total * 100).toFixed(1) : '0',
      deviceCount: deviceCount.length,
      byType,
      byRecipient,
    });
  } catch (error) {
    console.error("خطأ في جلب إحصائيات الإشعارات:", error);
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

// GET /api/flutter/device-tokens
// يُعيد قائمة الأجهزة المسجّلة (للمشرف)
router.get("/device-tokens", async (req, res) => {
  try {
    const db = getDb();
    const tokens = await db
      .select()
      .from(deviceTokens)
      .where(eq(deviceTokens.isActive, true));

    res.json({ success: true, tokens, count: tokens.length });
  } catch (error) {
    console.error("خطأ في جلب device tokens:", error);
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

export default router;
