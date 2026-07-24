import express from "express";
import { storage } from "../storage.js";
import { calculateDeliveryFee } from "../services/deliveryFeeService";
import { formatCurrency } from "../../shared/utils";
import { canOrderFromRestaurant } from "../../utils/restaurantHours";
import { randomUUID } from "crypto";

const router = express.Router();

// إنشاء طلب جديد
router.post("/", async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      customerLocationLat,
      customerLocationLng,
      notes,
      paymentMethod,
      items,
      subtotal,
      deliveryFee: clientDeliveryFee,
      totalAmount,
      restaurantId,
      customerId,
      deliveryPreference,
      scheduledDate,
      scheduledTimeSlot
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!customerName || !customerPhone || !deliveryAddress || !items) {
      return res.status(400).json({ 
        error: "بيانات ناقصة: الاسم، الهاتف، العنوان، والعناصر مطلوبة"
      });
    }

    // منع تكرار الطلب (خلال آخر 60 ثانية)
    try {
      const recentOrders = await storage.getOrdersByCustomer(customerPhone);
      const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
      const incomingTotal = parseFloat(String(totalAmount));
      
      const isDuplicate = recentOrders.some(order => {
        const orderTime = new Date(order.createdAt);
        const orderTotal = parseFloat(order.totalAmount);
        return orderTime > sixtySecondsAgo && 
               Math.abs(orderTotal - incomingTotal) < 0.01 &&
               order.status !== 'cancelled';
      });

      if (isDuplicate) {
        return res.status(400).json({ 
          error: "لقد قمت بإرسال طلب مماثل مؤخراً، يرجى الانتظار دقيقة واحدة أو التحقق من قائمة طلباتك للتأكد من وصول الطلب"
        });
      }
    } catch (err) {
      console.error("خطأ في التحقق من الطلبات المتكررة:", err);
    }

    // التحقق من ساعات عمل التطبيق العالمية
    // الطلبات المؤجلة (scheduled) تتجاوز فحص ساعات الموصلين لكن لا تتجاوز إغلاق المتجر الإداري
    const isScheduledOrder = deliveryPreference === 'scheduled';

    try {
      const allSettings = await storage.getUiSettings();
      const settingsMap = new Map(allSettings.map((s: any) => [s.key, s.value]));
      
      // 1. فحص الإغلاق الطارئ
      const emergencyClosed = settingsMap.get('store_emergency_closed') === 'true';
      const emergencyMsg = settingsMap.get('store_emergency_message') || 'عذراً، المتجر مغلق حالياً بصفة طارئة لأعمال الصيانة والتحديث. سنعود للعمل قريباً!';
      const storeStatus = settingsMap.get('store_status');

      if (emergencyClosed || storeStatus === 'emergency') {
        return res.status(400).json({ 
          error: emergencyMsg,
          code: "APP_EMERGENCY_CLOSED",
          message: emergencyMsg
        });
      }

      // 2. فحص الحد الأدنى للطلب
      const minOrderEnabled = settingsMap.get('minimum_order_enabled') === 'true';
      const minOrderDefault = parseFloat(settingsMap.get('minimum_order_default') || '0');
      const subtotalVal = parseFloat(subtotal || '0');

      if (minOrderEnabled && minOrderDefault > 0 && subtotalVal < minOrderDefault) {
        return res.status(400).json({ 
          error: `الحد الأدنى للطلب هو ${minOrderDefault} ريال. مجموع سلتك الحالي (${subtotalVal} ريال) أقل من الحد الأدنى.`
        });
      }

      // 3. فحص أوقات عمل المتجر الأساسية
      const openingTime = settingsMap.get('opening_time') || '08:00';
      const closingTime = settingsMap.get('closing_time') || '23:00';
      const allowScheduledWhenClosed = settingsMap.get('allow_scheduled_orders_when_closed') !== 'false';

      if (storeStatus === 'closed') {
        if (!isScheduledOrder || !allowScheduledWhenClosed) {
          return res.status(400).json({ 
            error: "التطبيق مغلق حالياً من قِبل الإدارة",
            code: "APP_CLOSED",
            message: "التطبيق مغلق حالياً من قِبل الإدارة"
          });
        }
      } else if (storeStatus !== 'open' && !isScheduledOrder) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const timeToMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const current = timeToMinutes(currentTime);
        const open = timeToMinutes(openingTime);
        const close = timeToMinutes(closingTime);
        let appIsOpen = close > open ? (current >= open && current < close) : (current >= open || current < close);

        if (!appIsOpen) {
          const isBeforeOpen = current < open;
          const whenOpen = isBeforeOpen ? `يفتح اليوم الساعة ${openingTime}` : `يفتح غداً الساعة ${openingTime}`;
          return res.status(400).json({ 
            error: `التطبيق مغلق حالياً. ${whenOpen}`
          });
        }
      }

      // 4. فحص ساعات دوام الموصلين
      const enableDriverHours = settingsMap.get('enable_driver_hours') === 'true';
      if (enableDriverHours && !isScheduledOrder) {
        const driverStart = settingsMap.get('driver_start_time') || '09:00';
        const driverEnd = settingsMap.get('driver_end_time') || '21:00';
        const nowTime = new Date().toTimeString().slice(0, 5);
        const t2m = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const nowM = t2m(nowTime);
        const startM = t2m(driverStart);
        const endM = t2m(driverEnd);
        let inDriverHours = endM > startM ? (nowM >= startM && nowM < endM) : (nowM >= startM || nowM < endM);

        if (!inDriverHours) {
          const enableScheduled = settingsMap.get('enable_scheduled_orders') === 'true';
          if (enableScheduled) {
            return res.status(400).json({ 
              error: `خدمة التوصيل الفورية مغلقة حالياً (ساعات العمل من ${driverStart} إلى ${driverEnd}). يمكنك اختيار الطلب المجدول لوقت متاح.`,
              code: "DRIVER_HOURS_CLOSED_CAN_SCHEDULE"
            });
          } else {
            return res.status(400).json({ 
              error: `خدمة التوصيل مغلقة حالياً (ساعات عمل الموصلين من ${driverStart} إلى ${driverEnd}).`
            });
          }
        }
      }
    } catch (_) {
      // إذا فشل التحقق من الإعدادات، نسمح بالطلب
    }

    // التحقق من وجود المطعم (اختياري الآن)
    let restaurant = null;
    if (restaurantId) {
      restaurant = await storage.getRestaurant(restaurantId);
    }
    
    // التحقق من ساعات العمل إذا كان المطعم موجوداً
    if (restaurant) {
      const orderStatus = canOrderFromRestaurant(restaurant);
      if (!orderStatus.canOrder) {
        return res.status(400).json({ 
          error: orderStatus.message || "المطعم مغلق حالياً"
        });
      }
    }

    // حساب رسوم التوصيل والمسافة
    let finalDeliveryFee = parseFloat(clientDeliveryFee || '0');
    let distance = 0;
    
    if (customerLocationLat && customerLocationLng) {
      try {
        const feeResult = await calculateDeliveryFee(
          { lat: parseFloat(customerLocationLat), lng: parseFloat(customerLocationLng) },
          restaurantId,
          parseFloat(subtotal || '0')
        );
        finalDeliveryFee = feeResult.fee;
        distance = feeResult.distance;
      } catch (feeError) {
        console.error("Error calculating delivery fee during order creation:", feeError);
      }
    }

    // إنشاء رقم طلب فريد تسلسلي
    let orderNumber;
    try {
      const allSettings = await storage.getUiSettings();
      const settingsMap = new Map(allSettings.map((s: any) => [s.key, s.value]));
      const prefix = settingsMap.get('order_number_prefix') || 'ORD-';
      const startNum = parseInt(settingsMap.get('order_number_start') || '1001', 10);
      const digits = parseInt(settingsMap.get('order_number_digits') || '4', 10);

      const existingOrders = await storage.getOrders();
      const count = existingOrders ? existingOrders.length : 0;
      const nextSeq = startNum + count;
      orderNumber = `${prefix}${String(nextSeq).padStart(digits, '0')}`;
    } catch (_) {
      orderNumber = `ORD-${Date.now()}`;
    }

    // التأكد من أن العناصر هي JSON string
    let itemsString;
    try {
      itemsString = typeof items === 'string' ? items : JSON.stringify(items);
    } catch (error) {
      return res.status(400).json({ 
        error: "تنسيق العناصر غير صحيح"
      });
    }

    // حساب العمولات
    const subtotalNum = parseFloat(subtotal || '0');
    const deliveryFeeNum = finalDeliveryFee;
    
    let restaurantCommissionAmount = 0;
    let restaurantEarnings = 0;
    
    if (restaurant) {
      const restaurantCommissionRate = parseFloat(restaurant.commissionRate?.toString() || '15'); // افتراضي 15%
      restaurantCommissionAmount = (subtotalNum * restaurantCommissionRate) / 100;
      restaurantEarnings = subtotalNum - restaurantCommissionAmount;
    } else {
      // إذا لم يكن هناك مطعم (متجر رئيسي)، فكل الدخل للمؤسسة
      restaurantEarnings = 0;
      restaurantCommissionAmount = subtotalNum;
    }
    
    // حساب عمولة السائق الأولية (سيتم تحديثها عند التعيين)
    const defaultDriverCommissionRate = 70; // 70% من رسوم التوصيل
    const driverEarnings = (deliveryFeeNum * defaultDriverCommissionRate) / 100;
    const companyEarnings = restaurantCommissionAmount + (deliveryFeeNum - driverEarnings);

    // إنشاء الطلب
    const orderStatus = isScheduledOrder ? 'scheduled' : 'pending';
    const orderData = {
      orderNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim().replace(/\s+/g, ''),
      customerEmail: customerEmail ? customerEmail.trim() : null,
      customerId: customerId || null,
      deliveryAddress: deliveryAddress.trim(),
      customerLocationLat: customerLocationLat ? String(customerLocationLat) : null,
      customerLocationLng: customerLocationLng ? String(customerLocationLng) : null,
      notes: notes ? notes.trim() : null,
      paymentMethod: paymentMethod || 'cash',
      status: orderStatus,
      items: itemsString,
      subtotal: String(subtotalNum),
      deliveryFee: String(deliveryFeeNum),
      distance: String(distance),
      total: String(subtotalNum + deliveryFeeNum),
      totalAmount: String(subtotalNum + deliveryFeeNum),
      driverEarnings: String(driverEarnings),
      restaurantEarnings: String(restaurantEarnings),
      companyEarnings: String(companyEarnings),
      restaurantId: restaurantId || null,
      estimatedTime: restaurant?.deliveryTime || '30-45 دقيقة',
      deliveryPreference: deliveryPreference || 'now',
      scheduledDate: scheduledDate || null,
      scheduledTimeSlot: scheduledTimeSlot || null
    };

    const order = await storage.createOrder(orderData);

    // إنشاء إشعارات للإدارة والمطعم فقط
    // الطلب لا يصل للسائقين إلا بعد تعيينه من الإدارة
    try {
      // إشعار للمطعم (إذا وجد)
      if (restaurantId) {
        await storage.createNotification({
          type: 'new_order',
          title: 'طلب جديد',
          message: `طلب جديد رقم ${orderNumber} من ${customerName}. صافي الربح: ${formatCurrency(restaurantEarnings)}`,
          recipientType: 'restaurant',
          recipientId: restaurantId,
          orderId: order.id,
          isRead: false
        });
      }
      
      // إشعار للإدارة فقط - السائقون سيتلقون إشعار عند تعيينهم للطلب
      const adminNotifTitle = isScheduledOrder ? 'طلب مجدول جديد' : 'طلب جديد في انتظار التعيين';
      const adminNotifMsg = isScheduledOrder
        ? `طلب مجدول رقم ${orderNumber} من ${customerName}. موعد التوصيل: ${req.body.scheduledDate} ${req.body.scheduledTimeSlot}`
        : `طلب جديد رقم ${orderNumber} من ${customerName} في انتظار تعيين سائق. الموقع: ${deliveryAddress}`;
      await storage.createNotification({
        type: isScheduledOrder ? 'new_scheduled_order' : 'new_order_pending_assignment',
        title: adminNotifTitle,
        message: adminNotifMsg,
        recipientType: 'admin',
        recipientId: null,
        orderId: order.id,
        isRead: false
      });

      // إشعار للعميل بتأكيد استلام الطلب
      if (customerId || customerPhone) {
        await storage.createNotification({
          type: 'order_status_update',
          title: isScheduledOrder ? 'تم جدولة طلبك' : 'تم استلام طلبك',
          message: isScheduledOrder 
            ? `تم جدولة طلبك رقم ${orderNumber} للتوصيل في ${req.body.scheduledDate} ${req.body.scheduledTimeSlot}`
            : `تم استلام طلبك رقم ${orderNumber} وهو قيد المراجعة حالياً`,
          recipientType: 'customer',
          recipientId: customerId || customerPhone,
          orderId: order.id,
          isRead: false
        });
      }

      // تتبع الطلب
      await storage.createOrderTracking({
        orderId: order.id,
        status: orderStatus,
        message: isScheduledOrder
          ? `تم جدولة الطلب للتوصيل في ${req.body.scheduledDate} ${req.body.scheduledTimeSlot}`
          : 'تم استلام الطلب وجاري المراجعة',
        createdBy: 'system',
        createdByType: 'system'
      });
    } catch (notificationError) {
      console.error('خطأ في إنشاء الإشعارات:', notificationError);
    }

    res.status(201).json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        estimatedTime: order.estimatedTime,
        total: order.totalAmount
      }
    });

  } catch (error: any) {
    console.error("خطأ في إنشاء الطلب:", error);
    res.status(500).json({ 
      error: "حدث خطأ في الخادم",
      message: error.message 
    });
  }
});

