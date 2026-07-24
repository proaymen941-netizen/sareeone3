import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit, CreditCard, Building2, Wallet, Banknote, FileText, Eye, EyeOff, CheckCircle2, XCircle, ToggleLeft, ToggleRight, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const PAYMENT_PROVIDERS = [
  { value: 'mada', label: 'مدى', icon: '🏦', type: 'card', color: 'bg-green-100 text-green-800' },
  { value: 'stc_pay', label: 'STC Pay', icon: '📱', type: 'wallet', color: 'bg-purple-100 text-purple-800' },
  { value: 'apple_pay', label: 'Apple Pay', icon: '🍎', type: 'wallet', color: 'bg-gray-100 text-gray-800' },
  { value: 'visa', label: 'Visa', icon: '💳', type: 'card', color: 'bg-blue-100 text-blue-800' },
  { value: 'mastercard', label: 'Mastercard', icon: '💳', type: 'card', color: 'bg-red-100 text-red-800' },
  { value: 'cash', label: 'كاش عند الاستلام', icon: '💵', type: 'cash', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'bank_transfer', label: 'تحويل بنكي', icon: '🏛️', type: 'bank_transfer', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'tabby', label: 'Tabby (تقسيط)', icon: '📊', type: 'wallet', color: 'bg-teal-100 text-teal-800' },
  { value: 'tamara', label: 'Tamara (تقسيط)', icon: '📈', type: 'wallet', color: 'bg-orange-100 text-orange-800' },
];

const DOCUMENT_TYPES = [
  { value: 'iban', label: 'رقم الآيبان (IBAN)' },
  { value: 'account_number', label: 'رقم الحساب' },
  { value: 'bank_name', label: 'اسم البنك' },
  { value: 'merchant_id', label: 'رقم التاجر (Merchant ID)' },
  { value: 'api_key', label: 'مفتاح API' },
  { value: 'phone_number', label: 'رقم الهاتف' },
  { value: 'instructions', label: 'تعليمات الدفع' },
  { value: 'other', label: 'أخرى' },
];

