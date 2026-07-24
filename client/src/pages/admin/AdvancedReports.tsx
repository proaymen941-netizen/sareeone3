import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3, LineChart, TrendingUp, TrendingDown, Download,
  Calendar, Filter, Loader2, PieChart as PieChartIcon, Map as MapIcon, TrendingUp as TrendingIcon
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  LineChart as ReChartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart as ReChartsBarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function AdvancedReports() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [reportType, setReportType] = useState('drivers');

  const { data: driverStats = [], isLoading: driverLoading } = useQuery({
    queryKey: ['/api/admin/drivers-summary', dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/admin/drivers-summary`);
      if (!response.ok) throw new Error('Failed to fetch data');
      return response.json();
    }
  });

  const { data: restaurantStats = [], isLoading: restaurantLoading } = useQuery({
    queryKey: ['/api/admin/restaurants-summary', dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/admin/restaurants-summary`);
      if (!response.ok) throw new Error('Failed to fetch data');
      return response.json();
    }
  });

  const { data: withdrawals = [], isLoading: withdrawalLoading } = useQuery({
    queryKey: ['/api/admin/withdrawals/pending'],
    queryFn: async () => {
      const response = await fetch('/api/admin/withdrawals/pending');
      if (!response.ok) return [];
      return response.json();
    }
  });

  const { data: dailyRevenue = [] } = useQuery({
    queryKey: ['/api/admin/analytics/daily-revenue'],
    queryFn: async () => {
      const response = await fetch('/api/admin/analytics/daily-revenue');
      return response.json();
    }
  });

  const { data: retentionStats } = useQuery({
    queryKey: ['/api/admin/analytics/customer-retention'],
    queryFn: async () => {
      const response = await fetch('/api/admin/analytics/customer-retention');
      return response.json();
    }
  });

  const { data: topAreas = [] } = useQuery({
    queryKey: ['/api/admin/analytics/top-areas'],
    queryFn: async () => {
      const response = await fetch('/api/admin/analytics/top-areas');
      return response.json();
    }
  });

  const isLoading = driverLoading || restaurantLoading || withdrawalLoading;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const retentionData = retentionStats ? [
    { name: 'عملاء عائدون', value: retentionStats.returningCustomers },
    { name: 'عملاء جدد', value: retentionStats.newCustomers },
  ] : [];

  // Calculate summaries
  const driverSummary = driverStats.reduce((acc: any, driver: any) => ({
    totalEarnings: acc.totalEarnings + (driver.stats?.totalEarnings || 0),
    totalOrders: acc.totalOrders + (driver.stats?.totalOrders || 0),
    avgRating: acc.avgRating + (driver.stats?.averageRating || 0)
  }), { totalEarnings: 0, totalOrders: 0, avgRating: 0 });

  const restaurantSummary = restaurantStats.reduce((acc: any, restaurant: any) => ({
    totalRevenue: acc.totalRevenue + (restaurant.stats?.totalRevenue || 0),
    totalCommission: acc.totalCommission + (restaurant.stats?.totalCommission || 0),
    totalOrders: acc.totalOrders + (restaurant.stats?.totalOrders || 0)
  }), { totalRevenue: 0, totalCommission: 0, totalOrders: 0 });

  const downloadReport = (type: string) => {
    // TODO: Implement CSV/PDF download
    const data = type === 'drivers' ? driverStats : restaurantStats;
    const csv = generateCSV(data, type);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const generateCSV = (data: any, type: string) => {
    if (type === 'drivers') {
      const headers = ['الاسم', 'الهاتف', 'الطلبات', 'الأرباح', 'التقييم', 'الرصيد'];
      const rows = data.map((d: any) => [
        d.name,
        d.phone,
        d.stats?.totalOrders || 0,
        d.stats?.totalEarnings || 0,
        d.stats?.averageRating || 0,
        d.wallet?.balance || 0
      ]);
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    } else {
      const headers = ['الاسم', 'الهاتف', 'الطلبات', 'المبيعات', 'العمولات', 'المستحق'];
      const rows = data.map((r: any) => [
        r.name,
        r.phone || '',
        r.stats?.totalOrders || 0,
        r.stats?.totalRevenue || 0,
        r.stats?.totalCommission || 0,
        r.wallet?.balance || 0
      ]);
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">التقارير المتقدمة</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => downloadReport(reportType)}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            تحميل تقرير
          </Button>
        </div>
      </div>

      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="drivers">تقرير السائقين</TabsTrigger>
          <TabsTrigger value="restaurants">تقرير المطاعم</TabsTrigger>
          <TabsTrigger value="financial">التقارير المالية</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات الذكية</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Sales Growth Chart */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingIcon className="h-5 w-5 text-primary" />
                  نمو المبيعات (آخر 30 يوم)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReChartsLineChart data={dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(str) => new Date(str).toLocaleDateString('ar-YE', { day: 'numeric', month: 'short' })}
                        tick={{fontSize: 12}}
                      />
                      <YAxis tick={{fontSize: 12}} />
                      <Tooltip 
                        labelFormatter={(label) => new Date(label).toLocaleDateString('ar-YE', { dateStyle: 'long' })}
                        formatter={(value) => [formatCurrency(value as number), 'الإيرادات']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#ec3714" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#ec3714' }}
                        activeDot={{ r: 6, strokeWidth: 0 }} 
                      />
                    </ReChartsLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Customer Retention Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-primary" />
                  الاحتفاظ بالعملاء
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={retentionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {retentionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {retentionStats && (
                  <div className="text-center mt-4">
                    <p className="text-sm text-muted-foreground">معدل الاحتفاظ</p>
                    <p className="text-2xl font-bold text-primary">{retentionStats.retentionRate.toFixed(1)}%</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Demand Areas Bar Chart */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapIcon className="h-5 w-5 text-primary" />
                  المناطق الأكثر طلباً (Heatmap Data)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReChartsBarChart data={topAreas} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100} 
                        tick={{fontSize: 12, fontWeight: 'bold'}}
                      />
                      <Tooltip formatter={(value) => [value, 'عدد الطلبات']} />
                      <Bar 
                        dataKey="count" 
                        fill="#00C49F" 
                        radius={[0, 4, 4, 0]}
                        barSize={30}
                      >
                        {topAreas.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </ReChartsBarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Drivers Report */}
        <TabsContent value="drivers" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الأرباح</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(driverSummary.totalEarnings)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {driverSummary.totalOrders}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متوسط التقييم</CardTitle>
                <LineChart className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {(driverSummary.avgRating / (driverStats.length || 1)).toFixed(1)} ⭐
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>تفاصيل السائقين</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table dir="rtl">
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الطلبات</TableHead>
                      <TableHead>الأرباح</TableHead>
                      <TableHead>التقييم</TableHead>
                      <TableHead>الرصيد</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {driverStats.map((driver: any) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell>{driver.stats?.totalOrders || 0}</TableCell>
                        <TableCell className="text-green-600 font-semibold">
                          {formatCurrency(driver.stats?.totalEarnings || 0)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {(driver.stats?.averageRating || 0).toFixed(1)} ⭐
                          </div>
                        </TableCell>
                        <TableCell className="text-blue-600 font-bold">
                          {formatCurrency(driver.wallet?.balance || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={driver.isActive ? 'default' : 'secondary'}>
                            {driver.isActive ? 'مفعل' : 'معطل'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Restaurants Report */}
        <TabsContent value="restaurants" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(restaurantSummary.totalRevenue)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">العمولات</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(restaurantSummary.totalCommission)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">صافي الدخل</CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(restaurantSummary.totalRevenue - restaurantSummary.totalCommission)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>تفاصيل المطاعم</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table dir="rtl">
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الطلبات</TableHead>
                      <TableHead>المبيعات</TableHead>
                      <TableHead>العمولات</TableHead>
                      <TableHead>المستحق</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {restaurantStats.map((restaurant: any) => (
                      <TableRow key={restaurant.id}>
                        <TableCell className="font-medium">{restaurant.name}</TableCell>
                        <TableCell>{restaurant.stats?.totalOrders || 0}</TableCell>
                        <TableCell className="text-green-600 font-semibold">
                          {formatCurrency(restaurant.stats?.totalRevenue || 0)}
                        </TableCell>
                        <TableCell className="text-red-600">
                          {formatCurrency(restaurant.stats?.totalCommission || 0)}
                        </TableCell>
                        <TableCell className="text-blue-600 font-bold">
                          {formatCurrency(restaurant.wallet?.balance || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={restaurant.isActive ? 'default' : 'secondary'}>
                            {restaurant.isActive ? 'مفعل' : 'معطل'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Report */}
        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>طلبات السحب المعلقة</CardTitle>
            </CardHeader>
            <CardContent>
              {withdrawals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد طلبات سحب معلقة</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table dir="rtl">
                    <TableHeader>
                      <TableRow>
                        <TableHead>النوع</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>البنك</TableHead>
                        <TableHead>صاحب الحساب</TableHead>
                        <TableHead>التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.map((request: any) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <Badge>
                              {request.entityType === 'driver' ? 'سائق' : 'مطعم'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold">
                            {formatCurrency(request.amount)}
                          </TableCell>
                          <TableCell>{request.bankName}</TableCell>
                          <TableCell>{request.accountHolder}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(new Date(request.createdAt))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
