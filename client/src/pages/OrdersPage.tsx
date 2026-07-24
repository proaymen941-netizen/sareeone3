import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, Package, Clock, CheckCircle, XCircle, Eye, Loader, Star, Phone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import RatingDialog from '@/components/RatingDialog';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  notes?: string;
  paymentMethod: string;
  items: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  totalAmount: string;
  restaurantId: string;
  restaurantName?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  isRated?: boolean;
  status: 'pending' | 'confirmed' | 'preparing' | 'on_way' | 'delivered' | 'cancelled' | 'scheduled';
  createdAt: string;
  updatedAt: string;
  estimatedTime?: string;
  driverEarnings: string;
  customerId?: string;
  parsedItems?: OrderItem[];
  _isWasalni?: boolean;
}

interface OrderItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  restaurantId?: string;
  restaurantName?: string;
}

const CANCEL_REASONS = [
  'غيّرت رأيي',
  'طلبت بالخطأ',
  'تأخر وقت التوصيل',
  'لا يوجد سائق متاح',
  'مشكلة في الدفع',
  'سبب آخر',
];

export default function OrdersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // نافذة إلغاء الطلب
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [customCancelReason, setCustomCancelReason] = useState('');

  const customerPhone = user?.phone || localStorage.getItem('customer_phone');
  const customerId = user?.id || '';

  const { data: orders = [], isLoading, error } = useQuery<Order[]>({
    queryKey: ['orders', customerPhone, customerId],
    enabled: !!(customerPhone || customerId),
    queryFn: async () => {
      // بناء معاملات الاستعلام بشكل آمن حتى لو كان رقم الهاتف فارغاً
      const params = new URLSearchParams();
      if (customerId) params.set('customerId', customerId);
      const queryStr = params.toString() ? `?${params.toString()}` : '';

      // إذا كان رقم الهاتف فارغاً نستخدم معرّف الحساب مباشرةً كمسار بديل
      // لضمان تطابق نمط المسار /customer/:phone في Express
      const phoneSegment = customerPhone
        ? encodeURIComponent(customerPhone)
        : (customerId ? `id:${encodeURIComponent(customerId)}` : '');

      const [ordersRes, wasalniRes] = await Promise.all([
        fetch(`/api/orders/customer/${phoneSegment}${queryStr}`),
        fetch(`/api/wasalni?phone=${encodeURIComponent(customerPhone || '')}`),
      ]);
      if (!ordersRes.ok) {
        throw new Error('فشل في جلب الطلبات');
      }
      const data: Order[] = await ordersRes.json();

      const foodOrders: Order[] = data.map((order: Order) => {
        let parsedItems: OrderItem[] = [];
        try {
          parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items as any);
        } catch (e) {
          console.error('خطأ في تحليل عناصر الطلب:', e);
        }

        let restaurantName = order.restaurantName;
        if (!restaurantName && parsedItems.length > 0 && parsedItems[0].restaurantName) {
          restaurantName = parsedItems[0].restaurantName;
        } else if (!restaurantName) {
          restaurantName = 'مطعم غير معروف';
        }

        return { ...order, restaurantName, parsedItems };
      });

      // دمج طلبات وصل لي
      let wasalniOrders: Order[] = [];
      if (wasalniRes.ok) {
        try {
          const wasalniData: any[] = await wasalniRes.json();
          // الخادم يقوم بالفعل بفلترة الطلبات حسب الهاتف بطريقة مُطبَّعة
          // (إزالة المسافات + trim)، لذلك لا حاجة لفلترة صارمة هنا قد تخفي طلبات صحيحة
          wasalniOrders = (wasalniData || [])
            .map((w) => ({
              id: w.id,
              orderNumber: w.requestNumber,
              customerName: w.customerName,
              customerPhone: w.customerPhone,
              deliveryAddress: w.toAddress,
              notes: w.notes || '',
              paymentMethod: 'cash',
              items: '[]',
              subtotal: w.estimatedFee || '0',
              deliveryFee: w.estimatedFee || '0',
              total: w.estimatedFee || '0',
              totalAmount: w.estimatedFee || '0',
              restaurantId: '',
              restaurantName: `وصل لي - ${w.orderType || 'توصيل'}`,
              status: w.status,
              createdAt: w.createdAt,
              updatedAt: w.updatedAt,
              driverEarnings: '0',
              _isWasalni: true,
              parsedItems: [
                { name: `من: ${w.fromAddress}`, quantity: 1, price: 0 },
                { name: `إلى: ${w.toAddress}`, quantity: 1, price: 0 },
              ],
            } as Order));
        } catch (e) {
          console.error('خطأ في تحميل طلبات وصل لي:', e);
        }
      }

      const merged = [...foodOrders, ...wasalniOrders];
      merged.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return merged;
    },
    refetchInterval: 30000,
    retry: 1
  });

  // اشتراك WebSocket لتلقي تحديثات الطلبات الفورية من السائق والإدارة
  useEffect(() => {
    if (!customerPhone) return;
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

        ws.onopen = () => {
          // إرسال auth بكلا المعرّفين (customerId والهاتف) لضمان وصول إشعارات
          // الطلبات بصرف النظر عن المعرّف الذي خزّنه الخادم في recipientId
          const customerId = user?.id;
          if (customerId) {
            ws?.send(JSON.stringify({
              type: 'auth',
              payload: { userId: customerId, userType: 'customer' },
            }));
          }
          if (customerPhone && customerPhone !== customerId) {
            ws?.send(JSON.stringify({
              type: 'auth',
              payload: { userId: customerPhone, userType: 'customer' },
            }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (
              message.type === 'order_update' ||
              message.type === 'order_status_changed' ||
              message.type === 'new_wasalni_request' ||
              message.type === 'driver_assigned'
            ) {
              // استخدام المفتاح الكامل لضمان إلغاء الكاش الصحيح
              queryClient.invalidateQueries({ queryKey: ['orders', customerPhone, customerId] });
            }
          } catch (err) {
            console.error('Failed to parse WS message in OrdersPage:', err);
          }
        };

        ws.onclose = () => {
          if (!cancelled) {
            reconnectTimeout = setTimeout(connect, 5000);
          }
        };
        ws.onerror = () => {
          try { ws?.close(); } catch {}
        };
      } catch (err) {
        console.error('WebSocket connection failed:', err);
      }
    };

    connect();
    return () => {
      cancelled = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      try { ws?.close(); } catch {}
    };
  }, [customerPhone, queryClient]);

  // طلب الإلغاء
  const cancelOrderMutation = useMutation({
    mutationFn: async ({ orderId, reason, isWasalni }: { orderId: string; reason: string; isWasalni?: boolean }) => {
      const url = isWasalni ? `/api/wasalni/${orderId}` : `/api/orders/${orderId}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancelReason: reason, updatedBy: customerPhone, updatedByType: 'customer' }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'فشل في إلغاء الطلب');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', customerPhone] });
      toast({
        title: "تم إلغاء الطلب",
        description: "تم إلغاء طلبك بنجاح",
      });
      setShowCancelDialog(false);
      setCancellingOrder(null);
      setCancelReason('');
      setCustomCancelReason('');
    },
    onError: (err: any) => {
      toast({
        title: "خطأ في الإلغاء",
        description: err.message || "حدث خطأ، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  });

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'قيد المراجعة',
      confirmed: 'مؤكد',
      preparing: 'قيد التحضير',
      on_way: 'في الطريق',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
      scheduled: 'مجدول',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-yellow-500',
      confirmed: 'bg-blue-500',
      preparing: 'bg-orange-500',
      on_way: 'bg-purple-500',
      delivered: 'bg-green-500',
      cancelled: 'bg-red-500',
      scheduled: 'bg-teal-500',
    };
    return colorMap[status] || 'bg-gray-500';
  };

  const getStatusIcon = (status: string) => {
    const iconMap: Record<string, any> = {
      pending: Clock,
      confirmed: Package,
      preparing: Package,
      on_way: Package,
      delivered: CheckCircle,
      cancelled: XCircle,
      scheduled: Clock,
    };
    return iconMap[status] || Clock;
  };

  // هل يمكن إلغاء الطلب؟ فقط في حالات معينة
  const canCancelOrder = (status: string) => {
    return ['pending', 'confirmed', 'preparing', 'scheduled'].includes(status);
  };

  const displayOrders = orders;

  const filteredOrders = displayOrders.filter(order => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'active') return ['pending', 'confirmed', 'preparing', 'on_way', 'scheduled'].includes(order.status);
    if (selectedTab === 'completed') return order.status === 'delivered';
    if (selectedTab === 'cancelled') return order.status === 'cancelled';
    return true;
  });

  const handleViewOrder = (orderId: string) => {
    setLocation(`/orders/${orderId}`);
  };

  const handleRateOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowRatingDialog(true);
  };

  const handleReorder = (order: Order) => {
    toast({
      title: "جاري إعادة الطلب",
      description: `سيتم إضافة عناصر طلب ${order.orderNumber} إلى السلة`,
    });
  };

  const openCancelDialog = (order: Order) => {
    setCancellingOrder(order);
    setCancelReason('');
    setCustomCancelReason('');
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = () => {
    if (!cancellingOrder) return;
    const finalReason = cancelReason === 'سبب آخر' ? customCancelReason.trim() : cancelReason;
    if (!finalReason) {
      toast({ title: "الرجاء اختيار سبب الإلغاء", variant: "destructive" });
      return;
    }
    cancelOrderMutation.mutate({ orderId: cancellingOrder.id, reason: finalReason, isWasalni: cancellingOrder._isWasalni });
  };

  const tabs = [
    { id: 'all', label: 'جميع الطلبات', count: displayOrders.length },
    { id: 'active', label: 'النشطة', count: displayOrders.filter(o => ['pending', 'confirmed', 'preparing', 'on_way', 'scheduled'].includes(o.status)).length },
    { id: 'completed', label: 'المكتملة', count: displayOrders.filter(o => o.status === 'delivered').length },
    { id: 'cancelled', label: 'الملغية', count: displayOrders.filter(o => o.status === 'cancelled').length }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-red-500" />
          <p className="text-gray-600">جاري تحميل طلباتك...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
          <p className="text-red-600 mb-4">حدث خطأ في تحميل الطلبات</p>
          <Button onClick={() => window.location.reload()} className="bg-red-500 hover:bg-red-600">
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* رأس الصفحة */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/')}
              data-testid="button-back"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">طلباتي</h1>
              <p className="text-sm text-gray-500">تتبع ومراجعة طلباتك</p>
            </div>
          </div>
        </div>
      </div>

      {/* التبويبات */}
      <div className="max-w-md mx-auto p-4">
        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as any)}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="text-xs relative"
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">
                    {tab.count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedTab} className="space-y-4">
            {filteredOrders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد طلبات</h3>
                  <p className="text-gray-500 mb-4">لم تقم بأي طلبات بعد</p>
                  <Button onClick={() => setLocation('/')} data-testid="button-start-ordering">
                    ابدأ الطلب الآن
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredOrders.map((order) => {
                const StatusIcon = getStatusIcon(order.status);
                
                return (
                  <Card key={order.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-bold">{order.restaurantName}</CardTitle>
                          <p className="text-sm text-gray-500">طلب رقم: {order.orderNumber}</p>
                        </div>
                        <Badge 
                          className={`${getStatusColor(order.status)} text-white`}
                          data-testid={`badge-status-${order.status}`}
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* عناصر الطلب */}
                      <div className="space-y-2">
                        {order.parsedItems?.map((item: OrderItem, index: number) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="font-medium">{formatCurrency(item.price)}</span>
                          </div>
                        )) || (
                          <div className="text-sm text-gray-500">لا توجد تفاصيل العناصر</div>
                        )}
                      </div>

                      {/* ملخص الطلب */}
                      <div className="border-t pt-3 space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>عدد الأصناف: {order.parsedItems?.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0) || 0}</span>
                          <span>المجموع: {formatCurrency(order.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>
                            تاريخ الطلب: {formatDate(order.createdAt)} - {new Date(order.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {order.estimatedTime && (
                            <span>الوقت المتوقع: {order.estimatedTime}</span>
                          )}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>العنوان: {order.deliveryAddress}</span>
                          <span>الدفع: {order.paymentMethod === 'cash' ? 'نقدي' : 'إلكتروني'}</span>
                        </div>
                      </div>

                      {/* أزرار الإجراءات */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleViewOrder(order.id)}
                          data-testid={`button-view-order-${order.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          تتبع الطلب
                        </Button>

                        {/* زر الإلغاء - يظهر للطلبات النشطة القابلة للإلغاء */}
                        {canCancelOrder(order.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => openCancelDialog(order)}
                            data-testid={`button-cancel-order-${order.id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            إلغاء الطلب
                          </Button>
                        )}
                        
                        {order.status === 'delivered' && !order.isRated && (
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 bg-amber-500 hover:bg-amber-600"
                            onClick={() => handleRateOrder(order)}
                          >
                            <Star className="w-4 h-4 mr-1" />
                            تقييم
                          </Button>
                        )}

                        {order.status === 'on_way' && order.driverPhone && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-blue-500 text-blue-500 hover:bg-blue-50"
                            onClick={() => window.location.href = `tel:${order.driverPhone}`}
                          >
                            <Phone className="w-4 h-4 mr-1" />
                            اتصال بالسائق
                          </Button>
                        )}
                        
                        {order.status === 'delivered' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleReorder(order)}
                            data-testid={`button-reorder-${order.id}`}
                          >
                            إعادة الطلب
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        {selectedOrder && (
          <RatingDialog
            isOpen={showRatingDialog}
            onClose={() => {
              setShowRatingDialog(false);
              setSelectedOrder(null);
            }}
            orderId={selectedOrder.id}
            restaurantName={selectedOrder.restaurantName || "المطعم"}
            driverName={selectedOrder.driverName}
            customerId={selectedOrder.customerId || user?.id}
          />
        )}
      </div>

      {/* نافذة إلغاء الطلب */}
      {showCancelDialog && cancellingOrder && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* رأس النافذة */}
            <div className="bg-red-500 px-5 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  <h3 className="font-black text-lg">إلغاء الطلب</h3>
                </div>
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="text-white/80 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-white/80 text-sm mt-1">
                طلب رقم: {cancellingOrder.orderNumber}
              </p>
            </div>

            {/* المحتوى */}
            <div className="px-5 py-4">
              <p className="text-gray-700 font-bold text-sm mb-4">
                يرجى اختيار سبب الإلغاء:
              </p>

              <div className="space-y-2 mb-4">
                {CANCEL_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setCancelReason(reason)}
                    className={`w-full text-right px-4 py-3 rounded-xl border-2 transition-all text-sm font-bold ${
                      cancelReason === reason
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-100 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              {cancelReason === 'سبب آخر' && (
                <textarea
                  placeholder="اكتب سبب الإلغاء..."
                  value={customCancelReason}
                  onChange={(e) => setCustomCancelReason(e.target.value)}
                  className="w-full p-3 border-2 rounded-xl text-sm focus:border-red-400 outline-none resize-none mb-4"
                  rows={3}
                />
              )}

              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleConfirmCancel}
                  disabled={cancelOrderMutation.isPending || !cancelReason || (cancelReason === 'سبب آخر' && !customCancelReason.trim())}
                >
                  {cancelOrderMutation.isPending ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    'تأكيد الإلغاء'
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCancelDialog(false)}
                  disabled={cancelOrderMutation.isPending}
                >
                  رجوع
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
