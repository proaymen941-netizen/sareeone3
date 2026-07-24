import { useState, useEffect } from 'react';
import { 
  MapPin, Phone, Clock, CheckCircle, Bell, Package, DollarSign, User, 
  BarChart3, Navigation, LogOut, Wallet, Menu, X, ChevronRight,
  TrendingUp, Award, Calendar, Eye, AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  notes?: string;
  totalAmount: string;
  estimatedTime: string;
  status: string;
  items: string | OrderItem[];
  createdAt: string;
  deliveryFee: string;
  subtotal: string;
  customerLocationLat?: string;
  customerLocationLng?: string;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  earnings: string;
  isAvailable: boolean;
  commissionRate?: string;
}

interface DriverStats {
  today: {
    orders: number;
    earnings: number;
  };
  week: {
    orders: number;
    earnings: number;
  };
  total: {
    orders: number;
    earnings: number;
    rating: number;
  };
}

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type: string;
}

interface WalletData {
  balance: number;
  totalEarnings: number;
  withdrawn: number;
  pending: number;
}

const STEPS = [
  { id: 'available', label: 'الطلبات المتاحة', icon: Package },
  { id: 'accepted', label: 'طلباتي', icon: Navigation },
  { id: 'stats', label: 'الإحصائيات', icon: BarChart3 },
  { id: 'wallet', label: 'المحفظة', icon: Wallet },
  { id: 'profile', label: 'الملف الشخصي', icon: User },
];

