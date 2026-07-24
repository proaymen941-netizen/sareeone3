import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

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
import { ArrowRight, Download, Printer, Store, TrendingUp, TrendingDown, RefreshCw, Wallet, Loader2 } from 'lucide-react';

const ORANGE = '#E8681A';
const ORANGE_DARK = '#C45A12';
const ORANGE_LIGHT = '#FFF3EC';
const ORANGE_MID = '#FDCBA8';

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

  const { data: statement, isLoading } = useQuery<any>({
    queryKey: ['/api/restaurant-accounts/statement', restaurantId, appliedFrom, appliedTo],
    queryFn: async () => {
      const p = new URLSearchParams({ from: appliedFrom, to: appliedTo });
      const res = await fetch(`/api/restaurant-accounts/${restaurantId}/statement?${p}`);
      if (!res.ok) throw new Error('فشل في جلب كشف الحساب');
      return res.json();
    },
    enabled: !!restaurantId
  });

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
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [mmW, mmH] });
      pdf.addImage(imgData, 'JPEG', 0, 0, mmW, mmH);
      const storeNameClean = (r?.name || 'store').replace(/[\\/:*?"<>|]/g, '');
      pdf.save(`كشف-حساب-${storeNameClean}-${appliedFrom || 'all'}.pdf`);
      toast({ title: 'تم التحميل', description: 'تم حفظ كشف الحساب بنجاح' });
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast({ title: 'خطأ', description: 'فشل في إنشاء ملف PDF', variant: 'destructive' });
    } finally {
      setPdfGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4" style={{ borderColor: ORANGE }}></div>
      </div>
    );
  }

  const r = statement?.restaurant;
  const s = statement?.summary;
  const orders = statement?.orders || [];
  const withdrawals = statement?.withdrawals || [];

  const logoSrc = iSet('invoice_company_logo') || iSet('header_logo_url') || iSet('sidebar_logo_url');
  const companyName = iSet('invoice_company_name', 'السريع ون');
  const companyPhone = iSet('invoice_company_phone');
  const companyAddress = iSet('invoice_company_address');

  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">

      {/* أزرار التحكم — مخفية عند الطباعة */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setLocation('/admin/restaurant-accounts')} className="gap-2">
            <ArrowRight className="h-4 w-4" />
            رجوع
          </Button>
          <div>
            <h1 className="text-2xl font-black" style={{ color: ORANGE }}>كشف حساب تفصيلي</h1>
            <p className="text-gray-500 text-sm">{r?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50">
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
          <Button onClick={handleDownloadPDF} disabled={pdfGenerating} className="gap-2 text-white" style={{ background: ORANGE }}>
            {pdfGenerating ? (<><Loader2 className="h-4 w-4 animate-spin" />جاري التحميل...</>) : (<><Download className="h-4 w-4" />تحميل PDF</>)}
          </Button>
        </div>
      </div>

      {/* فلتر الفترة */}
      <div className="print:hidden rounded-xl border-2 p-4" style={{ borderColor: ORANGE_MID, background: ORANGE_LIGHT }}>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <Label className="text-xs font-bold mb-1 block" style={{ color: ORANGE_DARK }}>من تاريخ</Label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40 border-orange-300 focus:ring-orange-400" />
          </div>
          <div>
            <Label className="text-xs font-bold mb-1 block" style={{ color: ORANGE_DARK }}>إلى تاريخ</Label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40 border-orange-300 focus:ring-orange-400" />
          </div>
          <Button onClick={() => { setAppliedFrom(fromDate); setAppliedTo(toDate); }} className="gap-2 text-white" style={{ background: ORANGE }}>
            <RefreshCw className="h-4 w-4" />تطبيق
          </Button>
          <Button variant="outline" onClick={() => { setFromDate(''); setToDate(''); setAppliedFrom(''); setAppliedTo(''); }}
            className="gap-2 border-orange-300 text-orange-700">
            الكل
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          منطقة الطباعة / PDF
      ═══════════════════════════════════════════ */}
      <div ref={printRef} style={{ background: '#fff' }}>

        {/* ترويسة المستند — بتصميم Saree One */}
        <div style={{
          border: `4px solid ${ORANGE}`,
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 16,
          fontFamily: "Arial, 'Segoe UI', Tahoma, Geneva, sans-serif",
          direction: 'rtl',
        }}>
          {/* الشريط العلوي */}
          <div style={{
            background: `linear-gradient(135deg, ${ORANGE} 0%, ${ORANGE_DARK} 100%)`,
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}>
            {/* اليمين: اسم الشركة */}
            <div style={{ color: '#fff' }}>
              <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.3 }}>{companyName}</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>كشف حساب تفصيلي</div>
              {companyPhone && <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>📞 {companyPhone}</div>}
              {companyAddress && <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>📍 {companyAddress}</div>}
            </div>

            {/* الوسط: الشعار */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              {logoSrc ? (
                <img src={logoSrc} alt="شعار" style={{ height: 70, maxWidth: 130, objectFit: 'contain', borderRadius: 10, background: 'rgba(255,255,255,0.15)', padding: 6 }} />
              ) : (
                <div style={{
                  background: '#000',
                  borderRadius: 12,
                  padding: '8px 20px',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}>
                  <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: 1 }}>سريع</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: ORANGE, letterSpacing: 4, marginTop: 2 }}>SAREE</div>
                </div>
              )}
            </div>

            {/* اليسار: التاريخ */}
            <div style={{ color: '#fff', textAlign: 'left', fontSize: 12, lineHeight: 1.8 }}>
              <div>الفترة: {appliedFrom || 'الكل'}</div>
              <div>حتى: {appliedTo || 'الآن'}</div>
              <div>تاريخ الإنشاء:</div>
              <div>{new Date().toLocaleDateString('ar-YE')}</div>
            </div>
          </div>

          {/* شريط بيانات المتجر */}
          <div style={{
            background: ORANGE_LIGHT,
            borderTop: `2px solid ${ORANGE_MID}`,
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}>
            <div style={{
              background: ORANGE,
              borderRadius: 10,
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Store size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a' }}>{r?.name || '—'}</div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
                {r?.phone && <span>📞 {r.phone}</span>}
                {r?.commissionRate && <span style={{ marginRight: 12 }}>نسبة العمولة: <strong style={{ color: ORANGE }}>{r.commissionRate}%</strong></span>}
              </div>
            </div>
          </div>
        </div>

        {/* بطاقات الملخص */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'طلبات مكتملة', value: s?.deliveredOrders || 0, color: ORANGE, suffix: '' },
            { label: 'إجمالي المبيعات', value: fmtNum(s?.totalSubtotal || 0), color: '#16a34a', suffix: ' ريال' },
            { label: 'عمولة المنصة', value: fmtNum(s?.totalCommission || 0), color: '#dc2626', suffix: ' ريال' },
            { label: 'صافي المتجر', value: fmtNum(s?.totalNet || 0), color: '#059669', suffix: ' ريال' },
          ].map((card, i) => (
            <div key={i} style={{
              border: `2px solid ${ORANGE_MID}`,
              borderRadius: 12,
              padding: '14px 12px',
              textAlign: 'center',
              background: '#fff',
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* رصيد المحفظة */}
        <div style={{
          border: `2px solid ${ORANGE_MID}`,
          borderRadius: 12,
          background: ORANGE_LIGHT,
          padding: '14px 20px',
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: ORANGE, borderRadius: 10, padding: 8 }}>
              <Wallet size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#666' }}>الرصيد المتاح حالياً</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: ORANGE }}>{fmtNum(s?.currentBalance || 0)} ريال</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              { label: 'تم سحبه', value: fmtNum(s?.totalWithdrawn || 0), color: '#374151' },
              { label: 'قيد المراجعة', value: fmtNum(s?.pendingWithdrawals || 0), color: ORANGE },
              { label: 'طلبات ملغاة', value: s?.cancelledOrders || 0, color: '#dc2626' },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#666' }}>{item.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: item.color, marginTop: 2 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* جدول الطلبات */}
        <div style={{ border: `2px solid ${ORANGE}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          {/* رأس الجدول */}
          <div style={{ background: ORANGE, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} color="#fff" />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
              تفاصيل الطلبات المكتملة ({orders.length})
            </span>
          </div>

          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa', fontSize: 14 }}>
              لا توجد طلبات مكتملة في هذه الفترة
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, direction: 'rtl' }}>
                <thead>
                  <tr style={{ background: ORANGE_LIGHT, borderBottom: `2px solid ${ORANGE_MID}` }}>
                    {['#', 'رقم الطلب', 'التاريخ', 'العميل', 'إجمالي الطلب', 'عمولة المنصة', 'صافي المتجر'].map((h, i) => (
                      <th key={i} style={{ padding: '9px 10px', textAlign: 'right', color: ORANGE_DARK, fontWeight: 800, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o: any, i: number) => (
                    <tr key={o.orderId} style={{ background: i % 2 === 0 ? '#fff' : ORANGE_LIGHT, borderBottom: `1px solid ${ORANGE_MID}` }}>
                      <td style={{ padding: '8px 10px', color: '#aaa' }}>{i + 1}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ background: ORANGE_LIGHT, color: ORANGE_DARK, border: `1px solid ${ORANGE_MID}`, borderRadius: 6, padding: '2px 8px', fontFamily: 'monospace', fontSize: 12 }}>
                          #{o.orderNumber}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#555' }}>{fmtDate(o.date)}</td>
                      <td style={{ padding: '8px 10px' }}>{o.customerName}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{fmtNum(o.subtotal)} ر.ي</td>
                      <td style={{ padding: '8px 10px', color: '#dc2626' }}>
                        -{fmtNum(o.commissionAmount)} ر.ي
                        <span style={{ color: '#aaa', fontSize: 11, marginRight: 4 }}>({o.commissionRate}%)</span>
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: '#059669' }}>{fmtNum(o.restaurantNet)} ر.ي</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* إجمالي الجدول */}
              <div style={{ borderTop: `2px solid ${ORANGE}`, background: ORANGE_LIGHT, padding: '10px 16px', display: 'flex', justifyContent: 'flex-end', gap: 24, fontWeight: 700, fontSize: 13 }}>
                <span>إجمالي المبيعات: <span style={{ color: ORANGE_DARK }}>{fmtNum(s?.totalSubtotal || 0)} ريال</span></span>
                <span>العمولة: <span style={{ color: '#dc2626' }}>-{fmtNum(s?.totalCommission || 0)} ريال</span></span>
                <span>الصافي: <span style={{ color: '#059669' }}>{fmtNum(s?.totalNet || 0)} ريال</span></span>
              </div>
            </div>
          )}
        </div>

        {/* جدول السحوبات */}
        {withdrawals.length > 0 && (
          <div style={{ border: `2px solid ${ORANGE_MID}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ background: '#f97316', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingDown size={18} color="#fff" />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>سجل السحوبات ({withdrawals.length})</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, direction: 'rtl' }}>
                <thead>
                  <tr style={{ background: ORANGE_LIGHT, borderBottom: `2px solid ${ORANGE_MID}` }}>
                    {['#', 'التاريخ', 'المبلغ', 'الحالة', 'البنك', 'رقم الحساب'].map((h, i) => (
                      <th key={i} style={{ padding: '9px 10px', textAlign: 'right', color: ORANGE_DARK, fontWeight: 800 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w: any, i: number) => (
                    <tr key={w.id} style={{ background: i % 2 === 0 ? '#fff' : ORANGE_LIGHT, borderBottom: `1px solid ${ORANGE_MID}` }}>
                      <td style={{ padding: '8px 10px', color: '#aaa' }}>{i + 1}</td>
                      <td style={{ padding: '8px 10px', color: '#555' }}>{fmtDate(w.date)}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: ORANGE }}>{fmtNum(w.amount)} ريال</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          padding: '2px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 700,
                          background: w.status === 'completed' ? '#dcfce7' : w.status === 'pending' ? '#fef9c3' : '#f3f4f6',
                          color: w.status === 'completed' ? '#166534' : w.status === 'pending' ? '#854d0e' : '#374151',
                        }}>
                          {w.status === 'completed' ? 'مكتمل' : w.status === 'pending' ? 'قيد المراجعة' : w.status}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px' }}>{w.bankName || '-'}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 12 }}>{w.accountNumber || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ borderTop: `1px solid ${ORANGE_MID}`, background: ORANGE_LIGHT, padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: 13 }}>
                إجمالي السحوبات المكتملة: <span style={{ color: ORANGE }}>{fmtNum(s?.totalWithdrawn || 0)} ريال</span>
              </div>
            </div>
          </div>
        )}

        {/* ذيل المستند */}
        <div style={{
          border: `2px solid ${ORANGE}`,
          borderRadius: 10,
          padding: '10px 16px',
          textAlign: 'center',
          fontSize: 11,
          color: '#555',
          direction: 'rtl',
        }}>
          كشف الحساب تم إنشاؤه آلياً من نظام <strong style={{ color: ORANGE }}>السريع ون</strong> — {new Date().toLocaleString('ar-YE')}
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
