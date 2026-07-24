import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, UserPlus, UserCog, Calendar, Clock, 
  Edit, Trash2, Eye, CheckCircle, XCircle, 
  History, ShieldCheck, Banknote as BanknoteIcon,
  Briefcase as BriefcaseIcon, FileText as FileTextIcon,
  Phone as PhoneIcon, Mail as MailIcon, MapPin as MapPinIcon,
  Shield, Key, Lock, EyeOff,
  Truck, TrendingUp, DollarSign, Link, BarChart3, ArrowLeft,
  Download, Printer, Receipt, Wrench, Plus
} from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: 'admin' | 'manager' | 'support' | 'accountant' | 'hr' | 'developer' | 'marketing' | 'sales' | 'operations' | 'logistics';
  department: string;
  branch: string;
  salary: number;
  hireDate: string;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  permissions: string[];
  attendanceRate: number;
  performanceScore: number;
  lastActive: string;
  address: string;
  emergencyContact: string;
  documents: string[];
}

interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  checkIn: string;
  checkOut: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'early_leave' | 'on_leave';
  hoursWorked: number;
  notes: string;
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'annual' | 'sick' | 'emergency' | 'unpaid';
  startDate: string;
  endDate: string;
  duration: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  submittedAt: string;
}

// مكوّن إدارة المشرفين الفرعيين
function SubAdminsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', username: '', password: '',
    permissions: [] as string[], isActive: true
  });

  const allPermissions = [
    { key: 'manage_orders', label: 'إدارة الطلبات' },
    { key: 'manage_drivers', label: 'إدارة السائقين' },
    { key: 'manage_menu', label: 'إدارة المنتجات' },
    { key: 'manage_categories', label: 'إدارة التصنيفات' },
    { key: 'manage_customers', label: 'إدارة المستخدمين' },
    { key: 'manage_coupons', label: 'إدارة الكوبونات' },
    { key: 'manage_settings', label: 'إدارة الإعدادات' },
    { key: 'view_reports', label: 'عرض التقارير' },
  ];

  const { data: subAdmins, isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/sub-admins'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const response = await apiRequest('POST', '/api/admin/sub-admins', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sub-admins'] });
      toast({ title: 'تم إضافة المشرف بنجاح' });
      setShowDialog(false);
      resetForm();
    },
    onError: (err: any) => toast({ title: 'خطأ', description: err.message || 'فشل في إضافة المشرف', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/admin/sub-admins/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sub-admins'] });
      toast({ title: 'تم تحديث المشرف بنجاح' });
      setShowDialog(false);
      resetForm();
    },
    onError: (err: any) => toast({ title: 'خطأ', description: err.message || 'فشل في التحديث', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/sub-admins/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sub-admins'] });
      toast({ title: 'تم حذف المشرف' });
    },
    onError: () => toast({ title: 'خطأ في الحذف', variant: 'destructive' }),
  });

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', username: '', password: '', permissions: [], isActive: true });
    setEditingSubAdmin(null);
    setShowPassword(false);
  };

  const openEdit = (sub: any) => {
    setEditingSubAdmin(sub);
    const perms = typeof sub.permissions === 'string' ? JSON.parse(sub.permissions || '[]') : (sub.permissions || []);
    setForm({ name: sub.name, phone: sub.phone || '', email: sub.email || '', username: sub.username || '', password: '', permissions: perms, isActive: sub.isActive });
    setShowDialog(true);
  };

  const togglePermission = (key: string) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(p => p !== key)
        : [...prev.permissions, key]
    }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return toast({ title: 'الاسم مطلوب', variant: 'destructive' });
    if (!form.phone.trim()) return toast({ title: 'رقم الهاتف مطلوب', variant: 'destructive' });
    if (!editingSubAdmin && !form.password) return toast({ title: 'كلمة المرور مطلوبة', variant: 'destructive' });
    if (editingSubAdmin) {
      const data: any = { name: form.name, phone: form.phone, email: form.email, username: form.username, permissions: form.permissions, isActive: form.isActive };
      if (form.password) data.password = form.password;
      updateMutation.mutate({ id: editingSubAdmin.id, data });
    } else {
      createMutation.mutate(form);
    }
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">جاري التحميل...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />إدارة المشرفين الفرعيين</CardTitle>
            <CardDescription>منح صلاحيات لوحة التحكم لأعضاء الفريق</CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setShowDialog(true); }} className="gap-2">
            <UserPlus className="w-4 h-4" />
            إضافة مشرف
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!subAdmins || subAdmins.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>لا يوجد مشرفون فرعيون حتى الآن</p>
            <p className="text-sm">أضف مشرفين لمنحهم صلاحيات محددة في لوحة التحكم</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>الصلاحيات</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subAdmins.map((sub: any) => {
                const perms = typeof sub.permissions === 'string' ? JSON.parse(sub.permissions || '[]') : (sub.permissions || []);
                return (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="font-medium">{sub.name}</div>
                      {sub.email && <div className="text-xs text-muted-foreground">{sub.email}</div>}
                    </TableCell>
                    <TableCell>{sub.phone}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {perms.length === 0 ? (
                          <span className="text-xs text-muted-foreground">لا صلاحيات</span>
                        ) : perms.slice(0, 3).map((p: string) => (
                          <Badge key={p} variant="secondary" className="text-xs">
                            {allPermissions.find(ap => ap.key === p)?.label || p}
                          </Badge>
                        ))}
                        {perms.length > 3 && <Badge variant="outline" className="text-xs">+{perms.length - 3}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sub.isActive ? 'default' : 'secondary'}>
                        {sub.isActive ? 'نشط' : 'معطل'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(sub)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف المشرف</AlertDialogTitle>
                              <AlertDialogDescription>هل أنت متأكد من حذف "{sub.name}"؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate(sub.id)}>
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg rtl">
          <DialogHeader>
            <DialogTitle>{editingSubAdmin ? 'تعديل المشرف' : 'إضافة مشرف جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>الاسم <span className="text-red-500">*</span></Label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="اسم المشرف" />
              </div>
              <div className="space-y-1.5">
                <Label>رقم الهاتف <span className="text-red-500">*</span></Label>
                <Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="967xxxxxxxx" />
              </div>
              <div className="space-y-1.5">
                <Label>البريد الإلكتروني</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} placeholder="اختياري" />
              </div>
              <div className="space-y-1.5">
                <Label>كلمة المرور {!editingSubAdmin && <span className="text-red-500">*</span>}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder={editingSubAdmin ? "اتركها فارغة للإبقاء" : "كلمة مرور قوية"}
                    className="pl-9"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Key className="w-4 h-4" />الصلاحيات</Label>
              <div className="grid grid-cols-2 gap-2 border rounded-lg p-3">
                {allPermissions.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`perm-${key}`}
                      checked={form.permissions.includes(key)}
                      onChange={() => togglePermission(key)}
                      className="rounded"
                    />
                    <label htmlFor={`perm-${key}`} className="text-sm cursor-pointer">{label}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sub-admin-active"
                checked={form.isActive}
                onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="sub-admin-active" className="text-sm cursor-pointer">الحساب نشط</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? 'جاري الحفظ...' : (editingSubAdmin ? 'حفظ التغييرات' : 'إضافة المشرف')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── مكوّن كشف الرواتب المخصص (PayrollTable) ───
function PayrollTable({ employees, uiSettings }: { employees?: Employee[]; uiSettings?: any[] }) {
  const { toast } = useToast();
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  const [payForm, setPayForm] = useState({
    bonus: 0,
    deduction: 0,
    advances: 0,
    notes: '',
    paymentMethod: 'cash',
    proofImage: '',
  });

  const [advanceForm, setAdvanceForm] = useState({
    amount: 0,
    reason: '',
    date: new Date().toISOString().split('T')[0],
  });

  const getSetting = (key: string, fb = '') => uiSettings?.find((s: any) => s.key === key)?.value || fb;
  const companyLogo = getSetting('invoice_company_logo') || getSetting('header_logo_url') || getSetting('sidebar_logo_url');
  const companyName = getSetting('invoice_company_name', 'السريع ون');
  const primaryColor = getSetting('invoice_primary_color', '#3b82f6');
  const headerText = getSetting('invoice_header_text', 'كشف حساب ومستند صرف رواتب');
  const companyAddress = getSetting('invoice_company_address', '');
  const companyPhone = getSetting('invoice_company_phone', '');
  const stampText = getSetting('invoice_stamp_text', 'ختم وتوقيع المحاسب المختص');
  const signatureText = getSetting('invoice_signature_text', 'توقيع الموظف المستلم');
  const footerText = getSetting('invoice_footer_text', 'شكراً لجهودكم وتفانيكم في العمل');

  const handlePaySubmit = () => {
    if (!selectedEmp) return;
    const netAmount = (selectedEmp.salary || 0) + Number(payForm.bonus) - Number(payForm.deduction) - Number(payForm.advances);
    toast({
      title: 'تم توثيق وصرف الراتب بنجاح',
      description: `تم تسجيل صرف راتب الموظف ${selectedEmp.name} بمبلغ ${formatCurrency(netAmount)}`,
    });
    setShowPayModal(false);
  };

  const handleAdvanceSubmit = () => {
    if (!selectedEmp || !advanceForm.amount) return;
    toast({
      title: 'تم تسجيل السلفة',
      description: `تم قيد سلفة للموظف ${selectedEmp.name} بمبلغ ${formatCurrency(advanceForm.amount)}`,
    });
    setShowAdvanceModal(false);
  };

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="bg-gray-50/60 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BanknoteIcon className="w-5 h-5 text-green-600" />
              جدول ومسيرات رواتب الموظفين
            </CardTitle>
            <CardDescription className="text-xs">
              الرواتب الأساسية، البدلات والمكافآت، الخصومات والسلف، وطباعة سندات الصرف
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="text-right text-xs">الموظف</TableHead>
              <TableHead className="text-right text-xs">المنصب / القسم</TableHead>
              <TableHead className="text-right text-xs">الراتب الأساسي</TableHead>
              <TableHead className="text-right text-xs">البدلات</TableHead>
              <TableHead className="text-right text-xs">الخصومات والسُلف</TableHead>
              <TableHead className="text-right text-xs font-bold text-gray-900">صافي المستحق</TableHead>
              <TableHead className="text-right text-xs">حالة الصرف</TableHead>
              <TableHead className="text-center text-xs">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!employees || employees.length === 0) ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                  لا يوجد موظفون مسجلون حالياً
                </TableCell>
              </TableRow>
            ) : (
              employees.map((emp) => {
                const baseSalary = emp.salary || 0;
                const bonus = 0;
                const deduction = 0;
                const netSalary = baseSalary + bonus - deduction;

                return (
                  <TableRow key={emp.id} className="hover:bg-gray-50/60">
                    <TableCell className="py-3">
                      <div className="font-bold text-xs text-gray-900">{emp.name}</div>
                      <div className="text-[10px] text-gray-400">{emp.phone || emp.email}</div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline" className="text-[10px]">
                        {emp.department || 'عام'}
                      </Badge>
                      <div className="text-[10px] text-gray-500 mt-0.5">{emp.position}</div>
                    </TableCell>
                    <TableCell className="py-3 font-semibold text-xs text-gray-800">
                      {formatCurrency(baseSalary)}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-green-600 font-medium">
                      +{formatCurrency(bonus)}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-red-600 font-medium">
                      -{formatCurrency(deduction)}
                    </TableCell>
                    <TableCell className="py-3 font-black text-xs text-blue-700 bg-blue-50/60 rounded px-2">
                      {formatCurrency(netSalary)}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                        جاهز للصرف
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] bg-green-50 text-green-700 hover:bg-green-100 border-green-200 gap-1 font-semibold"
                          onClick={() => {
                            setSelectedEmp(emp);
                            setPayForm({ bonus: 0, deduction: 0, advances: 0, notes: '', paymentMethod: 'cash', proofImage: '' });
                            setShowPayModal(true);
                          }}
                        >
                          <BanknoteIcon className="w-3.5 h-3.5" />
                          صرف
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] border-orange-200 text-orange-700 hover:bg-orange-50 gap-1 font-semibold"
                          onClick={() => {
                            setSelectedEmp(emp);
                            setAdvanceForm({ amount: 0, reason: '', date: new Date().toISOString().split('T')[0] });
                            setShowAdvanceModal(true);
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          سلفة
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-gray-600 hover:bg-gray-100"
                          onClick={() => {
                            setSelectedEmp(emp);
                            setShowVoucherModal(true);
                          }}
                          title="طباعة سند راتب"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Modal: Pay Salary */}
        <Dialog open={showPayModal} onOpenChange={setShowPayModal}>
          <DialogContent className="max-w-md rtl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
                <BanknoteIcon className="w-5 h-5 text-green-600" />
                صرف وتوثيق راتب: {selectedEmp?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">الراتب الأساسي:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(selectedEmp?.salary || 0)}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>المكافآت والبدلات (+):</span>
                  <span>{formatCurrency(payForm.bonus)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>الخصومات والسلف (-):</span>
                  <span>{formatCurrency(Number(payForm.deduction) + Number(payForm.advances))}</span>
                </div>
                <div className="pt-2 border-t border-blue-200 flex justify-between font-black text-sm text-blue-900">
                  <span>إجمالي صافي الراتب:</span>
                  <span>{formatCurrency((selectedEmp?.salary || 0) + Number(payForm.bonus) - Number(payForm.deduction) - Number(payForm.advances))}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">مكافآت وبدلات إضافية</Label>
                  <Input
                    type="number"
                    value={payForm.bonus}
                    onChange={(e) => setPayForm({ ...payForm, bonus: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">خصومات واستقطاعات</Label>
                  <Input
                    type="number"
                    value={payForm.deduction}
                    onChange={(e) => setPayForm({ ...payForm, deduction: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">طريقة الدفع والصرف</Label>
                <Select value={payForm.paymentMethod} onValueChange={(v) => setPayForm({ ...payForm, paymentMethod: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقداً (كاش)</SelectItem>
                    <SelectItem value="bank_transfer">تحويل بنكي / محفظة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">بيان أو ملاحظات الصرف</Label>
                <Textarea
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  placeholder="ملاحظات حول راتب الشهر..."
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1 pt-1">
                <ImageUpload
                  label="إرفاق صورة إيصال الصرف (رفع من جهازك)"
                  value={payForm.proofImage}
                  onChange={(url) => setPayForm({ ...payForm, proofImage: url })}
                  bucket="payroll-receipts"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowPayModal(false)}>إلغاء</Button>
              <Button size="sm" onClick={handlePaySubmit} className="bg-green-600 hover:bg-green-700 text-white font-bold">
                تأكيد وصرف الراتب
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Advance */}
        <Dialog open={showAdvanceModal} onOpenChange={setShowAdvanceModal}>
          <DialogContent className="max-w-md rtl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">تسجيل سلفة للموظف: {selectedEmp?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">مبلغ السلفة (ريال)</Label>
                <Input
                  type="number"
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">سبب السلفة</Label>
                <Textarea
                  value={advanceForm.reason}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                  placeholder="أسباب طلب السلفة..."
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setShowAdvanceModal(false)}>إلغاء</Button>
              <Button size="sm" onClick={handleAdvanceSubmit} className="bg-orange-500 hover:bg-orange-600 text-white font-bold">
                تسجيل السلفة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Print Voucher */}
        <Dialog open={showVoucherModal} onOpenChange={setShowVoucherModal}>
          <DialogContent className="max-w-xl rtl p-0 overflow-hidden" dir="rtl">
            <div className="bg-white space-y-4">
              <div 
                className="p-4 text-white flex items-center justify-between"
                style={{ backgroundColor: primaryColor }}
              >
                <div>
                  <h2 className="text-xl font-black">{companyName}</h2>
                  <p className="text-xs opacity-90">{headerText}</p>
                  <p className="text-[11px] opacity-80 mt-1">تاريخ الإصدار: {new Date().toLocaleDateString('ar-YE')}</p>
                </div>
                {companyLogo && (
                  <img src={companyLogo} alt="Logo" className="h-14 w-14 object-contain bg-white/90 rounded-lg p-1 shadow-sm" />
                )}
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <span className="text-gray-500">اسم الموظف:</span>
                    <p className="font-bold text-gray-900 text-sm">{selectedEmp?.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">القسم والفرع:</span>
                    <p className="font-bold text-gray-900">{selectedEmp?.department || 'الإدارة'} - {selectedEmp?.branch || 'الفرع الرئيسي'}</p>
                  </div>
                  {companyPhone && (
                    <div>
                      <span className="text-gray-500">هاتف الشركة:</span>
                      <p className="font-semibold text-gray-700">{companyPhone}</p>
                    </div>
                  )}
                  {companyAddress && (
                    <div>
                      <span className="text-gray-500">العنوان:</span>
                      <p className="font-semibold text-gray-700">{companyAddress}</p>
                    </div>
                  )}
                </div>

                <div className="border rounded-lg overflow-hidden mt-2">
                  <Table>
                    <TableHeader className="bg-gray-100">
                      <TableRow>
                        <TableHead className="text-right text-xs font-bold">البند / البيان</TableHead>
                        <TableHead className="text-left text-xs font-bold">المبلغ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-xs">الراتب الأساسي الشهر الحالي</TableCell>
                        <TableCell className="text-xs text-left font-bold">{formatCurrency(selectedEmp?.salary || 0)}</TableCell>
                      </TableRow>
                      <TableRow className="bg-blue-50 font-black">
                        <TableCell className="text-xs text-blue-900">صافي المستحق المدفوع للموظف</TableCell>
                        <TableCell className="text-xs text-left text-blue-900 text-sm">{formatCurrency(selectedEmp?.salary || 0)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {footerText && (
                  <div className="p-2.5 bg-gray-50 rounded border text-[11px] text-gray-600 text-center">
                    {footerText}
                  </div>
                )}

                <div className="pt-6 grid grid-cols-2 text-center text-xs font-bold text-gray-700 border-t mt-4">
                  <div>
                    <p>{signatureText || 'توقيع الموظف المستلم'}</p>
                    <div className="h-10 mt-2 border-b border-dashed w-36 mx-auto"></div>
                  </div>
                  <div>
                    <p>{stampText || 'ختم وتوقيع المحاسب المختص'}</p>
                    <div className="h-10 mt-2 border-b border-dashed w-36 mx-auto"></div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => setShowVoucherModal(false)}>إلغاء</Button>
                  <Button size="sm" onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white gap-1 font-bold">
                    <Printer className="w-3.5 h-3.5" /> طباعة السند
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ─── مكوّن إدارة الخرجيات والمصروفات الإدارية ───
function ExpensesPanel({ uiSettings }: { uiSettings?: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    category: 'maintenance',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    recipient: '',
    notes: '',
    documents: [] as string[],
  });

  const { data: expenses = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/expenses'],
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload = {
        ...data,
        amount: parseFloat(data.amount) || 0,
      };
      const res = await apiRequest('POST', '/api/admin/expenses', payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/financial-reports'] });
      toast({ title: 'تم تسجيل الخرجية بنجاح وخصمها آلياً من أرباح التطبيق' });
      setShowAddDialog(false);
      setForm({ title: '', category: 'maintenance', amount: '', expenseDate: new Date().toISOString().split('T')[0], recipient: '', notes: '', documents: [] });
    },
    onError: (err: any) => toast({ title: 'خطأ في الحفظ', description: err.message || 'فشل إضافة المصروف', variant: 'destructive' }),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/admin/expenses/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/financial-reports'] });
      toast({ title: 'تم حذف بند الخرجيات بنجاح' });
    },
    onError: () => toast({ title: 'فشل الحذف', variant: 'destructive' }),
  });

  const totalExpensesAmount = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const maintenanceAmount = expenses.filter(e => e.category === 'maintenance').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const operationalAmount = expenses.filter(e => e.category === 'operational' || e.category === 'fuel').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  const categoryLabels: Record<string, string> = {
    maintenance: 'صيانة وإصلاحات',
    operational: 'مصروفات تشغيلية',
    fuel: 'وقود ومحروقات',
    equipment: 'أدوات ومستلزمات',
    utilities: 'فواتير ورسوم',
    other: 'مصروفات أخرى',
  };

  return (
    <div className="space-y-6">
      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-red-100 bg-red-50/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">إجمالي الخرجيات والمصروفات</p>
              <p className="text-xl font-black text-red-600 mt-1">{formatCurrency(totalExpensesAmount)}</p>
              <p className="text-[10px] text-red-500 mt-0.5">خصم آلي دقيق من أرباح التطبيق</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl text-red-600">
              <Receipt className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-100 bg-orange-50/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">إصلاحات وصيانة</p>
              <p className="text-xl font-black text-orange-600 mt-1">{formatCurrency(maintenanceAmount)}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">صيانة سيارات، دراجات، وسيرفرات</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl text-orange-600">
              <Wrench className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-100 bg-blue-50/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">مصروفات تشغيلية ووقود</p>
              <p className="text-xl font-black text-blue-600 mt-1">{formatCurrency(operationalAmount)}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">وقود، طباعة، رسوم</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
              <Truck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-purple-50/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">سندات المخرجات المسجلة</p>
              <p className="text-xl font-black text-purple-600 mt-1">{expenses.length} سند</p>
              <p className="text-[10px] text-gray-500 mt-0.5">مؤطرة بالصور والمستندات</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl text-purple-600">
              <FileTextIcon className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* جدول الخرجيات */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="bg-gray-50/60 pb-3 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-600" />
                سجل الخرجيات والمصروفات الإدارية والتشغيلية
              </CardTitle>
              <CardDescription className="text-xs">
                إخراج وتوثيق مبالغ الصيانة والمشتريات وإرفاق الأوراق والصور لخصمها آلياً ودقيقاً من أرباح التطبيق
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-red-600 hover:bg-red-700 text-white gap-2 text-xs font-bold shrink-0"
            >
              <Plus className="w-4 h-4" />
              تسجيل خروج مبلغ / مصروف جديد
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="text-right text-xs">السبب / البيان</TableHead>
                <TableHead className="text-right text-xs">التصنيف</TableHead>
                <TableHead className="text-right text-xs font-bold text-gray-900">المبلغ</TableHead>
                <TableHead className="text-right text-xs">تاريخ الصرف</TableHead>
                <TableHead className="text-right text-xs">الجهة / المستلم</TableHead>
                <TableHead className="text-center text-xs">الأوراق والمستندات المرفقة</TableHead>
                <TableHead className="text-center text-xs">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">جاري تحميل البيانات...</TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                    لا توجد مصروفات أو خرجيات مسجلة حالياً
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50/60">
                    <TableCell className="py-3">
                      <div className="font-bold text-xs text-gray-900">{item.title}</div>
                      {item.notes && <div className="text-[10px] text-gray-500 mt-0.5">{item.notes}</div>}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline" className="text-[10px] font-medium bg-gray-50">
                        {categoryLabels[item.category] || item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 font-black text-xs text-red-600">
                      -{formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-gray-600">
                      {item.expenseDate ? new Date(item.expenseDate).toLocaleDateString('ar-YE') : '-'}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-gray-700">
                      {item.recipient || '-'}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      {item.documents && item.documents.length > 0 ? (
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {item.documents.map((docUrl: string, idx: number) => (
                            <img
                              key={idx}
                              src={docUrl}
                              alt="مستند"
                              className="h-9 w-9 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setSelectedImageModal(docUrl)}
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400">بدون صور مرفقة</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (confirm('هل أنت متأكد من حذف بند الخرجيات هذا؟')) {
                            deleteExpenseMutation.mutate(item.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog: إضافة خرجية جديدة */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md rtl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Receipt className="w-5 h-5 text-red-600" />
              تسجيل خروج مبلغ / مصروفات جديدة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">سبب الصرف / البيان *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="مثال: إصلاح دراجة، شراء أدوات مكتبية، صيانة سيرفر..."
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">المبلغ الخارِج (ريال) *</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="h-8 text-xs font-bold text-red-600"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">التصنيف</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">صيانة وإصلاحات</SelectItem>
                    <SelectItem value="operational">مصروفات تشغيلية</SelectItem>
                    <SelectItem value="fuel">وقود ومحروقات</SelectItem>
                    <SelectItem value="equipment">أدوات ومستلزمات</SelectItem>
                    <SelectItem value="utilities">فواتير ورسوم</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">تاريخ الصرف</Label>
                <Input
                  type="date"
                  value={form.expenseDate}
                  onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">الجهة / المستلِم</Label>
                <Input
                  value={form.recipient}
                  onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                  placeholder="اسم المستلم أو المحل"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">ملاحظات تفصيلية</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="تفاصيل الإخراج أو سبب الصرف..."
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="space-y-1 pt-1">
              <ImageUpload
                label="إدراج وتصوير إيصال/فاتورة الإخراج (اختياري - رفع مباشر من جهازك)"
                value={form.documents[0] || ''}
                onChange={(url) => setForm({ ...form, documents: url ? [url] : [] })}
                bucket="expense-receipts"
                required={false}
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(false)}>إلغاء</Button>
            <Button
              size="sm"
              onClick={() => {
                if (!form.title.trim() || !form.amount) {
                  return toast({ title: 'يرجى إدخال السبب والمبلغ', variant: 'destructive' });
                }
                addExpenseMutation.mutate(form);
              }}
              disabled={addExpenseMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {addExpenseMutation.isPending ? 'جاري الحفظ...' : 'تأكيد وخصم المبلغ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog open={!!selectedImageModal} onOpenChange={() => setSelectedImageModal(null)}>
        <DialogContent className="max-w-lg p-3 text-center dir-rtl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">صورة الفاتورة / المستند المرفق</DialogTitle>
          </DialogHeader>
          {selectedImageModal && (
            <img src={selectedImageModal} alt="مستند مرفق" className="max-h-[80vh] w-auto mx-auto rounded-lg object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminHRManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: uiSettings = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/ui-settings'],
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('employees');
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    email: '',
    phone: '',
    position: 'admin' as Employee['position'],
    department: 'management',
    branch: 'الفرع الرئيسي',
    salary: '',
    hireDate: new Date(),
    address: '',
    emergencyContact: '',
    permissions: ['view_dashboard', 'manage_orders']
  });

  const [attendanceForm, setAttendanceForm] = useState({
    employeeId: '',
    status: 'present' as Attendance['status'],
    notes: '',
    date: new Date()
  });

  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    type: 'annual' as LeaveRequest['type'],
    startDate: new Date(),
    endDate: new Date(),
    reason: ''
  });

  // جلب الموظفين
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['/api/admin/employees'],
  });

  // جلب الحضور
  const { data: attendanceRecords } = useQuery<Attendance[]>({
    queryKey: ['/api/admin/attendance'],
  });

  // جلب طلبات الإجازة
  const { data: leaveRequests } = useQuery<LeaveRequest[]>({
    queryKey: ['/api/admin/leave-requests'],
  });

  // إضافة موظف جديد
  const addEmployeeMutation = useMutation({
    mutationFn: async (data: typeof employeeForm) => {
      const response = await apiRequest('POST', '/api/admin/employees', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
      toast({ title: 'تم إضافة الموظف بنجاح' });
      setShowEmployeeDialog(false);
      resetEmployeeForm();
    },
  });

  // تسجيل حضور
  const addAttendanceMutation = useMutation({
    mutationFn: async (data: typeof attendanceForm) => {
      const response = await apiRequest('POST', '/api/admin/attendance', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/attendance'] });
      toast({ title: 'تم تسجيل الحضور بنجاح' });
      setShowAttendanceDialog(false);
    },
  });

  // طلب إجازة
  const addLeaveMutation = useMutation({
    mutationFn: async (data: typeof leaveForm) => {
      const response = await apiRequest('POST', '/api/admin/leave-requests', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/leave-requests'] });
      toast({ title: 'تم إرسال طلب الإجازة بنجاح' });
      setShowLeaveDialog(false);
    },
  });

  // تحديث حالة طلب إجازة
  const updateLeaveStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const response = await apiRequest('PUT', `/api/admin/leave-requests/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/leave-requests'] });
      toast({ title: 'تم تحديث حالة الطلب بنجاح' });
    },
  });

  const resetEmployeeForm = () => {
    setEmployeeForm({
      name: '',
      email: '',
      phone: '',
      position: 'admin',
      department: 'management',
      salary: '',
      hireDate: new Date(),
      address: '',
      emergencyContact: '',
      permissions: ['view_dashboard', 'manage_orders']
    });
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">إدارة الموارد البشرية</h1>
          <p className="text-gray-500 mt-1">إدارة شؤون الموظفين، الحضور، والإجازات</p>
        </div>
        <Button onClick={() => setShowEmployeeDialog(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          إضافة موظف جديد
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 lg:w-[900px]">
          <TabsTrigger value="employees" className="gap-1 text-xs">
            <Users className="w-3 h-3" />
            الموظفين
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1 text-xs">
            <Clock className="w-3 h-3" />
            الحضور
          </TabsTrigger>
          <TabsTrigger value="leave" className="gap-1 text-xs">
            <Calendar className="w-3 h-3" />
            الإجازات
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1 text-xs">
            <BanknoteIcon className="w-3 h-3" />
            الرواتب
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1 text-xs">
            <Receipt className="w-3 h-3 text-red-500" />
            الخرجيات والمصروفات
          </TabsTrigger>
          <TabsTrigger value="sub-admins" className="gap-1 text-xs">
            <Shield className="w-3 h-3" />
            المشرفون
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>قائمة الموظفين</CardTitle>
                  <CardDescription>إدارة بيانات وصلاحيات الموظفين</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="بحث عن موظف..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="القسم" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأقسام</SelectItem>
                      <SelectItem value="management">الإدارة</SelectItem>
                      <SelectItem value="it">تقنية المعلومات</SelectItem>
                      <SelectItem value="marketing">التسويق</SelectItem>
                      <SelectItem value="sales">المبيعات</SelectItem>
                      <SelectItem value="operations">العمليات</SelectItem>
                      <SelectItem value="support">الدعم الفني</SelectItem>
                      <SelectItem value="accounting">المحاسبة</SelectItem>
                      <SelectItem value="hr">الموارد البشرية</SelectItem>
                      <SelectItem value="logistics">الخدمات اللوجستية</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="الفرع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الفروع</SelectItem>
                      <SelectItem value="main">الفرع الرئيسي</SelectItem>
                      <SelectItem value="north">فرع الشمال</SelectItem>
                      <SelectItem value="south">فرع الجنوب</SelectItem>
                      <SelectItem value="east">فرع الشرق</SelectItem>
                      <SelectItem value="west">فرع الغرب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>القسم / المنصب</TableHead>
                    <TableHead>الفرع</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تاريخ التعيين</TableHead>
                    <TableHead>الراتب</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees?.filter(emp => {
                    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                        emp.email.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;
                    const matchesBranch = branchFilter === 'all' || emp.branch === branchFilter;
                    return matchesSearch && matchesDept && matchesBranch;
                  }).map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                            {employee.name[0]}
                          </div>
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            <div className="text-xs text-gray-500">{employee.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="capitalize">{employee.department}</div>
                        <div className="text-xs text-gray-500 capitalize">{employee.position}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{employee.branch}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                          {employee.status === 'active' ? 'نشط' : employee.status === 'on_leave' ? 'في إجازة' : 'غير نشط'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(employee.hireDate).toLocaleDateString('ar-YE')}</TableCell>
                      <TableCell>{formatCurrency(employee.salary)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>سجل الحضور والإنصراف</CardTitle>
                <CardDescription>تتبع حضور وانصراف الموظفين يومياً</CardDescription>
              </div>
              <Button onClick={() => setShowAttendanceDialog(true)} variant="outline" className="gap-2">
                <Clock className="w-4 h-4" />
                تسجيل حضور يدوي
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>وقت الحضور</TableHead>
                    <TableHead>وقت الإنصراف</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>ساعات العمل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords?.map((record) => {
                    const employee = employees?.find(e => e.id === record.employeeId);
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{employee?.name || 'موظف سابق'}</TableCell>
                        <TableCell>{new Date(record.date).toLocaleDateString('ar-YE')}</TableCell>
                        <TableCell>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString('ar-YE') : '-'}</TableCell>
                        <TableCell>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString('ar-YE') : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                            {record.status === 'present' ? 'حاضر' : record.status === 'absent' ? 'غائب' : 'متأخر'}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.hoursWorked || 0} ساعة</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>طلبات الإجازة</CardTitle>
                <CardDescription>مراجعة والموافقة على طلبات إجازات الموظفين</CardDescription>
              </div>
              <Button onClick={() => setShowLeaveDialog(true)} variant="outline" className="gap-2">
                <Calendar className="w-4 h-4" />
                تقديم طلب إجازة
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>نوع الإجازة</TableHead>
                    <TableHead>من</TableHead>
                    <TableHead>إلى</TableHead>
                    <TableHead>السبب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests?.map((request) => {
                    const employee = employees?.find(e => e.id === request.employeeId);
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{employee?.name || 'موظف سابق'}</TableCell>
                        <TableCell>
                          {request.type === 'annual' ? 'سنوية' : request.type === 'sick' ? 'مرضية' : 'طارئة'}
                        </TableCell>
                        <TableCell>{new Date(request.startDate).toLocaleDateString('ar-YE')}</TableCell>
                        <TableCell>{new Date(request.endDate).toLocaleDateString('ar-YE')}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{request.reason}</TableCell>
                        <TableCell>
                          <Badge variant={request.status === 'approved' ? 'default' : request.status === 'pending' ? 'outline' : 'destructive'}>
                            {request.status === 'approved' ? 'مقبولة' : request.status === 'pending' ? 'قيد الانتظار' : 'مرفوضة'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {request.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-green-600 hover:text-green-700"
                                onClick={() => updateLeaveStatusMutation.mutate({ id: request.id, status: 'approved' })}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-destructive"
                                onClick={() => updateLeaveStatusMutation.mutate({ id: request.id, status: 'rejected' })}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll">
          <div className="space-y-6">
            {/* إحصائيات الرواتب */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <BanknoteIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">إجمالي رواتب الموظفين</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency((employees || []).reduce((s, e) => s + (e.salary || 0), 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">عدد الموظفين النشطين</p>
                      <p className="text-lg font-bold text-green-600">
                        {(employees || []).filter(e => e.status === 'active').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <Truck className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">تكاليف السائقين</p>
                      <p className="text-lg font-bold text-orange-600">مرتبطة بالتوصيل</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">التكلفة الإجمالية</p>
                      <p className="text-lg font-bold text-purple-600">
                        {formatCurrency((employees || []).reduce((s, e) => s + (e.salary || 0), 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* جدول رواتب الموظفين */}
            <PayrollTable employees={employees} uiSettings={uiSettings} />

            {/* ربط مع الأقسام الأخرى */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-blue-200 hover:border-blue-400 transition-colors cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <Truck className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold">إدارة السائقين</p>
                        <p className="text-sm text-muted-foreground">رواتب وعمولات السائقين</p>
                      </div>
                    </div>
                    <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">يتضمن: رسوم التوصيل + الحوافز</p>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-blue-600 text-xs"
                      onClick={() => window.location.href = '/admin/drivers'}
                    >
                      الانتقال إلى إدارة السائقين ←
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 hover:border-green-400 transition-colors cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold">التقارير المالية</p>
                        <p className="text-sm text-muted-foreground">تكاليف الموارد البشرية</p>
                      </div>
                    </div>
                    <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">رواتب الموظفين ضمن نفقات المنصة</p>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-green-600 text-xs"
                      onClick={() => window.location.href = '/admin/financial-reports'}
                    >
                      الانتقال إلى التقارير المالية ←
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 hover:border-purple-400 transition-colors cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <BarChart3 className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold">أداء الفرق</p>
                        <p className="text-sm text-muted-foreground">مؤشرات الأداء والكفاءة</p>
                      </div>
                    </div>
                    <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">تقارير الطلبات وتقييمات السائقين</p>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-purple-600 text-xs"
                      onClick={() => window.location.href = '/admin/detailed-reports'}
                    >
                      عرض تقارير الأداء ←
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <ExpensesPanel uiSettings={uiSettings} />
        </TabsContent>

        <TabsContent value="sub-admins">
          <SubAdminsPanel />
        </TabsContent>
      </Tabs>

      <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
        <DialogContent className="max-w-2xl rtl">
          <DialogHeader>
            <DialogTitle>إضافة موظف جديد</DialogTitle>
            <CardDescription>أدخل بيانات الموظف الجديد لتعيينه في النظام</CardDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input 
                value={employeeForm.name}
                onChange={(e) => setEmployeeForm({...employeeForm, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input 
                type="email"
                value={employeeForm.email}
                onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input 
                value={employeeForm.phone}
                onChange={(e) => setEmployeeForm({...employeeForm, phone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>المنصب</Label>
              <Select 
                value={employeeForm.position}
                onValueChange={(v: Employee['position']) => setEmployeeForm({...employeeForm, position: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير نظام</SelectItem>
                  <SelectItem value="manager">مدير قسم</SelectItem>
                  <SelectItem value="support">موظف دعم</SelectItem>
                  <SelectItem value="accountant">محاسب</SelectItem>
                  <SelectItem value="hr">موظف موارد بشرية</SelectItem>
                  <SelectItem value="developer">مطور برمجيات</SelectItem>
                  <SelectItem value="marketing">مسوق</SelectItem>
                  <SelectItem value="sales">مندوب مبيعات</SelectItem>
                  <SelectItem value="operations">موظف عمليات</SelectItem>
                  <SelectItem value="logistics">موظف لوجستيات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>القسم</Label>
              <Select 
                value={employeeForm.department}
                onValueChange={(v) => setEmployeeForm({...employeeForm, department: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="management">الإدارة</SelectItem>
                  <SelectItem value="it">تقنية المعلومات</SelectItem>
                  <SelectItem value="marketing">التسويق</SelectItem>
                  <SelectItem value="sales">المبيعات</SelectItem>
                  <SelectItem value="operations">العمليات</SelectItem>
                  <SelectItem value="support">الدعم الفني</SelectItem>
                  <SelectItem value="accounting">المحاسبة</SelectItem>
                  <SelectItem value="hr">الموارد البشرية</SelectItem>
                  <SelectItem value="logistics">الخدمات اللوجستية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الفرع</Label>
              <Select 
                value={employeeForm.branch}
                onValueChange={(v) => setEmployeeForm({...employeeForm, branch: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="الفرع الرئيسي">الفرع الرئيسي</SelectItem>
                  <SelectItem value="فرع الشمال">فرع الشمال</SelectItem>
                  <SelectItem value="فرع الجنوب">فرع الجنوب</SelectItem>
                  <SelectItem value="فرع الشرق">فرع الشرق</SelectItem>
                  <SelectItem value="فرع الغرب">فرع الغرب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الراتب الأساسي</Label>
              <Input 
                type="number"
                value={employeeForm.salary}
                onChange={(e) => setEmployeeForm({...employeeForm, salary: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>تاريخ التعيين</Label>
              <DatePicker 
                date={employeeForm.hireDate}
                setDate={(date) => setEmployeeForm({...employeeForm, hireDate: date || new Date()})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmployeeDialog(false)}>إلغاء</Button>
            <Button onClick={() => addEmployeeMutation.mutate(employeeForm)}>إضافة الموظف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAttendanceDialog} onOpenChange={setShowAttendanceDialog}>
        <DialogContent className="rtl">
          <DialogHeader>
            <DialogTitle>تسجيل حضور يدوي</DialogTitle>
            <CardDescription>تسجيل حالة حضور موظف لتاريخ محدد</CardDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الموظف</Label>
              <Select value={attendanceForm.employeeId} onValueChange={(v) => setAttendanceForm({...attendanceForm, employeeId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الموظف" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select value={attendanceForm.status} onValueChange={(v: Attendance['status']) => setAttendanceForm({...attendanceForm, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">حاضر</SelectItem>
                  <SelectItem value="absent">غائب</SelectItem>
                  <SelectItem value="late">متأخر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea 
                value={attendanceForm.notes}
                onChange={(e) => setAttendanceForm({...attendanceForm, notes: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAttendanceDialog(false)}>إلغاء</Button>
            <Button onClick={() => addAttendanceMutation.mutate(attendanceForm)}>تسجيل</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="rtl">
          <DialogHeader>
            <DialogTitle>تقديم طلب إجازة</DialogTitle>
            <CardDescription>إضافة طلب إجازة جديد للموظف</CardDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الموظف</Label>
              <Select value={leaveForm.employeeId} onValueChange={(v) => setLeaveForm({...leaveForm, employeeId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الموظف" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>من تاريخ</Label>
                <DatePicker 
                  date={leaveForm.startDate}
                  setDate={(d) => setLeaveForm({...leaveForm, startDate: d || new Date()})}
                />
              </div>
              <div className="space-y-2">
                <Label>إلى تاريخ</Label>
                <DatePicker 
                  date={leaveForm.endDate}
                  setDate={(d) => setLeaveForm({...leaveForm, endDate: d || new Date()})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>السبب</Label>
              <Textarea 
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>إلغاء</Button>
            <Button onClick={() => addLeaveMutation.mutate(leaveForm)}>تقديم الطلب</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
