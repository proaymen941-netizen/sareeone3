import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';

interface Transaction {
  id: string;
  type: 'commission' | 'withdrawal' | 'adjustment';
  amount: number | string;
  description: string;
  createdAt: string;
  status: string;
}

interface WalletStats {
  availableBalance: number;
  totalEarned: number;
  withdrawnAmount: number;
  pendingWithdrawals: number;
}

export default function WalletPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');

  const driverToken = localStorage.getItem('driver_token');
  const driverData = localStorage.getItem('driver_user');
  const driverId = driverData ? JSON.parse(driverData).id : null;

  // التحقق من تسجيل الدخول
  useEffect(() => {
    if (!driverToken) {
      window.location.href = '/driver-login';
    }
  }, [driverToken]);

  // Fetch Wallet Data (Balance and Transactions)
  const { data: walletData, isLoading } = useQuery({
    queryKey: ['/api/drivers/balance', driverId],
    queryFn: async () => {
      const response = await fetch('/api/drivers/balance', {
        headers: {
          'Authorization': `Bearer ${driverToken}`
        }
      });
      if (!response.ok) throw new Error('فشل في جلب بيانات المحفظة');
      return response.json();
    },
    enabled: !!driverToken,
  });

  const { balance = {}, transactions = [], withdrawals = [] } = walletData || {};

  const stats: WalletStats = {
    availableBalance: parseFloat(balance.availableBalance || "0"),
    totalEarned: parseFloat(balance.totalBalance || "0"),
    withdrawnAmount: parseFloat(balance.withdrawnAmount || "0"),
    pendingWithdrawals: withdrawals
      ?.filter((w: any) => w.status === 'pending')
      .reduce((sum: number, w: any) => sum + parseFloat(w.amount || "0"), 0) || 0,
  };

  const requestWithdrawalMutation = useMutation({
    mutationFn: async (data: { amount: number; notes: string }) => {
      const response = await fetch('/api/drivers/withdraw', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        },
        body: JSON.stringify({
          amount: data.amount,
          method: 'wallet',
          details: data.notes
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'فشل في إرسال طلب السحب');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/balance', driverId] });
      setWithdrawAmount('');
      setWithdrawNotes('');
      toast({
        title: "✅ تم إرسال الطلب",
        description: "تم إرسال طلب سحب الرصيد بنجاح وهو قيد المراجعة",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }
    if (amount > stats.availableBalance) {
      toast({ title: "خطأ", description: "الرصيد غير كافٍ", variant: "destructive" });
      return;
    }
    requestWithdrawalMutation.mutate({ amount, notes: withdrawNotes });
  };

  if (isLoading && !walletData) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4" dir="rtl">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white border-none shadow-lg">
          <CardContent className="p-6 text-right">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <Badge className="bg-white/20 text-white border-none">الرصيد الحالي</Badge>
            </div>
            <h3 className="text-3xl font-black mb-1">{formatCurrency(stats.availableBalance)}</h3>
            <p className="text-white/80 text-sm">متاح للسحب</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-gray-100 shadow-md">
          <CardContent className="p-6 text-right">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <ArrowUpRight className="h-6 w-6 text-blue-600" />
              </div>
              <Badge variant="outline" className="text-blue-600 border-blue-200">إجمالي الأرباح</Badge>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(stats.totalEarned)}</h3>
            <p className="text-gray-500 text-xs">منذ الانضمام</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-gray-100 shadow-md">
          <CardContent className="p-6 text-right">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <Badge variant="outline" className="text-orange-600 border-orange-200">قيد الانتظار</Badge>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(stats.pendingWithdrawals)}</h3>
            <p className="text-gray-500 text-xs">طلبات سحب معلقة</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Withdrawal Form */}
        <Card className="border-2 border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-primary" />
              طلب سحب رصيد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="space-y-2 text-right">
                <Label htmlFor="amount">المبلغ المراد سحبه (ريال)</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="text-right font-bold pl-12 h-12 text-lg"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">ريال</div>
                </div>
              </div>
              <div className="space-y-2 text-right">
                <Label htmlFor="notes">ملاحظات التحويل (اختياري)</Label>
                <Input
                  id="notes"
                  placeholder="مثلاً: رقم الحساب البنكي أو اسم المحفظة"
                  value={withdrawNotes}
                  onChange={(e) => setWithdrawNotes(e.target.value)}
                  className="h-12"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-bold"
                disabled={requestWithdrawalMutation.isPending || stats.availableBalance <= 0}
              >
                {requestWithdrawalMutation.isPending ? 'جاري الإرسال...' : 'إرسال طلب السحب'}
              </Button>
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-blue-700 text-xs">
                <AlertCircle className="h-4 w-4" />
                <span>سيتم مراجعة طلبك من قبل الإدارة وتحويل المبلغ خلال 24 ساعة.</span>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="border-2 border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-gray-500" />
              آخر العمليات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">لا توجد عمليات سابقة</div>
              ) : (
                transactions.map((tx: Transaction) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-50 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        tx.type === 'commission' ? 'bg-green-50 text-green-600' : 
                        tx.type === 'withdrawal' ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-600'
                      }`}>
                        {tx.type === 'commission' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-gray-900">{tx.description}</p>
                        <p className="text-[10px] text-gray-400">{formatDate(tx.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className={`font-black text-sm ${
                        tx.type === 'commission' ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {tx.type === 'commission' ? '+' : '-'}{formatCurrency(parseFloat(tx.amount.toString()))}
                      </p>
                      <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-gray-200 text-gray-400">مكتمل</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
