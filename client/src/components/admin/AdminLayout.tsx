import React, { useState, useRef, useLayoutEffect, useCallback, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  BarChart3, 
  ShoppingBag, 
  Truck, 
  Percent, 
  Settings, 
  Menu,
  LogOut,
  Package,
  Users,
  Bell,
  User,
  Tag,
  DollarSign,
  Shield,
  CreditCard,
  Smartphone,
  Database,
  Star,
  Wallet,
  Ticket,
  X,
  Store,
  FileBarChart,
  Receipt,
  TrendingUp,
  UserCog,
  Clock,
  Layers,
  Activity,
  Bike,
  FileText,
} from 'lucide-react';
import type { UiSettings } from '@shared/schema';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface MenuGroup {
  key: string;
  label: string;
  items: {
    icon: React.ElementType;
    label: string;
    path: string;
    permission: string | null;
    badge?: number;
  }[];
}

interface NavItemsProps {
  menuGroups: MenuGroup[];
  location: string;
  onNavigate: (path: string) => void;
  navRef: React.RefObject<HTMLDivElement>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

const NavItems = React.memo(({ menuGroups, location, onNavigate, navRef, onScroll }: NavItemsProps) => (
  <nav ref={navRef} className="flex-1 p-3 overflow-y-auto" onScroll={onScroll}>
    {menuGroups.map((group) => (
      <div key={group.key} className="mb-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase px-2 mb-1.5 tracking-widest">
          {group.label}
        </p>
        <div className="space-y-0.5">
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path ||
              (item.path !== '/admin' && location.startsWith(item.path));
            const badge = item.badge;

            return (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right transition-all duration-150 ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'text-gray-700 hover:bg-primary/5 hover:text-primary'
                }`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span className={`flex-1 font-medium text-sm text-right ${isActive ? 'text-white' : 'text-gray-800'}`}>
                  {item.label}
                </span>
                {badge && badge > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center font-bold">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </nav>
));
NavItems.displayName = 'NavItems';

interface SidebarHeaderProps {
  sidebarImageUrl: string;
  appName: string;
}

const SidebarHeader = React.memo(({ sidebarImageUrl, appName }: SidebarHeaderProps) => (
  <>
    {sidebarImageUrl ? (
      <div className="w-full h-36 border-b overflow-hidden relative flex-shrink-0">
        <img src={sidebarImageUrl} alt="خلفية القائمة" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
          <div>
            <h2 className="text-white font-bold text-sm leading-tight">لوحة تحكم وادارة</h2>
            <p className="text-white/80 text-xs font-medium">{appName}</p>
          </div>
        </div>
      </div>
    ) : (
      <div className="p-4 border-b flex-shrink-0 header-gradient">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">لوحة تحكم وادارة</h2>
            <p className="text-white/80 text-xs">{appName}</p>
          </div>
        </div>
      </div>
    )}
  </>
));
SidebarHeader.displayName = 'SidebarHeader';

interface AdminAvatarProps {
  name: string | null;
  size?: 'sm' | 'md';
}

const AdminAvatar = React.memo(({ name, size = 'md' }: AdminAvatarProps) => (
  <div className={`${size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'} bg-primary rounded-full flex items-center justify-center flex-shrink-0`}>
    <span className="text-white font-bold">
      {name ? name.charAt(0) : 'م'}
    </span>
  </div>
));
AdminAvatar.displayName = 'AdminAvatar';

interface SidebarAdminInfoProps {
  name: string;
  isSubAdmin: boolean;
}

const SidebarAdminInfo = React.memo(({ name, isSubAdmin }: SidebarAdminInfoProps) => (
  <div className="px-3 py-2.5 border-b bg-gray-50 flex-shrink-0">
    <div className="flex items-center gap-2">
      <AdminAvatar name={name} size="sm" />
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">
          {name || 'مدير النظام'}
        </p>
        <p className="text-xs text-gray-500">
          {isSubAdmin ? 'مشرف' : 'صلاحيات كاملة'}
        </p>
      </div>
    </div>
  </div>
));
SidebarAdminInfo.displayName = 'SidebarAdminInfo';

interface SidebarFooterProps {
  onLogout: () => void;
}

const SidebarFooter = React.memo(({ onLogout }: SidebarFooterProps) => (
  <div className="p-3 border-t flex-shrink-0">
    <Button
      variant="outline"
      onClick={onLogout}
      className="w-full flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
      size="sm"
    >
      <LogOut className="h-4 w-4" />
      تسجيل الخروج
    </Button>
  </div>
));
SidebarFooter.displayName = 'SidebarFooter';

interface NotificationsPanelProps {
  pendingOrders: any[];
  pendingWasalni: any[];
  pendingOrdersCount: number;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

const NotificationsPanel = React.memo(({ pendingOrders, pendingWasalni, pendingOrdersCount, onClose, onNavigate }: NotificationsPanelProps) => (
  <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50">
    <div className="p-3 border-b flex items-center justify-between">
      <h3 className="font-bold text-sm">الإشعارات</h3>
      <div className="flex items-center gap-2">
        {pendingOrdersCount > 0 && (
          <Badge variant="destructive" className="text-xs">{pendingOrdersCount} طلب جديد</Badge>
        )}
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
    <div className="max-h-64 overflow-y-auto">
      {pendingOrders.length > 0 || pendingWasalni.length > 0 ? (
        <>
          {pendingOrders.slice(0, 5).map((order: any) => (
            <div
              key={order.id}
              className="p-3 border-b hover:bg-primary/5 cursor-pointer transition-colors"
              onClick={() => { onNavigate('/admin/orders'); onClose(); }}
            >
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">طلب جديد #{order.orderNumber || order.id?.slice(0, 8)}</p>
                  <p className="text-xs text-gray-500 truncate">{order.customerName || 'عميل'} — {order.totalAmount} ريال</p>
                  <p className="text-xs text-red-500 mt-0.5">بانتظار تعيين سائق</p>
                </div>
              </div>
            </div>
          ))}
          {pendingWasalni.slice(0, 5).map((request: any) => (
            <div
              key={request.id}
              className="p-3 border-b hover:bg-orange-50 cursor-pointer transition-colors"
              onClick={() => { onNavigate('/admin/wasalni'); onClose(); }}
            >
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">طلب وصل لي جديد</p>
                  <p className="text-xs text-gray-500 truncate">{request.customerName} — {request.requestNumber}</p>
                  <p className="text-xs text-orange-600 mt-0.5">بانتظار المراجعة</p>
                </div>
                <Bike className="h-4 w-4 text-orange-400" />
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className="p-8 text-center text-gray-400">
          <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">لا توجد إشعارات جديدة</p>
        </div>
      )}
    </div>
    {(pendingOrders.length > 5 || pendingWasalni.length > 5) && (
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-primary hover:bg-primary/5 text-xs"
          onClick={() => { onNavigate(pendingOrders.length > 5 ? '/admin/orders' : '/admin/wasalni'); onClose(); }}
        >
          عرض جميع الطلبات
        </Button>
      </div>
    )}
  </div>
));
NotificationsPanel.displayName = 'NotificationsPanel';

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [location, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unassignedAlert, setUnassignedAlert] = useState<{
    orderId: string;
    orderNumber: string;
    customerName?: string;
    minutes: number;
    message: string;
  } | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const navScrollRef = useRef(0);
  const mobileNavScrollRef = useRef(0);

  const currentAdmin = useMemo(() => {
    try {
      const stored = localStorage.getItem('admin_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  }, []);

  const isSubAdmin = currentAdmin?.userType === 'sub_admin';
  const adminPermissions: string[] = currentAdmin?.permissions || [];
  const isSetupMode = currentAdmin?.isSetupMode === true || localStorage.getItem('admin_token') === 'SETUP_MODE';

  const hasPermission = useCallback((perm: string | null) => perm === null || !isSubAdmin || adminPermissions.includes(perm), [isSubAdmin, adminPermissions]);

  const { data: uiSettings } = useQuery<UiSettings[]>({
    queryKey: ['/api/admin/ui-settings'],
  });

  const queryClient = useQueryClient();

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket | null = (window as any).WS_MANAGER;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      (window as any).WS_MANAGER = ws;

      ws.onopen = () => {
        // Authenticate as admin
        ws?.send(JSON.stringify({
          type: "auth",
          payload: {
            userId: "admin_dashboard",
            userType: "admin"
          }
        }));
      };

      const handleMessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "order_update" || msg.type === "new_order" || msg.type === "NEW_NOTIFICATION" || msg.type === "settings_changed") {
            queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
            queryClient.invalidateQueries({ queryKey: ['/api/notifications/customer'] });
            queryClient.invalidateQueries({ queryKey: ['/api/wasalni'] });
            queryClient.invalidateQueries({ queryKey: ['/api/admin/ui-settings'] });
          }
          if (msg.type === "order_unassigned_alert") {
            const p = msg.payload || {};
            setUnassignedAlert({
              orderId: p.orderId,
              orderNumber: p.orderNumber,
              customerName: p.customerName,
              minutes: p.minutes,
              message: p.message || `الطلب رقم ${p.orderNumber} لم يُسند إلى سائق منذ ${p.minutes} دقيقة`,
            });
            try {
              const audio = new Audio('/notification.mp3');
              audio.play().catch(() => {});
            } catch (_) {}
            queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
          }
        } catch (_) {}
      };

      ws.addEventListener('message', handleMessage);

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    if (!ws || ws.readyState === WebSocket.CLOSED) {
      connect();
    } else {
      // If already connected, ensure we are authenticated as admin too
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "auth",
          payload: {
            userId: "admin_dashboard",
            userType: "admin"
          }
        }));
      }
    }

    return () => {
      // In layout, we might want to keep the socket alive but remove listeners
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [queryClient]);

  const { data: ordersData } = useQuery<any>({
    queryKey: ['/api/admin/orders'],
    refetchInterval: 30000,
  });

  const { data: wasalniData = [] } = useQuery<any[]>({
    queryKey: ['/api/wasalni'],
    refetchInterval: 30000,
  });

  const allOrders: any[] = ordersData?.orders || ordersData || [];
  const pendingOrders = allOrders.filter(
    (o: any) => o.status === 'pending' && !o.driverId
  );
  
  const pendingWasalni = wasalniData.filter(
    (w: any) => w.status === 'pending' && !w.driverId
  );

  const pendingOrdersCount = pendingOrders.length;
  const pendingWasalniCount = pendingWasalni.length;

  const getLogoUrl = useCallback(() => uiSettings?.find(s => s.key === 'header_logo_url')?.value || '', [uiSettings]);
  const getSidebarImageUrl = useCallback(() => uiSettings?.find(s => s.key === 'sidebar_image_url')?.value || '', [uiSettings]);
  const getAppName = useCallback(() => uiSettings?.find(s => s.key === 'app_name')?.value || 'السريع ون', [uiSettings]);

  const menuGroups = useMemo((): MenuGroup[] => [
    {
      key: 'main',
      label: 'الرئيسية',
      items: [
        { icon: BarChart3, label: 'لوحة التحكم', path: '/admin', permission: null },
        { icon: ShoppingBag, label: 'الطلبات', path: '/admin/orders', badge: pendingOrdersCount, permission: 'manage_orders' },
      ].filter(item => hasPermission(item.permission))
    },
    {
      key: 'restaurants',
      label: 'المتاجر والمطاعم',
      items: [
        { icon: Store, label: 'إدارة المتاجر', path: '/admin/restaurants', permission: 'manage_menu' },
        { icon: Layers, label: 'أقسام المتجر', path: '/admin/restaurant-sections', permission: 'manage_menu' },
        { icon: Receipt, label: 'حسابات المتاجر', path: '/admin/restaurant-accounts', permission: 'manage_menu' },
      ].filter(item => hasPermission(item.permission))
    },
    {
      key: 'store',
      label: 'المنتجات والعروض',
      items: [
        { icon: Tag, label: 'التصنيفات', path: '/admin/categories', permission: 'manage_categories' },
        { icon: Package, label: 'المنتجات', path: '/admin/menu-items', permission: 'manage_menu' },
        { icon: Percent, label: 'العروض الخاصة', path: '/admin/special-offers', permission: 'manage_menu' },
        { icon: Ticket, label: 'الكوبونات', path: '/admin/coupons', permission: 'manage_coupons' },
        { icon: CreditCard, label: 'طرق الدفع', path: '/admin/payment-methods', permission: 'manage_settings' },
      ].filter(item => hasPermission(item.permission))
    },
    {
      key: 'drivers',
      label: 'السائقون',
      items: [
        { icon: Truck, label: 'إدارة السائقين', path: '/admin/drivers', permission: 'manage_drivers' },
        { icon: DollarSign, label: 'رسوم التوصيل', path: '/admin/delivery-fees', permission: 'manage_drivers' },
        { icon: Wallet, label: 'محافظ السائقين', path: '/admin/wallet', permission: 'manage_drivers' },
      ].filter(item => hasPermission(item.permission))
    },
    {
      key: 'reports',
      label: 'التقارير والمالية',
      items: [
        { icon: TrendingUp, label: 'الإيرادات والتوزيع', path: '/admin/financial-reports', permission: 'view_reports' },
        { icon: Star, label: 'التقييمات', path: '/admin/ratings', permission: 'view_reports' },
      ].filter(item => hasPermission(item.permission))
    },
    {
      key: 'management',
      label: 'الإدارة والموارد',
      items: [
        { icon: UserCog, label: 'الموارد البشرية', path: '/admin/hr-management', permission: 'manage_customers' },
        { icon: Users, label: 'العملاء', path: '/admin/users', permission: 'manage_customers' },
        { icon: Shield, label: 'الأمن والخصوصية', path: '/admin/security', permission: 'manage_settings' },
        { icon: Bell, label: 'الإشعارات', path: '/admin/notifications', permission: 'manage_settings' },
        { icon: Bike, label: 'طلبات وصل لي', path: '/admin/wasalni', badge: pendingWasalniCount, permission: 'manage_orders' },
      ].filter(item => hasPermission(item.permission))
    },
    {
      key: 'settings',
      label: 'الإعدادات',
      items: [
        { icon: Smartphone, label: 'إدارة الواجهات والإعدادات', path: '/admin/ui-settings', permission: 'manage_settings' },
        { icon: FileText, label: 'تصميم المستندات والسندات', path: '/admin/invoice-design', permission: 'manage_settings' },
        { icon: Database, label: 'النسخ الاحتياطي', path: '/admin/backup', permission: 'manage_settings' },
        { icon: User, label: 'الملف الشخصي', path: '/admin/profile', permission: null },
      ].filter(item => hasPermission(item.permission))
    },
  ], [pendingOrdersCount, pendingWasalniCount, hasPermission]);

  const handleNavScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    navScrollRef.current = (e.currentTarget as HTMLDivElement).scrollTop;
  }, []);

  const handleMobileNavScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    mobileNavScrollRef.current = (e.currentTarget as HTMLDivElement).scrollTop;
  }, []);

  useLayoutEffect(() => {
    if (navRef.current && navScrollRef.current > 0) {
      navRef.current.scrollTop = navScrollRef.current;
    }
    if (mobileNavRef.current && mobileNavScrollRef.current > 0) {
      mobileNavRef.current.scrollTop = mobileNavScrollRef.current;
    }
  });

  const handleNavigation = useCallback((path: string) => {
    setLocation(path);
    setIsSidebarOpen(false);
  }, [setLocation]);

  const handleLogout = useCallback(() => {
    try {
      const adminUser = localStorage.getItem('admin_user');
      const user = adminUser ? JSON.parse(adminUser) : null;
      if (user && user.id !== 'setup') {
        fetch('/api/admin/security/log-logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
          body: JSON.stringify({ userId: user.id, userName: user.name }),
        }).catch(() => {});
      }
    } catch {}
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.href = '/admin-login';
  }, []);

