import express from "express";
import { storage } from "../storage.js";
import { wasalniRequests, insertWasalniRequestSchema, notifications } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = express.Router();

// Get all wasalni requests (admin)
router.get("/", async (req, res) => {
  try {
    const { phone, customerId, status } = req.query;
    const db = (storage as any).db;
    if (!db) return res.status(500).json({ error: "Database not available" });

    const { desc } = await import("drizzle-orm");
    let results = await db.select().from(wasalniRequests).orderBy(desc(wasalniRequests.createdAt));

    if (status) results = results.filter((r: any) => r.status === status);
    if (phone) {
      const normalize = (s: any) => (s ? String(s).trim().replace(/\s+/g, '') : '');
      const target = normalize(phone);
      results = results.filter((r: any) => normalize(r.customerPhone) === target);
    }
    if (customerId) results = results.filter((r: any) => r.customerId === customerId);

    res.json(results);
  } catch (error) {
    console.error("Error fetching wasalni requests:", error);
    res.status(500).json({ error: "فشل في جلب الطلبات" });
  }
});

// Get wasalni request by ID
router.get("/:id", async (req, res) => {
  try {
    const db = (storage as any).db;
    const { eq } = await import("drizzle-orm");
    const [request] = await db.select().from(wasalniRequests).where(eq(wasalniRequests.id, req.params.id));
    if (!request) return res.status(404).json({ error: "الطلب غير موجود" });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: "فشل في جلب الطلب" });
  }
});

