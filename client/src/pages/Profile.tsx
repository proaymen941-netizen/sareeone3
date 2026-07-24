import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, User, Phone, Mail, MapPin, Settings, Shield, Star, Clock, Receipt, Truck, MessageCircle, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';
import type { User as UserType, UiSettings } from '@shared/schema';

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser, isAuthenticated, loading: authLoading } = useAuth();
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/auth');
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const userId = currentUser?.id;

  const { data: uiSettings } = useQuery<UiSettings[]>({
    queryKey: ['/api/admin/ui-settings'],
  });
  
  const [profile, setProfile] = useState({
    username: '',
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  const [isEditing, setIsEditing] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/users', userId],
    enabled: !!userId && isAuthenticated,
    retry: false,
  });

  const { data: userOrders = [] } = useQuery({
    queryKey: ['/api/orders/customer', profile.phone],
    enabled: !!profile.phone,
    queryFn: async () => {
      const response = await fetch(`/api/orders/customer/${profile.phone}`);
      if (!response.ok) return [];
      return response.json();
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<UserType>) => {
      if (!userId) throw new Error('يجب تسجيل الدخول أولاً');
      const response = await apiRequest('PUT', `/api/users/${userId}`, profileData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId] });
      setIsEditing(false);
      toast({
        title: "تم حفظ البيانات",
        description: "تم تحديث معلومات الملف الشخصي بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء تحديث البيانات. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (user) {
      setProfile({
        username: (user as UserType).username || '',
        name: (user as UserType).name || '',
        phone: (user as UserType).phone || '',
        email: (user as UserType).email || '',
        address: (user as UserType).address || '',
      });
    }
  }, [user]);

  const handleSave = () => {
    updateProfileMutation.mutate({
      username: profile.username,
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
      address: profile.address,
    } as any);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  // تم إزالة وضع الضيف (Guest Mode) بناءً على طلب المستخدم لإجبار تسجيل الدخول

  const getSetting = (key: string, defaultValue: string = '') => {
    return uiSettings?.find(s => s.key === key)?.value || defaultValue;
  };

  const supportWhatsapp = getSetting('support_whatsapp', '');
  const supportPhone = getSetting('support_phone', '');
  const shareUrl = getSetting('share_url', '');
  const shareText = getSetting('share_text', 'انضم إلى تطبيق السريع ون الآن!');

  const profileStats = [
    { 
      icon: Receipt, 
      label: 'إجمالي الطلبات', 
      value: userOrders?.length?.toString() || '0', 
      color: 'text-primary' 
    },
    { icon: Star, label: 'التقييم', value: '4.8', color: 'text-yellow-500' },
    { 
      icon: Clock, 
      label: 'عضو منذ', 
      value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-YE', { month: 'short', year: 'numeric' }) : 'جديد', 
      color: 'text-green-500' 
    },
  ];

  const menuItems = [
    { icon: Receipt, label: 'طلباتي', path: '/orders', description: 'عرض تاريخ الطلبات', testId: 'profile-orders' },
    { icon: Truck, label: 'تطبيق الدلفري', path: '/driver', description: 'انتقال إلى تطبيق السائقين', testId: 'profile-delivery-app', onClick: () => { window.location.href = '/driver'; } },
    { icon: MapPin, label: 'العناوين المحفوظة', path: '/addresses', description: 'إدارة عناوين التوصيل', testId: 'profile-addresses' },
    { icon: Settings, label: 'الإعدادات', path: '/settings', description: 'إعدادات التطبيق والحساب', testId: 'profile-settings' },
    ...(supportWhatsapp ? [{
      icon: MessageCircle,
      label: 'دعم واتساب',
      path: '#',
      description: 'تواصل معنا عبر واتساب',
      testId: 'profile-whatsapp',
      onClick: () => { window.open(`https://wa.me/${supportWhatsapp.replace(/\D/g, '')}`, '_blank'); }
    }] : []),
    ...(supportPhone ? [{
      icon: Phone,
      label: 'اتصل بنا',
      path: '#',
      description: 'اتصل برقم الدعم المباشر',
      testId: 'profile-call',
      onClick: () => { window.open(`tel:${supportPhone}`, '_blank'); }
    }] : []),
    ...(shareUrl ? [{
      icon: Share2,
      label: 'مشاركة التطبيق',
      path: '#',
      description: 'شارك التطبيق مع أصدقائك',
      testId: 'profile-share',
      onClick: () => {
        if (navigator.share) {
          navigator.share({ title: 'السريع ون', text: shareText, url: shareUrl });
        } else {
          toast({ title: 'نسخ الرابط', description: shareUrl });
        }
      }
    }] : []),
    { icon: Shield, label: 'سياسة الخصوصية', path: '/privacy', description: 'سياسة الخصوصية وشروط الاستخدام', testId: 'profile-privacy' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col items-center mb-8 border-b pb-6">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-primary">السريع ون</h1>
          <p className="text-sm font-bold text-muted-foreground mt-1">لخدمات التوصيل</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-none border-2">
              <CardHeader className="text-center">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-10 w-10 text-primary-foreground" />
                </div>
                <CardTitle className="text-xl text-foreground">
                  {profile.name || (!isAuthenticated ? 'مستخدم ضيف' : 'المستخدم')}
                </CardTitle>
                <Badge variant={!isAuthenticated ? "outline" : "secondary"} className="mx-auto">
                  {!isAuthenticated ? 'مستخدم ضيف' : 'عضو مميز'}
                </Badge>
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
                      />
                    </div>
                    <div>
                      <Label htmlFor="username" className="text-foreground">اسم المستخدم</Label>
                      <Input
                        id="username"
                        value={profile.username}
                        onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-foreground">رقم الهاتف</Label>
                      <Input
                        id="phone"
                        value={profile.phone}
                        onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-foreground">البريد الإلكتروني (اختياري)</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="address" className="text-foreground">العنوان</Label>
                      <Input
                        id="address"
                        value={profile.address}
                        onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} className="flex-1" disabled={updateProfileMutation.isPending}>
                        {updateProfileMutation.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>إلغاء</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <span className="text-foreground">{profile.username}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <span className="text-foreground">{profile.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <span className="text-foreground">{profile.email || 'لا يوجد بريد إلكتروني'}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <span className="text-foreground">{profile.address}</span>
                    </div>
                    <Button onClick={() => setIsEditing(true)} className="w-full">تعديل المعلومات</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-3">
              {profileStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} className="text-center">
                    <CardContent className="p-4">
                      <Icon className={`h-6 w-6 ${stat.color} mx-auto mb-2`} />
                      <div className="text-lg font-bold text-foreground">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="space-y-3">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    className="w-full h-auto p-4 justify-between hover:bg-accent"
                    onClick={() => item.onClick ? item.onClick() : setLocation(item.path)}
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
          </div>
        </div>
      </div>
    </div>
  );
}
