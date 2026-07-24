import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

// مساعد لجلب إعداد التصميم من ui_settings
function getInvoiceSetting(settings: any[] | undefined, key: string, fallback = '') {
  return settings?.find((s: any) => s.key === key)?.value || fallback;
}
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { ArrowRight, Download, Printer, Store, Calendar, DollarSign, TrendingUp, TrendingDown, RefreshCw, Wallet, Loader2 } from 'lucide-react';

const fmtNum = (n: number) => n?.toLocaleString('ar-YE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('ar-YE', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-';

export default function RestaurantStatementPage() {
  const params = useParams<{ restaurantId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const restaurantId = params.restaurantId;
  const printRef = useRef<HTMLDivElement>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(monthAgo);
  const [toDate, setToDate] = useState(today);
  const [appliedFrom, setAppliedFrom] = useState(monthAgo);
  const [appliedTo, setAppliedTo] = useState(today);

  const { data: statement, isLoading, refetch } = useQuery<any>({
    queryKey: ['/api/restaurant-accounts/statement', restaurantId, appliedFrom, appliedTo],
    queryFn: async () => {
      const params = new URLSearchParams({ from: appliedFrom, to: appliedTo });
      const res = await fetch(`/api/restaurant-accounts/${restaurantId}/statement?${params}`);
      if (!res.ok) throw new Error('فشل في جلب كشف الحساب');
      return res.json();
    },
    enabled: !!restaurantId
  });

  // إعدادات تصميم المستندات المُحمَّلة من لوحة التحكم
  const { data: uiSettings } = useQuery<any[]>({ queryKey: ['/api/ui-settings'] });
  const iSet = (key: string, fb = '') => getInvoiceSetting(uiSettings, key, fb);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setPdfGenerating(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pxW = canvas.width / 2;
      const pxH = canvas.height / 2;
      const mmW = pxW * 0.2646;
      const mmH = pxH * 0.2646;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [mmW, mmH],
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, mmW, mmH);

      const storeNameClean = (r?.name || 'store').replace(/[\\/:*?"<>|]/g, '');
      pdf.save(`statement-${storeNameClean}-${appliedFrom || 'all'}-${appliedTo || 'now'}.pdf`);
      toast({ title: 'تم التحميل', description: 'تم حفظ كشف الحساب بنجاح بملف PDF' });
    } catch (err) {
      console.error('Error generating PDF statement:', err);
      toast({ title: 'خطأ', description: 'فشل في إنشاء ملف PDF', variant: 'destructive' });
    } finally {
      setPdfGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const r = statement?.restaurant;
  const s = statement?.summary;
  const orders = statement?.orders || [];
  const withdrawals = statement?.withdrawals || [];

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setLocation('/admin/restaurant-accounts')} className="gap-2">
            <ArrowRight className="h-4 w-4" />
            رجوع
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">كشف حساب تفصيلي</h1>
            <p className="text-gray-500 text-sm">{r?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
          <Button onClick={handleDownloadPDF} disabled={pdfGenerating} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            {pdfGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري التحميل...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                تحميل PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* فلتر الفترة */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="text-xs font-bold text-gray-500 mb-1 block">من تاريخ</Label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-500 mb-1 block">إلى تاريخ</Label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40" />
            </div>
            <Button onClick={() => { setAppliedFrom(fromDate); setAppliedTo(toDate); }} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              تطبيق الفلتر
            </Button>
            <Button variant="outline" onClick={() => { setFromDate(''); setToDate(''); setAppliedFrom(''); setAppliedTo(''); }} className="gap-2">
              الكل
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* معلومات المتجر */}
      <div ref={printRef}>
        {/* هيدر ترويسة كشف الحساب الرسمية باللغتين مع الشعار المرفوع */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-5 rounded-xl mb-4 shadow-sm flex items-center justify-between print:rounded-none">
          <div className="space-y-1">
            <h2 className="text-xl font-black">{iSet('invoice_company_name', 'السريع ون')}</h2>
            <p className="text-xs opacity-90">{iSet('invoice_header_text', 'كشف حساب تفصيلي - Store Statement')}</p>
            {iSet('invoice_company_phone') && <p className="text-[11px] opacity-80 dir-ltr text-right">📞 {iSet('invoice_company_phone')}</p>}
            {iSet('invoice_company_address') && <p className="text-[11px] opacity-80">📍 {iSet('invoice_company_address')}</p>}
          </div>

          {(iSet('invoice_show_logo') !== 'false' && (iSet('invoice_company_logo') || iSet('header_logo_url') || iSet('sidebar_logo_url'))) && (
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/20 shrink-0">
              <img
                src={iSet('invoice_company_logo') || iSet('header_logo_url') || iSet('sidebar_logo_url')}
                alt="شعار الشركة"
                className="h-14 w-14 max-h-16 object-contain rounded-lg bg-white p-1"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </div>

        <Card className="border-2 border-blue-100 print:border-gray-300">
          <CardHeader className="bg-blue-50 print:bg-gray-100 rounded-t-lg">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">{r?.name}</CardTitle>
                  <p className="text-sm text-gray-600">{r?.phone} | نسبة العمولة: {r?.commissionRate}%</p>
                </div>
              </div>
              <div className="text-left text-xs text-gray-500">
                <p>الفترة: {appliedFrom || 'كل الوقت'} ← {appliedTo || 'الآن'}</p>
                <p>تاريخ الإنشاء: {new Date().toLocaleString('ar-YE')}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* ملخص الحساب */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-black text-blue-600">{s?.deliveredOrders || 0}</div>
              <div className="text-xs text-gray-500 mt-1">طلبات مكتملة</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-black text-green-600">{fmtNum(s?.totalSubtotal || 0)}</div>
              <div className="text-xs text-gray-500 mt-1">إجمالي المبيعات (ريال)</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-black text-red-500">{fmtNum(s?.totalCommission || 0)}</div>
              <div className="text-xs text-gray-500 mt-1">عمولة المنصة (ريال)</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-black text-emerald-600">{fmtNum(s?.totalNet || 0)}</div>
              <div className="text-xs text-gray-500 mt-1">صافي المتجر (ريال)</div>
            </CardContent>
          </Card>
        </div>

        {/* الرصيد الحالي */}
        <Card className="mt-4 bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-6 justify-between items-center">
              <div className="flex items-center gap-3">
                <Wallet className="h-8 w-8 text-emerald-600" />
                <div>
                  <p className="text-xs text-gray-500">الرصيد المتاح حالياً</p>
                  <p className="text-2xl font-black text-emerald-600">{fmtNum(s?.currentBalance || 0)} ريال</p>
                </div>
              </div>
              <div className="flex gap-8">
                <div className="text-center">
                  <p className="text-xs text-gray-500">تم سحبه</p>
                  <p className="text-lg font-bold text-gray-700">{fmtNum(s?.totalWithdrawn || 0)} ريال</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">قيد المراجعة</p>
                  <p className="text-lg font-bold text-orange-600">{fmtNum(s?.pendingWithdrawals || 0)} ريال</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">الطلبات الملغاة</p>
                  <p className="text-lg font-bold text-red-500">{s?.cancelledOrders || 0}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* جدول الطلبات */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              تفاصيل الطلبات المكتملة ({orders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {orders.length === 0 ? (
              <div className="text-center py-10 text-gray-400">لا توجد طلبات مكتملة في هذه الفترة</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-right">#</TableHead>
                      <TableHead className="text-right">رقم الطلب</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">العميل</TableHead>
                      <TableHead className="text-right">إجمالي الطلب</TableHead>
                      <TableHead className="text-right">عمولة المنصة</TableHead>
                      <TableHead className="text-right font-bold text-emerald-700">صافي المتجر</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o: any, i: number) => (
                      <TableRow key={o.orderId} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <TableCell className="text-gray-400 text-sm">{i + 1}</TableCell>
                        <TableCell>
                          <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            #{o.orderNumber}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{fmtDate(o.date)}</TableCell>
                        <TableCell className="text-sm">{o.customerName}</TableCell>
                        <TableCell className="font-medium">{fmtNum(o.subtotal)} ر.ي</TableCell>
                        <TableCell>
                          <span className="text-red-600 text-sm">
                            -{fmtNum(o.commissionAmount)} ر.ي
                            <span className="text-xs text-gray-400 mr-1">({o.commissionRate}%)</span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-emerald-700">{fmtNum(o.restaurantNet)} ر.ي</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* إجمالي الجدول */}
                <div className="border-t-2 border-gray-200 bg-gray-50 p-4">
                  <div className="flex justify-end gap-8 font-bold">
                    <span>إجمالي المبيعات: <span className="text-blue-700">{fmtNum(s?.totalSubtotal || 0)} ريال</span></span>
                    <span>العمولة: <span className="text-red-600">-{fmtNum(s?.totalCommission || 0)} ريال</span></span>
                    <span>الصافي: <span className="text-emerald-700">{fmtNum(s?.totalNet || 0)} ريال</span></span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* جدول السحوبات */}
        {withdrawals.length > 0 && (
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                سجل السحوبات ({withdrawals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-right">#</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">البنك</TableHead>
                      <TableHead className="text-right">رقم الحساب</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((w: any, i: number) => (
                      <TableRow key={w.id}>
                        <TableCell className="text-gray-400 text-sm">{i + 1}</TableCell>
                        <TableCell className="text-sm">{fmtDate(w.date)}</TableCell>
                        <TableCell className="font-bold text-orange-600">{fmtNum(w.amount)} ريال</TableCell>
                        <TableCell>
                          {w.status === 'completed' ? (
                            <Badge className="bg-green-100 text-green-700">مكتمل</Badge>
                          ) : w.status === 'pending' ? (
                            <Badge className="bg-yellow-100 text-yellow-700">قيد المراجعة</Badge>
                          ) : (
                            <Badge variant="outline">{w.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell>{w.bankName || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{w.accountNumber || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="border-t border-gray-200 bg-gray-50 p-4 text-left font-bold">
                  إجمالي السحوبات المكتملة: <span className="text-orange-600">{fmtNum(s?.totalWithdrawn || 0)} ريال</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* توقيع المستند */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400 print:block hidden">
          <p>كشف الحساب تم إنشاؤه آلياً من نظام السريع ون - {new Date().toLocaleString('ar-YE')}</p>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          [data-print-area], [data-print-area] * { visibility: visible; }
        }
      `}</style>
    </div>
  );
}
