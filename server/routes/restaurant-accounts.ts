/**
 * مسارات API لحسابات المطاعم
 * Restaurant Accounts API Routes
 */

import express from "express";
import { DatabaseStorage } from "../db";
import { AdvancedDatabaseStorage } from "../db-advanced";
import { z } from "zod";
import { eq, desc, and, inArray } from "drizzle-orm";
import { orders, restaurants, restaurantWallets, withdrawalRequests } from "@shared/schema";

const router = express.Router();
const dbStorage = new DatabaseStorage();
const db = dbStorage.db;

function getAdvStorage() {
  return new AdvancedDatabaseStorage(db);
}

// جلب جميع حسابات المطاعم (للمدير)
router.get("/", async (req, res) => {
  try {
    const advStorage = getAdvStorage();
    const allRestaurants = await dbStorage.getRestaurants();

    const accounts = await Promise.all(allRestaurants.map(async (restaurant) => {
      const wallet = await advStorage.getRestaurantWallet(restaurant.id);

      const restaurantOrders = await db.select().from(orders).where(eq(orders.restaurantId, restaurant.id));
      const deliveredOrders = restaurantOrders.filter(o => o.status === 'delivered');
      const totalRevenue = deliveredOrders.reduce((sum, o) => sum + parseFloat(o.restaurantEarnings?.toString() || '0'), 0);

      const allWithdrawals = await db.select().from(withdrawalRequests)
        .where(and(eq(withdrawalRequests.entityId, restaurant.id), eq(withdrawalRequests.entityType, 'restaurant')));
      const pendingAmount = allWithdrawals
        .filter(w => w.status === 'pending')
        .reduce((sum, w) => sum + parseFloat(w.amount?.toString() || '0'), 0);
      const withdrawnAmount = allWithdrawals
        .filter(w => w.status === 'completed')
        .reduce((sum, w) => sum + parseFloat(w.amount?.toString() || '0'), 0);

      return {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          image: restaurant.image,
          isActive: restaurant.isActive,
          phone: restaurant.phone || '',
        },
        account: {
          totalOrders: deliveredOrders.length,
          totalRevenue: totalRevenue.toFixed(2),
          availableBalance: wallet?.balance?.toString() || '0',
          pendingAmount: pendingAmount.toFixed(2),
          withdrawnAmount: withdrawnAmount.toFixed(2),
          commissionRate: restaurant.commissionRate?.toString() || '0'
        }
      };
    }));

    res.json(accounts);
  } catch (error) {
    console.error('خطأ في جلب حسابات المطاعم:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب جميع طلبات السحب من جميع المطاعم
router.get("/all-withdrawals", async (req, res) => {
  try {
    const { status } = req.query;

    let allWithdrawals = await db.select().from(withdrawalRequests)
      .where(eq(withdrawalRequests.entityType, 'restaurant'))
      .orderBy(desc(withdrawalRequests.createdAt));

    if (status && typeof status === 'string' && status !== 'all') {
      allWithdrawals = allWithdrawals.filter(w => w.status === status);
    }

    // إضافة اسم المطعم لكل طلب
    const allRestaurants = await dbStorage.getRestaurants();
    const restaurantMap = new Map(allRestaurants.map(r => [r.id, r]));

    const enriched = allWithdrawals.map(w => {
      const restaurant = restaurantMap.get(w.entityId);
      let bankInfo: any = {};
      try {
        bankInfo = w.bankDetails ? JSON.parse(w.bankDetails) : {};
      } catch {}
      return {
        ...w,
        restaurantName: restaurant?.name || 'مطعم غير معروف',
        restaurantImage: restaurant?.image || null,
        bankName: bankInfo.bankName || '',
        accountNumber: bankInfo.accountNumber || '',
        accountHolder: bankInfo.accountHolder || restaurant?.name || '',
      };
    });

    res.json({ withdrawals: enriched, total: enriched.length });
  } catch (error) {
    console.error('خطأ في جلب جميع طلبات السحب:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب حساب مطعم محدد
router.get("/:restaurantId", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const advStorage = getAdvStorage();

    const restaurant = await dbStorage.getRestaurant(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: "المطعم غير موجود" });
    }

    let wallet = await advStorage.getRestaurantWallet(restaurantId);
    if (!wallet) {
      wallet = await advStorage.createRestaurantWallet({
        restaurantId,
        balance: "0",
        isActive: true
      });
    }

    const restaurantOrders = await db.select().from(orders).where(eq(orders.restaurantId, restaurantId));
    const deliveredOrders = restaurantOrders.filter(o => o.status === 'delivered');
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + parseFloat(o.restaurantEarnings?.toString() || '0'), 0);

    const allWithdrawals = await db.select().from(withdrawalRequests)
      .where(and(eq(withdrawalRequests.entityId, restaurantId), eq(withdrawalRequests.entityType, 'restaurant')));
    const pendingAmount = allWithdrawals
      .filter(w => w.status === 'pending')
      .reduce((sum, w) => sum + parseFloat(w.amount?.toString() || '0'), 0);
    const withdrawnAmount = allWithdrawals
      .filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + parseFloat(w.amount?.toString() || '0'), 0);

    res.json({
      id: wallet.id,
      restaurantId,
      ownerName: restaurant.name,
      ownerPhone: restaurant.phone || '',
      totalOrders: deliveredOrders.length,
      totalRevenue: totalRevenue.toFixed(2),
      availableBalance: wallet.balance?.toString() || '0',
      pendingAmount: pendingAmount.toFixed(2),
      withdrawnAmount: withdrawnAmount.toFixed(2),
      commissionRate: restaurant.commissionRate?.toString() || '0',
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt
    });
  } catch (error) {
    console.error('خطأ في جلب حساب المطعم:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب إحصائيات المطعم
router.get("/:restaurantId/stats", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { period } = req.query;

    const advStorage = getAdvStorage();
    const wallet = await advStorage.getRestaurantWallet(restaurantId);
    const restaurant = await dbStorage.getRestaurant(restaurantId);

    const restaurantOrders = await db.select().from(orders).where(eq(orders.restaurantId, restaurantId));

    let filteredOrders = restaurantOrders;
    const now = new Date();

    if (period === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filteredOrders = restaurantOrders.filter(o => new Date(o.createdAt) >= today);
    } else if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredOrders = restaurantOrders.filter(o => new Date(o.createdAt) >= weekAgo);
    } else if (period === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredOrders = restaurantOrders.filter(o => new Date(o.createdAt) >= monthAgo);
    }

    const deliveredOrders = filteredOrders.filter(o => o.status === 'delivered');
    const pendingOrders = filteredOrders.filter(o => o.status === 'pending');
    const cancelledOrders = filteredOrders.filter(o => o.status === 'cancelled');

    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + parseFloat(o.restaurantEarnings?.toString() || '0'), 0);
    const totalCommission = deliveredOrders.reduce((sum, o) => sum + parseFloat(o.companyEarnings?.toString() || '0'), 0);
    const avgOrderValue = deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;

    // all-time stats
    const allDelivered = restaurantOrders.filter(o => o.status === 'delivered');
    const allWithdrawals = await db.select().from(withdrawalRequests)
      .where(and(eq(withdrawalRequests.entityId, restaurantId), eq(withdrawalRequests.entityType, 'restaurant')));
    const totalWithdrawn = allWithdrawals
      .filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + parseFloat(w.amount?.toString() || '0'), 0);
    const netRevenue = allDelivered.reduce((sum, o) => sum + parseFloat(o.restaurantEarnings?.toString() || '0'), 0);

    res.json({
      period,
      totalOrders: filteredOrders.length,
      deliveredOrders: deliveredOrders.length,
      pendingOrders: pendingOrders.length,
      cancelledOrders: cancelledOrders.length,
      totalRevenue,
      totalCommission,
      avgOrderValue,
      successRate: filteredOrders.length > 0 ? (deliveredOrders.length / filteredOrders.length * 100).toFixed(1) : '0',
      // all-time
      completedOrders: allDelivered.length,
      netRevenue: netRevenue.toFixed(2),
      totalWithdrawn: totalWithdrawn.toFixed(2),
      availableBalance: wallet?.balance?.toString() || '0',
      commissionRate: restaurant?.commissionRate?.toString() || '0',
    });
  } catch (error) {
    console.error('خطأ في جلب إحصائيات المطعم:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث نسبة عمولة المطعم
router.put("/:restaurantId/commission", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { commissionRate } = req.body;

    if (commissionRate === undefined || commissionRate === null) {
      return res.status(400).json({ error: "نسبة العمولة مطلوبة" });
    }

    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({ error: "نسبة العمولة يجب أن تكون بين 0 و 100" });
    }

    await dbStorage.updateRestaurant(restaurantId, { commissionRate: rate.toString() } as any);
    const restaurant = await dbStorage.getRestaurant(restaurantId);

    res.json({ success: true, restaurant, commissionRate: rate });
  } catch (error) {
    console.error('خطأ في تحديث نسبة العمولة:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث بيانات حساب المطعم
router.put("/:restaurantId", async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const accountSchema = z.object({
      ownerName: z.string().optional(),
      ownerPhone: z.string().optional(),
      ownerEmail: z.string().email().optional(),
      bankName: z.string().optional(),
      bankAccountNumber: z.string().optional(),
      bankAccountName: z.string().optional(),
      commissionRate: z.string().optional()
    });

    const validatedData = accountSchema.parse(req.body);

    if (validatedData.commissionRate !== undefined) {
      await dbStorage.updateRestaurant(restaurantId, {
        commissionRate: validatedData.commissionRate
      } as any);
    }

    const restaurant = await dbStorage.getRestaurant(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: "المطعم غير موجود" });
    }

    res.json({ success: true, restaurant });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "بيانات غير صحيحة", details: error.errors });
    }
    console.error('خطأ في تحديث حساب المطعم:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب معاملات المطعم
router.get("/:restaurantId/transactions", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { type, limit: limitParam, offset: offsetParam } = req.query;

    const restaurantOrders = await db.select().from(orders)
      .where(eq(orders.restaurantId, restaurantId))
      .orderBy(desc(orders.createdAt));

    let transactions = restaurantOrders
      .filter(o => o.status === 'delivered')
      .map(o => ({
        id: o.id,
        restaurantId,
        type: 'order_revenue',
        amount: o.restaurantEarnings?.toString() || '0',
        description: `إيرادات طلب رقم ${o.orderNumber}`,
        orderId: o.id,
        createdAt: o.createdAt
      }));

    const withdrawals = await db.select().from(withdrawalRequests)
      .where(and(eq(withdrawalRequests.entityId, restaurantId), eq(withdrawalRequests.entityType, 'restaurant')))
      .orderBy(desc(withdrawalRequests.createdAt));

    const withdrawalTransactions = withdrawals.map(w => {
      let bankInfo: any = {};
      try { bankInfo = w.bankDetails ? JSON.parse(w.bankDetails) : {}; } catch {}
      return {
        id: w.id,
        restaurantId,
        type: `withdrawal_${w.status}`,
        amount: `-${w.amount}`,
        description: `طلب سحب - ${w.status === 'completed' ? 'مكتمل' : w.status === 'pending' ? 'معلق' : w.status === 'approved' ? 'موافق عليه' : 'مرفوض'}`,
        bankName: bankInfo.bankName || '',
        accountNumber: bankInfo.accountNumber || '',
        status: w.status,
        adminNotes: w.adminNotes || '',
        createdAt: w.createdAt
      };
    });

    let allTransactions = [...transactions, ...withdrawalTransactions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (type) allTransactions = allTransactions.filter(t => t.type.includes(type as string));

    const limitNum = parseInt(limitParam as string) || 50;
    const offsetNum = parseInt(offsetParam as string) || 0;
    const paginated = allTransactions.slice(offsetNum, offsetNum + limitNum);

    res.json({ transactions: paginated, total: allTransactions.length, limit: limitNum, offset: offsetNum });
  } catch (error) {
    console.error('خطأ في جلب معاملات المطعم:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// طلب سحب رصيد
router.post("/:restaurantId/withdraw", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { amount, bankName, accountNumber, accountHolder } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: "المبلغ يجب أن يكون أكبر من صفر" });
    }

    const advStorage = getAdvStorage();
    const wallet = await advStorage.getRestaurantWallet(restaurantId);
    const currentBalance = parseFloat(wallet?.balance?.toString() || '0');

    if (currentBalance < parseFloat(amount)) {
      return res.status(400).json({ error: "الرصيد غير كافٍ" });
    }

    const restaurant = await dbStorage.getRestaurant(restaurantId);
    const bankDetails = JSON.stringify({ bankName: bankName || '', accountNumber: accountNumber || '', accountHolder: accountHolder || restaurant?.name || '' });

    const withdrawal = await db.insert(withdrawalRequests).values({
      entityType: 'restaurant',
      entityId: restaurantId,
      amount: amount.toString(),
      bankDetails,
      status: 'pending'
    }).returning();

    res.json({ success: true, message: "تم تقديم طلب السحب بنجاح", withdrawal: withdrawal[0] });
  } catch (error) {
    console.error('خطأ في طلب السحب:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب طلبات السحب للمطعم
router.get("/:restaurantId/withdrawals", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { status } = req.query;

    let withdrawals = await db.select().from(withdrawalRequests)
      .where(and(eq(withdrawalRequests.entityId, restaurantId), eq(withdrawalRequests.entityType, 'restaurant')))
      .orderBy(desc(withdrawalRequests.createdAt));

    if (status && typeof status === 'string') {
      withdrawals = withdrawals.filter(w => w.status === status);
    }

    const enriched = withdrawals.map(w => {
      let bankInfo: any = {};
      try { bankInfo = w.bankDetails ? JSON.parse(w.bankDetails) : {}; } catch {}
      return { ...w, bankName: bankInfo.bankName || '', accountNumber: bankInfo.accountNumber || '', accountHolder: bankInfo.accountHolder || '' };
    });

    res.json({ withdrawals: enriched, total: enriched.length });
  } catch (error) {
    console.error('خطأ في جلب طلبات السحب:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب الإحصائيات اليومية
router.get("/:restaurantId/daily-stats", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { startDate, endDate } = req.query;

    const restaurantOrders = await db.select().from(orders).where(eq(orders.restaurantId, restaurantId));

    let start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let end = endDate ? new Date(endDate as string) : new Date();

    const filteredOrders = restaurantOrders.filter(o => {
      const d = new Date(o.createdAt);
      return d >= start && d <= end && o.status === 'delivered';
    });

    const dailyMap: Record<string, { date: string; orders: number; revenue: number }> = {};
    filteredOrders.forEach(o => {
      const day = new Date(o.createdAt).toISOString().split('T')[0];
      if (!dailyMap[day]) dailyMap[day] = { date: day, orders: 0, revenue: 0 };
      dailyMap[day].orders++;
      dailyMap[day].revenue += parseFloat(o.restaurantEarnings?.toString() || '0');
    });

    const stats = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    res.json(stats);
  } catch (error) {
    console.error('خطأ في جلب الإحصائيات اليومية:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// معالجة طلب سحب (موافقة/رفض) - للمدير
router.put("/withdrawals/:withdrawalId", async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { status, adminNotes, rejectionReason } = req.body;

    if (!['approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ error: "حالة غير صحيحة" });
    }

    const [updated] = await db.update(withdrawalRequests)
      .set({
        status,
        adminNotes: adminNotes || null,
        rejectionReason: status === 'rejected' ? (rejectionReason || adminNotes || null) : null,
        updatedAt: new Date()
      })
      .where(eq(withdrawalRequests.id, withdrawalId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "طلب السحب غير موجود" });
    }

    // إذا اكتمل السحب، خصم من رصيد المطعم
    if (status === 'completed' && updated.entityId) {
      const advStorage = getAdvStorage();
      const amount = parseFloat(updated.amount?.toString() || '0');
      if (amount > 0) {
        try {
          await advStorage.deductRestaurantWalletBalance(updated.entityId, amount);
        } catch (e) {
          console.error('خطأ في خصم رصيد المطعم:', e);
        }
      }
    }

    res.json({ success: true, withdrawal: updated });
  } catch (error) {
    console.error('خطأ في معالجة طلب السحب:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// كشف حساب تفصيلي للمتجر
router.get("/:restaurantId/statement", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { from, to } = req.query;

    const restaurant = await dbStorage.getRestaurant(restaurantId);
    if (!restaurant) return res.status(404).json({ error: "المتجر غير موجود" });

    const advStorage = getAdvStorage();
    let wallet = await advStorage.getRestaurantWallet(restaurantId);
    if (!wallet) {
      wallet = await advStorage.createRestaurantWallet({ restaurantId, balance: "0", isActive: true });
    }
    const commissionRate = parseFloat(restaurant.commissionRate?.toString() || '15');

    // جلب جميع طلبات المتجر
    let restaurantOrders = await db.select().from(orders)
      .where(eq(orders.restaurantId, restaurantId))
      .orderBy(desc(orders.createdAt));

    // فلترة حسب الفترة
    if (from || to) {
      const fromDate = from ? new Date(from as string) : new Date('2000-01-01');
      const toDate = to ? new Date(to as string) : new Date();
      toDate.setHours(23, 59, 59, 999);
      restaurantOrders = restaurantOrders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= fromDate && d <= toDate;
      });
    }

    const deliveredOrders = restaurantOrders.filter(o => o.status === 'delivered');
    const cancelledOrders = restaurantOrders.filter(o => o.status === 'cancelled');

    // بناء سطور كشف الحساب — نستخدم القيم المُخزّنة في الطلب لضمان الدقة
    const statementLines = deliveredOrders.map(o => {
      const subtotal = parseFloat(o.subtotal?.toString() || '0');
      const deliveryFee = parseFloat(o.deliveryFee?.toString() || '0');
      const totalAmount = parseFloat(o.totalAmount?.toString() || o.total?.toString() || '0');
      const storedRestaurantEarnings = parseFloat(o.restaurantEarnings?.toString() || '0');
      // العمولة الفعلية = subtotal - ما حصل عليه المتجر (بعد خصم العمولة)
      const commissionAmount = storedRestaurantEarnings > 0
        ? parseFloat((subtotal - storedRestaurantEarnings).toFixed(2))
        : parseFloat(((subtotal * commissionRate) / 100).toFixed(2));
      const restaurantNet = storedRestaurantEarnings > 0
        ? storedRestaurantEarnings
        : parseFloat((subtotal - commissionAmount).toFixed(2));
      const effectiveRate = subtotal > 0
        ? parseFloat(((commissionAmount / subtotal) * 100).toFixed(2))
        : commissionRate;

      return {
        orderId: o.id,
        orderNumber: o.orderNumber,
        date: o.createdAt,
        customerName: o.customerName || o.customerPhone || 'عميل',
        status: o.status,
        subtotal,
        deliveryFee,
        totalAmount,
        commissionRate: effectiveRate,
        commissionAmount,
        restaurantNet: parseFloat(restaurantNet.toFixed(2)),
        deliveryFeeShare: deliveryFee
      };
    });

    // جلب طلبات السحب
    const allWithdrawals = await db.select().from(withdrawalRequests)
      .where(and(eq(withdrawalRequests.entityId, restaurantId), eq(withdrawalRequests.entityType, 'restaurant')))
      .orderBy(desc(withdrawalRequests.createdAt));

    let filteredWithdrawals = allWithdrawals;
    if (from || to) {
      const fromDate = from ? new Date(from as string) : new Date('2000-01-01');
      const toDate = to ? new Date(to as string) : new Date();
      toDate.setHours(23, 59, 59, 999);
      filteredWithdrawals = allWithdrawals.filter(w => {
        const d = new Date(w.createdAt);
        return d >= fromDate && d <= toDate;
      });
    }

    // ملخص الحساب
    const totalOrdersCount = restaurantOrders.length;
    const totalSubtotal = statementLines.reduce((s, l) => s + l.subtotal, 0);
    const totalCommission = statementLines.reduce((s, l) => s + l.commissionAmount, 0);
    const totalNet = statementLines.reduce((s, l) => s + l.restaurantNet, 0);
    const totalWithdrawn = filteredWithdrawals.filter(w => w.status === 'completed').reduce((s, w) => s + parseFloat(w.amount?.toString() || '0'), 0);
    const pendingWithdrawals = filteredWithdrawals.filter(w => w.status === 'pending').reduce((s, w) => s + parseFloat(w.amount?.toString() || '0'), 0);
    const currentBalance = parseFloat(wallet?.balance?.toString() || '0');

    res.json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        phone: restaurant.phone || '',
        address: restaurant.address || '',
        commissionRate
      },
      period: {
        from: from || null,
        to: to || null
      },
      summary: {
        totalOrders: totalOrdersCount,
        deliveredOrders: deliveredOrders.length,
        cancelledOrders: cancelledOrders.length,
        totalSubtotal: parseFloat(totalSubtotal.toFixed(2)),
        totalCommission: parseFloat(totalCommission.toFixed(2)),
        totalNet: parseFloat(totalNet.toFixed(2)),
        totalWithdrawn: parseFloat(totalWithdrawn.toFixed(2)),
        pendingWithdrawals: parseFloat(pendingWithdrawals.toFixed(2)),
        currentBalance: parseFloat(currentBalance.toFixed(2))
      },
      orders: statementLines,
      withdrawals: filteredWithdrawals.map(w => {
        let bankInfo: any = {};
        try { bankInfo = w.bankDetails ? JSON.parse(w.bankDetails) : {}; } catch {}
        return {
          id: w.id,
          date: w.createdAt,
          amount: parseFloat(w.amount?.toString() || '0'),
          status: w.status,
          bankName: bankInfo.bankName || '',
          accountNumber: bankInfo.accountNumber || '',
          notes: w.notes || ''
        };
      }),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('خطأ في كشف حساب المتجر:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;

