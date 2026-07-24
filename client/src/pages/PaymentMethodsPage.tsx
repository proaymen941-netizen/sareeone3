import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  ArrowRight, CreditCard, Banknote, Wallet, Building2, 
  AlertCircle, CheckCircle2, Clock, Copy, ShieldCheck, Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

export default function PaymentMethodsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: paymentMethods = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/payment-methods'],
  });

  const { data: walletData } = useQuery<any>({
    queryKey: ['/api/wallet'],
    enabled: !!user,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "تم النسخ",
      description: `تم نسخ ${label} بنجاح إلى الحافظة`,
    });
  };

  const cashMethods = paymentMethods.filter((m) => m.type === 'cash' || m.provider === 'cash');
  const bankMethods = paymentMethods.filter((m) => m.type === 'bank_transfer' || m.provider === 'bank_transfer');
  const walletMethods = paymentMethods.filter((m) => m.type === 'wallet' || m.provider === 'stc_pay');

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
              <h1 className="text-lg font-bold text-gray-900">طرق الدفع</h1>
              <p className="text-xs text-gray-500">إدارة وخيارات الدفع المتاحة في التطبيق</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-2.5 py-1 flex items-center gap-1 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            معاملات آمنة 100%
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Banner Alert for Online Gateways */}
        <Card className="border-amber-200 bg-amber-50/80 shadow-sm overflow-hidden">
          <CardContent className="p-4 flex items-start gap-3.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-full shrink-0 mt-0.5">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                تنبيه بشأن الدفع الإلكتروني المباشر
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                حالياً، طرق الدفع الإلكتروني المباشرة (مثل Visa، MasterCard، مدى، Apple Pay) <strong>غير مفعّلة وجاري العمل على تفعيلها وتطويرها قريباً</strong>. يمكنك الاعتماد حالياً على الدفع عند الاستلام، المحفظة الإلكترونية، أو التحويل البنكي المباشر.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 1. Cash On Delivery */}
        <Card className="shadow-sm border-gray-200 overflow-hidden">
          <CardHeader className="bg-emerald-50/50 border-b border-emerald-100/60 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500 text-white rounded-lg shadow-xs">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-gray-900">الدفع نقداً عند الاستلام (Cash)</CardTitle>
                  <CardDescription className="text-xs">المسدد عند استلام الطلب من المندوب</CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-500 text-white text-xs font-semibold">متاح ومفعّل</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-gray-600 leading-relaxed">
              يمكنك دفع قيمة مشترياتك ورسوم التوصيل نقداً مباشرة لمندوب التوصيل عند وصول الطلب إلى باب منزلك.
            </p>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs text-gray-500 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>لا توجد أي رسوم إضافية على خدمة الدفع عند الاستلام.</span>
            </div>
          </CardContent>
        </Card>

        {/* 2. Wallet Payment */}
        <Card className="shadow-sm border-gray-200 overflow-hidden">
          <CardHeader className="bg-purple-50/50 border-b border-purple-100/60 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-600 text-white rounded-lg shadow-xs">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-gray-900">المحفظة الإلكترونية</CardTitle>
                  <CardDescription className="text-xs">رصيدك المباشر في التطبيق</CardDescription>
                </div>
              </div>
              <Badge className="bg-purple-600 text-white text-xs font-semibold">متاح</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-purple-50/40 border border-purple-100 rounded-xl">
              <div>
                <span className="text-xs text-purple-700 font-medium">رصيدك الحالي في المحفظة</span>
                <div className="text-xl font-black text-purple-900 mt-0.5">
                  {walletData?.balance !== undefined ? `${walletData.balance} ريال` : '0 ريال'}
                </div>
              </div>
              <Button 
                size="sm" 
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs rounded-lg"
                onClick={() => setLocation('/profile')}
              >
                إدارة المحفظة
              </Button>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              يمكنك استخدام رصيد محفظتك لدفع قيمة الطلبات مباشرة وبسرعة فائقة دون الحاجة للكاش.
            </p>
          </CardContent>
        </Card>

        {/* 3. Bank Transfer Methods */}
        <Card className="shadow-sm border-gray-200 overflow-hidden">
          <CardHeader className="bg-blue-50/50 border-b border-blue-100/60 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-lg shadow-xs">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-gray-900">التحويل البنكي المباشر</CardTitle>
                  <CardDescription className="text-xs">بيانات الحسابات البنكية الرسمية للتحويل</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 text-xs font-semibold">حسابات رسمية</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {isLoading ? (
              <div className="text-center py-6 text-xs text-gray-500">جاري تحميل بيانات الحسابات...</div>
            ) : bankMethods.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-500 bg-gray-50 rounded-lg">
                لا توجد حسابات بنكية مضافة حالياً. يمكنك الاستفسار عبر الدعم الفني.
              </div>
            ) : (
              bankMethods.map((method: any) => (
                <div key={method.id} className="border border-blue-100 rounded-xl p-3.5 bg-blue-50/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                      <span className="text-base">🏛️</span>
                      {method.nameAr || method.name}
                    </h4>
                    <span className="text-xs text-blue-600 font-medium">{method.description}</span>
                  </div>

                  {method.documents && method.documents.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {method.documents.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-2.5 bg-white border border-gray-200 rounded-lg text-xs">
                          <div>
                            <span className="text-gray-500 font-medium block text-[11px]">{doc.label}</span>
                            <span className="font-mono font-bold text-gray-900 dir-ltr inline-block select-all">{doc.value}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1 text-xs"
                            onClick={() => copyToClipboard(doc.value, doc.label)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            نسخ
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 4. Electronic Gateways Under Development */}
        <Card className="shadow-sm border-gray-200 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100/60">
          <CardHeader className="border-b border-gray-200/80 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gray-800 text-white rounded-lg shadow-xs">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-gray-900">بوابات الدفع الإلكتروني (البطاقات)</CardTitle>
                  <CardDescription className="text-xs">مدى، فيزا، ماستركارد، Apple Pay</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 font-bold text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                قريباً - قيد التطوير
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              {[
                { name: 'مدى (Mada)', icon: '💳' },
                { name: 'Visa / MasterCard', icon: '💳' },
                { name: 'Apple Pay', icon: '🍎' },
                { name: 'STC Pay', icon: '📱' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-white border border-gray-200 rounded-xl opacity-75 shadow-xs flex flex-col items-center justify-center gap-1">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs font-semibold text-gray-700">{item.name}</span>
                  <span className="text-[10px] text-amber-600 font-medium">قريباً جداً</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center pt-1">
              نعكف حالياً على إتمام إجراءات الربط مع المزودين المحليين لتوفير أفضل وأسرع تجربة دفع إلكتروني آمنة.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
