import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Save, Eye, EyeOff, Upload, Palette, Building2,
  Phone, Mail, Globe, MapPin, CreditCard, Stamp, AlignLeft,
  RefreshCw, CheckCircle, Image
} from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

// مفاتيح إعدادات تصميم المستندات
const INVOICE_KEYS = [
  'invoice_company_name',
  'invoice_company_logo',
  'invoice_company_address',
  'invoice_company_phone',
  'invoice_company_email',
  'invoice_company_website',
  'invoice_header_text',
  'invoice_footer_text',
  'invoice_primary_color',
  'invoice_secondary_color',
  'invoice_bank_name',
  'invoice_bank_account',
  'invoice_bank_iban',
  'invoice_show_logo',
  'invoice_stamp_text',
  'invoice_signature_text',
  'invoice_currency',
  'invoice_terms_text',
];

const DEFAULT_DESIGN: Record<string, string> = {
  invoice_company_name: 'السريع ون',
  invoice_company_logo: '',
  invoice_company_address: 'الجمهورية اليمنية',
  invoice_company_phone: '',
  invoice_company_email: '',
  invoice_company_website: '',
  invoice_header_text: 'كشف حساب / سند طلب',
  invoice_footer_text: 'شكراً لتعاملكم معنا - جميع الحقوق محفوظة',
  invoice_primary_color: '#ef4444',
  invoice_secondary_color: '#1f2937',
  invoice_bank_name: '',
  invoice_bank_account: '',
  invoice_bank_iban: '',
  invoice_show_logo: 'true',
  invoice_stamp_text: 'ختم وتوقيع معتمد',
  invoice_signature_text: 'توقيع المدير المختص',
  invoice_currency: 'ريال يمني',
  invoice_terms_text: 'يُعتمد هذا المستند بموجب أنظمة الشركة. للاستفسار تواصل مع الإدارة.',
};

function PreviewInvoice({ design }: { design: Record<string, string> }) {
  const primaryColor = design.invoice_primary_color || '#ef4444';
  const showLogo = design.invoice_show_logo !== 'false';
  const logoUrl = design.invoice_company_logo;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm text-xs" dir="rtl">
      {/* رأس المستند */}
      <div className="p-4" style={{ backgroundColor: primaryColor }}>
        <div className="flex items-start justify-between text-white">
          <div className="flex-1">
            <h2 className="text-base font-bold">{design.invoice_company_name || 'اسم الشركة'}</h2>
            <p className="opacity-90 mt-0.5">{design.invoice_header_text}</p>
            {design.invoice_company_address && (
              <p className="opacity-75 text-[10px] mt-1">📍 {design.invoice_company_address}</p>
            )}
            {design.invoice_company_phone && (
              <p className="opacity-75 text-[10px]">📞 {design.invoice_company_phone}</p>
            )}
          </div>
          {showLogo && logoUrl && (
            <img
              src={logoUrl}
              alt="شعار"
              className="h-12 w-12 object-contain rounded-lg bg-white/20 p-1"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          {showLogo && !logoUrl && (
            <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center">
              <Image className="h-6 w-6 text-white/60" />
            </div>
          )}
        </div>
      </div>

      {/* بيانات المستند */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-gray-500 text-[10px] mb-1">اسم المتجر / الموظف</p>
            <p className="font-semibold text-gray-800">نموذج ...</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-gray-500 text-[10px] mb-1">الفترة</p>
            <p className="font-semibold text-gray-800">2026/01/01 - 2026/01/31</p>
          </div>
        </div>

        {/* جدول بيانات */}
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: primaryColor + '20', color: primaryColor }}>
              <th className="border border-gray-200 p-1.5 text-right font-bold">#</th>
              <th className="border border-gray-200 p-1.5 text-right font-bold">البيان</th>
              <th className="border border-gray-200 p-1.5 text-right font-bold">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {[1,2,3].map(i => (
              <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="border border-gray-200 p-1.5">{i}</td>
                <td className="border border-gray-200 p-1.5">بند {i} - نموذج</td>
                <td className="border border-gray-200 p-1.5">1,000 {design.invoice_currency || 'ريال'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: primaryColor + '15' }}>
              <td colSpan={2} className="border border-gray-200 p-1.5 font-bold text-left">الإجمالي</td>
              <td className="border border-gray-200 p-1.5 font-bold" style={{ color: primaryColor }}>3,000 {design.invoice_currency || 'ريال'}</td>
            </tr>
          </tfoot>
        </table>

        {/* معلومات البنك */}
        {design.invoice_bank_name && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-2">
            <p className="text-blue-700 font-semibold text-[10px] mb-1">معلومات التحويل البنكي</p>
            <p className="text-gray-700 text-[10px]">البنك: {design.invoice_bank_name}</p>
            {design.invoice_bank_account && <p className="text-gray-700 text-[10px]">الحساب: {design.invoice_bank_account}</p>}
            {design.invoice_bank_iban && <p className="text-gray-700 text-[10px]">IBAN: {design.invoice_bank_iban}</p>}
          </div>
        )}

        {/* الشروط */}
        {design.invoice_terms_text && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-2">
            <p className="text-amber-700 text-[10px] leading-relaxed">{design.invoice_terms_text}</p>
          </div>
        )}

        {/* التوقيع والختم */}
        <div className="flex justify-between items-end pt-2 mt-2 border-t border-dashed border-gray-200">
          <div className="text-center">
            <div className="border border-dashed border-gray-300 rounded w-24 h-10 flex items-center justify-center mb-1">
              <Stamp className="h-5 w-5 text-gray-300" />
            </div>
            <p className="text-[9px] text-gray-500">{design.invoice_stamp_text}</p>
          </div>
          <div className="text-center">
            <div className="border-b border-gray-400 w-24 mb-1" style={{ height: '28px' }} />
            <p className="text-[9px] text-gray-500">{design.invoice_signature_text}</p>
          </div>
        </div>
      </div>

      {/* تذييل */}
      <div className="px-4 py-2 text-center border-t border-gray-100 bg-gray-50">
        <p className="text-[10px] text-gray-500">{design.invoice_footer_text}</p>
      </div>
    </div>
  );
}

