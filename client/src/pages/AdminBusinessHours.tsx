import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Clock, Save, AlertCircle } from 'lucide-react';

interface BusinessHoursSettings {
  opening_time: string;
  closing_time: string;
  store_status: string;
}

export default function AdminBusinessHours() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<BusinessHoursSettings>({
    opening_time: '11:00',
    closing_time: '23:00',
    store_status: 'open'
  });

  // جلب الإعدادات الحالية
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/ui-settings'],
    select: (data: any[]) => {
      const result = {
        opening_time: '11:00',
        closing_time: '23:00', 
        store_status: 'open'
      };
      
      data?.forEach((setting) => {
        if (setting.key === 'opening_time') result.opening_time = setting.value;
        if (setting.key === 'closing_time') result.closing_time = setting.value;
        if (setting.key === 'store_status') result.store_status = setting.value;
      });
      
      return result;
    }
  });

  // تحديث النموذج عندما تصل البيانات
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // تحديث أوقات العمل
  const updateBusinessHours = useMutation({
    mutationFn: async (data: BusinessHoursSettings) => {
      // Update each setting individually
      const updates = [
        apiRequest('PUT', `/api/ui-settings/opening_time`, { value: data.opening_time }),
        apiRequest('PUT', `/api/ui-settings/closing_time`, { value: data.closing_time }),
        apiRequest('PUT', `/api/ui-settings/store_status`, { value: data.store_status })
      ];
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث أوقات العمل بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ui-settings'] });
    },
    onError: (error) => {
      console.error('خطأ في تحديث أوقات العمل:', error);
      toast({
        title: "خطأ في التحديث", 
        description: "حدث خطأ أثناء تحديث أوقات العمل",
        variant: "destructive"
      });
    }
  });

  // تحويل الوقت إلى نسق 12 ساعة مع "ص" أو "م"
  const formatTimeArabic12 = (timeStr: string): string => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    if (isNaN(h)) return timeStr;
    const period = h >= 12 ? 'م (مساءً)' : 'ص (صباحاً)';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${period}`;
  };

  // تغيير الوقت بين ص و م
  const toggleTimeAmPm = (timeStr: string, targetPeriod: 'AM' | 'PM'): string => {
    if (!timeStr) return timeStr;
    const parts = timeStr.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    if (isNaN(h)) return timeStr;

    if (targetPeriod === 'AM') {
      if (h >= 12) h = h - 12;
    } else {
      if (h < 12) h = h + 12;
    }
    const hStr = h.toString().padStart(2, '0');
    return `${hStr}:${m}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // التحقق من صحة البيانات
    if (!formData.opening_time || !formData.closing_time) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    updateBusinessHours.mutate(formData);
  };

  const handleInputChange = (field: keyof BusinessHoursSettings, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleStoreStatus = (isOpen: boolean) => {
    setFormData(prev => ({
      ...prev,
      store_status: isOpen ? 'open' : 'closed'
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6" data-testid="page-admin-business-hours">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="page-admin-business-hours">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">إدارة أوقات العمل</h1>
        </div>
        <p className="text-gray-600">تحديد أوقات فتح وإغلاق المتجر وحالة التشغيل</p>
      </div>

      {/* Business Hours Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            إعدادات أوقات العمل
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Store Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-gray-600" />
                <div>
                  <Label className="text-base font-medium">حالة المتجر</Label>
                  <p className="text-sm text-gray-600">تفعيل أو إيقاف قبول الطلبات</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${formData.store_status === 'open' ? 'text-green-600' : 'text-red-600'}`}>
                  {formData.store_status === 'open' ? 'مفتوح' : 'مغلق'}
                </span>
                <Switch
                  checked={formData.store_status === 'open'}
                  onCheckedChange={toggleStoreStatus}
                  data-testid="switch-store-status"
                />
              </div>
            </div>

            {/* Opening Time */}
            <div className="space-y-2">
              <Label htmlFor="opening_time" className="text-sm font-medium block">
                وقت الفتح
              </Label>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  id="opening_time"
                  type="time"
                  value={formData.opening_time}
                  onChange={(e) => handleInputChange('opening_time', e.target.value)}
                  className="w-36 text-center font-mono font-bold text-base"
                  data-testid="input-opening-time"
                />
                <span className="px-3 py-1.5 bg-blue-100 text-blue-900 rounded-md text-sm font-bold border border-blue-200 min-w-[120px] text-center">
                  {formatTimeArabic12(formData.opening_time)}
                </span>
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-md">
                  <button
                    type="button"
                    onClick={() => handleInputChange('opening_time', toggleTimeAmPm(formData.opening_time, 'AM'))}
                    className={`px-2.5 py-1 text-xs rounded font-bold transition-all ${
                      parseInt(formData.opening_time.split(':')[0] || '0', 10) < 12
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ☀️ ص (صباحاً)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('opening_time', toggleTimeAmPm(formData.opening_time, 'PM'))}
                    className={`px-2.5 py-1 text-xs rounded font-bold transition-all ${
                      parseInt(formData.opening_time.split(':')[0] || '0', 10) >= 12
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🌙 م (مساءً)
                  </button>
                </div>
              </div>
            </div>

            {/* Closing Time */}
            <div className="space-y-2">
              <Label htmlFor="closing_time" className="text-sm font-medium block">
                وقت الإغلاق
              </Label>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  id="closing_time"
                  type="time"
                  value={formData.closing_time}
                  onChange={(e) => handleInputChange('closing_time', e.target.value)}
                  className="w-36 text-center font-mono font-bold text-base"
                  data-testid="input-closing-time"
                />
                <span className="px-3 py-1.5 bg-blue-100 text-blue-900 rounded-md text-sm font-bold border border-blue-200 min-w-[120px] text-center">
                  {formatTimeArabic12(formData.closing_time)}
                </span>
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-md">
                  <button
                    type="button"
                    onClick={() => handleInputChange('closing_time', toggleTimeAmPm(formData.closing_time, 'AM'))}
                    className={`px-2.5 py-1 text-xs rounded font-bold transition-all ${
                      parseInt(formData.closing_time.split(':')[0] || '0', 10) < 12
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ☀️ ص (صباحاً)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('closing_time', toggleTimeAmPm(formData.closing_time, 'PM'))}
                    className={`px-2.5 py-1 text-xs rounded font-bold transition-all ${
                      parseInt(formData.closing_time.split(':')[0] || '0', 10) >= 12
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🌙 م (مساءً)
                  </button>
                </div>
              </div>
            </div>

            {/* Business Hours Preview */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-1 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                معاينة أوقات العمل
              </h4>
              <p className="text-blue-900 font-bold text-sm">
                {formData.store_status === 'open' ? (
                  <>المتجر يفتح الساعة <span className="text-emerald-700 font-extrabold">{formatTimeArabic12(formData.opening_time)}</span> ويغلق الساعة <span className="text-purple-700 font-extrabold">{formatTimeArabic12(formData.closing_time)}</span></>
                ) : (
                  'المتجر مغلق حالياً بقرار الإدارة'
                )}
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={updateBusinessHours.isPending}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-save-business-hours"
              >
                {updateBusinessHours.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    حفظ التغييرات
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">معلومات مهمة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>ستظهر أوقات العمل المحدثة فوراً في التطبيق للعملاء</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>عند إغلاق المتجر، لن يتمكن العملاء من إجراء طلبات جديدة</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>يمكن تغيير الأوقات في أي وقت حسب احتياجاتك</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}