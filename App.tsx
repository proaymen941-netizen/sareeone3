import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LocationProvider, useUserLocation } from "./context/LocationContext";
import { UiSettingsProvider, useUiSettings } from "./context/UiSettingsContext";
import { NotificationProvider } from "./context/NotificationContext";
import { LocationPermissionModal } from "./components/LocationPermissionModal";
import Layout from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import DriverLoginPage from "./pages/driver/DriverLoginPage";
import AdminApp from "./pages/AdminApp";
import DriverApp from "./pages/driver/DriverApp";
import { useState, useEffect } from "react";
import Home from "./pages/Home";
import Restaurant from "./pages/Restaurant";
import Cart from "./pages/Cart";
import Profile from "./pages/Profile";
import Location from "./pages/Location";
import OrderTracking from "./pages/OrderTracking";
import OrdersPage from "./pages/OrdersPage";
import TrackOrdersPage from "./pages/TrackOrdersPage";
import Settings from "./pages/Settings";
import Privacy from "./pages/Privacy";
import SearchPage from "./pages/SearchPage";
import CustomerAuthPage from "./pages/CustomerAuthPage";
import NotFound from "@/pages/not-found";
import Favorites from "./pages/Favorites";
import WasalniPage from "./pages/WasalniPage";
import CategoryPage from "./pages/CategoryPage";

// شاشة التحميل
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">جاري التحميل...</p>
      </div>
    </div>
  );
}

// حارس مسار لوحة التحكم: يسمح بالدخول إذا كان هناك token أو لا يوجد مديرون في قاعدة البيانات
function AdminGuard() {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'need-login'>('loading');

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setStatus('allowed');
      return;
    }
    // لا يوجد token — تحقق إذا كان هناك مديرون في قاعدة البيانات
    fetch('/api/auth/setup-status')
      .then(r => r.json())
      .then((data: { adminExists: boolean }) => {
        if (!data.adminExists) {
          // لا يوجد مديرون → إعداد أولي → منح وصول مؤقت
          localStorage.setItem('admin_token', 'SETUP_MODE');
          localStorage.setItem('admin_user', JSON.stringify({
            id: 'setup',
            name: 'إعداد أولي',
            userType: 'admin',
            isSetupMode: true,
          }));
          setStatus('allowed');
        } else {
          setStatus('need-login');
        }
      })
      .catch(() => setStatus('need-login'));
  }, []);

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'need-login') {
    window.location.href = '/admin-login';
    return null;
  }
  return <AdminApp onLogout={() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.href = '/admin-login';
  }} />;
}

// حارس مسار تطبيق السائق: يسمح بالدخول إذا كان هناك token أو لا يوجد سائقون في قاعدة البيانات
function DriverGuard() {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'need-login'>('loading');

  useEffect(() => {
    const token = localStorage.getItem('driver_token');
    const driverUser = localStorage.getItem('driver_user');
    if (token && driverUser) {
      setStatus('allowed');
      return;
    }
    // لا يوجد token — تحقق إذا كان هناك سائقون في قاعدة البيانات
    fetch('/api/auth/setup-status')
      .then(r => r.json())
      .then((data: { driverExists: boolean }) => {
        if (!data.driverExists) {
          // لا يوجد سائقون → إعداد أولي → منح وصول مؤقت
          localStorage.setItem('driver_token', 'SETUP_MODE');
          localStorage.setItem('driver_user', JSON.stringify({
            id: 'setup',
            name: 'إعداد أولي',
            phone: '',
            userType: 'driver',
            isSetupMode: true,
          }));
          setStatus('allowed');
        } else {
          setStatus('need-login');
        }
      })
      .catch(() => setStatus('need-login'));
  }, []);

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'need-login') {
    window.location.href = '/driver-login';
    return null;
  }
  return <DriverApp />;
}

function MainApp() {
  const { location } = useUserLocation();
  const [showLocationModal, setShowLocationModal] = useState(true);
  const pathname = window.location.pathname;

  // صفحات تسجيل الدخول — بدون تخطيط
  if (pathname === '/admin-login') {
    return <AdminLoginPage />;
  }

  if (pathname === '/driver-login') {
    return <DriverLoginPage />;
  }

  // مسارات لوحة التحكم — مع حارس المصادقة
  if (pathname.startsWith('/admin')) {
    return <AdminGuard />;
  }

  // مسارات تطبيق السائق — مع حارس المصادقة
  if (pathname.startsWith('/driver')) {
    return <DriverGuard />;
  }

  // تطبيق العميل الافتراضي
  return (
    <>
      <Layout>
        <Router />
      </Layout>

      {showLocationModal && !location.hasPermission && (
        <LocationPermissionModal
          onPermissionGranted={(position) => {
            console.log('تم منح الإذن للموقع:', position);
            setShowLocationModal(false);
          }}
          onPermissionDenied={() => {
            console.log('تم رفض الإذن للموقع');
            setShowLocationModal(false);
          }}
        />
      )}
    </>
  );
}

function Router() {
  const { isFeatureEnabled } = useUiSettings();
  const showOrdersPage = isFeatureEnabled('show_orders_page');
  const showTrackOrdersPage = isFeatureEnabled('show_track_orders_page');
  const showWasalniService = isFeatureEnabled('show_wasalni_service');

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={SearchPage} />
      <Route path="/auth" component={CustomerAuthPage} />
      <Route path="/restaurant/:id" component={Restaurant} />
      <Route path="/cart" component={Cart} />
      <Route path="/profile" component={Profile} />
      <Route path="/addresses" component={Location} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/category/:name" component={CategoryPage} />
      {showOrdersPage && <Route path="/orders" component={OrdersPage} />}
      <Route path="/orders/:orderId" component={OrderTracking} />
      {showTrackOrdersPage && <Route path="/track-orders" component={TrackOrdersPage} />}
      {showWasalniService && <Route path="/wasalni" component={WasalniPage} />}
      <Route path="/settings" component={Settings} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/admin-login" component={AdminLoginPage} />
      <Route path="/driver-login" component={DriverLoginPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <UiSettingsProvider>
              <LocationProvider>
                <CartProvider>
                  <NotificationProvider>
                    <Toaster />
                    <MainApp />
                  </NotificationProvider>
                </CartProvider>
              </LocationProvider>
            </UiSettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
