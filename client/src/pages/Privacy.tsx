import { useLocation } from 'wouter';
import { ArrowRight, Shield, Eye, Lock, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

export default function Privacy() {
  const [, setLocation] = useLocation();

  const { data: uiSettings } = useQuery<any[]>({
    queryKey: ['/api/ui-settings'],
  });

  const getSetting = (key: string, defaultValue: string) => {
    return uiSettings?.find(s => s.key === key)?.value || defaultValue;
  };

  const dynamicPrivacyText = getSetting('privacy_policy_text', '');
  const supportWhatsapp = getSetting('support_whatsapp', '');
  const supportPhone = getSetting('support_phone', '');

  const privacySections = [
    {
      icon: Shield,
      title: 'جمع المعلومات',
      content: [
        'نقوم بجمع المعلومات التي تقدمها لنا عند التسجيل في التطبيق',
        'معلومات الطلبات والمدفوعات لتحسين خدماتنا',
        'معلومات الموقع لتحديد المطاعم القريبة منك',
        'معلومات الاستخدام لتطوير التطبيق وتحسين الأداء',
      ],
    },
    {
      icon: Eye,
      title: 'استخدام المعلومات',
      content: [
        'معالجة وتنفيذ طلباتك بطريقة صحيحة وسريعة',
        'التواصل معك بخصوص حالة الطلبات والتحديثات',
        'تحسين خدماتنا وتطوير مميزات جديدة',
        'إرسال العروض والتحديثات التسويقية (يمكن إلغاء الاشتراك)',
      ],
    },
    {
      icon: Lock,
      title: 'حماية المعلومات',
      content: [
        'نستخدم تقنيات التشفير المتقدمة لحماية بياناتك',
        'جميع المدفوعات تتم عبر منصات آمنة ومعتمدة',
        'الوصول للمعلومات محدود للموظفين المخولين فقط',
        'نقوم بمراجعة أنظمة الأمان بانتظام لضمان الحماية',
      ],
    },
    {
      icon: Phone,
      title: 'مشاركة المعلومات',
      content: [
        'لا نبيع أو نؤجر معلوماتك الشخصية لأطراف ثالثة',
        'نشارك المعلومات مع المطاعم فقط لتنفيذ الطلبات',
        'قد نشارك معلومات محدودة مع السائقين للتوصيل',
        'نلتزم بالقوانين المحلية في حالة طلب السلطات المختصة',
      ],
    },
  ];

  const contactInfo = [
    ...(supportPhone ? [{ icon: Phone, label: 'رقم الهاتف', value: supportPhone }] : []),
    ...(supportWhatsapp ? [{ icon: Phone, label: 'واتساب', value: supportWhatsapp }] : []),
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
            data-testid="button-privacy-back"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">سياسة الخصوصية</h2>
        </div>
      </header>

      <section className="p-4 space-y-6">
        {/* Introduction */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">
                نحن نحترم خصوصيتك
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {dynamicPrivacyText || `تطبيق السريع ون ملتزم بحماية خصوصيتك وأمان معلوماتك الشخصية. هذه السياسة توضح كيفية جمع واستخدام وحماية بياناتك.`}
              </p>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-foreground">
                <strong>آخر تحديث:</strong> 1 سبتمبر 2025
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                قد تتغير هذه السياسة من وقت لآخر، وسنقوم بإشعارك بأي تغييرات مهمة.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Sections */}
        {privacySections.map((section, index) => {
          const Icon = section.icon;
          return (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <Icon className="h-6 w-6 text-primary" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {section.content.map((item, itemIndex) => (
                    <li 
                      key={itemIndex} 
                      className="flex items-start gap-3 text-foreground"
                      data-testid={`privacy-item-${index}-${itemIndex}`}
                    >
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}

        {/* User Rights */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">حقوقك</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                  يحق لك:
                </h4>
                <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
                  <li>• الوصول إلى معلوماتك الشخصية وتحديثها</li>
                  <li>• طلب حذف حسابك ومعلوماتك</li>
                  <li>• إلغاء الاشتراك في الإشعارات التسويقية</li>
                  <li>• تقديم شكوى حول استخدام معلوماتك</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تواصل معنا</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              إذا كان لديك أي أسئلة حول سياسة الخصوصية أو كيفية معالجة بياناتك، 
              يمكنك التواصل معنا عبر:
            </p>
            
            <div className="space-y-3">
              {contactInfo.map((contact, index) => {
                const Icon = contact.icon;
                return (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                  >
                    <Icon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">{contact.label}</p>
                      <p className="text-foreground font-medium" data-testid={`contact-${index}`}>
                        {contact.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Acceptance */}
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              باستخدام تطبيق السريع ون، فإنك توافق على سياسة الخصوصية هذه 
              وعلى جمع واستخدام معلوماتك وفقاً للممارسات الموضحة أعلاه.
            </p>
            <Button 
              onClick={() => setLocation('/profile')}
              data-testid="button-accept-privacy"
            >
              فهمت وأوافق
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}