// Create new wasalni request
router.post("/", async (req, res) => {
  try {
    // التحقق من ساعات عمل التطبيق وحالة الإغلاق
    try {
      const allSettings = await storage.getUiSettings();
      const settingsMap = new Map(allSettings.map((s: any) => [s.key, s.value]));
      const storeStatus = settingsMap.get('store_status');
      const openingTime = settingsMap.get('opening_time') || '08:00';
      const closingTime = settingsMap.get('closing_time') || '23:00';

      if (storeStatus === 'closed') {
        return res.status(400).json({ 
          error: "عذراً، التطبيق مغلق حالياً ولا يمكن استقبال طلبات وصل لي",
          code: "APP_CLOSED"
        });
      }

      // التحقق من الوقت التلقائي إذا لم يكن مفتوحاً يدوياً
      if (storeStatus !== 'open') {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const timeToMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const current = timeToMinutes(currentTime);
        const open = timeToMinutes(openingTime);
        const close = timeToMinutes(closingTime);
        let appIsOpen = close > open ? (current >= open && current < close) : (current >= open || current < close);

        if (!appIsOpen) {
          return res.status(400).json({ 
            error: "التطبيق خارج ساعات العمل حالياً، يرجى الطلب لاحقاً",
            code: "APP_CLOSED"
          });
        }
      }
    } catch (err) {
      console.error("خطأ في التحقق من حالة التطبيق:", err);
    }

    const {
      customerName, customerPhone, customerId,
      fromAddress, toAddress, fromLat, fromLng, toLat, toLng,
      orderType, notes, scheduledDate, scheduledTime, estimatedFee
    } = req.body;

    if (!customerName || !customerPhone || !fromAddress || !toAddress) {
      return res.status(400).json({ error: "البيانات الأساسية مطلوبة: الاسم، الهاتف، من عنوان، إلى عنوان" });
    }

    let requestNumber;
    try {
      const allSettings = await storage.getUiSettings();
      const settingsMap = new Map(allSettings.map((s: any) => [s.key, s.value]));
      const prefix = settingsMap.get('wasalni_number_prefix') || 'WSL-';
      const startNum = parseInt(settingsMap.get('wasalni_number_start') || '1001', 10);
      const digits = parseInt(settingsMap.get('wasalni_number_digits') || '4', 10);

      const dbInstance = (storage as any).db;
      const existing = await dbInstance.select().from(wasalniRequests);
      const count = existing ? existing.length : 0;
      const nextSeq = startNum + count;
      requestNumber = `${prefix}${String(nextSeq).padStart(digits, '0')}`;
    } catch (_) {
      requestNumber = `WSL-${Date.now()}`;
    }

    const db = (storage as any).db;
    const [newRequest] = await db.insert(wasalniRequests).values({
      requestNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerId: customerId || null,
      fromAddress: fromAddress.trim(),
      toAddress: toAddress.trim(),
      fromLat: fromLat ? String(fromLat) : null,
      fromLng: fromLng ? String(fromLng) : null,
      toLat: toLat ? String(toLat) : null,
      toLng: toLng ? String(toLng) : null,
      orderType: orderType || "طعام",
      notes: notes?.trim() || null,
      scheduledDate: scheduledDate || null,
      scheduledTime: scheduledTime || null,
      estimatedFee: estimatedFee ? String(estimatedFee) : null,
      status: "pending",
    }).returning();

    // ========================================================================
    // الإشعارات والـ WebSocket لا يجب أن تُفشل إنشاء الطلب
    // كل عملية جانبية يتم لفّها بـ try/catch مستقل لضمان رد 201 الصحيح للعميل
    // ========================================================================
    const cleanPhone = String(customerPhone).trim().replace(/\s+/g, '');
    const customerRecipientId = customerId || cleanPhone;

    // Create notification for admin
    try {
      await storage.createNotification({
        type: "new_wasalni_request",
        title: "طلب وصل لي جديد",
        message: `طلب وصل لي جديد رقم ${requestNumber} من ${customerName} - من: ${fromAddress} إلى: ${toAddress}`,
        recipientType: "admin",
        recipientId: null,
        orderId: null,
        isRead: false,
      });
    } catch (notifyErr) {
      console.error("⚠️ خطأ في إنشاء إشعار المدير لطلب وصل لي (تم تجاهله):", notifyErr);
    }

    // Create notification for customer (مرة بمعرّف الحساب إن وجد، ومرة بالهاتف لضمان الوصول)
    try {
      await storage.createNotification({
        type: "wasalni_received",
        title: "تم استلام طلب وصل لي",
        message: `تم استلام طلبك رقم ${requestNumber} وهو قيد المراجعة`,
        recipientType: "customer",
        recipientId: customerRecipientId,
        orderId: newRequest.id,
        isRead: false,
      });
      // إذا كان المستخدم مسجل دخول وكان لديه customerId مختلف عن رقم الهاتف،
      // أنشئ إشعاراً ثانياً مرتبطاً بالهاتف لضمان وصوله للأجهزة الأخرى
      if (customerId && cleanPhone && customerId !== cleanPhone) {
        await storage.createNotification({
          type: "wasalni_received",
          title: "تم استلام طلب وصل لي",
          message: `تم استلام طلبك رقم ${requestNumber} وهو قيد المراجعة`,
          recipientType: "customer",
          recipientId: cleanPhone,
          orderId: newRequest.id,
          isRead: false,
        });
      }
    } catch (notifyErr) {
      console.error("⚠️ خطأ في إنشاء إشعار العميل لطلب وصل لي (تم تجاهله):", notifyErr);
    }

    // بث التحديث عبر WebSocket للإدارة وللعميل لتحديث صفحة الطلبات فوراً
    try {
      const ws = (req.app.get('ws') as any);
      if (ws) {
        // إشعار الإدارة فقط بطلب جديد (وليس كل العملاء)
        if (typeof ws.sendToAdmin === 'function') {
          ws.sendToAdmin('new_wasalni_request', { requestId: newRequest.id, requestNumber });
        }
        // إعلام شاشة طلباتي للعميل بأن هناك طلب جديد - مستهدف فقط
        if (typeof ws.notifyOrder === 'function') {
          ws.notifyOrder('order_update', { orderId: newRequest.id, status: 'pending', type: 'wasalni' }, {
            customerId: newRequest.customerId,
            customerPhone: newRequest.customerPhone,
            orderId: newRequest.id,
          });
        }
      }
    } catch (wsErr) {
      console.error("⚠️ خطأ في بث WebSocket لطلب وصل لي (تم تجاهله):", wsErr);
    }

    res.status(201).json({ success: true, request: newRequest });
  } catch (error) {
    console.error("Error creating wasalni request:", error);
    res.status(500).json({ error: "فشل في إنشاء الطلب" });
  }
});

