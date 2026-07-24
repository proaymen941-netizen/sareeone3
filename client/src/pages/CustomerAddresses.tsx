import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Plus, Edit, Trash2, Home, Briefcase, Star, Check } from 'lucide-react';

interface UserAddress {
  id: string;
  userId: string;
  type: string;
  title: string;
  address: string;
  details?: string;
  latitude?: string;
  longitude?: string;
  isDefault: boolean;
  createdAt: Date;
}

interface CustomerAddressesProps {
  userId?: string;
}

export default function CustomerAddresses({ userId }: CustomerAddressesProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [formData, setFormData] = useState({
    type: 'home',
    title: '',
    address: '',
    details: '',
    latitude: '',
    longitude: '',
    isDefault: false
  });

  // Fetch addresses
  const { data: addresses = [], isLoading } = useQuery<UserAddress[]>({
    queryKey: ['/api/customer/addresses', userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(`/api/customer/addresses?userId=${userId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId
  });

  // Create address mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/customer/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create address');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer/addresses'] });
      toast({ title: 'تم إضافة العنوان بنجاح' });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: 'خطأ في إضافة العنوان', variant: 'destructive' });
    }
  });

  // Update address mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/customer/addresses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update address');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer/addresses'] });
      toast({ title: 'تم تحديث العنوان بنجاح' });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: 'خطأ في تحديث العنوان', variant: 'destructive' });
    }
  });

  // Delete address mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/customer/addresses/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete address');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer/addresses'] });
      toast({ title: 'تم حذف العنوان بنجاح' });
    },
    onError: () => {
      toast({ title: 'خطأ في حذف العنوان', variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      type: 'home',
      title: '',
      address: '',
      details: '',
      latitude: '',
      longitude: '',
      isDefault: false
    });
    setEditingAddress(null);
  };

  const handleOpenDialog = (address?: UserAddress) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        type: address.type || 'home',
        title: address.title || '',
        address: address.address || '',
        details: address.details || '',
        latitude: address.latitude || '',
        longitude: address.longitude || '',
        isDefault: address.isDefault || false
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const data = {
      ...formData,
      userId
    };

    if (editingAddress) {
      updateMutation.mutate({ id: editingAddress.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getAddressIcon = (type: string) => {
    switch (type) {
      case 'home': return <Home className="h-5 w-5" />;
      case 'work': return <Briefcase className="h-5 w-5" />;
      default: return <MapPin className="h-5 w-5" />;
    }
  };

  if (!userId) {
    return (
      <div className="p-6 text-center">
        <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">يرجى تسجيل الدخول لإدارة العناوين</p>
        <Button onClick={() => setLocation('/auth')} className="mt-4">
          تسجيل الدخول
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">عناويني المحفوظة</h2>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة عنوان
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : addresses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">لا توجد عناوين محفوظة</p>
            <Button onClick={() => handleOpenDialog()} variant="outline" className="mt-4">
              إضافة أول عنوان
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {addresses.map((addr) => (
            <Card key={addr.id} className={addr.isDefault ? 'border-green-500 border-2' : ''}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getAddressIcon(addr.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{addr.title}</h3>
                        {addr.isDefault && (
                          <Badge className="bg-green-500">افتراضي</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{addr.address}</p>
                      {addr.details && (
                        <p className="text-xs text-gray-500 mt-1">{addr.details}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(addr)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(addr.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
                </CardContent>
              </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? 'تعديل العنوان' : 'إضافة عنوان جديد'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label>نوع العنوان</Label>
                <div className="flex gap-2 mt-2">
                  {[
                    { value: 'home', label: 'منزل', icon: Home },
                    { value: 'work', label: 'عمل', icon: Briefcase },
                    { value: 'other', label: 'أخرى', icon: MapPin }
                  ].map((type) => (
                    <Button
                      key={type.value}
                      type="button"
                      variant={formData.type === type.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData({ ...formData, type: type.value })}
                      className="gap-2"
                    >
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="title">عنوان مختصر</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="مثال: منزلي، العمل"
                  required
                />
              </div>

              <div>
                <Label htmlFor="address">العنوان الكامل</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="أدخل العنوان بالتفصيل"
                  required
                />
              </div>

              <div>
                <Label htmlFor="details">ملاحظات إضافية</Label>
                <Input
                  id="details"
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  placeholder="مثال: بجانب supermarket"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="isDefault">تعيين كعنوان افتراضي</Label>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
