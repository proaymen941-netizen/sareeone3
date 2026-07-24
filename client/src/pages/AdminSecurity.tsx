import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Shield, UserCheck, Eye, EyeOff, 
  RefreshCw, Users, Globe, Smartphone,
  Mail, Phone, MapPin, Calendar, Clock,
  Lock, Unlock, Bell, MessageSquare, AlertCircle,
  Save, Trash2, Plus, Key, CheckCircle2, ShieldAlert, ShieldCheck,
  Search, Filter, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  passwordComplexity: 'low' | 'medium' | 'high';
  ipWhitelist: string[];
  maxLoginAttempts: number;
  forceSsl: boolean;
  loginNotifications: boolean;
  lastAudit: string;
}

interface SecurityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  ipAddress: string;
  device: string;
  location: string;
  createdAt: string;
  status: 'success' | 'failure' | 'warning';
}

export default function AdminSecurity() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formSettings, setFormSettings] = useState<Partial<SecuritySettings>>({
    twoFactorEnabled: false,
    sessionTimeout: 60,
    passwordComplexity: 'medium',
    ipWhitelist: [],
    maxLoginAttempts: 5,
    forceSsl: true,
    loginNotifications: true,
  });

  const [newIp, setNewIp] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Password change state
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const { data: securitySettings, isLoading: isSettingsLoading } = useQuery<SecuritySettings>({
    queryKey: ['/api/admin/security/settings'],
  });

  const { data: securityLogs = [], isLoading: isLogsLoading, refetch: refetchLogs } = useQuery<SecurityLog[]>({
    queryKey: ['/api/admin/security/logs'],
  });

  useEffect(() => {
    if (securitySettings) {
      setFormSettings(securitySettings);
    }
  }, [securitySettings]);

  // Mutations
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: Partial<SecuritySettings>) => {
      return apiRequest('POST', '/api/admin/security/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/security/settings'] });
      toast({
        title: "تمت الحفظ",
        description: "تمت إعدادات الأمان والخصوصية بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ إعدادات الأمان",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/admin/security/change-password', data);
    },
    onSuccess: () => {
      setIsPasswordDialogOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({
        title: "تم تغيير كلمة المرور",
        description: "تم تحديث كلمة المرور لحساب المدير بنجاح",
      });
    },
    onError: (err: any) => {
      toast({
        title: "فشل تغيير كلمة المرور",
        description: err.message || "تأكد من صحة البيانات المدخلة",
        variant: "destructive",
      });
    },
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/admin/security/clear-logs', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/security/logs'] });
      toast({ title: "تم مسح سجلات الوصول الأمني بنجاح" });
    },
  });

  const handleAddIp = () => {
    if (!newIp.trim()) return;
    const currentList = formSettings.ipWhitelist || [];
    if (currentList.includes(newIp.trim())) {
      toast({ title: "IP موجود بالفعل", variant: "destructive" });
      return;
    }
    setFormSettings(prev => ({
      ...prev,
      ipWhitelist: [...currentList, newIp.trim()]
    }));
    setNewIp('');
  };

  const handleRemoveIp = (ipToRemove: string) => {
    setFormSettings(prev => ({
      ...prev,
      ipWhitelist: (prev.ipWhitelist || []).filter(ip => ip !== ipToRemove)
    }));
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({ title: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const filteredLogs = securityLogs.filter(log => {
    const matchesSearch = log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.ipAddress.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen rtl" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-orange-500" />
            إدارة الأمن والخصوصية والحماية
          </h1>
          <p className="text-xs text-gray-500 mt-1">تأمين لوحة التحكم، ضبط الصلاحيات، ومراقبة سجلات الوصول والأنشطة</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsPasswordDialogOpen(true)}
            className="gap-2 border-gray-300 hover:bg-gray-50 text-xs font-semibold"
          >
            <Key className="w-4 h-4 text-orange-600" />
            تغيير كلمة المرور
          </Button>
          <Button 
            onClick={() => saveSettingsMutation.mutate(formSettings)}
            disabled={saveSettingsMutation.isPending}
            className="gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold"
          >
            <Save className="w-4 h-4" />
            {saveSettingsMutation.isPending ? 'جاري الحفظ...' : 'حفظ إعدادات الأمان'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 cols: Main Security Management & Audit Logs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Security Rules Card */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="bg-orange-50/30 border-b border-orange-100/60 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-900">
                <Lock className="w-5 h-5 text-orange-500" />
                سياسات وإعدادات الحماية الرئيسية
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 2FA */}
                <div className="p-3.5 border border-gray-200 rounded-xl bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-xs text-gray-900">المصادقة الثنائية (2FA)</Label>
                    <Switch 
                      checked={formSettings.twoFactorEnabled} 
                      onCheckedChange={v => setFormSettings(p => ({ ...p, twoFactorEnabled: v }))} 
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">تطلب رمز تحقق إضافي عبر الهاتف/الإيميل عند الدخول لزيادة الأمان.</p>
                </div>

                {/* Force SSL */}
                <div className="p-3.5 border border-gray-200 rounded-xl bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-xs text-gray-900">الاتصال المشفّر (Force HTTPS/SSL)</Label>
                    <Switch 
                      checked={formSettings.forceSsl} 
                      onCheckedChange={v => setFormSettings(p => ({ ...p, forceSsl: v }))} 
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">إجبار تشفير البيانات وإعادة توجيه كافة الطلبات عبر بروتوكول HTTPS الآمن.</p>
                </div>

                {/* Login Notifications */}
                <div className="p-3.5 border border-gray-200 rounded-xl bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-xs text-gray-900">إشعارات الدخول الجديد</Label>
                    <Switch 
                      checked={formSettings.loginNotifications} 
                      onCheckedChange={v => setFormSettings(p => ({ ...p, loginNotifications: v }))} 
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">إرسال إشعار فوري عند تسجيل الدخول للوحة التحكم من جهاز أو عنوان جديد.</p>
                </div>

                {/* Password Complexity */}
                <div className="p-3.5 border border-gray-200 rounded-xl bg-white space-y-2">
                  <Label className="font-bold text-xs text-gray-900">معيار تعقيد كلمة المرور</Label>
                  <Select 
                    value={formSettings.passwordComplexity} 
                    onValueChange={(v: any) => setFormSettings(p => ({ ...p, passwordComplexity: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">عادي (6+ أحرف)</SelectItem>
                      <SelectItem value="medium">متوسط (8+ أحرف وأرقام)</SelectItem>
                      <SelectItem value="high">مرتفع (8+ أحرف كبيرة، أرقام ورموز)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Session Timeout */}
                <div className="p-3.5 border border-gray-200 rounded-xl bg-white space-y-2">
                  <Label className="font-bold text-xs text-gray-900">مهلة الجلسة عند الخمول (بالدقائق)</Label>
                  <Input 
                    type="number" 
                    value={formSettings.sessionTimeout || 60} 
                    onChange={e => setFormSettings(p => ({ ...p, sessionTimeout: parseInt(e.target.value) }))}
                    className="h-8 text-xs"
                    min={5}
                    max={1440}
                  />
                </div>

                {/* Max Login Attempts */}
                <div className="p-3.5 border border-gray-200 rounded-xl bg-white space-y-2">
                  <Label className="font-bold text-xs text-gray-900">الحد الأقصى لمحاولات الخاطئة قبل الحظر</Label>
                  <Input 
                    type="number" 
                    value={formSettings.maxLoginAttempts || 5} 
                    onChange={e => setFormSettings(p => ({ ...p, maxLoginAttempts: parseInt(e.target.value) }))}
                    className="h-8 text-xs"
                    min={3}
                    max={20}
                  />
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Audit Logs Table Card */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="bg-gray-50/60 border-b border-gray-200/80 pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-700" />
                    سجلات الوصول والعمليات الأمنية
                  </CardTitle>
                  <CardDescription className="text-xs">تتبع حركات دخول المدراء والتعديلات الحساسة</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (confirm('هل أنت متأكد من مسح جميع سجلات الوصول الأمني؟')) {
                        clearLogsMutation.mutate();
                      }
                    }}
                    disabled={clearLogsMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5 ml-1" />
                    مسح السجلات
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => refetchLogs()}
                  >
                    <RefreshCw className="w-3.5 h-3.5 ml-1" />
                    تحديث
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              
              {/* Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" />
                  <Input
                    placeholder="بحث بالحساب، الإجراء، أو عنوان IP..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pr-9 h-9 text-xs"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 h-9 text-xs">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="success">ناجح</SelectItem>
                    <SelectItem value="failure">فشل</SelectItem>
                    <SelectItem value="warning">تحذير</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="text-right text-xs">المستخدم</TableHead>
                      <TableHead className="text-right text-xs">الإجراء</TableHead>
                      <TableHead className="text-right text-xs">عنوان IP والجهاز</TableHead>
                      <TableHead className="text-right text-xs">التاريخ والوقت</TableHead>
                      <TableHead className="text-right text-xs">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLogsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-xs text-gray-500">جاري تحميل السجلات...</TableCell>
                      </TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-xs text-gray-500">لا توجد سجلات أمان متطابقة</TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-gray-50/60">
                          <TableCell className="py-2.5">
                            <div className="font-bold text-xs text-gray-900">{log.userName}</div>
                          </TableCell>
                          <TableCell className="py-2.5 text-xs font-medium text-gray-700">
                            {log.action}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="text-xs font-mono font-medium text-gray-800 dir-ltr text-right">{log.ipAddress}</div>
                            <div className="text-[10px] text-gray-400 truncate max-w-[140px]">{log.device}</div>
                          </TableCell>
                          <TableCell className="py-2.5 text-xs text-gray-600">
                            {new Date(log.createdAt).toLocaleString('ar-YE')}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge 
                              variant={log.status === 'success' ? 'default' : log.status === 'failure' ? 'destructive' : 'secondary'}
                              className="text-[10px] font-bold px-2 py-0.5"
                            >
                              {log.status === 'success' ? 'ناجح' : log.status === 'failure' ? 'فشل' : 'تحذير'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right 1 col: System Security Health & IP Whitelist */}
        <div className="space-y-6">
          
          {/* Health Overview */}
          <Card className="shadow-sm border-gray-200 overflow-hidden">
            <CardHeader className="bg-emerald-50/60 border-b border-emerald-100/80 pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between text-emerald-900">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  حالة أمان لوحة التحكم
                </span>
                <Badge className="bg-emerald-600 text-white text-[10px]">نشط وآمن</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">حماية التشفير (HTTPS):</span>
                  <span className="font-bold text-emerald-600">مفعلة 🔒</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">حماية كلمات المرور:</span>
                  <span className="font-bold text-gray-800">{formSettings.passwordComplexity === 'high' ? 'مرتفعة' : 'متوسطة'}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">انتهاء الجلسة التلقائي:</span>
                  <span className="font-bold text-gray-800">{formSettings.sessionTimeout} دقيقة</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">عناوين IP المسموحة:</span>
                  <span className="font-bold text-blue-600">
                    {formSettings.ipWhitelist?.length ? `${formSettings.ipWhitelist.length} عنوان` : 'جميع العناوين'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* IP Whitelist Management */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                القائمة البيضاء لعناوين IP (IP Whitelist)
              </CardTitle>
              <CardDescription className="text-[11px]">
                تقييد الوصول إلى لوحة التحكم بعناوين IP محددة فقط (اتركه فارغاً للسماح بالجميع).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="مثال: 192.168.1.100"
                  value={newIp}
                  onChange={e => setNewIp(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
                <Button size="sm" onClick={handleAddIp} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                  <Plus className="w-3.5 h-3.5 ml-1" /> إضافة
                </Button>
              </div>

              <div className="space-y-1.5 pt-1">
                {(!formSettings.ipWhitelist || formSettings.ipWhitelist.length === 0) ? (
                  <p className="text-[11px] text-gray-400 text-center py-3 bg-gray-50 rounded-lg border border-dashed">
                    لا يوجد تقييد حالياً — جميع العناوين مسموح لها بالنفاذ.
                  </p>
                ) : (
                  formSettings.ipWhitelist.map((ip) => (
                    <div key={ip} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono">
                      <span className="text-gray-800 font-semibold">{ip}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveIp(ip)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

        </div>

      </div>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[420px] rtl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Key className="w-5 h-5 text-orange-500" />
              تغيير كلمة مرور المدير
            </DialogTitle>
            <DialogDescription className="text-xs">
              قم بتحديث كلمة المرور لحساب المدير لضمان أعلى مستويات الأمان.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">كلمة المرور الجديدة</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={e => setPasswordData(p => ({ ...p, newPassword: e.target.value }))}
                  required
                  placeholder="أدخل كلمة المرور الجديدة..."
                  className="text-xs pr-3 pl-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">تأكيد كلمة المرور الجديدة</Label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={e => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))}
                required
                placeholder="أعد كتابة كلمة المرور..."
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsPasswordDialogOpen(false)}>
                إلغاء
              </Button>
              <Button 
                type="submit" 
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? 'جاري التحديث...' : 'تأكيد التغيير'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