// Get wasalni request by request number
router.get("/number/:requestNumber", async (req, res) => {
  try {
    const { requestNumber } = req.params;
    const db = (storage as any).db;
    const { eq } = await import("drizzle-orm");
    const [request] = await db.select().from(wasalniRequests).where(eq(wasalniRequests.requestNumber, requestNumber));
    if (!request) return res.status(404).json({ error: "الطلب غير موجود" });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: "فشل في جلب الطلب" });
  }
});

// Update wasalni request status (admin)
router.put("/:id", async (req, res) => {
  try {
    const db = (storage as any).db;
    const { eq } = await import("drizzle-orm");
    const { status, driverId, adminNotes, cancelReason, estimatedFee } = req.body;

    const updateData: any = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (driverId !== undefined) updateData.driverId = driverId;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (cancelReason !== undefined) updateData.cancelReason = cancelReason;
    if (estimatedFee !== undefined) updateData.estimatedFee = String(estimatedFee);

    const [updated] = await db.update(wasalniRequests).set(updateData).where(eq(wasalniRequests.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "الطلب غير موجود" });

    // Notify customer on status change
    if (status) {
      // بث التحديث عبر WebSocket
      try {
        const ws = (req.app.get('ws') as any);
        if (ws && typeof ws.notifyOrder === 'function') {
          ws.notifyOrder('order_update', { orderId: updated.id, status, type: 'wasalni' }, {
            customerId: updated.customerId,
            customerPhone: updated.customerPhone,
            driverId: updated.driverId,
            orderId: updated.id,
          });
        }
      } catch (wsErr) {
        console.error("⚠️ فشل بث WebSocket لتحديث وصل لي (تم تجاهله):", wsErr);
      }

      const statusMessages: Record<string, string> = {
        confirmed: "تم قبول طلب وصل لي الخاص بك",
        on_way: "السائق في طريقه لاستلام طلبك",
        delivered: "تم تنفيذ طلب وصل لي بنجاح",
        cancelled: `تم إلغاء طلب وصل لي. ${cancelReason ? `السبب: ${cancelReason}` : ''}`,
      };
      if (statusMessages[status]) {
        const cleanPhone = updated.customerPhone ? String(updated.customerPhone).trim().replace(/\s+/g, '') : null;
        const recipients = Array.from(new Set([updated.customerId, cleanPhone].filter(Boolean))) as string[];
        for (const rid of recipients) {
          try {
            await storage.createNotification({
              type: "wasalni_status_update",
              title: "تحديث طلب وصل لي",
              message: `${statusMessages[status]} - رقم الطلب: ${updated.requestNumber}`,
              recipientType: "customer",
              recipientId: rid,
              orderId: updated.id,
              isRead: false,
            });
          } catch (notifyErr) {
            console.error("⚠️ فشل إنشاء إشعار العميل لتحديث وصل لي (تم تجاهله):", notifyErr);
          }
        }
      }

      // حذف فوري لطلبات وصل لي للزوار (customerId IS NULL) فور التسليم
      if (status === 'delivered' && !updated.customerId) {
        try {
          const dbInstance = (storage as any).db;
          setTimeout(async () => {
            try {
              await dbInstance.delete(notifications).where(eq(notifications.orderId, updated.id));
            } catch (_) {}
            try {
              await dbInstance.delete(wasalniRequests).where(eq(wasalniRequests.id, updated.id));
            } catch (e) {
              console.error('فشل حذف طلب وصل لي للزائر:', e);
            }
          }, 15 * 1000);
        } catch (e) {
          console.error('خطأ في جدولة حذف طلب وصل لي للزائر:', e);
        }
      }
    }

    res.json({ success: true, request: updated });
  } catch (error) {
    console.error("Error updating wasalni request:", error);
    res.status(500).json({ error: "فشل في تحديث الطلب" });
  }
});