export const DriverDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('available');
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('driver_token');
    const driverData = localStorage.getItem('driver_user');
    
    if (token && driverData) {
      try {
        const user = JSON.parse(driverData);
        setDriverId(user.id);
        setDriver(user);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing driver data:', error);
        onLogout();
      }
    } else {
      onLogout();
    }
  }, [onLogout]);

  useEffect(() => {
    if (!isAuthenticated || !driverId) return;

    fetchAllData();
    
    const interval = setInterval(() => {
      fetchAllData();
    }, 15000);

    return () => clearInterval(interval);
  }, [isAuthenticated, driverId]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchDriverInfo(),
      fetchAvailableOrders(),
      fetchMyOrders(),
      fetchNotifications(),
      fetchDriverStats(),
      fetchDriverWallet()
    ]);
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('driver_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };
    
    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401) {
      onLogout();
      throw new Error('Authentication failed');
    }
    
    return response;
  };

  const fetchDriverInfo = async () => {
    try {
      const response = await fetchWithAuth(`/api/drivers/${driverId}`);
      const data = await response.json();
      setDriver(data);
    } catch (error) {
      console.error('Error fetching driver info:', error);
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      const response = await fetchWithAuth(`/api/orders?available=true&driverId=${driverId}`);
      const data = await response.json();
      setAvailableOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching available orders:', error);
    }
  };

  const fetchMyOrders = async () => {
    try {
      const response = await fetchWithAuth(`/api/orders?driverId=${driverId}`);
      const data = await response.json();
      setMyOrders(Array.isArray(data) ? data.filter((o: Order) => ['confirmed', 'assigned', 'picked_up', 'on_way'].includes(o.status)) : []);
    } catch (error) {
      console.error('Error fetching my orders:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetchWithAuth(`/api/notifications?recipientType=driver&recipientId=${driverId}`);
      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchDriverStats = async () => {
    try {
      const response = await fetchWithAuth(`/api/drivers/${driverId}/balance`);
      const data = await response.json();
      // Simple mapping for UI
      setStats({
        today: { orders: 0, earnings: 0 },
        week: { orders: 0, earnings: 0 },
        total: { 
          orders: 0, 
          earnings: parseFloat(data.totalEarned || '0'), 
          rating: 5.0 
        }
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchDriverWallet = async () => {
    try {
      const response = await fetchWithAuth(`/api/drivers/${driverId}/balance`);
      const data = await response.json();
      setWallet({
        balance: parseFloat(data.availableBalance || '0'),
        totalEarnings: parseFloat(data.totalEarned || '0'),
        withdrawn: parseFloat(data.withdrawnAmount || '0'),
        pending: 0
      });
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const acceptOrder = async (orderId: string) => {
    setAcceptingOrderId(orderId);
    try {
      // السائق يؤكد استلام الطلب الذي عينه له المدير
      const response = await fetchWithAuth(`/api/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          status: 'confirmed', 
          updatedBy: driverId, 
          updatedByType: 'driver' 
        })
      });
      
      if (response.ok) {
        toast({
          title: "✅ تم استلام الطلب",
          description: "تم نقل الطلب إلى قائمة طلباتك الجارية",
        });
        await fetchAllData();
        setActiveTab('accepted');
      } else {
        const err = await response.json();
        toast({
          title: "❌ خطأ",
          description: err.error || "فشل في استلام الطلب",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ خطأ",
        description: "حدث خطأ أثناء الاتصال بالسيرفر",
        variant: "destructive",
      });
    } finally {
      setAcceptingOrderId(null);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdatingOrderId(orderId);
    try {
      const response = await fetchWithAuth(`/api/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({ status, updatedBy: driverId, updatedByType: 'driver' })
      });
      
      if (response.ok) {
        toast({
          title: "✅ تم التحديث",
          description: `تم تحديث حالة الطلب بنجاح`,
        });
        await fetchAllData();
      }
    } catch (error) {
      toast({
        title: "❌ خطأ",
        description: "فشل في تحديث حالة الطلب",
        variant: "destructive",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const toggleAvailability = async () => {
    if (!driver) return;
    
    try {
      const response = await fetchWithAuth(`/api/drivers/${driverId}`, {
        method: 'PUT',
        body: JSON.stringify({ isAvailable: !driver.isAvailable })
      });
      
      if (response.ok) {
        setDriver({ ...driver, isAvailable: !driver.isAvailable });
        toast({
          title: !driver.isAvailable ? "🟢 أنت الآن متاح لاستلام الطلبات" : "🔴 تم تغيير الحالة إلى غير متاح",
        });
      }
    } catch (error) {
      toast({
        title: "❌ خطأ في تحديث الحالة",
        variant: "destructive",
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      {/* Desktop Top Navigation Bar */}
      <div className="hidden lg:block bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="px-6 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Navigation size={24} />
              </div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">تطبيق السائق</h1>
            </div>
            
            <div className="h-10 w-px bg-gray-100 mx-2" />
            
            <nav className="flex items-center gap-1">
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isActive = activeTab === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveTab(step.id)}
                    className={`px-4 py-2 rounded-xl font-bold transition-all duration-200 flex items-center gap-2 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{step.label}</span>
                    {step.id === 'available' && availableOrders.length > 0 && (
                      <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-black">
                        {availableOrders.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-left">
              <p className="text-xs text-gray-500 font-bold leading-none mb-1 text-left">مرحباً بك</p>
              <p className="text-sm font-black text-gray-900 leading-none">{driver?.name}</p>
            </div>

            <button 
              onClick={toggleAvailability}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all shadow-sm ${
                driver?.isAvailable
                  ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              <div className={`h-2.5 w-2.5 rounded-full animate-pulse ${driver?.isAvailable ? 'bg-green-600' : 'bg-gray-400'}`} />
              {driver?.isAvailable ? 'متصل ومتاح' : 'غير متصل'}
            </button>

            <button
              onClick={onLogout}
              className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all border border-red-100"
              title="تسجيل الخروج"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 lg:hidden z-40" onClick={() => setSidebarOpen(false)} />
      )}
      <div className={`fixed top-0 right-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 z-50 lg:hidden ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <SidebarContent 
          activeTab={activeTab} 
          onTabChange={(tabId: string) => {
            setActiveTab(tabId);
            setSidebarOpen(false);
          }}
          availableOrders={availableOrders}
          myOrders={myOrders}
        />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div className="flex-1 min-w-0 text-center">
              <h1 className="text-lg font-bold text-gray-900 truncate">
                مرحباً {driver?.name}
              </h1>
              <p className="text-xs text-gray-600 font-bold">
                {driver?.isAvailable ? '🟢 متصل حالياً' : '🔴 غير متصل'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative p-2">
                <Bell className="text-gray-600" size={20} />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-black">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-red-600 rounded-lg"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 max-w-6xl mx-auto">
          {activeTab === 'available' && (
            <AvailableOrdersSection orders={availableOrders} acceptingOrderId={acceptingOrderId} onAccept={acceptOrder} driver={driver} />
          )}
          {activeTab === 'accepted' && (
            <MyOrdersSection orders={myOrders} onStatusUpdate={updateOrderStatus} updatingOrderId={updatingOrderId} selectedOrder={selectedOrder} setSelectedOrder={setSelectedOrder} />
          )}
          {activeTab === 'stats' && (
            <StatsSection stats={stats} />
          )}
          {activeTab === 'wallet' && (
            <WalletSection wallet={wallet} withdrawalAmount={withdrawalAmount} setWithdrawalAmount={setWithdrawalAmount} driverId={driverId} fetchWallet={fetchDriverWallet} />
          )}
          {activeTab === 'profile' && (
            <ProfileSection driver={driver} />
          )}
        </div>
      </div>
    </div>
  );
};

function SidebarContent({ activeTab, onTabChange, availableOrders, myOrders }: any) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="text-xl font-bold text-gray-900">📍 تطبيق السائق</h2>
        <p className="text-sm text-gray-600 font-bold">نظام السريع ون للتوصيل</p>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = activeTab === step.id;
          return (
            <button
              key={step.id}
              onClick={() => onTabChange(step.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-right ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ChevronRight size={18} className={isActive ? 'translate-x-1' : ''} />
              <Icon size={20} />
              <span className="flex-1">{step.label}</span>
              {step.id === 'available' && availableOrders.filter((o: any) => o.status === 'assigned').length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-black">
                  {availableOrders.filter((o: any) => o.status === 'assigned').length}
                </span>
              )}
              {step.id === 'accepted' && myOrders.filter((o: any) => ['confirmed', 'picked_up', 'on_way'].includes(o.status)).length > 0 && (
                <span className="bg-orange-500 text-white text-xs rounded-full px-2 py-0.5 font-black">
                  {myOrders.filter((o: any) => ['confirmed', 'picked_up', 'on_way'].includes(o.status)).length}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function AvailableOrdersSection({ orders, acceptingOrderId, onAccept, driver }: any) {
  // تصفية الطلبات المعينة لهذا السائق فقط والتي لم يقبلها بعد
  const filteredOrders = orders.filter((o: Order) => o.status === 'assigned');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <Package className="text-blue-600" />
          طلبات تم تكليفك بها
        </h2>
        <span className="bg-blue-600 text-white px-3 py-1 rounded-full font-black text-sm">
          {filteredOrders.length} طلب جديد
        </span>
      </div>

      {!driver?.isAvailable && (
        <div className="bg-orange-50 border-r-4 border-orange-500 p-4 rounded-xl shadow-sm">
          <div className="flex gap-3">
            <AlertCircle className="text-orange-600 flex-shrink-0" size={24} />
            <div>
              <p className="text-orange-900 font-bold text-sm">أنت غير متصل الآن!</p>
              <p className="text-orange-800 text-xs mt-1">يجب تفعيل حالة "متصل" من الأعلى لتتمكن من استلام الطلبات الجديدة.</p>
            </div>
          </div>
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="text-gray-300" size={40} />
          </div>
          <p className="text-gray-500 font-bold text-lg">لا توجد طلبات معينة لك حالياً</p>
          <p className="text-gray-400 text-sm mt-1">سيتم إخطارك من قبل الإدارة فور تكليفك بطلب جديد</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {filteredOrders.map((order: Order) => (
            <OrderCard key={order.id} order={order} isLoading={acceptingOrderId === order.id} onAccept={onAccept} actionType="accept" />
          ))}
        </div>
      )}
    </div>
  );
}

function MyOrdersSection({ orders, onStatusUpdate, updatingOrderId, selectedOrder, setSelectedOrder }: any) {
  // تصفية الطلبات النشطة فقط (المستلمة وفي الطريق)
  const filteredOrders = orders.filter((o: Order) => 
    ['confirmed', 'picked_up', 'on_way'].includes(o.status)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <Navigation className="text-orange-600" />
          طلباتي الجارية
        </h2>
        <span className="bg-orange-600 text-white px-3 py-1 rounded-full font-black text-sm">
          {filteredOrders.length} طلب نشط
        </span>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Navigation className="text-gray-300" size={40} />
          </div>
          <p className="text-gray-500 font-bold text-lg">ليس لديك طلبات نشطة حالياً</p>
          <p className="text-gray-400 text-sm mt-1">توجه إلى قسم "الطلبات المتاحة" لتأكيد الطلبات المكلف بها</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {filteredOrders.map((order: Order) => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onStatusUpdate={onStatusUpdate} 
              isLoading={updatingOrderId === order.id}
              actionType="status"
              isSelected={selectedOrder?.id === order.id}
              onSelect={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, isLoading, onAccept, onStatusUpdate, actionType, isSelected, onSelect }: any) {
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
  const nextAction = actionType === 'status' ? getNextAction(order.status) : null;
  const adminPhone = "770000000"; // رقم الإدارة الافتراضي

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'assigned': '✓ تم التكليف',
      'picked_up': '📦 تم الاستلام',
      'on_way': '🚗 في الطريق',
      'delivered': '✅ تم التسليم',
      'confirmed': '⏳ بانتظار التحرك',
      'pending': '⏳ بانتظار الموافقة',
    };
    return statusMap[status] || status;
  };

  return (
    <div className={`bg-white rounded-2xl border-2 transition-all duration-300 ${
      isSelected 
        ? 'border-blue-600 shadow-xl ring-4 ring-blue-50' 
        : 'border-gray-100 hover:border-blue-200 shadow-sm'
    }`}>
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4" onClick={onSelect}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded">#{order.orderNumber?.split('-')[1]?.substring(0, 6) || order.id?.substring(0, 6)}</span>
              <h3 className="text-lg font-black text-gray-900 truncate">{order.customerName}</h3>
            </div>
            <p className="text-xs text-gray-500 font-bold flex items-center gap-1">
              <Clock size={12} />
              {new Date(order.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-green-600 tracking-tighter">{formatCurrency(order.totalAmount)}</div>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block mt-1 ${
              order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {getStatusText(order.status)}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-3 mb-5" onClick={onSelect}>
          <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <MapPin className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase">عنوان التوصيل:</p>
              <p className="text-sm text-gray-800 font-bold leading-tight mt-0.5">{order.deliveryAddress}</p>
            </div>
          </div>
        </div>

        {/* Detailed View - Opens when selected */}
        {isSelected && (
          <div className="mt-5 pt-5 border-t-2 border-dashed border-gray-100 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Items List */}
            <div className="bg-blue-50/50 p-4 rounded-2xl mb-5 border border-blue-100">
              <h4 className="font-black text-blue-900 mb-4 flex items-center gap-2 text-sm">
                <Package size={18} />
                تفاصيل الطلب:
              </h4>
              <div className="space-y-2">
                {items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-blue-50">
                    <span className="text-sm font-bold text-gray-800">
                      {item.name} <span className="text-blue-600 mx-1">×</span> {item.quantity}
                    </span>
                    <span className="text-sm font-black text-gray-900">
                      {formatCurrency(parseFloat(item.price) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Details */}
            <div className="bg-white border-2 border-green-50 p-4 rounded-2xl mb-5 shadow-sm">
              <h4 className="font-black text-green-900 mb-4 flex items-center gap-2 text-sm">
                <DollarSign size={18} />
                الحساب والعمولة:
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-500 font-bold">
                  <span>قيمة المشتريات:</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500 font-bold">
                  <span>أجرة التوصيل:</span>
                  <span className="text-green-600">{formatCurrency(order.deliveryFee)}</span>
                </div>
                <div className="h-px bg-gray-100 my-1"></div>
                <div className="flex justify-between items-center bg-green-50 p-3 rounded-xl border border-green-100">
                  <span className="font-black text-green-800 text-xs">عمولتك الصافية (70%):</span>
                  <span className="text-xl font-black text-green-700">
                    {formatCurrency((parseFloat(order.deliveryFee) * 70) / 100)}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 font-black px-1 mt-1 uppercase">
                  <span>الإجمالي المطلوب من الزبون:</span>
                  <span className="text-gray-700">{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Contact & Map Buttons */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <a
                href={`tel:${order.customerPhone}`}
                className="flex flex-col items-center justify-center gap-2 bg-green-600 text-white p-4 rounded-2xl font-black hover:bg-green-700 transition-all shadow-lg active:scale-95"
              >
                <Phone size={24} />
                <span className="text-xs">اتصال بالزبون</span>
              </a>
              <a
                href={`tel:${adminPhone}`}
                className="flex flex-col items-center justify-center gap-2 bg-[#F05215] text-white p-4 rounded-2xl font-black hover:bg-[#C03A0A] transition-all shadow-lg active:scale-95"
              >
                <User size={24} />
                <span className="text-xs">اتصال بالإدارة</span>
              </a>
              {order.customerLocationLat && order.customerLocationLng && (
                <a
                  href={`https://www.google.com/maps?q=${order.customerLocationLat},${order.customerLocationLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="col-span-2 flex items-center justify-center gap-3 bg-blue-600 text-white p-5 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                >
                  <Navigation size={24} />
                  <span>تتبع موقع الزبون على الخرائط</span>
                </a>
              )}
            </div>

            {order.notes && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl shadow-inner">
                <p className="text-[10px] font-black text-yellow-700 mb-1 uppercase tracking-wider">📝 ملاحظات إضافية:</p>
                <p className="text-sm text-yellow-900 font-bold">{order.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Quick Action Buttons */}
        <div className="flex gap-3">
          {actionType === 'accept' ? (
            <button
              onClick={() => onAccept(order.id)}
              disabled={isLoading}
              className={`flex-1 py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${
                isLoading 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
              }`}
            >
              {isLoading ? (
                <div className="h-6 w-6 border-3 border-gray-400 border-t-transparent animate-spin rounded-full"></div>
              ) : (
                <>
                  <CheckCircle size={24} />
                  <span>قبول وتوصيل الطلب</span>
                </>
              )}
            </button>
          ) : nextAction ? (
            <button
              onClick={() => onStatusUpdate(order.id, nextAction.action)}
              disabled={isLoading}
              className={`flex-1 py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${
                isLoading
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-600 text-white hover:bg-orange-700 active:scale-95 animate-pulse'
              }`}
            >
              {isLoading ? (
                <div className="h-6 w-6 border-3 border-white border-t-transparent animate-spin rounded-full"></div>
              ) : (
                <>
                  {nextAction.action === 'picked_up' && <Package size={24} />}
                  {nextAction.action === 'on_way' && <Navigation size={24} />}
                  {nextAction.action === 'delivered' && <CheckCircle size={24} />}
                  <span>{nextAction.label}</span>
                </>
              )}
            </button>
          ) : order.status === 'delivered' ? (
            <div className="w-full bg-green-50 border-2 border-green-200 rounded-2xl p-4 text-center">
              <p className="text-green-800 font-black flex items-center justify-center gap-2">
                <CheckCircle size={24} />
                تم التوصيل بنجاح ✓
              </p>
            </div>
          ) : null}
          
          {!isSelected && (
            <button
              onClick={onSelect}
              className="px-5 bg-gray-100 text-gray-700 rounded-2xl font-black hover:bg-gray-200 transition-all flex items-center justify-center shadow-sm"
            >
              <Eye size={24} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatsSection({ stats }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <BarChart3 className="text-blue-600" />
          إحصائيات الأداء
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="إجمالي الأرباح"
          value={formatCurrency(stats?.total?.earnings || 0)}
          icon={<TrendingUp className="text-green-600" size={32} />}
          bgColor="bg-green-50"
          borderColor="border-green-100"
        />
        <StatCard
          title="إجمالي الطلبات"
          value={stats?.total?.orders || 0}
          icon={<Package className="text-blue-600" size={32} />}
          bgColor="bg-blue-50"
          borderColor="border-blue-100"
        />
        <StatCard
          title="التقييم العام"
          value={`${stats?.total?.rating?.toFixed(1) || '5.0'}`}
          icon={<Award className="text-yellow-600" size={32} />}
          bgColor="bg-yellow-50"
          borderColor="border-yellow-100"
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, bgColor, borderColor }: any) {
  return (
    <div className={`${bgColor} ${borderColor} border-2 rounded-2xl p-6 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-xs font-black uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-black text-gray-900 mt-2">{value}</p>
        </div>
        <div className="p-3 bg-white/50 rounded-xl shadow-inner">
          {icon}
        </div>
      </div>
    </div>
  );
}

function WalletSection({ wallet, withdrawalAmount, setWithdrawalAmount, driverId, fetchWallet }: any) {
  const { toast } = useToast();

  const handleWithdrawal = async () => {
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      toast({ title: "خطأ", description: "الرجاء إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }

    if (wallet && parseFloat(withdrawalAmount) > wallet.balance) {
      toast({ title: "رصيد غير كافي", description: "المبلغ المطلوب أكبر من الرصيد المتاح", variant: "destructive" });
      return;
    }

    toast({ title: "جاري المعالجة", description: "سيتم تحويل طلبك للإدارة للمراجعة" });
    setWithdrawalAmount('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Wallet className="text-blue-600" />
          المحفظة المالية
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="الرصيد المتاح للسحب"
          value={formatCurrency(wallet?.balance || 0)}
          icon={<Wallet className="text-blue-600" size={32} />}
          bgColor="bg-blue-50"
          borderColor="border-blue-100"
        />
        <StatCard
          title="إجمالي الأرباح"
          value={formatCurrency(wallet?.totalEarnings || 0)}
          icon={<TrendingUp className="text-green-600" size={32} />}
          bgColor="bg-green-50"
          borderColor="border-green-100"
        />
        <StatCard
          title="مبالغ تم سحبها"
          value={formatCurrency(wallet?.withdrawn || 0)}
          icon={<CheckCircle className="text-gray-600" size={32} />}
          bgColor="bg-gray-50"
          borderColor="border-gray-200"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
          <DollarSign className="text-blue-600" />
          طلب سحب الرصيد
        </h3>
        <div className="max-w-md space-y-4">
          <div>
            <label className="block text-xs font-black text-gray-400 mb-2 uppercase">المبلغ المراد سحبه:</label>
            <div className="relative">
              <input
                type="number"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-black text-lg transition-all"
                placeholder="0.00"
              />
              <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-400">ريال</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 font-bold italic">متاح للسحب: {formatCurrency(wallet?.balance || 0)}</p>
          </div>
          <button
            onClick={handleWithdrawal}
            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-lg active:scale-95"
          >
            تأكيد طلب السحب
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ driver }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <User className="text-blue-600" />
          معلومات الحساب
        </h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8 max-w-2xl">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-blue-100 rounded-3xl flex items-center justify-center text-blue-600 shadow-inner">
            <User size={48} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 leading-tight">{driver?.name}</h3>
            <p className="text-blue-600 font-bold">{driver?.phone}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-gray-50">
          <div>
            <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">نوع المركبة:</label>
            <p className="text-lg font-bold text-gray-800">{driver?.vehicle || 'سيارة'}</p>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">حالة الحساب:</label>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
              driver?.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`h-2 w-2 rounded-full ${driver?.isAvailable ? 'bg-green-600' : 'bg-gray-400'}`} />
              {driver?.isAvailable ? 'نشط ومتاح' : 'غير متصل'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getNextAction(status: string) {
  switch (status) {
    case 'confirmed': return { action: 'picked_up', label: '📦 تم الاستلام من المتجر' };
    case 'assigned': return { action: 'picked_up', label: '📦 تم الاستلام من المتجر' };
    case 'picked_up': return { action: 'on_way', label: '🚗 في الطريق للزبون' };
    case 'on_way': return { action: 'delivered', label: '✅ تم التسليم للزبون' };
    default: return null;
  }
}
