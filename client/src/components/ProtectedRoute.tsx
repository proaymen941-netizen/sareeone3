import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  userType: 'admin' | 'driver';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, userType }) => {
  const { user, loading, userType: authUserType } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold text-foreground mb-2">جاري التحميل...</h3>
            <p className="text-muted-foreground">يرجى الانتظار</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || authUserType !== userType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚫</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">غير مصرح</h3>
            <p className="text-muted-foreground mb-4">
              ليس لديك صلاحية للوصول إلى هذه الصفحة
            </p>
            <a 
              href={userType === 'admin' ? '/admin-login' : '/driver-login'}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              تسجيل الدخول
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};