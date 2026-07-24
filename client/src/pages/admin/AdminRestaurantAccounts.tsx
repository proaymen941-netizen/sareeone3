import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Store, DollarSign, TrendingUp, ArrowDownCircle, Clock,
  CheckCircle, XCircle, Search, Eye, Edit, RefreshCw,
  Wallet, FileText, Percent, Filter, ChevronDown, ChevronUp,
  BarChart2, Receipt, AlertCircle
} from 'lucide-react';

const formatCurrency = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0 ريال';
  return `${num.toLocaleString('ar-YE')} ريال`;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':   return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 border">قيد المراجعة</Badge>;
    case 'approved':  return <Badge className="bg-blue-100 text-blue-800 border-blue-200 border">تمت الموافقة</Badge>;
    case 'completed': return <Badge className="bg-green-100 text-green-800 border-green-200 border">مكتمل</Badge>;
    case 'rejected':  return <Badge className="bg-red-100 text-red-800 border-red-200 border">مرفوض</Badge>;
    default:          return <Badge variant="outline">{status}</Badge>;
  }
};

export default function AdminRestaurantAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('accounts');
  const [searchQuery, setSearchQuery] = useState('');
  const [withdrawalFilter, setWithdrawalFilter] = useState('all');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [commissionRestaurant, setCommissionRestaurant] = useState<any>(null);
  const [newCommissionRate, setNewCommissionRate] = useState('');
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [processingWithdrawal, setProcessingWithdrawal] = useState<any>(null);
  const [processAction, setProcessAction] = useState<'approved' | 'rejected' | 'completed'>('approved');
  const [adminNotes, setAdminNotes] = useState('');

  // جلب حسابات المطاعم
  const { data: accounts = [], isLoading: accountsLoading, refetch: refetchAccounts } = useQuery({
    queryKey: ['/api/restaurant-accounts'],
    refetchInterval: 60000,
  });

  // جلب جميع طلبات السحب
  const { data: withdrawalsData, isLoading: withdrawalsLoading, refetch: refetchWithdrawals } = useQuery({
    queryKey: ['/api/restaurant-accounts/all-withdrawals', withdrawalFilter],
    queryFn: async () => {
      const params = withdrawalFilter !== 'all' ? `?status=${withdrawalFilter}` : '';
      const res = await fetch(`/api/restaurant-accounts/all-withdrawals${params}`);
      if (!res.ok) throw new Error('فشل');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const withdrawals: any[] = withdrawalsData?.withdrawals ?? [];

  // فلترة الحسابات
  const filteredAccounts = (accounts as any[]).filter((acc: any) =>
    acc.restaurant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // الإحصائيات الإجمالية
  const totalStats = (accounts as any[]).reduce((acc: any, item: any) => ({
    totalRevenue:   acc.totalRevenue   + parseFloat(item.account.totalRevenue   || '0'),
    totalOrders:    acc.totalOrders    + (item.account.totalOrders || 0),
    totalPending:   acc.totalPending   + parseFloat(item.account.pendingAmount  || '0'),
    totalAvailable: acc.totalAvailable + parseFloat(item.account.availableBalance || '0'),
    totalWithdrawn: acc.totalWithdrawn + parseFloat(item.account.withdrawnAmount || '0'),
  }), { totalRevenue: 0, totalOrders: 0, totalPending: 0, totalAvailable: 0, totalWithdrawn: 0 });

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;

  // تحديث نسبة العمولة
  const commissionMutation = useMutation({
    mutationFn: async ({ restaurantId, rate }: { restaurantId: string; rate: string }) => {
      const res = await fetch(`/api/restaurant-accounts/${restaurantId}/commission`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionRate: rate }),
      });
      if (!res.ok) throw new Error('فشل');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'تم تحديث نسبة العمولة ✅' });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant-accounts'] });
      setCommissionDialogOpen(false);
      setCommissionRestaurant(null);
      setNewCommissionRate('');
    },
    onError: () => toast({ title: 'خطأ في التحديث', variant: 'destructive' }),
  });

  // معالجة طلب سحب
  const processWithdrawalMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const res = await fetch(`/api/restaurant-accounts/withdrawals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes: notes, rejectionReason: status === 'rejected' ? notes : undefined }),
      });
      if (!res.ok) throw new Error('فشل');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'تم معالجة طلب السحب ✅' });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant-accounts/all-withdrawals'] });
      setProcessDialogOpen(false);
      setProcessingWithdrawal(null);
      setAdminNotes('');
    },
    onError: () => toast({ title: 'خطأ في المعالجة', variant: 'destructive' }),
  });

  const openProcessDialog = (withdrawal: any, action: 'approved' | 'rejected' | 'completed') => {
    setProcessingWithdrawal(withdrawal);
    setProcessAction(action);
    setAdminNotes('');
    setProcessDialogOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">حسابات المطاعم</h1>
          <p className="text-gray-500 text-sm">إدارة إيرادات وعمولات وسحوبات المطاعم الشريكة</p>
        </div>
        <Store className="h-8 w-8 text-primary opacity-80" />
      </div>

      {/* الإحصائيات العامة */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-green-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><DollarSign className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-gray-500">إجمالي الإيرادات</p>
                <p className="text-base font-bold">{formatCurrency(totalStats.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-gray-500">إجمالي الطلبات</p>
                <p className="text-base font-bold">{totalStats.totalOrders.toLocaleString('ar-YE')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Wallet className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-xs text-gray-500">الأرصدة المتاحة</p>
                <p className="text-base font-bold">{formatCurrency(totalStats.totalAvailable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">سحوبات معلقة</p>
                <p className="text-base font-bold">{formatCurrency(totalStats.totalPending)}</p>
                {pendingCount > 0 && <Badge className="bg-orange-500 text-white text-xs mt-0.5">{pendingCount} طلب</Badge>}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg"><ArrowDownCircle className="h-5 w-5 text-gray-600" /></div>
              <div>
                <p className="text-xs text-gray-500">إجمالي المدفوع</p>
                <p className="text-base font-bold">{formatCurrency(totalStats.totalWithdrawn)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="accounts" className="gap-1.5">
            <Store className="h-4 w-4" />حسابات المطاعم
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="gap-1.5 relative">
            <ArrowDownCircle className="h-4 w-4" />طلبات السحب
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="commissions" className="gap-1.5">
            <Percent className="h-4 w-4" />إعدادات العمولات
          </TabsTrigger>
        </TabsList>

        {/* ── تبويب حسابات المطاعم ── */}
        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle>جميع المطاعم ({(accounts as any[]).length})</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="بحث بالاسم..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pr-9 w-48"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={() => refetchAccounts()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {accountsLoading ? (
                <div className="text-center py-8 text-gray-400">جاري التحميل...</div>
              ) : filteredAccounts.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Store className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد مطاعم مسجّلة</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المطعم</TableHead>
                        <TableHead className="text-center">الطلبات</TableHead>
                        <TableHead className="text-center">الإيرادات</TableHead>
                        <TableHead className="text-center">الرصيد</TableHead>
                        <TableHead className="text-center">معلق</TableHead>
                        <TableHead className="text-center">العمولة</TableHead>
                        <TableHead className="text-center">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAccounts.map((item: any) => (
                        <TableRow key={item.restaurant.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <img
                                src={item.restaurant.image || '/placeholder.png'}
                                alt={item.restaurant.name}
                                className="w-9 h-9 rounded-lg object-cover bg-gray-100"
                                onError={(e: any) => { e.target.src = ''; e.target.style.display = 'none'; }}
                              />
                              <div>
                                <p className="font-medium text-sm">{item.restaurant.name}</p>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${item.restaurant.isActive ? 'text-green-600 bg-green-50' : 'text-gray-500 bg-gray-50'}`}
                                >
                                  {item.restaurant.isActive ? 'نشط' : 'غير نشط'}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-medium">{item.account.totalOrders}</TableCell>
                          <TableCell className="text-center font-medium text-green-600 text-sm">
                            {formatCurrency(item.account.totalRevenue)}
                          </TableCell>
                          <TableCell className="text-center font-medium text-blue-600 text-sm">
                            {formatCurrency(item.account.availableBalance)}
                          </TableCell>
                          <TableCell className="text-center text-orange-600 text-sm">
                            {formatCurrency(item.account.pendingAmount)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700">
                              {item.account.commissionRate || '0'}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              <Button
                                variant="outline" size="sm"
                                onClick={() => { setSelectedRestaurantId(item.restaurant.id); setDetailsOpen(true); }}
                              >
                                <Eye className="h-3.5 w-3.5 ml-1" />كشف حساب
                              </Button>
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                                onClick={() => setLocation(`/admin/restaurant-accounts/${item.restaurant.id}/statement`)}
                              >
                                <FileText className="h-3.5 w-3.5" />تقرير PDF
                              </Button>
                            </div>
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

        {/* ── تبويب طلبات السحب ── */}
        <TabsContent value="withdrawals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle>طلبات السحب ({withdrawals.length})</CardTitle>
                  <CardDescription>مراجعة والبت في طلبات سحب الأرصدة</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={withdrawalFilter} onValueChange={setWithdrawalFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الطلبات</SelectItem>
                      <SelectItem value="pending">معلق</SelectItem>
                      <SelectItem value="approved">موافق عليه</SelectItem>
                      <SelectItem value="completed">مكتمل</SelectItem>
                      <SelectItem value="rejected">مرفوض</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => refetchWithdrawals()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {withdrawalsLoading ? (
                <div className="text-center py-8 text-gray-400">جاري التحميل...</div>
              ) : withdrawals.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <ArrowDownCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد طلبات سحب</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المطعم</TableHead>
                        <TableHead className="text-center">المبلغ</TableHead>
                        <TableHead>البنك</TableHead>
                        <TableHead className="text-center">تاريخ الطلب</TableHead>
                        <TableHead className="text-center">الحالة</TableHead>
                        <TableHead className="text-center">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.map((w: any) => (
                        <TableRow key={w.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{w.restaurantName}</p>
                            {w.accountHolder && (
                              <p className="text-xs text-gray-500">{w.accountHolder}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-bold text-green-700">
                            {formatCurrency(w.amount)}
                          </TableCell>
                          <TableCell>
                            {w.bankName ? (
                              <div>
                                <p className="text-sm font-medium">{w.bankName}</p>
                                {w.accountNumber && <p className="text-xs text-gray-500 font-mono">{w.accountNumber}</p>}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-xs text-gray-500">
                            {new Date(w.createdAt).toLocaleDateString('ar-YE')}
                          </TableCell>
                          <TableCell className="text-center">{getStatusBadge(w.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1.5">
                              {w.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm" variant="outline"
                                    className="text-green-600 border-green-200 hover:bg-green-50 text-xs"
                                    onClick={() => openProcessDialog(w, 'approved')}
                                  >
                                    <CheckCircle className="h-3.5 w-3.5 ml-1" />موافقة
                                  </Button>
                                  <Button
                                    size="sm" variant="outline"
                                    className="text-red-500 border-red-200 hover:bg-red-50 text-xs"
                                    onClick={() => openProcessDialog(w, 'rejected')}
                                  >
                                    <XCircle className="h-3.5 w-3.5 ml-1" />رفض
                                  </Button>
                                </>
                              )}
                              {w.status === 'approved' && (
                                <Button
                                  size="sm" variant="outline"
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs"
                                  onClick={() => openProcessDialog(w, 'completed')}
                                >
                                  <CheckCircle className="h-3.5 w-3.5 ml-1" />تأكيد الصرف
                                </Button>
                              )}
                              {w.adminNotes && (
                                <span title={w.adminNotes}>
                                  <AlertCircle className="h-4 w-4 text-gray-400" />
                                </span>
                              )}
                            </div>
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

        {/* ── تبويب إعدادات العمولات ── */}
        <TabsContent value="commissions" className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">كيف تعمل العمولات؟</p>
                  <p>العمولة هي النسبة التي تأخذها المنصة من قيمة كل طلب. مثال: إذا كانت قيمة الطلب 100 ريال ونسبة العمولة 15%، تحصل المنصة على 15 ريال ويحصل المطعم على 85 ريال.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                نسب عمولة المطاعم
              </CardTitle>
              <CardDescription>تحديد نسبة عمولة خاصة لكل مطعم على حدة</CardDescription>
            </CardHeader>
            <CardContent>
              {accountsLoading ? (
                <div className="text-center py-8 text-gray-400">جاري التحميل...</div>
              ) : (
                <div className="space-y-3">
                  {(accounts as any[]).map((item: any) => (
                    <div
                      key={item.restaurant.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Store className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.restaurant.name}</p>
                          <p className="text-xs text-gray-500">{item.account.totalOrders} طلب مكتمل</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <p className="text-xs text-gray-500">نسبة العمولة الحالية</p>
                          <p className="text-xl font-bold text-purple-600">{item.account.commissionRate || '0'}%</p>
                        </div>
                        <Button
                          variant="outline" size="sm"
                          onClick={() => {
                            setCommissionRestaurant(item);
                            setNewCommissionRate(item.account.commissionRate || '0');
                            setCommissionDialogOpen(true);
                          }}
                        >
                          <Edit className="h-3.5 w-3.5 ml-1" />تعديل
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── نافذة كشف حساب المطعم ── */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              كشف حساب المطعم
            </DialogTitle>
          </DialogHeader>
          {selectedRestaurantId && (
            <RestaurantAccountDetails
              restaurantId={selectedRestaurantId}
              onClose={() => setDetailsOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── نافذة تعديل العمولة ── */}
      <Dialog open={commissionDialogOpen} onOpenChange={setCommissionDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل نسبة العمولة</DialogTitle>
            <DialogDescription>
              {commissionRestaurant?.restaurant.name} - النسبة الحالية: {commissionRestaurant?.account.commissionRate || '0'}%
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>النسبة الجديدة (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={newCommissionRate}
                onChange={e => setNewCommissionRate(e.target.value)}
                placeholder="مثال: 15"
                className="text-center text-lg font-bold"
              />
              {newCommissionRate && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                  <p>على طلب قيمته <strong>100 ريال</strong>:</p>
                  <p className="text-red-600">المنصة تحصل على: <strong>{parseFloat(newCommissionRate || '0')} ريال</strong></p>
                  <p className="text-green-600">المطعم يحصل على: <strong>{100 - parseFloat(newCommissionRate || '0')} ريال</strong></p>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCommissionDialogOpen(false)}>إلغاء</Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                disabled={commissionMutation.isPending}
                onClick={() => commissionMutation.mutate({
                  restaurantId: commissionRestaurant?.restaurant.id,
                  rate: newCommissionRate,
                })}
              >
                {commissionMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'حفظ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── نافذة معالجة السحب ── */}
      <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {processAction === 'approved' && <><CheckCircle className="h-5 w-5 text-green-600" />الموافقة على طلب السحب</>}
              {processAction === 'rejected' && <><XCircle className="h-5 w-5 text-red-500" />رفض طلب السحب</>}
              {processAction === 'completed' && <><CheckCircle className="h-5 w-5 text-blue-600" />تأكيد صرف المبلغ</>}
            </DialogTitle>
            {processingWithdrawal && (
              <DialogDescription>
                {processingWithdrawal.restaurantName} - المبلغ: {formatCurrency(processingWithdrawal.amount)}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {processingWithdrawal && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                {processingWithdrawal.bankName && <p>البنك: <strong>{processingWithdrawal.bankName}</strong></p>}
                {processingWithdrawal.accountNumber && <p>رقم الحساب: <strong className="font-mono">{processingWithdrawal.accountNumber}</strong></p>}
                {processingWithdrawal.accountHolder && <p>اسم صاحب الحساب: <strong>{processingWithdrawal.accountHolder}</strong></p>}
              </div>
            )}
            <div className="space-y-2">
              <Label>{processAction === 'rejected' ? 'سبب الرفض *' : 'ملاحظات (اختياري)'}</Label>
              <Textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder={processAction === 'rejected' ? 'اكتب سبب الرفض...' : 'ملاحظات إضافية...'}
                className="min-h-[80px] text-right"
                dir="rtl"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setProcessDialogOpen(false)}>إلغاء</Button>
              <Button
                className={processAction === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                disabled={processWithdrawalMutation.isPending || (processAction === 'rejected' && !adminNotes.trim())}
                onClick={() => processingWithdrawal && processWithdrawalMutation.mutate({
                  id: processingWithdrawal.id,
                  status: processAction,
                  notes: adminNotes,
                })}
              >
                {processWithdrawalMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : processAction === 'approved' ? 'موافقة' : processAction === 'rejected' ? 'رفض' : 'تأكيد الصرف'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── مكون كشف حساب المطعم التفصيلي ──
function RestaurantAccountDetails({ restaurantId, onClose }: { restaurantId: string; onClose: () => void }) {
  const [period, setPeriod] = useState('all');
  const [showAllTx, setShowAllTx] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/restaurant-accounts', restaurantId, 'stats', period],
    queryFn: async () => {
      const res = await fetch(`/api/restaurant-accounts/${restaurantId}/stats?period=${period}`);
      if (!res.ok) throw new Error('فشل');
      return res.json();
    },
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['/api/restaurant-accounts', restaurantId, 'transactions'],
    queryFn: async () => {
      const res = await fetch(`/api/restaurant-accounts/${restaurantId}/transactions?limit=100`);
      if (!res.ok) throw new Error('فشل');
      return res.json();
    },
  });

  const { data: withdrawalsData } = useQuery({
    queryKey: ['/api/restaurant-accounts', restaurantId, 'withdrawals'],
    queryFn: async () => {
      const res = await fetch(`/api/restaurant-accounts/${restaurantId}/withdrawals`);
      if (!res.ok) throw new Error('فشل');
      return res.json();
    },
  });

  const allTransactions: any[] = txData?.transactions ?? [];
  const orderRevenues = allTransactions.filter(t => t.type === 'order_revenue');
  const displayTx = showAllTx ? orderRevenues : orderRevenues.slice(0, 5);
  const withdrawals: any[] = withdrawalsData?.withdrawals ?? [];

  const PERIOD_LABELS: Record<string, string> = {
    today: 'اليوم', week: 'هذا الأسبوع', month: 'هذا الشهر', all: 'منذ البداية'
  };

  return (
    <div className="space-y-5">
      {/* فترة التقرير */}
      <div className="flex gap-2 flex-wrap">
        {['today', 'week', 'month', 'all'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${
              period === p ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* إحصائيات */}
      {statsLoading ? (
        <div className="text-center py-6 text-gray-400">جاري التحميل...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-gray-500">الطلبات المكتملة</p>
                <p className="text-2xl font-bold text-gray-800">{stats?.deliveredOrders ?? 0}</p>
                <p className="text-xs text-gray-400">من {stats?.totalOrders ?? 0} إجمالي</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-gray-500">صافي الإيرادات</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(stats?.totalRevenue ?? 0)}</p>
                <p className="text-xs text-gray-400">بعد العمولة</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-gray-500">عمولة المنصة</p>
                <p className="text-xl font-bold text-red-500">{formatCurrency(stats?.totalCommission ?? 0)}</p>
                <p className="text-xs text-gray-400">{stats?.commissionRate ?? 0}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-gray-500">الرصيد المتاح</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(stats?.availableBalance ?? 0)}</p>
                <p className="text-xs text-gray-400">قابل للسحب</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">معدل النجاح</p>
              <p className="text-lg font-bold">{stats?.successRate ?? 0}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">متوسط قيمة الطلب</p>
              <p className="text-lg font-bold">{formatCurrency(stats?.avgOrderValue ?? 0)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">إجمالي المسحوب</p>
              <p className="text-lg font-bold text-orange-600">{formatCurrency(stats?.totalWithdrawn ?? 0)}</p>
            </div>
          </div>
        </>
      )}

      {/* آخر الطلبات */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Receipt className="h-4 w-4" />حركة الطلبات ({orderRevenues.length})
          </h3>
        </div>
        {txLoading ? (
          <div className="text-center py-4 text-gray-400">جاري التحميل...</div>
        ) : orderRevenues.length === 0 ? (
          <p className="text-center text-gray-400 py-4">لا توجد طلبات مكتملة</p>
        ) : (
          <>
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {displayTx.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-sm">
                  <div>
                    <p className="font-medium text-gray-700">{tx.description}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.createdAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                  <span className="font-bold text-green-600">+{formatCurrency(tx.amount)}</span>
                </div>
              ))}
            </div>
            {orderRevenues.length > 5 && (
              <button
                onClick={() => setShowAllTx(!showAllTx)}
                className="flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2 mx-auto"
              >
                {showAllTx ? <><ChevronUp className="h-4 w-4" />عرض أقل</> : <><ChevronDown className="h-4 w-4" />عرض الكل ({orderRevenues.length})</>}
              </button>
            )}
          </>
        )}
      </div>

      {/* سجل السحوبات */}
      <div>
        <h3 className="font-semibold flex items-center gap-2 mb-2">
          <ArrowDownCircle className="h-4 w-4" />سجل السحوبات ({withdrawals.length})
        </h3>
        {withdrawals.length === 0 ? (
          <p className="text-center text-gray-400 py-4">لا توجد طلبات سحب</p>
        ) : (
          <div className="space-y-1 max-h-44 overflow-y-auto">
            {withdrawals.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(w.status)}
                    {w.bankName && <span className="text-xs text-gray-500">{w.bankName}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(w.createdAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                  {w.adminNotes && <p className="text-xs text-orange-600 mt-0.5">ملاحظة: {w.adminNotes}</p>}
                </div>
                <span className="font-bold text-orange-600">-{formatCurrency(w.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