// Delete wasalni request
router.delete("/:id", async (req, res) => {
  try {
    const db = (storage as any).db;
    const { eq } = await import("drizzle-orm");
    await db.delete(wasalniRequests).where(eq(wasalniRequests.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "فشل في حذف الطلب" });
  }
});

// Assign driver to wasalni request
router.post("/:id/assign-driver", async (req, res) => {
  try {
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ error: "معرف السائق مطلوب" });

    const db = (storage as any).db;
    const { eq } = await import("drizzle-orm");
    
    // Check if request exists
    const [request] = await db.select().from(wasalniRequests).where(eq(wasalniRequests.id, req.params.id));
    if (!request) return res.status(404).json({ error: "الطلب غير موجود" });

    // Update request with driver and status
    const [updated] = await db.update(wasalniRequests)
      .set({ 
        driverId, 
        status: "confirmed",
        updatedAt: new Date() 
      })
      .where(eq(wasalniRequests.id, req.params.id))
      .returning();

    // تحديث حالة السائق ليكون مشغولاً
    try {
      await storage.updateDriver(driverId, { isAvailable: false });
    } catch (driverErr) {
      console.error("خطأ في تحديث حالة السائق:", driverErr);
    }

    // Broadcast via WebSocket - لفّ كل بث في try/catch لتفادي إفشال التعيين
    try {
      const ws = (req.app.get('ws') as any);
      if (ws) {
        if (typeof ws.notifyOrder === 'function') {
          ws.notifyOrder('order_update', {
            orderId: updated.id,
            status: 'confirmed',
            type: 'wasalni',
            requestNumber: request.requestNumber
          }, {
            customerId: updated.customerId,
            customerPhone: updated.customerPhone,
            driverId,
            orderId: updated.id,
          });
        }
        if (typeof ws.sendToDriver === 'function') {
          ws.sendToDriver(driverId, 'new_order_assigned', {
            orderId: updated.id,
            status: 'confirmed',
            message: `تم تعيين طلب وصل لي جديد لك رقم ${request.requestNumber}`,
            type: 'wasalni',
            orderData: updated
          });
        }
      }
    } catch (wsErr) {
      console.error("⚠️ فشل بث WebSocket لتعيين السائق (تم تجاهله):", wsErr);
    }

    // Create notification for customer (لكلا المعرّف والهاتف لضمان الوصول)
    try {
      const cleanPhone = request.customerPhone ? String(request.customerPhone).trim().replace(/\s+/g, '') : null;
      const recipients = Array.from(new Set([request.customerId, cleanPhone].filter(Boolean))) as string[];
      for (const rid of recipients) {
        try {
          await storage.createNotification({
            type: "wasalni_driver_assigned",
            title: "تم تعيين سائق لطلبك",
            message: `تم تعيين سائق لطلب وصل لي رقم ${request.requestNumber}. سيتواصل معك السائق قريباً.`,
            recipientType: "customer",
            recipientId: rid,
            orderId: updated.id,
            isRead: false,
          });
        } catch (err) {
          console.error("⚠️ فشل إنشاء إشعار العميل لتعيين السائق:", err);
        }
      }
    } catch (notifyErr) {
      console.error("⚠️ خطأ في إشعار العميل بتعيين السائق (تم تجاهله):", notifyErr);
    }

    // Create notification for driver
    try {
      await storage.createNotification({
        type: "new_wasalni_assignment",
        title: "طلب وصل لي جديد مُعين لك",
        message: `تم تعيين طلب وصل لي جديد لك رقم ${request.requestNumber}. من: ${request.fromAddress} إلى: ${request.toAddress}`,
        recipientType: "driver",
        recipientId: driverId,
        orderId: updated.id,
        isRead: false,
      });
    } catch (notifyErr) {
      console.error("⚠️ خطأ في إشعار السائق بالتعيين (تم تجاهله):", notifyErr);
    }

    res.json({ success: true, request: updated });
  } catch (error) {
    console.error("Error assigning driver to wasalni request:", error);
    res.status(500).json({ error: "فشل في تعيين السائق" });
  }
});

export default router;
