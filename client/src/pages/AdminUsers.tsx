import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  UserCog, 
  Truck, 
  Edit, 
  Trash2, 
  Search,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  Eye,
  EyeOff,
  Save,
  X,
  Receipt,
  Clock,
  Plus,
  KeyRound,
  Lock,
  Shield
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'driver' | 'admin';
  isActive: boolean;
  createdAt: string;
  address?: string;
}

interface SubAdmin {
  id: string;
  name: string;
  phone?: string;
  userType: 'sub_admin';
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

interface EditUserForm {
  name: string;
  email: string;
  phone?: string;
  newPassword?: string;
  role: 'customer' | 'driver' | 'admin';
  isActive: boolean;
}

interface SubAdminForm {
  name: string;
  phone: string;
  password: string;
  permissions: string[];
  isActive: boolean;
}

interface NavigationSettings {
  showAdminPanel: boolean;
  showDeliveryApp: boolean;
  showOrdersPage: boolean;
  showTrackOrdersPage: boolean;
}

const ALL_PERMISSIONS = [
  { key: 'manage_orders', label: 'إدارة الطلبات', description: 'عرض وتعديل وتغيير حالة الطلبات' },
  { key: 'manage_restaurants', label: 'إدارة المطاعم', description: 'إضافة وتعديل وحذف المطاعم والمنتجات' },
  { key: 'manage_drivers', label: 'إدارة السائقين', description: 'عرض وتعديل بيانات السائقين' },
  { key: 'manage_users', label: 'إدارة المستخدمين', description: 'عرض وتعديل بيانات العملاء' },
  { key: 'manage_coupons', label: 'إدارة الكوبونات', description: 'إنشاء وتعديل وحذف كوبونات الخصم' },
  { key: 'view_reports', label: 'عرض التقارير', description: 'الاطلاع على التقارير المالية والإحصاءات' },
  { key: 'manage_settings', label: 'الإعدادات', description: 'تعديل إعدادات التطبيق والواجهة' },
  { key: 'manage_delivery_fees', label: 'رسوم التوصيل', description: 'تعديل رسوم وقواعد التوصيل' },
];

const AdminUsers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>({
    name: '',
    email: '',
    phone: '',
    newPassword: '',
    role: 'customer',
    isActive: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [navSettings, setNavSettings] = useState<NavigationSettings>({
    showAdminPanel: false,
    showDeliveryApp: false,
    showOrdersPage: true,
    showTrackOrdersPage: true
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // حالة المسؤول الفرعي
  const [subAdminDialogOpen, setSubAdminDialogOpen] = useState(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState<SubAdmin | null>(null);
  const [subAdminForm, setSubAdminForm] = useState<SubAdminForm>({
    name: '',
    phone: '',
    password: '',
    permissions: [],
    isActive: true
  });
  const [showSubAdminPassword, setShowSubAdminPassword] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const settings = {
      showAdminPanel: localStorage.getItem('show_admin_panel') === 'true',
      showDeliveryApp: localStorage.getItem('show_delivery_app') === 'true',
      showOrdersPage: localStorage.getItem('show_orders_page') !== 'false',
      showTrackOrdersPage: localStorage.getItem('show_track_orders_page') !== 'false'
    };
    setNavSettings(settings);
  }, []);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  const { data: subAdmins = [], isLoading: subAdminsLoading } = useQuery<SubAdmin[]>({
    queryKey: ['/api/admin/sub-admins'],
    select: (data: any[]) => data.map(sa => ({
      ...sa,
      permissions: typeof sa.permissions === 'string'
        ? (() => { try { return JSON.parse(sa.permissions); } catch { return []; } })()
        : (sa.permissions || [])
    }))
  });

  const updateUserMutation = useMutation({
    mutationFn: async (userData: { id: string } & Partial<EditUserForm>) => {
      const response = await fetch(`/api/admin/users/${userData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (!response.ok) throw new Error('Update failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "تم التحديث بنجاح", description: "تم حفظ تغييرات بيانات المستخدم" });
      setEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: "خطأ في التحديث", description: "حدث خطأ أثناء حفظ البيانات", variant: "destructive" });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "تم الحذف بنجاح", description: "تم حذف المستخدم من النظام" });
    },
    onError: () => {
      toast({ title: "خطأ في الحذف", description: "لا يمكن حذف هذا المستخدم", variant: "destructive" });
    }
  });

  const createSubAdminMutation = useMutation({
    mutationFn: async (data: SubAdminForm) => {
      const response = await fetch('/api/admin/sub-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Create failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sub-admins'] });
      toast({ title: "✅ تم إنشاء المسؤول الفرعي", description: "يمكنه الآن تسجيل الدخول بالرقم وكلمة المرور المحددة" });
      setSubAdminDialogOpen(false);
      resetSubAdminForm();
    },
    onError: (error: any) => {
      toast({ title: "خطأ في الإنشاء", description: error.message || "حدث خطأ غير متوقع", variant: "destructive" });
    }
  });

  const updateSubAdminMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<SubAdminForm>) => {
      const response = await fetch(`/api/admin/sub-admins/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Update failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sub-admins'] });
      toast({ title: "✅ تم تحديث المسؤول الفرعي", description: "تم حفظ التغييرات بنجاح" });
      setSubAdminDialogOpen(false);
      setEditingSubAdmin(null);
      resetSubAdminForm();
    },
    onError: () => {
      toast({ title: "خطأ في التحديث", description: "حدث خطأ أثناء الحفظ", variant: "destructive" });
    }
  });

  const deleteSubAdminMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/sub-admins/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sub-admins'] });
      toast({ title: "تم الحذف", description: "تم حذف المسؤول الفرعي" });
    },
    onError: () => {
      toast({ title: "خطأ في الحذف", variant: "destructive" });
    }
  });

  const resetSubAdminForm = () => {
    setSubAdminForm({ name: '', phone: '', password: '', permissions: [], isActive: true });
    setShowSubAdminPassword(false);
  };

  const openCreateSubAdmin = () => {
    setEditingSubAdmin(null);
    resetSubAdminForm();
    setSubAdminDialogOpen(true);
  };

  const openEditSubAdmin = (sa: SubAdmin) => {
    setEditingSubAdmin(sa);
    setSubAdminForm({
      name: sa.name,
      phone: sa.phone || '',
      password: '',
      permissions: sa.permissions,
      isActive: sa.isActive
    });
    setSubAdminDialogOpen(true);
  };

  const handleSaveSubAdmin = () => {
    if (!subAdminForm.name.trim()) {
      toast({ title: "الاسم مطلوب", variant: "destructive" });
      return;
    }
    if (!editingSubAdmin && !subAdminForm.password.trim()) {
      toast({ title: "كلمة المرور مطلوبة عند الإنشاء", variant: "destructive" });
      return;
    }
    if (editingSubAdmin) {
      const updateData: any = {
        id: editingSubAdmin.id,
        name: subAdminForm.name,
        phone: subAdminForm.phone,
        permissions: subAdminForm.permissions,
        isActive: subAdminForm.isActive
      };
      if (subAdminForm.password.trim()) {
        updateData.password = subAdminForm.password;
      }
      updateSubAdminMutation.mutate(updateData);
    } else {
      createSubAdminMutation.mutate(subAdminForm);
    }
  };

  const togglePermission = (perm: string) => {
    setSubAdminForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }));
  };

  const handleNavSettingsChange = (key: keyof NavigationSettings, value: boolean) => {
    const newSettings = { ...navSettings, [key]: value };
    setNavSettings(newSettings);
    localStorage.setItem(`show_admin_panel`, newSettings.showAdminPanel.toString());
    localStorage.setItem(`show_delivery_app`, newSettings.showDeliveryApp.toString());
    localStorage.setItem(`show_orders_page`, newSettings.showOrdersPage.toString());
    localStorage.setItem(`show_track_orders_page`, newSettings.showTrackOrdersPage.toString());
    const event = new CustomEvent('navigationSettingsChanged', {
      detail: { key: `show_${key.replace('show', '').replace(/([A-Z])/g, '_$1').toLowerCase().slice(1)}`, enabled: value }
    });
    window.dispatchEvent(event);
    toast({ title: "تم تحديث الإعدادات", description: `تم ${value ? 'تفعيل' : 'إلغاء تفعيل'} الخيار في واجهة العميل` });
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      newPassword: '',
      role: user.role,
      isActive: user.isActive
    });
    setEditDialogOpen(true);
  };

  const handleSaveUser = () => {
    if (!selectedUser) return;
    const updateData: any = {
      id: selectedUser.id,
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      role: editForm.role,
      isActive: editForm.isActive
    };
    if (editForm.newPassword && editForm.newPassword.trim()) {
      updateData.password = editForm.newPassword;
    }
    updateUserMutation.mutate(updateData);
  };

  const handleDeleteUser = (user: User) => {
    deleteUserMutation.mutate(user.id);
  };

  const filteredUsers = users.filter((user: User) => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'sub_admin') return false;
    return matchesSearch && user.role === activeTab;
  });

  const getUserBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'driver': return 'bg-blue-100 text-blue-800';
      case 'customer': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <UserCog className="h-4 w-4" />;
      case 'driver': return <Truck className="h-4 w-4" />;
      case 'customer': return <Users className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'مدير';
      case 'driver': return 'سائق';
      case 'customer': return 'عميل';
      default: return 'غير محدد';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>جارٍ تحميل بيانات المستخدمين...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full" data-testid="page-admin-users">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3 px-6 py-4">
          <Users className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">إدارة المستخدمين والصلاحيات</h1>
            <p className="text-sm text-gray-600">إدارة بيانات المستخدمين والمسؤولين وتحديد الصلاحيات</p>
          </div>
        </div>
      </div>

      <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <TabsList className="grid w-full lg:w-auto grid-cols-5">
            <TabsTrigger value="all" data-testid="tab-all-users">الكل ({users.length})</TabsTrigger>
            <TabsTrigger value="customer" data-testid="tab-customers">
              العملاء ({users.filter((u: User) => u.role === 'customer').length})
            </TabsTrigger>
            <TabsTrigger value="driver" data-testid="tab-drivers">
              السائقين ({users.filter((u: User) => u.role === 'driver').length})
            </TabsTrigger>
            <TabsTrigger value="admin" data-testid="tab-admins">
              المديرين ({users.filter((u: User) => u.role === 'admin').length})
            </TabsTrigger>
            <TabsTrigger value="sub_admin" data-testid="tab-sub-admins">
              <Shield className="h-3 w-3 ml-1" />
              مسؤولون فرعيون ({subAdmins.length})
            </TabsTrigger>
          </TabsList>

          {activeTab !== 'sub_admin' && (
            <div className="relative flex-1 lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="البحث عن مستخدم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
          )}

          {activeTab === 'sub_admin' && (
            <Button onClick={openCreateSubAdmin} className="gap-2 bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4" />
              إضافة مسؤول فرعي
            </Button>
          )}
        </div>

        <TabsContent value="all" className="mt-0">
          <UsersList users={filteredUsers} onEdit={handleEditUser} onDelete={handleDeleteUser}
            getUserBadgeColor={getUserBadgeColor} getRoleIcon={getRoleIcon} getRoleLabel={getRoleLabel} />
        </TabsContent>
        <TabsContent value="customer" className="mt-0">
          <UsersList users={filteredUsers} onEdit={handleEditUser} onDelete={handleDeleteUser}
            getUserBadgeColor={getUserBadgeColor} getRoleIcon={getRoleIcon} getRoleLabel={getRoleLabel} />
        </TabsContent>
        <TabsContent value="driver" className="mt-0">
          <UsersList users={filteredUsers} onEdit={handleEditUser} onDelete={handleDeleteUser}
            getUserBadgeColor={getUserBadgeColor} getRoleIcon={getRoleIcon} getRoleLabel={getRoleLabel} />
        </TabsContent>
        <TabsContent value="admin" className="mt-0">
          <UsersList users={filteredUsers} onEdit={handleEditUser} onDelete={handleDeleteUser}
            getUserBadgeColor={getUserBadgeColor} getRoleIcon={getRoleIcon} getRoleLabel={getRoleLabel} />
        </TabsContent>

        {/* تبويب المسؤولين الفرعيين */}
        <TabsContent value="sub_admin" className="mt-0">
          {subAdminsLoading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : subAdmins.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-4">لا يوجد مسؤولون فرعيون بعد</p>
                <Button onClick={openCreateSubAdmin} className="gap-2">
                  <Plus className="h-4 w-4" />
                  إضافة أول مسؤول فرعي
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {subAdmins.map((sa) => (
                <Card key={sa.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                          {sa.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{sa.name}</h3>
                            <Badge className="bg-purple-100 text-purple-800 text-xs">مسؤول فرعي</Badge>
                            {!sa.isActive && <Badge variant="destructive" className="text-xs">معطل</Badge>}
                          </div>
                          {sa.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                              <Phone className="h-3 w-3" />
                              {sa.phone}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {sa.permissions.length === 0 ? (
                              <span className="text-xs text-gray-400">لا توجد صلاحيات محددة</span>
                            ) : (
                              sa.permissions.map(perm => {
                                const p = ALL_PERMISSIONS.find(ap => ap.key === perm);
                                return (
                                  <Badge key={perm} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    {p?.label || perm}
                                  </Badge>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditSubAdmin(sa)}
                          data-testid={`button-edit-subadmin-${sa.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700"
                              data-testid={`button-delete-subadmin-${sa.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من حذف المسؤول الفرعي "{sa.name}"؟ لن يتمكن من تسجيل الدخول بعد الحذف.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteSubAdminMutation.mutate(sa.id)}
                                className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Navigation Settings Card */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            إعدادات واجهة العملاء
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { key: 'showAdminPanel' as keyof NavigationSettings, label: 'إظهار زر لوحة التحكم للعملاء', icon: <UserCog className="h-4 w-4" />, testid: 'switch-admin-panel' },
              { key: 'showDeliveryApp' as keyof NavigationSettings, label: 'إظهار زر تطبيق السائق للعملاء', icon: <Truck className="h-4 w-4" />, testid: 'switch-delivery-app' },
              { key: 'showOrdersPage' as keyof NavigationSettings, label: 'إظهار صفحة الطلبات', icon: <Receipt className="h-4 w-4" />, testid: 'switch-orders-page' },
              { key: 'showTrackOrdersPage' as keyof NavigationSettings, label: 'إظهار صفحة تتبع الطلبات', icon: <Clock className="h-4 w-4" />, testid: 'switch-track-orders-page' },
            ].map(({ key, label, icon, testid }) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="flex items-center gap-2">{icon}{label}</Label>
                <Switch
                  checked={navSettings[key]}
                  onCheckedChange={(value) => handleNavSettingsChange(key, value)}
                  data-testid={testid}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* نافذة تعديل المستخدم */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">الاسم</Label>
              <Input id="edit-name" value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} data-testid="input-edit-name" />
            </div>
            <div>
              <Label htmlFor="edit-email">البريد الإلكتروني</Label>
              <Input id="edit-email" type="email" value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))} data-testid="input-edit-email" />
            </div>
            <div>
              <Label htmlFor="edit-phone">رقم الهاتف</Label>
              <Input id="edit-phone" value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))} data-testid="input-edit-phone" />
            </div>
            <div>
              <Label htmlFor="edit-password">كلمة مرور جديدة (اختياري)</Label>
              <div className="relative">
                <Input id="edit-password" type={showPassword ? "text" : "password"} value={editForm.newPassword}
                  onChange={(e) => setEditForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="اتركها فارغة للاحتفاظ بكلمة المرور الحالية" data-testid="input-edit-password" />
                <Button type="button" variant="ghost" size="sm" className="absolute left-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-role">الدور</Label>
              <Select value={editForm.role} onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">عميل</SelectItem>
                  <SelectItem value="driver">سائق</SelectItem>
                  <SelectItem value="admin">مدير</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">الحساب نشط</Label>
              <Switch id="edit-active" checked={editForm.isActive}
                onCheckedChange={(value) => setEditForm(prev => ({ ...prev, isActive: value }))} data-testid="switch-edit-active" />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit">
              <X className="h-4 w-4 mr-2" /> إلغاء
            </Button>
            <Button onClick={handleSaveUser} disabled={updateUserMutation.isPending} data-testid="button-save-user">
              {updateUserMutation.isPending
                ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                : <Save className="h-4 w-4 mr-2" />}
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة إنشاء/تعديل المسؤول الفرعي */}
      <Dialog open={subAdminDialogOpen} onOpenChange={(open) => { if (!open) { setSubAdminDialogOpen(false); setEditingSubAdmin(null); resetSubAdminForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700">
              <Shield className="h-5 w-5" />
              {editingSubAdmin ? 'تعديل المسؤول الفرعي' : 'إضافة مسؤول فرعي جديد'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sa-name">الاسم <span className="text-red-500">*</span></Label>
                <Input id="sa-name" value={subAdminForm.name}
                  onChange={(e) => setSubAdminForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="اسم المسؤول" data-testid="input-sa-name" />
              </div>
              <div>
                <Label htmlFor="sa-phone">رقم الهاتف</Label>
                <Input id="sa-phone" value={subAdminForm.phone}
                  onChange={(e) => setSubAdminForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+967xxxxxxxxx" data-testid="input-sa-phone" />
              </div>
            </div>

            <div>
              <Label htmlFor="sa-password">
                {editingSubAdmin ? 'كلمة مرور جديدة (اتركها فارغة للاحتفاظ بالحالية)' : 'كلمة المرور'} 
                {!editingSubAdmin && <span className="text-red-500"> *</span>}
              </Label>
              <div className="relative">
                <KeyRound className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="sa-password" type={showSubAdminPassword ? 'text' : 'password'}
                  value={subAdminForm.password}
                  onChange={(e) => setSubAdminForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="أدخل كلمة مرور قوية" className="pr-10" data-testid="input-sa-password" />
                <Button type="button" variant="ghost" size="sm" className="absolute left-0 top-0 h-full px-3"
                  onClick={() => setShowSubAdminPassword(!showSubAdminPassword)}>
                  {showSubAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                <Lock className="h-4 w-4" />
                الصلاحيات الممنوحة
              </Label>
              <div className="space-y-3">
                {ALL_PERMISSIONS.map(perm => (
                  <div key={perm.key} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
                    <Checkbox
                      id={`perm-${perm.key}`}
                      checked={subAdminForm.permissions.includes(perm.key)}
                      onCheckedChange={() => togglePermission(perm.key)}
                      data-testid={`checkbox-perm-${perm.key}`}
                    />
                    <div className="flex-1">
                      <label htmlFor={`perm-${perm.key}`} className="text-sm font-medium cursor-pointer">{perm.label}</label>
                      <p className="text-xs text-muted-foreground mt-0.5">{perm.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => setSubAdminForm(prev => ({ ...prev, permissions: ALL_PERMISSIONS.map(p => p.key) }))}>
                  تحديد الكل
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSubAdminForm(prev => ({ ...prev, permissions: [] }))}>
                  إلغاء الكل
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <Label className="font-medium">الحساب نشط</Label>
              <Switch checked={subAdminForm.isActive}
                onCheckedChange={(val) => setSubAdminForm(prev => ({ ...prev, isActive: val }))}
                data-testid="switch-sa-active" />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => { setSubAdminDialogOpen(false); setEditingSubAdmin(null); resetSubAdminForm(); }}>
              إلغاء
            </Button>
            <Button
              onClick={handleSaveSubAdmin}
              disabled={createSubAdminMutation.isPending || updateSubAdminMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 gap-2"
              data-testid="button-save-subadmin"
            >
              <Save className="h-4 w-4" />
              {(createSubAdminMutation.isPending || updateSubAdminMutation.isPending) ? 'جاري الحفظ...' : (editingSubAdmin ? 'حفظ التعديلات' : 'إنشاء المسؤول')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

interface UsersListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  getUserBadgeColor: (role: string) => string;
  getRoleIcon: (role: string) => React.ReactNode;
  getRoleLabel: (role: string) => string;
}

const UsersList: React.FC<UsersListProps> = ({ users, onEdit, onDelete, getUserBadgeColor, getRoleIcon, getRoleLabel }) => {
  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>لا توجد نتائج مطابقة للبحث</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {users.map((user) => (
        <Card key={user.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {user.name.charAt(0)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{user.name}</h3>
                    <Badge className={`text-xs ${getUserBadgeColor(user.role)}`}>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(user.role)}
                        {getRoleLabel(user.role)}
                      </div>
                    </Badge>
                    {!user.isActive && <Badge variant="destructive" className="text-xs">معطل</Badge>}
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {user.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      انضم في {new Date(user.createdAt).toLocaleDateString('ar')}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(user)} data-testid={`button-edit-user-${user.id}`}>
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" data-testid={`button-delete-user-${user.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                      <AlertDialogDescription>
                        هل أنت متأكد من حذف المستخدم "{user.name}"؟ لن يتمكن من الدخول إلى حسابه مرة أخرى.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(user)} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminUsers;
