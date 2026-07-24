import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUiSettings } from '@/context/UiSettingsContext';
import { 
  Settings, 
  Eye, 
  Palette, 
  Smartphone, 
  UserCog, 
  Phone, 
  MessageSquare, 
  Share2, 
  Image as ImageIcon,
  Layout as LayoutIcon,
  Shield,
  Truck,
  ShoppingCart,
  Clock,
  Store
} from 'lucide-react';
import { useState, useEffect } from 'react';

function formatTimeArabic12(timeStr: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (isNaN(h)) return timeStr;
  const period = h >= 12 ? 'م (مساءً)' : 'ص (صباحاً)';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${period}`;
}

function toggleTimeAmPm(timeStr: string, targetPeriod: 'AM' | 'PM'): string {
  if (!timeStr) return '08:00';
  const parts = timeStr.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  if (isNaN(h)) return timeStr;

  if (targetPeriod === 'AM') {
    if (h >= 12) h = h - 12;
  } else {
    if (h < 12) h = h + 12;
  }
  const hStr = h.toString().padStart(2, '0');
  return `${hStr}:${m}`;
}

export function UiControlPanel() {
  const { settings, loading, updateSetting, isFeatureEnabled, getSetting } = useUiSettings();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

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

  const handleInputChange = (key: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSetting = (key: string) => {
    updateSetting(key, localSettings[key] || '');
  };

  const handleNavigationToggle = (key: string, enabled: boolean) => {
    // Save to localStorage for immediate effect on customer app navigation
    localStorage.setItem(key, enabled.toString());
    // Also save to settings for persistence
    updateSetting(key, enabled.toString());
    
    // Trigger a custom event to notify Layout component
    window.dispatchEvent(new CustomEvent('navigationSettingsChanged', {
      detail: { key, enabled }
    }));
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h2 className="text-2xl font-bold">إعدادات التحكم في الواجهة والنظام</h2>
      </div>

      {/* إعدادات الهوية والشعار */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutIcon className="h-5 w-5" />
            إعدادات الهوية والشعار
          </CardTitle>
          <CardDescription>
            تعديل شعار النظام وصور الواجهات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>اسم التطبيق</Label>
            <div className="flex gap-2">
              <Input 
                value={localSettings['app_name'] || ''} 
                onChange={(e) => handleInputChange('app_name', e.target.value)}
                placeholder="مثال: متجر السريع ون"
              />
              <Button onClick={() => handleSaveSetting('app_name')}>حفظ</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>رابط شعار الهيدر</Label>
            <div className="flex gap-2">
              <Input 
                value={localSettings['header_logo_url'] || ''} 
                onChange={(e) => handleInputChange('header_logo_url', e.target.value)}
                placeholder="رابط الصورة"
              />
              <Button onClick={() => handleSaveSetting('header_logo_url')}>حفظ</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>رابط صورة القائمة الجانبية</Label>
            <div className="flex gap-2">
              <Input 
                value={localSettings['sidebar_image_url'] || ''} 
                onChange={(e) => handleInputChange('sidebar_image_url', e.target.value)}
                placeholder="رابط الصورة"
              />
              <Button onClick={() => handleSaveSetting('sidebar_image_url')}>حفظ</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* إعدادات حالة المتجر وأوقات العمل */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            حالة المتجر وأوقات العمل (Global)
          </CardTitle>
          <CardDescription>
            التحكم في فتح وإغلاق التطبيق برمجياً وتحديد ساعات العمل الرسمية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
            <div className="space-y-0.5">
              <Label htmlFor="store_status" className="text-base font-bold">حالة المتجر الحالية</Label>
              <p className="text-sm text-muted-foreground">
                {isFeatureEnabled('store_status') ? "المتجر مفتوح ويستقبل الطلبات" : "المتجر مغلق حالياً ولن يتمكن العملاء من الطلب"}
              </p>
            </div>
            <Switch
              id="store_status"
              checked={isFeatureEnabled('store_status')}
              onCheckedChange={(checked) => handleToggle('store_status', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-orange-50/50 rounded-lg border border-orange-100">
            <div className="space-y-0.5">
              <Label htmlFor="allow_scheduled_orders_when_closed" className="text-base font-bold">السماح بالطلبات الآجلة عند الإغلاق</Label>
              <p className="text-sm text-muted-foreground">
                تمكين العملاء من جدولة طلباتهم حتى عندما يكون التطبيق مغلقاً إدارياً
              </p>
            </div>
            <Switch
              id="allow_scheduled_orders_when_closed"
              checked={isFeatureEnabled('allow_scheduled_orders_when_closed')}
              onCheckedChange={(checked) => handleToggle('allow_scheduled_orders_when_closed', checked)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>وقت الفتح</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input 
                  type="time"
                  value={localSettings['opening_time'] || '08:00'} 
                  onChange={(e) => handleInputChange('opening_time', e.target.value)}
                  className="w-32 text-center font-mono font-bold"
                />
                <span className="px-2 py-1 bg-orange-100 text-orange-900 rounded text-xs font-bold border border-orange-200">
                  {formatTimeArabic12(localSettings['opening_time'] || '08:00')}
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={parseInt((localSettings['opening_time'] || '08:00').split(':')[0], 10) < 12 ? 'default' : 'outline'}
                    onClick={() => {
                      const val = toggleTimeAmPm(localSettings['opening_time'] || '08:00', 'AM');
                      handleInputChange('opening_time', val);
                      handleSaveSetting('opening_time');
                    }}
                    className="text-xs px-2 py-1 h-7"
                  >
                    ☀️ ص
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={parseInt((localSettings['opening_time'] || '08:00').split(':')[0], 10) >= 12 ? 'default' : 'outline'}
                    onClick={() => {
                      const val = toggleTimeAmPm(localSettings['opening_time'] || '08:00', 'PM');
                      handleInputChange('opening_time', val);
                      handleSaveSetting('opening_time');
                    }}
                    className="text-xs px-2 py-1 h-7"
                  >
                    🌙 م
                  </Button>
                </div>
                <Button size="sm" onClick={() => handleSaveSetting('opening_time')}>حفظ</Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>وقت الإغلاق</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input 
                  type="time"
                  value={localSettings['closing_time'] || '23:00'} 
                  onChange={(e) => handleInputChange('closing_time', e.target.value)}
                  className="w-32 text-center font-mono font-bold"
                />
                <span className="px-2 py-1 bg-orange-100 text-orange-900 rounded text-xs font-bold border border-orange-200">
                  {formatTimeArabic12(localSettings['closing_time'] || '23:00')}
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={parseInt((localSettings['closing_time'] || '23:00').split(':')[0], 10) < 12 ? 'default' : 'outline'}
                    onClick={() => {
                      const val = toggleTimeAmPm(localSettings['closing_time'] || '23:00', 'AM');
                      handleInputChange('closing_time', val);
                      handleSaveSetting('closing_time');
                    }}
                    className="text-xs px-2 py-1 h-7"
                  >
                    ☀️ ص
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={parseInt((localSettings['closing_time'] || '23:00').split(':')[0], 10) >= 12 ? 'default' : 'outline'}
                    onClick={() => {
                      const val = toggleTimeAmPm(localSettings['closing_time'] || '23:00', 'PM');
                      handleInputChange('closing_time', val);
                      handleSaveSetting('closing_time');
                    }}
                    className="text-xs px-2 py-1 h-7"
                  >
                    🌙 م
                  </Button>
                </div>
                <Button size="sm" onClick={() => handleSaveSetting('closing_time')}>حفظ</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* إعدادات تتبع الطلبات والتوصيل */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            إعدادات تتبع الطلبات والتوصيل
          </CardTitle>
          <CardDescription>
            تحديد ساعات عمل السائقين والتحكم في ميزة الطلبات المجدولة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>وقت بدء عمل السائقين</Label>
              <div className="flex gap-2">
                <Input 
                  value={localSettings['driver_start_time'] || ''} 
                  onChange={(e) => handleInputChange('driver_start_time', e.target.value)}
                  placeholder="09:00"
                />
                <Button onClick={() => handleSaveSetting('driver_start_time')}>حفظ</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>وقت نهاية عمل السائقين</Label>
              <div className="flex gap-2">
                <Input 
                  value={localSettings['driver_end_time'] || ''} 
                  onChange={(e) => handleInputChange('driver_end_time', e.target.value)}
                  placeholder="22:00"
                />
                <Button onClick={() => handleSaveSetting('driver_end_time')}>حفظ</Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
            <div className="space-y-0.5">
              <Label htmlFor="enable_scheduled_orders" className="text-base font-bold">تفعيل الطلبات المجدولة</Label>
              <p className="text-sm text-muted-foreground">
                السماح للعملاء بجدولة طلباتهم في أوقات لاحقة عند عدم توفر سائقين
              </p>
            </div>
            <Switch
              id="enable_scheduled_orders"
              checked={isFeatureEnabled('enable_scheduled_orders')}
              onCheckedChange={(checked) => handleToggle('enable_scheduled_orders', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* إعدادات الدعم والتواصل */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            إعدادات الدعم والتواصل
          </CardTitle>
          <CardDescription>
            التحكم في أرقام التواصل والواتساب للدعم الفني
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>رقم الواتساب (للعملاء)</Label>
            <div className="flex gap-2">
              <Input 
                value={localSettings['support_whatsapp'] || ''} 
                onChange={(e) => handleInputChange('support_whatsapp', e.target.value)}
                placeholder="https://wa.me/967..."
              />
              <Button onClick={() => handleSaveSetting('support_whatsapp')}>حفظ</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>رقم الاتصال المباشر (للعملاء)</Label>
            <div className="flex gap-2">
              <Input 
                value={localSettings['support_phone'] || ''} 
                onChange={(e) => handleInputChange('support_phone', e.target.value)}
                placeholder="tel:+967..."
              />
              <Button onClick={() => handleSaveSetting('support_phone')}>حفظ</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>عنوان واجهة الدعم</Label>
            <div className="flex gap-2">
              <Input 
                value={localSettings['text_support_title'] || ''} 
                onChange={(e) => handleInputChange('text_support_title', e.target.value)}
                placeholder="مثال: نحن معك.."
              />
              <Button onClick={() => handleSaveSetting('text_support_title')}>حفظ</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* إعدادات تطبيق السائق */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            إعدادات تطبيق السائق
          </CardTitle>
          <CardDescription>
            التحكم في إعدادات واجهة السائق والتواصل
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>رقم واتساب دعم السائقين</Label>
            <div className="flex gap-2">
              <Input 
                value={localSettings['driver_support_whatsapp'] || ''} 
                onChange={(e) => handleInputChange('driver_support_whatsapp', e.target.value)}
                placeholder="https://wa.me/..."
              />
              <Button onClick={() => handleSaveSetting('driver_support_whatsapp')}>حفظ</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>رقم اتصال دعم السائقين</Label>
            <div className="flex gap-2">
              <Input 
                value={localSettings['driver_support_phone'] || ''} 
                onChange={(e) => handleInputChange('driver_support_phone', e.target.value)}
                placeholder="tel:..."
              />
              <Button onClick={() => handleSaveSetting('driver_support_phone')}>حفظ</Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="show_driver_stats" className="flex-1">
              إظهار الإحصائيات في لوحة السائق
            </Label>
            <Switch
              id="show_driver_stats"
              checked={isFeatureEnabled('show_driver_stats')}
              onCheckedChange={(checked) => handleToggle('show_driver_stats', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* إعدادات الشاشة الترحيبية (Onboarding) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            إعدادات الشاشة الترحيبية
          </CardTitle>
          <CardDescription>
            التحكم في الصورة والنص عند فتح التطبيق لأول مرة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>رابط صورة الترحيب</Label>
            <div className="flex gap-2">
              <Input 
                value={localSettings['onboarding_image_url'] || ''} 
                onChange={(e) => handleInputChange('onboarding_image_url', e.target.value)}
                placeholder="رابط الصورة"
              />
              <Button onClick={() => handleSaveSetting('onboarding_image_url')}>حفظ</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>عنوان الترحيب</Label>
            <div className="flex gap-2">
              <Input 
                value={localSettings['onboarding_title'] || ''} 
                onChange={(e) => handleInputChange('onboarding_title', e.target.value)}
                placeholder="عنوان جذاب"
              />
              <Button onClick={() => handleSaveSetting('onboarding_title')}>حفظ</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>وصف الترحيب</Label>
            <div className="flex gap-2">
              <Textarea 
                value={localSettings['onboarding_description'] || ''} 
                onChange={(e) => handleInputChange('onboarding_description', e.target.value)}
                placeholder="نص وصفي.."
              />
              <Button onClick={() => handleSaveSetting('onboarding_description')}>حفظ</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* إعدادات المحتوى والمشاركة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            إعدادات المحتوى والمشاركة
          </CardTitle>
          <CardDescription>
            تعديل نصوص سياسة الخصوصية وروابط المشاركة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>نص المشاركة</Label>
            <div className="flex gap-2">
              <Input 
                value={localSettings['share_text'] || ''} 
                onChange={(e) => handleInputChange('share_text', e.target.value)}
                placeholder="نص المشاركة"
              />
              <Button onClick={() => handleSaveSetting('share_text')}>حفظ</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>رابط المشاركة</Label>
            <div className="flex gap-2">
              <Input 
                value={localSettings['share_url'] || ''} 
                onChange={(e) => handleInputChange('share_url', e.target.value)}
                placeholder="رابط التطبيق"
              />
              <Button onClick={() => handleSaveSetting('share_url')}>حفظ</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>نص سياسة الخصوصية</Label>
            <div className="flex gap-2">
              <Textarea 
                className="min-h-[150px]"
                value={localSettings['privacy_policy_text'] || ''} 
                onChange={(e) => handleInputChange('privacy_policy_text', e.target.value)}
                placeholder="اكتب نص سياسة الخصوصية هنا..."
              />
              <Button onClick={() => handleSaveSetting('privacy_policy_text')}>حفظ</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* إعدادات السلة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            إدارة السلة
          </CardTitle>
          <CardDescription>
            التحكم في أجزاء السلة وعرضها
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="show_cart_items_count" className="flex-1">
              إظهار عدد العناصر في أيقونة السلة
            </Label>
            <Switch
              id="show_cart_items_count"
              checked={isFeatureEnabled('show_cart_items_count')}
              onCheckedChange={(checked) => handleToggle('show_cart_items_count', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="enable_quick_add_to_cart" className="flex-1">
              تفعيل الإضافة السريعة للسلة
            </Label>
            <Switch
              id="enable_quick_add_to_cart"
              checked={isFeatureEnabled('enable_quick_add_to_cart')}
              onCheckedChange={(checked) => handleToggle('enable_quick_add_to_cart', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="show_cart_summary_in_checkout" className="flex-1">
              إظهار ملخص السلة في صفحة الدفع
            </Label>
            <Switch
              id="show_cart_summary_in_checkout"
              checked={isFeatureEnabled('show_cart_summary_in_checkout')}
              onCheckedChange={(checked) => handleToggle('show_cart_summary_in_checkout', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* إعدادات العرض والتنقل */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            إعدادات العرض والتنقل
          </CardTitle>
          <CardDescription>
            إظهار وإخفاء عناصر الشريط العلوي والسفلي والقائمة الجانبية
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-bold border-b pb-2">الشريط السفلي (Bottom Bar)</h4>
            <div className="flex items-center justify-between">
              <Label htmlFor="bottom_bar_home_visible" className="flex-1">الرئيسية</Label>
              <Switch
                id="bottom_bar_home_visible"
                checked={isFeatureEnabled('bottom_bar_home_visible')}
                onCheckedChange={(checked) => handleToggle('bottom_bar_home_visible', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="bottom_bar_orders_visible" className="flex-1">طلباتي</Label>
              <Switch
                id="bottom_bar_orders_visible"
                checked={isFeatureEnabled('bottom_bar_orders_visible')}
                onCheckedChange={(checked) => handleToggle('bottom_bar_orders_visible', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="bottom_bar_support_visible" className="flex-1">الدعم</Label>
              <Switch
                id="bottom_bar_support_visible"
                checked={isFeatureEnabled('bottom_bar_support_visible')}
                onCheckedChange={(checked) => handleToggle('bottom_bar_support_visible', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="bottom_bar_favorites_visible" className="flex-1">المفضلة</Label>
              <Switch
                id="bottom_bar_favorites_visible"
                checked={isFeatureEnabled('bottom_bar_favorites_visible')}
                onCheckedChange={(checked) => handleToggle('bottom_bar_favorites_visible', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="bottom_bar_profile_visible" className="flex-1">حسابي</Label>
              <Switch
                id="bottom_bar_profile_visible"
                checked={isFeatureEnabled('bottom_bar_profile_visible')}
                onCheckedChange={(checked) => handleToggle('bottom_bar_profile_visible', checked)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold border-b pb-2">عناصر أخرى</h4>
            <div className="flex items-center justify-between">
              <Label htmlFor="top_bar_search_visible" className="flex-1">شريط البحث العلوي</Label>
              <Switch
                id="top_bar_search_visible"
                checked={isFeatureEnabled('top_bar_search_visible')}
                onCheckedChange={(checked) => handleToggle('top_bar_search_visible', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="side_menu_support_visible" className="flex-1">أيقونة الدعم في القائمة الجانبية</Label>
              <Switch
                id="side_menu_support_visible"
                checked={isFeatureEnabled('side_menu_support_visible')}
                onCheckedChange={(checked) => handleToggle('side_menu_support_visible', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show_categories" className="flex-1">عرض تصنيفات المتجر</Label>
              <Switch
                id="show_categories"
                checked={isFeatureEnabled('show_categories')}
                onCheckedChange={(checked) => handleToggle('show_categories', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* إعدادات العرض الأساسية - قديم (تم دمجها) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            إعدادات عرض المنتجات والمتجر
          </CardTitle>
          <CardDescription>
            تحكم في العناصر المعروضة في الصفحات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="show_search_bar" className="flex-1">
              عرض شريط البحث
            </Label>
            <Switch
              id="show_search_bar"
              checked={isFeatureEnabled('show_search_bar')}
              onCheckedChange={(checked) => handleToggle('show_search_bar', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show_special_offers" className="flex-1">
              عرض العروض الخاصة
            </Label>
            <Switch
              id="show_special_offers"
              checked={isFeatureEnabled('show_special_offers')}
              onCheckedChange={(checked) => handleToggle('show_special_offers', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show_wasalni_service" className="flex-1">
              عرض خدمة وصل لي
            </Label>
            <Switch
              id="show_wasalni_service"
              checked={isFeatureEnabled('show_wasalni_service')}
              onCheckedChange={(checked) => handleToggle('show_wasalni_service', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show_cart_button" className="flex-1">
              عرض زر السلة
            </Label>
            <Switch
              id="show_cart_button"
              checked={isFeatureEnabled('show_cart_button')}
              onCheckedChange={(checked) => handleToggle('show_cart_button', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="show_ratings" className="flex-1">
              عرض تقييمات المتجر
            </Label>
            <Switch
              id="show_ratings"
              checked={isFeatureEnabled('show_ratings')}
              onCheckedChange={(checked) => handleToggle('show_ratings', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show_delivery_time" className="flex-1">
              عرض وقت التوصيل
            </Label>
            <Switch
              id="show_delivery_time"
              checked={isFeatureEnabled('show_delivery_time')}
              onCheckedChange={(checked) => handleToggle('show_delivery_time', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}