import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Store, DollarSign, ShoppingBag, TrendingUp, Star,
  Eye, Phone, MapPin, Clock, Percent
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface RestaurantStats {
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalCommission: number;
  netRevenue: number;
  averageOrderValue: number;
}

interface RestaurantDetail {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  isOpen: boolean;
  rating: string;
  createdAt: string;
  stats: RestaurantStats;
  wallet: {
    balance: number;
    totalEarned: number;
    totalCommission: number;
  };
}

export const RestaurantManagementPanel: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantDetail | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['/api/admin/restaurants-summary'],
    queryFn: async () => {
      const response = await fetch('/api/admin/restaurants-summary');
      if (!response.ok) throw new Error('Failed to fetch restaurants');
      return response.json();
    },
  });

  const filteredRestaurants = restaurants.filter((restaurant: RestaurantDetail) =>
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (restaurant.phone && restaurant.phone.includes(searchTerm))
  );

  const totalRevenue = restaurants.reduce((sum: number, r: RestaurantDetail) => sum + (r.stats?.totalRevenue || 0), 0);
  const totalCommission = restaurants.reduce((sum: number, r: RestaurantDetail) => sum + (r.stats?.totalCommission || 0), 0);
  const totalPayable = restaurants.reduce((sum: number, r: RestaurantDetail) => sum + (r.wallet?.balance || 0), 0);

  const handleViewDetails = (restaurant: RestaurantDetail) => {
    setSelectedRestaurant(restaurant);
    setShowDetailsDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin">
          <Store className="h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">إدارة المتاجر</h1>
        <Input
          placeholder="ابحث بالاسم أو الهاتف..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المتاجر</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{restaurants.length}</div>
            <p className="text-xs text-muted-foreground">
              {restaurants.filter((r: RestaurantDetail) => r.isActive).length} نشط
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العمولات</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalCommission)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المستحقات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalPayable)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Restaurants Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المتاجر</CardTitle>
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
                  <TableHead>المبيعات</TableHead>
                  <TableHead>العمولات</TableHead>
                  <TableHead>المستحق</TableHead>
                  <TableHead>التقييم</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRestaurants.map((restaurant: RestaurantDetail) => (
                  <TableRow key={restaurant.id}>
                    <TableCell className="font-medium">{restaurant.name}</TableCell>
                    <TableCell>{restaurant.phone || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Badge variant={restaurant.isActive ? 'default' : 'secondary'}>
                          {restaurant.isActive ? 'مفعل' : 'معطل'}
                        </Badge>
                        <Badge variant={restaurant.isOpen ? 'default' : 'outline'}>
                          {restaurant.isOpen ? 'مفتوح' : 'مغلق'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{restaurant.stats?.totalOrders || 0}</TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      {formatCurrency(restaurant.stats?.totalRevenue || 0)}
                    </TableCell>
                    <TableCell className="text-red-600 font-semibold">
                      {formatCurrency(restaurant.stats?.totalCommission || 0)}
                    </TableCell>
                    <TableCell className="text-blue-600 font-bold">
                      {formatCurrency(restaurant.wallet?.balance || 0)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        {parseFloat(restaurant.rating || '0').toFixed(1)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(restaurant)}
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

      {/* Restaurant Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل المتجر - {selectedRestaurant?.name}</DialogTitle>
          </DialogHeader>

          {selectedRestaurant && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">اسم المتجر</p>
                  <p className="font-semibold">{selectedRestaurant.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                  <p className="font-semibold">{selectedRestaurant.phone || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">العنوان</p>
                  <p className="font-semibold">{selectedRestaurant.address || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ التسجيل</p>
                  <p className="font-semibold">{formatDate(new Date(selectedRestaurant.createdAt))}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">التقييم</p>
                  <p className="font-semibold">
                    {parseFloat(selectedRestaurant.rating || '0').toFixed(1)} ⭐
                  </p>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">إحصائيات الأداء</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-secondary p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
                    <p className="text-2xl font-bold">{selectedRestaurant.stats?.totalOrders || 0}</p>
                  </div>
                  <div className="bg-secondary p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">الطلبات المكتملة</p>
                    <p className="text-2xl font-bold">{selectedRestaurant.stats?.completedOrders || 0}</p>
                  </div>
                  <div className="bg-secondary p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">متوسط الطلب</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(selectedRestaurant.stats?.averageOrderValue || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">التفصيل المالي</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <span className="text-sm text-muted-foreground">إجمالي المبيعات</span>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(selectedRestaurant.stats?.totalRevenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <span className="text-sm text-muted-foreground">العمولات المحسوبة</span>
                    <span className="text-lg font-bold text-red-600">
                      {formatCurrency(selectedRestaurant.stats?.totalCommission || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <span className="text-sm text-muted-foreground">صافي الدخل</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatCurrency(selectedRestaurant.stats?.netRevenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border-2 border-purple-300">
                    <span className="text-sm font-semibold">الرصيد المستحق</span>
                    <span className="text-lg font-bold text-purple-600">
                      {formatCurrency(selectedRestaurant.wallet?.balance || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Wallet Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">معلومات المحفظة</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">إجمالي المكاسب</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(selectedRestaurant.wallet?.totalEarned || 0)}
                    </p>
                  </div>
                  <div className="bg-secondary p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">إجمالي العمولات</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(selectedRestaurant.wallet?.totalCommission || 0)}
                    </p>
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