export default function AdminInvoiceDesign() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [design, setDesign] = useState<Record<string, string>>(DEFAULT_DESIGN);

  // جلب الإعدادات الحالية
  const { data: uiSettings, isLoading } = useQuery<any[]>({
    queryKey: ['/api/ui-settings'],
  });

  // تهيئة القيم من الإعدادات المحفوظة
  useEffect(() => {
    if (uiSettings && uiSettings.length > 0) {
      const loaded: Record<string, string> = { ...DEFAULT_DESIGN };
      for (const key of INVOICE_KEYS) {
        const found = uiSettings.find((s: any) => s.key === key);
        if (found) loaded[key] = found.value;
      }
      setDesign(loaded);
    }
  }, [uiSettings]);

  const set = (key: string, value: string) => {
    setDesign(prev => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  // حفظ كل الإعدادات دفعةً واحدة
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {};
      for (const key of INVOICE_KEYS) {
        payload[key] = design[key] ?? '';
      }
      const response = await fetch('/api/ui-settings/bulk', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${localStorage.getItem('admin_token')}` 
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'تعذّر حفظ إعدادات التصميم');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ui-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ui-settings'] });
      setIsSaved(true);
      toast({ title: '✅ تم حفظ تصميم المستندات', description: 'سيُطبَّق هذا التصميم على جميع الكشوفات والسندات' });
      setTimeout(() => setIsSaved(false), 3000);
    },
    onError: (err: any) => {
      toast({ title: 'خطأ في الحفظ', description: err.message || 'تعذّر حفظ إعدادات التصميم', variant: 'destructive' });
    },
  });

  const resetToDefault = () => {
    setDesign(DEFAULT_DESIGN);
    setIsSaved(false);
    toast({ title: 'تم إعادة الضبط', description: 'تم استعادة القيم الافتراضية' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            تصميم المستندات والسندات
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            تخصيص تصميم كشوف الحسابات وسندات الطلبات لجميع المتاجر والموظفين
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetToDefault} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            إعادة ضبط
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? 'إخفاء المعاينة' : 'معاينة'}
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            {saveMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : isSaved ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaved ? 'تم الحفظ ✓' : 'حفظ التصميم'}
          </Button>
        </div>
      </div>

      {/* بانر المعلومات */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-800 font-semibold text-sm">تصميم موحّد لجميع المستندات</p>
          <p className="text-blue-600 text-xs mt-0.5">
            بعد الحفظ سيُطبَّق هذا التصميم تلقائياً على كشوف حسابات المتاجر وكشوف رواتب الموظفين وجميع المستندات المُصدَّرة بصيغة PDF.
          </p>
        </div>
      </div>

      <div className={`grid gap-6 ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* لوحة التعديل */}
        <div>
          <Tabs defaultValue="company" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="company" className="text-xs gap-1">
                <Building2 className="h-3 w-3" /> الشركة
              </TabsTrigger>
              <TabsTrigger value="design" className="text-xs gap-1">
                <Palette className="h-3 w-3" /> التصميم
              </TabsTrigger>
              <TabsTrigger value="banking" className="text-xs gap-1">
                <CreditCard className="h-3 w-3" /> البنك
              </TabsTrigger>
              <TabsTrigger value="content" className="text-xs gap-1">
                <AlignLeft className="h-3 w-3" /> المحتوى
              </TabsTrigger>
            </TabsList>

            {/* معلومات الشركة */}
            <TabsContent value="company" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    هوية الشركة / المنشأة
                  </CardTitle>
                  <CardDescription>البيانات الأساسية التي تظهر في رأس كل مستند</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label className="text-sm font-semibold">اسم الشركة / المنشأة *</Label>
                      <Input
                        value={design.invoice_company_name}
                        onChange={e => set('invoice_company_name', e.target.value)}
                        placeholder="السريع ون"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <ImageUpload
                        label="شعار الشركة للمستندات (رفع من جهازك)"
                        value={design.invoice_company_logo}
                        onChange={url => set('invoice_company_logo', url)}
                        placeholder="اختر ملف صورة من جهازك..."
                        bucket="invoice-logos"
                      />
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={design.invoice_show_logo === 'true'}
                            onCheckedChange={v => set('invoice_show_logo', v ? 'true' : 'false')}
                          />
                          <Label className="text-xs text-gray-600">إظهار الشعار في المستندات والسندات وكشوفات الحساب</Label>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" /> العنوان
                      </Label>
                      <Input
                        value={design.invoice_company_address}
                        onChange={e => set('invoice_company_address', e.target.value)}
                        placeholder="المدينة، الدولة"
                        className="mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" /> رقم الهاتف
                        </Label>
                        <Input
                          value={design.invoice_company_phone}
                          onChange={e => set('invoice_company_phone', e.target.value)}
                          placeholder="+967..."
                          className="mt-1"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5" /> البريد الإلكتروني
                        </Label>
                        <Input
                          value={design.invoice_company_email}
                          onChange={e => set('invoice_company_email', e.target.value)}
                          placeholder="info@example.com"
                          className="mt-1"
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5" /> الموقع الإلكتروني
                        </Label>
                        <Input
                          value={design.invoice_company_website}
                          onChange={e => set('invoice_company_website', e.target.value)}
                          placeholder="www.example.com"
                          className="mt-1"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold">العملة</Label>
                        <Input
                          value={design.invoice_currency}
                          onChange={e => set('invoice_currency', e.target.value)}
                          placeholder="ريال يمني"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* التصميم والألوان */}
            <TabsContent value="design" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    الألوان والتصميم
                  </CardTitle>
                  <CardDescription>تخصيص ألوان وهوية المستند البصرية</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold">اللون الرئيسي</Label>
                      <div className="flex items-center gap-3 mt-2">
                        <input
                          type="color"
                          value={design.invoice_primary_color}
                          onChange={e => set('invoice_primary_color', e.target.value)}
                          className="h-10 w-16 rounded cursor-pointer border border-gray-200"
                        />
                        <div>
                          <p className="text-sm font-mono">{design.invoice_primary_color}</p>
                          <p className="text-xs text-gray-500">يُطبَّق على الرأس والجداول</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {['#ef4444','#f97316','#16a34a','#2563eb','#7c3aed','#0f172a','#374151'].map(c => (
                          <button
                            key={c}
                            onClick={() => set('invoice_primary_color', c)}
                            className="h-7 w-7 rounded-full border-2 transition-all"
                            style={{ backgroundColor: c, borderColor: design.invoice_primary_color === c ? c : '#e5e7eb' }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">اللون الثانوي</Label>
                      <div className="flex items-center gap-3 mt-2">
                        <input
                          type="color"
                          value={design.invoice_secondary_color}
                          onChange={e => set('invoice_secondary_color', e.target.value)}
                          className="h-10 w-16 rounded cursor-pointer border border-gray-200"
                        />
                        <div>
                          <p className="text-sm font-mono">{design.invoice_secondary_color}</p>
                          <p className="text-xs text-gray-500">يُطبَّق على النصوص الثانوية</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* الختم والتوقيع */}
                  <div className="border-t pt-4 space-y-3">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <Stamp className="h-4 w-4" />
                      الختم والتوقيع
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-600">نص الختم</Label>
                        <Input
                          value={design.invoice_stamp_text}
                          onChange={e => set('invoice_stamp_text', e.target.value)}
                          placeholder="ختم وتوقيع معتمد"
                          className="mt-1 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">نص التوقيع</Label>
                        <Input
                          value={design.invoice_signature_text}
                          onChange={e => set('invoice_signature_text', e.target.value)}
                          placeholder="توقيع المدير المختص"
                          className="mt-1 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* المعلومات البنكية */}
            <TabsContent value="banking" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    معلومات الحساب البنكي
                  </CardTitle>
                  <CardDescription>تظهر في كشوف الحسابات لتسهيل التحويل البنكي</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">اسم البنك</Label>
                    <Input
                      value={design.invoice_bank_name}
                      onChange={e => set('invoice_bank_name', e.target.value)}
                      placeholder="بنك التعامل والتوصيل"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">رقم الحساب</Label>
                    <Input
                      value={design.invoice_bank_account}
                      onChange={e => set('invoice_bank_account', e.target.value)}
                      placeholder="1234567890"
                      className="mt-1"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">رقم الآيبان (IBAN)</Label>
                    <Input
                      value={design.invoice_bank_iban}
                      onChange={e => set('invoice_bank_iban', e.target.value)}
                      placeholder="YE00 0000 0000 0000 0000 0000 0000"
                      className="mt-1"
                      dir="ltr"
                    />
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                    💡 ستظهر هذه المعلومات في كشوف حسابات المتاجر والموظفين تحت قسم "التحويل البنكي"
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* المحتوى النصي */}
            <TabsContent value="content" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlignLeft className="h-4 w-4 text-primary" />
                    النصوص والمحتوى
                  </CardTitle>
                  <CardDescription>الرأس والتذييل والشروط والأحكام</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">نص عنوان المستند (الرأس)</Label>
                    <Input
                      value={design.invoice_header_text}
                      onChange={e => set('invoice_header_text', e.target.value)}
                      placeholder="كشف حساب / سند طلب"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">نص تذييل المستند</Label>
                    <Textarea
                      value={design.invoice_footer_text}
                      onChange={e => set('invoice_footer_text', e.target.value)}
                      placeholder="شكراً لتعاملكم معنا..."
                      className="mt-1 resize-none"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">الشروط والأحكام</Label>
                    <Textarea
                      value={design.invoice_terms_text}
                      onChange={e => set('invoice_terms_text', e.target.value)}
                      placeholder="يُعتمد هذا المستند بموجب..."
                      className="mt-1 resize-none"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* المعاينة */}
        {showPreview && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                معاينة المستند
              </h3>
              <Badge variant="secondary" className="text-xs">معاينة حية</Badge>
            </div>
            <PreviewInvoice design={design} />
          </div>
        )}
      </div>
    </div>
  );
}
