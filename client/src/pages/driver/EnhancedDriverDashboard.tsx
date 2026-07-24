import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import DriverMapView from '@/components/maps/DriverMapView';
import OrderDetailsPage from './OrderDetailsPage';
import AvailableOrdersPage from './AvailableOrdersPage';
import ActiveOrdersPage from './ActiveOrdersPage';
import HistoryPage from './HistoryPage';
import StatsPage from './StatsPage';
import ProfilePage from './ProfilePage';
import WalletPage from './WalletPage';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useUiSettings } from '@/context/UiSettingsContext';
import {
  Truck,
  MapPin,
  Clock,
  DollarSign,
  LogOut,
  Navigation,
  Phone,
  CheckCircle,
  Package,
  TrendingUp,
  Activity,
  Menu,
  User,
  Calendar,
  Bell,
  Settings,
  History,
  MapPinned,
  RefreshCw
} from 'lucide-react';

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
  restaurantId: string;
  restaurantName?: string;
  restaurantPhone?: string;
  restaurantAddress?: string;
  restaurantImage?: string;
  restaurantLatitude?: string;
  restaurantLongitude?: string;
  driverId?: string;
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  todayOrders: number;
  todayEarnings: number;
  completedToday: number;
  totalOrders: number;
  totalEarnings: number;
  averageRating: number;
}

interface EnhancedDriverDashboardProps {
  driverId: string;
  onLogout: () => void;
}

