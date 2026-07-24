import { useLocation } from 'wouter';
import { 
  ArrowRight, Smartphone, ShieldCheck, Heart, Sparkles, 
  Phone, Mail, MessageCircle, FileText, Lock, Globe, Star, Info,
  CheckCircle2, ShoppingBag, Truck, Headphones
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUiSettings } from '@/context/UiSettingsContext';

export default function AboutPage() {
  const [, setLocation] = useLocation();
  const { getSetting } = useUiSettings();

  const appName = getSetting('about_app_name', 'السريع ون (Alsaree1)');
  const appDesc = getSetting('about_app_description', 'التطبيق الرائد والأسرع لتوصيل الخضار والفواكه الطازجة والمواد الغذائية والمتاجر مباشرة إلى باب منزلك بأعلى معايير الجودة وأنسب الأسعار.');
  const appVersion = getSetting('about_app_version', '1.5.0');
  const appVision = getSetting('about_app_vision', 'أن نكون الخيار الأول والأنسب لكل منزل ومؤسسة في خدمات التوصيل السريع والتسوق المباشر بضمانة وثقة عالية.');
  const appMission = getSetting('about_app_mission', 'تقديم تجربة تسوق سلسة وآمنة، وتوفير طازج المنتجات الغذائية واليومية وأسرع خدمات التوصيل الميداني.');
  const phone = getSetting('about_app_phone', getSetting('support_phone', '770000000'));
  const whatsapp = getSetting('about_app_whatsapp', getSetting('whatsapp_number', '770000000'));
  const email = getSetting('about_app_email', 'support@alsaree1.com');

  return (
    <div className="min-h-screen bg-gray-50/60 pb-12 rtl" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/settings')}
              className="rounded-full hover:bg-gray-100"
            >
              <ArrowRight className="h-5 w-5 text-gray-700" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">حول التطبيق</h1>
              <p className="text-xs text-gray-500">معلومات وشروط ووسائل التواصل</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs px-2.5 py-1">
            الإصدار {appVersion}
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* App Hero Branding */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <ShoppingBag className="w-48 h-48" />
          </div>
          <CardContent className="p-6 relative z-10 text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
              <ShoppingBag className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-black">{appName}</h2>
            <p className="text-xs text-white/90 max-w-lg mx-auto leading-relaxed">
              {appDesc}
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-[11px] px-3 py-1">
                توصيل سريع ⚡
              </Badge>
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-[11px] px-3 py-1">
                منتجات طازجة 100% 🍏
              </Badge>
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-[11px] px-3 py-1">
                خدمة "وصل لي" 🛵
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Vision & Mission */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-500" />
                رؤيتنا
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600 leading-relaxed">{appVision}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                رسالتنا
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600 leading-relaxed">{appMission}</p>
            </CardContent>
          </Card>
        </div>

        {/* Platform Core Features */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Info className="h-5 w-5 text-orange-500" />
              مميزات وخدمات منصة {appName}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {[
              { title: 'تسوق المتاجر المباشر', desc: 'أجود أصناف الخضار، الفواكه، التمور، والمواد الغذائية بأسعار ممتازة.', icon: ShoppingBag, color: 'text-orange-500 bg-orange-50' },
              { title: 'خدمة "وصل لي" الميدانية', desc: 'إرسال واستلام أي أغراض أو طرود شخصية بين الأماكن بسرعة فائقة.', icon: Truck, color: 'text-purple-500 bg-purple-50' },
              { title: 'تتبع حقيقي وشبكة موصلين', desc: 'متابعة حركة المندوب لحظة بلحظة على الخريطة حتى وصول طلبك.', icon: ShieldCheck, color: 'text-emerald-500 bg-emerald-50' },
              { title: 'دعم فني واستجابة فورية', desc: 'فريق دعم متواجد لخدمتك ومتابعة طلباتك بانتظام.', icon: Headphones, color: 'text-blue-500 bg-blue-50' },
            ].map((feature, idx) => {
              const IconComp = feature.icon;
              return (
                <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg border border-gray-100 bg-gray-50/50">
                  <div className={`p-2 rounded-lg shrink-0 ${feature.color}`}>
                    <IconComp className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-gray-900">{feature.title}</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Contact & Support */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Headphones className="h-5 w-5 text-blue-600" />
              تواصل مع الدعم الفني
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-xs font-medium text-gray-800"
              >
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-gray-500">الاتصال المباشر</span>
                  <span className="font-bold dir-ltr">{phone}</span>
                </div>
              </a>

              <a
                href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all text-xs font-medium text-gray-800"
              >
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-gray-500">واتساب الدعم</span>
                  <span className="font-bold dir-ltr">{whatsapp}</span>
                </div>
              </a>

              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all text-xs font-medium text-gray-800"
              >
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-gray-500">البريد الإلكتروني</span>
                  <span className="font-bold truncate max-w-[120px] inline-block">{email}</span>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Legal & Terms Quick Links */}
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <Lock className="h-4 w-4 text-gray-500" />
              <span>سياسة الخصوصية والشروط والأحكام</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation('/privacy')}
              className="text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              عرض التفاصيل
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-gray-400 pt-2">
          جميع الحقوق محفوظة © {new Date().getFullYear()} {appName}
        </p>
      </main>
    </div>
  );
}
