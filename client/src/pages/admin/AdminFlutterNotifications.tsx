import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Send, Smartphone, Users, CheckCircle, Trash2,
  History, Filter, RefreshCw, Globe, Truck, User, Info,
  Tag, AlertTriangle, ShoppingBag, CreditCard, BarChart2,
  Users as UsersIcon, Clock, Target, Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

const RECIPIENT_TYPES = [
  { value: 'all', label: 'جميع المستخدمين', icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50' },
  { value: 'customer', label: 'العملاء', icon: User, color: 'text-green-600', bg: 'bg-green-50' },
  { value: 'driver', label: 'السائقون', icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50' },
  { value: 'flutter', label: 'مستخدمو التطبيق', icon: Smartphone, color: 'text-purple-600', bg: 'bg-purple-50' },
];

const NOTIFICATION_TYPES = [
  { value: 'info', label: 'معلومات', icon: Info, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'offer', label: 'عرض خاص', icon: Tag, color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'order', label: 'طلب', icon: ShoppingBag, color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'alert', label: 'تنبيه', icon: AlertTriangle, color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'system', label: 'نظام', icon: Bell, color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { value: 'payment', label: 'دفع', icon: CreditCard, color: 'bg-purple-100 text-purple-800 border-purple-200' },
];

function getTypeLabel(type: string) {
  return NOTIFICATION_TYPES.find(t => t.value === type)?.label || type;
}
function getTypeColor(type: string) {
  return NOTIFICATION_TYPES.find(t => t.value === type)?.color || 'bg-gray-100 text-gray-800';
}
function getRecipientLabel(rt: string) {
  return RECIPIENT_TYPES.find(r => r.value === rt)?.label || rt;
}

export default function AdminNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('send');
  const [form, setForm] = useState({ title: '', message: '', type: 'info', recipientType: 'all' });
  const [marketingForm, setMarketingForm] = useState({ title: '', message: '', type: 'offer', days: '7' });

  // Inactive users query
  const { data: inactiveUsers = [], isLoading: inactiveLoading } = useQuery({
    queryKey: ['/api/admin/marketing/inactive-users', marketingForm.days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/marketing/inactive-users?days=${marketingForm.days}`);
      return res.json();
    },
    enabled: activeTab === 'marketing',
  });

  const sendMassMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/marketing/send-mass-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: 'تم الإرسال بنجاح ✅', description: data.message });
      setMarketingForm(f => ({ ...f, title: '', message: '' }));
      queryClient.invalidateQueries({ queryKey: ['/api/flutter/notifications/history'] });
    },
  });

  const handleSendMarketing = () => {
    if (!marketingForm.title || !marketingForm.message || inactiveUsers.length === 0) {
      toast({ title: 'خطأ', description: 'يرجى إكمال البيانات والتأكد من وجود مستهدفين', variant: 'destructive' });
      return;
    }
    sendMassMutation.mutate({
      userIds: inactiveUsers.map((u: any) => u.id),
      title: marketingForm.title,
      message: marketingForm.message,
      type: marketingForm.type
    });
  };

  const [historyFilter, setHistoryFilter] = useState({ recipientType: 'all', type: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/flutter/notifications/stats'],
    queryFn: async () => {
      const res = await fetch('/api/flutter/notifications/stats');
      if (!res.ok) throw new Error('فشل');
      return res.json();
    },
    refetchInterval: 60000,
  });

  // Device tokens
  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ['/api/flutter/device-tokens'],
    queryFn: async () => {
      const res = await fetch('/api/flutter/device-tokens');
      if (!res.ok) throw new Error('فشل');
      return res.json();
    },
    refetchInterval: 30000,
  });

  // History
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['/api/flutter/notifications/history', historyFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (historyFilter.recipientType !== 'all') params.set('recipientType', historyFilter.recipientType);
      if (historyFilter.type) params.set('type', historyFilter.type);
      params.set('limit', '100');
      const res = await fetch(`/api/flutter/notifications/history?${params}`);
      if (!res.ok) throw new Error('فشل');
      return res.json();
    },
  });

  // Send notification
  const sendMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch('/api/flutter/notifications/send-targeted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('فشل');
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: 'تم إرسال الإشعار ✅', description: data.message });
      setForm({ title: '', message: '', type: 'info', recipientType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/flutter/notifications/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/flutter/notifications/stats'] });
    },
    onError: () => {
      toast({ title: 'خطأ في الإرسال', variant: 'destructive' });
    },
  });

  // Delete notification
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/flutter/notifications/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('فشل');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'تم حذف الإشعار' });
      queryClient.invalidateQueries({ queryKey: ['/api/flutter/notifications/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/flutter/notifications/stats'] });
    },
    onError: () => {
      toast({ title: 'خطأ في الحذف', variant: 'destructive' });
    },
  });

  const handleSend = () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى إدخال العنوان والمحتوى', variant: 'destructive' });
      return;
    }
    sendMutation.mutate(form);
  };

  const devices = devicesData?.tokens ?? [];
  const notifs = historyData?.notifications ?? [];

  const selectedRecipient = RECIPIENT_TYPES.find(r => r.value === form.recipientType);
  const RecipientIcon = selectedRecipient?.icon || Globe;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-green-100 rounded-xl">
          <Bell className="h-7 w-7 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">نظام الإشعارات</h1>
          <p className="text-gray-500 text-sm">أرسل وتتبع إشعارات التطبيق بشكل كامل</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">إجمالي الإشعارات</p>
                <p className="text-2xl font-bold text-green-600">{statsLoading ? '...' : stats?.total ?? 0}</p>
              </div>
              <Bell className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">الأجهزة المسجّلة</p>
                <p className="text-2xl font-bold text-blue-600">{statsLoading ? '...' : stats?.deviceCount ?? 0}</p>
              </div>
              <Smartphone className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">غير مقروءة</p>
                <p className="text-2xl font-bold text-orange-600">{statsLoading ? '...' : stats?.unread ?? 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">معدل القراءة</p>
                <p className="text-2xl font-bold text-purple-600">{statsLoading ? '...' : `${stats?.readRate ?? 0}%`}</p>
              </div>
              <BarChart2 className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="send" className="gap-2"><Send className="h-4 w-4" />إرسال إشعار</TabsTrigger>
          <TabsTrigger value="marketing" className="gap-2"><Target className="h-4 w-4" />تسويق ذكي</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" />سجل الإشعارات</TabsTrigger>
          <TabsTrigger value="devices" className="gap-2"><Smartphone className="h-4 w-4" />الأجهزة</TabsTrigger>
        </TabsList>

        {/* ── تبويب التسويق الذكي ── */}
        <TabsContent value="marketing" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Targeted Tool */}
            <Card className="lg:col-span-2 border-2 border-primary/10 shadow-lg">
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  حملة إعادة التنشيط
                </CardTitle>
                <CardDescription>استهدف العملاء الذين لم يطلبوا منذ فترة محددة</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <Clock className="h-10 w-10 text-orange-500" />
                  <div>
                    <p className="font-bold text-orange-800">تحديد الفترة الزمنية</p>
                    <Select 
                      value={marketingForm.days} 
                      onValueChange={(v) => setMarketingForm(f => ({...f, days: v}))}
                    >
                      <SelectTrigger className="w-[200px] mt-1">
                        <SelectValue placeholder="اختر الفترة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">لم يطلبوا منذ يوم</SelectItem>
                        <SelectItem value="3">لم يطلبوا منذ 3 أيام</SelectItem>
                        <SelectItem value="7">لم يطلبوا منذ أسبوع</SelectItem>
                        <SelectItem value="14">لم يطلبوا منذ أسبوعين</SelectItem>
                        <SelectItem value="30">لم يطلبوا منذ شهر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-bold">عنوان الحملة</Label>
                    <Input 
                      placeholder="مثال: اشتقنا لك! خصم خاص بانتظارك" 
                      value={marketingForm.title}
                      onChange={e => setMarketingForm(f => ({...f, title: e.target.value}))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">نص الرسالة</Label>
                    <Textarea 
                      placeholder="اكتب عرضاً مغرياً لتشجيع العميل على العودة..." 
                      className="min-h-[100px]"
                      value={marketingForm.message}
                      onChange={e => setMarketingForm(f => ({...f, message: e.target.value}))}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 border-t flex justify-between items-center p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <UsersIcon className="h-4 w-4" />
                  المستهدفون: <span className="font-bold text-primary">{inactiveLoading ? '...' : inactiveUsers.length} عميل</span>
                </div>
                <Button 
                  onClick={handleSendMarketing}
                  disabled={sendMassMutation.isPending || inactiveUsers.length === 0}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="h-4 w-4 ml-2" />
                  إطلاق الحملة الآن
                </Button>
              </CardFooter>
            </Card>

            {/* Smart Suggestions */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Gift className="h-4 w-4 text-pink-500" />
                    اقتراحات تسويقية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800 border border-blue-100">
                    <p className="font-bold mb-1">💡 نصيحة</p>
                    أفضل وقت لإرسال الإشعارات هو بين الساعة 12 ظهراً و 2 ظهراً، أو 7 مساءً و 9 مساءً.
                  </div>
                  <Button variant="outline" className="w-full text-xs justify-start gap-2 h-auto py-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    عرض "توصيل مجاني" للعملاء الجدد
                  </Button>
                  <Button variant="outline" className="w-full text-xs justify-start gap-2 h-auto py-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    تذكير بالسلة المهجورة
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── تبويب الإرسال ── */}
        <TabsContent value="send" className="space-y-4">
          {/* آلية العمل */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-800 space-y-1">
                  <p className="font-semibold">كيف تعمل الإشعارات؟</p>
                  <p>عند الإرسال يُحفظ الإشعار في قاعدة البيانات. يتحقق تطبيق الجوال من الإشعارات الجديدة كل 30 ثانية ويعرضها تلقائياً على الجهاز.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                إرسال إشعار جديد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* المستلمون */}
              <div className="space-y-2">
                <Label className="font-semibold">المستلمون</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {RECIPIENT_TYPES.map(r => {
                    const Icon = r.icon;
                    const selected = form.recipientType === r.value;
                    return (
                      <button
                        key={r.value}
                        onClick={() => setForm(f => ({ ...f, recipientType: r.value }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                          selected ? `border-green-500 ${r.bg} ${r.color}` : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* نوع الإشعار */}
              <div className="space-y-2">
                <Label className="font-semibold">نوع الإشعار</Label>
                <div className="flex flex-wrap gap-2">
                  {NOTIFICATION_TYPES.map(t => {
                    const Icon = t.icon;
                    const selected = form.type === t.value;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setForm(f => ({ ...f, type: t.value }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                          selected ? `border-green-500 ${t.color}` : 'border-transparent bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* العنوان */}
              <div className="space-y-2">
                <Label htmlFor="notif-title" className="font-semibold">عنوان الإشعار *</Label>
                <Input
                  id="notif-title"
                  placeholder="مثال: عرض خاص اليوم فقط!"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="text-right"
                  dir="rtl"
                  maxLength={100}
                />
                <p className="text-xs text-gray-400 text-left">{form.title.length}/100</p>
              </div>

              {/* المحتوى */}
              <div className="space-y-2">
                <Label htmlFor="notif-message" className="font-semibold">محتوى الإشعار *</Label>
                <Textarea
                  id="notif-message"
                  placeholder="مثال: احصل على خصم 20% على جميع المنتجات اليوم..."
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  className="text-right min-h-[100px]"
                  dir="rtl"
                  maxLength={300}
                />
                <p className="text-xs text-gray-400 text-left">{form.message.length}/300</p>
              </div>

              {/* معاينة */}
              {(form.title || form.message) && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-xs text-gray-400 mb-3">معاينة الإشعار</p>
                  <div className="bg-white rounded-xl p-3 shadow-sm flex items-start gap-3 border border-gray-100">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shrink-0 text-white text-lg">🔔</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-sm text-gray-900">{form.title || 'عنوان الإشعار'}</p>
                        <span className="text-xs text-gray-400">الآن</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{form.message || 'محتوى الإشعار...'}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Badge variant="outline" className={`text-xs ${getTypeColor(form.type)}`}>
                          {getTypeLabel(form.type)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getRecipientLabel(form.recipientType)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSend}
                disabled={sendMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 h-11"
              >
                {sendMutation.isPending ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" />جارٍ الإرسال...</>
                ) : (
                  <><Send className="h-4 w-4" />إرسال الإشعار إلى {getRecipientLabel(form.recipientType)}</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── تبويب السجل ── */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  سجل الإشعارات ({historyData?.total ?? 0})
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select
                    value={historyFilter.recipientType}
                    onValueChange={v => setHistoryFilter(f => ({ ...f, recipientType: v }))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="المستلمون" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      {RECIPIENT_TYPES.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={historyFilter.type || 'all_types'}
                    onValueChange={v => setHistoryFilter(f => ({ ...f, type: v === 'all_types' ? '' : v }))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_types">كل الأنواع</SelectItem>
                      {NOTIFICATION_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => refetchHistory()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="text-center py-8 text-gray-400">جاري التحميل...</div>
              ) : notifs.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد إشعارات مرسلة</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {notifs.map((n: any) => (
                    <div key={n.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-sm text-gray-900 truncate">{n.title}</p>
                          <Badge variant="outline" className={`text-xs ${getTypeColor(n.type)}`}>
                            {getTypeLabel(n.type)}
                          </Badge>
                          <Badge variant="outline" className="text-xs text-blue-700 bg-blue-50">
                            {getRecipientLabel(n.recipientType)}
                          </Badge>
                          {!n.isRead && (
                            <Badge className="text-xs bg-orange-500 text-white">غير مقروء</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-1">{n.message}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(n.createdAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف الإشعار</AlertDialogTitle>
                            <AlertDialogDescription>هل أنت متأكد من حذف هذا الإشعار؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => deleteMutation.mutate(n.id)}
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── تبويب الأجهزة ── */}
        <TabsContent value="devices" className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">إجمالي الأجهزة</p>
                <p className="text-3xl font-bold text-green-600">{devicesLoading ? '...' : devicesData?.count ?? 0}</p>
                <Users className="h-6 w-6 mx-auto mt-2 text-green-300" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Android</p>
                <p className="text-3xl font-bold text-gray-700">
                  {devicesLoading ? '...' : devices.filter((d: any) => d.platform === 'android').length}
                </p>
                <Smartphone className="h-6 w-6 mx-auto mt-2 text-green-300" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">iOS</p>
                <p className="text-3xl font-bold text-gray-700">
                  {devicesLoading ? '...' : devices.filter((d: any) => d.platform === 'ios').length}
                </p>
                <Smartphone className="h-6 w-6 mx-auto mt-2 text-blue-300" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                الأجهزة المسجّلة ({devices.length})
              </CardTitle>
              <CardDescription>قائمة بجميع أجهزة المستخدمين المرتبطة بالتطبيق</CardDescription>
            </CardHeader>
            <CardContent>
              {devicesLoading ? (
                <div className="text-center py-8 text-gray-400">جاري التحميل...</div>
              ) : devices.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد أجهزة مسجّلة بعد</p>
                  <p className="text-sm mt-1">ستظهر هنا عند تثبيت التطبيق وتسجيل الدخول</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رمز الجهاز</TableHead>
                      <TableHead>المنصة</TableHead>
                      <TableHead>تاريخ التسجيل</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((device: any) => (
                      <TableRow key={device.id}>
                        <TableCell>
                          <span className="font-mono text-xs text-gray-500">
                            {device.token.substring(0, 25)}...
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={device.platform === 'ios' ? 'secondary' : 'default'}>
                            {device.platform === 'ios' ? '🍎 iOS' : '🤖 Android'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {new Date(device.createdAt).toLocaleDateString('ar-YE')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            نشط
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
