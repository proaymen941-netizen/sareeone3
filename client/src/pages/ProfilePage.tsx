import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, User, Phone, Mail, MapPin, Settings, Shield, Star, Clock, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState({
    name: 'محمد أحمد',
    phone: '+967771234567',
    email: 'mohammed@example.com',
    address: 'صنعاء، شارع الزبيري، بجانب مسجد النور',
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
    toast({
      title: "تم حفظ البيانات",
      description: "تم تحديث معلومات الملف الشخصي بنجاح",
    });
  };

  const profileStats = [
    { icon: Receipt, label: 'إجمالي الطلبات', value: '42', color: 'text-primary' },
    { icon: Star, label: 'التقييم', value: '4.8', color: 'text-yellow-500' },
    { icon: Clock, label: 'عضو منذ', value: '6 أشهر', color: 'text-green-500' },
  ];

  const menuItems = [
    { icon: Receipt, label: 'طلباتي', path: '/orders', description: 'عرض تاريخ الطلبات', testId: 'profile-orders' },
    { icon: MapPin, label: 'العناوين المحفوظة', path: '/addresses', description: 'إدارة عناوين التوصيل', testId: 'profile-addresses' },
    { icon: Settings, label: 'الإعدادات', path: '/settings', description: 'إعدادات التطبيق والحساب', testId: 'profile-settings' },
    { icon: Shield, label: 'سياسة الخصوصية', path: '/privacy', description: 'سياسة الخصوصية وشروط الاستخدام', testId: 'profile-privacy' },
  ];

  return (
    <div>
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/')}
            data-testid="button-profile-back"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">الملف الشخصي</h2>
        </div>
      </header>

      <section className="p-4 space-y-6">
        {/* Profile Info Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-10 w-10 text-primary-foreground" />
            </div>
            <CardTitle className="text-xl text-foreground">{profile.name}</CardTitle>
            <Badge variant="secondary" className="mx-auto">عضو مميز</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-foreground">الاسم</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    data-testid="input-profile-name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-foreground">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    data-testid="input-profile-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-foreground">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    data-testid="input-profile-email"
                  />
                </div>
                <div>
                  <Label htmlFor="address" className="text-foreground">العنوان</Label>
                  <Input
                    id="address"
                    value={profile.address}
                    onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                    data-testid="input-profile-address"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1" data-testid="button-save-profile">
                    حفظ التغييرات
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                    data-testid="button-cancel-edit"
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <span className="text-foreground" data-testid="profile-phone">{profile.phone}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <span className="text-foreground" data-testid="profile-email">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <span className="text-foreground" data-testid="profile-address">{profile.address}</span>
                </div>
                <Button 
                  onClick={() => setIsEditing(true)} 
                  className="w-full"
                  data-testid="button-edit-profile"
                >
                  تعديل المعلومات
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {profileStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="text-center">
                <CardContent className="p-4">
                  <Icon className={`h-6 w-6 ${stat.color} mx-auto mb-2`} />
                  <div className="text-lg font-bold text-foreground" data-testid={`stat-${index}`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Menu Items */}
        <div className="space-y-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.path}
                variant="ghost"
                className="w-full h-auto p-4 justify-between hover:bg-accent"
                onClick={() => setLocation(item.path)}
                data-testid={item.testId}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6 text-primary" />
                  <div className="text-right">
                    <div className="font-medium text-foreground">{item.label}</div>
                    <div className="text-sm text-muted-foreground">{item.description}</div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground rotate-180" />
              </Button>
            );
          })}
        </div>
      </section>
    </div>
  );
}