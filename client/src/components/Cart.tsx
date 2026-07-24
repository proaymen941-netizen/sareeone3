import { useState, useEffect, useMemo } from 'react';
import { Minus, Plus, Trash2, ShoppingBag, X, MapPin, Loader2, Calendar, Clock, AlertTriangle, Tag, CheckCircle } from 'lucide-react'; 
import { useCart } from '../context/CartContext';
import { useUserLocation as useGeoLocation } from '../context/LocationContext';
import { GoogleMapsLocationPicker, LocationData } from './GoogleMapsLocationPicker';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Cart({ isOpen, onClose }: CartProps) {
  const { state, updateQuantity, removeItem, addNotes, clearCart, setDeliveryFee: setContextDeliveryFee } = useCart();
  const { location: userGeoLocation, getCurrentLocation } = useGeoLocation();
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0); 
  const [deliveryDetails, setDeliveryDetails] = useState<any>(null);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    notes: '',
    paymentMethod: 'cash'
  });

  // نظام الطلب المؤجل
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDialogTitle, setScheduleDialogTitle] = useState('');
  const [scheduleDialogMessage, setScheduleDialogMessage] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [customScheduleMode, setCustomScheduleMode] = useState(false);

  // حالة تأكيد الإرسال المكرر
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);

  // ─── نظام الكوبون ───────────────────────────────────────────────────
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<{
    valid: boolean;
    discount?: number;
    message?: string;
    couponId?: string;
  } | null>(null);
  const [isCouponValidating, setIsCouponValidating] = useState(false);

  // إعادة تعيين الكوبون عند تغيير محتوى السلة
  useEffect(() => {
    setCouponResult(null);
    setCouponCode('');
  }, [state.restaurantId]);

  const getScheduleSlots = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    const dateLabel = tomorrow.toLocaleDateString('ar-SA', { weekday: 'long', month: 'long', day: 'numeric' });
    return [
      { label: `${dateLabel} - 9:00 صباحاً`, date: dateStr, time: '09:00', display: `الغد 9:00 صباحاً` },
      { label: `${dateLabel} - 10:00 صباحاً`, date: dateStr, time: '10:00', display: `الغد 10:00 صباحاً` },
      { label: `${dateLabel} - 12:00 ظهراً`, date: dateStr, time: '12:00', display: `الغد 12:00 ظهراً` },
      { label: `${dateLabel} - 3:00 مساءً`, date: dateStr, time: '15:00', display: `الغد 3:00 مساءً` },
    ];
  };

  // طلب الموقع تلقائياً عند فتح السلة
  useEffect(() => {
    if (isOpen && !userGeoLocation.position && !userGeoLocation.isLoading && !userGeoLocation.error) {
      getCurrentLocation();
    }
  }, [isOpen, userGeoLocation.position, userGeoLocation.isLoading]);

  // استخدام موقع GPS كافتراضي
  useEffect(() => {
    if (userGeoLocation.position && !selectedLocation && isOpen) {
      const { latitude, longitude } = userGeoLocation.position.coords;
      setSelectedLocation({
        lat: latitude,
        lng: longitude,
        address: 'موقعي الحالي (GPS)',
        area: 'تحديد تلقائي'
      });
    }
  }, [userGeoLocation.position, selectedLocation, isOpen]);

  // إعدادات الواجهة
  const { data: uiSettings } = useQuery<any[]>({
    queryKey: ['/api/ui-settings'],
  });

  const getSetting = (key: string, def = '') => 
    uiSettings?.find((s: any) => s.key === key)?.value || def;

  // طرق الدفع من الإدمن (ديناميكية)
  const { data: adminPaymentMethods = [] } = useQuery<any[]>({
    queryKey: ['/api/payment-methods'],
  });

  const showCashPayment = getSetting('show_cash_payment', 'true') !== 'false';
  const showPaymentCards = getSetting('show_payment_cards', 'true') !== 'false';
  const showBankTransfer = getSetting('show_bank_transfer', 'false') === 'true';
  const scheduledOrdersEnabled = getSetting('enable_scheduled_orders', 'false') === 'true';
  const showCouponBoxAlways = getSetting('show_coupon_box_always', 'true') !== 'false';
  const couponMinOrderValue = parseFloat(getSetting('coupon_min_order_value', '0') || '0');
  const showCouponBox = showCouponBoxAlways || (couponMinOrderValue > 0 && state.subtotal >= couponMinOrderValue);

  const paymentMethods = useMemo(() => {
    const methods: { id: string; name: string; icon: string }[] = [];
    if (showCashPayment) {
      methods.push({ id: 'cash', name: 'نقداً عند الاستلام', icon: '💵' });
    }
    if (showPaymentCards) {
      if ((adminPaymentMethods as any[]).length > 0) {
        const iconMap: Record<string, string> = {
          mada: '🏦', stc_pay: '📱', apple_pay: '🍎',
          visa: '💳', mastercard: '💳', tabby: '📊',
          tamara: '📈', wallet: '👛', online: '🌐', card: '💳',
        };
        (adminPaymentMethods as any[])
          .filter((m: any) => m.isActive && m.type !== 'cash' && m.type !== 'bank_transfer')
          .forEach((m: any) => {
            methods.push({
              id: m.provider || m.type,
              name: m.name || m.provider,
              icon: iconMap[m.provider] || '💳',
            });
          });
      } else {
        methods.push({ id: 'card', name: 'بطاقة دفع', icon: '💳' });
        methods.push({ id: 'wallet', name: 'المحفظة', icon: '👛' });
        methods.push({ id: 'online', name: 'دفع إلكتروني', icon: '🌐' });
      }
    }
    if (showBankTransfer) {
      methods.push({ id: 'bank_transfer', name: 'تحويل بنكي', icon: '🏛️' });
    }
    return methods.length > 0
      ? methods
      : [{ id: 'cash', name: 'نقداً عند الاستلام', icon: '💵' }];
  }, [adminPaymentMethods, showCashPayment, showPaymentCards, showBankTransfer, uiSettings]);

  const openingTime = getSetting('opening_time', '08:00');
  const closingTime = getSetting('closing_time', '23:00');
  const storeStatus = getSetting('store_status', 'open');

  const { data: appStatus } = useQuery({
    queryKey: ['/api/app-status', openingTime, closingTime, storeStatus],
    queryFn: async () => {
      const res = await fetch(`/api/app-status?opening=${openingTime}&closing=${closingTime}&status=${storeStatus}`);
      return res.json();
    },
    enabled: !!uiSettings
  });

  // التحقق من حالة التطبيق عند فتح السلة - يعرض نافذة الجدولة إذا كان التطبيق مغلقاً والجدولة مفعّلة
  useEffect(() => {
    if (isOpen && appStatus && !appStatus.isOpen && !showScheduleDialog && scheduledOrdersEnabled) {
      setScheduleDialogTitle('التطبيق مغلق حالياً');
      setScheduleDialogMessage(appStatus.message || `التطبيق مغلق حالياً. يفتح في تمام الساعة ${openingTime}. هل تريد جدولة طلبك لوقت الافتتاح؟`);
      setShowScheduleDialog(true);
    }
  }, [isOpen, appStatus, scheduledOrdersEnabled]);

  // بيانات المطعم لموقعه
  const { data: restaurant } = useQuery({
    queryKey: [`/api/restaurants/${state.restaurantId}`],
    enabled: !!state.restaurantId,
  });

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchDeliveryFee = async () => {
      if (!selectedLocation?.lat || !selectedLocation?.lng || !state.restaurantId) {
        return;
      }

      setIsCalculatingFee(true);
      try {
        const response = await fetch('/api/delivery-fees/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerLat: selectedLocation.lat,
            customerLng: selectedLocation.lng,
            restaurantId: state.restaurantId,
            orderSubtotal: state.subtotal || 0
          }),
          signal: abortController.signal
        });
        
        if (!response.ok) throw new Error('فشل في حساب رسوم التوصيل');
        
        const data = await response.json();
        if (isMounted && data.success) {
          setDeliveryFee(data.fee);
          setDeliveryDetails(data);
          setContextDeliveryFee(data.fee);
        }
      } catch (error: any) {
        if (isMounted && error.name !== 'AbortError') {
          console.error('Failed to calculate delivery fee:', error);
        }
      } finally {
        if (isMounted) {
          setIsCalculatingFee(false);
        }
      }
    };

    fetchDeliveryFee();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [selectedLocation?.lat, selectedLocation?.lng, state.restaurantId, state.subtotal]);

  const getRestaurantLocation = () => {
    const r = restaurant as any;
    if (r && r.latitude && r.longitude) {
      return { 
        lat: parseFloat(r.latitude), 
        lng: parseFloat(r.longitude) 
      };
    }
    return undefined;
  };

  // ─── التحقق من الكوبون ──────────────────────────────────────────────
  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsCouponValidating(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          orderValue: state.subtotal,
        }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponResult({ valid: true, discount: data.discount || 0, couponId: data.coupon?.id });
      } else {
        setCouponResult({ valid: false, message: data.message || 'كود الكوبون غير صحيح' });
      }
    } catch {
      setCouponResult({ valid: false, message: 'تعذر التحقق من الكوبون، حاول مرة أخرى' });
    } finally {
      setIsCouponValidating(false);
    }
  };

  const appliedDiscount = couponResult?.valid ? couponResult.discount || 0 : 0;

  if (!isOpen) return null;

  const saveCustomerInfoToProfile = async () => {
    // حفظ الاسم ورقم الهاتف محلياً ليتمكن العميل من رؤية طلباته في صفحة "طلباتي"
    try {
      if (customerInfo.phone) {
        localStorage.setItem('customer_phone', customerInfo.phone.trim().replace(/\s+/g, ''));
      }
      if (customerInfo.name) {
        localStorage.setItem('customer_name', customerInfo.name);
      }
    } catch (e) {
      console.error('Failed to persist customer info locally:', e);
    }
  };

  const buildOrderData = (scheduled?: { date: string; time: string }) => ({
    customerName: customerInfo.name,
    customerPhone: customerInfo.phone,
    deliveryAddress: selectedLocation?.address || '',
    customerLocationLat: selectedLocation?.lat,
    customerLocationLng: selectedLocation?.lng,
    notes: [
      customerInfo.notes,
      couponResult?.valid && couponCode ? `كوبون: ${couponCode} (خصم: ${appliedDiscount})` : ''
    ].filter(Boolean).join(' | ') || undefined,
    paymentMethod: customerInfo.paymentMethod,
    items: JSON.stringify(state.items),
    subtotal: state.subtotal,
    deliveryFee: deliveryFee,
    totalAmount: Math.max(0, state.subtotal + deliveryFee - appliedDiscount),
    total: Math.max(0, state.subtotal + deliveryFee - appliedDiscount),
    restaurantId: state.restaurantId,
    // حقول الكوبون (تُرسل للخادم لتسجيل الاستخدام)
    couponCode: couponResult?.valid ? couponCode.trim().toUpperCase() : undefined,
    couponDiscount: appliedDiscount > 0 ? appliedDiscount : undefined,
    deliveryPreference: scheduled ? 'scheduled' : 'now',
    scheduledDate: scheduled?.date || null,
    scheduledTimeSlot: scheduled?.time || null,
  });

  // التحقق من توفر السائقين قبل الإرسال
  const checkAvailableDrivers = async (): Promise<number> => {
    try {
      const res = await fetch('/api/drivers');
      if (!res.ok) return 0;
      const data = await res.json();
      return Array.isArray(data) ? data.filter((d: any) => d.isAvailable && d.isActive !== false).length : 0;
    } catch {
      return 0;
    }
  };

  const submitOrder = async (orderData: any): Promise<{ success: boolean; data: any; error?: string }> => {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    const data = await response.json();
    if (response.ok) {
      return { success: true, data };
    }
    return { success: false, data, error: data.error || data.message || 'فشل في إرسال الطلب' };
  };

  const handleCheckout = async () => {
    // منع النقر المكرر أثناء الإرسال
    if (isSubmitting) {
      setShowDuplicateConfirm(true);
      return;
    }

    if (!selectedLocation) {
      toast({
        title: "موقع التوصيل مطلوب",
        description: "يرجى تحديد موقع التوصيل من الخريطة",
        variant: "destructive",
      });
      return;
    }

    if (!customerInfo.name || !customerInfo.phone) {
      toast({
        title: "معلومات ناقصة",
        description: "يرجى إدخال الاسم ورقم الهاتف",
        variant: "destructive",
      });
      return;
    }

    const minimumOrderEnabled = getSetting('minimum_order_enabled', 'false') === 'true';
    const minimumOrderDefault = parseFloat(getSetting('minimum_order_default', '0') || '0');

    if (minimumOrderEnabled && minimumOrderDefault > 0 && state.subtotal < minimumOrderDefault) {
      toast({
        title: "لم يتم استيفاء الحد الأدنى للطلب",
        description: `الحد الأدنى للطلب هو ${minimumOrderDefault} ريال. أضف منتجات بقيمة ${(minimumOrderDefault - state.subtotal).toFixed(2)} ريال للمتابعة.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // فحص توفر السائقين
      const availableDrivers = await checkAvailableDrivers();
      
      if (availableDrivers === 0) {
        // لا يوجد سائقون متاحون - عرض خيار الجدولة
        const orderData = buildOrderData();
        setPendingOrderData(orderData);
        setScheduleDialogTitle('لا يوجد سائقون متاحون');
        setScheduleDialogMessage('لا يوجد سائقون متاحون حالياً. هل تريد جدولة طلبك لوقت لاحق؟');
        setShowScheduleDialog(true);
        setIsSubmitting(false);
        return;
      }

      // إرسال الطلب
      const orderData = buildOrderData();
      const result = await submitOrder(orderData);

      if (result.success) {
        await saveCustomerInfoToProfile();
        toast({
          title: "تم تأكيد طلبك بنجاح! 🎉",
          description: `رقم الطلب: ${result.data.order?.orderNumber || result.data.orderNumber}`,
        });
        clearCart();
        onClose();
      } else {
        const errorMsg = result.error || 'فشل في إرسال الطلب';
        const isClosedError = errorMsg.includes('مغلق') || errorMsg.includes('closed');
        if (isClosedError) {
          setPendingOrderData(buildOrderData());
          setScheduleDialogTitle('التطبيق مغلق');
          setScheduleDialogMessage(errorMsg);
          setShowScheduleDialog(true);
        } else {
          throw new Error(errorMsg);
        }
      }
    } catch (error: any) {
      console.error('Order error:', error);
      toast({
        title: "خطأ في إرسال الطلب",
        description: error.message || "يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // إرسال الطلب مرة أخرى بعد التأكيد
  const handleConfirmResend = async () => {
    setShowDuplicateConfirm(false);
    if (!customerInfo.name || !customerInfo.phone || !selectedLocation) return;

    setIsSubmitting(true);
    try {
      const orderData = buildOrderData();
      const result = await submitOrder(orderData);
      if (result.success) {
        await saveCustomerInfoToProfile();
        toast({
          title: "تم تأكيد طلبك بنجاح! 🎉",
          description: `رقم الطلب: ${result.data.order?.orderNumber || result.data.orderNumber}`,
        });
        clearCart();
        onClose();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "خطأ في إرسال الطلب",
        description: error.message || "يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitScheduled = async (date: string, time: string) => {
    if (!customerInfo.name || !customerInfo.phone || !selectedLocation) {
      toast({ title: "بيانات ناقصة", description: "يرجى إكمال البيانات", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    setShowScheduleDialog(false);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildOrderData({ date, time })),
      });
      const data = await response.json();
      if (response.ok) {
        await saveCustomerInfoToProfile();
        const timeLabel = time.replace('09:00', '9:00 صباحاً').replace('10:00', '10:00 صباحاً')
          .replace('12:00', '12:00 ظهراً').replace('15:00', '3:00 مساءً');
        toast({
          title: "تم جدولة طلبك! 📅",
          description: `سيتم توصيل طلبك رقم ${data.order?.orderNumber || data.orderNumber} في ${timeLabel}`,
        });
        clearCart();
        onClose();
      } else {
        throw new Error(data.error || 'فشل في إرسال الطلب المؤجل');
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      setShowScheduleDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // إرسال فوري (تجاهل تحذير السائقين)
  const handleOrderNow = async () => {
    setShowScheduleDialog(false);
    if (!customerInfo.name || !customerInfo.phone || !selectedLocation) return;
    setIsSubmitting(true);
    try {
      const orderData = buildOrderData();
      const result = await submitOrder(orderData);
      if (result.success) {
        await saveCustomerInfoToProfile();
        toast({
          title: "تم استلام طلبك! 🎉",
          description: `رقم الطلب: ${result.data.order?.orderNumber || result.data.orderNumber} - سيتم تعيين سائق قريباً`,
        });
        clearCart();
        onClose();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-end">
      <div className="bg-white w-full max-w-md h-5/6 rounded-t-xl flex flex-col">
        {/* رأس السلة */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="text-xl font-black tracking-tighter">
              <span className="text-[#ec3714]">الس</span><span className="text-[#d32f2f]">ريع</span>
            </div>
            <h2 className="text-lg font-bold"> - السلة</h2>
            {state.items.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {state.items.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* المحتوى */}
        <div className="flex-1 overflow-y-auto">
          {state.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <ShoppingBag size={64} className="mb-4 opacity-50" />
              <p>سلة التسوق فارغة</p>
              <p className="text-sm">أضف عناصر من المطاعم لتبدأ طلبك</p>
            </div>
          ) : (userGeoLocation.isLoading || isCalculatingFee) && !selectedLocation ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
              <Loader2 size={48} className="animate-spin text-primary" />
              <div className="text-center">
                <p className="font-bold text-gray-800">جاري حساب رسوم التوصيل...</p>
                <p className="text-xs">يرجى الانتظار قليلاً لنتمكن من تحديد موقعك</p>
              </div>
            </div>
          ) : (
            <>
              {/* اسم المطعم */}
              {state.restaurantName && (
                <div className="p-4 bg-gray-50 border-b">
                  <h3 className="font-medium text-gray-800">من {state.restaurantName}</h3>
                </div>
              )}

              {/* عناصر السلة */}
              <div className="p-4 space-y-4">
                {state.items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        <p className="text-red-500 font-medium">{formatCurrency(item.price)}</p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* التحكم في الكمية */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 border rounded hover:bg-gray-50"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="px-3 py-1 bg-gray-100 rounded">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 border rounded hover:bg-gray-50"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(parseFloat(item.price) * item.quantity)}
                      </span>
                    </div>

                    <textarea
                      placeholder="ملاحظات خاصة بهذا العنصر"
                      value={item.notes || ''}
                      onChange={(e) => addNotes(item.id, e.target.value)}
                      className="w-full mt-2 p-2 border rounded text-sm resize-none"
                      rows={2}
                    />
                  </div>
                ))}
              </div>

              {/* قسم الدفع */}
              {!showCheckout ? (
                <div className="p-4 border-t">
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span>المجموع الفرعي:</span>
                      <span>{formatCurrency(state.subtotal)}</span>
                    </div>
                    <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 font-bold">رسوم التوصيل</span>
                        <div className="text-left">
                          {!selectedLocation ? (
                            <span className="text-xs text-amber-600 font-black animate-pulse bg-amber-50 px-2 py-0.5 rounded">جاري تحديد الموقع...</span>
                          ) : isCalculatingFee ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary inline" />
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className={`text-sm font-black ${deliveryDetails?.isFreeDelivery ? "line-through text-gray-400" : "text-gray-900"}`}>
                                {formatCurrency(deliveryFee)}
                              </span>
                              {deliveryDetails?.isFreeDelivery && (
                                <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-black">مجاني</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {selectedLocation && deliveryDetails && !isCalculatingFee && (
                        <div className="grid grid-cols-2 gap-2 mt-1 pt-2 border-t border-gray-200/50">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-primary" />
                            <span className="text-[10px] text-gray-500 font-bold">المسافة: {deliveryDetails.distance.toFixed(1)} كم</span>
                          </div>
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-[10px] text-gray-500 font-bold">⏱ {deliveryDetails.estimatedTime}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>المجموع الكلي:</span>
                      <span className="text-red-500">
                        {formatCurrency(selectedLocation ? state.subtotal + deliveryFee : state.subtotal)}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => setShowCheckout(true)}
                    disabled={!selectedLocation || isCalculatingFee}
                    className="w-full bg-red-600 text-white py-6 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {!selectedLocation ? (
                      <>
                        <MapPin size={20} />
                        حدد الموقع للمتابعة
                      </>
                    ) : isCalculatingFee ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        جاري حساب التوصيل...
                      </>
                    ) : (
                      'إتمام الطلب'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="p-4 border-t space-y-4">
                  {/* معلومات العميل */}
                  <div>
                    <h3 className="font-medium mb-2">معلومات العميل</h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="الاسم *"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                        className="w-full p-3 border rounded-lg"
                      />
                      <input
                        type="tel"
                        placeholder="رقم الهاتف *"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                        className="w-full p-3 border rounded-lg"
                      />
                      <textarea
                        placeholder="ملاحظات إضافية"
                        value={customerInfo.notes}
                        onChange={(e) => setCustomerInfo({...customerInfo, notes: e.target.value})}
                        className="w-full p-3 border rounded-lg resize-none"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* تحديد الموقع */}
                  <div>
                    <h3 className="font-medium mb-2">موقع التوصيل *</h3>
                    {selectedLocation ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-green-800">{selectedLocation.area}</p>
                            <p className="text-sm text-green-600">{selectedLocation.address}</p>
                            {deliveryDetails && (
                              <div className="mt-1 space-y-0.5">
                                {deliveryDetails.distance > 0 && (
                                  <p className="text-xs text-green-600">
                                    المسافة: {deliveryDetails.distance.toFixed(2)} كم
                                  </p>
                                )}
                                {deliveryDetails.estimatedTime && (
                                  <p className="text-xs text-green-600 font-medium">
                                    الوقت المتوقع: {deliveryDetails.estimatedTime}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowLocationPicker(true)}
                          >
                            تغيير
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowLocationPicker(true)}
                        data-testid="button-select-location"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        تحديد موقع التوصيل
                      </Button>
                    )}
                  </div>

                  {/* طرق الدفع - ديناميكية من لوحة التحكم */}
                  {paymentMethods.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2 text-sm">طريقة الدفع *</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {paymentMethods.map((method) => (
                          <button
                            key={method.id}
                            onClick={() => setCustomerInfo({...customerInfo, paymentMethod: method.id})}
                            className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${
                              customerInfo.paymentMethod === method.id 
                                ? 'border-red-500 bg-red-50 text-red-700 shadow-sm' 
                                : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <span className="text-xl">{method.icon}</span>
                            <span className="text-[10px] font-black">{method.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* كوبون الخصم - يظهر حسب إعدادات لوحة التحكم */}
                  {showCouponBox && (
                    <div className="border rounded-xl p-3 bg-gray-50 space-y-2">
                      <h3 className="font-medium text-sm flex items-center gap-1.5">
                        <Tag className="h-4 w-4 text-orange-500" />
                        كود الخصم
                      </h3>
                      {couponResult?.valid ? (
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="text-sm font-bold text-green-700">{couponCode}</p>
                              <p className="text-xs text-green-600">وفّرت {formatCurrency(couponResult.discount || 0)}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => { setCouponCode(''); setCouponResult(null); }}
                            className="text-red-400 hover:text-red-600 text-xs font-bold"
                          >
                            إزالة
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={couponCode}
                              onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                              placeholder="أدخل كود الخصم"
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-orange-400"
                              dir="ltr"
                              onKeyDown={(e) => e.key === 'Enter' && handleValidateCoupon()}
                            />
                            <button
                              onClick={handleValidateCoupon}
                              disabled={isCouponValidating || !couponCode.trim()}
                              className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 disabled:opacity-50 flex items-center gap-1"
                            >
                              {isCouponValidating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'تطبيق'}
                            </button>
                          </div>
                          {couponResult && !couponResult.valid && (
                            <p className="text-xs text-red-500">{couponResult.message}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* إجمالي مع الخصم */}
                  {couponResult?.valid && (couponResult.discount || 0) > 0 && (
                    <div className="border-t pt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">المجموع</span>
                        <span>{formatCurrency(state.subtotal + deliveryFee)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600 font-bold">
                        <span>خصم الكوبون</span>
                        <span>- {formatCurrency(couponResult.discount || 0)}</span>
                      </div>
                      <div className="flex justify-between font-black text-base">
                        <span>الإجمالي</span>
                        <span className="text-red-600">{formatCurrency(Math.max(0, state.subtotal + deliveryFee - (couponResult.discount || 0)))}</span>
                      </div>
                    </div>
                  )}

                  {/* أزرار الإجراء */}
                  <div className="flex flex-col gap-3 pt-4 border-t mt-4">
                    <Button
                      onClick={handleCheckout}
                      disabled={isSubmitting}
                      className="w-full bg-red-600 text-white py-7 rounded-2xl font-black text-lg hover:bg-red-700 transition-all shadow-xl flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin" size={24} />
                          جاري إرسال الطلب...
                        </>
                      ) : (
                        'تأكيد الطلب بنجاح'
                      )}
                    </Button>
                    <button
                      onClick={() => setShowCheckout(false)}
                      disabled={isSubmitting}
                      className="w-full py-3 text-gray-500 font-bold hover:text-gray-700 transition-colors text-sm disabled:opacity-50"
                    >
                      رجوع لتعديل السلة
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* نافذة تحديد الموقع */}
      <GoogleMapsLocationPicker
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationSelect={setSelectedLocation}
        restaurantLocation={getRestaurantLocation()}
      />

      {/* نافذة تأكيد الإرسال المكرر */}
      {showDuplicateConfirm && (
        <div className="fixed inset-0 bg-black/70 z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-amber-500 px-5 py-4 text-white">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-black text-lg">تنبيه</h3>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-gray-700 font-bold text-base mb-1">
                الطلب قيد الإرسال حالياً
              </p>
              <p className="text-gray-500 text-sm mb-5">
                يبدو أن طلبك قد تم استلامه. هل أنت متأكد أنك تريد إرسال الطلب مرة أخرى؟
              </p>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleConfirmResend}
                >
                  نعم، إرسال مجدداً
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDuplicateConfirm(false)}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة الطلب المؤجل / لا يوجد سائقون */}
      {showScheduleDialog && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-red-700 px-5 py-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-5 w-5" />
                <h3 className="font-black text-lg">{scheduleDialogTitle}</h3>
              </div>
              <p className="text-white/80 text-sm">{scheduleDialogMessage}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-gray-700 font-bold text-sm mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                هل تريد جدولة طلبك لوقت لاحق؟
              </p>

              {!customScheduleMode ? (
                <div className="space-y-2">
                  {getScheduleSlots().map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => handleSubmitScheduled(slot.date, slot.time)}
                      disabled={isSubmitting}
                      className="w-full text-right px-4 py-3 rounded-xl border-2 border-gray-100 hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-between group"
                    >
                      <span className="font-bold text-sm text-gray-800 group-hover:text-primary">{slot.display}</span>
                      <Clock className="h-4 w-4 text-gray-400 group-hover:text-primary" />
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setScheduledDate(tomorrow.toISOString().split('T')[0]);
                      setScheduledTime('09:00');
                      setCustomScheduleMode(true);
                    }}
                    className="w-full text-right px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary/50 transition-all text-sm text-gray-500 hover:text-primary"
                  >
                    اختيار وقت آخر...
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">التاريخ</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full p-3 border-2 rounded-xl text-sm focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">الوقت</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full p-3 border-2 rounded-xl text-sm focus:border-primary outline-none"
                    />
                  </div>
                  <Button
                    onClick={() => handleSubmitScheduled(scheduledDate, scheduledTime)}
                    disabled={isSubmitting || !scheduledDate || !scheduledTime}
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mx-auto" /> : 'تأكيد الجدولة'}
                  </Button>
                  <button
                    onClick={() => setCustomScheduleMode(false)}
                    className="w-full text-sm text-gray-400 hover:text-gray-600"
                  >
                    رجوع
                  </button>
                </div>
              )}

              {/* زر الطلب الفوري مع التحذير */}
              <div className="mt-3 pt-3 border-t">
                <button
                  onClick={handleOrderNow}
                  disabled={isSubmitting}
                  className="w-full text-sm text-primary font-bold hover:underline py-1"
                >
                  أو اطلب الآن وانتظر تعيين سائق
                </button>
              </div>

              <button
                onClick={() => { setShowScheduleDialog(false); setCustomScheduleMode(false); }}
                className="w-full mt-2 text-sm text-gray-400 hover:text-gray-600 py-2"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
