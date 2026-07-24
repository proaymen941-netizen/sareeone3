import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { Driver, InsertDriver } from '@shared/schema'
import { Plus, Search, Edit, Trash2, Car, MapPin, Clock, DollarSign, Eye, EyeOff } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function DriversManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<InsertDriver>>({
    name: '',
    phone: '',
    password: '',
    isAvailable: true,
    isActive: true,
    currentLocation: '',
    earnings: '0'
  })
  const [showPassword, setShowPassword] = useState(false)
  const { toast } = useToast()

  // جلب قائمة السائقين
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['/api/admin/drivers'],
    retry: 3
  })

  // جلب إحصائيات السائق
  const { data: driverStats } = useQuery({
    queryKey: ['/api/admin/drivers', selectedDriver?.id, 'stats'],
    enabled: !!selectedDriver && isStatsDialogOpen,
    retry: 2
  })

  // إنشاء سائق جديد
  const createDriverMutation = useMutation({
    mutationFn: async (data: InsertDriver) => 
      apiRequest('/api/admin/drivers', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers'] })
      toast({ title: 'تم إنشاء السائق بنجاح', description: 'تم إضافة السائق إلى النظام' })
      setIsDialogOpen(false)
      resetForm()
    },
    onError: () => {
      toast({ 
        title: 'خطأ في إنشاء السائق', 
        description: 'حدث خطأ أثناء إضافة السائق',
        variant: 'destructive'
      })
    }
  })

  // تحديث سائق
  const updateDriverMutation = useMutation({
    mutationFn: async (data: Partial<InsertDriver> & { id: string }) => 
      apiRequest(`/api/admin/drivers/${data.id}`, { method: 'PUT', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers'] })
      toast({ title: 'تم تحديث السائق بنجاح', description: 'تم حفظ التغييرات' })
      setIsDialogOpen(false)
      resetForm()
    },
    onError: () => {
      toast({ 
        title: 'خطأ في تحديث السائق', 
        description: 'حدث خطأ أثناء حفظ التغييرات',
        variant: 'destructive'
      })
    }
  })

  // حذف سائق
  const deleteDriverMutation = useMutation({
    mutationFn: async (id: string) => 
      apiRequest(`/api/admin/drivers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers'] })
      toast({ title: 'تم حذف السائق بنجاح', description: 'تم إزالة السائق من النظام' })
    },
    onError: () => {
      toast({ 
        title: 'خطأ في حذف السائق', 
        description: 'حدث خطأ أثناء حذف السائق',
        variant: 'destructive'
      })
    }
  })

  // تصفية السائقين حسب البحث
  const filteredDrivers = drivers.filter((driver: Driver) =>
    driver.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.currentLocation?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      password: '',
      isAvailable: true,
      isActive: true,
      currentLocation: '',
      earnings: '0'
    })
    setSelectedDriver(null)
    setShowPassword(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name?.trim() || !formData.phone?.trim()) {
      toast({
        title: 'بيانات مطلوبة',
        description: 'يرجى ملء الاسم ورقم الهاتف',
        variant: 'destructive'
      })
      return
    }

    const submitData = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      password: formData.password || '',
      isAvailable: formData.isAvailable ?? true,
      isActive: formData.isActive ?? true,
      currentLocation: formData.currentLocation?.trim() || null,
      earnings: formData.earnings || '0'
    }

    if (selectedDriver) {
      updateDriverMutation.mutate({ ...submitData, id: selectedDriver.id })
    } else {
      if (!formData.password?.trim()) {
        toast({
          title: 'كلمة المرور مطلوبة',
          description: 'يرجى إدخال كلمة مرور للسائق الجديد',
          variant: 'destructive'
        })
        return
      }
      createDriverMutation.mutate(submitData as InsertDriver)
    }
  }

  const handleEdit = (driver: Driver) => {
    setSelectedDriver(driver)
    setFormData({
      name: driver.name || '',
      phone: driver.phone || '',
      password: '', // لا نعرض كلمة المرور الحالية
      isAvailable: driver.isAvailable,
      isActive: driver.isActive,
      currentLocation: driver.currentLocation || '',
      earnings: driver.earnings || '0'
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (driver: Driver) => {
    if (confirm(`هل أنت متأكد من حذف السائق "${driver.name}"؟`)) {
      deleteDriverMutation.mutate(driver.id)
    }
  }

  const handleViewStats = (driver: Driver) => {
    setSelectedDriver(driver)
    setIsStatsDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Car className="w-5 h-5" />
          <h2 className="text-xl font-bold">إدارة السائقين</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Car className="w-5 h-5" />
          <h2 className="text-xl font-bold">إدارة السائقين</h2>
          <Badge variant="secondary">{filteredDrivers.length} سائق</Badge>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} data-testid="button-add-driver">
              <Plus className="w-4 h-4 mr-2" />
              إضافة سائق جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedDriver ? 'تعديل السائق' : 'إضافة سائق جديد'}
              </DialogTitle>
              <DialogDescription>
                {selectedDriver 
                  ? 'قم بتعديل بيانات السائق المحدد'
                  : 'أدخل بيانات السائق الجديد لإضافته إلى النظام'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">الاسم *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="اسم السائق"
                  required
                  data-testid="input-driver-name"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">رقم الهاتف *</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="رقم الهاتف"
                  required
                  data-testid="input-driver-phone"
                />
              </div>
              
              <div>
                <Label htmlFor="password">
                  {selectedDriver ? 'كلمة المرور الجديدة (اتركها فارغة للاحتفاظ بالحالية)' : 'كلمة المرور *'}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password || ''}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="كلمة المرور"
                    required={!selectedDriver}
                    data-testid="input-driver-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="location">الموقع الحالي</Label>
                <Input
                  id="location"
                  value={formData.currentLocation || ''}
                  onChange={(e) => setFormData({...formData, currentLocation: e.target.value})}
                  placeholder="الموقع الحالي للسائق"
                  data-testid="input-driver-location"
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="available"
                    checked={formData.isAvailable ?? true}
                    onChange={(e) => setFormData({...formData, isAvailable: e.target.checked})}
                    data-testid="checkbox-driver-available"
                  />
                  <Label htmlFor="available">متاح للتوصيل</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.isActive ?? true}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    data-testid="checkbox-driver-active"
                  />
                  <Label htmlFor="active">نشط</Label>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={createDriverMutation.isPending || updateDriverMutation.isPending}
                  data-testid="button-save-driver"
                >
                  {selectedDriver ? 'حفظ التغييرات' : 'إضافة السائق'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-driver"
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-gray-500" />
        <Input
          placeholder="البحث عن سائق..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
          data-testid="input-search-drivers"
        />
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDrivers.map((driver: Driver) => (
          <Card key={driver.id} className="hover:shadow-md transition-shadow" data-testid={`card-driver-${driver.id}`}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg" data-testid={`text-driver-name-${driver.id}`}>
                  {driver.name}
                </CardTitle>
                <div className="flex gap-1">
                  <Badge 
                    variant={driver.isAvailable ? "default" : "secondary"}
                    data-testid={`badge-availability-${driver.id}`}
                  >
                    {driver.isAvailable ? 'متاح' : 'مشغول'}
                  </Badge>
                  <Badge 
                    variant={driver.isActive ? "default" : "destructive"}
                    data-testid={`badge-status-${driver.id}`}
                  >
                    {driver.isActive ? 'نشط' : 'معطل'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Car className="w-4 h-4" />
                <span data-testid={`text-driver-phone-${driver.id}`}>{driver.phone}</span>
              </div>
              
              {driver.currentLocation && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span data-testid={`text-driver-location-${driver.id}`}>{driver.currentLocation}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="w-4 h-4" />
                <span data-testid={`text-driver-earnings-${driver.id}`}>{formatCurrency(driver.earnings || '0')}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span data-testid={`text-driver-created-${driver.id}`}>
                  {driver.createdAt ? formatDate(driver.createdAt) : 'غير محدد'}
                </span>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleViewStats(driver)}
                  data-testid={`button-stats-${driver.id}`}
                >
                  الإحصائيات
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleEdit(driver)}
                  data-testid={`button-edit-${driver.id}`}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => handleDelete(driver)}
                  disabled={deleteDriverMutation.isPending}
                  data-testid={`button-delete-${driver.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredDrivers.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Car className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا يوجد سائقين</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'لا توجد نتائج مطابقة للبحث' : 'ابدأ بإضافة سائق جديد'}
          </p>
          {!searchTerm && (
            <Button onClick={() => { resetForm(); setIsDialogOpen(true) }}>
              <Plus className="w-4 h-4 mr-2" />
              إضافة سائق جديد
            </Button>
          )}
        </div>
      )}

      {/* Driver Statistics Dialog */}
      <Dialog open={isStatsDialogOpen} onOpenChange={setIsStatsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إحصائيات السائق: {selectedDriver?.name}</DialogTitle>
            <DialogDescription>
              عرض إحصائيات الأداء والطلبات للسائق
            </DialogDescription>
          </DialogHeader>
          
          {driverStats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600" data-testid="stats-total-orders">
                    {driverStats.totalOrders || 0}
                  </div>
                  <div className="text-sm text-gray-600">إجمالي الطلبات</div>
                </div>
                
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600" data-testid="stats-completed-orders">
                    {driverStats.completedOrders || 0}
                  </div>
                  <div className="text-sm text-gray-600">طلبات مكتملة</div>
                </div>
                
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600" data-testid="stats-cancelled-orders">
                    {driverStats.cancelledOrders || 0}
                  </div>
                  <div className="text-sm text-gray-600">طلبات ملغية</div>
                </div>
                
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600" data-testid="stats-total-earnings">
                    {Number(driverStats.totalEarnings || 0).toFixed(2)} ريال
                  </div>
                  <div className="text-sm text-gray-600">إجمالي الأرباح</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p>جاري تحميل الإحصائيات...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}