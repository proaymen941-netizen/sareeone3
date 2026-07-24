import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Plus, Edit, Trash2, Save, X, Percent } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { SpecialOffer, Restaurant } from '@shared/schema';

type DiscountType = 'percent' | 'amount' | 'none';
type SectionMode = 'auto' | 'existing';
type OfferType = 'discount' | 'bundle';
type DiscountScope = 'store' | 'section' | 'category';

export function AdminSpecialOffers() {
  const [, setLocation] = useLocation();
  const [editingOffer, setEditingOffer] = useState<any | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    offerType: 'discount' as OfferType,
    discountType: 'percent' as DiscountType,
    discountPercent: '',
    discountAmount: '',
    discountScope: 'store' as DiscountScope,
    bundlePrice: '',
    minimumOrder: '',
    validUntil: '',
    showBadge: true,
    badgeText1: 'طازج يومياً',
    badgeText2: 'عروض حصرية',
    isActive: true,
    restaurantId: '',
    sectionMode: 'auto' as SectionMode,
    sectionId: '',
  });

  // العروض الحالية
  const { data: offers, isLoading } = useQuery<any[]>({
    queryKey: ['/api/special-offers'],
  });

  // قائمة المتاجر
  const { data: restaurantsResp } = useQuery<{ restaurants: Restaurant[] } | Restaurant[]>({
    queryKey: ['/api/admin/restaurants'],
  });
  const restaurants: Restaurant[] = Array.isArray(restaurantsResp)
    ? (restaurantsResp as Restaurant[])
    : (restaurantsResp?.restaurants || []);

  // أقسام المتجر المختار
  const { data: sectionsData = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/restaurants', formData.restaurantId, 'sections'],
    queryFn: async () => {
      if (!formData.restaurantId) return [];
      const res = await fetch(`/api/admin/restaurants/${formData.restaurantId}/sections`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!formData.restaurantId,
  });

  // عند تغيير المتجر، نظّف القسم المختار
  useEffect(() => {
    setFormData((p) => ({ ...p, sectionId: '' }));
  }, [formData.restaurantId]);

  // إنشاء عرض
  const createOfferMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/admin/special-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to create offer');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/special-offers'] });
      setShowAddForm(false);
      resetForm();
      toast({ title: 'تم إنشاء العرض بنجاح' });
    },
    onError: (err: any) => {
      toast({ title: 'فشل في إنشاء العرض', description: err?.message, variant: 'destructive' });
    },
  });

  // تحديث عرض
  const updateOfferMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/admin/special-offers/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to update offer');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/special-offers'] });
      setEditingOffer(null);
      resetForm();
      toast({ title: 'تم تحديث العرض بنجاح' });
    },
    onError: (err: any) => {
      toast({ title: 'فشل في تحديث العرض', description: err?.message, variant: 'destructive' });
    },
  });

  // حذف عرض
  const deleteOfferMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/special-offers/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete offer');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/special-offers'] });
      toast({ title: 'تم حذف العرض بنجاح' });
    },
    onError: () => {
      toast({ title: 'فشل في حذف العرض', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image: '',
      offerType: 'discount',
      discountType: 'percent',
      discountPercent: '',
      discountAmount: '',
      discountScope: 'store',
      bundlePrice: '',
      minimumOrder: '',
      validUntil: '',
      showBadge: true,
      badgeText1: 'طازج يومياً',
      badgeText2: 'عروض حصرية',
      isActive: true,
      restaurantId: '',
      sectionMode: 'auto',
      sectionId: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.restaurantId) {
      toast({ title: 'يرجى اختيار المتجر', variant: 'destructive' });
      return;
    }
    if (formData.offerType === 'bundle' && !formData.bundlePrice) {
      toast({ title: 'يرجى إدخال سعر المجموعة', variant: 'destructive' });
      return;
    }
    if (formData.offerType === 'discount' && formData.discountScope !== 'store' && formData.sectionMode === 'existing' && !formData.sectionId) {
      toast({ title: 'يرجى اختيار قسم موجود من قائمة المتجر', variant: 'destructive' });
      return;
    }

    const dataToSubmit: any = {
      title: formData.title,
      description: formData.description,
      image: formData.image || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
      offerType: formData.offerType,
      // حقول الخصم (للعروض من نوع discount فقط)
      discountPercent:
        formData.offerType === 'discount' && formData.discountType === 'percent' && formData.discountPercent
          ? parseInt(formData.discountPercent)
          : null,
      discountAmount:
        formData.offerType === 'discount' && formData.discountType === 'amount' && formData.discountAmount
          ? parseFloat(formData.discountAmount)
          : null,
      discountScope: formData.offerType === 'discount' ? formData.discountScope : null,
      // حقول المجموعة (للعروض من نوع bundle فقط)
      bundlePrice: formData.offerType === 'bundle' && formData.bundlePrice
        ? parseFloat(formData.bundlePrice)
        : null,
      minimumOrder: formData.minimumOrder ? parseFloat(formData.minimumOrder) : 0,
      validUntil: formData.validUntil ? new Date(formData.validUntil) : null,
      showBadge: formData.showBadge,
      badgeText1: formData.badgeText1,
      badgeText2: formData.badgeText2,
      isActive: formData.isActive,
      restaurantId: formData.restaurantId,
      sectionId: formData.sectionMode === 'existing' ? formData.sectionId : null,
      autoCreateOffersSection: formData.offerType === 'bundle' || formData.sectionMode === 'auto',
    };

    if (editingOffer) {
      updateOfferMutation.mutate({ ...dataToSubmit, id: editingOffer.id });
    } else {
      createOfferMutation.mutate(dataToSubmit);
    }
  };

  const startEdit = (offer: SpecialOffer & { sectionId?: string | null }) => {
    setEditingOffer(offer);
    const offerType: OfferType = (offer as any).offerType === 'bundle' ? 'bundle' : 'discount';
    const discountType: DiscountType = offer.discountPercent
      ? 'percent'
      : offer.discountAmount
      ? 'amount'
      : 'none';
    setFormData({
      title: offer.title,
      description: offer.description || '',
      image: offer.image || '',
      offerType,
      discountType,
      discountPercent: offer.discountPercent?.toString() || '',
      discountAmount: offer.discountAmount?.toString() || '',
      discountScope: ((offer as any).discountScope as DiscountScope) || 'store',
      bundlePrice: (offer as any).bundlePrice?.toString() || '',
      minimumOrder: offer.minimumOrder?.toString() || '',
      validUntil: offer.validUntil ? new Date(offer.validUntil).toISOString().slice(0, 16) : '',
      showBadge: offer.showBadge ?? true,
      badgeText1: offer.badgeText1 || 'طازج يومياً',
      badgeText2: offer.badgeText2 || 'عروض حصرية',
      isActive: offer.isActive,
      restaurantId: (offer as any).restaurantId || '',
      sectionMode: (offer as any).sectionId ? 'existing' : 'auto',
      sectionId: (offer as any).sectionId || '',
    });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingOffer(null);
    setShowAddForm(false);
    resetForm();
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDiscountText = (offer: SpecialOffer) => {
    if (offer.discountPercent) return `${offer.discountPercent}%`;
    if (offer.discountAmount) return `${offer.discountAmount} ريال`;
    return 'بدون خصم';
  };

  const getOfferStatus = (offer: SpecialOffer) => {
    if (!offer.isActive) return { text: 'غير نشط', color: 'bg-gray-100 text-gray-700' };
    const now = new Date();
    const validUntil = offer.validUntil ? new Date(offer.validUntil) : null;
    if (validUntil && now > validUntil)
      return { text: 'منتهي الصلاحية', color: 'bg-red-100 text-red-700' };
    return { text: 'نشط', color: 'bg-green-100 text-green-700' };
  };

  const getRestaurantName = (id?: string | null) => {
    if (!id) return 'كل المتاجر';
    return restaurants.find((r) => r.id === id)?.name || 'متجر غير معروف';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/admin')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">إدارة العروض الخاصة</h1>
            <p className="text-muted-foreground">إنشاء وإدارة عروض الخصم لكل متجر</p>
          </div>
        </div>

        <Button
          onClick={() => {
            setShowAddForm(true);
            setEditingOffer(null);
            resetForm();
          }}
          className="gap-2"
          data-testid="button-add-offer"
        >
          <Plus className="h-4 w-4" />
          إضافة عرض جديد
        </Button>
      </div>

      {(showAddForm || editingOffer) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingOffer ? 'تعديل العرض' : 'إضافة عرض جديد'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* نوع العرض الرئيسي */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg bg-blue-50/30">
                <div className="md:col-span-2">
                  <Label className="text-base font-bold">نوع العرض *</Label>
                  <Select
                    value={formData.offerType}
                    onValueChange={(v: OfferType) => setFormData({ ...formData, offerType: v })}
                  >
                    <SelectTrigger data-testid="select-offer-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discount">🏷️ خصم — نسبة مئوية أو مبلغ محدد على قسم أو المتجر كله</SelectItem>
                      <SelectItem value="bundle">🎁 مجموعة — مجموعة من المنتجات بسعر محدد</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.offerType === 'bundle'
                      ? 'سيظهر هذا العرض كمنتج قابل للإضافة في السلة بالسعر المحدد'
                      : 'سيتم تطبيق الخصم تلقائياً على طلب العميل من هذا المتجر'}
                  </p>
                </div>
              </div>

              {/* اختيار المتجر والقسم */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg bg-muted/20">
                <div>
                  <Label>المتجر * <span className="text-xs text-muted-foreground">(سيتم التوجه إليه عند الضغط على "تسوق الآن")</span></Label>
                  <Select
                    value={formData.restaurantId}
                    onValueChange={(v) => setFormData({ ...formData, restaurantId: v })}
                  >
                    <SelectTrigger data-testid="select-restaurant">
                      <SelectValue placeholder="اختر المتجر" />
                    </SelectTrigger>
                    <SelectContent>
                      {restaurants.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>قسم العرض داخل المتجر</Label>
                  <Select
                    value={formData.sectionMode}
                    onValueChange={(v: SectionMode) => setFormData({ ...formData, sectionMode: v })}
                  >
                    <SelectTrigger data-testid="select-section-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">إنشاء قسم "العروض" تلقائياً</SelectItem>
                      <SelectItem value="existing">اختيار قسم موجود</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.sectionMode === 'existing' && (
                  <div className="md:col-span-2">
                    <Label>اختر القسم</Label>
                    <Select
                      value={formData.sectionId}
                      onValueChange={(v) => setFormData({ ...formData, sectionId: v })}
                      disabled={!formData.restaurantId || sectionsData.length === 0}
                    >
                      <SelectTrigger data-testid="select-section">
                        <SelectValue
                          placeholder={
                            !formData.restaurantId
                              ? 'اختر المتجر أولاً'
                              : sectionsData.length === 0
                              ? 'لا توجد أقسام لهذا المتجر'
                              : 'اختر القسم'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {sectionsData.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">عنوان العرض</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={formData.offerType === 'bundle' ? 'مثال: مجموعة العائلة الكاملة' : 'مثال: خصم 20% على جميع الطلبات'}
                    required
                    data-testid="input-title"
                  />
                </div>

                <div>
                  <ImageUpload
                    label="صورة العرض (اختياري)"
                    value={formData.image}
                    onChange={(url) => setFormData({ ...formData, image: url })}
                    bucket="offers"
                    required={false}
                    data-testid="input-special-offer-image"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">وصف العرض</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={formData.offerType === 'bundle' ? 'صف محتويات المجموعة بالتفصيل' : 'وصف تفصيلي للعرض'}
                  rows={3}
                />
              </div>

              {/* إعدادات العرض حسب النوع */}
              {formData.offerType === 'bundle' ? (
                /* إعدادات المجموعة */
                <div className="border p-4 rounded-lg bg-green-50/30 space-y-3">
                  <h4 className="font-bold text-sm text-green-700">🎁 إعدادات المجموعة</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bundlePrice">سعر المجموعة (ريال) *</Label>
                      <Input
                        id="bundlePrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.bundlePrice}
                        onChange={(e) => setFormData({ ...formData, bundlePrice: e.target.value })}
                        placeholder="99.99"
                        required
                        data-testid="input-bundle-price"
                      />
                      <p className="text-xs text-muted-foreground mt-1">السعر الذي سيضاف للسلة عند اختيار هذه المجموعة</p>
                    </div>
                    <div>
                      <Label htmlFor="minimumOrder">الحد الأدنى للطلب (ريال) — اختياري</Label>
                      <Input
                        id="minimumOrder"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.minimumOrder}
                        onChange={(e) => setFormData({ ...formData, minimumOrder: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* إعدادات الخصم */
                <div className="border p-4 rounded-lg bg-orange-50/30 space-y-3">
                  <h4 className="font-bold text-sm text-orange-700">🏷️ إعدادات الخصم</h4>

                  {/* نطاق تطبيق الخصم */}
                  <div>
                    <Label>نطاق تطبيق الخصم *</Label>
                    <Select
                      value={formData.discountScope}
                      onValueChange={(v: DiscountScope) => setFormData({ ...formData, discountScope: v })}
                    >
                      <SelectTrigger data-testid="select-discount-scope">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="store">🏪 المتجر بالكامل — يُخصم على كامل طلب العميل</SelectItem>
                        <SelectItem value="section">📂 قسم محدد في المتجر — يُخصم على المنتجات من القسم فقط</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* نوع الخصم والقيمة */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>نوع الخصم</Label>
                      <Select
                        value={formData.discountType}
                        onValueChange={(v: DiscountType) =>
                          setFormData({
                            ...formData,
                            discountType: v,
                            discountPercent: v === 'percent' ? formData.discountPercent : '',
                            discountAmount: v === 'amount' ? formData.discountAmount : '',
                          })
                        }
                      >
                        <SelectTrigger data-testid="select-discount-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">نسبة مئوية (%)</SelectItem>
                          <SelectItem value="amount">مبلغ محدد (ريال)</SelectItem>
                          <SelectItem value="none">بدون خصم (عرض ترويجي)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.discountType === 'percent' && (
                      <div>
                        <Label htmlFor="discountPercent">نسبة الخصم (%)</Label>
                        <Input
                          id="discountPercent"
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={formData.discountPercent}
                          onChange={(e) =>
                            setFormData({ ...formData, discountPercent: e.target.value })
                          }
                          placeholder="20"
                          data-testid="input-discount-percent"
                        />
                      </div>
                    )}

                    {formData.discountType === 'amount' && (
                      <div>
                        <Label htmlFor="discountAmount">مبلغ الخصم (ريال)</Label>
                        <Input
                          id="discountAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.discountAmount}
                          onChange={(e) =>
                            setFormData({ ...formData, discountAmount: e.target.value })
                          }
                          placeholder="50"
                          data-testid="input-discount-amount"
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="minimumOrder">الحد الأدنى للطلب (ريال)</Label>
                      <Input
                        id="minimumOrder"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.minimumOrder}
                        onChange={(e) => setFormData({ ...formData, minimumOrder: e.target.value })}
                        placeholder="100"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="validUntil">تاريخ الانتهاء (اختياري)</Label>
                <Input
                  id="validUntil"
                  type="datetime-local"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-lg bg-muted/20">
                <div className="flex items-center space-x-2 space-x-reverse h-full pt-6">
                  <Switch
                    id="showBadge"
                    checked={formData.showBadge}
                    onCheckedChange={(checked) => setFormData({ ...formData, showBadge: checked })}
                  />
                  <Label htmlFor="showBadge">إظهار الملصقات الترويجية</Label>
                </div>

                <div>
                  <Label htmlFor="badgeText1">نص الملصق 1</Label>
                  <Input
                    id="badgeText1"
                    value={formData.badgeText1}
                    onChange={(e) => setFormData({ ...formData, badgeText1: e.target.value })}
                    placeholder="طازج يومياً"
                    disabled={!formData.showBadge}
                  />
                </div>

                <div>
                  <Label htmlFor="badgeText2">نص الملصق 2</Label>
                  <Input
                    id="badgeText2"
                    value={formData.badgeText2}
                    onChange={(e) => setFormData({ ...formData, badgeText2: e.target.value })}
                    placeholder="عروض حصرية"
                    disabled={!formData.showBadge}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">نشط (ظهور العرض للعملاء)</Label>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={createOfferMutation.isPending || updateOfferMutation.isPending}
                  className="gap-2"
                  data-testid="button-save-offer"
                >
                  <Save className="h-4 w-4" />
                  {editingOffer ? 'تحديث' : 'حفظ'}
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit} className="gap-2">
                  <X className="h-4 w-4" />
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : offers?.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">لا توجد عروض خاصة</p>
            </CardContent>
          </Card>
        ) : (
          offers?.map((offer) => {
            const status = getOfferStatus(offer);
            const isBundle = (offer as any).offerType === 'bundle';

            return (
              <Card key={offer.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{offer.title}</h3>
                        <Badge className={status.color}>{status.text}</Badge>
                        <Badge variant={isBundle ? 'default' : 'outline'} className="gap-1">
                          {isBundle ? (
                            <>🎁 مجموعة — {(offer as any).bundlePrice} ريال</>
                          ) : (
                            <><Percent className="h-3 w-3" />{getDiscountText(offer)}</>
                          )}
                        </Badge>
                        {!isBundle && (offer as any).discountScope && (
                          <Badge variant="outline" className="text-xs">
                            {(offer as any).discountScope === 'store' ? '🏪 كامل المتجر' : '📂 قسم محدد'}
                          </Badge>
                        )}
                        <Badge variant="secondary">{getRestaurantName(offer.restaurantId)}</Badge>
                      </div>

                      {offer.description && (
                        <p className="text-muted-foreground mb-3">{offer.description}</p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-muted-foreground">تاريخ الانتهاء</p>
                          <p>{offer.validUntil ? formatDate(offer.validUntil) : 'غير محدد'}</p>
                        </div>

                        <div>
                          <p className="font-medium text-muted-foreground">
                            {isBundle ? 'سعر المجموعة' : 'الحد الأدنى للطلب'}
                          </p>
                          <p>
                            {isBundle
                              ? `${(offer as any).bundlePrice} ريال`
                              : offer.minimumOrder ? `${offer.minimumOrder} ريال` : 'بدون حد أدنى'}
                          </p>
                        </div>

                        <div>
                          <p className="font-medium text-muted-foreground">تاريخ الإنشاء</p>
                          <p>{formatDate(offer.createdAt)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(offer)}
                        className="gap-2"
                        data-testid={`button-edit-${offer.id}`}
                      >
                        <Edit className="h-4 w-4" />
                        تعديل
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (window.confirm('هل أنت متأكد من حذف هذا العرض؟')) {
                            deleteOfferMutation.mutate(offer.id);
                          }
                        }}
                        className="gap-2 text-red-600 hover:text-red-700"
                        data-testid={`button-delete-${offer.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export default AdminSpecialOffers;
