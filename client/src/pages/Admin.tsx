import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Store, ShoppingBag, Truck, ChartLine, Tags, Percent, BarChart, DollarSign, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Restaurant, Order, Driver } from '@shared/schema';

export default function Admin() {
  const [, setLocation] = useLocation();

  const { data: restaurants } = useQuery<Restaurant[]>({
    queryKey: ['/api/restaurants'],
  });

  const { data: orders } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ['/api/drivers'],
  });

  // Calculate stats
  const todayOrders = orders?.filter(order => {
    const today = new Date().toDateString();
    const orderDate = new Date(order.createdAt || '').toDateString();
    return today === orderDate;
  }).length || 0;

  const activeRestaurants = restaurants?.filter(r => r.isOpen).length || 0;
  const availableDrivers = drivers?.filter(d => d.isAvailable && d.isActive).length || 0;
  
  const todayRevenue = orders?.filter(order => {
    const today = new Date().toDateString();
    const orderDate = new Date(order.createdAt || '').toDateString();
    return today === orderDate;
  }).reduce((sum, order) => sum + parseFloat(order.totalAmount || '0'), 0) || 0;

  const adminMenuItems = [
    {
      icon: Settings,
      title: 'إعدادات المتجر',
      description: 'إدارة إعدادات المتجر الرئيسي والرسوم',
      color: 'text-primary',
      testId: 'admin-ui-settings',
      path: '/admin/ui-settings',
    },
    {
      icon: Tags,
      title: 'إدارة التصنيفات',
      description: 'إدارة تصنيفات المطاعم',
      color: 'text-green-500',
      testId: 'admin-categories',
      path: '/admin/categories',
    },
    {
      icon: ShoppingBag,
      title: 'إدارة الطلبات',
      description: 'متابعة وإدارة الطلبات',
      color: 'text-blue-500',
      testId: 'admin-orders',
      path: '/admin/orders',
    },
    {
      icon: Truck,
      title: 'إدارة السائقين',
      description: 'إضافة وإدارة السائقين',
      color: 'text-orange-500',
      testId: 'admin-drivers',
      path: '/admin/drivers',
    },
    {
      icon: DollarSign,
      title: 'رسوم التوصيل',
      description: 'إعدادات رسوم ومناطق التوصيل',
      color: 'text-yellow-600',
      testId: 'admin-delivery-fees',
      path: '/admin/delivery-fees',
    },
    {
      icon: Percent,
      title: 'إدارة العروض',
      description: 'إنشاء وإدارة العروض الخاصة',
      color: 'text-purple-500',
      testId: 'admin-offers',
      path: '/admin/offers',
    },
    {
      icon: BarChart,
      title: 'التقارير والإحصائيات',
      description: 'عرض التقارير المالية والإحصائيات',
      color: 'text-red-500',
      testId: 'admin-reports',
      path: '/admin/reports',
    },
  ];

  return (
    <div>
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/')}
            data-testid="button-admin-back"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">لوحة التحكم</h2>
        </div>
      </header>

      <section className="p-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="text-center">
            <CardContent className="p-4">
              <ShoppingBag className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-bold text-foreground" data-testid="stat-orders-today">
                {todayOrders}
              </h3>
              <p className="text-sm text-muted-foreground">طلبات اليوم</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-4">
              <Store className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-foreground" data-testid="stat-active-restaurants">
                {activeRestaurants}
              </h3>
              <p className="text-sm text-muted-foreground">متجر نشط</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-4">
              <Truck className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-foreground" data-testid="stat-available-drivers">
                {availableDrivers}
              </h3>
              <p className="text-sm text-muted-foreground">سائق متاح</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-4">
              <ChartLine className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-foreground" data-testid="stat-today-revenue">
                {todayRevenue.toFixed(2)}
              </h3>
              <p className="text-sm text-muted-foreground">ريال الإيرادات</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Menu */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-foreground">الإدارة</h3>
          
          {adminMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.testId}
                variant="ghost"
                className="w-full h-auto p-4 justify-between hover:bg-accent"
                onClick={() => setLocation(item.path)}
                data-testid={item.testId}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-6 w-6 ${item.color}`} />
                  <div className="text-right">
                    <div className="font-medium text-foreground">{item.title}</div>
                    <div className="text-sm text-muted-foreground">{item.description}</div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground rotate-180" />
              </Button>
            );
          })}
        </div>
      </section>
    </div>
  );
}