import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, Bell, Globe, Moon, Sun, Lock, CreditCard, Smartphone, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { PermissionsManager } from '@/components/PermissionsManager';

interface SettingItem {
  key: string;
  label: string;
  description: string;
  type: 'switch' | 'theme' | 'select';
  value: boolean | string;
  onChange: (value: any) => void;
  options?: Array<{ value: string; label: string }>;
}

interface SettingsGroup {
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  items: SettingItem[];
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState({
    notifications: {
      orderUpdates: true,
      promotions: true,
      sound: true,
    },
    currency: 'YER',
    autoLocation: true,
    biometric: false,
  });

  const handleNotificationChange = (setting: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [setting]: value,
      },
    }));
    
    toast({
      title: "تم حفظ الإعدادات",
      description: "تم تحديث إعداداتك بنجاح",
    });
  };

  const handleSimpleSettingChange = (setting: string, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value,
    }));
    
    toast({
      title: "تم حفظ الإعدادات",
      description: "تم تحديث إعداداتك بنجاح",
    });
  };

  const settingsGroups: SettingsGroup[] = [
    {
      title: 'الإشعارات',
      icon: Bell,
      items: [
        {
          key: 'orderUpdates',
          label: 'تحديثات الطلبات',
          description: 'إشعارات حول حالة طلباتك',
          type: 'switch',
          value: settings.notifications.orderUpdates,
          onChange: (value: boolean) => handleNotificationChange('orderUpdates', value),
        },
        {
          key: 'promotions',
          label: 'العروض والتخفيضات',
          description: 'إشعارات حول العروض الجديدة',
          type: 'switch',
          value: settings.notifications.promotions,
          onChange: (value: boolean) => handleNotificationChange('promotions', value),
        },
        {
          key: 'sound',
          label: 'الأصوات',
          description: 'تشغيل أصوات الإشعارات',
          type: 'switch',
          value: settings.notifications.sound,
          onChange: (value: boolean) => handleNotificationChange('sound', value),
        },
      ],
    },
    {
      title: 'العرض واللغة',
      icon: Globe,
      items: [
        {
          key: 'theme',
          label: 'المظهر',
          description: 'اختيار المظهر الفاتح أو الداكن',
          type: 'theme',
          value: theme,
          onChange: toggleTheme,
        },
        {
          key: 'language',
          label: 'اللغة',
          description: 'اختيار لغة التطبيق',
          type: 'select',
          value: language,
          options: [
            { value: 'ar', label: 'العربية' },
            { value: 'en', label: 'English' },
          ],
          onChange: (value: 'ar' | 'en') => {
            setLanguage(value);
            toast({
              title: "تم تغيير اللغة",
              description: value === 'ar' ? "تم تحويل التطبيق للغة العربية" : "App has been switched to English",
            });
          },
        },
        {
          key: 'currency',
          label: 'العملة',
          description: 'وحدة العملة المستخدمة',
          type: 'select',
          value: settings.currency,
          options: [
            { value: 'YER', label: 'الريال اليمني (YER)' },
          ],
          onChange: (value: string) => handleSimpleSettingChange('currency', value),
        },
      ],
    },
    {
      title: 'الموقع والخصوصية',
      icon: Lock,
      items: [
        {
          key: 'autoLocation',
          label: 'تحديد الموقع تلقائياً',
          description: 'السماح للتطبيق بتحديد موقعك',
          type: 'switch',
          value: settings.autoLocation,
          onChange: (value: boolean) => handleSimpleSettingChange('autoLocation', value),
        },
        {
          key: 'biometric',
          label: 'الحماية البيومترية',
          description: 'استخدام بصمة الإصبع أو الوجه',
          type: 'switch',
          value: settings.biometric,
          onChange: (value: boolean) => handleSimpleSettingChange('biometric', value),
        },
      ],
    },
  ];

  const quickActions = [
    {
      icon: CreditCard,
      label: 'طرق الدفع',
      description: 'إدارة طرق الدفع المحفوظة',
      action: () => setLocation('/payment-methods'),
      testId: 'settings-payment-methods',
    },
    {
      icon: Smartphone,
      label: 'حول التطبيق',
      description: 'معلومات النسخة والتحديثات',
      action: () => setLocation('/about'),
      testId: 'settings-about',
    },
  ];

  return (
    <div>
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/profile')}
            data-testid="button-settings-back"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">الإعدادات</h2>
        </div>
      </header>

      <section className="p-4">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              إعدادات عامة
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              الصلاحيات
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-6 mt-6">
            {/* Settings Groups */}
            {settingsGroups.map((group) => {
          const Icon = group.icon;
          return (
            <Card key={group.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <Icon className="h-6 w-6 text-primary" />
                  {group.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {group.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <Label 
                        htmlFor={item.key} 
                        className="text-foreground font-medium cursor-pointer"
                        data-testid={`setting-label-${item.key}`}
                      >
                        {item.label}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    </div>
                    
                    <div className="ml-4">
                      {item.type === 'switch' && (
                        <Switch
                          id={item.key}
                          checked={item.value as boolean}
                          onCheckedChange={item.onChange}
                          data-testid={`switch-${item.key}`}
                        />
                      )}
                      
                      {item.type === 'theme' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={item.onChange}
                          data-testid="button-toggle-theme"
                        >
                          {theme === 'dark' ? (
                            <Sun className="h-4 w-4 ml-2" />
                          ) : (
                            <Moon className="h-4 w-4 ml-2" />
                          )}
                          {theme === 'dark' ? 'فاتح' : 'داكن'}
                        </Button>
                      )}
                      
                      {item.type === 'select' && item.options && (
                        <Select 
                          value={item.value as string} 
                          onValueChange={item.onChange}
                        >
                          <SelectTrigger className="w-40" data-testid={`select-${item.key}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {item.options.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">إعدادات إضافية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.testId}
                      variant="ghost"
                      className="w-full h-auto p-4 justify-between hover:bg-accent"
                      onClick={action.action}
                      data-testid={action.testId}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-6 w-6 text-primary" />
                        <div className="text-right">
                          <div className="font-medium text-foreground">{action.label}</div>
                          <div className="text-sm text-muted-foreground">{action.description}</div>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground rotate-180" />
                    </Button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Sign Out */}
            <Button
              variant="destructive"
              className="w-full"
              data-testid="button-sign-out"
            >
              تسجيل الخروج
            </Button>
          </TabsContent>
          
          <TabsContent value="permissions" className="mt-6">
            <PermissionsManager onPermissionUpdate={(permission, granted) => {
              console.log(`Permission ${permission} ${granted ? 'granted' : 'denied'}`);
              toast({
                title: granted ? 'تم منح الإذن' : 'تم رفض الإذن',
                description: `إذن ${permission} ${granted ? 'مُمنوح' : 'مرفوض'}`,
                variant: granted ? 'default' : 'destructive',
              });
            }} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}