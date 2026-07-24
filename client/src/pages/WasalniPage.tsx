import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowRight, ArrowLeft, ArrowLeftRight, MapPin, Clock, ChevronDown,
  Send, Package, CheckCircle, FileText, Bike, User, Phone, ClipboardList, Info, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const ORDER_TYPES = [
  'طعام',
  'بقالة',
  'أدوية',
  'عسل وتمور',
  'مستلزمات منزلية',
  'ملابس',
  'إلكترونيات',
  'مستندات',
  'هدايا',
  'أخرى',
];

interface WasalniForm {
  customerName: string;
  customerPhone: string;
  fromAddress: string;
  toAddress: string;
  orderType: string;
  notes: string;
  scheduledDate: string;
  scheduledTime: string;
}

export default function WasalniPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showInvoice, setShowInvoice] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [showSchedulePopup, setShowSchedulePopup] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const getLocationAddress = async (targetField: 'toAddress' | 'fromAddress') => {
    if (!navigator.geolocation) {
      toast({ title: "الموقع غير مدعوم", description: "متصفحك لا يدعم تحديد الموقع", variant: "destructive" });
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ar`,
            { headers: { 'User-Agent': 'AlSarieOne/1.0' } }
          );
          const data = await response.json();
          if (data && data.display_name) {
            const parts = data.display_name.split(',');
            const shortAddr = parts.slice(0, 4).join('،').trim();
            setForm(p => ({ ...p, [targetField]: shortAddr }));
            toast({ title: "تم تحديد الموقع", description: shortAddr });
          } else {
            const coordsText = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setForm(p => ({ ...p, [targetField]: coordsText }));
          }
        } catch {
          const coordsText = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setForm(p => ({ ...p, [targetField]: coordsText }));
          toast({ title: "تم تحديد الإحداثيات", description: "أدخل العنوان يدوياً لمزيد من الدقة" });
        } finally {
          setGettingLocation(false);
        }
      },
      (err) => {
        setGettingLocation(false);
        toast({ title: "تعذر تحديد الموقع", description: "يرجى السماح بالوصول للموقع أو إدخال العنوان يدوياً", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toTimeString().slice(0, 5);

  const [form, setForm] = useState<WasalniForm>({
    customerName: user?.name || localStorage.getItem('customer_name') || '',
    customerPhone: user?.phone || localStorage.getItem('customer_phone') || '',
    fromAddress: '',
    toAddress: '',
    orderType: 'طعام',
    notes: '',
    scheduledDate: today,
    scheduledTime: nowTime,
  });

  // Get wasalni settings
  const { data: settings } = useQuery<any[]>({ queryKey: ['/api/ui-settings'] });
  const getSettingVal = (key: string, def = '') =>
    (settings as any[])?.find((s: any) => s.key === key)?.value || def;

  const deliveryFee = parseFloat(getSettingVal('wasalni_base_fee', '5'));
  const serviceName = getSettingVal('wasalni_service_name', 'وصل لي');
  const openingTime = getSettingVal('opening_time', '08:00');
  const closingTime = getSettingVal('closing_time', '23:00');
  const storeStatus = getSettingVal('store_status', 'open');

  const { data: appStatus } = useQuery({
    queryKey: ['/api/app-status', openingTime, closingTime, storeStatus],
    queryFn: async () => {
      const res = await fetch(`/api/app-status?opening=${openingTime}&closing=${closingTime}&status=${storeStatus}`);
      return res.json();
    },
    enabled: !!settings
  });

  useEffect(() => {
    if (appStatus && !appStatus.isOpen && step === 1 && !showSchedulePopup) {
      setShowSchedulePopup(true);
    }
  }, [appStatus, step]);

  const createRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/wasalni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل في إرسال الطلب');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSubmittedRequest(data.request);
      setStep(7); // Move to Invoice step
      localStorage.setItem('customer_name', form.customerName);
      localStorage.setItem('customer_phone', form.customerPhone);
      // تحديث صفحة طلباتي وإشعارات العميل فوراً ليظهر طلب وصل لي الجديد
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wasalni'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/customer'] });
      toast({
        title: "✅ تم إرسال طلب وصل لي",
        description: `رقم الطلب: ${data.request.requestNumber}`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "خطأ",
        description: err.message || 'حدث خطأ، يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      });
    },
  });

  const nextStep = () => {
    if (step === 1 && !form.toAddress) {
      toast({ title: "العنوان مطلوب", description: "يرجى تحديد وجهة التوصيل", variant: "destructive" });
      return;
    }
    if (step === 2 && !form.fromAddress) {
      toast({ title: "العنوان مطلوب", description: "يرجى تحديد مكان استلام الطلب", variant: "destructive" });
      return;
    }
    if (step === 3 && (!form.customerName || !form.customerPhone)) {
      toast({ title: "بيانات ناقصة", description: "يرجى إدخال الاسم ورقم الهاتف", variant: "destructive" });
      return;
    }
    
    if (step === 6) {
      setStep(7);
      return;
    }
    
    setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    if (appStatus && !appStatus.isOpen && storeStatus === 'closed') {
      toast({
        title: "التطبيق مغلق",
        description: "عذراً، التطبيق مغلق حالياً من قِبل الإدارة ولا يمكن استقبال طلبات جديدة",
        variant: "destructive"
      });
      return;
    }
    
    createRequestMutation.mutate({
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      customerId: user?.id || undefined,
      fromAddress: form.fromAddress,
      toAddress: form.toAddress,
      orderType: form.orderType,
      notes: form.notes || undefined,
      scheduledDate: form.scheduledDate,
      scheduledTime: form.scheduledTime,
      estimatedFee: deliveryFee,
    });
  };

  if (step === 7 && submittedRequest) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-4 flex items-center gap-3">
          <button onClick={() => setLocation('/')} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <ArrowRight className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-black">فاتورة طلب {serviceName}</h1>
        </div>

        <div className="max-w-md mx-auto p-4 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-1">تم استلام طلبك!</h2>
            <p className="text-gray-500 text-sm">رقم طلب {serviceName}: <span className="font-bold text-primary">{submittedRequest.requestNumber}</span></p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <h3 className="font-black text-gray-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              تفاصيل الطلب
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                <MapPin className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">من عنوان</p>
                  <p className="font-bold text-gray-800">{submittedRequest.fromAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                <MapPin className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">إلى عنوان</p>
                  <p className="font-bold text-gray-800">{submittedRequest.toAddress}</p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                <span className="text-gray-500">نوع الطلب</span>
                <span className="font-bold text-gray-800">{submittedRequest.orderType}</span>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                <span className="text-gray-500">وقت التنفيذ</span>
                <span className="font-bold text-gray-800">{submittedRequest.scheduledDate} - {submittedRequest.scheduledTime}</span>
              </div>
              {submittedRequest.notes && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-500 text-xs mb-1">ملاحظات</p>
                  <p className="text-gray-800">{submittedRequest.notes}</p>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-semibold">رسوم التوصيل المتوقعة</span>
                <span className="text-xl font-black text-primary">{formatCurrency(deliveryFee)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">* قد تتغير الرسوم النهائية بعد مراجعة الطلب</p>
            </div>
          </div>

          <Button
            onClick={() => setLocation('/')}
            className="w-full h-14 bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-lg rounded-2xl hover:opacity-90"
          >
            تأكيد الطلب والبحث عن مندوب
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => step === 1 ? setLocation('/') : prevStep()} className="p-1 hover:bg-white/20 rounded-full transition-colors">
          <ArrowRight className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Bike className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black">{serviceName}</h1>
            <p className="text-white/80 text-xs">خطوة {step} من 6</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        
        {/* Step Progress */}
        <div className="flex justify-between items-center px-2 mb-2">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${step >= s ? 'bg-orange-500 w-12' : 'bg-gray-200 w-8'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4 animate-in fade-in slide-in-from-left-4">
            <div className="flex items-center gap-3 text-orange-600 mb-2">
              <MapPin className="h-6 w-6" />
              <h2 className="text-xl font-black">إلى أين يوصل؟</h2>
            </div>
            <p className="text-gray-500 text-sm">حدد عنوانك بدقة (المنطقة، الشارع، معلم قريب).</p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">عنوان التوصيل</Label>
                <Input
                  value={form.toAddress}
                  onChange={(e) => setForm(p => ({ ...p, toAddress: e.target.value }))}
                  placeholder="مثال: خور مكسر، حي السعادة، خلف معهد الفنون"
                  className="h-14 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white focus:ring-orange-500 transition-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => getLocationAddress('toAddress')}
                  disabled={gettingLocation}
                  className="w-full h-10 rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50 text-sm gap-2"
                >
                  {gettingLocation ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> جاري تحديد موقعك...</>
                  ) : (
                    <><MapPin className="h-4 w-4" /> استخدم موقعي الحالي</>
                  )}
                </Button>
              </div>
            </div>
            <Button onClick={nextStep} className="w-full h-14 bg-orange-500 hover:bg-orange-600 rounded-2xl text-lg font-black">
              التالي
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4 animate-in fade-in slide-in-from-left-4">
            <div className="flex items-center gap-3 text-green-600 mb-2">
              <MapPin className="h-6 w-6" />
              <h2 className="text-xl font-black">من أين يجلب؟</h2>
            </div>
            <p className="text-gray-500 text-sm">حدد المصدر (مطعم، محل، مول، أو عنوان آخر).</p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">عنوان الاستلام</Label>
                <Input
                  value={form.fromAddress}
                  onChange={(e) => setForm(p => ({ ...p, fromAddress: e.target.value }))}
                  placeholder="مثال: كريتر، بجانب مول عدن"
                  className="h-14 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white focus:ring-green-500 transition-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => getLocationAddress('fromAddress')}
                  disabled={gettingLocation}
                  className="w-full h-10 rounded-xl border-green-200 text-green-600 hover:bg-green-50 text-sm gap-2"
                >
                  {gettingLocation ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> جاري تحديد موقعك...</>
                  ) : (
                    <><MapPin className="h-4 w-4" /> استخدم موقعي الحالي</>
                  )}
                </Button>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={prevStep} variant="outline" className="h-14 rounded-2xl px-6 border-gray-200">
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button onClick={nextStep} className="flex-1 h-14 bg-green-500 hover:bg-green-600 rounded-2xl text-lg font-black">
                التالي
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4 animate-in fade-in slide-in-from-left-4">
            <div className="flex items-center gap-3 text-blue-600 mb-2">
              <User className="h-6 w-6" />
              <h2 className="text-xl font-black">بيانات العميل</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">الاسم</Label>
                <div className="relative">
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    value={form.customerName}
                    onChange={(e) => setForm(p => ({ ...p, customerName: e.target.value }))}
                    placeholder="ادخل اسمك"
                    className="h-14 pr-12 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">رقم الهاتف</Label>
                <div className="relative">
                  <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    value={form.customerPhone}
                    onChange={(e) => setForm(p => ({ ...p, customerPhone: e.target.value }))}
                    placeholder="ادخل رقم هاتفك"
                    type="tel"
                    className="h-14 pr-12 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={prevStep} variant="outline" className="h-14 rounded-2xl px-6 border-gray-200">
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button onClick={nextStep} className="flex-1 h-14 bg-blue-500 hover:bg-blue-600 rounded-2xl text-lg font-black">
                التالي
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4 animate-in fade-in slide-in-from-left-4">
            <div className="flex items-center gap-3 text-purple-600 mb-2">
              <ClipboardList className="h-6 w-6" />
              <h2 className="text-xl font-black">ملاحظة الطلب (اختياري)</h2>
            </div>
            <p className="text-gray-500 text-sm">تعليمات إضافية للمندوب.</p>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="اكتب أي ملاحظات هنا..."
              className="min-h-[150px] rounded-2xl border-gray-100 bg-gray-50 focus:bg-white focus:ring-purple-500 transition-all"
            />
            <div className="flex gap-3">
              <Button onClick={prevStep} variant="outline" className="h-14 rounded-2xl px-6 border-gray-200">
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button onClick={nextStep} className="flex-1 h-14 bg-purple-500 hover:bg-purple-600 rounded-2xl text-lg font-black">
                التالي
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4 animate-in fade-in slide-in-from-left-4">
            <div className="flex items-center gap-3 text-orange-600 mb-2">
              <Package className="h-6 w-6" />
              <h2 className="text-xl font-black">نوع الطلب</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ORDER_TYPES.map((type) => (
                <div
                  key={type}
                  onClick={() => setForm(p => ({ ...p, orderType: type }))}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all text-center font-bold ${form.orderType === type ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-50 bg-gray-50 text-gray-500 hover:border-gray-200'}`}
                >
                  {type}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button onClick={prevStep} variant="outline" className="h-14 rounded-2xl px-6 border-gray-200">
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button onClick={nextStep} className="flex-1 h-14 bg-orange-500 hover:bg-orange-600 rounded-2xl text-lg font-black">
                التالي
              </Button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4 animate-in fade-in slide-in-from-left-4">
            <div className="flex items-center gap-3 text-primary mb-2">
              <Clock className="h-6 w-6" />
              <h2 className="text-xl font-black">وقت التنفيذ</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">التاريخ</Label>
                <Input
                  type="date"
                  value={form.scheduledDate}
                  min={today}
                  onChange={(e) => setForm(p => ({ ...p, scheduledDate: e.target.value }))}
                  className="h-14 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">الوقت</Label>
                <Input
                  type="time"
                  value={form.scheduledTime}
                  onChange={(e) => setForm(p => ({ ...p, scheduledTime: e.target.value }))}
                  className="h-14 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={prevStep} variant="outline" className="h-14 rounded-2xl px-6 border-gray-200">
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button onClick={handleSubmit} disabled={createRequestMutation.isPending} className="flex-1 h-14 bg-primary hover:bg-primary/90 rounded-2xl text-lg font-black">
                {createRequestMutation.isPending ? 'جاري المعالجة...' : 'عرض الفاتورة'}
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* App Closed / Schedule Dialog */}
      <Dialog open={showSchedulePopup} onOpenChange={setShowSchedulePopup}>
        <DialogContent className="max-w-xs rounded-3xl" dir="rtl">
          <DialogHeader className="items-center text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-2">
              <Info className="h-8 w-8 text-orange-600" />
            </div>
            <DialogTitle className="text-xl font-black">التطبيق مغلق حالياً</DialogTitle>
            <DialogDescription className="text-gray-600 font-medium pt-2">
              {`هل تريد أن نقوم بتسجيل طلبك إلى وقت فتح التطبيق وهو (${openingTime})؟`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 pt-4">
            <Button 
              onClick={() => {
                setForm(p => ({ ...p, scheduledTime: openingTime }));
                setShowSchedulePopup(false);
              }}
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold"
            >
              نعم، جدولة الطلب
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowSchedulePopup(false);
                setLocation('/');
              }}
              className="w-full h-12 rounded-xl font-bold"
            >
              إلغاء والعودة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
