import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Wallet, DollarSign, CreditCard, TrendingUp, Send,
  AlertCircle, CheckCircle, Clock
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface DriverWallet {
  id: string;
  driverId: string;
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  isActive: boolean;
}

interface WithdrawalRequest {
  id: string;
  entityType: string;
  entityId: string;
  amount: number;
  accountNumber: string;
  bankName: string;
  accountHolder: string;
  status: string;
  createdAt: string;
}

interface DriverWalletManagementProps {
  driverId: string;
  driverName: string;
}

export const DriverWalletManagement: React.FC<DriverWalletManagementProps> = ({
  driverId,
  driverName
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    accountNumber: '',
    bankName: '',
    accountHolder: driverName
  });

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: [`/api/drivers/${driverId}/wallet`],
    queryFn: async () => {
      const response = await fetch(`/api/drivers/${driverId}/wallet`);
      if (!response.ok) throw new Error('Failed to fetch wallet');
      return response.json();
    }
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: [`/api/drivers/${driverId}/withdrawals`],
    queryFn: async () => {
      const response = await fetch(`/api/drivers/${driverId}/withdrawals`);
      if (!response.ok) return [];
      return response.json();
    }
  });

  const withdrawalMutation = useMutation({
    mutationFn: async (data: typeof withdrawalForm) => {
      if (parseFloat(data.amount) > parseFloat(wallet?.balance || '0')) {
        throw new Error('رصيد غير كافي');
      }

      const response = await fetch('/api/withdrawal-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'driver',
          entityId: driverId,
          amount: parseFloat(data.amount),
          accountNumber: data.accountNumber,
          bankName: data.bankName,
          accountHolder: data.accountHolder,
          requestedBy: driverName
        })
      });

      if (!response.ok) throw new Error('فشل في إنشاء طلب السحب');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'نجح',
        description: 'تم إنشاء طلب السحب بنجاح'
      });
      setShowWithdrawalDialog(false);
      setWithdrawalForm({ amount: '', accountNumber: '', bankName: '', accountHolder: driverName });
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/${driverId}/withdrawals`] });
    },
    onError: (error: any) => {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  if (walletLoading) {
    return <div>جاري التحميل...</div>;
  }

  const balance = parseFloat(wallet?.balance?.toString() || '0');
  const totalEarned = parseFloat(wallet?.totalEarned?.toString() || '0');
  const totalWithdrawn = parseFloat(wallet?.totalWithdrawn?.toString() || '0');

  const pendingWithdrawals = withdrawals.filter((w: WithdrawalRequest) => w.status === 'pending');
  const approvedWithdrawals = withdrawals.filter((w: WithdrawalRequest) => w.status === 'approved');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">إدارة المحفظة والسحب</h2>

      {/* Wallet Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الرصيد الحالي</CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(balance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">متاح للسحب</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأرباح</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(totalEarned)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">منذ التسجيل</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المسحوب</CardTitle>
            <Send className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {formatCurrency(totalWithdrawn)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">تحويلات سابقة</p>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Button */}
      <Dialog open={showWithdrawalDialog} onOpenChange={setShowWithdrawalDialog}>
        <DialogTrigger asChild>
          <Button size="lg" className="w-full" disabled={balance <= 0}>
            <Send className="mr-2 h-4 w-4" />
            طلب سحب
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>طلب سحب الأموال</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>المبلغ</Label>
              <Input
                type="number"
                placeholder="أدخل المبلغ"
                value={withdrawalForm.amount}
                onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                max={balance}
                step="0.01"
              />
              <p className="text-xs text-muted-foreground mt-1">
                الرصيد المتاح: {formatCurrency(balance)}
              </p>
            </div>

            <div>
              <Label>رقم الحساب</Label>
              <Input
                placeholder="أدخل رقم الحساب"
                value={withdrawalForm.accountNumber}
                onChange={(e) => setWithdrawalForm({ ...withdrawalForm, accountNumber: e.target.value })}
              />
            </div>

            <div>
              <Label>اسم البنك</Label>
              <Input
                placeholder="أدخل اسم البنك"
                value={withdrawalForm.bankName}
                onChange={(e) => setWithdrawalForm({ ...withdrawalForm, bankName: e.target.value })}
              />
            </div>

            <div>
              <Label>اسم صاحب الحساب</Label>
              <Input
                placeholder="اسم صاحب الحساب"
                value={withdrawalForm.accountHolder}
                onChange={(e) => setWithdrawalForm({ ...withdrawalForm, accountHolder: e.target.value })}
              />
            </div>

            <Button
              onClick={() => withdrawalMutation.mutate(withdrawalForm)}
              disabled={
                !withdrawalForm.amount ||
                !withdrawalForm.accountNumber ||
                !withdrawalForm.bankName ||
                withdrawalMutation.isPending
              }
              className="w-full"
            >
              {withdrawalMutation.isPending ? 'جاري الإرسال...' : 'إرسال الطلب'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending Withdrawals */}
      {pendingWithdrawals.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              طلبات السحب المعلقة ({pendingWithdrawals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingWithdrawals.map((request: WithdrawalRequest) => (
                <div key={request.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-950 rounded-lg">
                  <div>
                    <p className="font-semibold">{formatCurrency(request.amount)}</p>
                    <p className="text-sm text-muted-foreground">{request.bankName}</p>
                  </div>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                    قيد الانتظار
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved Withdrawals */}
      {approvedWithdrawals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              طلبات السحب المعتمدة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>البنك</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedWithdrawals.map((request: WithdrawalRequest) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-bold text-green-600">
                        {formatCurrency(request.amount)}
                      </TableCell>
                      <TableCell>{request.bankName}</TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-600">
                          معتمد
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(request.createdAt).toLocaleDateString('ar')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Withdrawals History */}
      <Card>
        <CardHeader>
          <CardTitle>سجل السحب الكامل</CardTitle>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد طلبات سحب حتى الآن</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>البنك</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((request: WithdrawalRequest) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-semibold">
                        {formatCurrency(request.amount)}
                      </TableCell>
                      <TableCell>{request.bankName}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            request.status === 'approved'
                              ? 'default'
                              : request.status === 'rejected'
                              ? 'destructive'
                              : 'outline'
                          }
                        >
                          {request.status === 'approved' && 'معتمد'}
                          {request.status === 'pending' && 'قيد الانتظار'}
                          {request.status === 'rejected' && 'مرفوض'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(request.createdAt).toLocaleDateString('ar')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
