import { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  Home, 
  Receipt, 
  User, 
  Settings, 
  Shield, 
  ShoppingCart,
  Heart,
  PhoneCall,
  ChevronLeft,
  ChevronRight,
  Share2,
  MessageCircle,
  X,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import CartButton from './CartButton';
import { useToast } from '@/hooks/use-toast';
import { useUiSettings } from '@/context/UiSettingsContext';
import { useLanguage } from '../context/LanguageContext';
import TopBar from './TopBar';
import Navbar from './Navbar';
import AppClosedOverlay from './AppClosedOverlay';
import { getAppStatus } from '../utils/restaurantHours';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { state } = useCart();
  const { user } = useAuth();
  const { t, language, setLanguage, dir } = useLanguage();
  const getItemCount = () => state.items.reduce((sum, item) => sum + item.quantity, 0);
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const { getSetting } = useUiSettings();

  const appStatus = (() => {
    const openingTime = getSetting('opening_time') || '08:00';
    const closingTime = getSetting('closing_time') || '23:00';
    const storeStatus = getSetting('store_status') || 'open';
    return getAppStatus(openingTime, closingTime, storeStatus);
  })();

  const getS = (key: string, defaultValue: string) => getSetting(key) || defaultValue;

  const whatsappLink = getS('support_whatsapp', 'https://wa.me/966000000000');
  const phoneLink = getS('support_phone', 'tel:+966000000000');
  const shareText = getS('share_text', 'تسوق من السريع ون الآن!');
  const shareUrl = getS('share_url', window.location.origin);
  const headerLogoUrl = getS('header_logo_url', '');
  const sidebarLogoUrl = getS('sidebar_logo_url', '') || headerLogoUrl;
  const appName = getS('app_name', 'السريع ون');
  const appVersion = getS('app_version', '1.0.0');
  const sidebarTagline = getS('sidebar_tagline', 'خدمة التوصيل الأسرع في المملكة');
  const supportTitle = getS('text_support_title', 'نحن معك..');

  const showShareButton = getSetting('show_share_button') !== 'false';
  const showContactButton = getSetting('show_contact_button') !== 'false';
  const showPrivacyButton = getSetting('show_privacy_button') !== 'false';
  const bottomBarEnabled = getSetting('bottom_bar_enabled') !== 'false';

  const isAdminPage = location.startsWith('/admin');
  const isDeliveryPage = location.startsWith('/delivery');
  const isDriverPage = location.startsWith('/driver');

  if (isAdminPage || isDeliveryPage || isDriverPage) {
    return <>{children}</>;
  }

  const sidebarMenuItems = [
    { icon: Heart, label: language === 'ar' ? 'المفضلة' : 'Favorites', path: '/favorites' },
    { icon: User, label: language === 'ar' ? 'حسابي' : 'My Account', path: '/profile' },
    { icon: Settings, label: language === 'ar' ? 'الإعدادات' : 'Settings', path: '/settings' },
    ...(showPrivacyButton ? [{ icon: Shield, label: language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy', path: '/privacy' }] : []),
  ];

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: appName,
        text: shareText,
        url: shareUrl,
      }).catch(console.error);
    } else {
      toast({
        title: language === 'ar' ? 'تم النسخ' : 'Copied',
        description: language === 'ar' ? 'تم نسخ رابط المتجر' : 'Store link copied',
      });
      navigator.clipboard.writeText(shareUrl);
    }
  };

  const navigate = (path: string) => {
    setLocation(path);
    setSidebarOpen(false);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  return (
    <div className="bg-background min-h-screen flex flex-col pb-16 md:pb-0" dir={dir}>
      <TopBar />
      {location !== '/' && !location.startsWith('/restaurant/') && <Navbar />}

      {/* App Closed Overlay */}
      {!appStatus.isOpen && (
        <AppClosedOverlay
          openingTime={appStatus.openingTime}
          message="عذراً لا تستطيع الطلب الآن لأن التطبيق مغلق"
          onClose={() => {}}
          scheduledOrdersEnabled={getSetting('allow_scheduled_orders_when_closed') !== 'false'}
        />
      )}

      {/* Sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <button id="sidebar-trigger" className="hidden" />
        </SheetTrigger>
        <SheetContent side="right" className="w-[320px] p-0 flex flex-col border-none shadow-2xl bg-gradient-to-b from-slate-50 to-white">

          {/* Hero header: orange-red gradient */}
          <div className="relative bg-gradient-to-br from-[#C73208] via-[#E03A0E] to-[#B52200] px-5 pt-7 pb-14 overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full bg-[#F05215] opacity-25 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-[#FF7840] opacity-15 blur-3xl pointer-events-none" />

            <button
              onClick={() => setSidebarOpen(false)}
              className={`absolute top-4 ${language === 'ar' ? 'left-4' : 'right-4'} z-10 p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-full transition-colors`}
              data-testid="button-close-sidebar"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Logo + brand */}
            <div className="relative flex items-center justify-center gap-3 mb-5">
              <div className="relative">
                <div className="absolute inset-0 bg-[#F05215] rounded-full blur-xl opacity-40" />
                {sidebarLogoUrl ? (
                  <img src={sidebarLogoUrl} alt={appName} className="relative h-16 w-16 object-contain drop-shadow-[0_0_15px_rgba(240,82,21,0.5)]" />
                ) : (
                  <div className="relative h-16 w-16 flex items-center justify-center rounded-2xl bg-white/10 text-3xl font-black text-white">
                    و
                  </div>
                )}
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-3xl font-black text-white tracking-tight">{appName}</span>
                <span className="text-[10px] font-bold text-white/80 tracking-[0.35em] mt-1">السريع ون</span>
              </div>
            </div>

            <p className="relative text-center text-xs font-bold text-white/70 leading-snug px-4">
              {sidebarTagline}
            </p>
          </div>

          {/* Profile card - overlaps the header */}
          <div className="relative -mt-9 px-5 z-10">
            <button
              onClick={() => navigate(user ? '/profile' : '/auth')}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 shadow-[0_10px_30px_-12px_rgba(14,23,41,0.25)] hover:shadow-[0_15px_35px_-10px_rgba(240,82,21,0.35)] transition-all"
              data-testid="button-profile-card"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F05215] to-[#FF7840] flex items-center justify-center text-white font-black text-lg shadow-md flex-shrink-0">
                {user ? (user.name?.charAt(0) || user.phone?.charAt(0) || 'و') : <User className="h-6 w-6" />}
              </div>
              <div className="flex-1 text-right min-w-0">
                <p className="text-sm font-black text-slate-900 truncate">
                  {user ? (user.name || (language === 'ar' ? 'مرحباً بك' : 'Welcome')) : (language === 'ar' ? 'تسجيل الدخول' : 'Sign in')}
                </p>
                <p className="text-[11px] font-bold text-slate-400 truncate">
                  {user?.phone || (language === 'ar' ? 'سجل دخولك للاستفادة من الميزات' : 'Sign in to enjoy features')}
                </p>
              </div>
              {language === 'ar' ? <ChevronLeft className="h-4 w-4 text-slate-300" /> : <ChevronRight className="h-4 w-4 text-slate-300" />}
            </button>
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto px-4 pt-5 pb-4">
            <p className="px-2 mb-2 text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase">
              {language === 'ar' ? 'القائمة' : 'Menu'}
            </p>
            <div className="space-y-1">
              {sidebarMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-l from-[#F05215]/15 to-transparent ring-1 ring-[#F05215]/30'
                        : 'hover:bg-slate-50'
                    }`}
                    data-testid={`link-sidebar-${item.path.replace('/', '')}`}
                  >
                    <div className={`w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 transition-colors ${
                      isActive
                        ? 'bg-gradient-to-br from-[#F05215] to-[#FF7840] text-white shadow-md'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <span className={`text-sm flex-1 text-right ${isActive ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                      {item.label}
                    </span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F05215]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="my-4 h-px bg-slate-100" />

            <p className="px-2 mb-2 text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase">
              {language === 'ar' ? 'التفضيلات' : 'Preferences'}
            </p>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 hover:bg-slate-50"
              data-testid="button-toggle-language"
            >
              <div className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 bg-slate-100 text-slate-600">
                <Globe className="h-4.5 w-4.5" />
              </div>
              <span className="text-sm font-bold flex-1 text-right text-slate-700">
                {language === 'ar' ? 'English' : 'العربية'}
              </span>
              <span className="text-[10px] font-black bg-[#F05215]/15 text-[#F05215] px-2 py-0.5 rounded-full">
                {language === 'ar' ? 'EN' : 'AR'}
              </span>
            </button>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-center gap-3 mb-3">
              {showShareButton && (
                <button
                  onClick={handleShare}
                  className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white border border-slate-200 hover:border-[#F05215]/40 hover:bg-[#F05215]/5 shadow-sm transition-all"
                  data-testid="button-share"
                >
                  <Share2 className="h-4.5 w-4.5 text-slate-600" />
                </button>
              )}
              {showContactButton && (
                <button
                  onClick={() => window.open(whatsappLink, '_blank')}
                  className="flex-1 max-w-[180px] h-11 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F05215] to-[#FF7840] text-white font-black text-sm shadow-md hover:shadow-lg transition-all"
                  data-testid="button-contact-support"
                >
                  <MessageCircle className="h-4 w-4" />
                  {language === 'ar' ? 'تواصل معنا' : 'Contact us'}
                </button>
              )}
            </div>
            <p className="text-[10px] text-center text-slate-400 font-bold tracking-[0.3em]">
              {appName} · V{appVersion}
            </p>
          </div>

        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {bottomBarEnabled && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t z-50 md:hidden flex items-center justify-around h-16 px-4 pb-1 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <button
            onClick={() => setLocation('/')}
            className={`flex flex-col items-center gap-0.5 transition-all duration-300 min-w-[52px] ${location === '/' ? 'text-primary scale-110' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Home className={`h-6 w-6 ${location === '/' ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-black">الرئيسية</span>
            {location === '/' && <div className="h-1 w-4 bg-primary rounded-full" />}
          </button>

          <button
            onClick={() => setLocation('/orders')}
            className={`flex flex-col items-center gap-0.5 transition-all duration-300 min-w-[52px] ${location === '/orders' ? 'text-primary scale-110' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Receipt className={`h-6 w-6 ${location === '/orders' ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-black">طلباتي</span>
            {location === '/orders' && <div className="h-1 w-4 bg-primary rounded-full" />}
          </button>

          {/* Support Center Button */}
          <div className="relative -mt-8">
            <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
              <DialogTrigger asChild>
                <button className="flex flex-col items-center group">
                  <div className="header-gradient text-white p-4 rounded-2xl shadow-lg shadow-primary/30 border-4 border-white transform transition-transform group-hover:scale-110 active:scale-95">
                    <MessageCircle className="h-7 w-7" />
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-t-[2.5rem] border-none shadow-2xl overflow-hidden p-0">
                <DialogTitle className="sr-only">{supportTitle}</DialogTitle>
                <DialogDescription className="sr-only">اختر وسيلة التواصل</DialogDescription>
                <div className="h-32 header-gradient p-8 flex items-end">
                  <h2 className="text-3xl font-black text-white italic tracking-tighter">{supportTitle}</h2>
                </div>
                <div className="p-8 space-y-4">
                  <p className="text-gray-500 font-bold mb-6 text-center">اختر وسيلة التواصل المناسبة لك</p>
                  <div className="grid gap-4">
                    <Button
                      variant="outline"
                      className="h-20 flex items-center justify-between px-6 rounded-2xl border-2 border-orange-50 hover:bg-orange-50 hover:border-orange-200 group transition-all"
                      onClick={() => { window.open(whatsappLink, '_blank'); setSupportOpen(false); }}
                    >
                      <div className="bg-orange-100 p-3 rounded-xl group-hover:bg-orange-200 transition-colors">
                        <MessageCircle className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 text-right mr-4">
                        <p className="font-black text-xl text-gray-900">واتساب</p>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">تحدث مباشرة</p>
                      </div>
                      <ChevronLeft className="h-5 w-5 text-gray-300" />
                    </Button>

                    <Button
                      variant="outline"
                      className="h-20 flex items-center justify-between px-6 rounded-2xl border-2 border-blue-50 hover:bg-blue-50 hover:border-blue-200 group transition-all"
                      onClick={() => { window.location.href = phoneLink; setSupportOpen(false); }}
                    >
                      <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition-colors">
                        <PhoneCall className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1 text-right mr-4">
                        <p className="font-black text-xl text-gray-900">اتصال</p>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">مكالمة فورية</p>
                      </div>
                      <ChevronLeft className="h-5 w-5 text-gray-300" />
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <button
            onClick={() => setLocation('/favorites')}
            className={`flex flex-col items-center gap-0.5 transition-all duration-300 min-w-[52px] ${location === '/favorites' ? 'text-primary scale-110' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Heart className={`h-6 w-6 ${location === '/favorites' ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-black">المفضلة</span>
            {location === '/favorites' && <div className="h-1 w-4 bg-primary rounded-full" />}
          </button>

          <button
            onClick={() => setLocation(user ? '/profile' : '/auth')}
            className={`flex flex-col items-center gap-0.5 transition-all duration-300 min-w-[52px] ${location === '/profile' ? 'text-primary scale-110' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <User className={`h-6 w-6 ${location === '/profile' ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-black">حسابي</span>
            {location === '/profile' && <div className="h-1 w-4 bg-primary rounded-full" />}
          </button>
        </div>
      )}

      {/* Desktop Footer */}
      <footer className="hidden md:block bg-white border-t py-12 mt-auto">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-right">
            <div className="text-3xl font-black tracking-tighter mb-2 text-primary">
              {appName}
            </div>
            <p className="text-sm text-gray-500">{sidebarTagline}</p>
          </div>
          <div className="text-right">
            <h4 className="font-bold text-lg mb-4">روابط سريعة</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><button onClick={() => setLocation('/favorites')} className="hover:text-primary transition-colors">المفضلة</button></li>
              <li><button onClick={() => setLocation('/orders')} className="hover:text-primary transition-colors">طلباتي</button></li>
              <li><button onClick={() => setLocation('/profile')} className="hover:text-primary transition-colors">حسابي</button></li>
              <li><button onClick={() => setLocation('/privacy')} className="hover:text-primary transition-colors">سياسة الخصوصية</button></li>
            </ul>
          </div>
          <div className="text-right">
            <h4 className="font-bold text-lg mb-4">تواصل معنا</h4>
            <div className="flex gap-3 justify-end">
              <button onClick={handleShare} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                <Share2 className="h-5 w-5 text-gray-600" />
              </button>
              <button onClick={() => window.open(whatsappLink, '_blank')} className="p-2.5 bg-primary/10 hover:bg-primary/20 rounded-full transition-colors">
                <MessageCircle className="h-5 w-5 text-primary" />
              </button>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-8 pt-6 border-t">
          <p className="text-center text-xs text-gray-400 font-bold uppercase tracking-widest">
            {appName} V{appVersion} — جميع الحقوق محفوظة
          </p>
        </div>
      </footer>

      {/* Mobile Floating Cart Button */}
      {getItemCount() > 0 && (
        <div className="md:hidden">
          <CartButton />
        </div>
      )}
    </div>
  );
}
