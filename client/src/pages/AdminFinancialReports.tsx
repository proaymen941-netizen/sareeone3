import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  DollarSign, TrendingUp, TrendingDown, 
  Download, Calendar, Filter, FileText,
  CreditCard, Wallet, Receipt, Banknote, Shield,
  Users, Store, Truck, Target, Award, Clock,
  RefreshCw, CheckCircle,
  XCircle, FileSpreadsheet, Printer,
  Eye, 
  PieChart as PieChartIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface FinancialReport {
  id: string;
  period: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  commissionEarned: number;
  deliveryFees: number;
  platformFees: number;
  restaurantPayments: number;
  driverPayments: number;
  withdrawalRequests: number;
  pendingWithdrawals: number;
  completedWithdrawals: number;
  taxAmount: number;
  transactionCount: number;
  averageOrderValue: number;
  growthRate: number;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  id: string;
  type: 'commission' | 'delivery_fee' | 'withdrawal' | 'refund' | 'bonus' | 'penalty';
  amount: number;
  description: string;
  fromUser: string;
  toUser: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  reference: string;
  createdAt: string;
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  userType: 'driver' | 'restaurant';
  userName: string;
  amount: number;
  method: 'bank_transfer' | 'wallet' | 'cash';
  accountDetails: any;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  requestedAt: string;
  processedAt: string | null;
  adminNotes: string;
}

