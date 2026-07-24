import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, Package, Truck, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@shared/schema';

interface NotificationSystemProps {
  userType: 'admin' | 'driver' | 'customer';
  userId?: string;
}

export function NotificationSystem({ userType, userId }: NotificationSystemProps) {
  const { toast } = useToast();
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  const { data: orders } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    refetchInterval: userType === 'admin' ? 15000 : userType === 'driver' ? 12000 : 25000,
  });

  const { data: driverOrders } = useQuery<Order[]>({
    queryKey: ['/api/orders', { status: 'confirmed' }],
    enabled: userType === 'driver',
    refetchInterval: 12000,
  });

  // مراقبة الطلبات الجديدة للمدير
  useEffect(() => {
    if (userType === 'admin' && orders) {
      const newOrderCount = orders.filter(order => order.status === 'pending').length;
      
      if (lastOrderCount > 0 && newOrderCount > lastOrderCount) {
        const newOrders = newOrderCount - lastOrderCount;
        toast({
          title: "طلبات جديدة!",
          description: `تم استلام ${newOrders} طلب جديد`,
        });
        
        // إضافة إشعار للقائمة
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'new_order',
          title: 'طلب جديد',
          message: `طلب جديد من العميل`,
          timestamp: new Date(),
          read: false
        }]);
      }
      
      setLastOrderCount(newOrderCount);
    }
  }, [orders, lastOrderCount, userType, toast]);

  // مراقبة الطلبات المتاحة للسائقين
  useEffect(() => {
    if (userType === 'driver' && driverOrders) {
      const availableOrders = driverOrders.length;
      
      if (availableOrders > 0) {
        // إشعار صوتي للسائق
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('طلب جديد متاح!', {
            body: `يوجد ${availableOrders} طلب متاح للتوصيل`,
            icon: '/logo.png'
          });
        }
      }
    }
  }, [driverOrders, userType]);

  // طلب إذن الإشعارات
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  if (userType === 'customer') {
    return null; // العملاء لا يحتاجون نظام إشعارات معقد
  }

  return (
    <div className="space-y-4">
      {/* عداد الإشعارات */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-semibold text-foreground">الإشعارات</h3>
                <p className="text-sm text-muted-foreground">
                  {userType === 'admin' ? 'إشعارات النظام' : 'إشعارات التوصيل'}
                </p>
              </div>
            </div>
            <Badge variant="secondary">
              {notifications.filter(n => !n.read).length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* قائمة الإشعارات */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.slice(0, 5).map((notification) => (
            <Card key={notification.id} className={`${!notification.read ? 'border-primary' : ''}`}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    {notification.type === 'new_order' ? (
                      <Package className="h-4 w-4 text-primary" />
                    ) : notification.type === 'order_update' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Truck className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground text-sm">{notification.title}</h4>
                    <p className="text-xs text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.timestamp.toLocaleTimeString('ar-YE')}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}