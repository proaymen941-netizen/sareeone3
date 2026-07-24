/**
 * خدمة حسابات المطاعم
 * Restaurant Account Service
 * 
 * إدارة الإيرادات والعمولات والسحوبات للمطاعم
 */

import { storage } from "../storage";
import type { Order, RestaurantAccount, RestaurantTransaction } from "@shared/schema";

// نسبة العمولة الافتراضية للمنصة
const DEFAULT_PLATFORM_COMMISSION = 15; // 15%

export interface OrderRevenueResult {
  orderAmount: number;
  platformCommission: number;
  restaurantRevenue: number;
  deliveryFee: number;
  netRevenue: number;
}

export interface RestaurantStats {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  totalCommission: number;
  netRevenue: number;
  pendingAmount: number;
  availableBalance: number;
  averageOrderValue: number;
  averageRating: number;
}

/**
 * حساب إيرادات الطلب للمطعم
 * Calculate order revenue for restaurant
 */
export function calculateOrderRevenue(
  orderSubtotal: number,
  deliveryFee: number,
  commissionRate: number = DEFAULT_PLATFORM_COMMISSION
): OrderRevenueResult {
  const orderAmount = orderSubtotal;
  const platformCommission = (orderAmount * commissionRate) / 100;
  const restaurantRevenue = orderAmount - platformCommission;
  
  return {
    orderAmount,
    platformCommission: Math.round(platformCommission * 100) / 100,
    restaurantRevenue: Math.round(restaurantRevenue * 100) / 100,
    deliveryFee,
    netRevenue: Math.round(restaurantRevenue * 100) / 100
  };
}

/**
 * معالجة إيرادات الطلب المكتمل
 * Process completed order revenue
 */
export async function processOrderRevenue(order: Order): Promise<void> {
  if (!order.restaurantId || order.status !== 'delivered') {
    return;
  }

  try {
    // جلب حساب المطعم أو إنشاء واحد جديد
    let account = await storage.getRestaurantAccount(order.restaurantId);
    
    if (!account) {
      // إنشاء حساب جديد للمطعم
      const restaurant = await storage.getRestaurant(order.restaurantId);
      if (!restaurant) {
        console.error('Restaurant not found:', order.restaurantId);
        return;
      }
      
      account = await storage.createRestaurantAccount({
        restaurantId: order.restaurantId,
        ownerName: restaurant.name,
        ownerPhone: restaurant.phone || '',
        commissionRate: String(DEFAULT_PLATFORM_COMMISSION)
      });
    }

    // حساب الإيرادات
    const subtotal = parseFloat(order.subtotal || '0');
    const deliveryFee = parseFloat(order.deliveryFee || '0');
    const commissionRate = parseFloat(account.commissionRate || String(DEFAULT_PLATFORM_COMMISSION));
    
    const revenue = calculateOrderRevenue(subtotal, deliveryFee, commissionRate);

    // الرصيد الحالي
    const currentBalance = parseFloat(account.availableBalance || '0');
    const newBalance = currentBalance + revenue.restaurantRevenue;

    // تحديث حساب المطعم
    await storage.updateRestaurantAccount(order.restaurantId, {
      totalOrders: (account.totalOrders || 0) + 1,
      totalRevenue: String(parseFloat(account.totalRevenue || '0') + revenue.orderAmount),
      totalCommission: String(parseFloat(account.totalCommission || '0') + revenue.platformCommission),
      availableBalance: String(newBalance),
      pendingAmount: String(parseFloat(account.pendingAmount || '0'))
    });

    // إنشاء سجل معاملة
    await storage.createRestaurantTransaction({
      restaurantId: order.restaurantId,
      orderId: order.id,
      type: 'order_revenue',
      amount: String(revenue.restaurantRevenue),
      balanceBefore: String(currentBalance),
      balanceAfter: String(newBalance),
      description: `إيرادات الطلب رقم ${order.orderNumber}`
    });

    // إنشاء سجل خصم العمولة
    await storage.createRestaurantTransaction({
      restaurantId: order.restaurantId,
      orderId: order.id,
      type: 'commission_deduction',
      amount: String(-revenue.platformCommission),
      balanceBefore: String(newBalance),
      balanceAfter: String(newBalance),
      description: `عمولة المنصة ${commissionRate}% للطلب ${order.orderNumber}`
    });

    console.log(`✅ تم معالجة إيرادات الطلب ${order.orderNumber} للمطعم`);
    
  } catch (error) {
    console.error('Error processing order revenue:', error);
    throw error;
  }
}

/**
 * جلب إحصائيات المطعم
 * Get restaurant statistics
 */
