import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Store, Save, X, Clock, Star, Search, MapPin, Phone, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Restaurant, Category } from '@shared/schema';
import LocationPicker from '@/components/maps/GoogleMapPicker';

export default function AdminRestaurants() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionsRestaurant, setSectionsRestaurant] = useState<Restaurant | null>(null);
  const [isSectionsDialogOpen, setIsSectionsDialogOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    phone: '',
    deliveryTime: '',
    commissionRate: '10',
    minimumOrder: '0',
    isOpen: true,
    categoryId: '',
    openingTime: '08:00',
    closingTime: '23:00',
    workingDays: '0,1,2,3,4,5,6',
    isTemporarilyClosed: false,
    temporaryCloseReason: '',
    latitude: '',
    longitude: '',
    address: '',
    isFeatured: false,
    isNew: false,
    isActive: true,
  });

  const { data: restaurantsData, isLoading: restaurantsLoading } = useQuery<{restaurants: Restaurant[], pagination: any}>({
    queryKey: ['/api/admin/restaurants'],
  });

  const restaurants = restaurantsData?.restaurants || [];

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/admin/categories'],
  });

  const { data: restaurantSections = [], refetch: refetchSections } = useQuery<any[]>({
    queryKey: ['/api/admin/restaurants', sectionsRestaurant?.id, 'sections'],
    queryFn: async () => {
      if (!sectionsRestaurant?.id) return [];
      const res = await apiRequest('GET', `/api/admin/restaurants/${sectionsRestaurant.id}/sections`);
      return res.json();
    },
    enabled: !!sectionsRestaurant?.id && isSectionsDialogOpen,
  });

  const createSectionMutation = useMutation({
    mutationFn: async ({ restaurantId, name }: { restaurantId: string; name: string }) => {
      const res = await apiRequest('POST', '/api/admin/restaurant-sections', { restaurantId, name, isActive: true });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants', sectionsRestaurant?.id, 'sections'] });
      setNewSectionName('');
      toast({ title: 'تم إضافة القسم', description: 'تم إضافة القسم الجديد بنجاح' });
    },
    onError: () => toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في إضافة القسم' }),
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, name, isActive }: { id: string; name: string; isActive?: boolean }) => {
      const res = await apiRequest('PUT', `/api/admin/restaurant-sections/${id}`, { name, isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants', sectionsRestaurant?.id, 'sections'] });
      setEditingSectionId(null);
      setEditingSectionName('');
      toast({ title: 'تم تحديث القسم' });
    },
    onError: () => toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في تحديث القسم' }),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/admin/restaurant-sections/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants', sectionsRestaurant?.id, 'sections'] });
      toast({ title: 'تم حذف القسم' });
    },
    onError: () => toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في حذف القسم' }),
  });

  const createRestaurantMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const submitData = {
        ...data,
        deliveryFee: 0,
        perKmFee: 0,
        commissionRate: data.commissionRate ? parseFloat(data.commissionRate) : 10,
        minimumOrder: parseFloat(data.minimumOrder) || 0,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
      };
      const response = await apiRequest('POST', '/api/admin/restaurants', submitData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants'] });
      toast({
        title: "تم إضافة المتجر",
        description: "تم إضافة المتجر الجديد بنجاح",
      });
      resetForm();
      setIsDialogOpen(false);
    },
  });

  const updateRestaurantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const submitData = {
        ...data,
        commissionRate: data.commissionRate != null ? parseFloat(data.commissionRate) : undefined,
        minimumOrder: data.minimumOrder != null ? parseFloat(data.minimumOrder) : undefined,
        latitude: data.latitude === '' ? null : data.latitude != null ? parseFloat(data.latitude) : undefined,
        longitude: data.longitude === '' ? null : data.longitude != null ? parseFloat(data.longitude) : undefined,
      };
      const response = await apiRequest('PUT', `/api/admin/restaurants/${id}`, submitData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants'] });
      toast({
        title: "تم تحديث المتجر",
        description: "تم تحديث بيانات المتجر بنجاح",
      });
      resetForm();
      setEditingRestaurant(null);
      setIsDialogOpen(false);
    },
  });

  const deleteRestaurantMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/restaurants/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants'] });
      toast({
        title: "تم حذف المتجر",
        description: "تم حذف المتجر بنجاح",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image: '',
      phone: '',
      deliveryTime: '',
      commissionRate: '10',
      minimumOrder: '0',
      isOpen: true,
      categoryId: '',
      openingTime: '08:00',
      closingTime: '23:00',
      workingDays: '0,1,2,3,4,5,6',
      isTemporarilyClosed: false,
      temporaryCloseReason: '',
      // الحقول المفقودة من قاعدة البيانات
      latitude: '',
      longitude: '',
      address: '',
      isFeatured: false,
      isNew: false,
      isActive: true,
    });
    setEditingRestaurant(null);
  };

  const handleEdit = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setFormData({
      name: restaurant.name,
      description: restaurant.description || '',
      phone: restaurant.phone || '',
      image: restaurant.image,
      deliveryTime: restaurant.deliveryTime,
      commissionRate: restaurant.commissionRate || '10',
      minimumOrder: restaurant.minimumOrder || '0',
      isOpen: restaurant.isOpen,
      categoryId: restaurant.categoryId || '',
      openingTime: restaurant.openingTime || '08:00',
      closingTime: restaurant.closingTime || '23:00',
      workingDays: restaurant.workingDays || '0,1,2,3,4,5,6',
      isTemporarilyClosed: restaurant.isTemporarilyClosed || false,
      temporaryCloseReason: restaurant.temporaryCloseReason || '',
      latitude: restaurant.latitude || '',
      longitude: restaurant.longitude || '',
      address: restaurant.address || '',
      isFeatured: restaurant.isFeatured || false,
      isNew: restaurant.isNew || false,
      isActive: restaurant.isActive !== false,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المتجر",
        variant: "destructive",
      });
      return;
    }

    if (!formData.deliveryTime.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال وقت التوصيل",
        variant: "destructive",
      });
      return;
    }

    // Validate numeric fields
    const minimumOrder = parseFloat(formData.minimumOrder);
    const commissionRate = parseFloat(formData.commissionRate);

    if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال نسبة عمولة صحيحة (0-100)",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(minimumOrder) || minimumOrder < 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال حد أدنى للطلب صحيح",
        variant: "destructive",
      });
      return;
    }

    // Working days validation
    const workingDaysArray = formData.workingDays.split(',').filter(Boolean);
    if (workingDaysArray.length === 0) {
      toast({
        title: "خطأ في أيام العمل",
        description: "يجب اختيار يوم واحد على الأقل للعمل",
        variant: "destructive",
      });
      return;
    }

    // Time validation
    if (formData.openingTime && formData.closingTime) {
      const [openHour, openMin] = formData.openingTime.split(':').map(Number);
      const [closeHour, closeMin] = formData.closingTime.split(':').map(Number);
      
      const openingMinutes = openHour * 60 + openMin;
      const closingMinutes = closeHour * 60 + closeMin;
      
      if (openingMinutes >= closingMinutes) {
        toast({
          title: "خطأ في أوقات العمل",
          description: "وقت الفتح يجب أن يكون قبل وقت الإغلاق",
          variant: "destructive",
        });
        return;
      }
    }

    // Temporary closure validation
    if (formData.isTemporarilyClosed && !formData.temporaryCloseReason.trim()) {
      toast({
        title: "خطأ في الإغلاق المؤقت",
        description: "يرجى إدخال سبب الإغلاق المؤقت",
        variant: "destructive",
      });
      return;
    }

    if (editingRestaurant) {
      updateRestaurantMutation.mutate({ id: editingRestaurant.id, data: formData });
    } else {
      createRestaurantMutation.mutate(formData);
    }
  };

  const toggleRestaurantStatus = (restaurant: Restaurant, field: 'isOpen') => {
    updateRestaurantMutation.mutate({
      id: restaurant.id,
      data: { [field]: !restaurant[field] }
    });
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories?.find(c => c.id === categoryId);
    return category?.name || 'غير محدد';
  };
  // فلترة المتاجر حسب البحث
  const filteredRestaurants = restaurants.filter((restaurant) =>
    restaurant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCategoryName(restaurant.categoryId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // فتح موقع المتجر على خرائط جوجل
  const openRestaurantOnMap = (restaurant: Restaurant) => {
    if (restaurant.latitude && restaurant.longitude) {
      const url = `https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}`;
      window.open(url, '_blank');
    } else if (restaurant.address) {
      const encodedAddress = encodeURIComponent(restaurant.address);
      const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      window.open(url, '_blank');
    } else {
      toast({
        title: "موقع غير متوفر",
        description: "لم يتم تحديد موقع لهذا المتجر",
        variant: "destructive",
      });
    }
  };

  // دالة لتحويل القيم الرقمية من string إلى number للعرض
  const parseDecimal = (value: string | null): number => {
    if (!value) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Store className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة المتاجر</h1>
            <p className="text-muted-foreground">إدارة المتاجر والعلامات التجارية</p>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="gap-2"
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
              data-testid="button-add-restaurant"
            >
              <Plus className="h-4 w-4" />
              إضافة متجر جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRestaurant ? 'تعديل بيانات المتجر' : 'إضافة متجر جديد'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">اسم المتجر</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="أدخل اسم المتجر"
                    required
                    data-testid="input-restaurant-name"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">رقم هاتف المتجر</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+967xxxxxxxx"
                    data-testid="input-restaurant-phone"
                  />
                </div>

                <div>
                  <Label htmlFor="category">القسم</Label>
                  <Select value={formData.categoryId} onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}>
                    <SelectTrigger data-testid="select-restaurant-category">
                      <SelectValue placeholder="اختر قسم المتجر" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="وصف المتجر"
                  rows={3}
                  data-testid="input-restaurant-description"
                />
              </div>

              <div>
                <Label htmlFor="image">رابط الصورة</Label>
                <div className="flex gap-2">
                  <Input
                    id="image"
                    value={formData.image}
                    onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                    required
                    data-testid="input-restaurant-image"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('restaurant-file-upload')?.click()}
                    data-testid="button-select-image"
                  >
                    اختيار صورة
                  </Button>
                  <input
                    id="restaurant-file-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const result = event.target?.result as string;
                          setFormData(prev => ({ ...prev, image: result }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="deliveryTime">وقت التوصيل</Label>
                  <Input
                    id="deliveryTime"
                    value={formData.deliveryTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, deliveryTime: e.target.value }))}
                    placeholder="30-45 دقيقة"
                    required
                    data-testid="input-restaurant-delivery-time"
                  />
                </div>

                <div>
                  <Label htmlFor="commissionRate">نسبة عمولة الشركة (%)</Label>
                  <Input
                    id="commissionRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.commissionRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, commissionRate: e.target.value }))}
                    data-testid="input-restaurant-commission-rate"
                  />
                </div>

                <div>
                  <Label htmlFor="minimumOrder">الحد الأدنى للطلب (ريال)</Label>
                  <Input
                    id="minimumOrder"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minimumOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, minimumOrder: e.target.value }))}
                    data-testid="input-restaurant-minimum-order"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isOpen">مفتوح للطلبات</Label>
                <Switch
                  id="isOpen"
                  checked={formData.isOpen}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isOpen: checked }))}
                  data-testid="switch-restaurant-open"
                />
              </div>

              {/* Restaurant Hours Section */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold text-foreground">أوقات العمل</h3>
                
                {/* Opening and Closing Times */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="openingTime">وقت الفتح</Label>
                    <Input
                      id="openingTime"
                      type="time"
                      value={formData.openingTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, openingTime: e.target.value }))}
                      data-testid="input-restaurant-opening-time"
                    />
                  </div>
                  <div>
                    <Label htmlFor="closingTime">وقت الإغلاق</Label>
                    <Input
                      id="closingTime"
                      type="time"
                      value={formData.closingTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, closingTime: e.target.value }))}
                      data-testid="input-restaurant-closing-time"
                    />
                  </div>
                </div>

                {/* Working Days */}
                <div>
                  <Label className="text-base font-medium">أيام العمل</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                    {[
                      { value: '0', label: 'الأحد' },
                      { value: '1', label: 'الإثنين' },
                      { value: '2', label: 'الثلاثاء' },
                      { value: '3', label: 'الأربعاء' },
                      { value: '4', label: 'الخميس' },
                      { value: '5', label: 'الجمعة' },
                      { value: '6', label: 'السبت' },
                    ].map((day) => {
                      const workingDaysArray = formData.workingDays.split(',').filter(Boolean);
                      const isChecked = workingDaysArray.includes(day.value);
                      
                      return (
                        <div key={day.value} className="flex items-center space-x-2 space-x-reverse">
                          <Checkbox
                            id={`day-${day.value}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const currentDays = formData.workingDays.split(',').filter(Boolean);
                              let newDays;
                              if (checked) {
                                newDays = [...currentDays, day.value].sort((a, b) => parseInt(a) - parseInt(b));
                              } else {
                                newDays = currentDays.filter(d => d !== day.value);
                              }
                              setFormData(prev => ({ ...prev, workingDays: newDays.join(',') }));
                            }}
                            data-testid={`checkbox-working-day-${day.value}`}
                          />
                          <Label
                            htmlFor={`day-${day.value}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {day.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Temporary Closure */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isTemporarilyClosed">إغلاق مؤقت</Label>
                    <Switch
                      id="isTemporarilyClosed"
                      checked={formData.isTemporarilyClosed}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isTemporarilyClosed: checked }))}
                      data-testid="switch-restaurant-temporarily-closed"
                    />
                  </div>
                  
                  {formData.isTemporarilyClosed && (
                    <div>
                      <Label htmlFor="temporaryCloseReason">سبب الإغلاق المؤقت</Label>
                      <Textarea
                        id="temporaryCloseReason"
                        value={formData.temporaryCloseReason}
                        onChange={(e) => setFormData(prev => ({ ...prev, temporaryCloseReason: e.target.value }))}
                        placeholder="مثال: أعمال صيانة، إجازة، ظروف خاصة..."
                        rows={2}
                        data-testid="input-restaurant-temporary-close-reason"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Location and Status Section - الحقول المفقودة من قاعدة البيانات */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold text-foreground">الموقع والإعدادات</h3>
                
                {/* Address */}
                <div>
                  <Label htmlFor="address">العنوان</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="عنوان المتجر الكامل"
                    rows={2}
                    data-testid="input-restaurant-address"
                  />
                </div>

                {/* Location Coordinates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="latitude">خط العرض (Latitude)</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                      placeholder="24.7136"
                      data-testid="input-restaurant-latitude"
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude">خط الطول (Longitude)</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                      placeholder="46.6753"
                      data-testid="input-restaurant-longitude"
                    />
                  </div>
                </div>
                
                {/* زر تحديد الموقع عبر الخريطة */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsLocationPickerOpen(true)}
                    className="flex-1"
                    data-testid="button-open-maps"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    تحديد الموقع عبر الخريطة (مدمج)
                  </Button>
                </div>

                {isLocationPickerOpen && (
                  <LocationPicker
                    isOpen={isLocationPickerOpen}
                    onClose={() => setIsLocationPickerOpen(false)}
                    onLocationSelect={(location) => {
                      setFormData(prev => ({
                        ...prev,
                        latitude: location.lat.toString(),
                        longitude: location.lng.toString(),
                        address: location.address || prev.address
                      }));
                      setIsLocationPickerOpen(false);
                      toast({
                        title: "تم تحديد الموقع",
                        description: "تم تحديث الإحداثيات والعنوان بنجاح",
                      });
                    }}
                    initialLocation={
                      formData.latitude && formData.longitude
                        ? { lat: parseFloat(formData.latitude), lng: parseFloat(formData.longitude) }
                        : undefined
                    }
                  />
                )}

                {/* Status Flags */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isActive">المتجر مفعل</Label>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                      data-testid="switch-restaurant-active"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isFeatured">متجر مميز</Label>
                    <Switch
                      id="isFeatured"
                      checked={formData.isFeatured}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isFeatured: checked }))}
                      data-testid="switch-restaurant-featured"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isNew">متجر جديد</Label>
                    <Switch
                      id="isNew"
                      checked={formData.isNew}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isNew: checked }))}
                      data-testid="switch-restaurant-new"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1 gap-2"
                  disabled={createRestaurantMutation.isPending || updateRestaurantMutation.isPending}
                  data-testid="button-save-restaurant"
                >
                  <Save className="h-4 w-4" />
                  {editingRestaurant ? 'تحديث' : 'إضافة'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(false);
                  }}
                  data-testid="button-cancel-restaurant"
                >
                  <X className="h-4 w-4" />
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* حوار إدارة الأقسام */}
      <Dialog open={isSectionsDialogOpen} onOpenChange={(open) => {
        setIsSectionsDialogOpen(open);
        if (!open) { setNewSectionName(''); setEditingSectionId(null); setEditingSectionName(''); }
      }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              إدارة أقسام: {sectionsRestaurant?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="اسم القسم الجديد (مثال: قسم البيتزا)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSectionName.trim() && sectionsRestaurant) {
                    createSectionMutation.mutate({ restaurantId: sectionsRestaurant.id, name: newSectionName.trim() });
                  }
                }}
              />
              <Button
                onClick={() => {
                  if (newSectionName.trim() && sectionsRestaurant) {
                    createSectionMutation.mutate({ restaurantId: sectionsRestaurant.id, name: newSectionName.trim() });
                  }
                }}
                disabled={!newSectionName.trim() || createSectionMutation.isPending}
                size="sm"
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                إضافة
              </Button>
            </div>

            <div className="space-y-2">
              {restaurantSections.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">لا توجد أقسام بعد</p>
                  <p className="text-xs">أضف أقساماً مثل: قسم البروست، قسم البيتزا...</p>
                </div>
              ) : (
                restaurantSections.map((section: any) => (
                  <div key={section.id} className="flex items-center gap-2 p-2 border rounded-lg">
                    {editingSectionId === section.id ? (
                      <>
                        <Input
                          value={editingSectionName}
                          onChange={(e) => setEditingSectionName(e.target.value)}
                          className="flex-1 h-8"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editingSectionName.trim()) {
                              updateSectionMutation.mutate({ id: section.id, name: editingSectionName.trim(), isActive: section.isActive });
                            }
                          }}
                        />
                        <Button size="sm" variant="ghost" onClick={() => updateSectionMutation.mutate({ id: section.id, name: editingSectionName.trim(), isActive: section.isActive })}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingSectionId(null); setEditingSectionName(''); }}>
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <span className="text-sm font-medium">{section.name}</span>
                          {!section.isActive && <Badge variant="outline" className="mr-2 text-xs">مخفي</Badge>}
                        </div>
                        <Switch
                          checked={section.isActive}
                          onCheckedChange={(checked) => updateSectionMutation.mutate({ id: section.id, name: section.name, isActive: checked })}
                          className="scale-75"
                        />
                        <Button size="sm" variant="ghost" onClick={() => { setEditingSectionId(section.id); setEditingSectionName(section.name); }}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف القسم</AlertDialogTitle>
                              <AlertDialogDescription>هل أنت متأكد من حذف قسم "{section.name}"؟</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteSectionMutation.mutate(section.id)} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* شريط البحث */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في المتاجر..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
              data-testid="input-search-restaurants"
            />
          </div>
        </CardContent>
      </Card>

      {/* Restaurants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {restaurantsLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="w-full h-48 bg-muted" />
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : filteredRestaurants?.length ? (
          filteredRestaurants.map((restaurant) => (
            <Card key={restaurant.id} className="hover:shadow-md transition-shadow overflow-hidden">
              <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                {restaurant.image ? (
                  <img 
                    src={restaurant.image} 
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store className="h-16 w-16 text-primary/50" />
                )}
              </div>
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{restaurant.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mb-2">
                      {getCategoryName(restaurant.categoryId || '')}
                    </p>
                    {restaurant.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <Phone className="h-3 w-3" />
                        <span>{restaurant.phone}</span>
                      </div>
                    )}
                    {restaurant.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {restaurant.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={restaurant.isOpen ? "default" : "outline"}>
                    {restaurant.isOpen ? 'مفتوح' : 'مغلق'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{restaurant.deliveryTime}</span>
                  </div>
                  {restaurant.address && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs truncate">{restaurant.address}</span>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    توصيل: {parseDecimal(restaurant.deliveryFee)} ريال
                  </div>
                  <div className="text-xs text-muted-foreground">
                    أقل طلب: {parseDecimal(restaurant.minimumOrder)} ريال
                  </div>
                  {restaurant.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>{restaurant.rating}</span>
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground">مفتوح</p>
                  <Switch
                    checked={restaurant.isOpen}
                    onCheckedChange={() => toggleRestaurantStatus(restaurant, 'isOpen')}
                    data-testid={`switch-restaurant-open-${restaurant.id}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 col-span-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
                    onClick={() => { setSectionsRestaurant(restaurant); setIsSectionsDialogOpen(true); }}
                    data-testid={`button-sections-${restaurant.id}`}
                  >
                    <Layers className="h-3 w-3" />
                    إدارة الأقسام
                  </Button>

                  {(restaurant.latitude && restaurant.longitude) || restaurant.address ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRestaurantOnMap(restaurant)}
                      className="gap-1"
                      data-testid={`button-map-${restaurant.id}`}
                    >
                      <MapPin className="h-3 w-3" />
                      خريطة
                    </Button>
                  ) : (
                    <div></div>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => handleEdit(restaurant)}
                    data-testid={`button-edit-restaurant-${restaurant.id}`}
                  >
                    <Edit className="h-3 w-3" />
                    تعديل
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive gap-1 col-span-2"
                        data-testid={`button-delete-restaurant-${restaurant.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                        حذف المتجر
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من حذف المتجر "{restaurant.name}" نهائياً؟
                          <br /><br />
                          <strong className="text-red-600">تحذير:</strong> سيتم حذف:
                          <ul className="list-disc list-inside mt-2 text-sm">
                            <li>جميع منتجات المتجر</li>
                            <li>جميع أقسام القائمة</li>
                            <li>جميع البيانات المرتبطة</li>
                          </ul>
                          <br />
                          هذا الإجراء لا يمكن التراجع عنه!
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteRestaurantMutation.mutate(restaurant.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          حذف نهائياً
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
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchTerm ? 'لا توجد نتائج' : 'لا توجد مطاعم'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'جرب البحث بكلمات مختلفة' : 'ابدأ بإضافة المتاجر والمتاجر'}
            </p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-restaurant">
              إضافة المتجر الأول
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}