import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { Restaurant, Category } from '@shared/schema'
import { Plus, Search, Edit, Trash2, Store, MapPin, Clock, Star, Map as MapIcon } from 'lucide-react'
import ImageUpload from '@/components/ImageUpload'
import MapComponent from './maps/MapComponent'

export default function RestaurantManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState<Partial<Restaurant>>({
    name: '',
    description: '',
    address: '',
    categoryId: '',
    isOpen: true,
    rating: '4.5',
    deliveryTime: '30-45',
    deliveryFee: '5',
    minimumOrder: '50',
    image: '',
    latitude: '',
    longitude: '',
    isFeatured: false,
    isNew: false,
    isActive: true
  })

  // Fetch restaurants
  const { data: restaurants = [], isLoading } = useQuery<Restaurant[]>({
    queryKey: ['/api/restaurants'],
    enabled: true
  })

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/admin/categories'],
    enabled: true
  })

  // Create restaurant mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<Restaurant>) => 
      apiRequest('POST', '/api/restaurants', data),
    onSuccess: () => {
      toast({ title: 'تم إنشاء المتجر بنجاح' })
      setIsDialogOpen(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] })
    },
    onError: () => {
      toast({ title: 'خطأ في إنشاء المتجر', variant: 'destructive' })
    }
  })

  // Update restaurant mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Restaurant> }) => 
      apiRequest('PUT', `/api/restaurants/${id}`, data),
    onSuccess: () => {
      toast({ title: 'تم تحديث المتجر بنجاح' })
      setIsDialogOpen(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] })
    },
    onError: () => {
      toast({ title: 'خطأ في تحديث المتجر', variant: 'destructive' })
    }
  })

  // Delete restaurant mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest('DELETE', `/api/restaurants/${id}`),
    onSuccess: () => {
      toast({ title: 'تم حذف المتجر بنجاح' })
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] })
    },
    onError: () => {
      toast({ title: 'خطأ في حذف المتجر', variant: 'destructive' })
    }
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      address: '',
      categoryId: '',
      isOpen: true,
      rating: '4.5',
      deliveryTime: '30-45',
      deliveryFee: '5',
      minimumOrder: '50',
      image: '',
      latitude: '',
      longitude: '',
      isFeatured: false,
      isNew: false,
      isActive: true
    })
    setSelectedRestaurant(null)
    setIsEditing(false)
  }

  const handleSubmit = () => {
    if (!formData.name || !formData.image || !formData.deliveryTime) {
      toast({ title: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' })
      return
    }

    // Clean data for API - only send defined fields that match schema
    const submitData: Partial<Restaurant> = {
      name: formData.name,
      image: formData.image,
      deliveryTime: formData.deliveryTime,
      description: formData.description || null,
      address: formData.address || null,
      categoryId: formData.categoryId || null,
      deliveryFee: formData.deliveryFee || "0",
      minimumOrder: formData.minimumOrder || "0", 
      rating: formData.rating || "4.5",
      latitude: formData.latitude || null,
      longitude: formData.longitude || null,
      isOpen: formData.isOpen ?? true,
      isFeatured: formData.isFeatured ?? false,
      isNew: formData.isNew ?? false,
      isActive: formData.isActive ?? true
    }

    if (isEditing && selectedRestaurant) {
      updateMutation.mutate({ id: selectedRestaurant.id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const handleEdit = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setFormData({
      name: restaurant.name || '',
      description: restaurant.description || '',
      address: restaurant.address || '',
      categoryId: restaurant.categoryId || '',
      isOpen: restaurant.isOpen,
      rating: restaurant.rating || '4.5',
      deliveryTime: restaurant.deliveryTime || '30-45',
      deliveryFee: restaurant.deliveryFee || '5',
      minimumOrder: restaurant.minimumOrder || '50',
      image: restaurant.image || '',
      latitude: restaurant.latitude || '',
      longitude: restaurant.longitude || '',
      isFeatured: restaurant.isFeatured || false,
      isNew: restaurant.isNew || false,
      isActive: restaurant.isActive
    })
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  const handleMapSelect = (lat: number, lng: number, address: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString(),
      address: address || prev.address
    }))
    setIsMapOpen(false)
  }

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المتجر؟')) {
      deleteMutation.mutate(id)
    }
  }

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'غير محدد'
    const category = categories.find(cat => cat.id === categoryId)
    return category?.name || 'غير محدد'
  }

  const filteredRestaurants = restaurants.filter((restaurant) =>
    restaurant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCategoryName(restaurant.categoryId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.address?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">جاري تحميل المتاجر...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              إدارة المتاجر
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => {
                    resetForm()
                    setIsDialogOpen(true)
                  }}
                  data-testid="button-add-restaurant"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة متجر جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
                <DialogHeader>
                  <DialogTitle>
                    {isEditing ? 'تعديل المتجر' : 'إضافة متجر جديد'}
                  </DialogTitle>
                  <DialogDescription>
                    {isEditing ? 'قم بتحديث بيانات المتجر' : 'أدخل بيانات المتجر الجديد'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">اسم المتجر *</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="اسم المتجر"
                      data-testid="input-restaurant-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoryId">الفئة</Label>
                    <Select value={formData.categoryId || ''} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="اختر الفئة" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">الوصف</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="وصف المتجر"
                      data-testid="input-restaurant-description"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">العنوان *</Label>
                    <Input
                      id="address"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="عنوان المتجر"
                      data-testid="input-restaurant-address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryTime">وقت التوصيل *</Label>
                    <Input
                      id="deliveryTime"
                      value={formData.deliveryTime || ''}
                      onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                      placeholder="30-45"
                      data-testid="input-delivery-time"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryFee">رسوم التوصيل (شيكل)</Label>
                    <Input
                      id="deliveryFee"
                      type="number"
                      value={formData.deliveryFee || ''}
                      onChange={(e) => setFormData({ ...formData, deliveryFee: e.target.value })}
                      placeholder="5"
                      data-testid="input-delivery-fee"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minimumOrder">الحد الأدنى للطلب (شيكل)</Label>
                    <Input
                      id="minimumOrder"
                      type="number"
                      value={formData.minimumOrder || ''}
                      onChange={(e) => setFormData({ ...formData, minimumOrder: e.target.value })}
                      placeholder="50"
                      data-testid="input-minimum-order"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rating">التقييم</Label>
                    <Input
                      id="rating"
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formData.rating || ''}
                      onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                      placeholder="4.5"
                      data-testid="input-rating"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <ImageUpload
                      label="صورة المتجر *"
                      value={formData.image || ''}
                      onChange={(url) => setFormData({ ...formData, image: url })}
                      bucket="restaurants"
                      required={true}
                      data-testid="input-restaurant-image"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="latitude">خط العرض</Label>
                    <div className="flex gap-2">
                      <Input
                        id="latitude"
                        value={formData.latitude || ''}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                        placeholder="31.5204"
                        data-testid="input-latitude"
                      />
                      <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" title="تحديد من الخريطة">
                            <MapIcon className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
                          <DialogHeader className="p-4 border-b">
                            <DialogTitle>تحديد موقع المتجر</DialogTitle>
                          </DialogHeader>
                          <div className="h-[400px] w-full">
                            <MapComponent 
                              center={[
                                formData.latitude ? parseFloat(formData.latitude) : 15.3694, 
                                formData.longitude ? parseFloat(formData.longitude) : 44.1910
                              ]}
                              zoom={14}
                              onLocationSelect={handleMapSelect}
                            />
                          </div>
                          <div className="p-4 bg-gray-50 text-xs text-center text-gray-500">
                            انقر على الخريطة لتحديد موقع المتجر بدقة
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">خط الطول</Label>
                    <Input
                      id="longitude"
                      value={formData.longitude || ''}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="34.4668"
                      data-testid="input-longitude"
                    />
                  </div>
                  <div className="flex items-center space-x-2 md:col-span-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isOpen"
                        checked={formData.isOpen || false}
                        onChange={(e) => setFormData({ ...formData, isOpen: e.target.checked })}
                        data-testid="checkbox-is-open"
                      />
                      <Label htmlFor="isOpen">المتجر مفتوح</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isFeatured"
                        checked={formData.isFeatured || false}
                        onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                        data-testid="checkbox-is-featured"
                      />
                      <Label htmlFor="isFeatured">متجر مفضل</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isNew"
                        checked={formData.isNew || false}
                        onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                        data-testid="checkbox-is-new"
                      />
                      <Label htmlFor="isNew">متجر جديد</Label>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    إلغاء
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save"
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="البحث في المتاجر..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
                data-testid="input-search-restaurants"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restaurants List */}
      <Card>
        <CardContent className="p-6">
          {filteredRestaurants.length === 0 ? (
            <div className="text-center py-12">
              <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'لا توجد نتائج' : 'لا توجد مطاعم'}
              </h3>
              <p className="text-gray-600">
                {searchTerm ? 'جرب البحث بكلمات مختلفة' : 'ابدأ بإضافة متجر جديد'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredRestaurants.map((restaurant: Restaurant) => (
                <Card key={restaurant.id} className="border hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900" data-testid={`text-restaurant-name-${restaurant.id}`}>
                          {restaurant.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">الفئة: {getCategoryName(restaurant.categoryId)}</p>
                        <p className="text-sm text-gray-500 line-clamp-2">{restaurant.description}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge 
                          variant={restaurant.isOpen ? "default" : "secondary"}
                          className={restaurant.isOpen ? "bg-green-100 text-green-800" : ""}
                          data-testid={`badge-status-${restaurant.id}`}
                        >
                          {restaurant.isOpen ? "مفتوح" : "مغلق"}
                        </Badge>
                        {restaurant.isFeatured && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                            مفضل
                          </Badge>
                        )}
                        {restaurant.isNew && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                            جديد
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{restaurant.address}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{restaurant.deliveryTime} دقيقة</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span>{restaurant.rating}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>رسوم التوصيل: {restaurant.deliveryFee} </span>
                        <span>الحد الأدنى: {restaurant.minimumOrder} </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(restaurant)}
                        data-testid={`button-edit-${restaurant.id}`}
                      >
                        <Edit className="h-4 w-4 ml-1" />
                        تعديل
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(restaurant.id)}
                        data-testid={`button-delete-${restaurant.id}`}
                      >
                        <Trash2 className="h-4 w-4 ml-1" />
                        حذف
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}