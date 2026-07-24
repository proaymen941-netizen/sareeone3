// AdminRestaurantsAdvanced.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Store, DollarSign, BarChart3, Users, TrendingUp, Calendar,
  Download, Filter, Search, Eye, Edit, Phone, Mail, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface RestaurantStats {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  status: 'active' | 'inactive' | 'suspended';
  rating: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  commissionEarned: number;
  pendingCommission: number;
  todayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  avgOrderValue: number;
  joinDate: string;
  walletBalance: number;
  withdrawalRequests: Array<{
    id: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
  }>;
  performance: {
    orderCompletionRate: number;
    customerSatisfaction: number;
    averagePreparationTime: number;
  };
  businessHours: {
    opening: string;
    closing: string;
    days: string[];
  };
}

export default function AdminRestaurantsAdvanced() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantStats | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 🔄 جلب بيانات المطاعم مع الإحصائيات
  const { data: restaurants, isLoading } = useQuery<RestaurantStats[]>({
    queryKey: ['/api/admin/restaurants/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/restaurants/stats');
      return response.json();
    },
  });

  // ✏️ تحديث حالة المطعم
  const updateRestaurantStatus = useMutation({
    mutationFn: async ({ restaurantId, status }: { restaurantId: string; status: string }) => {
      const response = await apiRequest('PUT', `/api/admin/restaurants/${restaurantId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants/stats'] });
      toast({
        title: "تم تحديث الحالة",
        description: "تم تحديث حالة المطعم بنجاح",
      });
    },
  });

  // 💰 معالجة تحويلات المحفظة
  const processRestaurantPayout = useMutation({
    mutationFn: async ({ restaurantId, amount }: { restaurantId: string; amount: number }) => {
      const response = await apiRequest('POST', `/api/admin/restaurants/${restaurantId}/payout`, { amount });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants/stats'] });
      toast({
        title: "تم التحويل",
        description: "تم تحويل المبلغ بنجاح",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'نشط', color: 'bg-green-100 text-green-800' },
      inactive: { label: 'غير نشط', color: 'bg-gray-100 text-gray-800' },
      suspended: { label: 'موقوف', color: 'bg-red-100 text-red-800' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Store className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة حسابات المطاعم</h1>
            <p className="text-muted-foreground">إدارة شاملة لبيانات وأداء وإيرادات المطاعم</p>
          </div>
        </div>
        
        <Button variant="outline" onClick={() => {/* تصدير التقارير */}} className="gap-2">
          <Download className="h-4 w-4" />
          تصدير التقارير
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">إجمالي المطاعم</p>
              <p className="text-2xl font-bold">{restaurants?.length || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold">
                {restaurants?.reduce((sum, r) => sum + r.totalRevenue, 0).toFixed(2)} ريال
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">العمولات المستحقة</p>
              <p className="text-2xl font-bold">
                {restaurants?.reduce((sum, r) => sum + r.pendingCommission, 0).toFixed(2)} ريال
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">متوسط سعر الطلب</p>
              <p className="text-2xl font-bold">
                {restaurants?.reduce((sum, r) => sum + r.avgOrderValue, 0) / (restaurants?.length || 1)} ريال
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">متوسط التقييم</p>
              <p className="text-2xl font-bold">
                {(restaurants?.reduce((sum, r) => sum + r.rating, 0) / (restaurants?.length || 1)).toFixed(1)} ⭐
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">جميع المطاعم</TabsTrigger>
          <TabsTrigger value="active">النشطة</TabsTrigger>
          <TabsTrigger value="top">الأعلى أداء</TabsTrigger>
          <TabsTrigger value="financial">الإدارة المالية</TabsTrigger>
          <TabsTrigger value="reports">التقارير</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>قائمة المطاعم</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="البحث عن مطعم..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المطعم</TableHead>
                    <TableHead>المالك</TableHead>
                    <TableHead>التواصل</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التقييم</TableHead>
                    <TableHead>الإيرادات</TableHead>
                    <TableHead>الطلبات</TableHead>
                    <TableHead>المحفظة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restaurants?.map((restaurant) => (
                    <TableRow key={restaurant.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold">
                            {restaurant.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{restaurant.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {restaurant.address.substring(0, 30)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{restaurant.ownerName}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {restaurant.phone}
                          </p>
                          <p className="text-sm flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {restaurant.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(restaurant.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{restaurant.rating.toFixed(1)} ⭐</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{restaurant.totalRevenue.toFixed(2)} ريال</p>
                          <p className="text-xs text-muted-foreground">
                            العمولة: {restaurant.commissionEarned.toFixed(2)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm">إجمالي: {restaurant.totalOrders}</p>
                          <p className="text-xs text-green-600">مكتمل: {restaurant.completedOrders}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-green-600">
                            {restaurant.walletBalance.toFixed(2)} ريال
                          </p>
                          {restaurant.pendingCommission > 0 && (
                            <Badge variant="outline" className="text-xs">
                              مستحق: {restaurant.pendingCommission.toFixed(2)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRestaurant(restaurant);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          {restaurant.walletBalance > 0 && (
                            <Button
                              size="sm"
                              onClick={() => processRestaurantPayout.mutate({
                                restaurantId: restaurant.id,
                                amount: restaurant.walletBalance
                              })}
                            >
                              تحويل
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويبات أخرى */}
        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>الإدارة المالية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* ملخص مالي */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                      <p className="text-2xl font-bold">
                        {restaurants?.reduce((sum, r) => sum + r.totalRevenue, 0).toFixed(2)} ريال
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">العمولات المستحقة</p>
                      <p className="text-2xl font-bold">
                        {restaurants?.reduce((sum, r) => sum + r.pendingCommission, 0).toFixed(2)} ريال
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">المبالغ المحولة</p>
                      <p className="text-2xl font-bold">
                        {restaurants?.reduce((sum, r) => sum + r.walletBalance, 0).toFixed(2)} ريال
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* جدول طلبات التحويل */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">طلبات التحويل المعلقة</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المطعم</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>طريقة التحويل</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {restaurants?.flatMap(restaurant => 
                        restaurant.withdrawalRequests
                          .filter(request => request.status === 'pending')
                          .map(request => (
                            <TableRow key={request.id}>
                              <TableCell>{restaurant.name}</TableCell>
                              <TableCell className="font-bold">{request.amount.toFixed(2)} ريال</TableCell>
                              <TableCell>تحويل بنكي</TableCell>
                              <TableCell>
                                <Badge className="bg-yellow-100 text-yellow-800">معلق</Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(request.createdAt).toLocaleDateString('ar-YE')}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => {/* قبول التحويل */}}>
                                    قبول
                                  </Button>
                                  <Button variant="destructive" size="sm" onClick={() => {/* رفض التحويل */}}>
                                    رفض
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>تقارير المبيعات</CardTitle>
              </CardHeader>
              <CardContent>
                {/* مخططات المبيعات */}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>أفضل المطاعم أداءً</CardTitle>
              </CardHeader>
              <CardContent>
                {/* قائمة أفضل المطاعم */}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* تفاصيل المطعم Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>تفاصيل المطعم</DialogTitle>
          </DialogHeader>
          
          {selectedRestaurant && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                <TabsTrigger value="financial">المالية</TabsTrigger>
                <TabsTrigger value="orders">الطلبات</TabsTrigger>
                <TabsTrigger value="settings">الإعدادات</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>اسم المطعم</Label>
                    <p className="font-medium">{selectedRestaurant.name}</p>
                  </div>
                  <div>
                    <Label>اسم المالك</Label>
                    <p className="font-medium">{selectedRestaurant.ownerName}</p>
                  </div>
                  <div>
                    <Label>رقم الهاتف</Label>
                    <p className="font-medium">{selectedRestaurant.phone}</p>
                  </div>
                  <div>
                    <Label>البريد الإلكتروني</Label>
                    <p className="font-medium">{selectedRestaurant.email}</p>
                  </div>
                  <div className="col-span-2">
                    <Label>العنوان</Label>
                    <p className="font-medium">{selectedRestaurant.address}</p>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>إحصائيات الأداء</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{selectedRestaurant.totalOrders}</p>
                        <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{selectedRestaurant.completedOrders}</p>
                        <p className="text-sm text-muted-foreground">مكتملة</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{selectedRestaurant.rating.toFixed(1)} ⭐</p>
                        <p className="text-sm text-muted-foreground">التقييم</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{selectedRestaurant.avgOrderValue.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">متوسط الطلب</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="financial">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                        <p className="text-2xl font-bold">{selectedRestaurant.totalRevenue.toFixed(2)} ريال</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">العمولات المستحقة</p>
                        <p className="text-2xl font-bold">{selectedRestaurant.pendingCommission.toFixed(2)} ريال</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">الرصيد المتاح</p>
                        <p className="text-2xl font-bold text-green-600">
                          {selectedRestaurant.walletBalance.toFixed(2)} ريال
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">سجل التحويلات</h3>
                    <div className="space-y-2">
                      {selectedRestaurant.withdrawalRequests.map(request => (
                        <div key={request.id} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{request.amount.toFixed(2)} ريال</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(request.createdAt).toLocaleDateString('ar-YE')}
                            </p>
                          </div>
                          <Badge className={
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {request.status === 'pending' ? 'معلق' :
                             request.status === 'approved' ? 'مقبول' : 'مرفوض'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
