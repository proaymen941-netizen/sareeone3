import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { ArrowRight, MapPin, Clock, Phone, CheckCircle, Truck, Package, User, Star, MessageCircle, Map as MapIcon, Loader2 as Loader, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Skeleton } from '@/components/ui/skeleton';
import RatingDialog from '@/components/RatingDialog';
import { DriverCommunication } from '@/components/DriverCommunication';
import MapComponent from '@/components/maps/MapComponent';
import { useToast } from '@/hooks/use-toast';

interface OrderStatus {
  id: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'on_way' | 'delivered' | 'cancelled';
  timestamp: Date;
  description: string;
  message?: string;
}

interface OrderDetails {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  customerLocationLat?: string;
  customerLocationLng?: string;
  items: any[];
  total: number;
  totalAmount?: number;
  status: string;
  estimatedTime: string;
  driverName?: string;
  driverPhone?: string;
  driverId?: string;
  restaurantName?: string;
  orderNumber: string;
  createdAt: Date;
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  // Wasalni fields
  isSareeOneLi?: boolean; // تم التصحيح: إزالة المسافة
  pickupAddress?: string;
  pickupPhone?: string;
  pickupName?: string;
  waselLiItemType?: string;
}

// الحالات التي يُسمح فيها بالإلغاء (قبل الإرسال للمطعم أو التوصيل)
const CANCELLABLE_STATUSES = ['pending', 'scheduled', 'confirmed'];

