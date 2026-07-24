import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Phone, Lock, Save, Eye, EyeOff, Shield, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AdminProfileData {
  id: string;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  userType: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const { data: adminProfile, isLoading } = useQuery<AdminProfileData>({
    queryKey: ['/api/admin/profile'],
  });

  useEffect(() => {
    if (adminProfile) {
      setFormData(prev => ({
        ...prev,
        name: adminProfile.name || '',
        email: adminProfile.email || '',
        username: adminProfile.username || '',
        phone: adminProfile.phone || ''
      }));
    }
  }, [adminProfile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; username?: string; phone?: string }) => {
      const response = await apiRequest('PUT', '/api/admin/profile', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/profile'] });
      toast({ title: "تم تحديث الملف الشخصي", description: "تم تحديث معلوماتك الشخصية بنجاح" });
    },
    onError: (error: any) => {
      const raw = error?.message || '';
      const serverMsg = raw.includes(':') ? raw.split(':').slice(1).join(':').trim() : raw;
      let displayMsg = "حدث خطأ أثناء تحديث الملف الشخصي";
      try {
        const parsed = JSON.parse(serverMsg);
        displayMsg = parsed.error || parsed.message || displayMsg;
      } catch {
        if (serverMsg) displayMsg = serverMsg;
      }
      toast({ title: "خطأ في التحديث", description: displayMsg, variant: "destructive" });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest('PUT', '/api/admin/change-password', data);
      return response.json();
    },
    onSuccess: () => {
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      toast({ title: "تم تغيير كلمة المرور", description: "تم تغيير كلمة المرور بنجاح" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ في تغيير كلمة المرور", description: error.message || "كلمة المرور الحالية غير صحيحة", variant: "destructive" });
    }
  });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({ title: "بيانات ناقصة", description: "الاسم والبريد الإلكتروني مطلوبان", variant: "destructive" });
      return;
    }
    updateProfileMutation.mutate({ name: formData.name, email: formData.email, username: formData.username, phone: formData.phone });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.currentPassword || !formData.newPassword) {
      toast({ title: "بيانات ناقصة", description: "كلمة المرور الحالية والجديدة مطلوبتان", variant: "destructive" });
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      toast({ title: "كلمات المرور غير متطابقة", description: "تأكد من تطابق كلمة المرور الجديدة مع التأكيد", variant: "destructive" });
      return;
    }
    if (formData.newPassword.length < 6) {
      toast({ title: "كلمة مرور ضعيفة", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword: formData.currentPassword, newPassword: formData.newPassword });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل الملف الشخصي...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-2">
        <User className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">الملف الشخصي</h1>
          <p className="text-muted-foreground">إدارة معلوماتك الشخصية وكلمة المرور</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* معلومات المدير */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              المعلومات الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <Label htmlFor="name">الاسم الكامل</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="pl-10"
                    placeholder="أدخل اسمك الكامل"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10"
                    placeholder="admin@example.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="username">اسم المستخدم (اختياري)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="pl-10"
                    placeholder="username"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">رقم الهاتف (اختياري)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="pl-10"
                    placeholder="+967xxxxxxxx"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    جاري التحديث...
                  </div>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />حفظ التغييرات</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* تغيير كلمة المرور */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              تغيير كلمة المرور
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="currentPassword"
                    type={showPassword ? "text" : "password"}
                    value={formData.currentPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="pl-10 pr-10"
                    placeholder="كلمة المرور الحالية"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="pl-10 pr-10"
                    placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="pl-10"
                    placeholder="أعد كتابة كلمة المرور الجديدة"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    جاري التغيير...
                  </div>
                ) : (
                  <><Lock className="h-4 w-4 mr-2" />تغيير كلمة المرور</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* معلومات إضافية */}
      {adminProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              تفاصيل الحساب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">معرف الحساب:</span>
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{adminProfile.id.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">نوع المستخدم:</span>
                <span>{adminProfile.userType === 'admin' ? 'مدير النظام' : adminProfile.userType}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">حالة الحساب:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${adminProfile.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {adminProfile.isActive ? 'نشط' : 'غير نشط'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">تاريخ الإنشاء:</span>
                <span>{new Date(adminProfile.createdAt).toLocaleDateString('ar-YE')}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                💡 لإدارة المشرفين الفرعيين وصلاحياتهم، يرجى الانتقال إلى{' '}
                <strong>إدارة الموارد البشرية</strong> من القائمة الجانبية.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