  const getCurrentPageLabel = useCallback(() => {
    for (const group of menuGroups) {
      for (const item of group.items) {
        if (location === item.path || (item.path !== '/admin' && location.startsWith(item.path))) {
          return item.label;
        }
      }
    }
    return 'لوحة التحكم';
  }, [location, menuGroups]);

  const adminName = currentAdmin?.name || 'مدير النظام';
  const sidebarImageUrl = getSidebarImageUrl();
  const appName = getAppName();
  const logoUrl = getLogoUrl();

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden" dir="rtl">
      <aside className="hidden lg:flex flex-col w-64 bg-white border-l shadow-lg flex-shrink-0 h-full overflow-hidden">
        <SidebarHeader sidebarImageUrl={sidebarImageUrl} appName={appName} />
        <SidebarAdminInfo name={adminName} isSubAdmin={isSubAdmin} />
        <NavItems
          menuGroups={menuGroups}
          location={location}
          onNavigate={handleNavigation}
          navRef={navRef}
          onScroll={handleNavScroll}
        />
        <SidebarFooter onLogout={handleLogout} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b flex items-center justify-between px-4 py-3 flex-shrink-0 shadow-sm z-30">
          <div className="flex items-center gap-3">
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 p-0 flex flex-col border-none">
                <SidebarHeader sidebarImageUrl={sidebarImageUrl} appName={appName} />
                <SidebarAdminInfo name={adminName} isSubAdmin={isSubAdmin} />
                <NavItems
                  menuGroups={menuGroups}
                  location={location}
                  onNavigate={handleNavigation}
                  navRef={mobileNavRef}
                  onScroll={handleMobileNavScroll}
                />
                <SidebarFooter onLogout={handleLogout} />
              </SheetContent>
            </Sheet>