export default function AdminPaymentMethods() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [isDocDialogOpen, setIsDocDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [docFormData, setDocFormData] = useState<any>({});

  const { data: paymentMethods = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/payment-methods'],
  });

  const methodMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingMethod) {
        return apiRequest('PUT', `/api/admin/payment-methods/${editingMethod.id}`, data);
      }
      return apiRequest('POST', '/api/admin/payment-methods', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-methods'] });
      setIsDialogOpen(false);
      setEditingMethod(null);
      setFormData({});
      toast({ title: editingMethod ? "تم تحديث طريقة الدفع" : "تمت إضافة طريقة الدفع بنجاح" });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/admin/payment-methods/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-methods'] });
      if (selectedMethod?.id === deleteMutation.variables) setSelectedMethod(null);
      toast({ title: "تم حذف طريقة الدفع" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: any) => apiRequest('PUT', `/api/admin/payment-methods/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-methods'] });
      toast({ title: "تم تحديث الحالة" });
    },
  });

  const docMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingDoc) {
        return apiRequest('PUT', `/api/admin/payment-methods/${selectedMethod.id}/documents/${editingDoc.id}`, data);
      }
      return apiRequest('POST', `/api/admin/payment-methods/${selectedMethod.id}/documents`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-methods'] });
      setIsDocDialogOpen(false);
      setEditingDoc(null);
      setDocFormData({});
      toast({ title: editingDoc ? "تم تحديث الوثيقة" : "تمت إضافة الوثيقة بنجاح" });
    },
    onError: () => toast({ title: "حدث خطأ في إضافة الوثيقة", variant: "destructive" }),
  });

  const deleteDocMutation = useMutation({
    mutationFn: async ({ methodId, docId }: any) => apiRequest('DELETE', `/api/admin/payment-methods/${methodId}/documents/${docId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-methods'] });
      toast({ title: "تم حذف الوثيقة" });
    },
  });

  const openEditDialog = (method?: any) => {
    setEditingMethod(method || null);
    const provider = method ? PAYMENT_PROVIDERS.find(p => p.value === method.provider) : null;
    setFormData(method ? {
      name: method.name,
      nameAr: method.nameAr,
      type: method.type,
      provider: method.provider,
      description: method.description || '',
      isActive: method.isActive,
      isOnline: method.isOnline,
      requiresDocument: method.requiresDocument,
      sortOrder: method.sortOrder || 0,
    } : {
      isActive: true,
      isOnline: true,
      requiresDocument: false,
      sortOrder: (paymentMethods?.length || 0),
    });
    setIsDialogOpen(true);
  };

  const handleProviderChange = (providerValue: string) => {
    const provider = PAYMENT_PROVIDERS.find(p => p.value === providerValue);
    if (provider) {
      setFormData((prev: any) => ({
        ...prev,
        provider: providerValue,
        name: provider.label,
        nameAr: provider.label,
        type: provider.type,
        isOnline: provider.type !== 'cash',
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    methodMutation.mutate(formData);
  };

  const handleDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    docMutation.mutate(docFormData);
  };

  const openDocDialog = (doc?: any) => {
    setEditingDoc(doc || null);
    setDocFormData(doc ? { documentType: doc.documentType, label: doc.label, value: doc.value, isVisible: doc.isVisible } : { isVisible: true });
    setIsDocDialogOpen(true);
  };

  const getProviderInfo = (provider: string) => PAYMENT_PROVIDERS.find(p => p.value === provider);

  const activeCount = paymentMethods.filter(m => m.isActive).length;
  const selectedMethodData = paymentMethods.find(m => m.id === selectedMethod?.id);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">إدارة طرق الدفع</h1>
            <p className="text-muted-foreground">تحكم في طرق الدفع المتاحة للعملاء وبياناتها</p>
          </div>
        </div>
        <Button onClick={() => openEditDialog()} className="gap-2">
          <Plus className="h-4 w-4" /> إضافة طريقة دفع
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
            <div>
              <div className="text-2xl font-bold">{activeCount}</div>
              <div className="text-sm text-muted-foreground">طرق الدفع النشطة</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><CreditCard className="h-5 w-5 text-blue-600" /></div>
            <div>
              <div className="text-2xl font-bold">{paymentMethods.length}</div>
              <div className="text-sm text-muted-foreground">إجمالي طرق الدفع</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg"><FileText className="h-5 w-5 text-orange-600" /></div>
            <div>
              <div className="text-2xl font-bold">{paymentMethods.reduce((sum: number, m: any) => sum + (m.documents?.length || 0), 0)}</div>
              <div className="text-sm text-muted-foreground">الوثائق المضافة</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>قائمة طرق الدفع</CardTitle>
            <CardDescription>اضغط على طريقة دفع لإدارة وثائقها</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {paymentMethods.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد طرق دفع بعد</p>
                <p className="text-sm">أضف طريقة دفع أولاً</p>
              </div>
            ) : (
              <div className="divide-y">
                {paymentMethods.map((method: any) => {
                  const providerInfo = getProviderInfo(method.provider);
                  return (
                    <div
                      key={method.id}
                      className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors ${selectedMethod?.id === method.id ? 'bg-primary/5 border-r-2 border-primary' : ''}`}
                      onClick={() => setSelectedMethod(method)}
                    >
                      <span className="text-2xl">{providerInfo?.icon || '💳'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{method.nameAr}</span>
                          <Badge variant="outline" className={`text-xs ${providerInfo?.color || ''}`}>
                            {method.type === 'card' ? 'بطاقة' : method.type === 'wallet' ? 'محفظة' : method.type === 'cash' ? 'كاش' : 'تحويل'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>{method.documents?.length || 0} وثائق</span>
                          {method.isOnline && <span className="text-blue-500">● دفع إلكتروني</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ id: method.id, isActive: !method.isActive }); }}
                          className={`transition-colors ${method.isActive ? 'text-green-500' : 'text-gray-300'}`}
                        >
                          {method.isActive ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        </button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditDialog(method); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={(e) => { e.stopPropagation(); if (confirm('هل أنت متأكد من حذف طريقة الدفع؟')) deleteMutation.mutate(method.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedMethodData ? (
                    <span className="flex items-center gap-2">
                      <span>{getProviderInfo(selectedMethodData.provider)?.icon}</span>
                      {selectedMethodData.nameAr}
                    </span>
                  ) : 'تفاصيل طريقة الدفع'}
                </CardTitle>
                <CardDescription>
                  {selectedMethodData ? 'الوثائق والبيانات المرتبطة' : 'اختر طريقة دفع لعرض تفاصيلها'}
                </CardDescription>
              </div>
              {selectedMethodData && (
                <Button size="sm" className="gap-2" onClick={() => openDocDialog()}>
                  <Plus className="h-4 w-4" /> إضافة وثيقة
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedMethodData ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>اختر طريقة دفع من القائمة</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg text-sm">
                  <div><span className="font-medium">الحالة: </span><span className={selectedMethodData.isActive ? 'text-green-600' : 'text-red-600'}>{selectedMethodData.isActive ? 'نشط' : 'غير نشط'}</span></div>
                  <div><span className="font-medium">النوع: </span>{selectedMethodData.isOnline ? 'إلكتروني' : 'يدوي'}</div>
                  {selectedMethodData.description && <div className="col-span-2"><span className="font-medium">الوصف: </span>{selectedMethodData.description}</div>}
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">الوثائق والبيانات البنكية</h4>
                  {selectedMethodData.documents?.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg border-dashed">
                      لا توجد وثائق مضافة - أضف رقم IBAN أو بيانات الحساب البنكي
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedMethodData.documents?.map((doc: any) => (
                        <div key={doc.id} className="flex items-start gap-3 p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="text-xs font-medium text-muted-foreground">{DOCUMENT_TYPES.find(d => d.value === doc.documentType)?.label || doc.documentType}</div>
                            <div className="font-medium text-sm">{doc.label}</div>
                            <div className={`text-sm mt-0.5 ${doc.isVisible ? '' : 'blur-sm'}`}>{doc.value}</div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button variant="ghost" size="sm" onClick={() => openDocDialog(doc)}><Edit className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if (confirm('حذف الوثيقة؟')) deleteDocMutation.mutate({ methodId: selectedMethodData.id, docId: doc.id }); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[520px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingMethod ? 'تعديل طريقة الدفع' : 'إضافة طريقة دفع جديدة'}</DialogTitle>
            <DialogDescription>أدخل تفاصيل طريقة الدفع</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>مزود خدمة الدفع</Label>
              <Select value={formData.provider || ''} onValueChange={handleProviderChange}>
                <SelectTrigger><SelectValue placeholder="اختر مزود الخدمة" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_PROVIDERS.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">{p.icon} {p.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الاسم بالعربي</Label>
                <Input value={formData.nameAr || ''} onChange={e => setFormData((p: any) => ({ ...p, nameAr: e.target.value }))} required placeholder="مثلاً: مدى" />
              </div>
              <div className="space-y-2">
                <Label>الاسم بالإنجليزي</Label>
                <Input value={formData.name || ''} onChange={e => setFormData((p: any) => ({ ...p, name: e.target.value }))} required placeholder="e.g. Mada" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>الوصف (اختياري)</Label>
              <Textarea value={formData.description || ''} onChange={e => setFormData((p: any) => ({ ...p, description: e.target.value }))} placeholder="وصف مختصر لطريقة الدفع..." rows={2} />
            </div>

            <div className="space-y-2">
              <Label>الترتيب</Label>
              <Input type="number" value={formData.sortOrder || 0} onChange={e => setFormData((p: any) => ({ ...p, sortOrder: parseInt(e.target.value) }))} min={0} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={formData.isActive ?? true} onCheckedChange={v => setFormData((p: any) => ({ ...p, isActive: v }))} id="isActive" />
                <Label htmlFor="isActive">نشط</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.isOnline ?? true} onCheckedChange={v => setFormData((p: any) => ({ ...p, isOnline: v }))} id="isOnline" />
                <Label htmlFor="isOnline">إلكتروني</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.requiresDocument ?? false} onCheckedChange={v => setFormData((p: any) => ({ ...p, requiresDocument: v }))} id="reqDoc" />
                <Label htmlFor="reqDoc">يتطلب وثيقة</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={methodMutation.isPending || !formData.provider}>
                {editingMethod ? 'حفظ التغييرات' : 'إضافة طريقة الدفع'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDocDialogOpen} onOpenChange={setIsDocDialogOpen}>
        <DialogContent className="sm:max-w-[480px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingDoc ? 'تعديل الوثيقة' : 'إضافة وثيقة / بيانات'}</DialogTitle>
            <DialogDescription>أضف بيانات الحساب البنكي أو أي وثيقة متعلقة بطريقة الدفع</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDocSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>نوع الوثيقة</Label>
              <Select value={docFormData.documentType || ''} onValueChange={v => setDocFormData((p: any) => ({ ...p, documentType: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر نوع الوثيقة" /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>التسمية / العنوان</Label>
              <Input value={docFormData.label || ''} onChange={e => setDocFormData((p: any) => ({ ...p, label: e.target.value }))} required placeholder="مثلاً: رقم الآيبان، رقم الحساب..." />
            </div>
            <div className="space-y-2">
              <Label>القيمة</Label>
              <Textarea value={docFormData.value || ''} onChange={e => setDocFormData((p: any) => ({ ...p, value: e.target.value }))} required placeholder="أدخل القيمة أو رقم الحساب..." rows={3} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={docFormData.isVisible ?? true} onCheckedChange={v => setDocFormData((p: any) => ({ ...p, isVisible: v }))} id="docVisible" />
              <Label htmlFor="docVisible">مرئي للعملاء</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDocDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={docMutation.isPending || !docFormData.documentType || !docFormData.label || !docFormData.value}>
                {editingDoc ? 'حفظ التغييرات' : 'إضافة الوثيقة'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