export default function EnhancedDriverDashboard({ driverId, onLogout }: EnhancedDriverDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);
  const [driverStatus, setDriverStatus] = useState<'available' | 'busy' | 'offline'>('available');
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const driverWsRef = React.useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getSetting: getSettingValue } = useUiSettings();

  const getS = (key: string, defaultValue: string) => getSettingValue(key) || defaultValue;

  const driverToken = localStorage.getItem('driver_token');

  // Driver WebSocket — connection dedicated to this driver (independent of customer WS_MANAGER)
  const activeTabRef = React.useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  useEffect(() => {
    if (!driverId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let alive = true;

    const connect = () => {
      if (!alive) return;
      ws = new WebSocket(wsUrl);
      driverWsRef.current = ws;

      ws.onopen = () => {
        try {
          ws?.send(JSON.stringify({
            type: 'auth',
            payload: { userId: driverId, userType: 'driver' }
          }));
          console.log('Driver WS connected and authenticated');
        } catch (e) {
          console.error('Driver WS auth failed:', e);
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          const relevantTypes = [
            'order_update', 'new_order_assigned', 'order_status_changed',
            'review_received', 'NEW_NOTIFICATION', 'notifications_updated', 'settings_changed'
          ];
          if (!relevantTypes.includes(message.type)) return;

          queryClient.invalidateQueries({ queryKey: [`/api/drivers/app/dashboard`] });
          queryClient.invalidateQueries({ queryKey: ['/api/drivers/orders/available', driverId] });
          queryClient.invalidateQueries({ queryKey: ['/api/drivers/orders', 'active', driverId] });
          queryClient.invalidateQueries({ queryKey: ['/api/drivers/wasalni', 'available', driverId] });
          queryClient.invalidateQueries({ queryKey: ['/api/drivers/wasalni', 'active', driverId] });
          queryClient.invalidateQueries({ queryKey: ['/api/ui-settings'] });

          if (message.type === 'review_received') {
            toast({
              title: '⭐ تقييم جديد!',
              description: `لقد حصلت على تقييم جديد: ${message.payload?.rating} نجوم`,
            });
          } else if (message.type === 'new_order_assigned') {
            toast({
              title: '📦 طلب جديد مُعين لك',
              description: message.payload?.message || 'يرجى مراجعة الطلب في صفحة الطلبات المتاحة',
            });
            if (activeTabRef.current === 'dashboard') {
              setActiveTab('available');
            }
          } else if (message.type === 'order_status_changed') {
            toast({
              title: 'تحديث حالة الطلب',
              description: `تغيرت حالة الطلب #${message.payload?.orderId?.slice(-6)} إلى ${message.payload?.status}`,
            });
          }
        } catch (err) {
          console.error('Driver WS message parse error:', err);
        }
      };

      ws.onclose = () => {
        if (alive) {
          reconnectTimeout = setTimeout(connect, 5000);
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      alive = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [driverId, queryClient, toast]);

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: [`/api/drivers/app/dashboard`],
    queryFn: async () => {
      const response = await fetch(`/api/drivers/app/dashboard`, {
        headers: {
          'Authorization': `Bearer ${driverToken}`
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          onLogout();
          throw new Error('انتهت الجلسة');
        }
        throw new Error('Failed to fetch dashboard data');
      }
      return response.json();
    },
    refetchInterval: 30000,
    enabled: !!driverToken
  });

  const { 
    availableOrders = [], 
    currentOrders = [], 
    stats = {} as DashboardStats,
    driver = {} as any
  } = dashboardData || {};

  useEffect(() => {
    if (driver && driver.isAvailable !== undefined) {
      setDriverStatus(driver.isAvailable ? 'available' : 'offline');
    }
  }, [driver]);

  const toggleStatusMutation = useMutation({
    mutationFn: async (newStatus: 'available' | 'offline') => {
      const response = await fetch(`/api/drivers/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error('فشل في تحديث الحالة');
      return response.json();
    },
    onSuccess: (data) => {
      setDriverStatus(data.status);
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/app/dashboard`] });
      toast({ title: `أنت الآن ${data.status === 'available' ? 'متصل' : 'غير متصل'}` });
    },
    onError: () => {
      toast({ title: 'خطأ في تحديث الحالة', variant: 'destructive' });
    }
  });

  const handleToggleStatus = () => {
    const newStatus = driverStatus === 'available' ? 'offline' : 'available';
    toggleStatusMutation.mutate(newStatus);
  };

  // Accept order mutation
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/app/dashboard`] });
      setAcceptingOrderId(null);
      toast({ title: 'تم قبول الطلب بنجاح', description: 'يمكنك الآن البدء في التوصيل' });
      setActiveTab('active');
    },
    onError: (error: any) => {
      setAcceptingOrderId(null);
      toast({
        title: 'فشل في قبول الطلب',
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  // Update order status mutation
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
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update order status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/app/dashboard`] });
      toast({ title: 'تم تحديث حالة الطلب بنجاح' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'فشل في تحديث حالة الطلب', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCurrentLocation([lat, lng]);
          
          // Send location update to server via the driver's dedicated WebSocket
          const ws = driverWsRef.current;
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'location_update',
              payload: {
                driverId,
                latitude: lat,
                longitude: lng,
                currentLocation: `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}`
              }
            }));
          }
        },
        (error) => {
          console.error('خطأ في الحصول على الموقع:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [driverId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500 text-white';
      case 'busy': return 'bg-orange-500 text-white';
      case 'offline': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return getS('driver_status_available', 'متاح');
      case 'busy': return 'مشغول';
      case 'offline': return getS('driver_status_offline', 'غير متاح');
      default: return 'غير معروف';
    }
  };

  const getOrderStatusBadge = (status: string) => {
    const config: { [key: string]: { label: string; color: string } } = {
      pending: { label: 'معلق', color: 'bg-yellow-500' },
      confirmed: { label: 'مؤكد', color: 'bg-blue-500' },
      preparing: { label: 'قيد التحضير', color: 'bg-orange-500' },
      ready: { label: 'جاهز', color: 'bg-green-500' },
      picked_up: { label: 'تم الاستلام', color: 'bg-blue-600' },
      on_way: { label: 'في الطريق', color: 'bg-purple-500' },
      delivered: { label: 'تم التوصيل', color: 'bg-green-600' },
      cancelled: { label: 'ملغي', color: 'bg-red-500' },
    };
    const { label, color } = config[status] || config.pending;
    return <Badge className={`${color} text-white border-none`}>{label}</Badge>;
  };

  const dashboardStats: DashboardStats = (stats as DashboardStats) || {
    todayOrders: 0,
    todayEarnings: 0,
    completedToday: 0,
    totalOrders: 0,
    totalEarnings: 0,
    averageRating: 0,
  };

  // Driver app UI settings visibility
  const showWallet = getS('driver_show_wallet', 'true') !== 'false';
  const showStats = getS('driver_show_stats', 'true') !== 'false';
  const showProfile = getS('driver_show_profile', 'true') !== 'false';
  const showHistory = getS('driver_show_history', 'true') !== 'false';

  // Nav Items - filtered by UI settings
  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: Activity, visible: true },
    { id: 'available', label: 'الطلبات المتاحة', icon: Bell, visible: true },
    { id: 'active', label: 'الطلبات النشطة', icon: Package, visible: true },
    { id: 'wallet', label: 'المحفظة', icon: DollarSign, visible: showWallet },
    { id: 'map', label: 'الخريطة', icon: MapPinned, visible: true },
    { id: 'history', label: 'السجل', icon: History, visible: showHistory },
    { id: 'stats', label: 'الإحصائيات', icon: TrendingUp, visible: showStats },
    { id: 'profile', label: 'الملف الشخصي', icon: User, visible: showProfile },
  ].filter(item => item.visible);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white text-right" dir="rtl">
      <div className="p-6 border-b">
        <div className="flex items-center justify-end gap-3">
          <div className="text-right">
            <h2 className="text-lg font-bold">{getS('driver_app_title', 'تطبيق السائق')}</h2>
            <p className="text-xs text-gray-500">ID: {driverId.slice(-6)}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
            <Truck className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={activeTab === item.id && !selectedOrderId ? 'default' : 'ghost'}
              className={`w-full justify-end gap-3 ${activeTab === item.id && !selectedOrderId ? 'bg-green-600 hover:bg-green-700' : ''}`}
              onClick={() => { setActiveTab(item.id); setSelectedOrderId(null); setSidebarOpen(false); }}
            >
              <span>{item.label}</span>
              <item.icon className="h-5 w-5" />
            </Button>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="outline"
          onClick={() => { onLogout(); setSidebarOpen(false); }}
          className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 border-red-100"
        >
          <span>تسجيل الخروج</span>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const ordersForMap = [
    ...availableOrders.map((o: any) => ({ ...o, type: 'available' })),
    ...currentOrders.map((o: any) => ({ ...o, type: 'current' }))
  ];

  if (isLoading && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  // Render correct page content based on activeTab
  const renderContent = () => {
    if (selectedOrderId) {
      return (
        <OrderDetailsPage 
          orderId={selectedOrderId} 
          driverId={driverId}
          onBack={() => setSelectedOrderId(null)}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6 p-4" dir="rtl">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-none shadow-sm bg-blue-50">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-blue-600 mb-1">أرباح اليوم</p>
                  <p className="text-xl font-bold text-blue-900">{formatCurrency(dashboardStats.todayEarnings)}</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-green-50">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-green-600 mb-1">طلبات اليوم</p>
                  <p className="text-xl font-bold text-green-900">{dashboardStats.todayOrders}</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-purple-50">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-purple-600 mb-1">المحفظة</p>
                  <p className="text-xl font-bold text-purple-900">{formatCurrency(parseFloat(dashboardData?.balance?.availableBalance || "0"))}</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-orange-50">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-orange-600 mb-1">التقييم</p>
                  <p className="text-xl font-bold text-orange-900">{dashboardStats.averageRating || '4.8'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Current Orders Section */}
            {currentOrders.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center justify-end gap-2">
                  <span>الطلبات النشطة</span>
                  <Package className="h-5 w-5 text-green-600" />
                </h3>
                <div className="grid gap-4">
                  {currentOrders.map((order: any) => (
                    <Card key={order.id} className="overflow-hidden border-2 border-green-100">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <Badge className="bg-green-600 text-white border-none">نشط</Badge>
                          <div className="text-right">
                            <p className="font-bold">طلب #{order.orderNumber || order.id.slice(-6)}</p>
                            <p className="text-sm text-gray-500">{order.customerName}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 text-sm text-gray-600 mb-4">
                          <span>{order.deliveryAddress}</span>
                          <MapPin className="h-4 w-4" />
                        </div>
                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          عرض التفاصيل والمتابعة
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Available Orders Shortcut */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Button variant="ghost" className="text-green-600" onClick={() => setActiveTab('available')}>عرض الكل</Button>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <span>طلبات متاحة بالقرب منك</span>
                  <Bell className="h-5 w-5 text-orange-500" />
                </h3>
              </div>
              
              {availableOrders.length === 0 ? (
                <Card className="bg-gray-50 border-dashed border-2">
                  <CardContent className="p-8 text-center text-gray-500">
                    لا توجد طلبات متاحة حالياً. تأكد من أن حالتك "متاح"
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {availableOrders.slice(0, 3).map((order: any) => (
                    <Card key={order.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <p className="font-bold text-green-600">{formatCurrency(parseFloat(order.totalAmount))}</p>
                          <p className="font-bold">طلب #{order.orderNumber || order.id.slice(-6)}</p>
                        </div>
                        <div className="flex items-center justify-end gap-2 text-sm text-gray-600 mb-4">
                          <span className="truncate max-w-[200px]">{order.deliveryAddress}</span>
                          <MapPin className="h-4 w-4" />
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full border-green-600 text-green-600 hover:bg-green-50"
                          onClick={() => { setAcceptingOrderId(order.id); acceptOrderMutation.mutate(order.id); }}
                          disabled={acceptingOrderId === order.id && acceptOrderMutation.isPending}
                        >
                          {acceptingOrderId === order.id && acceptOrderMutation.isPending ? 'جاري القبول...' : 'قبول الطلب فوراً'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case 'available':
        return <AvailableOrdersPage driverId={driverId} onSelectOrder={setSelectedOrderId} onOrderAccepted={() => setActiveTab('active')} />;
      case 'active':
        return <ActiveOrdersPage driverId={driverId} onSelectOrder={setSelectedOrderId} />;
      case 'wallet':
        return <WalletPage />;
      case 'map':
        return <div className="h-[calc(100vh-120px)] p-4"><DriverMapView currentLocation={currentLocation} orders={ordersForMap} /></div>;
      case 'history':
        return <HistoryPage driverId={driverId} onSelectOrder={setSelectedOrderId} />;
      case 'stats':
        return <StatsPage driverId={driverId} />;
      case 'profile':
        return <ProfilePage driverId={driverId} onLogout={onLogout} />;
      default:
        return <div>قيد التطوير...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Mobile Top Nav */}
      <div className="lg:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-50">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 w-72">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-green-600" />
          <span className="font-bold text-lg">تطبيق السائق</span>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant={driverStatus === 'available' ? 'default' : 'outline'}
            size="sm"
            className={driverStatus === 'available' ? 'bg-green-500 hover:bg-green-600' : 'border-gray-300'}
            onClick={handleToggleStatus}
            disabled={toggleStatusMutation.isPending}
          >
            {driverStatus === 'available' ? 'متصل' : 'متوقف'}
          </Button>
          <div className={`w-3 h-3 rounded-full ${driverStatus === 'available' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 h-screen sticky top-0 overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Desktop Header */}
        <header className="hidden lg:flex bg-white border-b h-16 items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
             <Badge className={getStatusColor(driverStatus)}>
              {getStatusText(driverStatus)}
            </Badge>
            <div className="text-sm text-gray-500">
              {currentLocation ? `إحداثياتك: ${currentLocation[0].toFixed(4)}, ${currentLocation[1].toFixed(4)}` : 'جاري جلب موقعك...'}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold">
              {driverId.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto max-w-5xl mx-auto w-full">
          {renderContent()}
        </div>

        {/* Mobile Bottom Nav */}
        <div className="lg:hidden bg-white border-t flex justify-around p-2 sticky bottom-0 z-50">
          <Button 
            variant="ghost" 
            className={`flex flex-col items-center gap-1 h-auto py-1 ${activeTab === 'dashboard' ? 'text-green-600' : 'text-gray-500'}`}
            onClick={() => { setActiveTab('dashboard'); setSelectedOrderId(null); }}
          >
            <Activity className="h-5 w-5" />
            <span className="text-[10px]">الرئيسية</span>
          </Button>
          <Button 
            variant="ghost" 
            className={`flex flex-col items-center gap-1 h-auto py-1 ${activeTab === 'available' ? 'text-green-600' : 'text-gray-500'}`}
            onClick={() => { setActiveTab('available'); setSelectedOrderId(null); }}
          >
            <Bell className="h-5 w-5" />
            <span className="text-[10px]">المتاحة</span>
          </Button>
          <Button 
            variant="ghost" 
            className={`flex flex-col items-center gap-1 h-auto py-1 ${activeTab === 'active' ? 'text-green-600' : 'text-gray-500'}`}
            onClick={() => { setActiveTab('active'); setSelectedOrderId(null); }}
          >
            <Package className="h-5 w-5" />
            <span className="text-[10px]">النشطة</span>
          </Button>
          {showWallet && (
            <Button 
              variant="ghost" 
              className={`flex flex-col items-center gap-1 h-auto py-1 ${activeTab === 'wallet' ? 'text-green-600' : 'text-gray-500'}`}
              onClick={() => { setActiveTab('wallet'); setSelectedOrderId(null); }}
            >
              <DollarSign className="h-5 w-5" />
              <span className="text-[10px]">المحفظة</span>
            </Button>
          )}
          {showProfile && (
            <Button 
              variant="ghost" 
              className={`flex flex-col items-center gap-1 h-auto py-1 ${activeTab === 'profile' ? 'text-green-600' : 'text-gray-500'}`}
              onClick={() => { setActiveTab('profile'); setSelectedOrderId(null); }}
            >
              <User className="h-5 w-5" />
              <span className="text-[10px]">حسابي</span>
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
