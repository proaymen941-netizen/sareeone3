import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../context/AuthContext';
import { Loader2, Shield, Truck } from 'lucide-react';

interface LoginPageProps {
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('admin');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userType = activeTab === 'admin' ? 'admin' : 'driver';
      const result = await login(email, password, userType);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.message || 'بيانات الدخول غير صحيحة');
      }
    } catch (error) {
      setError('خطأ في تسجيل الدخول');
    }

    setLoading(false);
  };

  const fillAdminCredentials = () => {
    setEmail('admin@alsarie-one.com');
    setPassword('admin123456');
  };

  const fillDriverCredentials = () => {
    setEmail('+967771234567');
    setPassword('$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            تسجيل الدخول للنظام
          </CardTitle>
          <CardDescription>
            اختر نوع المستخدم وأدخل بيانات الدخول
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                مدير النظام
              </TabsTrigger>
              <TabsTrigger value="driver" className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                سائق
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              <TabsContent value="admin" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="أدخل البريد الإلكتروني"
                    required
                    className="text-right"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    required
                    className="text-right"
                    dir="ltr"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={fillAdminCredentials}
                  className="w-full"
                >
                  استخدام بيانات المدير الافتراضية
                </Button>
              </TabsContent>

              <TabsContent value="driver" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="أدخل رقم الهاتف"
                    required
                    className="text-right"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    required
                    className="text-right"
                    dir="ltr"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={fillDriverCredentials}
                  className="w-full"
                >
                  استخدام بيانات السائق التجريبية
                </Button>
              </TabsContent>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  'تسجيل الدخول'
                )}
              </Button>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};