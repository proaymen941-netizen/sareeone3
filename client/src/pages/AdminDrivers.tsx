import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Truck, Save, X, Phone, MapPin, DollarSign, User, Wallet, History, CreditCard, ArrowUpDown, Receipt, Coins, Award, TrendingUp, ChevronUp, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Driver, DriverTransaction, DriverBalance, DriverCommission } from '@shared/schema';

export default function AdminDrivers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  
  // Refs للتمرير
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const driversGridRef = useRef<HTMLDivElement>(null);
  const accountDialogRef = useRef<HTMLDivElement>(null);
  const transactionsTableRef = useRef<HTMLDivElement>(null);
  const commissionsTableRef = useRef<HTMLDivElement>(null);
  
  // حالة أزرار التمرير
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    currentLocation: '',
    isAvailable: true,
    isActive: true,
    commissionRate: 70,
    paymentMode: 'commission' as 'commission' | 'salary',
    salaryAmount: 0,
    vehicleType: '',
    vehicleNumber: '',
    allowProfileEdit: true,
    notes: '',
  });

  const [transactionData, setTransactionData] = useState({
    amount: '',
    type: 'commission' as 'commission' | 'salary' | 'bonus' | 'deduction' | 'withdrawal',
    description: '',
    referenceId: '',
  });

  const [commissionData, setCommissionData] = useState({
    orderId: '',
    orderAmount: '',
    commissionRate: '',
  });

  const { data: drivers, isLoading } = useQuery<Driver[]>({
    queryKey: ['/api/drivers'],
  });

  const { data: driverBalance, refetch: refetchBalance } = useQuery<DriverBalance>({
    queryKey: ['/api/drivers', selectedDriver?.id, 'balance'],
    enabled: !!selectedDriver,
  });

  const { data: driverTransactions, refetch: refetchTransactions } = useQuery<DriverTransaction[]>({
    queryKey: ['/api/drivers', selectedDriver?.id, 'transactions'],
    enabled: !!selectedDriver,
  });

  const { data: driverCommissions, refetch: refetchCommissions } = useQuery<DriverCommission[]>({
    queryKey: ['/api/drivers', selectedDriver?.id, 'commissions'],
    enabled: !!selectedDriver,
  });

  // متابعة التمرير للصفحة الرئيسية
  useEffect(() => {
    const handleScroll = () => {
      if (mainContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = mainContainerRef.current;
        setShowScrollToTop(scrollTop > 200);
        setShowScrollToBottom(scrollTop < scrollHeight - clientHeight - 200);
      }
    };

    const container = mainContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // الدوال للتمرير
  const scrollToTop = () => {
    if (mainContainerRef.current) {
      mainContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToBottom = () => {
    if (mainContainerRef.current) {
      mainContainerRef.current.scrollTo({ top: mainContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const scrollToDriversGrid = () => {
    driversGridRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToAccountDialogTop = () => {
    accountDialogRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToAccountDialogBottom = () => {
    if (accountDialogRef.current) {
      accountDialogRef.current.scrollTo({ top: accountDialogRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const createDriverMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/drivers', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      toast({
        title: "تم إضافة السائق",
        description: "تم إضافة السائق الجديد بنجاح",
      });
      resetForm();
      setIsDialogOpen(false);
    },
  });

  const updateDriverMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await apiRequest('PUT', `/api/drivers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers', selectedDriver?.id, 'balance'] });
      toast({
        title: "تم تحديث السائق",
        description: "تم تحديث بيانات السائق بنجاح",
      });
      resetForm();
      setEditingDriver(null);
      setIsDialogOpen(false);
    },
  });

  const deleteDriverMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/drivers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      toast({
        title: "تم حذف السائق",
        description: "تم حذف السائق بنجاح",
      });
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/drivers/${selectedDriver?.id}/transactions`, {
        ...transactionData,
        amount: parseFloat(transactionData.amount),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers', selectedDriver?.id, 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers', selectedDriver?.id, 'transactions'] });
      toast({
        title: transactionData.type === 'withdrawal' ? "تم سحب المبلغ" : "تم إضافة المعاملة",
        description: `تم ${transactionData.type === 'withdrawal' ? 'سحب' : 'إضافة'} ${transactionData.amount} ريال`,
      });
      resetTransactionForm();
      setIsTransactionDialogOpen(false);
    },
  });

  const createCommissionMutation = useMutation({
    mutationFn: async () => {
      const commissionAmount = (parseFloat(commissionData.orderAmount) * parseFloat(commissionData.commissionRate)) / 100;
      const response = await apiRequest('POST', `/api/drivers/${selectedDriver?.id}/commissions`, {
        orderId: commissionData.orderId,
        orderAmount: parseFloat(commissionData.orderAmount),
        commissionRate: parseFloat(commissionData.commissionRate),
        commissionAmount,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers', selectedDriver?.id, 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers', selectedDriver?.id, 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers', selectedDriver?.id, 'commissions'] });
      toast({
        title: "تم إضافة العمولة",
        description: "تم احتساب عمولة السائق بنجاح",
      });
      setCommissionData({
        orderId: '',
        orderAmount: '',
        commissionRate: '',
      });
    },
  });

  const processWithdrawalMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiRequest('POST', `/api/drivers/${selectedDriver?.id}/withdraw`, { amount });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers', selectedDriver?.id, 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers', selectedDriver?.id, 'transactions'] });
      toast({
        title: "تم السحب",
        description: "تم سحب المبلغ بنجاح",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      password: '',
      currentLocation: '',
      isAvailable: true,
      isActive: true,
      commissionRate: 70,
      paymentMode: 'commission',
      salaryAmount: 0,
      vehicleType: '',
      vehicleNumber: '',
      allowProfileEdit: true,
      notes: '',
    });
    setEditingDriver(null);
  };

  const resetTransactionForm = () => {
    setTransactionData({
      amount: '',
      type: 'commission',
      description: '',
      referenceId: '',
    });
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      email: (driver as any).email || '',
      password: '',
      currentLocation: driver.currentLocation || '',
      isAvailable: driver.isAvailable,
      isActive: driver.isActive,
      commissionRate: driver.commissionRate || 70,
      paymentMode: (driver as any).paymentMode || 'commission',
      salaryAmount: parseFloat((driver as any).salaryAmount || '0'),
      vehicleType: driver.vehicleType || '',
      vehicleNumber: driver.vehicleNumber || '',
      allowProfileEdit: (driver as any).allowProfileEdit !== false,
      notes: (driver as any).notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleManageAccount = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsAccountDialogOpen(true);
    // تحديث البيانات فوراً عند فتح النافذة
    setTimeout(() => {
      refetchBalance();
      refetchTransactions();
      refetchCommissions();
    }, 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال الاسم ورقم الهاتف",
        variant: "destructive",
      });
      return;
    }

    if (formData.commissionRate < 0 || formData.commissionRate > 100) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال نسبة عمولة صحيحة (0-100)",
        variant: "destructive",
      });
      return;
    }

    if (!editingDriver && !formData.password.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال كلمة المرور للسائق الجديد",
        variant: "destructive",
      });
      return;
    }

    const submitData = editingDriver && !formData.password.trim() 
      ? { ...formData, password: undefined } 
      : formData;

    if (editingDriver) {
      updateDriverMutation.mutate({ id: editingDriver.id, data: submitData });
    } else {
      createDriverMutation.mutate(formData);
    }
  };

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transactionData.amount || parseFloat(transactionData.amount) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ صحيح",
        variant: "destructive",
      });
      return;
    }

    if (!transactionData.description.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال وصف للمعاملة",
        variant: "destructive",
      });
      return;
    }

    createTransactionMutation.mutate();
  };

  const handleCommissionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commissionData.orderId.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رقم الطلب",
        variant: "destructive",
      });
      return;
    }

    if (!commissionData.orderAmount || parseFloat(commissionData.orderAmount) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ الطلب",
        variant: "destructive",
      });
      return;
    }

    if (!commissionData.commissionRate || parseFloat(commissionData.commissionRate) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال نسبة العمولة",
        variant: "destructive",
      });
      return;
    }

    createCommissionMutation.mutate();
  };

  const handleWithdrawal = () => {
    if (!driverBalance || driverBalance.availableBalance <= 0) {
      toast({
        title: "خطأ",
        description: "لا يوجد رصيد متاح للسحب",
        variant: "destructive",
      });
      return;
    }

    processWithdrawalMutation.mutate(driverBalance.availableBalance);
  };

  const toggleDriverStatus = (driver: Driver, field: 'isAvailable' | 'isActive') => {
    updateDriverMutation.mutate({
      id: driver.id,
      data: { [field]: !driver[field] }
    });
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      commission: 'عمولة',
      salary: 'راتب',
      bonus: 'مكافأة',
      deduction: 'خصم',
      withdrawal: 'سحب',
      order: 'طلب',
    };
    return labels[type] || type;
  };

  return (
    <div className="relative" ref={mainContainerRef} style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
      {/* أزرار التمرير العائمة للصفحة الرئيسية */}
      <div className="fixed right-6 bottom-6 z-50 flex flex-col gap-2">
        {showScrollToTop && (
          <Button
            onClick={scrollToTop}
            size="icon"
            className="rounded-full shadow-lg h-10 w-10 bg-primary hover:bg-primary/90"
            aria-label="التمرير للأعلى"
          >
            <ChevronUp className="h-5 w-5" />
          </Button>
        )}
        {showScrollToBottom && (
          <Button
            onClick={scrollToBottom}
            size="icon"
            className="rounded-full shadow-lg h-10 w-10 bg-primary hover:bg-primary/90"
            aria-label="التمرير للأسفل"
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
        )}
        <Button
          onClick={scrollToDriversGrid}
          size="icon"
          className="rounded-full shadow-lg h-10 w-10 bg-secondary hover:bg-secondary/90"
          aria-label="الذهاب إلى قائمة السائقين"
          title="الذهاب إلى قائمة السائقين"
        >
          <Truck className="h-5 w-5" />
        </Button>
      </div>

      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-4 md:px-6 py-4">
          <div className="flex items-center gap-3">
            <Truck className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">إدارة السائقين</h1>
              <p className="text-sm text-muted-foreground">إدارة سائقي التوصيل وأرصدتهم</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={scrollToDriversGrid}
              variant="outline"
              size="sm"
              className="gap-2"
              title="الذهاب إلى قائمة السائقين"
            >
              <Truck className="h-4 w-4" />
              قائمة السائقين
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="gap-2"
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(true);
                  }}
                  data-testid="button-add-driver"
                >
                  <Plus className="h-4 w-4" />
                  إضافة سائق جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingDriver ? 'تعديل بيانات السائق' : 'إضافة سائق جديد'}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">الاسم الكامل</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="أدخل اسم السائق"
                      required
                      data-testid="input-driver-name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+966-5xxxxxxxx"
                      required
                      data-testid="input-driver-phone"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">البريد الإلكتروني (اختياري)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="driver@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">
                      كلمة المرور {editingDriver && "(اتركها فارغة للاحتفاظ بالحالية)"}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="كلمة المرور"
                      required={!editingDriver}
                      data-testid="input-driver-password"
                    />
                  </div>

                  <div>
                    <Label htmlFor="paymentMode">نظام الدفع</Label>
                    <Select
                      value={formData.paymentMode}
                      onValueChange={(value: 'commission' | 'salary') => setFormData(prev => ({ ...prev, paymentMode: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نظام الدفع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commission">عمولة (نسبة من كل طلب)</SelectItem>
                        <SelectItem value="salary">راتب شهري ثابت</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.paymentMode === 'commission' ? (
                    <div>
                      <Label htmlFor="commissionRate">نسبة العمولة (%)</Label>
                      <Input
                        id="commissionRate"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.commissionRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, commissionRate: parseInt(e.target.value) || 70 }))}
                        placeholder="نسبة العمولة من كل طلب"
                        required
                        data-testid="input-driver-commission"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        النسبة المئوية التي يحصل عليها السائق من رسوم التوصيل
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="salaryAmount">الراتب الشهري (ريال يمني)</Label>
                      <Input
                        id="salaryAmount"
                        type="number"
                        min="0"
                        value={formData.salaryAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, salaryAmount: parseFloat(e.target.value) || 0 }))}
                        placeholder="مبلغ الراتب الشهري"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="vehicleType">نوع المركبة</Label>
                    <Select
                      value={formData.vehicleType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, vehicleType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع المركبة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="motorcycle">دراجة نارية</SelectItem>
                        <SelectItem value="car">سيارة</SelectItem>
                        <SelectItem value="van">فان</SelectItem>
                        <SelectItem value="truck">شاحنة صغيرة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="vehicleNumber">رقم لوحة المركبة</Label>
                    <Input
                      id="vehicleNumber"
                      value={formData.vehicleNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                      placeholder="رقم اللوحة"
                    />
                  </div>

                  <div>
                    <Label htmlFor="location">الموقع الحالي</Label>
                    <Input
                      id="location"
                      value={formData.currentLocation}
                      onChange={(e) => setFormData(prev => ({ ...prev, currentLocation: e.target.value }))}
                      placeholder="الموقع الحالي للسائق"
                      data-testid="input-driver-location"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">ملاحظات</Label>
                    <Input
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="ملاحظات إضافية عن السائق"
                    />
                  </div>

                  <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                    <p className="text-sm font-medium">الصلاحيات والحالة</p>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="available">متاح للعمل</Label>
                      <Switch
                        id="available"
                        checked={formData.isAvailable}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAvailable: checked }))}
                        data-testid="switch-driver-available"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="active">حساب نشط</Label>
                      <Switch
                        id="active"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                        data-testid="switch-driver-active"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="allowProfileEdit">السماح بتعديل الملف الشخصي</Label>
                        <p className="text-xs text-muted-foreground">يسمح للسائق بتعديل بياناته من تطبيقه</p>
                      </div>
                      <Switch
                        id="allowProfileEdit"
                        checked={formData.allowProfileEdit}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowProfileEdit: checked }))}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="submit" 
                      className="flex-1 gap-2"
                      disabled={createDriverMutation.isPending || updateDriverMutation.isPending}
                      data-testid="button-save-driver"
                    >
                      <Save className="h-4 w-4" />
                      {editingDriver ? 'تحديث' : 'إضافة'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        resetForm();
                        setIsDialogOpen(false);
                      }}
                      data-testid="button-cancel-driver"
                    >
                      <X className="h-4 w-4" />
                      إلغاء
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Drivers Grid */}
        <div ref={driversGridRef} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">قائمة السائقين</h2>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => driversGridRef.current?.scrollIntoView({ behavior: 'smooth' })}
                variant="ghost"
                size="sm"
                className="h-8 w-8"
                title="التمرير للأعلى"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {drivers?.length || 0} سائق
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="w-16 h-16 bg-muted rounded-full mb-4 mx-auto" />
                    <div className="h-4 bg-muted rounded w-3/4 mb-2 mx-auto" />
                    <div className="h-3 bg-muted rounded w-1/2 mx-auto" />
                  </CardContent>
                </Card>
              ))
            ) : drivers?.length ? (
              drivers.map((driver) => (
                <Card key={driver.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="text-center pb-3">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{driver.name}</CardTitle>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Badge variant={driver.isActive ? "default" : "secondary"}>
                        {driver.isActive ? 'نشط' : 'غير نشط'}
                      </Badge>
                      <Badge variant={driver.isAvailable ? "default" : "outline"}>
                        {driver.isAvailable ? 'متاح' : 'غير متاح'}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{driver.phone}</span>
                      </div>
                      
                      {driver.currentLocation && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{driver.currentLocation}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">
                          نسبة العمولة: {driver.commissionRate || 70}%
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          الرصيد: {formatCurrency(driver.totalEarnings || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">متاح للعمل</p>
                        <Switch
                          checked={driver.isAvailable}
                          onCheckedChange={() => toggleDriverStatus(driver, 'isAvailable')}
                          data-testid={`switch-driver-available-${driver.id}`}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">نشط</p>
                        <Switch
                          checked={driver.isActive}
                          onCheckedChange={() => toggleDriverStatus(driver, 'isActive')}
                          data-testid={`switch-driver-active-${driver.id}`}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => handleEdit(driver)}
                        data-testid={`button-edit-driver-${driver.id}`}
                      >
                        <Edit className="h-4 w-4" />
                        تعديل
                      </Button>
                      
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => handleManageAccount(driver)}
                        data-testid={`button-manage-account-${driver.id}`}
                      >
                        <Wallet className="h-4 w-4" />
                        إدارة الرصيد
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`tel:${driver.phone}`)}
                        className="flex-1"
                        data-testid={`button-call-driver-${driver.id}`}
                      >
                        <Phone className="h-4 w-4" />
                        اتصال
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-driver-${driver.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>تأكيد الحذف النهائي</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف السائق "{driver.name}"؟ 
                              سيتم حذف جميع سجلاته المالية (الرصيد، المعاملات، العمولات) وسيتم إلغاء ارتباطه بالطلبات الحالية. هذا الإجراء لا يمكن التراجع عنه.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteDriverMutation.mutate(driver.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              حذف نهائي
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد سائقين</h3>
                <p className="text-muted-foreground mb-4">ابدأ بإضافة سائقين لخدمة التوصيل</p>
                <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-driver">
                  إضافة السائق الأول
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Account Management Dialog */}
        <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
            <DialogHeader className="sticky top-0 bg-background z-10 pb-4 border-b">
              <DialogTitle>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    إدارة رصيد السائق: {selectedDriver?.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={scrollToAccountDialogTop}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8"
                      title="التمرير للأعلى"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={scrollToAccountDialogBottom}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8"
                      title="التمرير للأسفل"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div ref={accountDialogRef} className="flex-1 overflow-y-auto">
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-4 sticky top-0 bg-background z-10">
                  <TabsTrigger value="info">بيانات السائق</TabsTrigger>
                  <TabsTrigger value="balance">المحفظة والمالية</TabsTrigger>
                  <TabsTrigger value="transactions">سجل المعاملات</TabsTrigger>
                  <TabsTrigger value="commissions">عمولات الطلبات</TabsTrigger>
                </TabsList>

                {/* Driver Info Tab */}
                <TabsContent value="info" className="space-y-4 p-4">
                  {/* Driver Summary Card */}
                  <Card className="bg-gradient-to-r from-primary to-primary/80 text-white border-none">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                          <User className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">{selectedDriver?.name}</h2>
                          <p className="text-white/80">{selectedDriver?.phone}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge className={`${selectedDriver?.isActive ? 'bg-green-400' : 'bg-red-400'} text-white border-none text-xs`}>
                              {selectedDriver?.isActive ? 'نشط' : 'غير نشط'}
                            </Badge>
                            <Badge className={`${selectedDriver?.isAvailable ? 'bg-blue-400' : 'bg-gray-400'} text-white border-none text-xs`}>
                              {selectedDriver?.isAvailable ? 'متاح' : 'غير متاح'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Work Agreement */}
                    <Card className="border-2 border-primary/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Receipt className="h-5 w-5 text-primary" />
                          اتفاقية العمل
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm text-muted-foreground">نظام الدفع</span>
                          <Badge variant={(selectedDriver as any)?.paymentMode === 'salary' ? 'secondary' : 'default'}>
                            {(selectedDriver as any)?.paymentMode === 'salary' ? 'راتب شهري' : 'عمولة'}
                          </Badge>
                        </div>
                        {(selectedDriver as any)?.paymentMode === 'salary' ? (
                          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                            <span className="text-sm text-muted-foreground">الراتب الشهري</span>
                            <span className="font-bold text-green-600">{formatCurrency((selectedDriver as any)?.salaryAmount || 0)}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                            <span className="text-sm text-muted-foreground">نسبة العمولة</span>
                            <span className="font-bold text-primary">{selectedDriver?.commissionRate || 70}%</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm text-muted-foreground">تاريخ الانضمام</span>
                          <span className="text-sm font-medium">{selectedDriver?.createdAt ? formatDate(selectedDriver.createdAt) : '-'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm text-muted-foreground">الطلبات المكتملة</span>
                          <span className="font-bold">{selectedDriver?.completedOrders || 0}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Vehicle Info */}
                    <Card className="border-2 border-blue-100">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Truck className="h-5 w-5 text-blue-500" />
                          معلومات المركبة
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm text-muted-foreground">نوع المركبة</span>
                          <span className="font-medium">{
                            selectedDriver?.vehicleType === 'motorcycle' ? 'دراجة نارية' :
                            selectedDriver?.vehicleType === 'car' ? 'سيارة' :
                            selectedDriver?.vehicleType === 'van' ? 'فان' :
                            selectedDriver?.vehicleType === 'truck' ? 'شاحنة صغيرة' :
                            selectedDriver?.vehicleType || '-'
                          }</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm text-muted-foreground">رقم اللوحة</span>
                          <span className="font-medium">{selectedDriver?.vehicleNumber || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm text-muted-foreground">الموقع الحالي</span>
                          <span className="font-medium text-sm">{selectedDriver?.currentLocation || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm text-muted-foreground">التقييم</span>
                          <span className="font-bold text-amber-500">⭐ {parseFloat(selectedDriver?.averageRating || '0').toFixed(1)} ({selectedDriver?.reviewCount || 0})</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Permissions Control */}
                  <Card className="border-2 border-orange-100">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Award className="h-5 w-5 text-orange-500" />
                        صلاحيات السائق
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">السماح بتعديل الملف الشخصي</p>
                          <p className="text-xs text-muted-foreground">يسمح للسائق بتغيير بياناته من تطبيقه</p>
                        </div>
                        <Switch
                          checked={(selectedDriver as any)?.allowProfileEdit !== false}
                          onCheckedChange={(checked) => {
                            updateDriverMutation.mutate({
                              id: selectedDriver!.id,
                              data: { allowProfileEdit: checked } as any
                            });
                            setSelectedDriver(prev => prev ? { ...prev, allowProfileEdit: checked } as any : prev);
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">متاح لاستقبال الطلبات</p>
                          <p className="text-xs text-muted-foreground">يظهر للنظام كسائق متاح</p>
                        </div>
                        <Switch
                          checked={selectedDriver?.isAvailable}
                          onCheckedChange={(checked) => {
                            toggleDriverStatus(selectedDriver!, 'isAvailable');
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">الحساب نشط</p>
                          <p className="text-xs text-muted-foreground">تفعيل أو تعطيل حساب السائق</p>
                        </div>
                        <Switch
                          checked={selectedDriver?.isActive}
                          onCheckedChange={(checked) => {
                            toggleDriverStatus(selectedDriver!, 'isActive');
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Edit Button */}
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 gap-2"
                      onClick={() => {
                        setIsAccountDialogOpen(false);
                        handleEdit(selectedDriver!);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                      تعديل البيانات الكاملة
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => window.open(`tel:${selectedDriver?.phone}`)}
                    >
                      <Phone className="h-4 w-4" />
                      اتصال
                    </Button>
                  </div>
                </TabsContent>
                
                {/* Balance Tab */}
                <TabsContent value="balance" className="space-y-6 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          الرصيد الإجمالي
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                          {formatCurrency(driverBalance?.totalBalance || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">مجموع الأرباح</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          الرصيد المتاح
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(driverBalance?.availableBalance || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">قابل للسحب</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          المسحوب
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(driverBalance?.withdrawnAmount || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">إجمالي المسحوبات</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Add Manual Transaction */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">إضافة معاملة يدوية</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleTransactionSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="transactionType">نوع المعاملة</Label>
                            <Select
                              value={transactionData.type}
                              onValueChange={(value: any) => setTransactionData(prev => ({ ...prev, type: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="اختر نوع المعاملة" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="commission">عمولة</SelectItem>
                                <SelectItem value="salary">راتب</SelectItem>
                                <SelectItem value="bonus">مكافأة</SelectItem>
                                <SelectItem value="deduction">خصم</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="amount">المبلغ (ريال)</Label>
                            <Input
                              id="amount"
                              type="number"
                              min="0"
                              step="0.01"
                              value={transactionData.amount}
                              onChange={(e) => setTransactionData(prev => ({ ...prev, amount: e.target.value }))}
                              placeholder="أدخل المبلغ"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="description">الوصف</Label>
                            <Input
                              id="description"
                              value={transactionData.description}
                              onChange={(e) => setTransactionData(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="وصف المعاملة"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="referenceId">رقم المرجع (اختياري)</Label>
                            <Input
                              id="referenceId"
                              value={transactionData.referenceId}
                              onChange={(e) => setTransactionData(prev => ({ ...prev, referenceId: e.target.value }))}
                              placeholder="رقم الطلب أو المرجع"
                            />
                          </div>

                          <Button type="submit" className="w-full" disabled={createTransactionMutation.isPending}>
                            إضافة المعاملة
                          </Button>
                        </form>
                      </CardContent>
                    </Card>

                    {/* Add Commission for Order */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">إضافة عمولة طلب</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleCommissionSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="orderId">رقم الطلب</Label>
                            <Input
                              id="orderId"
                              value={commissionData.orderId}
                              onChange={(e) => setCommissionData(prev => ({ ...prev, orderId: e.target.value }))}
                              placeholder="رقم الطلب"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="orderAmount">مبلغ الطلب (ريال)</Label>
                            <Input
                              id="orderAmount"
                              type="number"
                              min="0"
                              step="0.01"
                              value={commissionData.orderAmount}
                              onChange={(e) => setCommissionData(prev => ({ ...prev, orderAmount: e.target.value }))}
                              placeholder="مبلغ الطلب"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="commissionRate">نسبة العمولة (%)</Label>
                            <Input
                              id="commissionRate"
                              type="number"
                              min="0"
                              max="100"
                              value={commissionData.commissionRate || selectedDriver?.commissionRate || 70}
                              onChange={(e) => setCommissionData(prev => ({ ...prev, commissionRate: e.target.value }))}
                              placeholder="نسبة العمولة"
                              required
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              النسبة المئوية: {((parseFloat(commissionData.orderAmount || '0') * parseFloat(commissionData.commissionRate || '0')) / 100).toFixed(2)} ريال
                            </p>
                          </div>

                          <Button type="submit" className="w-full" disabled={createCommissionMutation.isPending}>
                            احتساب العمولة
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">سحب الرصيد</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">الرصيد المتاح للسحب</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(driverBalance?.availableBalance || 0)}
                          </p>
                        </div>
                        <Button
                          onClick={handleWithdrawal}
                          disabled={!driverBalance || driverBalance.availableBalance <= 0 || processWithdrawalMutation.isPending}
                          className="gap-2"
                        >
                          <ArrowUpDown className="h-4 w-4" />
                          سحب الرصيد
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        سيتم خصم الرصيد المتاح بالكامل وإضافته إلى سجل المسحوبات
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Transactions Tab */}
                <TabsContent value="transactions" className="p-4">
                  <Card>
                    <CardHeader className="sticky top-0 bg-card z-10">
                      <div className="flex items-center justify-between">
                        <CardTitle>سجل المعاملات</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => transactionsTableRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8"
                            title="التمرير للأعلى"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              if (transactionsTableRef.current) {
                                transactionsTableRef.current.scrollTo({ 
                                  top: transactionsTableRef.current.scrollHeight, 
                                  behavior: 'smooth' 
                                });
                              }
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8"
                            title="التمرير للأسفل"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <div ref={transactionsTableRef}>
                          <Table>
                            <TableHeader className="sticky top-0 bg-background">
                              <TableRow>
                                <TableHead>التاريخ</TableHead>
                                <TableHead>النوع</TableHead>
                                <TableHead>المبلغ</TableHead>
                                <TableHead>الوصف</TableHead>
                                <TableHead>الرصيد بعد</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {driverTransactions?.length ? (
                                driverTransactions.map((transaction) => (
                                  <TableRow key={transaction.id}>
                                    <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                                    <TableCell>
                                      <Badge variant={
                                        transaction.type === 'commission' || transaction.type === 'salary' || transaction.type === 'bonus'
                                          ? 'default'
                                          : transaction.type === 'deduction'
                                          ? 'destructive'
                                          : 'secondary'
                                      }>
                                        {getTransactionTypeLabel(transaction.type)}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className={
                                      transaction.type === 'deduction' || transaction.type === 'withdrawal'
                                        ? 'text-red-600'
                                        : 'text-green-600'
                                    }>
                                      {transaction.type === 'deduction' || transaction.type === 'withdrawal' ? '-' : '+'}
                                      {formatCurrency(transaction.amount)}
                                    </TableCell>
                                    <TableCell>{transaction.description}</TableCell>
                                    <TableCell>{formatCurrency(transaction.balanceAfter)}</TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    لا توجد معاملات
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                        <ScrollBar orientation="vertical" />
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Commissions Tab */}
                <TabsContent value="commissions" className="p-4">
                  <Card>
                    <CardHeader className="sticky top-0 bg-card z-10">
                      <div className="flex items-center justify-between">
                        <CardTitle>عمولات الطلبات</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => commissionsTableRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8"
                            title="التمرير للأعلى"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              if (commissionsTableRef.current) {
                                commissionsTableRef.current.scrollTo({ 
                                  top: commissionsTableRef.current.scrollHeight, 
                                  behavior: 'smooth' 
                                });
                              }
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8"
                            title="التمرير للأسفل"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <div ref={commissionsTableRef}>
                          <Table>
                            <TableHeader className="sticky top-0 bg-background">
                              <TableRow>
                                <TableHead>رقم الطلب</TableHead>
                                <TableHead>مبلغ الطلب</TableHead>
                                <TableHead>نسبة العمولة</TableHead>
                                <TableHead>قيمة العمولة</TableHead>
                                <TableHead>التاريخ</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {driverCommissions?.length ? (
                                driverCommissions.map((commission) => (
                                  <TableRow key={commission.id}>
                                    <TableCell className="font-medium">{commission.orderId}</TableCell>
                                    <TableCell>{formatCurrency(commission.orderAmount)}</TableCell>
                                    <TableCell>{commission.commissionRate}%</TableCell>
                                    <TableCell className="text-green-600 font-medium">
                                      {formatCurrency(commission.commissionAmount)}
                                    </TableCell>
                                    <TableCell>{formatDate(commission.createdAt)}</TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    لا توجد عمولات
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                        <ScrollBar orientation="vertical" />
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
            
            <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>آخر تحديث: {new Date().toLocaleTimeString('ar-YE')}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={scrollToAccountDialogTop}
                    size="sm"
                    className="gap-1"
                  >
                    <ChevronUp className="h-4 w-4" />
                    أعلى
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAccountDialogOpen(false);
                      setSelectedDriver(null);
                    }}
                  >
                    إغلاق
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
