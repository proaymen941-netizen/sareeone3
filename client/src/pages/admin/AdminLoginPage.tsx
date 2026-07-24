import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Eye, EyeOff, Settings } from 'lucide-react';

export default function AdminLoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  // التحقق من وجود مديرين في قاعدة البيانات
  useEffect(() => {
    // إذا كان هناك token مسجل مسبقاً → انتقل للوحة التحكم
    const existingToken = localStorage.getItem('admin_token');
    if (existingToken) {
      window.location.href = '/admin';
      return;
    }

    fetch('/api/auth/setup-status')
      .then(r => r.json())
      .then((data: { adminExists: boolean }) => {
        setIsFirstSetup(!data.adminExists);
        setCheckingSetup(false);
      })
      .catch(() => {
        setIsFirstSetup(false);
        setCheckingSetup(false);
      });
  }, []);

  // الدخول في وضع الإعداد الأولي (بدون تسجيل دخول)
  const handleFirstSetupAccess = () => {
    localStorage.setItem('admin_token', 'SETUP_MODE');
    localStorage.setItem('admin_user', JSON.stringify({
      id: 'setup',
      name: 'إعداد أولي',
      userType: 'admin',
      isSetupMode: true,
    }));
    window.location.href = '/admin';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!formData.email.trim() || !formData.password.trim()) {
      setError('يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim(), password: formData.password }),
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('admin_token', result.token);
        localStorage.setItem('admin_user', JSON.stringify(result.user));
        // تسجيل حدث الدخول في سجلات الأمان
        try {
          fetch('/api/admin/security/log-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${result.token}` },
            body: JSON.stringify({ adminId: result.user?.id, device: navigator.userAgent }),
          }).catch(() => {});
        } catch {}
        window.location.href = '/admin';
      } else {
        setError(result.message || 'بيانات الدخول غير صحيحة');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('حدث خطأ في الاتصال بالخادم، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-red-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-green-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">جاري التحقق...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-red-50 p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #16a34a 0%, #dc2626 100%)' }}>
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">لوحة التحكم</h1>
          <p className="text-gray-500 text-sm">نظام إدارة متجر السريع ون</p>
        </div>

        {/* وضع الإعداد الأولي — عرض عند عدم وجود مديرين */}
        {isFirstSetup && (
          <Card className="shadow-xl border-0 bg-amber-50/90 backdrop-blur-sm mb-4 border border-amber-200">
            <CardContent className="pt-6 pb-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-900 text-sm mb-1">الإعداد الأولي</h3>
                  <p className="text-amber-800 text-xs leading-relaxed">
                    لا يوجد حساب مدير مسجل بعد. يمكنك الدخول مرة واحدة لإنشاء حسابك،
                    وبعد تسجيل الخروج لن يُسمح بالدخول إلا بكلمة مرور صحيحة.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleFirstSetupAccess}
                className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg shadow-md"
              >
                <Settings className="ml-2 h-5 w-5" />
                دخول الإعداد الأولي (مرة واحدة فقط)
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-center text-gray-800">تسجيل دخول المدير</CardTitle>
            <p className="text-center text-gray-500 text-sm">أدخل بياناتك للوصول إلى لوحة التحكم</p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800 text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-gray-700 font-medium text-sm">
                  البريد الإلكتروني أو اسم المستخدم
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="text"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="admin@example.com أو اسم المستخدم"
                  className="h-11 border-gray-200 focus:border-green-500 focus:ring-green-500 text-right"
                  disabled={isSubmitting}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-gray-700 font-medium text-sm">
                  كلمة المرور
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="h-11 pl-10 border-gray-200 focus:border-green-500 focus:ring-green-500 text-right"
                    disabled={isSubmitting}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-3 text-gray-400 hover:text-gray-600"
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    جاري التحقق...
                  </>
                ) : (
                  'تسجيل الدخول'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-gray-400 text-xs mt-6">
          © 2024 السريع ون للتوصيل - جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
