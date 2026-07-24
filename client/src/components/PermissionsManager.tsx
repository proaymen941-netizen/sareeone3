import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, MessageCircle, Camera, Mic, Bell, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface Permission {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  required: boolean;
  status: 'granted' | 'denied' | 'not_requested';
  requestFunction: () => Promise<boolean>;
}

interface PermissionsManagerProps {
  onPermissionUpdate?: (permission: string, granted: boolean) => void;
}

export function PermissionsManager({ onPermissionUpdate }: PermissionsManagerProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Request location permission
  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      if (!navigator.geolocation) {
        throw new Error('الموقع الجغرافي غير مدعوم');
      }

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('Location granted:', position);
            resolve(true);
          },
          (error) => {
            console.error('Location denied:', error);
            resolve(false);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
      });
    } catch (error) {
      console.error('Location error:', error);
      return false;
    }
  };

  // Request notification permission
  const requestNotificationPermission = async (): Promise<boolean> => {
    try {
      if (!('Notification' in window)) {
        throw new Error('الإشعارات غير مدعومة');
      }

      if (Notification.permission === 'granted') {
        return true;
      }

      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Notification error:', error);
      return false;
    }
  };

  // Request camera permission
  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      return true;
    } catch (error) {
      console.error('Camera error:', error);
      return false;
    }
  };

  // Request microphone permission
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      return true;
    } catch (error) {
      console.error('Microphone error:', error);
      return false;
    }
  };

  // Open phone dialer
  const requestPhonePermission = async (): Promise<boolean> => {
    try {
      // For phone calls, we just simulate permission since it's handled by the OS
      return true;
    } catch (error) {
      console.error('Phone error:', error);
      return false;
    }
  };

  // Open WhatsApp
  const requestWhatsAppPermission = async (): Promise<boolean> => {
    try {
      // For WhatsApp, we just simulate permission since it's handled by the OS
      return true;
    } catch (error) {
      console.error('WhatsApp error:', error);
      return false;
    }
  };

  // Initialize permissions
  useEffect(() => {
    const initPermissions: Permission[] = [
      {
        id: 'location',
        name: 'تحديد الموقع',
        description: 'للعثور على أقرب المطاعم وتحديد عنوان التوصيل',
        icon: MapPin,
        required: true,
        status: 'not_requested',
        requestFunction: requestLocationPermission,
      },
      {
        id: 'notifications',
        name: 'الإشعارات',
        description: 'لتلقي تحديثات الطلب وإشعارات العروض الخاصة',
        icon: Bell,
        required: true,
        status: 'not_requested',
        requestFunction: requestNotificationPermission,
      },
      {
        id: 'phone',
        name: 'الاتصال الهاتفي',
        description: 'للتواصل مع المطعم أو المندوب',
        icon: Phone,
        required: false,
        status: 'not_requested',
        requestFunction: requestPhonePermission,
      },
      {
        id: 'whatsapp',
        name: 'واتساب',
        description: 'للتواصل السريع مع المندوب عبر الواتساب',
        icon: MessageCircle,
        required: false,
        status: 'not_requested',
        requestFunction: requestWhatsAppPermission,
      },
      {
        id: 'camera',
        name: 'الكاميرا',
        description: 'لرفع صور من الطلبات أو المشاكل',
        icon: Camera,
        required: false,
        status: 'not_requested',
        requestFunction: requestCameraPermission,
      },
      {
        id: 'microphone',
        name: 'الميكروفون',
        description: 'للبحث الصوتي والملاحظات المسجلة',
        icon: Mic,
        required: false,
        status: 'not_requested',
        requestFunction: requestMicrophonePermission,
      },
    ];

    setPermissions(initPermissions);
    checkExistingPermissions(initPermissions);
  }, []);

  // Check existing permissions
  const checkExistingPermissions = async (perms: Permission[]) => {
    const updatedPermissions = await Promise.all(
      perms.map(async (permission) => {
        let status: 'granted' | 'denied' | 'not_requested' = 'not_requested';

        try {
          switch (permission.id) {
            case 'location':
              if (navigator.geolocation) {
                // Check if location was previously granted
                status = localStorage.getItem('location_permission') === 'granted' ? 'granted' : 'not_requested';
              }
              break;
            case 'notifications':
              if ('Notification' in window) {
                if (Notification.permission === 'granted') status = 'granted';
                else if (Notification.permission === 'denied') status = 'denied';
              }
              break;
            case 'phone':
            case 'whatsapp':
              // These are always available on mobile devices
              status = 'granted';
              break;
            case 'camera':
            case 'microphone':
              // Check via permissions API if available
              if ('permissions' in navigator) {
                try {
                  const result = await navigator.permissions.query({ 
                    name: (permission.id === 'camera' ? 'camera' : 'microphone') as PermissionName 
                  });
                  status = result.state === 'granted' ? 'granted' : 
                          result.state === 'denied' ? 'denied' : 'not_requested';
                } catch {
                  status = 'not_requested';
                }
              }
              break;
          }
        } catch (error) {
          console.error(`Error checking ${permission.id} permission:`, error);
          status = 'not_requested';
        }

        return { ...permission, status };
      })
    );

    setPermissions(updatedPermissions);
  };

  // Request permission
  const requestPermission = async (permission: Permission) => {
    setLoading(true);
    try {
      const granted = await permission.requestFunction();
      
      const updatedPermissions = permissions.map(p => 
        p.id === permission.id 
          ? { ...p, status: granted ? 'granted' as const : 'denied' as const }
          : p
      );
      
      setPermissions(updatedPermissions);
      
      // Store location permission in localStorage
      if (permission.id === 'location' && granted) {
        localStorage.setItem('location_permission', 'granted');
      }
      
      onPermissionUpdate?.(permission.id, granted);
      
      toast({
        title: granted ? 'تم منح الإذن' : 'تم رفض الإذن',
        description: granted 
          ? `تم منح إذن ${permission.name} بنجاح`
          : `لا يمكن الوصول إلى ${permission.name}`,
        variant: granted ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('Permission request error:', error);
      toast({
        title: 'خطأ في الإذن',
        description: 'حدث خطأ أثناء طلب الإذن',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Request all required permissions
  const requestAllRequired = async () => {
    setLoading(true);
    const requiredPermissions = permissions.filter(p => p.required && p.status !== 'granted');
    
    for (const permission of requiredPermissions) {
      await requestPermission(permission);
    }
    setLoading(false);
  };

  // Get status icon and color
  const getStatusDisplay = (status: Permission['status']) => {
    switch (status) {
      case 'granted':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' };
      case 'denied':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' };
      default:
        return { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-100' };
    }
  };

  // Count permissions by status
  const permissionCounts = permissions.reduce(
    (acc, p) => {
      acc[p.status]++;
      return acc;
    },
    { granted: 0, denied: 0, not_requested: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            صلاحيات التطبيق
          </CardTitle>
          <CardDescription>
            إدارة صلاحيات الوصول للخدمات المختلفة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              مُمنوح: {permissionCounts.granted}
            </Badge>
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              مرفوض: {permissionCounts.denied}
            </Badge>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              غير مطلوب: {permissionCounts.not_requested}
            </Badge>
          </div>
          
          {permissionCounts.not_requested > 0 && (
            <Button 
              onClick={requestAllRequired} 
              disabled={loading}
              className="w-full"
              data-testid="request-all-permissions"
            >
              {loading ? 'جاري الطلب...' : 'طلب جميع الصلاحيات المطلوبة'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Permissions List */}
      <div className="space-y-4">
        {permissions.map((permission) => {
          const Icon = permission.icon;
          const statusDisplay = getStatusDisplay(permission.status);
          const StatusIcon = statusDisplay.icon;

          return (
            <Card key={permission.id} className="relative">
              {permission.required && (
                <Badge 
                  variant="secondary" 
                  className="absolute top-2 left-2 bg-blue-100 text-blue-800"
                >
                  مطلوب
                </Badge>
              )}
              
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground mb-1">
                        {permission.name}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {permission.description}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${statusDisplay.bg}`}>
                          <StatusIcon className={`h-3 w-3 ${statusDisplay.color}`} />
                          <span className={`text-xs font-medium ${statusDisplay.color}`}>
                            {permission.status === 'granted' ? 'مُمنوح' : 
                             permission.status === 'denied' ? 'مرفوض' : 'غير مطلوب'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    {permission.status !== 'granted' && (
                      <Button
                        size="sm"
                        onClick={() => requestPermission(permission)}
                        disabled={loading}
                        data-testid={`request-${permission.id}-permission`}
                      >
                        طلب الإذن
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>ملاحظة:</strong> بعض الصلاحيات مطلوبة لضمان عمل التطبيق بشكل صحيح. 
          يمكنك تغيير هذه الإعدادات لاحقاً من إعدادات المتصفح أو الجهاز.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Utility functions for making calls and opening WhatsApp
export const makePhoneCall = (phoneNumber: string) => {
  try {
    window.open(`tel:${phoneNumber}`, '_self');
  } catch (error) {
    console.error('Error making phone call:', error);
  }
};

export const openWhatsApp = (phoneNumber: string, message?: string) => {
  try {
    const encodedMessage = message ? encodeURIComponent(message) : '';
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\+/g, '')}${encodedMessage ? `?text=${encodedMessage}` : ''}`;
    window.open(whatsappUrl, '_blank');
  } catch (error) {
    console.error('Error opening WhatsApp:', error);
  }
};

export const getCurrentLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('الموقع الجغرافي غير مدعوم'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });
};