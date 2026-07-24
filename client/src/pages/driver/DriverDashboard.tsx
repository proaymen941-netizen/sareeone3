import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Truck, MapPin, Clock, DollarSign, LogOut, Navigation, Phone, 
  CheckCircle, Package, Bell, User, Calendar, Target, AlertCircle, 
  RefreshCw, Eye, MessageCircle, Store, Map, TrendingUp, Activity 
} from 'lucide-react';
import type { Order, Driver } from '@shared/schema';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DriverDashboardProps {
  onLogout: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ onLogout }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('available');
  const [driverStatus, setDriverStatus] = useState<'available' | 'busy' | 'offline'>('offline');
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetailsDialog, setShowOrderDetailsDialog] = useState(false);

  // الحصول على معرف السائق
  const getDriverId = () => {
    const driverUser = localStorage.getItem('driver_user');
    if (driverUser) {
      try {
        const user = JSON.parse(driverUser);
        return user.id;
      } catch (error) {
        console.error('خطأ في تحليل بيانات السائق:', error);
        return null;
      }
    }
    return null;
  };

  const driverId = getDriverId();
  const driverToken = localStorage.getItem('driver_token');

  // التحقق من تسجيل الدخول
  useEffect(() => {
    if (!driverId || !driverToken) {
      toast({
        title: "غير مصرح",
        description: "يجب تسجيل الدخول أولاً",
        variant: "destructive"
      });
      window.location.href = '/driver-login';
      return;
    }

    // تحميل بيانات السائق
    const savedDriver = localStorage.getItem('driver_user');
    if (savedDriver) {
      try {
        const driverData = JSON.parse(savedDriver);
        setCurrentDriver(driverData);
        setDriverStatus(driverData.isAvailable ? 'available' : 'offline');
      } catch (error) {
        console.error('خطأ في تحميل بيانات السائق:', error);
      }
    }
  }, [driverId, driverToken, toast]);

  // 🔄 جلب بيانات لوحة المعلومات الموحدة
  const { 
    data: dashboardData, 
    isLoading: dashboardLoading, 
    error: dashboardError,
    refetch: refetchDashboard 
  } = useQuery({
    queryKey: ['/api/driver/dashboard'],
    queryFn: async () => {
      console.log('جلب بيانات لوحة المعلومات...');
      const response = await fetch('/api/driver/dashboard', {
        headers: {
          'Authorization': `Bearer ${driverToken}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          throw new Error('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى');
        }
        throw new Error(`فشل في جلب البيانات: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: !!driverToken,
    refetchInterval: 10000, // تحديث كل 10 ثوان
  });

  // قبول طلب
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/driver/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `فشل في قبول الطلب: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/driver/dashboard'] });
      setDriverStatus('busy');
      
      toast({
        title: "تم قبول الطلب بنجاح ✅",
        description: `تم تعيين الطلب لك بنجاح`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في قبول الطلب",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // تحديث حالة الطلب
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await fetch(`/api/driver/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'فشل في تحديث حالة الطلب');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/driver/dashboard'] });
      
      if (variables.status === 'delivered') {
        setDriverStatus('available');
      }
      
      const statusText = getStatusText(variables.status);
      toast({
        title: "تم تحديث حالة الطلب ✅",
        description: `تم تحديث الطلب إلى: ${statusText}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في تحديث الطلب",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // تحديث حالة السائق
  const updateDriverStatusMutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      const response = await fetch(`/api/driver/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        },
        body: JSON.stringify({ isAvailable }),
      });
      
      if (!response.ok) throw new Error('فشل في تحديث حالة السائق');
      return response.json();
    },
    onSuccess: (data, isAvailable) => {
      setDriverStatus(isAvailable ? 'available' : 'offline');
      
      if (currentDriver) {
        const updatedDriver = { ...currentDriver, isAvailable };
        setCurrentDriver(updatedDriver);
        localStorage.setItem('driver_user', JSON.stringify(updatedDriver));
      }
      
      toast({
        title: isAvailable ? "أنت متاح الآن 🟢" : "أنت غير متاح 🔴",
        description: isAvailable ? "ستتلقى طلبات جديدة" : "لن تتلقى طلبات جديدة",
      });

      refetchDashboard();
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في تحديث الحالة",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_user');
    onLogout();
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'في الانتظار',
      confirmed: 'مؤكد',
      preparing: 'قيد التحضير',
      ready: 'جاهز للاستلام',
      picked_up: 'تم الاستلام',
      on_way: 'في الطريق',
      delivered: 'تم التسليم',
      cancelled: 'ملغي'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-purple-100 text-purple-800',
      picked_up: 'bg-indigo-100 text-indigo-800',
      on_way: 'bg-green-100 text-green-800',
      delivered: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow: Record<string, string> = {
      confirmed: 'ready', // Driver accepts, becomes ready for pickup
      ready: 'picked_up',
      picked_up: 'on_way',
      on_way: 'delivered'
    };
    return statusFlow[currentStatus];
  };

  const getNextStatusLabel = (currentStatus: string) => {
    const labels: Record<string, string> = {
      confirmed: 'قبول الطلب',
      ready: 'تم الاستلام',
      picked_up: 'بدء التوصيل',
      on_way: 'تم التسليم'
    };
    return labels[currentStatus] || 'تحديث الحالة';
  };

  const getOrderItems = (itemsString: string) => {
    try {
      return JSON.parse(itemsString);
    } catch {
      return [];
    }
  };

  if (dashboardLoading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  const { availableOrders = [], currentOrders = [], pendingOrders = [], stats = {} } = dashboardData || {};

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">لوحة السائق</h1>
          <button
            onClick={onLogout}
            className="text-sm text-red-600 font-bold"
          >
            تسجيل الخروج
          </button>
        </div>

        {dashboardError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-red-700 text-sm font-bold">خطأ في تحميل البيانات. يرجى المحاولة مرة أخرى.</p>
            <button
              onClick={() => refetchDashboard()}
              className="mt-2 text-sm text-red-600 underline"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-xl p-3 border">
            <p className="text-xs text-gray-500">الطلبات المتاحة</p>
            <p className="text-2xl font-black text-blue-600">{availableOrders.length}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border">
            <p className="text-xs text-gray-500">الطلبات الجارية</p>
            <p className="text-2xl font-black text-orange-600">{currentOrders.length}</p>
          </div>
        </div>

        {pendingOrders.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-yellow-800 font-bold text-sm">
              لديك {pendingOrders.length} طلب معلق يحتاج مراجعة
            </p>
          </div>
        )}

        <div className="mt-4 text-center">
          <p className="text-gray-500 text-sm">استخدم لوحة التحكم الكاملة من قائمة السائق</p>
        </div>
      </div>
    </div>
  );
};
