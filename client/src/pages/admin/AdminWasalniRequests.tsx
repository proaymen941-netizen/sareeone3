import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bike, MapPin, Clock, Phone, User, Eye, CheckCircle, XCircle, Truck, Search, UserCheck, Plus, Navigation, Loader2, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { generateOrderPDF } from '@/lib/generateOrderPDF';

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مقبول',
  on_way: 'في الطريق',
  delivered: 'تم التنفيذ',
  cancelled: 'ملغي',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  on_way: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

export default function AdminWasalniRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [estimatedFee, setEstimatedFee] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [pdfLoadingIds, setPdfLoadingIds] = useState<Set<string>>(new Set());

  const { data: requests = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/wasalni'],
    queryFn: async () => {
      const res = await fetch('/api/wasalni');
      if (!res.ok) throw new Error('فشل في جلب الطلبات');
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: drivers = [] } = useQuery<any[]>({
    queryKey: ['/api/drivers'],
    queryFn: async () => {
      const res = await fetch('/api/drivers');
      if (!res.ok) return [];
      return res.json();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/wasalni/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('فشل في تحديث الطلب');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wasalni'] });
      toast({ title: "تم تحديث الطلب بنجاح" });
      setShowDetail(false);
    },
    onError: (err: any) => {
      toast({ title: "خطأ في التحديث", description: err.message, variant: "destructive" });
    },
  });

  const assignDriverMutation = useMutation({
    mutationFn: async ({ requestId, driverId }: { requestId: string; driverId: string }) => {
      const res = await fetch(`/api/wasalni/${requestId}/assign-driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId }),
      });
      if (!res.ok) throw new Error('فشل في تعيين السائق');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wasalni'] });
      toast({ title: "✅ تم تعيين السائق بنجاح" });
      setShowDetail(false);
    },
    onError: (err: any) => {
      toast({ title: "❌ خطأ", description: err.message, variant: "destructive" });
    },
  });

  const { data: uiSettings } = useQuery<any[]>({ queryKey: ['/api/ui-settings'] });
  const appLogoUrl = uiSettings?.find((s: any) => s.key === 'invoice_company_logo')?.value || 
                     uiSettings?.find((s: any) => s.key === 'header_logo_url')?.value || 
                     uiSettings?.find((s: any) => s.key === 'sidebar_logo_url')?.value || '';

  // ─── توليد سند PDF لطلب وصل لي ─────────────────────────────────────
  const handleGenerateWasalniPDF = async (request: any) => {
    const id = request.id || request.requestNumber;
    setPdfLoadingIds((prev) => new Set(prev).add(id));
    try {
      const fee = parseFloat(request.estimatedFee || '0');
      const description = request.itemDescription
        || request.itemType
        || `خدمة توصيل من "${request.fromAddress || '—'}" إلى "${request.toAddress || '—'}"`;
      await generateOrderPDF({
        orderNumber: request.requestNumber || request.id?.slice(0, 8),
        date: request.createdAt || request.scheduledDate,
        logoUrl: appLogoUrl,
        items: [{ name: description, quantity: 1, price: fee }],
        subtotal: fee,
        deliveryFee: 0,
        total: fee,
      });
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setPdfLoadingIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  const filtered = requests.filter((r) => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchSearch = !searchQuery ||
      r.customerName?.includes(searchQuery) ||
      r.customerPhone?.includes(searchQuery) ||
      r.requestNumber?.includes(searchQuery);
    return matchStatus && matchSearch;
  });

  const handleUpdateStatus = (status: string) => {
    if (!selectedRequest) return;
    const data: any = { status };
    if (adminNotes) data.adminNotes = adminNotes;
    if (status === 'cancelled' && cancelReason) data.cancelReason = cancelReason;
    if (estimatedFee) data.estimatedFee = estimatedFee;
    updateMutation.mutate({ id: selectedRequest.id, data });
  };

  const handleAssignDriver = () => {
    if (!selectedRequest || !selectedDriverId) return;
    assignDriverMutation.mutate({ requestId: selectedRequest.id, driverId: selectedDriverId });
  };

  // دالة لحساب المسافة بالكم بين نقطتين
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // نصف قطر الأرض بالكم
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getNearestDriver = (req: any) => {
    if (!drivers || drivers.length === 0 || !req.fromLat || !req.fromLng) return null;
    
    const availableDrivers = drivers.filter(d => d.isAvailable && d.isActive && d.latitude && d.longitude);
    if (availableDrivers.length === 0) return null;

    let nearest = availableDrivers[0];
    let minDistance = calculateDistance(
      parseFloat(req.fromLat), 
      parseFloat(req.fromLng),
      parseFloat(nearest.latitude!),
      parseFloat(nearest.longitude!)
    );

    availableDrivers.forEach(driver => {
      const dist = calculateDistance(
        parseFloat(req.fromLat),
        parseFloat(req.fromLng),
        parseFloat(driver.latitude!),
        parseFloat(driver.longitude!)
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearest = driver;
      }
    });

    return { driver: nearest, distance: minDistance.toFixed(2) };
  };

  const openDetail = (r: any) => {
    setSelectedRequest(r);
    setAdminNotes(r.adminNotes || '');
    setCancelReason(r.cancelReason || '');
    setEstimatedFee(r.estimatedFee || '');
    setSelectedDriverId(r.driverId || '');
    setShowDetail(true);
  };

  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    confirmed: requests.filter(r => r.status === 'confirmed').length,
    delivered: requests.filter(r => r.status === 'delivered').length,
  };

  return (
    <div className="space-y-6 p-4" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
          <Bike className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">طلبات وصل لي</h1>
          <p className="text-gray-500 text-sm">إدارة طلبات خدمة التوصيل</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'الكل', count: counts.all, color: 'bg-gray-100 text-gray-700' },
          { label: 'انتظار', count: counts.pending, color: 'bg-yellow-100 text-yellow-700' },
          { label: 'مقبول', count: counts.confirmed, color: 'bg-blue-100 text-blue-700' },
          { label: 'مُنفَّذ', count: counts.delivered, color: 'bg-green-100 text-green-700' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-3 text-center`}>
            <div className="text-2xl font-black">{stat.count}</div>
            <div className="text-xs font-semibold">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="بحث بالاسم أو الهاتف أو رقم الطلب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 rounded-xl"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الطلبات</SelectItem>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
          <p className="font-bold">جاري تحميل الطلبات...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
          <Bike className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">لا توجد طلبات مطابقة للبحث</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((request) => (
            <Card key={request.id} className="hover:shadow-lg transition-all border-none shadow-sm rounded-3xl overflow-hidden group">
              <CardContent className="p-0">
                <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                  <span className="font-black text-primary text-sm tracking-tighter">{request.requestNumber}</span>
                  <Badge className={`text-[10px] px-2 py-0.5 rounded-full border-none font-bold ${STATUS_COLORS[request.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[request.status] || request.status}
                  </Badge>
                </div>

                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-gray-900 text-sm truncate">{request.customerName}</p>
                      <p className="text-xs text-gray-500 font-bold">{request.customerPhone}</p>
                    </div>
                    <a href={`tel:${request.customerPhone}`} className="mr-auto w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center text-green-600 hover:bg-green-600 hover:text-white transition-colors">
                      <Phone className="h-4 w-4" />
                    </a>
                  </div>

                  <div className="space-y-2 relative pr-3 before:absolute before:right-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 before:rounded-full">
                    <div className="flex items-start gap-2 relative">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1 shrink-0 ring-4 ring-green-50" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 font-bold">من (نقطة الانطلاق)</p>
                        <p className="text-xs text-gray-700 font-bold truncate">{request.fromAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 relative">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0 ring-4 ring-red-50" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 font-bold">إلى (نقطة الوصول)</p>
                        <p className="text-xs text-gray-700 font-bold truncate">{request.toAddress}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold">
                      <Clock className="h-3 w-3" />
                      {request.scheduledDate} | {request.scheduledTime}
                    </div>
                    <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded-xl font-black text-xs">
                      {request.estimatedFee ? `${parseFloat(request.estimatedFee).toLocaleString()} ر.ي` : 'قيد التقدير'}
                    </div>
                  </div>

                  <Button
                    onClick={() => openDetail(request)}
                    className="w-full h-10 bg-gray-900 text-white hover:bg-primary rounded-2xl transition-all font-bold text-xs gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    عرض التفاصيل ومعالجة الطلب
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl" dir="rtl">
          <DialogHeader className="p-6 bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <DialogTitle className="flex items-center gap-3 text-xl font-black">
              <Bike className="h-7 w-7" />
              معالجة طلب وصل لي
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar bg-white">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-orange-50/50 p-4 rounded-[1.5rem] border border-orange-100">
                  <p className="text-[10px] text-orange-400 font-black mb-1">رقم الطلب</p>
                  <p className="font-black text-primary text-sm">{selectedRequest.requestNumber}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-[1.5rem] border border-gray-100">
                  <p className="text-[10px] text-gray-400 font-black mb-1">الحالة الحالية</p>
                  <Badge className={`text-[10px] px-2.5 py-0.5 rounded-full border-none font-black ${STATUS_COLORS[selectedRequest.status]}`}>
                    {STATUS_LABELS[selectedRequest.status]}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  معلومات العميل والمسار
                </h3>
                <div className="bg-gray-50/50 rounded-[2rem] p-5 border border-gray-100 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-bold">العميل:</span>
                    <span className="font-black text-sm">{selectedRequest.customerName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-bold">الهاتف:</span>
                    <a href={`tel:${selectedRequest.customerPhone}`} className="font-black text-sm text-primary underline underline-offset-4">{selectedRequest.customerPhone}</a>
                  </div>
                  <div className="pt-4 border-t border-gray-200/50 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-black">نقطة الاستلام (من)</p>
                        <p className="text-sm font-bold text-gray-800 leading-relaxed">{selectedRequest.fromAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-black">نقطة التوصيل (إلى)</p>
                        <p className="text-sm font-bold text-gray-800 leading-relaxed">{selectedRequest.toAddress}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Driver Assignment Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  تعيين مندوب التوصيل
                </h3>
                
                {getNearestDriver(selectedRequest) && (
                  <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-[2rem] p-5 flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-[1.25rem] bg-orange-100 flex items-center justify-center shadow-inner">
                        <Navigation className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-orange-500 font-black uppercase tracking-tighter">السائق الأقرب للموقع</p>
                        <p className="text-sm font-black text-gray-900">{getNearestDriver(selectedRequest)?.driver.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold">يبعد حوالي {getNearestDriver(selectedRequest)?.distance} كم</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="rounded-[1rem] border-orange-200 text-orange-600 font-black text-xs hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                      onClick={() => setSelectedDriverId(getNearestDriver(selectedRequest)?.driver.id || '')}
                    >
                      اختياره
                    </Button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                    <SelectTrigger className="flex-1 h-12 rounded-[1.25rem] bg-gray-50 border-gray-100 font-bold text-sm">
                      <SelectValue placeholder="اختر مندوباً من القائمة" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {drivers.filter(d => d.isActive).map(driver => (
                        <SelectItem key={driver.id} value={driver.id} className="rounded-xl my-1 mx-1">
                          <div className="flex items-center justify-between w-full gap-4">
                            <span className="font-bold">{driver.name}</span>
                            {!driver.isAvailable && <Badge variant="outline" className="text-[8px] bg-red-50 text-red-500 border-none font-black">مشغول</Badge>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleAssignDriver}
                    disabled={!selectedDriverId || assignDriverMutation.isPending}
                    className="h-12 px-8 bg-gray-900 hover:bg-primary text-white rounded-[1.25rem] font-black gap-2 transition-all shadow-lg"
                  >
                    {assignDriverMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserCheck className="h-5 w-5" />}
                    تعيين
                  </Button>
                </div>
              </div>

              {/* Fee & Status */}
              <div className="space-y-4 pt-6 border-t border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase px-2">الحالة</Label>
                    <Select value={selectedRequest.status} onValueChange={handleUpdateStatus}>
                      <SelectTrigger className="h-12 rounded-[1.25rem] bg-gray-50 border-gray-100 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl">
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val} className="rounded-xl my-1 mx-1">{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase px-2">رسوم التوصيل (ر.ي)</Label>
                    <Input
                      type="number"
                      value={estimatedFee}
                      onChange={(e) => setEstimatedFee(e.target.value)}
                      placeholder="0.00"
                      className="h-12 rounded-[1.25rem] bg-gray-50 border-gray-100 font-black text-primary text-center"
                    />
                  </div>
                </div>

                {selectedRequest.status === 'cancelled' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <Label className="text-[10px] font-black text-red-400 uppercase px-2">سبب الإلغاء</Label>
                    <Input
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="لماذا تم إلغاء الطلب؟"
                      className="h-12 rounded-[1.25rem] bg-red-50/50 border-red-100 font-bold text-red-600"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-400 uppercase px-2">ملاحظات الإدارة</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="ملاحظات سرية للإدارة..."
                    className="rounded-[1.5rem] bg-gray-50 border-gray-100 font-medium resize-none"
                    rows={2}
                  />
                </div>

                {/* ── زر السند الإلكتروني ── */}
                <Button
                  variant="outline"
                  onClick={() => handleGenerateWasalniPDF(selectedRequest)}
                  disabled={pdfLoadingIds.has(selectedRequest?.id || selectedRequest?.requestNumber)}
                  className="w-full h-12 border-orange-300 text-orange-700 hover:bg-orange-50 rounded-[1.5rem] font-black gap-2"
                >
                  {pdfLoadingIds.has(selectedRequest?.id || selectedRequest?.requestNumber)
                    ? <Loader2 className="h-5 w-5 animate-spin" />
                    : <FileText className="h-5 w-5" />}
                  طباعة السند الإلكتروني
                </Button>

                <Button 
                  onClick={() => handleUpdateStatus(selectedRequest.status)}
                  disabled={updateMutation.isPending}
                  className="w-full h-14 bg-primary hover:opacity-90 text-white rounded-[1.5rem] font-black text-lg transition-all shadow-xl shadow-primary/20"
                >
                  {updateMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : "حفظ ومعالجة الطلب"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
