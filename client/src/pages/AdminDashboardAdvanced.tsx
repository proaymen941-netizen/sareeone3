import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, TrendingUp, Users, Wallet, Lock, AlertTriangle, CheckCircle,
  Clock, DollarSign, PieChart, LineChart, Settings, Shield, Eye, Download,
  ArrowUp, ArrowDown, Home, LogOut
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';

interface MetricCard {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  color: string;
}

export default function AdminDashboardAdvanced() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('month');

  const { data: financialData } = useQuery({
    queryKey: ['/api/management/financial/summary'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/management/financial/summary');
      return response.json();
    },
  });

  const { data: restaurantClassification } = useQuery({
    queryKey: ['/api/management/restaurants/classification'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/management/restaurants/classification');
      return response.json();
    },
  });

  const { data: hrData } = useQuery({
    queryKey: ['/api/management/hr/team-overview'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/management/hr/team-overview');
      return response.json();
    },
  });

  const { data: securityReport } = useQuery({
    queryKey: ['/api/management/security/report'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/management/security/report');
      return response.json();
    },
  });

  const { data: financialAnomalies } = useQuery({
    queryKey: ['/api/management/financial/anomalies'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/management/financial/anomalies');
      return response.json();
    },
  });

  const { data: platformMetrics } = useQuery({
    queryKey: ['/api/management/financial/platform-metrics'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/management/financial/platform-metrics');
      return response.json();
    },
  });

  const metricCards: MetricCard[] = [
    {
      title: 'إجمالي الإيرادات',
      value: `${platformMetrics?.data?.totalPlatformRevenue || '0'} ريال`,
      change: '+12.5%',
      icon: <DollarSign className="text-green-600" size={24} />,
      color: 'bg-green-50'
    },
    {
      title: 'عدد الموظفين النشطين',
      value: hrData?.data?.activeEmployees || '0',
      change: '+2',
      icon: <Users className="text-blue-600" size={24} />,
      color: 'bg-blue-50'
    },
    {
      title: 'متوسط تقييم المطاعم',
      value: restaurantClassification?.data?.[0]?.avgRating || '0',
      change: '+0.3',
      icon: <TrendingUp className="text-orange-600" size={24} />,
      color: 'bg-orange-50'
    },
    {
      title: 'الأحداث الأمنية',
      value: securityReport?.data?.totalSecurityEvents || '0',
      change: '-5',
      icon: <Lock className="text-purple-600" size={24} />,
      color: 'bg-purple-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">لوحة التحكم المتقدمة</h1>
            <p className="text-gray-600 mt-1">إدارة شاملة للمطاعم والمالية والموارد والأمن</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download size={18} />
              تحميل التقارير
            </Button>
            <Button variant="outline">
              <Settings size={18} />
              الإعدادات
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map((card, idx) => (
            <Card key={idx} className={card.color}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-600">{card.title}</p>
                    <h3 className="text-2xl font-bold mt-2">{card.value}</h3>
                    {card.change && (
                      <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                        <ArrowUp size={14} /> {card.change}
                      </p>
                    )}
                  </div>
                  <div className="bg-white p-2 rounded-lg">{card.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alerts */}
        {financialAnomalies?.data && financialAnomalies.data.length > 0 && (
          <Card className="border-l-4 border-red-500 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle size={20} /> تنبيهات هامة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {financialAnomalies.data.slice(0, 3).map((anomaly: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded">
                    <span className="text-sm text-gray-700">{anomaly.type}</span>
                    <Badge className={anomaly.severity === 'عالي' ? 'bg-red-500' : 'bg-yellow-500'}>
                      {anomaly.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 lg:grid-cols-4">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="financial">الإدارة المالية</TabsTrigger>
            <TabsTrigger value="hr">الموارد البشرية</TabsTrigger>
            <TabsTrigger value="security">الأمن</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Restaurants Classification */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 size={20} /> تصنيف المطاعم
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {restaurantClassification?.data?.slice(0, 5).map((rest: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{rest.name}</p>
                        <p className="text-xs text-gray-600">درجة: {rest.score}</p>
                      </div>
                      <Badge className={
                        rest.tier === 'gold' ? 'bg-yellow-500' :
                        rest.tier === 'silver' ? 'bg-gray-400' :
                        'bg-amber-600'
                      }>
                        {rest.tier}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Security Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield size={20} /> حالة الأمن
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-700 flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-600" />
                      معدل الأمان: {securityReport?.data?.successfulLogins || '0'}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-gray-700 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-yellow-600" />
                      محاولات فاشلة: {securityReport?.data?.failedAttempts || '0'}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      نشاطات مريبة: {securityReport?.data?.suspiciousActivitiesDetected || '0'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>إيرادات اليوم</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">
                    {financialData?.data?.today?.totalRevenue || '0'} ريال
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {financialData?.data?.today?.totalOrders || '0'} طلب
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>إيرادات الأسبوع</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">
                    {financialData?.data?.thisWeek?.totalRevenue || '0'} ريال
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {financialData?.data?.thisWeek?.totalOrders || '0'} طلب
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>إيرادات الشهر</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-purple-600">
                    {financialData?.data?.thisMonth?.totalRevenue || '0'} ريال
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {financialData?.data?.thisMonth?.totalOrders || '0'} طلب
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>مقاييس المنصة المالية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">إجمالي الأرباح</p>
                    <p className="text-lg font-bold">{platformMetrics?.data?.totalPlatformEarnings || '0'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">عدد الطلبات</p>
                    <p className="text-lg font-bold">{platformMetrics?.data?.totalOrders || '0'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">متوسط الطلب</p>
                    <p className="text-lg font-bold">{platformMetrics?.data?.avgOrderValue || '0'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">عدد المطاعم</p>
                    <p className="text-lg font-bold">{platformMetrics?.data?.restaurantsCount || '0'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* HR Tab */}
          <TabsContent value="hr" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">إجمالي الموظفين</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{hrData?.data?.totalEmployees || '0'}</p>
                  <p className="text-xs text-gray-600 mt-2">نشطين: {hrData?.data?.activeEmployees || '0'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">متوسط التقييم</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">{hrData?.data?.averageRating || '0'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">متوسط الطلبات</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">{hrData?.data?.averageOrdersPerEmployee || '0'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">أرباح الفريق</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-purple-600">{hrData?.data?.totalTeamEarnings || '0'}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>أفضل الموظفين</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {hrData?.data?.topPerformers?.map((emp: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{emp.name}</p>
                        <p className="text-xs text-gray-600">الدرجة: {emp.score}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-blue-600">{emp.rating}</p>
                        <p className="text-xs text-gray-600">{emp.orders} طلب</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">إجمالي الأحداث</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{securityReport?.data?.totalSecurityEvents || '0'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">تسجيلات ناجحة</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">{securityReport?.data?.successfulLogins || '0'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">محاولات فاشلة</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-red-600">{securityReport?.data?.failedAttempts || '0'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">معدل الفشل</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-orange-600">{securityReport?.data?.failureRate || '0'}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>التوصيات الأمنية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {securityReport?.data?.recommendations?.map((rec: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-2">
                      <CheckCircle size={16} className="text-blue-600 mt-1 flex-shrink-0" />
                      <p className="text-sm text-gray-700">{rec}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
