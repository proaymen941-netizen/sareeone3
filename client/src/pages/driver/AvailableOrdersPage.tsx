import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Phone, DollarSign, Clock, CheckCircle, Bell, Bike, ArrowLeftRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  status: string;
  items: string;
  totalAmount: string;
  driverEarnings: string;
  restaurantName?: string;
  createdAt: Date;
  driverId?: string;
  isWasalni?: boolean;
  fromAddress?: string;
  toAddress?: string;
  requestNumber?: string;
  orderType?: string;
  estimatedFee?: string;
}

interface AvailableOrdersPageProps {
  driverId: string;
  onSelectOrder: (orderId: string) => void;
  onOrderAccepted?: () => void;
}

export default function AvailableOrdersPage({ driverId, onSelectOrder, onOrderAccepted }: AvailableOrdersPageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);
  const [updatingWasalniId, setUpdatingWasalniId] = useState<string | null>(null);

  const driverToken = localStorage.getItem('driver_token');

  const { data: availableOrders = [], isLoading, refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ['/api/drivers/orders/available', driverId],
    queryFn: async () => {
      const response = await fetch('/api/drivers/orders/available', {
        headers: { 'Authorization': `Bearer ${driverToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30000,
    enabled: !!driverToken
  });

  const { data: wasalniOrders = [], isLoading: isLoadingWasalni, refetch: refetchWasalni } = useQuery<any[]>({
    queryKey: ['/api/drivers/wasalni', 'available', driverId],
    queryFn: async () => {
      const response = await fetch('/api/drivers/wasalni?status=available', {
        headers: { 'Authorization': `Bearer ${driverToken}` }
      });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30000,
    enabled: !!driverToken
  });

  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
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
    onSuccess: (data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/orders/available', driverId] });
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/app/dashboard`] });
      setAcceptingOrderId(null);
      toast({ title: "✅ تم قبول الطلب", description: "تم إضافة الطلب إلى قائمة الطلبات النشطة" });
      if (onOrderAccepted) onOrderAccepted();
    },
    onError: (error: Error) => {
      setAcceptingOrderId(null);
      toast({ title: "❌ خطأ في قبول الطلب", description: error.message, variant: "destructive" });
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
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/wasalni', 'available', driverId] });
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/app/dashboard`] });
      setUpdatingWasalniId(null);
      toast({ title: "✅ تم تحديث طلب وصل لي" });
      if (onOrderAccepted) onOrderAccepted();
    },
    onError: (error: Error) => {
      setUpdatingWasalniId(null);
      toast({ title: "❌ خطأ", description: error.message, variant: "destructive" });
    }
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchOrders(), refetchWasalni()]);
    setRefreshing(false);
  };

  const totalCount = availableOrders.length + wasalniOrders.length;

  if ((isLoading || isLoadingWasalni) && totalCount === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري تحميل الطلبات المتاحة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">الطلبات المتاحة</h1>
            <p className="text-gray-600">{totalCount} طلب متاح</p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-2">
            <Clock className="h-4 w-4" />
            {refreshing ? 'جاري...' : 'تحديث'}
          </Button>
        </div>

        {totalCount === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg">لا توجد طلبات متاحة حالياً</p>
              <p className="text-gray-400 mt-2">سيتم إشعارك عند توفر طلبات جديدة</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* طلبات المتاجر العادية */}
            {availableOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onSelectOrder(order.id)}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-lg">طلب #{order.orderNumber}</p>
                      <p className="text-sm font-semibold text-primary">{order.restaurantName || 'مطعم'}</p>
                      <p className="text-xs text-gray-500">{formatDate(order.createdAt)} - {new Date(order.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">مُعين لك</Badge>
                  </div>
                  <div className="space-y-2 mb-4 border-t pt-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                      <p className="text-sm text-gray-700">{order.deliveryAddress}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <p className="text-sm font-bold text-green-600">عمولة: {formatCurrency(order.driverEarnings)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <p className="text-sm text-gray-600">{order.customerName}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t flex-wrap">
                    <Button onClick={(e) => { e.stopPropagation(); window.open(`tel:${order.customerPhone}`); }} variant="outline" size="sm" className="gap-2">
                      <Phone className="h-4 w-4" />اتصال
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAcceptingOrderId(order.id);
                        acceptOrderMutation.mutate(order.id);
                      }}
                      disabled={acceptingOrderId === order.id && acceptOrderMutation.isPending}
                      size="sm"
                      className="gap-2 bg-green-600 hover:bg-green-700 ml-auto"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {acceptingOrderId === order.id && acceptOrderMutation.isPending ? 'جاري...' : 'قبول الطلب'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* طلبات وصل لي */}
            {wasalniOrders.map((req) => (
              <Card key={req.id} className="hover:shadow-lg transition-shadow border-2 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Bike className="h-4 w-4 text-orange-500" />
                        <p className="font-bold text-lg text-orange-700">وصل لي #{req.requestNumber}</p>
                      </div>
                      <p className="text-sm text-gray-500">{req.orderType || 'توصيل'}</p>
                      <p className="text-xs text-gray-400">{req.createdAt ? new Date(req.createdAt).toLocaleString('ar-YE') : ''}</p>
                    </div>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">طلب وصل لي</Badge>
                  </div>

                  <div className="space-y-2 mb-4 border-t pt-3">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold">من (الاستلام)</p>
                        <p className="text-sm text-gray-700">{req.fromAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pr-3">
                      <ArrowLeftRight className="h-3 w-3 text-gray-400" />
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
                        <p className="text-sm font-bold text-orange-600">
                          رسوم التوصيل: {parseFloat(req.estimatedFee).toLocaleString()} ر.ي
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <p className="text-sm text-gray-600">{req.customerName} - {req.customerPhone}</p>
                    </div>
                    {req.notes && (
                      <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">ملاحظة: {req.notes}</p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3 border-t flex-wrap">
                    <Button onClick={(e) => { e.stopPropagation(); window.open(`tel:${req.customerPhone}`); }} variant="outline" size="sm" className="gap-2">
                      <Phone className="h-4 w-4" />اتصال
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUpdatingWasalniId(req.id);
                        updateWasalniMutation.mutate({ id: req.id, status: 'on_way' });
                      }}
                      disabled={(updatingWasalniId !== null && updatingWasalniId !== req.id) || updateWasalniMutation.isPending}
                      size="sm"
                      className="gap-2 bg-orange-600 hover:bg-orange-700 text-white ml-auto"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {updatingWasalniId === req.id && updateWasalniMutation.isPending ? 'جاري...' : 'في الطريق'}
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUpdatingWasalniId(req.id);
                        updateWasalniMutation.mutate({ id: req.id, status: 'delivered' });
                      }}
                      disabled={(updatingWasalniId !== null && updatingWasalniId !== req.id) || updateWasalniMutation.isPending}
                      size="sm"
                      className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4" />
                      تم التسليم
                    </Button>
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
