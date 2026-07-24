import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Database, Download, Upload, RefreshCw, Clock, Package,
  ShoppingBag, Truck, Tag, CheckCircle, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function AdminBackup() {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(
    localStorage.getItem('last_backup_date')
  );

  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ['/api/admin/backup/stats'],
  });

  const handleDownloadBackup = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/admin/backup', {
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('فشل في تحميل النسخة الاحتياطية');

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tamtom-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const now = new Date().toLocaleString('ar-YE');
      setLastBackup(now);
      localStorage.setItem('last_backup_date', now);

      toast({
        title: "تم التحميل",
        description: "تم تحميل النسخة الاحتياطية بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل النسخة الاحتياطية",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const statCards = [
    { label: 'الطلبات', value: stats?.counts?.orders || 0, icon: ShoppingBag, color: 'text-blue-600 bg-blue-50' },
    { label: 'السائقون', value: stats?.counts?.drivers || 0, icon: Truck, color: 'text-orange-600 bg-orange-50' },
    { label: 'المطاعم', value: stats?.counts?.restaurants || 0, icon: Package, color: 'text-green-600 bg-green-50' },
    { label: 'التصنيفات', value: stats?.counts?.categories || 0, icon: Tag, color: 'text-purple-600 bg-purple-50' },
    { label: 'المنتجات', value: stats?.counts?.menuItems || 0, icon: Package, color: 'text-red-600 bg-red-50' },
    { label: 'العروض', value: stats?.counts?.specialOffers || 0, icon: Tag, color: 'text-yellow-600 bg-yellow-50' },
  ];

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Database className="h-7 w-7 text-orange-500" />
          النسخ الاحتياطي واستعادة البيانات
        </h1>
        <p className="text-gray-500 text-sm mt-1">إدارة وحفظ بيانات النظام بأمان</p>
      </div>

      {/* Last Backup Status */}
      <Card className={lastBackup ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
        <CardContent className="p-4 flex items-center gap-3">
          {lastBackup ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800">آخر نسخة احتياطية</p>
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {lastBackup}
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-800">لم يتم إنشاء نسخة احتياطية بعد</p>
                <p className="text-sm text-yellow-600">نوصي بإنشاء نسخة احتياطية دورية لحماية بياناتك</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Data Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ملخص البيانات الحالية</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className={`rounded-xl p-4 ${stat.color.split(' ')[1]}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${stat.color.split(' ')[0]}`} />
                      <span className="text-xs text-gray-600 font-medium">{stat.label}</span>
                    </div>
                    <p className={`text-2xl font-bold ${stat.color.split(' ')[0]}`}>{stat.value}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Download Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-5 w-5 text-orange-500" />
            تحميل نسخة احتياطية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            يتم تصدير جميع بيانات النظام (الطلبات، السائقين، المنتجات، التصنيفات، العروض، المستخدمين) 
            في ملف JSON واحد يمكن حفظه على جهازك أو رفعه على Google Drive.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">ماذا يتضمن الملف؟</p>
            <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
              <span>✓ جميع الطلبات وتفاصيلها</span>
              <span>✓ بيانات السائقين والمحافظ</span>
              <span>✓ المنتجات والتصنيفات</span>
              <span>✓ العروض والكوبونات</span>
              <span>✓ بيانات المطاعم</span>
              <span>✓ معلومات المستخدمين</span>
            </div>
          </div>

          <Button 
            onClick={handleDownloadBackup}
            disabled={isDownloading}
            className="bg-orange-500 hover:bg-orange-600 text-white"
            size="lg"
          >
            {isDownloading ? (
              <>
                <RefreshCw className="h-5 w-5 ml-2 animate-spin" />
                جاري التحميل...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 ml-2" />
                تحميل نسخة احتياطية الآن
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-blue-100 bg-blue-50">
        <CardContent className="p-4">
          <p className="font-semibold text-blue-800 mb-2 text-sm">💡 نصائح لحفظ بياناتك</p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• احتفظ بنسخة احتياطية أسبوعية على الأقل</li>
            <li>• قم برفع الملف على Google Drive لحفظ آمن في السحابة</li>
            <li>• سمِّ الملفات بالتاريخ لسهولة التعرف عليها</li>
            <li>• احتفظ بنسخ من آخر 4 أسابيع على الأقل</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
