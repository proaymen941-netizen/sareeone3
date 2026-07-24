import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Trash2, MapPin, Tag, CheckCircle, XCircle, Loader2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useCart } from '../context/CartContext';
import { useUserLocation as useCoordinates } from '../context/LocationContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { InsertOrder, Restaurant } from '@shared/schema';
import { getAppStatus, getRestaurantStatus } from '@/utils/restaurantHours';
import { formatCurrency } from '@/lib/utils';
import AppClosedOverlay from '@/components/AppClosedOverlay';
import ScheduledOrderDialog from '@/components/ScheduledOrderDialog';
import { useAuth } from '@/context/AuthContext';

export default function CartPage() {
  const [, setLocation] = useLocation();
  const { state, removeItem, updateQuantity, clearCart, setDeliveryFee } = useCart();
  const { items, subtotal, total, deliveryFee } = state;
  const { toast } = useToast();
  const { user } = useAuth();
  const { location: userLocation, getCurrentLocation } = useCoordinates();
  const [calculatingFee, setCalculatingFee] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<{
    distance: number;
    estimatedTime: string;
    isFreeDelivery: boolean;
  } | null>(null);

  const [showAppClosedOverlay, setShowAppClosedOverlay] = useState(false);
  const [appClosedMessage, setAppClosedMessage] = useState('');
  const [showScheduledDialog, setShowScheduledDialog] = useState(false);
  const [scheduledData, setScheduledData] = useState<{date: string, time: string} | null>(null);

  const restaurantId = items[0]?.restaurantId;

  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: ['/api/restaurants', restaurantId],
    enabled: !!restaurantId,
  });

  // جلب عروض الخصم النشطة لهذا المتجر (discount type فقط)
  const { data: restaurantDiscountOffers = [] } = useQuery<any[]>({
    queryKey: ['/api/special-offers/discount', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const res = await fetch(`/api/special-offers?restaurantId=${restaurantId}&offerType=discount`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.filter((o: any) => o.offerType === 'discount' && o.isActive);
    },
    enabled: !!restaurantId,
  });

  // حساب الخصم التلقائي من العروض المرتبطة بالمتجر
  const appliedOfferDiscount = (() => {
    if (!restaurantDiscountOffers.length || subtotal === 0) return { amount: 0, offer: null };
    // اختر أفضل عرض خصم متاح (الأعلى خصماً)
    let bestDiscount = 0;
    let bestOffer: any = null;
    for (const offer of restaurantDiscountOffers) {
      const minOrder = parseFloat(offer.minimumOrder || '0');
      if (subtotal < minOrder) continue;
      // حساب الخصم بناءً على النطاق
      let discountBase = subtotal;
      if (offer.discountScope === 'section' && offer.sectionId) {
        // خصم على عناصر القسم المحدد فقط — نحسب المجموع الفرعي لهذه العناصر
        discountBase = items
          .filter((item: any) => item.sectionId === offer.sectionId)
          .reduce((sum: number, item: any) => sum + parseFloat(item.price) * item.quantity, 0);
        if (discountBase === 0) continue; // لا توجد عناصر من هذا القسم
      }
      let discount = 0;
      if (offer.discountPercent) {
        discount = (discountBase * parseFloat(offer.discountPercent)) / 100;
      } else if (offer.discountAmount) {
        discount = Math.min(parseFloat(offer.discountAmount), discountBase);
      }
      if (discount > bestDiscount) {
        bestDiscount = discount;
        bestOffer = offer;
      }
    }
    return { amount: Math.round(bestDiscount * 100) / 100, offer: bestOffer };
  })();

  const { data: uiSettings } = useQuery<any[]>({
    queryKey: ['/api/ui-settings'],
  });

  const { data: paymentMethods = [] } = useQuery<any[]>({
    queryKey: ['/api/payment-methods'],
  });

  const getSetting = (key: string, fallback = '') =>
    (uiSettings as any[])?.find((s: any) => s.key === key)?.value ?? fallback;

  const appStatus = useMemo(() => {
    const openingTime = getSetting('opening_time', '08:00');
    const closingTime = getSetting('closing_time', '23:00');
    const storeStatus = getSetting('store_status');
    return getAppStatus(openingTime, closingTime, storeStatus);
  }, [uiSettings]);

  const restaurantStatus = useMemo(() => {
    if (!restaurant) return null;
    return getRestaurantStatus(restaurant);
  }, [restaurant]);

  const canPlaceOrder = appStatus.isOpen && (restaurantStatus === null || restaurantStatus.isOpen);

  // إعدادات السلة من لوحة التحكم
  // خدمة تأجيل الطلبات - تعمل فقط إذا فعّلها المدير من لوحة التحكم
  const scheduledOrdersEnabled = getSetting('enable_scheduled_orders', 'false') === 'true';

  const showCouponBoxAlways = getSetting('show_coupon_box_always', 'true') !== 'false';
  const couponMinOrderValue = parseFloat(getSetting('coupon_min_order_value', '0') || '0');
  const showCouponBox = showCouponBoxAlways || (couponMinOrderValue > 0 && subtotal >= couponMinOrderValue);
  const showPaymentCards = getSetting('show_payment_cards', 'true') !== 'false';
  const showCashPayment = getSetting('show_cash_payment', 'true') !== 'false';
  const showBankTransfer = getSetting('show_bank_transfer', 'false') === 'true';
  const checkoutButtonText = getSetting('cart_checkout_button_text', 'تأكيد الطلب');
  const checkoutNote = getSetting('cart_checkout_note', '');
  const appName = getSetting('app_name', 'السريع ون');

  // بناء قائمة طرق الدفع بناءً على الإعدادات والـ API
  const availablePaymentMethods = useMemo(() => {
    const methods: { value: string; icon: string; label: string }[] = [];

    if (showCashPayment) {
      methods.push({ value: 'cash', icon: '💵', label: 'نقداً' });
    }

    if (showPaymentCards) {
      // إذا كان هناك طرق دفع مُضافة من الأدمن، نستخدمها
      if (paymentMethods.length > 0) {
        paymentMethods
          .filter((m: any) => m.isActive && m.type !== 'cash' && m.type !== 'bank_transfer')
          .forEach((m: any) => {
            const iconMap: Record<string, string> = {
              mada: '🏦',
              stc_pay: '📱',
              apple_pay: '🍎',
              visa: '💳',
              mastercard: '💳',
              tabby: '📊',
              tamara: '📈',
              wallet: '👛',
              online: '🌐',
            };
            methods.push({
              value: m.provider || m.type,
              icon: iconMap[m.provider] || '💳',
              label: m.name || m.provider,
            });
          });
      } else {
        // طرق افتراضية
        methods.push({ value: 'card', icon: '💳', label: 'بطاقة دفع' });
        methods.push({ value: 'wallet', icon: '👛', label: 'المحفظة' });
        methods.push({ value: 'online', icon: '🌐', label: 'دفع إلكتروني' });
      }
    }

    if (showBankTransfer) {
      methods.push({ value: 'bank_transfer', icon: '🏛️', label: 'تحويل بنكي' });
    }

    return methods;
  }, [paymentMethods, showCashPayment, showPaymentCards, showBankTransfer]);

  // حساب رسوم التوصيل
  useEffect(() => {
    if (items.length === 0) {
      setDeliveryInfo(null);
      setDeliveryFee(0);
      return;
    }

    const calculateFee = async () => {
      if (userLocation.position) {
        setCalculatingFee(true);
        try {
          const response = await apiRequest('POST', '/api/delivery-fees/calculate', {
            customerLat: userLocation.position.coords.latitude,
            customerLng: userLocation.position.coords.longitude,
            restaurantId: restaurantId,
            orderSubtotal: subtotal
          });
          const result = await response.json();
          if (result.success) {
            setDeliveryFee(result.fee);
            setDeliveryInfo({
              distance: result.distance,
              estimatedTime: result.estimatedTime,
              isFreeDelivery: result.isFreeDelivery
            });
          }
        } catch {
          setDeliveryFee(5);
        } finally {
          setCalculatingFee(false);
        }
      } else {
        getCurrentLocation();
        setDeliveryFee(0);
        setDeliveryInfo(null);
      }
    };

    calculateFee();
  }, [userLocation.position, subtotal, restaurantId]);

  // الكوبون
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponData, setCouponData] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setCouponDiscount(0);
    setCouponData(null);
    try {
      const categoryIds = [...new Set(items.map((i: any) => i.categoryId).filter(Boolean))];
      const res = await apiRequest('POST', '/api/coupons/validate', {
        code: couponCode.trim().toUpperCase(),
        orderValue: subtotal,
        categoryIds,
      });
      const data = await res.json();
      if (data.valid) {
        setCouponData(data.coupon);
        setCouponDiscount(data.discount || 0);
        toast({ title: "تم تطبيق الكوبون", description: `وفّرت ${formatCurrency(data.discount || 0)}` });
      } else {
        setCouponError(data.message || "كوبون غير صالح");
      }
    } catch {
      setCouponError("خطأ في التحقق من الكوبون");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
    setCouponData(null);
    setCouponError('');
  };

  const totalDiscountAmount = couponDiscount + appliedOfferDiscount.amount;
  const finalTotal = Math.max(0, total - totalDiscountAmount);

  const [orderForm, setOrderForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    deliveryAddress: '',
    notes: '',
    paymentMethod: availablePaymentMethods[0]?.value || 'cash',
  });

  // ملء الحقول تلقائياً ببيانات العميل المسجل لضمان وصول الإشعارات والتتبع
  useEffect(() => {
    if (user) {
      setOrderForm(prev => ({
        ...prev,
        customerName: prev.customerName || user.name || '',
        customerPhone: prev.customerPhone || user.phone || '',
        customerEmail: prev.customerEmail || (user as any).email || '',
      }));
    }
  }, [user]);

  // تحديث طريقة الدفع الافتراضية عند تغيّر القائمة المتاحة
  useEffect(() => {
    if (availablePaymentMethods.length > 0) {
      const currentValid = availablePaymentMethods.find(m => m.value === orderForm.paymentMethod);
      if (!currentValid) {
        setOrderForm(prev => ({ ...prev, paymentMethod: availablePaymentMethods[0].value }));
      }
    }
  }, [availablePaymentMethods]);

  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: InsertOrder) => {
      const response = await apiRequest('POST', '/api/orders', orderData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "تم تأكيد طلبك بنجاح!", description: "سيتم التواصل معك قريباً" });
      clearCart();
      if (data?.order?.id) {
        setLocation(`/order-tracking/${data.order.id}`);
      } else {
        setLocation('/');
      }
    },
    onError: (error: any) => {
      const raw = error?.message || '';
      const serverMsg = raw.includes(':') ? raw.split(':').slice(1).join(':').trim() : raw;
      let displayMsg = "يرجى المحاولة مرة أخرى";
      let errorCode = "";
      
      try {
        const parsed = JSON.parse(serverMsg);
        displayMsg = parsed.error || parsed.message || displayMsg;
        errorCode = parsed.code || "";
      } catch {
        if (serverMsg) displayMsg = serverMsg;
      }
      
      if (errorCode === "APP_CLOSED") {
        setAppClosedMessage(displayMsg);
        setShowAppClosedOverlay(true);
        return;
      }
      
      toast({ title: "خطأ في تأكيد الطلب", description: displayMsg, variant: "destructive" });
    },
  });

  const handlePlaceOrder = () => {
    if (!canPlaceOrder) {
      if (!appStatus.isOpen) {
        setAppClosedMessage(appStatus.message);
        setShowAppClosedOverlay(true);
      } else {
        toast({
          title: "المطعم مغلق",
          description: restaurantStatus?.message || 'المطعم مغلق حالياً، يرجى تجربة مطعم آخر أو المحاولة لاحقاً',
          variant: "destructive",
        });
      }
      return;
    }

    if (!orderForm.customerName || !orderForm.customerPhone || !orderForm.deliveryAddress) {
      toast({ title: "معلومات ناقصة", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    if (items.length === 0) {
      toast({ title: "السلة فارغة", description: "أضف بعض العناصر قبل تأكيد الطلب", variant: "destructive" });
      return;
    }

    const orderData: any = {
      orderNumber: `ORD${Date.now()}`,
      customerName: orderForm.customerName,
      // استخدم رقم هاتف الحساب المسجّل عند توفره لضمان تطابق المُعرّف مع الإشعارات والتتبع
      customerPhone: (user?.phone || orderForm.customerPhone).trim(),
      customerEmail: orderForm.customerEmail || undefined,
      // تمرير معرّف الحساب لربط الطلب والإشعارات بحساب العميل المسجّل
      customerId: user?.id || undefined,
      deliveryAddress: orderForm.deliveryAddress,
      notes: orderForm.notes || undefined,
      paymentMethod: orderForm.paymentMethod,
      items: JSON.stringify(items),
      subtotal: subtotal.toString(),
      deliveryFee: deliveryFee.toString(),
      total: finalTotal.toString(),
      totalAmount: finalTotal.toString(),
      restaurantId: items[0]?.restaurantId || undefined,
      customerLocationLat: userLocation.position?.coords.latitude
        ? parseFloat(userLocation.position.coords.latitude.toFixed(8)).toString()
        : undefined,
      customerLocationLng: userLocation.position?.coords.longitude
        ? parseFloat(userLocation.position.coords.longitude.toFixed(8)).toString()
        : undefined,
      status: 'pending',
      // خصم العرض التلقائي
      appliedOfferId: appliedOfferDiscount.offer?.id || undefined,
      offerDiscountAmount: appliedOfferDiscount.amount > 0 ? appliedOfferDiscount.amount.toString() : undefined,
    };

    // حفظ رقم الهاتف لاسترجاع الطلبات لاحقاً (للزوار وللعملاء معاً)
    if (orderData.customerPhone) {
      try { localStorage.setItem('customer_phone', orderData.customerPhone); } catch (_) {}
    }

    placeOrderMutation.mutate(orderData);
  };

  const parsePrice = (price: string | number): number => {
    if (typeof price === 'number') return price;
    const num = parseFloat(price);
    return isNaN(num) ? 0 : num;
  };

  return (
    <div dir="rtl">
      {/* الشريط العلوي */}
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/')} data-testid="button-cart-back">
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">{appName} - السلة</h2>
        </div>
      </header>

      <section className="p-4">
        {/* عناصر السلة */}
        <div className="space-y-4 mb-6">
          {items.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <i className="fas fa-shopping-cart text-4xl mb-4"></i>
              <p>السلة فارغة</p>
              <p className="text-sm">أضف بعض العناصر لتبدأ طلبك</p>
            </div>
          ) : (
            items.map((item) => (
              <Card key={item.id} className="p-4 flex justify-between items-center">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground" data-testid={`cart-item-name-${item.id}`}>{item.name}</h4>
                  <p className="text-sm text-muted-foreground">{item.price} ريال × {item.quantity}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => updateQuantity(item.id, item.quantity - 1)} data-testid={`button-decrease-${item.id}`}>-</Button>
                    <span className="px-3 py-1 bg-muted rounded" data-testid={`quantity-${item.id}`}>{item.quantity}</span>
                    <Button variant="outline" size="sm" onClick={() => updateQuantity(item.id, item.quantity + 1)} data-testid={`button-increase-${item.id}`}>+</Button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-primary" data-testid={`item-total-${item.id}`}>{parsePrice(item.price) * item.quantity} ريال</span>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-destructive hover:bg-destructive/10" data-testid={`button-remove-${item.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* ملخص الطلب */}
        {items.length > 0 && (
          <Card className="p-4">
            <h3 className="font-bold text-foreground mb-4">ملخص الطلب</h3>

            <div className="space-y-2 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span className="text-foreground" data-testid="order-subtotal">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">رسوم التوصيل</span>
                <div className="flex flex-col items-end">
                  {calculatingFee ? (
                    <span className="text-xs text-muted-foreground animate-pulse">جاري الحساب...</span>
                  ) : deliveryFee > 0 ? (
                    <span className="text-foreground">{formatCurrency(deliveryFee)}</span>
                  ) : userLocation.position ? (
                    <span className="text-green-600 font-bold">توصيل مجاني</span>
                  ) : (
                    <span className="text-destructive text-xs">يرجى تحديد الموقع للحساب</span>
                  )}
                </div>
              </div>

              {deliveryInfo && (
                <div className="flex flex-col gap-1 py-2 border-y border-dashed border-border my-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">المسافة المقدرة:</span>
                    <span className="text-foreground font-medium">{deliveryInfo.distance} كم</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">وقت التوصيل المتوقع:</span>
                    <span className="text-foreground font-medium">{deliveryInfo.estimatedTime}</span>
                  </div>
                </div>
              )}

              {userLocation.error && (
                <div className="bg-destructive/10 p-2 rounded text-xs text-destructive flex items-center gap-2 mt-1">
                  <i className="fas fa-exclamation-circle"></i>
                  {userLocation.error}
                </div>
              )}

              {!userLocation.position && !userLocation.isLoading && (
                <Button variant="outline" size="sm" className="w-full mt-2 text-xs h-9 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary" onClick={getCurrentLocation}>
                  <MapPin className="h-3.5 w-3.5 ml-2" />
                  تحديد موقعي الآن لحساب التوصيل تلقائياً
                </Button>
              )}

              {userLocation.isLoading && (
                <div className="text-center py-2">
                  <span className="text-xs text-muted-foreground animate-pulse italic">جاري جلب موقعك الحالي...</span>
                </div>
              )}

              {/* صندوق الكوبون - يُظهر أو يُخفى حسب الإعداد */}
              {showCouponBox && (
                <div className="border-t border-border pt-3 mt-2">
                  {couponData ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2.5 mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-sm font-semibold text-green-700">{couponData.nameAr || couponCode}</p>
                          <p className="text-xs text-green-600">خصم {formatCurrency(couponDiscount)}</p>
                        </div>
                      </div>
                      <button onClick={handleRemoveCoupon} className="text-red-400 hover:text-red-600">
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 mb-2">
                      <div className="flex gap-2">
                        <Input
                          value={couponCode}
                          onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                          placeholder="أدخل كود الخصم"
                          className="font-mono text-sm h-9"
                          onKeyDown={(e) => e.key === 'Enter' && handleValidateCoupon()}
                          dir="ltr"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleValidateCoupon}
                          disabled={couponLoading || !couponCode.trim()}
                          className="h-9 gap-1.5 border-orange-300 text-orange-600 hover:bg-orange-50"
                        >
                          {couponLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag className="h-3.5 w-3.5" />}
                          تطبيق
                        </Button>
                      </div>
                      {couponError && <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="h-3 w-3" />{couponError}</p>}
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 mb-1">
                      <span>خصم الكوبون</span>
                      <span>- {formatCurrency(couponDiscount)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* خصم العرض التلقائي */}
              {appliedOfferDiscount.amount > 0 && appliedOfferDiscount.offer && (
                <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg p-2.5 my-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎁</span>
                    <div>
                      <p className="text-sm font-semibold text-orange-700">{appliedOfferDiscount.offer.title}</p>
                      <p className="text-xs text-orange-600">
                        خصم تلقائي {appliedOfferDiscount.offer.discountPercent ? `${appliedOfferDiscount.offer.discountPercent}%` : `${formatCurrency(appliedOfferDiscount.offer.discountAmount)}`}
                        {appliedOfferDiscount.offer.discountScope === 'section' ? ' على القسم المحدد' : ' على كامل الطلب'}
                      </p>
                    </div>
                  </div>
                  <span className="text-orange-700 font-bold text-sm">- {formatCurrency(appliedOfferDiscount.amount)}</span>
                </div>
              )}

              <div className="flex justify-between font-bold border-t pt-2 mt-2">
                <span className="text-foreground">الإجمالي</span>
                <span className="text-orange-500 text-lg" data-testid="order-total">{formatCurrency(finalTotal)}</span>
              </div>
            </div>

            {/* نموذج الطلب */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="customerName" className="text-foreground">الاسم *</Label>
                <Input
                  id="customerName"
                  value={orderForm.customerName}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="أدخل اسمك"
                  data-testid="input-customer-name"
                />
              </div>

              <div>
                <Label htmlFor="customerPhone" className="text-foreground">رقم الهاتف *</Label>
                <Input
                  id="customerPhone"
                  value={orderForm.customerPhone}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                  placeholder="أدخل رقم هاتفك"
                  data-testid="input-customer-phone"
                />
              </div>

              <div>
                <Label htmlFor="customerEmail" className="text-foreground">البريد الإلكتروني</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={orderForm.customerEmail}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                  placeholder="أدخل بريدك الإلكتروني (اختياري)"
                  data-testid="input-customer-email"
                />
              </div>

              <div>
                <Label htmlFor="deliveryAddress" className="text-foreground">عنوان التوصيل *</Label>
                <Input
                  id="deliveryAddress"
                  value={orderForm.deliveryAddress}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  placeholder="أدخل عنوانك بالتفصيل"
                  data-testid="input-delivery-address"
                />
              </div>

              <div>
                <Label htmlFor="notes" className="text-foreground">ملاحظات الطلب</Label>
                <Textarea
                  id="notes"
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="ملاحظات إضافية (اختياري)"
                  className="h-20 resize-none"
                  data-testid="input-notes"
                />
              </div>

              {/* طرق الدفع - ديناميكية حسب الإعدادات */}
              {availablePaymentMethods.length > 0 && (
                <div>
                  <Label className="text-foreground">طريقة الدفع</Label>
                  <RadioGroup
                    value={orderForm.paymentMethod}
                    onValueChange={(value) => setOrderForm(prev => ({ ...prev, paymentMethod: value }))}
                    className="grid grid-cols-2 gap-2 mt-2"
                  >
                    {availablePaymentMethods.map((method) => (
                      <div
                        key={method.value}
                        className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${
                          orderForm.paymentMethod === method.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border'
                        }`}
                      >
                        <RadioGroupItem value={method.value} id={method.value} className="sr-only" />
                        <Label htmlFor={method.value} className="flex flex-col items-center gap-2 cursor-pointer w-full h-full">
                          <span className="text-2xl">{method.icon}</span>
                          <span className="text-[10px] font-black text-center">{method.label}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            </div>

            {/* رسالة الإغلاق */}
            {!canPlaceOrder && (
              <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-700 text-sm">
                    {!appStatus.isOpen ? 'التطبيق مغلق حالياً' : 'المتجر مغلق حالياً'}
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {!appStatus.isOpen ? appStatus.message : restaurantStatus?.message}
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    أوقات العمل: {appStatus.openingTime} - {appStatus.closingTime}
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={handlePlaceOrder}
              disabled={placeOrderMutation.isPending || calculatingFee}
              className="w-full mt-6 py-4 text-lg font-bold"
              data-testid="button-place-order"
            >
              {placeOrderMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <i className="fas fa-spinner fa-spin"></i> جاري تأكيد الطلب...
                </span>
              ) : calculatingFee ? (
                'جاري حساب رسوم التوصيل...'
              ) : (
                checkoutButtonText
              )}
            </Button>

            {checkoutNote && (
              <p className="text-center text-xs text-muted-foreground mt-2">{checkoutNote}</p>
            )}
          </Card>
        )}
      </section>

      {/* المنبثقات */}
      {showAppClosedOverlay && (
        <AppClosedOverlay
          openingTime={getSetting('opening_time', '08:00')}
          closingTime={getSetting('closing_time', '23:00')}
          message={appClosedMessage}
          scheduledOrdersEnabled={scheduledOrdersEnabled}
          onClose={() => setShowAppClosedOverlay(false)}
          onScheduleOrder={scheduledOrdersEnabled ? (date, time) => {
            setScheduledData({ date, time });
            setShowAppClosedOverlay(false);
            setShowScheduledDialog(true);
          } : undefined}
        />
      )}

      {showScheduledDialog && scheduledData && (
        <ScheduledOrderDialog
          open={showScheduledDialog}
          onClose={() => setShowScheduledDialog(false)}
          onConfirm={(data: any) => {
            // تنفيذ الطلب المجدول
            const orderData: any = {
              orderNumber: `ORD${Date.now()}`,
              customerName: orderForm.customerName,
              customerPhone: orderForm.customerPhone,
              customerEmail: orderForm.customerEmail || undefined,
              deliveryAddress: orderForm.deliveryAddress,
              notes: orderForm.notes || undefined,
              paymentMethod: orderForm.paymentMethod,
              items: JSON.stringify(items),
              subtotal: subtotal.toString(),
              deliveryFee: deliveryFee.toString(),
              total: finalTotal.toString(),
              totalAmount: finalTotal.toString(),
              restaurantId: items[0]?.restaurantId || undefined,
              customerLocationLat: userLocation.position?.coords.latitude
                ? parseFloat(userLocation.position.coords.latitude.toFixed(8)).toString()
                : undefined,
              customerLocationLng: userLocation.position?.coords.longitude
                ? parseFloat(userLocation.position.coords.longitude.toFixed(8)).toString()
                : undefined,
              status: 'scheduled',
              deliveryPreference: 'scheduled',
              appliedOfferId: appliedOfferDiscount.offer?.id || undefined,
              offerDiscountAmount: appliedOfferDiscount.amount > 0 ? appliedOfferDiscount.amount.toString() : undefined,
              scheduledDate: data.date,
              scheduledTimeSlot: data.timeSlot || data.time,
              isScheduled: true,
              scheduledDateTime: new Date(`${data.date}T${data.time || '00:00'}`)
            };
            placeOrderMutation.mutate(orderData);
            setShowScheduledDialog(false);
          }}
          initialDate={scheduledData.date}
          initialTime={scheduledData.time}
        />
      )}
    </div>
  );
}
