import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, MapPin, Plus, Target, Home, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface SavedAddress {
  id: string;
  type: 'home' | 'work' | 'other';
  label: string;
  address: string;
  details: string;
  isDefault: boolean;
}

export default function Location() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    type: 'home' as 'home' | 'work' | 'other',
    label: '',
    address: '',
    details: '',
  });

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([
    {
      id: '1',
      type: 'home',
      label: 'المنزل',
      address: 'صنعاء، شارع الزبيري',
      details: 'بجانب مسجد النور، الطابق الثاني',
      isDefault: true,
    },
    {
      id: '2',
      type: 'work',
      label: 'العمل',
      address: 'صنعاء، شارع السبعين',
      details: 'مجمع الأعمال، مكتب رقم 205',
      isDefault: false,
    },
  ]);

  const handleAddAddress = () => {
    if (!newAddress.label || !newAddress.address) {
      toast({
        title: "معلومات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const address: SavedAddress = {
      id: Date.now().toString(),
      ...newAddress,
      isDefault: savedAddresses.length === 0,
    };

    setSavedAddresses(prev => [...prev, address]);
    setNewAddress({ type: 'home', label: '', address: '', details: '' });
    setShowAddForm(false);
    
    toast({
      title: "تم إضافة العنوان",
      description: "تم حفظ العنوان الجديد بنجاح",
    });
  };

  const handleSetDefault = (id: string) => {
    setSavedAddresses(prev =>
      prev.map(addr => ({ ...addr, isDefault: addr.id === id }))
    );
    toast({
      title: "تم تحديث العنوان الافتراضي",
      description: "تم تعيين العنوان كافتراضي للتوصيل",
    });
  };

  const handleDeleteAddress = (id: string) => {
    setSavedAddresses(prev => prev.filter(addr => addr.id !== id));
    toast({
      title: "تم حذف العنوان",
      description: "تم حذف العنوان من القائمة المحفوظة",
    });
  };

  const getAddressIcon = (type: string) => {
    switch (type) {
      case 'home': return Home;
      case 'work': return Building;
      default: return MapPin;
    }
  };

  const getAddressColor = (type: string) => {
    switch (type) {
      case 'home': return 'text-green-500';
      case 'work': return 'text-blue-500';
      default: return 'text-purple-500';
    }
  };

  return (
    <div>
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/profile')}
            data-testid="button-location-back"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">العناوين المحفوظة</h2>
        </div>
      </header>

      <section className="p-4 space-y-6">
        {/* Current Location */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Target className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-medium text-foreground">موقعك الحالي</h3>
                <p className="text-sm text-muted-foreground">تم تحديده تلقائياً</p>
              </div>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-foreground" data-testid="current-location">
                صنعاء، شارع الستين، قرب دوار الأمم المتحدة
              </p>
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-3"
              data-testid="button-use-current-location"
            >
              استخدام الموقع الحالي
            </Button>
          </CardContent>
        </Card>

        {/* Add New Address */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">إضافة عنوان جديد</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddForm(!showAddForm)}
                data-testid="button-toggle-add-form"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          {showAddForm && (
            <CardContent className="space-y-4">
              <div>
                <Label className="text-foreground">نوع العنوان</Label>
                <div className="flex gap-2 mt-2">
                  {[
                    { value: 'home', label: 'المنزل', icon: Home },
                    { value: 'work', label: 'العمل', icon: Building },
                    { value: 'other', label: 'أخرى', icon: MapPin },
                  ].map((type) => {
                    const Icon = type.icon;
                    return (
                      <Button
                        key={type.value}
                        variant={newAddress.type === type.value ? 'default' : 'outline'}
                        className="flex-1 gap-2"
                        onClick={() => setNewAddress(prev => ({ ...prev, type: type.value as any }))}
                        data-testid={`address-type-${type.value}`}
                      >
                        <Icon className="h-4 w-4" />
                        {type.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label htmlFor="address-label" className="text-foreground">تسمية العنوان</Label>
                <Input
                  id="address-label"
                  value={newAddress.label}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="مثال: المنزل، العمل، بيت الأهل"
                  data-testid="input-address-label"
                />
              </div>

              <div>
                <Label htmlFor="address-street" className="text-foreground">العنوان الرئيسي *</Label>
                <Input
                  id="address-street"
                  value={newAddress.address}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="الشارع والحي"
                  data-testid="input-address-street"
                />
              </div>

              <div>
                <Label htmlFor="address-details" className="text-foreground">تفاصيل إضافية</Label>
                <Input
                  id="address-details"
                  value={newAddress.details}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, details: e.target.value }))}
                  placeholder="رقم الطابق، معالم قريبة، ملاحظات للسائق"
                  data-testid="input-address-details"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddAddress} className="flex-1" data-testid="button-save-address">
                  حفظ العنوان
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddForm(false)}
                  data-testid="button-cancel-add"
                >
                  إلغاء
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Saved Addresses */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-foreground">العناوين المحفوظة</h3>
          
          {savedAddresses.map((address) => {
            const Icon = getAddressIcon(address.type);
            const iconColor = getAddressColor(address.type);
            
            return (
              <Card key={address.id} className={`${address.isDefault ? 'border-primary' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className={`h-6 w-6 ${iconColor} mt-1`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-foreground" data-testid={`address-label-${address.id}`}>
                            {address.label}
                          </h4>
                          {address.isDefault && (
                            <Badge variant="secondary" className="text-xs">افتراضي</Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground mb-1" data-testid={`address-street-${address.id}`}>
                          {address.address}
                        </p>
                        {address.details && (
                          <p className="text-sm text-muted-foreground" data-testid={`address-details-${address.id}`}>
                            {address.details}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setLocation('/cart')}
                      data-testid={`button-deliver-here-${address.id}`}
                    >
                      التوصيل هنا
                    </Button>
                    {!address.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(address.id)}
                        data-testid={`button-set-default-${address.id}`}
                      >
                        تعيين كافتراضي
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAddress(address.id)}
                      className="text-destructive hover:bg-destructive/10"
                      data-testid={`button-delete-address-${address.id}`}
                    >
                      حذف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}