export async function getRestaurantStats(
  restaurantId: string,
  period?: 'today' | 'week' | 'month' | 'all'
): Promise<RestaurantStats> {
  try {
    // جلب حساب المطعم
    const account = await storage.getRestaurantAccount(restaurantId);
    
    // جلب طلبات المطعم
    const allOrders = await storage.getOrdersByRestaurant(restaurantId);
    
    // فلترة حسب الفترة
    let orders = allOrders;
    const now = new Date();
    
    if (period) {
      const startDate = new Date();
      switch (period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      if (period !== 'all') {
        orders = allOrders.filter(order => 
          new Date(order.createdAt) >= startDate
        );
      }
    }

    // حساب الإحصائيات
    const completedOrders = orders.filter(o => o.status === 'delivered');
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');
    
    const totalRevenue = completedOrders.reduce((sum, o) => 
      sum + parseFloat(o.subtotal || '0'), 0
    );
    
    const commissionRate = account ? parseFloat(account.commissionRate || String(DEFAULT_PLATFORM_COMMISSION)) : DEFAULT_PLATFORM_COMMISSION;
    const totalCommission = (totalRevenue * commissionRate) / 100;
    
    const averageOrderValue = completedOrders.length > 0 
      ? totalRevenue / completedOrders.length 
      : 0;

    // جلب تقييمات المطعم
    const ratings = await storage.getRatings(undefined, restaurantId);
    const approvedRatings = ratings.filter(r => r.isApproved);
    const averageRating = approvedRatings.length > 0
      ? approvedRatings.reduce((sum, r) => sum + r.rating, 0) / approvedRatings.length
      : 0;

    return {
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      cancelledOrders: cancelledOrders.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCommission: Math.round(totalCommission * 100) / 100,
      netRevenue: Math.round((totalRevenue - totalCommission) * 100) / 100,
      pendingAmount: account ? parseFloat(account.pendingAmount || '0') : 0,
      availableBalance: account ? parseFloat(account.availableBalance || '0') : 0,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      averageRating: Math.round(averageRating * 10) / 10
    };
  } catch (error) {
    console.error('Error getting restaurant stats:', error);
    throw error;
  }
}

/**
 * معالجة طلب سحب للمطعم
 * Process restaurant withdrawal request
 */
export async function processRestaurantWithdrawal(
  restaurantId: string,
  amount: number,
  notes?: string
): Promise<{ success: boolean; message: string; withdrawalId?: string }> {
  try {
    // جلب حساب المطعم
    const account = await storage.getRestaurantAccount(restaurantId);
    
    if (!account) {
      return { success: false, message: 'حساب المطعم غير موجود' };
    }

    const availableBalance = parseFloat(account.availableBalance || '0');
    
    if (amount <= 0) {
      return { success: false, message: 'المبلغ يجب أن يكون أكبر من صفر' };
    }

    if (amount > availableBalance) {
      return { success: false, message: 'الرصيد غير كافٍ' };
    }

    // إنشاء طلب السحب
    const withdrawal = await storage.createRestaurantWithdrawal({
      restaurantId,
      amount: String(amount),
      status: 'pending',
      notes
    });

    // تحديث الرصيد (تحويل إلى معلق)
    const newAvailable = availableBalance - amount;
    const newPending = parseFloat(account.pendingAmount || '0') + amount;

    await storage.updateRestaurantAccount(restaurantId, {
      availableBalance: String(newAvailable),
      pendingAmount: String(newPending)
    });

    // إنشاء سجل معاملة
    await storage.createRestaurantTransaction({
      restaurantId,
      type: 'withdrawal_request',
      amount: String(-amount),
      balanceBefore: String(availableBalance),
      balanceAfter: String(newAvailable),
      description: `طلب سحب رقم ${withdrawal.id}`
    });

    return {
      success: true,
      message: 'تم إنشاء طلب السحب بنجاح',
      withdrawalId: withdrawal.id
    };
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return { success: false, message: 'حدث خطأ أثناء معالجة طلب السحب' };
  }
}

/**
 * تحديث إحصائيات المطعم اليومية
 * Update restaurant daily statistics
 */
export async function updateDailyStats(restaurantId: string): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = await getRestaurantStats(restaurantId, 'today');
    
    await storage.upsertRestaurantDailyStats({
      restaurantId,
      date: today,
      totalOrders: stats.totalOrders,
      completedOrders: stats.completedOrders,
      cancelledOrders: stats.cancelledOrders,
      totalRevenue: String(stats.totalRevenue),
      totalDeliveryFees: '0', // يمكن حسابها لاحقاً
      averageOrderValue: String(stats.averageOrderValue),
      averageRating: String(stats.averageRating)
    });
  } catch (error) {
    console.error('Error updating daily stats:', error);
  }
}

export default {
  calculateOrderRevenue,
  processOrderRevenue,
  getRestaurantStats,
  processRestaurantWithdrawal,
  updateDailyStats
};