export default function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [, setLocation] = useLocation();
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [hasShownRating, setHasShownRating] = useState(false);
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();
  
  // جلب إعدادات الدعم
  const { data: uiSettings } = useQuery<any[]>({
    queryKey: ['/api/ui-settings'],
  });

  const supportPhone = uiSettings?.find(s => s.key === 'support_phone')?.value || 'tel:+967777777777';
  const supportWhatsapp = uiSettings?.find(s => s.key === 'support_whatsapp')?.value || 'https://wa.me/967777777777';

  // جلب بيانات الطلب الحقيقية من API مع تحديثات سريعة
  const { data: orderData, isLoading, error, refetch } = useQuery<{order: OrderDetails, tracking: OrderStatus[]}>({
    queryKey: [`/api/orders/${orderId}/track`],
    enabled: !!orderId,
    refetchInterval: (query) => {
      // إذا كان الطلب مكتملاً أو ملغياً، نتوقف عن التحديث التلقائي
      const status = query.state.data?.order?.status;
      if (status === 'delivered' || status === 'cancelled') return false;
      return 15000;
    },
  });

  // WebSocket support for real-time tracking
  useEffect(() => {
    if (!orderId) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        ws?.send(JSON.stringify({
          type: 'track_order',
          payload: { orderId }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // Check if this update belongs to our current order
          const isRelevantOrder = message.payload?.orderId === orderId || message.payload?.id === orderId;
          
          if ((message.type === 'order_status_changed' || message.type === 'order_update') && isRelevantOrder) {
            refetch();
          } else if (message.type === 'driver_location' && message.payload.driverId === orderData?.order.driverId) {
            setDriverLocation([message.payload.latitude, message.payload.longitude]);
          } else if (message.type === 'settings_changed') {
            // Refresh UI settings if they changed to ensure dynamic UI elements update
            queryClient.invalidateQueries({ queryKey: ['/api/ui-settings'] });
          }
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, [orderId, refetch, orderData?.order.driverId]);

  useEffect(() => {
    if (orderData?.order.status === 'delivered' && !hasShownRating) {
      setShowRatingDialog(true);
      setHasShownRating(true);
    }
  }, [orderData?.order.status, hasShownRating]);

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      toast({ title: "يرجى إدخال سبب الإلغاء", variant: "destructive" });
      return;
    }
    setIsCancelling(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason, cancelledBy: 'customer' }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setShowCancelDialog(false);
        toast({ title: "تم إلغاء الطلب", description: `سبب الإلغاء: ${cancelReason}` });
        refetch();
      } else {
        throw new Error(data.error || 'فشل في إلغاء الطلب');
      }
    } catch (error: any) {
      toast({ title: "خطأ في الإلغاء", description: error.message, variant: "destructive" });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
        <div className="max-w-md mx-auto space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
        <div className="max-w-md mx-auto">
          <Card className="text-center p-6">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">الطلب غير موجود</h2>
            <p className="text-gray-600 mb-4">لم نتمكن من العثور على هذا الطلب</p>
            <Button onClick={() => setLocation('/')} data-testid="button-back-home">
              العودة للرئيسية
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const { order, tracking } = orderData;

  const getStatusProgress = (status: string) => {
    const statusMap: Record<string, number> = {
      scheduled: 10,
      pending: 25,
      assigned: 35,
      confirmed: 40,
      preparing: 60,
      ready: 70,
      picked_up: 75,
      on_way: 80,
      delivered: 100,
      cancelled: 0,
    };
    return statusMap[status] ?? 0;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      scheduled: 'bg-indigo-500',
      pending: 'bg-yellow-500',
      assigned: 'bg-cyan-500',
      confirmed: 'bg-blue-500',
      preparing: 'bg-orange-500',
      ready: 'bg-teal-500',
      picked_up: 'bg-violet-500',
      on_way: 'bg-purple-500',
      delivered: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    return colorMap[status] || 'bg-gray-500';
  };

  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      scheduled: 'مجدول',
      pending: 'في الانتظار',
      assigned: 'تم تعيين سائق',
      confirmed: 'مؤكد',
      preparing: 'قيد التحضير',
      ready: 'جاهز للاستلام',
      picked_up: 'تم الاستلام',
      on_way: 'في الطريق',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
    };
    return textMap[status] || status;
  };

  return (
    <div>
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/profile')}
            data-testid="button-tracking-back"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">تتبع الطلب</h2>
        </div>
      </header>

      <section className="p-4 space-y-6">
        {/* Order Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">طلب رقم #{order.orderNumber || order.id}</CardTitle>
              <Badge 
                className={`${getStatusColor(order.status)} text-white`}
                data-testid="order-status-badge"
              >
                {getStatusText(order.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Live Update Indicator */}
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full w-fit">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>التحديث المباشر مفعل</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-foreground">الوقت المتوقع للوصول: </span>
              <span className="font-bold text-primary" data-testid="estimated-time">
                {order.estimatedTime}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">حالة الطلب</span>
                <span className="text-foreground">{getStatusProgress(order.status)}%</span>
              </div>
              <Progress 
                value={getStatusProgress(order.status)} 
                className="h-2"
                data-testid="order-progress"
              />
            </div>

            {/* معلومات الطلب المجدول */}
            {order.status === 'scheduled' && (order.scheduledDate || order.scheduledTimeSlot) && (
              <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                <Clock className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-indigo-800">طلب مجدول</p>
                  {order.scheduledDate && (
                    <p className="text-xs text-indigo-600 mt-0.5">
                      التاريخ: {new Date(order.scheduledDate).toLocaleDateString('ar-SA', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </p>
                  )}
                  {order.scheduledTimeSlot && (
                    <p className="text-xs text-indigo-600 mt-0.5">الوقت: {order.scheduledTimeSlot}</p>
                  )}
                  <p className="text-xs text-indigo-500 mt-1">سيتم تفعيل طلبك تلقائياً قبل 30 دقيقة من الوقت المحدد</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wasalni Pickup Info - تم التصحيح هنا */}
        {order.isSareeOneLi && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h4 className="font-bold text-primary mb-1">بيانات الاستلام (وصل لي)</h4>
                  <p className="text-sm font-bold text-gray-800 mb-1">
                    {order.pickupAddress}
                  </p>
                  {order.pickupName && (
                    <p className="text-xs text-gray-600">الاسم: {order.pickupName}</p>
                  )}
                  {order.pickupPhone && (
                    <p className="text-xs text-gray-600">الهاتف: {order.pickupPhone}</p>
                  )}
                  {order.waselLiItemType && (
                    <Badge variant="outline" className="mt-2 bg-white text-[10px]">
                      نوع الغرض: {order.waselLiItemType}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Driver Info & Map */}
        {(['confirmed', 'preparing', 'ready', 'picked_up', 'on_way'].includes(order.status)) && order.driverId && (
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                  <MapIcon className="h-4 w-4 text-primary" />
                  تتبع الموقع المباشر
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-[250px] relative">
                <MapComponent 
                  center={driverLocation || [15.3694, 44.1910]} // Default to Sana'a if no location
                  zoom={15}
                  height="100%"
                  driverPosition={driverLocation || undefined}
                  markers={order.customerLocationLat && order.customerLocationLng ? [{
                    position: [parseFloat(order.customerLocationLat), parseFloat(order.customerLocationLng)],
                    title: 'موقعك',
                    type: 'destination'
                  }] : []}
                />
                {!driverLocation && (
                  <div className="absolute inset-0 bg-black/5 flex items-center justify-center backdrop-blur-[1px] z-[400]">
                    <div className="bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                      <Loader className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm font-medium">في انتظار موقع السائق...</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <DriverCommunication 
              driver={{
                id: order.driverId || '',
                name: order.driverName || 'سائق التوصيل',
                phone: order.driverPhone || '',
                isAvailable: true
              }}
              orderNumber={order.orderNumber}
              customerLocation={order.deliveryAddress}
            />
          </div>
        )}

        {/* Delivery Address */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-1" />
              <div>
                <h4 className="font-medium text-foreground mb-1">عنوان التوصيل</h4>
                <p className="text-sm text-foreground" data-testid="delivery-address">
                  {order.deliveryAddress}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تفاصيل الطلب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <div className="flex-1">
                  <span className="text-foreground font-medium" data-testid={`item-name-${index}`}>
                    {item.name}
                  </span>
                  <span className="text-muted-foreground text-sm mr-2">
                    × {item.quantity}
                  </span>
                </div>
                <span className="font-bold text-primary" data-testid={`item-price-${index}`}>
                  {item.price * item.quantity} ريال
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-3 mt-3">
              <div className="flex justify-between items-center font-bold">
                <span className="text-foreground">الإجمالي</span>
                <span className="text-primary" data-testid="order-total">
                  {order.total} ريال
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تاريخ الطلب</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tracking.map((status, index) => (
                <div key={status.id} className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full ${getStatusColor(status.status)} mt-1 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium" data-testid={`timeline-description-${index}`}>
                      {status.description || status.message || 'تحديث الطلب'}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`timeline-time-${index}`}>
                      {new Date(status.timestamp).toLocaleTimeString('ar-YE', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 border-green-600 text-green-600 hover:bg-green-50"
              onClick={() => window.open(supportWhatsapp, '_blank')}
              data-testid="button-whatsapp-support"
            >
              <MessageCircle className="h-4 w-4" />
              واتساب الإدارة
            </Button>
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
              onClick={() => window.location.href = supportPhone}
              data-testid="button-call-support"
            >
              <Phone className="h-4 w-4" />
              اتصال بالإدارة
            </Button>
          </div>
          
          {CANCELLABLE_STATUSES.includes(order.status) && (
            <Button 
              variant="destructive" 
              className="w-full flex items-center justify-center gap-2"
              data-testid="button-cancel-order"
              onClick={() => { setCancelReason(''); setShowCancelDialog(true); }}
            >
              <XCircle className="h-4 w-4" />
              إلغاء الطلب
            </Button>
          )}

          {!CANCELLABLE_STATUSES.includes(order.status) && order.status !== 'delivered' && order.status !== 'cancelled' && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>لا يمكن إلغاء الطلب بعد بدء التوصيل، يرجى التواصل مع الإدارة</span>
            </div>
          )}
        </div>
      </section>

      {/* نافذة إلغاء الطلب */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-600 px-5 py-4 text-white">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                <h3 className="font-black text-lg">إلغاء الطلب</h3>
              </div>
              <p className="text-white/80 text-sm mt-1">طلب رقم #{order.orderNumber}</p>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-sm font-bold text-gray-700 mb-2">لماذا تريد إلغاء الطلب؟</p>
                <div className="space-y-2">
                  {[
                    'غيّرت رأيي',
                    'طلبت بالخطأ',
                    'وجدت بديلاً أفضل',
                    'تأخر الطلب كثيراً',
                    'ظروف طارئة',
                  ].map(reason => (
                    <button
                      key={reason}
                      onClick={() => setCancelReason(reason)}
                      className={`w-full text-right px-3 py-2.5 rounded-xl text-sm border-2 transition-all ${
                        cancelReason === reason
                          ? 'border-red-500 bg-red-50 text-red-700 font-bold'
                          : 'border-gray-100 hover:border-gray-200 text-gray-700'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="سبب آخر (اختياري)..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full mt-2 p-3 border-2 rounded-xl text-sm resize-none focus:border-red-400 outline-none"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCancelDialog(false)}
                  disabled={isCancelling}
                >
                  رجوع
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleCancelOrder}
                  disabled={isCancelling || !cancelReason.trim()}
                >
                  {isCancelling ? (
                    <Loader className="animate-spin h-4 w-4" />
                  ) : (
                    'تأكيد الإلغاء'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRatingDialog && orderData && (
        <RatingDialog
          isOpen={showRatingDialog}
          onClose={() => setShowRatingDialog(false)}
          orderId={order.id}
          restaurantName={order.restaurantName || 'المتجر'}
          driverName={order.driverName}
        />
      )}
    </div>
  );
}
