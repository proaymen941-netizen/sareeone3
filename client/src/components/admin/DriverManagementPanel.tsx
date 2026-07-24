import React, { useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Truck, Star, DollarSign, TrendingUp, Phone, MapPin,
  Eye, Calendar, AlertCircle, CheckCircle, Clock
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DriverStats {
  totalOrders: number;
  completedOrders: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  successRate: number;
}

interface DriverDetail {
  id: string;
  name: string;
  phone: string;
  isAvailable: boolean;
  isActive: boolean;
  createdAt: string;
  stats: DriverStats;
  wallet: {
    balance: number;
    totalEarned: number;
  };
}

export const DriverManagementPanel: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<DriverDetail | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['/api/admin/drivers-summary'],
    queryFn: async () => {
      const response = await fetch('/api/admin/drivers-summary');
      if (!response.ok) throw new Error('Failed to fetch drivers');
      return response.json();
    },
  });

  const filteredDrivers = drivers.filter((driver: DriverDetail) =>
    driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.phone.includes(searchTerm)
  );

  const handleViewDetails = (driver: DriverDetail) => {
    setSelectedDriver(driver);
    setShowDetailsDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin">
          <Truck className="h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">إدارة السائقين</h1>
        <div className="flex gap-2">
          <Input
            placeholder="ابحث بالاسم أو الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي السائقين</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers.length}</div>
            <p className="text-xs text-muted-foreground">
              {drivers.filter((d: DriverDetail) => d.isActive).length} نشط
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">السائقين المتاحين</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {drivers.filter((d: DriverDetail) => d.isAvailable).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأرباح</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                drivers.reduce((sum: number, d: DriverDetail) => sum + (d.wallet?.totalEarned || 0), 0)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط التقييم</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(drivers.reduce((sum: number, d: DriverDetail) => sum + (d.stats?.averageRating || 0), 0) / (drivers.length || 1)).toFixed(1)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drivers Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة السائقين</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table dir="rtl">
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الطلبات</TableHead>
                  <TableHead>الأرباح</TableHead>
                  <TableHead>التقييم</TableHead>
                  <TableHead>الرصيد</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.map((driver: DriverDetail) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>{driver.phone}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Badge variant={driver.isActive ? 'default' : 'secondary'}>
                          {driver.isActive ? 'مفعل' : 'معطل'}
                        </Badge>
                        <Badge variant={driver.isAvailable ? 'default' : 'outline'}>
                          {driver.isAvailable ? 'متاح' : 'مشغول'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{driver.stats?.totalOrders || 0}</TableCell>
                    <TableCell>{formatCurrency(driver.stats?.totalEarnings || 0)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        {(driver.stats?.averageRating || 0).toFixed(1)}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(driver.wallet?.balance || 0)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(driver)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Driver Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل السائق - {selectedDriver?.name}</DialogTitle>
          </DialogHeader>

          {selectedDriver && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">الاسم</p>
                  <p className="font-semibold">{selectedDriver.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                  <p className="font-semibold">{selectedDriver.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ التسجيل</p>
                  <p className="font-semibold">{formatDate(new Date(selectedDriver.createdAt))}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <Badge variant={selectedDriver.isActive ? 'default' : 'secondary'}>
                    {selectedDriver.isActive ? 'مفعل' : 'معطل'}
                  </Badge>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">إحصائيات الأداء</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-secondary p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
                    <p className="text-2xl font-bold">{selectedDriver.stats?.totalOrders || 0}</p>
                  </div>
                  <div className="bg-secondary p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">الطلبات المكتملة</p>
                    <p className="text-2xl font-bold">{selectedDriver.stats?.completedOrders || 0}</p>
                  </div>
                  <div className="bg-secondary p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">نسبة النجاح</p>
                    <p className="text-2xl font-bold">{(selectedDriver.stats?.successRate || 0).toFixed(0)}%</p>
                  </div>
                </div>
              </div>

              {/* Financial Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">المعلومات المالية</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">إجمالي الأرباح</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedDriver.stats?.totalEarnings || 0)}
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">الرصيد الحالي</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(selectedDriver.wallet?.balance || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reviews */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">التقييمات</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">متوسط التقييم</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {(selectedDriver.stats?.averageRating || 0).toFixed(1)} ⭐
                    </p>
                  </div>
                  <div className="bg-secondary p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">عدد التقييمات</p>
                    <p className="text-2xl font-bold">{selectedDriver.stats?.totalReviews || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