export default function AdminFinancialReports() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('excel');

  // جلب التقارير المالية
  const { data: financialReports, isLoading } = useQuery<FinancialReport[]>({
    queryKey: ['/api/admin/financial-reports', dateRange, reportType],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        type: reportType
      });
      const response = await apiRequest('GET', `/api/admin/financial-reports?${params.toString()}`);
      return response.json();
    },
  });

  // جلب المعاملات
  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['/api/admin/transactions', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      });
      const response = await apiRequest('GET', `/api/admin/transactions?${params.toString()}`);
      return response.json();
    }
  });

  // جلب طلبات السحب المعلقة
  const { data: withdrawalRequestsData } = useQuery<WithdrawalRequest[]>({
    queryKey: ['/api/admin/withdrawals/pending'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/withdrawals/pending');
      return response.json();
    }
  });

  const { data: dailyRevenue = [] } = useQuery({
    queryKey: ['/api/admin/analytics/daily-revenue'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/analytics/daily-revenue');
      return response.json();
    }
  });

  const { data: retentionStats } = useQuery({
    queryKey: ['/api/admin/analytics/customer-retention'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/analytics/customer-retention');
      return response.json();
    }
  });

  const { data: topAreas = [] } = useQuery({
    queryKey: ['/api/admin/analytics/top-areas'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/analytics/top-areas');
      return response.json();
    }
  });

  const retentionData = retentionStats ? [
    { name: 'عملاء عائدون', value: retentionStats.returningCustomers },
    { name: 'عملاء جدد', value: retentionStats.newCustomers },
  ] : [];

  const handleApproveWithdrawal = async (id: string) => {
    try {
      await apiRequest('POST', `/api/admin/withdrawals/${id}/approve`, {});
      toast({ title: 'تمت الموافقة على طلب السحب بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals/pending'] });
    } catch (error) {
      toast({ title: 'فشل في الموافقة على طلب السحب', variant: 'destructive' });
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    try {
      await apiRequest('POST', `/api/admin/withdrawals/${id}/reject`, { reason: 'تم الرفض من قبل المسؤول' });
      toast({ title: 'تم رفض طلب السحب' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals/pending'] });
    } catch (error) {
      toast({ title: 'فشل في رفض طلب السحب', variant: 'destructive' });
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const revenueData = financialReports?.map(report => ({
    name: report.period,
    revenue: report.totalRevenue,
    profit: report.netProfit
  })) || [];

  const categoryData = [
    { name: 'مطاعم', value: 400 },
    { name: 'متاجر', value: 300 },
    { name: 'بقالات', value: 300 },
    { name: 'صيدليات', value: 200 },
  ];

  const latestReport = financialReports?.[0];

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">التقارير المالية</h1>
          <p className="text-gray-500 mt-1">مراقبة الأرباح، الإيرادات، والعمليات المالية</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            تصدير التقارير
          </Button>
          <Button className="gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            طباعة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(latestReport?.totalRevenue || 0)}</div>
            <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              +{latestReport?.growthRate || 0}% من الفترة الماضية
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي الأرباح</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(latestReport?.netProfit || 0)}</div>
            <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              +8.2% من الشهر الماضي
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي العمولات</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(latestReport?.commissionEarned || 0)}</div>
            <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              +5.4% من الشهر الماضي
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">طلبات السحب المعلقة</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{withdrawalRequestsData?.length || 0}</div>
            <p className="text-xs text-orange-500 mt-1">تحتاج إلى مراجعة</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>الإيرادات والأرباح</CardTitle>
            <CardDescription>مقارنة بين إجمالي الإيرادات وصافي الأرباح خلال الفترة</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" name="الإيرادات" />
                <Area type="monotone" dataKey="profit" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="الأرباح" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>توزيع المبيعات حسب التصنيف</CardTitle>
            <CardDescription>أداء التصنيفات المختلفة في النظام</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChartIcon width={400} height={300}>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChartIcon>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* بطاقة نموذج توزيع الإيرادات */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-blue-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>نموذج توزيع الإيرادات - الريال اليمني (YER)</CardTitle>
              <CardDescription>كيفية توزيع إيرادات كل طلب بين المنصة، المطعم، والسائق</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-white rounded-xl border text-center shadow-sm">
              <Users className="h-7 w-7 mx-auto mb-2 text-gray-600" />
              <p className="text-sm font-semibold text-gray-600">العميل يدفع</p>
              <p className="text-base font-bold mt-1">المبلغ الإجمالي</p>
              <p className="text-xs text-muted-foreground">(قيمة الطلب + رسوم التوصيل)</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-200 text-center shadow-sm">
              <Store className="h-7 w-7 mx-auto mb-2 text-green-600" />
              <p className="text-sm font-semibold text-green-700">المطعم يحصل</p>
              <p className="text-base font-bold text-green-600 mt-1">القيمة الإجمالية − العمولة</p>
              <p className="text-xs text-green-600">مثال: 1,000 ريال × (1 − 15%) = 850 ريال</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-center shadow-sm">
              <Truck className="h-7 w-7 mx-auto mb-2 text-blue-600" />
              <p className="text-sm font-semibold text-blue-700">السائق يحصل</p>
              <p className="text-base font-bold text-blue-600 mt-1">حصته من رسوم التوصيل</p>
              <p className="text-xs text-blue-600">حسب إعداد نسبة السائق</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 text-center shadow-sm">
              <Shield className="h-7 w-7 mx-auto mb-2 text-purple-600" />
              <p className="text-sm font-semibold text-purple-700">المنصة تحصل</p>
              <p className="text-base font-bold text-purple-600 mt-1">العمولة + باقي رسوم التوصيل</p>
              <p className="text-xs text-purple-600">= عمولة المطعم + (التوصيل − حصة السائق)</p>
            </div>
          </div>
          <div className="p-4 bg-white rounded-xl border">
            <h4 className="font-semibold mb-3 text-sm">مثال عملي على طلب بقيمة 1,000 ريال + 200 ريال توصيل:</h4>
            <div className="space-y-2">
              {[
                { label: 'العميل يدفع إجمالاً', value: '1,200 ريال', color: 'text-gray-700', bg: 'bg-gray-50' },
                { label: 'المطعم يستلم (بعد عمولة 15%)', value: '850 ريال', color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'السائق يستلم (80% من رسوم التوصيل)', value: '160 ريال', color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'المنصة تكسب (عمولة 150 + باقي التوصيل 40)', value: '190 ريال', color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map((row, i) => (
                <div key={i} className={`flex justify-between items-center p-2 rounded ${row.bg}`}>
                  <span className="text-sm">{row.label}</span>
                  <span className={`font-bold ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">المعاملات الحديثة</TabsTrigger>
          <TabsTrigger value="withdrawals">طلبات السحب</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات الذكية</TabsTrigger>
          <TabsTrigger value="taxes">الضرائب والرسوم</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>سجل المعاملات</CardTitle>
              <CardDescription>جميع العمليات المالية المسجلة في النظام</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المعرف</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">#{tx.id.slice(0, 8)}</TableCell>
                      <TableCell>{tx.type}</TableCell>
                      <TableCell>{formatCurrency(tx.amount)}</TableCell>
                      <TableCell>{formatDate(tx.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <CardTitle>إدارة طلبات السحب</CardTitle>
              <CardDescription>مراجعة ومعالجة طلبات سحب الأرباح من السائقين والمطاعم</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>طريقة السحب</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawalRequestsData?.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="font-medium">{request.userName}</div>
                        <div className="text-xs text-gray-500">{request.userType}</div>
                      </TableCell>
                      <TableCell>{formatCurrency(request.amount)}</TableCell>
                      <TableCell>{request.method}</TableCell>
                      <TableCell>{new Date(request.requestedAt).toLocaleDateString('ar-YE')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => handleApproveWithdrawal(request.id)}>موافقة</Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleRejectWithdrawal(request.id)}>رفض</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  نمو المبيعات (آخر 30 يوم)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(str) => new Date(str).toLocaleDateString('ar-YE', { day: 'numeric', month: 'short' })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(label) => new Date(label).toLocaleDateString('ar-YE', { dateStyle: 'long' })}
                        formatter={(value) => [formatCurrency(value as number), 'الإيرادات']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#ec3714" 
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

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
                    <PieChartIcon>
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
                    </PieChartIcon>
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

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  المناطق الأكثر طلباً
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topAreas} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100} 
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
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
