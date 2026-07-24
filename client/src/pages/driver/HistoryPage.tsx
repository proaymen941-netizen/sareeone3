import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, DollarSign, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  deliveryAddress: string;
  status: string;
  totalAmount: string | number;
  driverEarnings: string | number;
  restaurantName?: string;
  createdAt: string;
}

interface HistoryPageProps {
  driverId?: string;
  onSelectOrder: (orderId: string) => void;
}

export default function HistoryPage({ onSelectOrder }: HistoryPageProps) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'delivered' | 'cancelled'>('all');
  const driverToken = localStorage.getItem('driver_token');

  useEffect(() => {
    if (!driverToken) {
      window.location.href = '/driver-login';
    }
  }, [driverToken]);

  const { data: myOrders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/drivers/orders', 'history'],
    queryFn: async () => {
      const response = await fetch('/api/drivers/orders?status=history', {
        headers: {
          'Authorization': `Bearer ${driverToken}`
        }
      });
      if (!response.ok) throw new Error('فشل في جلب سجل الطلبات');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!driverToken,
  });

  const completedOrders = myOrders.filter(order => {
    return filterStatus === 'all' || order.status === filterStatus;
  });

  const totalEarnings = completedOrders
    .filter(o => o.status === 'delivered')
    .reduce((sum, order) => sum + (parseFloat(order.driverEarnings?.toString() || '0')), 0);

  const deliveredCount = completedOrders.filter(o => o.status === 'delivered').length;
  const cancelledCount = completedOrders.filter(o => o.status === 'cancelled').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
          <p>جاري تحميل السجل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-right">سجل الطلبات</h1>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">المكتملة</p>
              <p className="text-2xl font-bold text-green-600">{deliveredCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">الملغاة</p>
              <p className="text-2xl font-bold text-red-600">{cancelledCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">الأرباح</p>
              <p className="text-xl font-bold text-blue-600 truncate">{formatCurrency(totalEarnings)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6 justify-start overflow-x-auto pb-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('all')}
            size="sm"
            className="whitespace-nowrap"
          >
            الكل ({myOrders.filter(o => ['delivered', 'cancelled'].includes(o.status)).length})
          </Button>
          <Button
            variant={filterStatus === 'delivered' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('delivered')}
            size="sm"
            className="whitespace-nowrap"
          >
            مكتملة ({deliveredCount})
          </Button>
          <Button
            variant={filterStatus === 'cancelled' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('cancelled')}
            size="sm"
            className="whitespace-nowrap"
          >
            ملغاة ({cancelledCount})
          </Button>
        </div>

        {completedOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg">لا توجد طلبات في السجل</p>
              <p className="text-gray-400 mt-2">الطلبات المكتملة ستظهر هنا</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {completedOrders.map((order) => (
              <Card
                key={order.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onSelectOrder(order.id)}
              >
                <CardContent className="p-4 text-right">
                  <div className="flex justify-between items-start mb-3">
                    <Badge
                      className={
                        order.status === 'delivered'
                          ? 'bg-green-100 text-green-800 border-none'
                          : 'bg-red-100 text-red-800 border-none'
                      }
                    >
                      {order.status === 'delivered' ? 'مكتمل' : 'ملغي'}
                    </Badge>
                    <div className="text-right">
                      <p className="font-bold text-lg">طلب #{order.orderNumber || order.id.slice(-6)}</p>
                      <p className="text-sm text-gray-600">{order.customerName}</p>
                      <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3 border-t pt-3">
                    <div className="flex items-start gap-2 justify-end">
                      <p className="text-sm text-gray-700">{order.deliveryAddress}</p>
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded border border-blue-100">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blue-600">{formatCurrency(parseFloat(order.totalAmount?.toString() || '0'))}</span>
                      <span className="text-sm text-gray-600">المبلغ الإجمالي</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="font-bold text-green-600">{formatCurrency(parseFloat(order.driverEarnings?.toString() || '0'))}</span>
                      <span className="text-sm text-gray-600">عمولتك</span>
                    </div>
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
