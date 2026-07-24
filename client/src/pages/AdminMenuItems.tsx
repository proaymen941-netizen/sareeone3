import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Package, Save, X, Search, Store, Layers } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { MenuItem, Restaurant } from '@shared/schema';

export default function AdminMenuItems() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRestaurantFilter, setSelectedRestaurantFilter] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    image: '',
    category: '',
    isAvailable: true,
    isSpecialOffer: false,
    restaurantId: '',
    brand: '',
    sizes: '',
    colors: '',
    salesCount: '0',
    rating: '5',
    isFeatured: false,
    isNew: true,
  });

  const { data: restaurantsData } = useQuery<{restaurants: Restaurant[]}>({
    queryKey: ['/api/admin/restaurants'],
  });

  const restaurants = restaurantsData?.restaurants || [];

  const { data: restaurantSections = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/restaurants', formData.restaurantId, 'sections'],
    queryFn: async () => {
      if (!formData.restaurantId) return [];
      const res = await apiRequest('GET', `/api/admin/restaurants/${formData.restaurantId}/sections`);
      return res.json();
    },
    enabled: !!formData.restaurantId,
  });

  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ['/api/admin/menu-items'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/menu-items');
      if (!response.ok) throw new Error('فشل في جلب المنتجات');
      return response.json();
    },
  });

  const createMenuItemMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!data.name.trim()) throw new Error('اسم المنتج مطلوب');
      if (!data.price.trim()) throw new Error('سعر المنتج مطلوب');
      if (!data.image.trim()) throw new Error('صورة المنتج مطلوبة');
      if (!data.category.trim()) throw new Error('قسم المنتج مطلوب');
      if (!data.restaurantId) throw new Error('يجب اختيار متجر');

      const price = parseFloat(data.price);
      if (isNaN(price) || price <= 0) throw new Error('سعر المنتج يجب أن يكون رقم صحيح أكبر من صفر');

      let originalPrice = null;
      if (data.originalPrice && data.originalPrice.trim()) {
        originalPrice = parseFloat(data.originalPrice);
        if (isNaN(originalPrice) || originalPrice <= 0) throw new Error('السعر الأصلي يجب أن يكون رقم صحيح أكبر من صفر');
      }

      const submitData = {
        ...data,
        name: data.name.trim(),
        description: data.description.trim(),
        image: data.image.trim(),
        category: data.category.trim(),
        price: price.toString(),
        originalPrice: originalPrice ? originalPrice.toString() : null,
        brand: data.brand.trim() || '',
        sizes: data.sizes.trim(),
        colors: data.colors.trim(),
        salesCount: parseInt(data.salesCount) || 0,
        rating: parseFloat(data.rating) || 5,
        isFeatured: data.isFeatured,
        isNew: data.isNew,
        restaurantId: data.restaurantId,
      };
      
      const response = await apiRequest('POST', '/api/admin/menu-items', submitData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/menu-items'] });
      toast({ title: "تم إضافة المنتج", description: "تم إضافة المنتج الجديد بنجاح" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "خطأ في إضافة المنتج", description: error.message });
    },
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      if (!data.name.trim()) throw new Error('اسم المنتج مطلوب');
      if (!data.price.trim()) throw new Error('سعر المنتج مطلوب');
      if (!data.image.trim()) throw new Error('صورة المنتج مطلوبة');
      if (!data.category.trim()) throw new Error('قسم المنتج مطلوب');
      if (!data.restaurantId) throw new Error('يجب اختيار متجر');

      const price = parseFloat(data.price);
      if (isNaN(price) || price <= 0) throw new Error('سعر المنتج يجب أن يكون رقم صحيح أكبر من صفر');

      let originalPrice = null;
      if (data.originalPrice && data.originalPrice.trim()) {
        originalPrice = parseFloat(data.originalPrice);
        if (isNaN(originalPrice) || originalPrice <= 0) throw new Error('السعر الأصلي يجب أن يكون رقم صحيح أكبر من صفر');
      }

      const submitData = {
        ...data,
        name: data.name.trim(),
        description: data.description.trim(),
        image: data.image.trim(),
        category: data.category.trim(),
        price: price.toString(),
        originalPrice: originalPrice ? originalPrice.toString() : null,
        brand: data.brand.trim() || '',
        sizes: data.sizes.trim(),
        colors: data.colors.trim(),
        salesCount: parseInt(data.salesCount) || 0,
        rating: parseFloat(data.rating) || 5,
        isFeatured: data.isFeatured,
        isNew: data.isNew,
        restaurantId: data.restaurantId,
      };
      
      const response = await apiRequest('PUT', `/api/admin/menu-items/${id}`, submitData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/menu-items'] });
      toast({ title: "تم تحديث المنتج", description: "تم تحديث المنتج بنجاح" });
      resetForm();
      setEditingItem(null);
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "خطأ في تحديث المنتج", description: error.message });
    },
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/menu-items/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/menu-items'] });
      toast({ title: "تم حذف المنتج", description: "تم حذف المنتج بنجاح" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      originalPrice: '',
      image: '',
      category: '',
      isAvailable: true,
      isSpecialOffer: false,
      restaurantId: restaurants[0]?.id || '',
      brand: '',
      sizes: '',
      colors: '',
      salesCount: '0',
      rating: '5',
      isFeatured: false,
      isNew: true,
    });
    setEditingItem(null);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price?.toString() || '',
      originalPrice: item.originalPrice?.toString() || '',
      image: item.image,
      category: item.category,
      isAvailable: item.isAvailable,
      isSpecialOffer: item.isSpecialOffer,
      restaurantId: item.restaurantId || restaurants[0]?.id || '',
      brand: item.brand || '',
      sizes: item.sizes || '',
      colors: item.colors || '',
      salesCount: item.salesCount?.toString() || '0',
      rating: item.rating?.toString() || '5',
      isFeatured: item.isFeatured || false,
      isNew: item.isNew ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.price) {
      toast({ title: "خطأ", description: "يرجى إدخال جميع البيانات المطلوبة", variant: "destructive" });
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال سعر صحيح للمنتج", variant: "destructive" });
      return;
    }

    if (formData.originalPrice) {
      const originalPrice = parseFloat(formData.originalPrice);
      if (isNaN(originalPrice) || originalPrice <= 0) {
        toast({ title: "خطأ", description: "يرجى إدخال السعر الأصلي صحيح", variant: "destructive" });
        return;
      }
    }

    const dataWithRestaurant = { 
      ...formData, 
      restaurantId: formData.restaurantId || restaurants[0]?.id || '',
      originalPrice: formData.originalPrice.trim() || ''
    };

    if (editingItem) {
      updateMenuItemMutation.mutate({ id: editingItem.id, data: dataWithRestaurant });
    } else {
      createMenuItemMutation.mutate(dataWithRestaurant);
    }
  };

  const toggleItemStatus = (item: any, field: 'isAvailable' | 'isSpecialOffer' | 'isFeatured' | 'isNew') => {
    updateMenuItemMutation.mutate({
      id: item.id,
      data: { 
        name: item.name,
        description: item.description || '',
        price: item.price || '',
        originalPrice: item.originalPrice || '',
        image: item.image,
        category: item.category,
        isAvailable: field === 'isAvailable' ? !item[field] : item.isAvailable,
        isSpecialOffer: field === 'isSpecialOffer' ? !item[field] : item.isSpecialOffer,
        isFeatured: field === 'isFeatured' ? !item[field] : (item.isFeatured || false),
        isNew: field === 'isNew' ? !item[field] : (item.isNew ?? true),
        restaurantId: item.restaurantId || '',
        brand: item.brand || '',
        sizes: item.sizes || '',
        colors: item.colors || '',
        salesCount: item.salesCount?.toString() || '0',
        rating: item.rating?.toString() || '5',
      }
    });
  };

  const parseDecimal = (value: string | null): number => {
    if (!value) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const filteredMenuItems = menuItems?.filter((item) => {
    const matchesSearch = !searchTerm || 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRestaurant = selectedRestaurantFilter === 'all' || item.restaurantId === selectedRestaurantFilter;
    return matchesSearch && matchesRestaurant;
  });

  const getRestaurantName = (id: string) => {
    return restaurants.find(r => r.id === id)?.name || '';
  };

  const activeSections = restaurantSections.filter((s: any) => s.isActive);

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Package className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">إدارة المنتجات</h1>
              <p className="text-sm text-muted-foreground">إدارة منتجات جميع المتاجر والمطاعم</p>
            </div>
          </div>
          <Button
            className="gap-2"
            onClick={() => { resetForm(); setIsDialogOpen(true); }}
            data-testid="button-add-menu-item"
          >
            <Plus className="h-4 w-4" />
            إضافة منتج
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'تعديل المنتج' : 'إضافة منتج جديد'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="restaurantId">المتجر / المطعم *</Label>
              <Select
                value={formData.restaurantId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, restaurantId: value, category: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المتجر أو المطعم" />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map((restaurant) => (
                    <SelectItem key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name">اسم المنتج *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="أدخل اسم المنتج"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">وصف المنتج</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="وصف المنتج"
                rows={2}
              />
            </div>

            <div>
              <ImageUpload
                label="صورة المنتج *"
                value={formData.image}
                onChange={(url) => setFormData(prev => ({ ...prev, image: url }))}
                bucket="menu-items"
                required={true}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">
                  <span className="flex items-center gap-1">
                    <Layers className="h-4 w-4" />
                    {activeSections.length > 0 ? 'قسم المنتج (من أقسام المتجر)' : 'قسم المنتج'}
                  </span>
                </Label>
                {activeSections.length > 0 ? (
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر القسم" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSections.map((section: any) => (
                        <SelectItem key={section.id} value={section.name}>
                          {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      placeholder={formData.restaurantId ? "لا توجد أقسام - أدخل اسم القسم يدوياً" : "اختر المتجر أولاً ثم أدخل القسم"}
                      required
                    />
                    {formData.restaurantId && (
                      <p className="text-xs text-amber-600">
                        💡 لم يتم إضافة أقسام لهذا المتجر بعد. يمكنك إدارة الأقسام من صفحة المتاجر.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="price">السعر (ريال) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="originalPrice">السعر الأصلي</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.originalPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="salesCount">عدد المبيعات</Label>
                <Input
                  id="salesCount"
                  type="number"
                  min="0"
                  value={formData.salesCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, salesCount: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="rating">التقييم (1-5)</Label>
                <Input
                  id="rating"
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={formData.rating}
                  onChange={(e) => setFormData(prev => ({ ...prev, rating: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="isAvailable">متوفر</Label>
                <Switch
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAvailable: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isSpecialOffer">عرض خاص</Label>
                <Switch
                  id="isSpecialOffer"
                  checked={formData.isSpecialOffer}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isSpecialOffer: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isFeatured">مميز</Label>
                <Switch
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isFeatured: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isNew">جديد</Label>
                <Switch
                  id="isNew"
                  checked={formData.isNew}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isNew: checked }))}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                className="flex-1 gap-2"
                disabled={createMenuItemMutation.isPending || updateMenuItemMutation.isPending}
                data-testid="button-save-menu-item"
              >
                <Save className="h-4 w-4" />
                {editingItem ? 'تحديث' : 'إضافة'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => { resetForm(); setIsDialogOpen(false); }}
                data-testid="button-cancel-menu-item"
              >
                <X className="h-4 w-4" />
                إلغاء
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في المنتجات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={selectedRestaurantFilter} onValueChange={setSelectedRestaurantFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="جميع المتاجر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المتاجر</SelectItem>
                {restaurants.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
        ) : filteredMenuItems?.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد منتجات</p>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              إضافة أول منتج
            </Button>
          </div>
        ) : (
          filteredMenuItems?.map((item: any) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center gap-4 p-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{item.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {item.restaurantId && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Store className="h-3 w-3" />
                              {getRestaurantName(item.restaurantId)}
                            </span>
                          )}
                          {item.category && (
                            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-primary">{parseDecimal(item.price).toFixed(2)} ريال</div>
                        {item.originalPrice && (
                          <div className="text-xs text-muted-foreground line-through">
                            {parseDecimal(item.originalPrice).toFixed(2)} ريال
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={item.isAvailable}
                          onCheckedChange={() => toggleItemStatus(item, 'isAvailable')}
                          className="scale-75"
                        />
                        <span className="text-xs">{item.isAvailable ? 'متوفر' : 'غير متوفر'}</span>
                      </div>
                      {item.isSpecialOffer && <Badge variant="secondary" className="text-xs">عرض خاص</Badge>}
                      {item.isFeatured && <Badge className="text-xs bg-amber-100 text-amber-800">مميز</Badge>}
                      {item.isNew && <Badge className="text-xs bg-green-100 text-green-800">جديد</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
                      data-testid={`button-edit-menu-item-${item.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>حذف المنتج</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل أنت متأكد من حذف منتج "{item.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMenuItemMutation.mutate(item.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            حذف
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
