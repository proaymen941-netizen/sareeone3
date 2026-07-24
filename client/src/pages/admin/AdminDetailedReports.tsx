import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Users, Truck, ShoppingBag, UserCog, Calendar, FileText, Download, PackageCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function AdminDetailedReports() {
  const [reportType, setReportType] = useState('products');
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ['/api/admin/reports/detailed', reportType, dateRange],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        type: reportType,
        startDate: dateRange.from?.toISOString() || '',
        endDate: dateRange.to?.toISOString() || '',
      });
      const response = await apiRequest('GET', `/api/admin/reports/detailed?${queryParams.toString()}`);
      return response.json();
    },
  });

  const reportConfig = {
    orders: { title: 'تقارير الطلبات', icon: PackageCheck, color: 'text-orange-600' },
    products: { title: 'تقارير المنتجات', icon: ShoppingBag, color: 'text-blue-600' },
    drivers: { title: 'تقارير السائقين', icon: Truck, color: 'text-green-600' },
    customers: { title: 'تقارير العملاء', icon: Users, color: 'text-purple-600' },
    admins: { title: 'تقارير المسؤولين', icon: UserCog, color: 'text-orange-600' },
  };

  const Icon = reportConfig[reportType as keyof typeof reportConfig].icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">التقارير التفصيلية</h1>
            <p className="text-muted-foreground">تحليل أداء النظام، المنتجات، السائقين والمستخدمين</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="orders">تقارير الطلبات</SelectItem>
              <SelectItem value="products">تقارير المنتجات</SelectItem>
              <SelectItem value="drivers">تقارير السائقين</SelectItem>
              <SelectItem value="customers">تقارير العملاء</SelectItem>
              <SelectItem value="admins">تقارير المسؤولين</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> تصدير PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(reportConfig).map(([key, config]) => {
          const ConfigIcon = config.icon;
          return (
            <Card key={key} className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary ${reportType === key ? 'ring-2 ring-primary bg-primary/5' : ''}`} onClick={() => setReportType(key)}>
              <CardHeader className="p-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ConfigIcon className={`h-5 w-5 ${config.color}`} />
                  {config.title}
                </CardTitle>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className={`h-6 w-6 ${reportConfig[reportType as keyof typeof reportConfig].color}`} />
              <div>
                <CardTitle>{reportConfig[reportType as keyof typeof reportConfig].title}</CardTitle>
                <CardDescription>عرض إحصائيات تفصيلية بحسب نوع التقرير</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              منذ {format(dateRange.from, 'dd MMMM yyyy', { locale: ar })} إلى {format(dateRange.to, 'dd MMMM yyyy', { locale: ar })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">جاري جلب البيانات...</div>
          ) : report?.data?.length === 0 ? (
            <div className="p-12 text-center border rounded-lg bg-muted/20">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">لا توجد بيانات متاحة لهذا التقرير حالياً</p>
              <p className="text-sm text-muted-foreground mt-1">جرب تغيير الفترة الزمنية أو نوع التقرير</p>
            </div>
          ) : (
            <Table dir="rtl">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم / العنوان</TableHead>
                  <TableHead className="text-right">التفاصيل</TableHead>
                  <TableHead className="text-right">القيمة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report?.data?.map((item: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.details}</TableCell>
                    <TableCell>{item.value}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${item.statusColor || 'bg-gray-100'}`}>{item.status}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