            {logoUrl ? (
              <img src={logoUrl} alt="شعار" className="h-8 object-contain" />
            ) : (
              <div>
                <p className="font-bold text-gray-900 text-sm leading-tight hidden lg:block">
                  لوحة تحكم وادارة — {getCurrentPageLabel()}
                </p>
                <p className="font-bold text-gray-900 text-sm leading-tight lg:hidden">
                  {getCurrentPageLabel()}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="relative h-9 w-9"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="h-5 w-5" />
                {(pendingOrdersCount + pendingWasalniCount) > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
                    {(pendingOrdersCount + pendingWasalniCount) > 9 ? '9+' : (pendingOrdersCount + pendingWasalniCount)}
                  </span>
                )}
              </Button>
              {showNotifications && (
                <NotificationsPanel
                  pendingOrders={pendingOrders}
                  pendingWasalni={pendingWasalni}
                  pendingOrdersCount={pendingOrdersCount + pendingWasalniCount}
                  onClose={() => setShowNotifications(false)}
                  onNavigate={handleNavigation}
                />
              )}
            </div>
            <button
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => handleNavigation('/admin/profile')}
            >
              <AdminAvatar name={adminName} />
              <span className="text-sm font-medium text-gray-700">
                {adminName}
              </span>
            </button>
            <button
              className="lg:hidden"
              onClick={() => handleNavigation('/admin/profile')}
            >
              <AdminAvatar name={adminName} size="sm" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {isSetupMode && (
            <div className="bg-amber-500 text-white px-4 py-2.5 text-sm flex items-center justify-between gap-3 flex-wrap" dir="rtl">
              <span className="font-medium">
                ⚠️ أنت في وضع الإعداد الأولي — أنشئ حساب المدير الآن.
              </span>
              <button
                onClick={handleLogout}
                className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1 rounded-lg transition-colors flex-shrink-0"
              >
                تسجيل الخروج
              </button>
            </div>
          )}
          {children}
        </main>
      </div>

      {showNotifications && (
        <div className="fixed inset-0 z-20" onClick={() => setShowNotifications(false)} />
      )}

      <AlertDialog open={!!unassignedAlert} onOpenChange={(open) => !open && setUnassignedAlert(null)}>
        <AlertDialogContent dir="rtl" className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600 text-lg font-black">
              <Bell className="h-5 w-5" />
              تنبيه: طلب بدون سائق
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-right">
              <p className="text-base text-gray-800">
                {unassignedAlert?.message}
              </p>
              {unassignedAlert?.customerName && (
                <p className="text-sm text-gray-600">
                  العميل: <span className="font-semibold">{unassignedAlert.customerName}</span>
                </p>
              )}
              <p className="text-sm text-amber-700 font-medium">
                يرجى تعيين سائق لهذا الطلب في أقرب وقت لتجنّب تأخير التوصيل.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>تجاهل</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary hover:bg-primary/90"
              onClick={() => {
                if (unassignedAlert?.orderId) {
                  setLocation(`/admin/orders?focus=${unassignedAlert.orderId}`);
                }
                setUnassignedAlert(null);
              }}
            >
              فتح الطلب وتعيين سائق
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
