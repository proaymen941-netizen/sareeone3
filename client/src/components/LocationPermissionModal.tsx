import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Shield } from 'lucide-react';

interface LocationPermissionModalProps {
  onPermissionGranted: (position: GeolocationPosition) => void;
  onPermissionDenied: () => void;
}

export function LocationPermissionModal({ onPermissionGranted, onPermissionDenied }: LocationPermissionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (permission.state === 'granted') {
          setPermissionStatus('granted');
          getCurrentLocation();
        } else if (permission.state === 'denied') {
          setPermissionStatus('denied');
          setIsOpen(true);
        } else {
          setPermissionStatus('unknown');
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Error checking permission:', error);
        setIsOpen(true);
      }
    } else {
      setIsOpen(true);
    }
  };

  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPermissionStatus('granted');
          onPermissionGranted(position);
          setIsOpen(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setPermissionStatus('denied');
          onPermissionDenied();
          setIsOpen(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    }
  };

  const requestLocationPermission = () => {
    getCurrentLocation();
  };

  const handleDenyPermission = () => {
    setPermissionStatus('denied');
    onPermissionDenied();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">
            السماح بالوصول للموقع
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            نحتاج إلى معرفة موقعك لتوصيل طلباتك بدقة وعرض المطاعم القريبة منك
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
              <Navigation className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium">تحديد موقعك بدقة</div>
                <div className="text-muted-foreground">لضمان وصول الطلبات في الوقت المحدد</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
              <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium">عرض المطاعم القريبة</div>
                <div className="text-muted-foreground">اكتشف أفضل المطاعم في منطقتك</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
              <Shield className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium">حماية خصوصيتك</div>
                <div className="text-muted-foreground">لن نشارك موقعك مع أطراف خارجية</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleDenyPermission}
              className="flex-1"
            >
              تخطي
            </Button>
            <Button 
              onClick={requestLocationPermission}
              className="flex-1"
            >
              السماح بالوصول
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}