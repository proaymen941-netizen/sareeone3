import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Phone, MessageCircle, MapPin, Clock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { makePhoneCall, openWhatsApp } from './PermissionsManager';

interface Driver {
  id: string;
  name: string;
  phone: string;
  currentLocation?: string;
  isAvailable: boolean;
}

interface DriverCommunicationProps {
  driver: Driver;
  orderNumber: string;
  customerLocation?: string;
}

export function DriverCommunication({ driver, orderNumber, customerLocation }: DriverCommunicationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const { toast } = useToast();

  const handlePhoneCall = () => {
    try {
      makePhoneCall(driver.phone);
      toast({
        title: 'جاري الاتصال',
        description: `جاري الاتصال بالمندوب ${driver.name}`,
      });
    } catch (error) {
      toast({
        title: 'خطأ في الاتصال',
        description: 'لا يمكن إجراء المكالمة الآن',
        variant: 'destructive',
      });
    }
  };

  // فتح خرائط جوجل للتنقل
  const openGoogleMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    
    // للأجهزة المحمولة، محاولة فتح تطبيق الخرائط
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      // محاولة فتح تطبيق خرائط جوجل
      const mobileAppUrl = `comgooglemaps://?q=${encodedAddress}`;
      window.location.href = mobileAppUrl;
      
      // إذا فشل فتح التطبيق، فتح المتصفح بعد ثانية
      setTimeout(() => {
        const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
        window.open(webUrl, '_blank');
      }, 1000);
    } else {
      // للحاسوب، فتح في المتصفح
      const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      window.open(webUrl, '_blank');
    }
  };

  const handleWhatsAppMessage = (message: string) => {
    try {
      const fullMessage = `مرحباً ${driver.name}، طلب رقم ${orderNumber}: ${message}`;
      openWhatsApp(driver.phone, fullMessage);
      toast({
        title: 'تم فتح الواتساب',
        description: 'تم فتح محادثة الواتساب مع المندوب',
      });
      setIsOpen(false);
      setCustomMessage('');
    } catch (error) {
      toast({
        title: 'خطأ في فتح الواتساب',
        description: 'لا يمكن فتح الواتساب الآن',
        variant: 'destructive',
      });
    }
  };

  const quickMessages = [
    'أين وصلت؟',
    'كم من الوقت تحتاج للوصول؟',
    'لقد تغير العنوان',
    'سأنتظرك في المدخل',
    'المبنى رقم كم؟',
    'اتصل بي عند الوصول'
  ];

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            معلومات المندوب
          </div>
          <Badge variant={driver.isAvailable ? "default" : "secondary"}>
            {driver.isAvailable ? 'متاح' : 'غير متاح'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Driver Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">اسم المندوب:</span>
            <span className="font-medium">{driver.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">رقم الهاتف:</span>
            <span className="font-medium">{driver.phone}</span>
          </div>
          {driver.currentLocation && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">الموقع الحالي:</span>
              <span className="font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {driver.currentLocation}
              </span>
            </div>
          )}
        </div>

        {/* Communication Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handlePhoneCall}
            className="flex items-center gap-2"
            data-testid="call-driver-button"
          >
            <Phone className="h-4 w-4" />
            اتصال
          </Button>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                data-testid="whatsapp-driver-button"
              >
                <MessageCircle className="h-4 w-4" />
                واتساب
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>إرسال رسالة للمندوب</DialogTitle>
                <DialogDescription>
                  اختر رسالة سريعة أو اكتب رسالة مخصصة
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Quick Messages */}
                <div>
                  <h4 className="text-sm font-medium mb-2">الرسائل السريعة:</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {quickMessages.map((message, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleWhatsAppMessage(message)}
                        className="text-right justify-start h-auto py-2"
                        data-testid={`quick-message-${index}`}
                      >
                        {message}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Message */}
                <div>
                  <h4 className="text-sm font-medium mb-2">رسالة مخصصة:</h4>
                  <Textarea
                    placeholder="اكتب رسالتك هنا..."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="min-h-20"
                    data-testid="custom-message-input"
                  />
                  <Button
                    onClick={() => handleWhatsAppMessage(customMessage)}
                    disabled={!customMessage.trim()}
                    className="w-full mt-2"
                    data-testid="send-custom-message"
                  >
                    إرسال الرسالة
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Location Info */}
        {customerLocation && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">عنوان التوصيل:</span>
            </div>
            <p className="text-sm text-muted-foreground">{customerLocation}</p>
          </div>
        )}

        {/* Order Number */}
        <div className="bg-primary/10 p-3 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">رقم الطلب:</span>
            <span className="font-bold text-primary">{orderNumber}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook for driver communication
export function useDriverCommunication() {
  const { toast } = useToast();

  const callDriver = (driverPhone: string, driverName: string) => {
    try {
      makePhoneCall(driverPhone);
      toast({
        title: 'جاري الاتصال',
        description: `جاري الاتصال بالمندوب ${driverName}`,
      });
    } catch (error) {
      toast({
        title: 'خطأ في الاتصال',
        description: 'لا يمكن إجراء المكالمة الآن',
        variant: 'destructive',
      });
    }
  };

  const messageDriver = (driverPhone: string, driverName: string, orderNumber: string, message: string) => {
    try {
      const fullMessage = `مرحباً ${driverName}، طلب رقم ${orderNumber}: ${message}`;
      openWhatsApp(driverPhone, fullMessage);
      toast({
        title: 'تم فتح الواتساب',
        description: 'تم فتح محادثة الواتساب مع المندوب',
      });
    } catch (error) {
      toast({
        title: 'خطأ في فتح الواتساب',
        description: 'لا يمكن فتح الواتساب الآن',
        variant: 'destructive',
      });
    }
  };

  return { callDriver, messageDriver };
}