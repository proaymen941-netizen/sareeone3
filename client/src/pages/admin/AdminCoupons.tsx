import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit, Ticket, Check, X, Calendar, Copy, BarChart3, Users, Tag, Percent, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function AdminCoupons() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [searchText, setSearchText] = useState('');

  const { data: coupons = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/coupons'],
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  const couponMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingCoupon) {
        const res = await apiRequest('PUT', `/api/admin/coupons/${editingCoupon.id}`, data);
        return res.json();
      }
      const res = await apiRequest('POST', '/api/admin/coupons', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/coupons'] });
      setIsDialogOpen(false);
      setEditingCoupon(null);
      setFormData({});
      toast({ title: editingCoupon ? "تم تحديث الكوبون" : "تمت إضافة الكوبون بنجاح" });
    },
    onError: (error: any) => {
      const raw = error?.message || '';
      const serverMsg = raw.includes(':') ? raw.split(':').slice(1).join(':').trim() : raw;
      let displayMsg = "تعذّر حفظ الكوبون، تحقق من البيانات";
      try {
        const parsed = JSON.parse(serverMsg);
        displayMsg = parsed.error || parsed.message || displayMsg;
      } catch {
        if (serverMsg) displayMsg = serverMsg;
      }
      toast({ title: "حدث خطأ في العملية", description: displayMsg, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/admin/coupons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/coupons'] });
      toast({ title: "تم حذف الكوبون" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: any) => apiRequest('PUT', `/api/admin/coupons/${id}`, { isActive }),
    onMutate: async ({ id, isActive }: any) => {
      await queryClient.cancelQueries({ queryKey: ['/api/admin/coupons'] });
      const prev = queryClient.getQueryData<any[]>(['/api/admin/coupons']);
      queryClient.setQueryData(['/api/admin/coupons'], (old: any[]) =>
        (old || []).map(c => c.id === id ? { ...c, isActive } : c)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData(['/api/admin/coupons'], ctx.prev);
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "تم تحديث حالة الكوبون" });
    },
  });

  const openAddDialog = () => {
    setEditingCoupon(null);
    setFormData({
      type: 'percentage',
      isActive: true,
      applicableFor: 'all',
      minOrderValue: '0',
      usageLimit: '',
      perUserLimit: '1',
      categoryId: '',
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (coupon: any) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      nameAr: coupon.nameAr,
      description: coupon.description || '',
      type: coupon.type,
      value: String(coupon.value),
      minOrderValue: String(coupon.minOrderValue || '0'),
      maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : '',
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
      perUserLimit: coupon.perUserLimit ? String(coupon.perUserLimit) : '1',
      applicableFor: coupon.applicableFor || 'all',
      startDate: coupon.startDate ? coupon.startDate.split('T')[0] : '',
      endDate: coupon.endDate ? coupon.endDate.split('T')[0] : '',
      isActive: coupon.isActive,
      categoryId: coupon.categoryId ? String(coupon.categoryId) : '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedValue = parseFloat(formData.value);
    const parsedMinOrder = parseFloat(formData.minOrderValue || '0');
    const parsedMaxDiscount = formData.maxDiscount ? parseFloat(formData.maxDiscount) : null;
    if (isNaN(parsedValue) || parsedValue <= 0) {
      toast({ title: "خطأ في البيانات", description: "يرجى إدخال قيمة خصم صحيحة", variant: "destructive" });
      return;
    }
    const submitData: any = {
      ...formData,
      value: String(parsedValue),
      minOrderValue: String(isNaN(parsedMinOrder) ? 0 : parsedMinOrder),
      maxDiscount: parsedMaxDiscount !== null ? String(parsedMaxDiscount) : null,
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
      perUserLimit: formData.perUserLimit ? parseInt(formData.perUserLimit) : 1,
      startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      categoryId: formData.categoryId || null,
    };
    couponMutation.mutate(submitData);
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "تم نسخ الكود" });
  };

  const isExpired = (coupon: any) => coupon.endDate && new Date(coupon.endDate) < new Date();
  const isNotStarted = (coupon: any) => coupon.startDate && new Date(coupon.startDate) > new Date();
  const isExhausted = (coupon: any) => coupon.usageLimit && coupon.usageCount >= coupon.usageLimit;

  const getCouponStatus = (coupon: any) => {
    if (!coupon.isActive) return { label: 'معطل', color: 'bg-gray-100 text-gray-600' };
    if (isExpired(coupon)) return { label: 'منتهي الصلاحية', color: 'bg-red-100 text-red-600' };
    if (isNotStarted(coupon)) return { label: 'لم يبدأ بعد', color: 'bg-yellow-100 text-yellow-600' };
    if (isExhausted(coupon)) return { label: 'مستنفد', color: 'bg-orange-100 text-orange-600' };
    return { label: 'نشط', color: 'bg-green-100 text-green-600' };
  };

  const filteredCoupons = coupons.filter(c =>
    c.code?.toLowerCase().includes(searchText.toLowerCase()) ||
    c.nameAr?.includes(searchText)
  );

  const activeCoupons = coupons.filter(c => c.isActive && !isExpired(c) && !isExhausted(c)).length;
  const totalUsage = coupons.reduce((sum: number, c: any) => sum + (c.usageCount || 0), 0);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ticket className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">إدارة الكوبونات</h1>
            <p className="text-muted-foreground">إنشاء وإدارة كوبونات الخصم للمتجر</p>
          </div>
        </div>
        <Button onClick={openAddDialog} className="gap-2">
          <Plus className="h-4 w-4" /> إضافة كوبون جديد
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><Check className="h-5 w-5 text-green-600" /></div>
            <div><div className="text-2xl font-bold">{activeCoupons}</div><div className="text-xs text-muted-foreground">كوبونات نشطة</div></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Ticket className="h-5 w-5 text-blue-600" /></div>
            <div><div className="text-2xl font-bold">{coupons.length}</div><div className="text-xs text-muted-foreground">إجمالي الكوبونات</div></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><Users className="h-5 w-5 text-purple-600" /></div>
            <div><div className="text-2xl font-bold">{totalUsage}</div><div className="text-xs text-muted-foreground">مرات الاستخدام</div></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg"><X className="h-5 w-5 text-red-600" /></div>
            <div><div className="text-2xl font-bold">{coupons.filter((c: any) => isExpired(c)).length}</div><div className="text-xs text-muted-foreground">منتهية الصلاحية</div></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Input
              placeholder="ابحث بالكود أو الاسم..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table dir="rtl">
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الكود</TableHead>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">الخصم</TableHead>
                <TableHead className="text-right">الاستخدام</TableHead>
                <TableHead className="text-right">الصلاحية</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    لا توجد كوبونات{searchText ? ' تطابق البحث' : ''}
                  </TableCell>
                </TableRow>
              ) : filteredCoupons.map((coupon: any) => {
                const status = getCouponStatus(coupon);
                return (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold bg-muted px-2 py-0.5 rounded text-sm">{coupon.code}</span>
                        <button onClick={() => copyCouponCode(coupon.code)} className="text-muted-foreground hover:text-foreground">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{coupon.nameAr || '-'}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 font-semibold">
                        {coupon.type === 'percentage' ? <Percent className="h-3.5 w-3.5 text-blue-500" /> : <DollarSign className="h-3.5 w-3.5 text-green-500" />}
                        {coupon.value}{coupon.type === 'percentage' ? '%' : ' ريال'}
                        {coupon.maxDiscount && <span className="text-xs text-muted-foreground">(حد أقصى {coupon.maxDiscount})</span>}
                      </span>
                      {coupon.minOrderValue > 0 && <div className="text-xs text-muted-foreground">حد أدنى: {coupon.minOrderValue} ريال</div>}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{coupon.usageCount || 0} {coupon.usageLimit ? `/ ${coupon.usageLimit}` : '∞'}</div>
                      <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: coupon.usageLimit ? `${Math.min(100, ((coupon.usageCount || 0) / coupon.usageLimit) * 100)}%` : '0%' }} />
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {coupon.startDate && <div>من: {format(new Date(coupon.startDate), 'dd/MM/yyyy')}</div>}
                      {coupon.endDate && <div>حتى: {format(new Date(coupon.endDate), 'dd/MM/yyyy')}</div>}
                      {!coupon.startDate && !coupon.endDate && <span>بدون تاريخ</span>}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${status.color} text-xs`}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={coupon.isActive}
                          onCheckedChange={v => toggleMutation.mutate({ id: coupon.id, isActive: v })}
                        />
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(coupon)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { if (confirm('هل أنت متأكد من حذف الكوبون؟')) deleteMutation.mutate(coupon.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
          dir="rtl"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={() => setIsDialogOpen(false)}
        >
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'تعديل الكوبون' : 'إضافة كوبون جديد'}</DialogTitle>
            <DialogDescription>أدخل تفاصيل الكوبون أدناه</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>كود الخصم *</Label>
                <Input
                  value={formData.code || ''}
                  onChange={e => setFormData((p: any) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  required
                  placeholder="مثلاً: TAMTOM20"
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label>اسم الكوبون *</Label>
                <Input
                  value={formData.nameAr || ''}
                  onChange={e => setFormData((p: any) => ({ ...p, nameAr: e.target.value }))}
                  required
                  placeholder="مثلاً: خصم رمضان"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>الوصف (اختياري)</Label>
              <Textarea
                value={formData.description || ''}
                onChange={e => setFormData((p: any) => ({ ...p, description: e.target.value }))}
                placeholder="وصف مختصر للكوبون..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>نوع الخصم *</Label>
                <Select value={formData.type || 'percentage'} onValueChange={v => setFormData((p: any) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                    <SelectItem value="fixed">مبلغ ثابت (ريال)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>قيمة الخصم *</Label>
                <Input
                  type="number"
                  value={formData.value || ''}
                  onChange={e => setFormData((p: any) => ({ ...p, value: e.target.value }))}
                  required
                  min="0"
                  max={formData.type === 'percentage' ? '100' : undefined}
                  placeholder={formData.type === 'percentage' ? '0-100' : '0'}
                />
              </div>
              {formData.type === 'percentage' && (
                <div className="space-y-2">
                  <Label>الحد الأقصى للخصم (ريال)</Label>
                  <Input
                    type="number"
                    value={formData.maxDiscount || ''}
                    onChange={e => setFormData((p: any) => ({ ...p, maxDiscount: e.target.value }))}
                    placeholder="بدون حد"
                    min="0"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>الحد الأدنى للطلب (ريال)</Label>
                <Input
                  type="number"
                  value={formData.minOrderValue || '0'}
                  onChange={e => setFormData((p: any) => ({ ...p, minOrderValue: e.target.value }))}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>حد الاستخدام الكلي</Label>
                <Input
                  type="number"
                  value={formData.usageLimit || ''}
                  onChange={e => setFormData((p: any) => ({ ...p, usageLimit: e.target.value }))}
                  placeholder="غير محدود"
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>حد لكل مستخدم</Label>
                <Input
                  type="number"
                  value={formData.perUserLimit || '1'}
                  onChange={e => setFormData((p: any) => ({ ...p, perUserLimit: e.target.value }))}
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاريخ البدء</Label>
                <Input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={e => setFormData((p: any) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>تاريخ الانتهاء</Label>
                <Input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={e => setFormData((p: any) => ({ ...p, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>يطبق على</Label>
                <Select value={formData.applicableFor || 'all'} onValueChange={v => setFormData((p: any) => ({ ...p, applicableFor: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع العملاء</SelectItem>
                    <SelectItem value="new_users">العملاء الجدد فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>تصنيف محدد (اختياري)</Label>
                <Select value={formData.categoryId || 'all'} onValueChange={v => setFormData((p: any) => ({ ...p, categoryId: v === 'all' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="جميع التصنيفات" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع التصنيفات</SelectItem>
                    {categories.map((cat: any) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.nameAr || cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Switch
                checked={formData.isActive ?? true}
                onCheckedChange={v => setFormData((p: any) => ({ ...p, isActive: v }))}
                id="couponActive"
              />
              <Label htmlFor="couponActive">الكوبون نشط</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={couponMutation.isPending}>
                {editingCoupon ? 'حفظ التغييرات' : 'إضافة الكوبون'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
