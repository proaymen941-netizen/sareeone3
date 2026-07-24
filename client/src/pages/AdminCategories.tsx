import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Tag, Save, X, Search } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Category } from '@shared/schema';

export default function AdminCategories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    image: '',
    sortOrder: 0,
    isActive: true,
  });

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ['/api/admin/categories'],
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/admin/categories', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      toast({ title: "تم إنشاء القسم", description: "تم إضافة القسم الجديد بنجاح" });
      resetForm();
      setIsDialogOpen(false);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await apiRequest('PUT', `/api/admin/categories/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      toast({ title: "تم تحديث القسم", description: "تم تحديث القسم بنجاح" });
      resetForm();
      setEditingCategory(null);
      setIsDialogOpen(false);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/categories/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      toast({ title: "تم حذف القسم", description: "تم حذف القسم بنجاح" });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', icon: '', image: '', sortOrder: 0, isActive: true });
    setEditingCategory(null);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon || '',
      image: category.image || '',
      sortOrder: category.sortOrder || 0,
      isActive: category.isActive !== false,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال اسم القسم", variant: "destructive" });
      return;
    }
    if (!formData.image) {
      toast({ title: "خطأ", description: "يرجى إضافة صورة للقسم", variant: "destructive" });
      return;
    }
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: formData });
    } else {
      createCategoryMutation.mutate(formData);
    }
  };

  const filteredCategories = categories?.filter(c =>
    !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Tag className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">إدارة الأقسام</h1>
              <p className="text-sm text-muted-foreground">إدارة أقسام المتجر وشريط التنقل الرئيسي</p>
            </div>
          </div>
          <Button
            className="gap-2"
            onClick={() => { resetForm(); setIsDialogOpen(true); }}
            data-testid="button-add-category"
          >
            <Plus className="h-4 w-4" />
            إضافة قسم جديد
          </Button>
        </div>
        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في الأقسام..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
              data-testid="input-search-categories"
            />
          </div>
        </div>
      </div>

      {/* Dialog for Add/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'تعديل القسم' : 'إضافة قسم جديد'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">اسم القسم</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="أدخل اسم القسم"
                required
                data-testid="input-category-name"
              />
            </div>
            <div>
              <ImageUpload
                label="صورة القسم (الأساسية)"
                value={formData.image}
                onChange={(url) => setFormData(prev => ({ ...prev, image: url }))}
                bucket="categories"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sortOrder">ترتيب العرض</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="0"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  data-testid="input-category-sort-order"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">فئة مفعلة</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  data-testid="switch-category-active"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                data-testid="button-save-category"
              >
                <Save className="h-4 w-4" />
                {editingCategory ? 'تحديث' : 'إضافة'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => { resetForm(); setIsDialogOpen(false); }}
                data-testid="button-cancel-category"
              >
                <X className="h-4 w-4" />
                إلغاء
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Categories Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-muted rounded-lg mb-4" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : filteredCategories.length ? (
            filteredCategories.map((category) => (
              <Card key={category.id} className="hover:shadow-md transition-shadow overflow-hidden">
                <div className="h-32 bg-muted relative">
                  {category.image ? (
                    <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground italic">
                      بدون صورة
                    </div>
                  )}
                </div>
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => handleEdit(category)}
                      data-testid={`button-edit-category-${category.id}`}
                    >
                      <Edit className="h-4 w-4" />
                      تعديل
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-delete-category-${category.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل أنت متأكد من حذف قسم "{category.name}"؟ سيتم حذف جميع المطاعم المرتبطة بهذا القسم أيضاً.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCategoryMutation.mutate(category.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            حذف
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
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد أقسام</h3>
              <p className="text-muted-foreground mb-4">ابدأ بإضافة أقسام المطاعم والمتاجر</p>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-category">
                إضافة القسم الأول
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
