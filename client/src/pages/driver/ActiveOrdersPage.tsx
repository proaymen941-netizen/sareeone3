import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Phone, Navigation, CheckCircle, Package, Clock, Bike, ArrowLeftRight, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  customerLocationLat?: string;
  customerLocationLng?: string;
  status: string;
  items: string;
  totalAmount: string;
  driverEarnings: string;
  restaurantName?: string;
  restaurantAddress?: string;
  restaurantLatitude?: string;
  restaurantLongitude?: string;
  createdAt: Date;
  driverId?: string;
}

interface ActiveOrdersPageProps {
  driverId: string;
  onSelectOrder: (orderId: string) => void;
}

export default function ActiveOrdersPage({ driverId, onSelectOrder }: ActiveOrdersPageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updatingWasalniId, setUpdatingWasalniId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const driverToken = localStorage.getItem('driver_token');

  const { data: myOrders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/drivers/orders', 'active', driverId],
    queryFn: async () => {
      const response = await fetch(`/api/drivers/orders?status=active`, {
        headers: { 'Authorization': `Bearer ${driverToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30000,
    enabled: !!driverToken
  });

  const { data: activeWasalni = [], isLoading: isLoadingWasalni } = useQuery<any[]>({
    queryKey: ['/api/drivers/wasalni', 'active', driverId],
    queryFn: async () => {
      const response = await fetch('/api/drivers/wasalni?status=active', {
        headers: { 'Authorization': `Bearer ${driverToken}` }
      });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30000,
    enabled: !!driverToken
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
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
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/orders', 'active', driverId] });
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/app/dashboard`] });
      setUpdatingOrderId(null);
      toast({ title: "تم التحديث ✅", description: "تم تحديث حالة الطلب بنجاح" });
    },
    onError: (error: Error) => {
      setUpdatingOrderId(null);
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  });

  const updateWasalniMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/drivers/wasalni/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update wasalni');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/wasalni', 'active', driverId] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/wasalni', 'available', driverId] });
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/app/dashboard`] });
      setUpdatingWasalniId(null);
      toast({ title: "✅ تم تحديث وصل لي" });
    },
    onError: (error: Error) => {
      setUpdatingWasalniId(null);
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  });

  const activeOrders = myOrders.filter(order =>
    ['preparing', 'ready', 'picked_up', 'on_way'].includes(order.status)
  );

  const totalActive = activeOrders.length + activeWasalni.length;

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      preparing: 'قيد التحضير', ready: 'جاهز للاستلام',
      picked_up: 'تم الاستلام', on_way: 'في الطريق',
      confirmed: 'مؤكد',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      preparing: 'bg-orange-100 text-orange-800', ready: 'bg-purple-100 text-purple-800',
      picked_up: 'bg-indigo-100 text-indigo-800', on_way: 'bg-green-100 text-green-800',
      confirmed: 'bg-blue-100 text-blue-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getNextStatus = (status: string) => {
    const flow: Record<string, string> = {
      preparing: 'ready', ready: 'picked_up', picked_up: 'on_way', on_way: 'delivered'
    };
    return flow[status];
  };

  const getNextStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      preparing: 'جاهز للاستلام', ready: 'تم الاستلام', picked_up: 'في الطريق', on_way: 'تم التسليم'
    };
    return labels[status];
  };

  if ((isLoading || isLoadingWasalni) && totalActive === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري تحميل الطلبات النشطة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">الطلبات النشطة</h1>
        <p className="text-gray-600 mb-6">{totalActive} طلب نشط</p>

        {totalActive === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg">لا توجد طلبات نشطة</p>
              <p className="text-gray-400 mt-2">جميع الطلبات مكتملة أو بانتظار القبول</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* طلبات المتاجر العادية */}
            {activeOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onSelectOrder(order.id)}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-lg">طلب #{order.orderNumber}</p>
                      <p className="text-sm text-gray-600">{order.customerName}</p>
                      <p className="text-xs text-gray-400">{formatDate(order.createdAt)} - {new Date(order.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <Badge className={getStatusColor(order.status)}>{getStatusText(order.status)}</Badge>
                  </div>
                  <div className="space-y-2 mb-4 border-t pt-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">{order.deliveryAddress}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <p className="text-sm text-gray-600">{order.customerPhone}</p>
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded mb-4 border border-green-200">
                    <p className="text-sm text-green-700"><span className="font-bold">عمولتك:</span> {formatCurrency(order.driverEarnings)}</p>
                  </div>
                  <div className="flex gap-2 pt-3 border-t">
                    <Button onClick={(e) => { e.stopPropagation(); window.open(`tel:${order.customerPhone}`); }} variant="outline" size="sm" className="gap-2">
                      <Phone className="h-4 w-4" />اتصال
                    </Button>
                    {order.customerLocationLat && order.customerLocationLng && (
                      <Button onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.customerLocationLat},${order.customerLocationLng}`, '_blank'); }} variant="outline" size="sm" className="gap-2">
                        <Navigation className="h-4 w-4" />خريطة
                      </Button>
                    )}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextStatus = getNextStatus(order.status);
                        if (nextStatus) {
                          setUpdatingOrderId(order.id);
                          updateOrderStatusMutation.mutate({ orderId: order.id, status: nextStatus });
                        }
                      }}
                      disabled={updatingOrderId === order.id && updateOrderStatusMutation.isPending}
                      size="sm"
                      className="gap-2 bg-blue-600 hover:bg-blue-700 text-white mr-auto"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {updatingOrderId === order.id && updateOrderStatusMutation.isPending ? 'جاري...' : getNextStatusLabel(order.status)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* طلبات وصل لي النشطة */}
            {activeWasalni.map((req) => (
              <Card key={req.id} className="hover:shadow-lg transition-shadow border-2 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Bike className="h-4 w-4 text-orange-500" />
                        <p className="font-bold text-lg text-orange-700">وصل لي #{req.requestNumber}</p>
                      </div>
                      <p className="text-sm text-gray-500">{req.orderType || 'توصيل'}</p>
                    </div>
                    <Badge className={req.status === 'on_way' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                      {req.status === 'on_way' ? 'في الطريق' : 'مؤكد'}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4 border-t pt-3">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold">من (الاستلام)</p>
                        <p className="text-sm text-gray-700">{req.fromAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold">إلى (التوصيل)</p>
                        <p className="text-sm text-gray-700">{req.toAddress}</p>
                      </div>
                    </div>
                    {req.estimatedFee && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-orange-600" />
                        <p className="text-sm font-bold text-orange-600">{parseFloat(req.estimatedFee).toLocaleString()} ر.ي</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <p className="text-sm text-gray-600">{req.customerName} - {req.customerPhone}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t flex-wrap">
                    <Button onClick={(e) => { e.stopPropagation(); window.open(`tel:${req.customerPhone}`); }} variant="outline" size="sm" className="gap-2">
                      <Phone className="h-4 w-4" />اتصال
                    </Button>
                    {req.status === 'confirmed' && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUpdatingWasalniId(req.id);
                          updateWasalniMutation.mutate({ id: req.id, status: 'on_way' });
                        }}
                        disabled={updatingWasalniId === req.id && updateWasalniMutation.isPending}
                        size="sm"
                        className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <Navigation className="h-4 w-4" />
                        {updatingWasalniId === req.id && updateWasalniMutation.isPending ? 'جاري...' : 'في الطريق'}
                      </Button>
                    )}
                    {req.status === 'on_way' && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUpdatingWasalniId(req.id);
                          updateWasalniMutation.mutate({ id: req.id, status: 'delivered' });
                        }}
                        disabled={updatingWasalniId === req.id && updateWasalniMutation.isPending}
                        size="sm"
                        className="gap-2 bg-green-600 hover:bg-green-700 text-white ml-auto"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {updatingWasalniId === req.id && updateWasalniMutation.isPending ? 'جاري...' : 'تم التسليم'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
