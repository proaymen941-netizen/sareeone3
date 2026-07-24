import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DriverMapView from '@/components/maps/DriverMapView';
import {
  MapPin,
  Phone,
  Clock,
  DollarSign,
  Package,
  Navigation,
  CheckCircle,
  ArrowLeft,
  Store,
  User,
  Wallet,
  Calendar,
  MessageCircle,
  Map as MapIcon
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  customerLocationLat?: string;
  customerLocationLng?: string;
  notes?: string;
  paymentMethod: string;
  status: string;
  items: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  totalAmount: string;
  estimatedTime?: string;
  driverEarnings: string;
  driverCommissionRate?: number | string;
  driverCommissionAmount?: string;
  restaurantId: string;
  restaurantName?: string;
  restaurantPhone?: string;
  restaurantAddress?: string;
  restaurantImage?: string;
  restaurantLatitude?: string;
  restaurantLongitude?: string;
  driverId?: string;
  createdAt: Date;
  updatedAt: Date;
  adminName?: string;
  adminPhone?: string;
}

interface OrderDetailsPageProps {
  orderId: string;
  driverId: string;
  onBack: () => void;
}

export default function OrderDetailsPage({ orderId, driverId, onBack }: OrderDetailsPageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAccepting, setIsAccepting] = useState(false);

  const driverToken = localStorage.getItem('driver_token');

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: [`/api/drivers/orders/${orderId}`],
    queryFn: async () => {
      const response = await fetch(`/api/drivers/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${driverToken}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch order details');
      return response.json();
    },
    enabled: !!driverToken
  });

  const acceptOrderMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/drivers/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to accept order');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/orders'] });
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/orders/${orderId}`] });
      toast({
        title: "تم قبول الطلب بنجاح ✅",
        description: "تم تعيين الطلب لك"
      });
      onBack();
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await fetch(`/api/drivers/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/orders'] });
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/orders/${orderId}`] });
      toast({
        title: "تم التحديث بنجاح ✅",
        description: "تم تحديث حالة الطلب"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (isLoading && !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري تحميل تفاصيل الطلب...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">الطلب غير موجود</p>
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            العودة
          </Button>
        </div>
      </div>
    );
  }

  const items = (() => {
    try {
      return JSON.parse(order.items);
    } catch {
      return [];
    }
  })();

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'في الانتظار',
      confirmed: 'مؤكد',
      preparing: 'قيد التحضير',
      ready: 'جاهز للاستلام',
      picked_up: 'تم الاستلام',
      on_way: 'في الطريق',
      delivered: 'تم التسليم',
      cancelled: 'ملغي'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-purple-100 text-purple-800',
      picked_up: 'bg-indigo-100 text-indigo-800',
      on_way: 'bg-green-100 text-green-800',
      delivered: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow: Record<string, string> = {
      confirmed: 'preparing',
      preparing: 'ready',
      ready: 'picked_up',
      picked_up: 'on_way',
      on_way: 'delivered'
    };
    return statusFlow[currentStatus];
  };

  const getNextStatusLabel = (currentStatus: string) => {
    const labels: Record<string, string> = {
      confirmed: 'بدء التحضير',
      preparing: 'جاهز للاستلام',
      ready: 'تم الاستلام',
      picked_up: 'في الطريق',
      on_way: 'تم التسليم'
    };
    return labels[currentStatus] || 'تحديث الحالة';
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between h-16 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">تفاصيل الطلب</h1>
          <Badge className={getStatusColor(order.status)}>
            {getStatusText(order.status)}
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 pb-20">
        {/* Order Number and Amount */}
        <Card className="mb-4 border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm text-gray-600">رقم الطلب</p>
                <p className="text-2xl font-bold">#{order.orderNumber || order.id.slice(-8)}</p>
              </div>
              <div className="text-left">
                <p className="text-sm text-gray-600">المبلغ الإجمالي</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(order.totalAmount)}</p>
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <div>
                <p className="text-gray-600">
                  عمولتك ({order.driverCommissionRate ? `${parseFloat(String(order.driverCommissionRate)).toFixed(0)}%` : '—'})
                </p>
                <p className="font-bold text-lg text-green-700">
                  {formatCurrency(order.driverCommissionAmount || order.driverEarnings)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">رسم التوصيل</p>
                <p className="font-bold">{formatCurrency(order.deliveryFee)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Administration Contact */}
        <Card className="mb-4 border-blue-100 bg-blue-50 shadow-sm overflow-hidden">
          <CardHeader className="py-3 bg-blue-100/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-800">
              <MessageCircle className="h-4 w-4" />
              تواصل مع الإدارة
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            <div className="flex justify-between items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">{order.adminName || 'مدير العمليات (المناوب)'}</p>
                <p className="text-xs text-gray-600 mt-0.5">للمساعدة في أي مشكلة تخص الطلب أو التواصل السريع</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  onClick={() => window.open(`tel:${order.adminPhone || '+967777777777'}`)}
                >
                  <Phone className="h-4 w-4" />
                  اتصال
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 border-blue-200 text-blue-700 hover:bg-white"
                  onClick={() => window.open(`https://wa.me/${(order.adminPhone || '+967777777777').replace('+', '')}`)}
                >
                  واتساب
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Map Access - NEW SECTION */}
        <Card className="mb-4 border-green-100 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MapIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="font-bold text-gray-800">تتبع الموقع والمسار</span>
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="default" className="bg-green-600 hover:bg-green-700 gap-2">
                      <Navigation className="h-4 w-4" />
                      فتح الخريطة التفاعلية
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] w-full h-[85vh] p-0 overflow-hidden">
                    <DialogHeader className="p-4 border-b bg-white z-10">
                      <DialogTitle className="text-right">تتبع مسار الطلب #{order.orderNumber || order.id.slice(-8)}</DialogTitle>
                    </DialogHeader>
                    <div className="relative h-full w-full">
                      <DriverMapView 
                        orders={[{
                          id: order.id,
                          orderNumber: order.orderNumber,
                          customerName: order.customerName,
                          customerPhone: order.customerPhone,
                          deliveryAddress: order.deliveryAddress,
                          customerLocationLat: order.customerLocationLat,
                          customerLocationLng: order.customerLocationLng,
                          restaurantLat: order.restaurantLatitude,
                          restaurantLng: order.restaurantLongitude,
                          status: order.status,
                          totalAmount: order.totalAmount
                        }]}
                        height="calc(85vh - 60px)"
                        onNavigate={(o) => {
                          const dest = o.status === 'ready' || o.status === 'assigned' 
                            ? `${o.restaurantLat},${o.restaurantLng}` 
                            : `${o.customerLocationLat},${o.customerLocationLng}`;
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
                        }}
                        onCall={(phone) => window.open(`tel:${phone}`)}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <p className="text-xs text-gray-500">يمكنك رؤية موقع المطعم وموقع العميل والمسار المقترح لتوفير الوقت.</p>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              معلومات العميل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">اسم العميل</p>
                <p className="font-semibold text-lg">{order.customerName}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`tel:${order.customerPhone}`)}
                className="gap-2"
              >
                <Phone className="h-4 w-4" />
                اتصال
              </Button>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">عنوان التوصيل</p>
              <div className="flex gap-2 mb-4">
                <MapPin className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="font-medium">{order.deliveryAddress}</p>
              </div>
              {order.customerLocationLat && order.customerLocationLng && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${order.customerLocationLat},${order.customerLocationLng}`;
                    window.open(url, '_blank');
                  }}
                  className="w-full gap-2 border-green-200 text-green-700 hover:bg-green-50"
                >
                  <Navigation className="h-4 w-4" />
                  تتبع موقع العميل على الخرائط
                </Button>
              )}
            </div>

            {order.notes && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-2">ملاحظات العميل</p>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-sm">{order.notes}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Restaurant Information */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              معلومات المطعم
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">اسم المطعم</p>
                <p className="font-semibold text-lg">{order.restaurantName || 'مطعم'}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`tel:${order.restaurantPhone}`)}
                className="gap-2"
              >
                <Phone className="h-4 w-4" />
                اتصال
              </Button>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">عنوان المطعم</p>
              <div className="flex gap-2">
                <MapPin className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="font-medium">{order.restaurantAddress || 'عنوان المطعم'}</p>
              </div>
            </div>

            {order.restaurantLatitude && order.restaurantLongitude && (
              <div className="border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${order.restaurantLatitude},${order.restaurantLongitude}`;
                    window.open(url, '_blank');
                  }}
                  className="w-full gap-2"
                >
                  <Navigation className="h-4 w-4" />
                  توجيه إلى المطعم
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              محتويات الطلب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.length > 0 ? (
                items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.name || item.itemName}</p>
                      {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
                      {item.notes && <p className="text-sm text-orange-600 mt-1">ملاحظة: {item.notes}</p>}
                    </div>
                    <div className="text-left ml-4">
                      <p className="text-sm text-gray-600">x{item.quantity || 1}</p>
                      <p className="font-semibold">{formatCurrency(item.price)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">لا توجد عناصر</p>
              )}
            </div>

            <div className="border-t mt-4 pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">المجموع الفرعي</span>
                <span className="font-medium">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">رسم التوصيل</span>
                <span className="font-medium">{formatCurrency(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>المجموع</span>
                <span className="text-green-600">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Timing */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              معلومات التوقيت
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">وقت الطلب</span>
              <span className="font-medium">{formatDate(order.createdAt)} - {new Date(order.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {order.estimatedTime && (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">الوقت المتوقع</span>
                <span className="font-medium">{order.estimatedTime} دقيقة</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              معلومات الدفع
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">طريقة الدفع</span>
              <Badge variant="outline">{order.paymentMethod === 'cash' ? 'نقداً' : 'تحويل بنكي'}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 space-y-3">
          {order.status === 'confirmed' && !order.driverId && (
            <Button
              onClick={() => acceptOrderMutation.mutate()}
              disabled={acceptOrderMutation.isPending}
              className="w-full h-12 gap-2 bg-green-600 hover:bg-green-700 text-white text-lg"
            >
              <CheckCircle className="h-5 w-5" />
              {acceptOrderMutation.isPending ? 'جاري القبول...' : 'قبول الطلب'}
            </Button>
          )}

          {order.driverId === driverId && !['delivered', 'cancelled'].includes(order.status) && (
            <Button
              onClick={() => {
                const nextStatus = getNextStatus(order.status);
                if (nextStatus) {
                  updateOrderStatusMutation.mutate(nextStatus);
                }
              }}
              disabled={updateOrderStatusMutation.isPending}
              className="w-full h-12 gap-2 bg-blue-600 hover:bg-blue-700 text-white text-lg"
            >
              <CheckCircle className="h-5 w-5" />
              {updateOrderStatusMutation.isPending ? 'جاري التحديث...' : getNextStatusLabel(order.status)}
            </Button>
          )}

          {order.customerLocationLat && order.customerLocationLng && order.driverId === driverId && (
            <Button
              variant="outline"
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${order.customerLocationLat},${order.customerLocationLng}`;
                window.open(url, '_blank');
              }}
              className="w-full h-12 gap-2 text-lg"
            >
              <Navigation className="h-5 w-5" />
              التوجيه على الخريطة
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => window.open(`tel:${order.customerPhone}`)}
            className="w-full h-12 gap-2 text-lg"
          >
            <Phone className="h-5 w-5" />
            اتصال بالعميل
          </Button>
        </div>
      </main>
    </div>
  );
}