// جلب الطلبات مع فلترة محسنة
router.get("/", async (req, res) => {
  try {
    const { status, driverId, available, restaurantId } = req.query;
    
    let orders = await storage.getOrders();
    
    // فلترة حسب السائق (طلباتي)
    if (driverId && available !== 'true') {
      orders = orders.filter(order => order.driverId === driverId && 
        ['confirmed', 'preparing', 'ready', 'picked_up', 'on_way'].includes(order.status));
    }
    // فلترة الطلبات المتاحة (المعينة لهذا السائق حصراً ولم يقبلها بعد)
    else if (available === 'true') {
      if (!driverId) {
        // إذا لم يتم توفير معرف السائق، لا نعيد أي طلبات متاحة
        // لأن الطلبات المتاحة يجب أن تكون معينة لسائق محدد
        orders = [];
      } else {
        orders = orders.filter(order => 
          order.status === 'assigned' && order.driverId === driverId
        );
      }
    }
    // فلترة للوحة التحكم (بدون driverId)
    else {
      if (status && status !== 'all') {
        orders = orders.filter(order => order.status === status);
      }
      
      if (restaurantId) {
        orders = orders.filter(order => order.restaurantId === restaurantId);
      }
    }
    
    // ترتيب حسب تاريخ الإنشاء (الأحدث أولاً)
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json(orders);
  } catch (error) {
    console.error('خطأ في جلب الطلبات:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تعيين طلب لسائق
router.put("/:id/assign-driver", async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId } = req.body;
    
    if (!driverId) {
      return res.status(400).json({ error: "معرف السائق مطلوب" });
    }

    // التحقق من وجود الطلب
    const order = await storage.getOrder(id);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    // تحرير السائق السابق إذا كان موجوداً
    if (order.driverId && order.driverId !== driverId) {
      try {
        await storage.updateDriver(order.driverId, { isAvailable: true });
        
        // إشعار للسائق السابق بإلغاء التعيين
        await storage.createNotification({
          type: 'order_unassigned',
          title: 'إلغاء تعيين الطلب',
          message: `تم إلغاء تعيينك للطلب رقم ${order.orderNumber} وتحويله لسائق آخر`,
          recipientType: 'driver',
          recipientId: order.driverId,
          orderId: id,
          isRead: false
        });
      } catch (err) {
        console.error('Error freeing up previous driver:', err);
      }
    }

    // التحقق من وجود السائق
    const driver = await storage.getDriver(driverId);
    if (!driver) {
      return res.status(404).json({ error: "السائق غير موجود" });
    }

    if (!driver.isAvailable || !driver.isActive) {
      return res.status(400).json({ error: "السائق غير متاح حالياً" });
    }

    // حساب أرباح السائق بناءً على نسبته الخاصة
    const deliveryFeeNum = parseFloat(order.deliveryFee?.toString() || '0');
    const driverCommissionRate = parseFloat(driver.commissionRate?.toString() || '70');
    const driverEarnings = (deliveryFeeNum * driverCommissionRate) / 100;
    
    // تحديث أرباح الشركة بناءً على عمولة السائق الفعلية
    const restaurantId = order.restaurantId;
    let restaurant = null;
    let restaurantCommissionAmount = 0;
    
    const subtotalNum = parseFloat(order.subtotal?.toString() || '0');
    
    if (restaurantId) {
      restaurant = await storage.getRestaurant(restaurantId);
      const restaurantCommissionRate = parseFloat(restaurant?.commissionRate?.toString() || '15');
      restaurantCommissionAmount = (subtotalNum * restaurantCommissionRate) / 100;
    } else {
      restaurantCommissionAmount = subtotalNum;
    }
    
    const companyEarnings = restaurantCommissionAmount + (deliveryFeeNum - driverEarnings);

    // تحديث الطلب
    const updatedOrder = await storage.updateOrder(id, {
      driverId,
      driverEarnings: String(driverEarnings),
      companyEarnings: String(companyEarnings),
      status: 'assigned', // تعيين الطلب للسائق أولاً
      updatedAt: new Date()
    });

    // Broadcast update via WebSocket
    const ws = req.app.get('ws');
    if (ws) {
      // إشعار للعميل بتحديث الحالة وتعيين السائق - مستهدف فقط للأطراف ذات الصلة
      ws.notifyOrder('order_update', { 
        orderId: id, 
        status: 'assigned',
        driverId,
        driverName: driver?.name,
        type: 'regular',
        orderNumber: order.orderNumber
      }, {
        customerId: order.customerId,
        customerPhone: order.customerPhone,
        driverId,
        orderId: id,
      });

      // إشعار مباشر للسائق مع بيانات الطلب
      if (ws.sendToDriver) {
        ws.sendToDriver(driverId, 'new_order_assigned', { 
          orderId: id, 
          status: 'assigned',
          message: `تم تعيين طلب جديد رقم ${order.orderNumber} لك`,
          type: 'regular',
          orderData: updatedOrder
        });
      }
    }

    // لا نقوم بتحديث حالة السائق إلى مشغول إلا بعد استلامه للطلب فعلياً

    // إنشاء إشعارات
    try {
      // إشعار للعميل
      await storage.createNotification({
        type: 'driver_assigned',
        title: 'تم تحديد سائق لطلبك',
        message: `تم تحديد السائق ${driver?.name || 'مندوبنا'} لتوصيل طلبك رقم ${order.orderNumber}`,
        recipientType: 'customer',
        recipientId: order.customerId || order.customerPhone,
        orderId: id,
        isRead: false
      });

      // إشعار مباشر للسائق المعين
      await storage.createNotification({
        type: 'new_order_assigned',
        title: 'طلب جديد مُعين لك',
        message: `تم تعيينك لتوصيل الطلب رقم ${order.orderNumber} من ${restaurant?.name || 'المتجر الرئيسي'}. يرجى تأكيد الاستلام.`,
        recipientType: 'driver',
        recipientId: driverId,
        orderId: id,
        isRead: false
      });

      // إشعار للإدارة
      await storage.createNotification({
        type: 'order_assigned',
        title: 'تم تعيين سائق',
        message: `تم تعيين السائق ${driver.name} للطلب ${order.orderNumber}`,
        recipientType: 'admin',
        recipientId: null,
        orderId: id,
        isRead: false
      });

      // إشعار للعميل عند تعيين السائق
      await storage.createNotification({
        type: 'order_status_update',
        title: 'تم تعيين سائق لطلبك',
        message: `تم تعيين السائق ${driver.name} لتوصيل طلبك رقم ${order.orderNumber}. السائق في الطريق الآن.`,
        recipientType: 'customer',
        recipientId: order.customerId || order.customerPhone,
        orderId: id,
        isRead: false
      });

      // تتبع الطلب
      await storage.createOrderTracking({
        orderId: id,
        status: 'assigned',
        message: `تم تعيين السائق ${driver.name} وفي انتظار قبول الطلب`,
        createdBy: 'admin',
        createdByType: 'admin'
      });
    } catch (notificationError) {
      console.error('خطأ في إنشاء الإشعارات:', notificationError);
    }

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('خطأ في تعيين السائق:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تعديل أسعار الطلب (من قبل المدير)
router.put("/:id/prices", async (req, res) => {
  try {
    const { id } = req.params;
    const { items, deliveryFee, subtotal, totalAmount, priceAdjustmentNote } = req.body;

    const order = await storage.getOrder(id);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    const updatedOrder = await storage.updateOrder(id, {
      items: typeof items === 'string' ? items : JSON.stringify(items),
      deliveryFee: deliveryFee?.toString(),
      subtotal: subtotal?.toString(),
      totalAmount: totalAmount?.toString(),
      notes: priceAdjustmentNote
        ? `${order.notes ? order.notes + '\n' : ''}[تعديل مدير: ${priceAdjustmentNote}]`
        : order.notes,
      updatedAt: new Date()
    });

    const ws = req.app.get('ws');
    if (ws) {
      ws.notifyOrder('order_update', { orderId: id, priceUpdated: true }, {
        customerId: order.customerId,
        customerPhone: order.customerPhone,
        driverId: order.driverId,
        orderId: id,
      });
    }

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('خطأ في تعديل أسعار الطلب:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث حالة الطلب
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, updatedBy, updatedByType, cancelReason } = req.body;

    if (!status) {
      return res.status(400).json({ error: "الحالة مطلوبة" });
    }

    // التحقق من وجود الطلب
    const order = await storage.getOrder(id);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    // تحديث الطلب
    let updatedOrder;
    if (status === 'delivered') {
      updatedOrder = await storage.completeOrder(id);
    } else {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };
      // حفظ سبب الإلغاء عند إلغاء الطلب
      if (status === 'cancelled' && cancelReason) {
        updateData.cancelReason = cancelReason;
      }
      updatedOrder = await storage.updateOrder(id, updateData);
    }

    // Broadcast update via WebSocket - مستهدف فقط لأطراف الطلب
    const ws = req.app.get('ws');
    if (ws) {
      ws.notifyOrder('order_update', { 
        orderId: id, 
        status,
        orderNumber: order.orderNumber,
        type: 'regular'
      }, {
        customerId: order.customerId,
        customerPhone: order.customerPhone,
        driverId: order.driverId,
        orderId: id,
      });
    }

    // إنشاء رسالة الحالة
    let statusMessage = '';
    switch (status) {
      case 'confirmed':
        statusMessage = 'تم تأكيد الطلب من المطعم';
        break;
      case 'preparing':
        statusMessage = 'جاري تحضير الطلب';
        break;
      case 'ready':
        statusMessage = 'الطلب جاهز للاستلام';
        break;
      case 'picked_up':
        statusMessage = 'تم استلام الطلب من المطعم';
        break;
      case 'on_way':
        statusMessage = 'السائق في الطريق إليك';
        break;
      case 'delivered':
        statusMessage = 'تم تسليم الطلب بنجاح';
        break;
      case 'cancelled':
        statusMessage = cancelReason 
          ? `تم إلغاء الطلب - السبب: ${cancelReason}` 
          : 'تم إلغاء الطلب';
        // تحرير السائق إذا كان مُعيَّناً
        if (order.driverId) {
          await storage.updateDriver(order.driverId, { isAvailable: true });
        }
        break;
      default:
        statusMessage = `تم تحديث حالة الطلب إلى ${status}`;
    }

    // إنشاء إشعارات وتتبع
    try {
      // إشعار للعميل
      await storage.createNotification({
        type: 'order_status_update',
        title: 'تحديث حالة الطلب',
        message: `طلبك رقم ${order.orderNumber}: ${statusMessage}`,
        recipientType: 'customer',
        recipientId: order.customerId || order.customerPhone,
        orderId: id,
        isRead: false
      });

      // إشعار للإدارة
      await storage.createNotification({
        type: 'order_status_update',
        title: 'تحديث حالة الطلب',
        message: `الطلب ${order.orderNumber}: ${statusMessage}`,
        recipientType: 'admin',
        recipientId: null,
        orderId: id,
        isRead: false
      });

      // تتبع الطلب
      await storage.createOrderTracking({
        orderId: id,
        status,
        message: statusMessage,
        createdBy: updatedBy || 'system',
        createdByType: updatedByType || 'system'
      });
    } catch (notificationError) {
      console.error('خطأ في إنشاء الإشعارات:', notificationError);
    }

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("خطأ في تحديث حالة الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب الطلبات حسب العميل
router.get("/customer/:phone", async (req, res) => {
  try {
    let phone = (req.params.phone || '').trim().replace(/\s+/g, '');
    let customerId = (req.query.customerId as string) || undefined;

    // دعم الحالة التي يُرسَل فيها معرّف الحساب فقط كمسار بديل (id:uuid)
    if (phone.startsWith('id:')) {
      const embeddedId = phone.slice(3);
      if (!customerId && embeddedId) customerId = embeddedId;
      phone = '';
    }

    if (!phone && !customerId) {
      return res.status(400).json({
        error: "رقم الهاتف أو معرّف الحساب مطلوب"
      });
    }

    const customerOrders = await storage.getOrdersByCustomer(phone, customerId);

    res.json(customerOrders);
  } catch (error) {
    console.error("خطأ في جلب طلبات العميل:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب السائقين الأقرب للطلب
router.get("/:orderId/closest-drivers", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await storage.getOrder(orderId);
    
    let lat: number | null = null;
    let lng: number | null = null;

    if (order) {
      if (order.restaurantId) {
        const restaurant = await storage.getRestaurant(order.restaurantId);
        if (restaurant && restaurant.latitude && restaurant.longitude) {
          lat = parseFloat(restaurant.latitude);
          lng = parseFloat(restaurant.longitude);
        }
      }
      
      if (lat === null && order.customerLocationLat && order.customerLocationLng) {
        lat = parseFloat(order.customerLocationLat);
        lng = parseFloat(order.customerLocationLng);
      }
    } else {
      const db = (storage as any).db;
      if (db) {
        const { wasalniRequests } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        const [found] = await db.select().from(wasalniRequests).where(eq(wasalniRequests.id, orderId));
        if (found && found.fromLat && found.fromLng) {
          lat = parseFloat(found.fromLat);
          lng = parseFloat(found.fromLng);
        }
      }
    }

    if (lat === null || lng === null) {
      return res.status(400).json({ error: "لا يمكن تحديد موقع الانطلاق للطلب" });
    }

    const closestDrivers = await storage.getClosestDrivers(lat, lng, 10);
    res.json(closestDrivers);
  } catch (error) {
    console.error("خطأ في جلب السائقين الأقرب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب طلب برقم الطلب
router.get("/number/:orderNumber", async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const db = (storage as any).db;
    if (!db) return res.status(500).json({ error: "Database not available" });
    
    const { orders } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
    
    if (!order) return res.status(404).json({ error: "الطلب غير موجود" });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "خطأ في البحث" });
  }
});

// جلب تفاصيل تتبع الطلب
router.get("/:orderId/track", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    let order = await storage.getOrder(orderId);
    let isWaselLi = false;
    let wasalniRequest = null;

    if (!order) {
      // البحث في طلبات "وصلي" إذا لم يتم العثور عليه في الطلبات العادية
      const db = (storage as any).db;
      if (db) {
        const { wasalniRequests } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        const [found] = await db.select().from(wasalniRequests).where(eq(wasalniRequests.id, orderId));
        wasalniRequest = found;
      }
      
      if (!wasalniRequest) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      isWaselLi = true;
      // تحويل بيانات "وصلي" إلى تنسيق متوافق مع صفحة التتبع
      order = {
        id: wasalniRequest.id,
        orderNumber: wasalniRequest.requestNumber,
        customerName: wasalniRequest.customerName,
        customerPhone: wasalniRequest.customerPhone,
        deliveryAddress: wasalniRequest.toAddress,
        status: wasalniRequest.status,
        estimatedTime: "جاري التحديد",
        driverId: wasalniRequest.driverId,
        isWaselLi: true,
        pickupAddress: wasalniRequest.fromAddress,
        pickupPhone: wasalniRequest.customerPhone,
        pickupName: wasalniRequest.customerName,
        waselLiItemType: wasalniRequest.orderType,
        totalAmount: String(wasalniRequest.estimatedFee || "0"),
        createdAt: wasalniRequest.createdAt,
        items: JSON.stringify([])
      } as any;
    }

    // جلب بيانات السائق إذا كانت موجودة
    let driverInfo = null;
    if (order.driverId) {
      const driver = await storage.getDriver(order.driverId);
      if (driver) {
        driverInfo = {
          name: driver.name,
          phone: driver.phone
        };
      }
    }

    // جلب سجل تتبع الطلب
    let trackingHistory = [];
    try {
      trackingHistory = await storage.getOrderTracking(orderId);
    } catch (err) {
      console.error("Error fetching tracking history:", err);
    }
    
    // تنسيق البيانات لتتوافق مع واجهة التتبع
    const formattedOrder = {
      ...order,
      driverName: driverInfo?.name,
      driverPhone: driverInfo?.phone,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
    };

    let formattedTracking = trackingHistory.map((t: any) => ({
      id: t.id,
      status: t.status,
      timestamp: t.createdAt,
      description: t.message
    }));

    if (formattedTracking.length === 0) {
      formattedTracking = [
        {
          id: "initial",
          status: order.status || 'pending',
          timestamp: order.createdAt,
          description: isWaselLi ? "تم استلام طلب وصل لي" : "تم استلام الطلب وجاري المراجعة"
        }
      ];
    }

    res.json({
      order: formattedOrder,
      tracking: formattedTracking
    });
  } catch (error) {
    console.error("خطأ في جلب بيانات تتبع الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب تفاصيل طلب محدد
router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await storage.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }
    
    res.json(order);
  } catch (error) {
    console.error("خطأ في جلب تفاصيل الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إلغاء الطلب
router.patch("/:orderId/cancel", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, cancelledBy } = req.body;

    const order = await storage.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    await storage.updateOrder(orderId, { status: 'cancelled' });

    // تحرير السائق إذا كان مُعيَّناً
    if (order.driverId) {
      await storage.updateDriver(order.driverId, { isAvailable: true });
    }

    // Notify customer via WebSocket - مستهدف
    const ws = req.app.get('ws');
    if (ws) {
      ws.notifyOrder('order_update', { 
        orderId: orderId, 
        status: 'cancelled', 
        orderNumber: order.orderNumber,
        type: 'regular'
      }, {
        customerId: order.customerId,
        customerPhone: order.customerPhone,
        driverId: order.driverId,
        orderId,
      });
    }

    // إنشاء إشعارات
    try {
      const statusMessage = reason ? `تم إلغاء الطلب - السبب: ${reason}` : 'تم إلغاء الطلب';
      
      // إشعار للعميل
      await storage.createNotification({
        type: 'order_status_update',
        title: 'تحديث حالة الطلب',
        message: `طلبك رقم ${order.orderNumber}: ${statusMessage}`,
        recipientType: 'customer',
        recipientId: order.customerId || order.customerPhone,
        orderId: orderId,
        isRead: false
      });

      await storage.createOrderTracking({
        orderId,
        status: 'cancelled',
        message: statusMessage,
        createdBy: cancelledBy || 'system',
        createdByType: 'system'
      });
    } catch (notificationError) {
      console.error('خطأ في إنشاء الإشعارات:', notificationError);
    }

    res.json({ success: true, status: 'cancelled' });
  } catch (error) {
    console.error("خطأ في إلغاء الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Helper function
function formatCurrency(amount: string | number) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${num.toLocaleString('ar-YE')} ر.ي`;
}

export default router;