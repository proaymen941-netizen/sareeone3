import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useUiSettings } from '@/context/UiSettingsContext';
import { Truck, DollarSign, Bell, Navigation, MapPin, Clock } from 'lucide-react';

export function DriverControlPanel() {
  const { loading, updateSetting, isFeatureEnabled } = useUiSettings();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  const handleToggle = (key: string, enabled: boolean) => {
    updateSetting(key, enabled.toString());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Truck className="h-6 w-6" />
        <h2 className="text-2xl font-bold">إعدادات تطبيق السائق</h2>
      </div>

      {/* إعدادات الأرباح والمعلومات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            إعدادات الأرباح والمعلومات
          </CardTitle>
          <CardDescription>
            تحكم في عرض معلومات الأرباح والإحصائيات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="driver_show_earnings" className="flex-1">
              عرض الأرباح للسائق
            </Label>
            <Switch
              id="driver_show_earnings"
              checked={isFeatureEnabled('driver_show_earnings')}
              onCheckedChange={(checked) => handleToggle('driver_show_earnings', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="driver_show_customer_info" className="flex-1">
              عرض معلومات العميل
            </Label>
            <Switch
              id="driver_show_customer_info"
              checked={isFeatureEnabled('driver_show_customer_info')}
              onCheckedChange={(checked) => handleToggle('driver_show_customer_info', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="driver_show_order_details" className="flex-1">
              عرض تفاصيل الطلب
            </Label>
            <Switch
              id="driver_show_order_details"
              checked={isFeatureEnabled('driver_show_order_details')}
              onCheckedChange={(checked) => handleToggle('driver_show_order_details', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* إعدادات الطلبات والتوصيل */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            إعدادات الطلبات والتوصيل
          </CardTitle>
          <CardDescription>
            تحكم في عرض الطلبات وإعدادات التوصيل
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="driver_show_available_orders" className="flex-1">
              عرض الطلبات المتاحة
            </Label>
            <Switch
              id="driver_show_available_orders"
              checked={isFeatureEnabled('driver_show_available_orders')}
              onCheckedChange={(checked) => handleToggle('driver_show_available_orders', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="driver_auto_refresh" className="flex-1">
              التحديث التلقائي للطلبات
            </Label>
            <Switch
              id="driver_auto_refresh"
              checked={isFeatureEnabled('driver_auto_refresh')}
              onCheckedChange={(checked) => handleToggle('driver_auto_refresh', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="driver_show_status_toggle" className="flex-1">
              عرض مفتاح تغيير الحالة
            </Label>
            <Switch
              id="driver_show_status_toggle"
              checked={isFeatureEnabled('driver_show_status_toggle')}
              onCheckedChange={(checked) => handleToggle('driver_show_status_toggle', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* إعدادات التنقل والموقع */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            إعدادات التنقل والموقع
          </CardTitle>
          <CardDescription>
            تحكم في خدمات التنقل والموقع
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="driver_show_location_button" className="flex-1">
              عرض زر تحديث الموقع
            </Label>
            <Switch
              id="driver_show_location_button"
              checked={isFeatureEnabled('driver_show_location_button')}
              onCheckedChange={(checked) => handleToggle('driver_show_location_button', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="driver_show_navigation_help" className="flex-1">
              عرض مساعدة التنقل
            </Label>
            <Switch
              id="driver_show_navigation_help"
              checked={isFeatureEnabled('driver_show_navigation_help')}
              onCheckedChange={(checked) => handleToggle('driver_show_navigation_help', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* إعدادات الإشعارات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            إعدادات الإشعارات
          </CardTitle>
          <CardDescription>
            تحكم في الإشعارات والتنبيهات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="driver_notification_sound" className="flex-1">
              تفعيل صوت الإشعارات
            </Label>
            <Switch
              id="driver_notification_sound"
              checked={isFeatureEnabled('driver_notification_sound')}
              onCheckedChange={(checked) => handleToggle('driver_notification_sound', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}