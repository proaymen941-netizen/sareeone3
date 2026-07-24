import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Package, DollarSign, Star, Clock, Target } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface DashboardStats {
  todayOrders: number;
  todayEarnings: number;
  completedToday: number;
  totalOrders: number;
  totalEarnings: number;
  averageRating: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface StatsPageProps {
  driverId: string;
}

export default function StatsPage({ driverId }: StatsPageProps) {
  const driverToken = localStorage.getItem('driver_token');

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: [`/api/drivers/app/dashboard`],
    queryFn: async () => {
      const response = await fetch(`/api/drivers/app/dashboard`, {
        headers: {
          'Authorization': `Bearer ${driverToken}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    refetchInterval: 30000,
    enabled: !!driverToken
  });

  const stats: DashboardStats = dashboardData?.stats || {
    todayOrders: 0,
    todayEarnings: 0,
    completedToday: 0,
    totalOrders: 0,
    totalEarnings: 0,
    averageRating: 0,
  };

  const reviews: Review[] = dashboardData?.reviews || [];

  if (isLoading && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري تحميل الإحصائيات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">الإحصائيات</h1>

        {/* Today's Stats */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            إحصائيات اليوم
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">طلبات اليوم</p>
                    <p className="text-xl font-bold">{stats.todayOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">الأرباح اليوم</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(stats.todayEarnings)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Target className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">مكتملة اليوم</p>
                    <p className="text-xl font-bold">{stats.completedToday}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Star className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">معدل التقييم</p>
                    <p className="text-xl font-bold">{stats.averageRating.toFixed(1)} ⭐</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Overall Stats */}
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            الإحصائيات الإجمالية
          </h2>
          <Card className="mb-4">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-gray-600">إجمالي الطلبات</span>
                  <span className="text-2xl font-bold">{stats.totalOrders}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-gray-600">إجمالي الأرباح</span>
                  <span className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalEarnings)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">متوسط الربح لكل طلب</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {stats.totalOrders > 0 ? formatCurrency(stats.totalEarnings / stats.totalOrders) : '0 ريال'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div>
          <h2 className="text-lg font-bold mb-4">مؤشرات الأداء</h2>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">معدل الإنجاز</span>
                    <Badge variant="outline">
                      {stats.totalOrders > 0 ? ((stats.completedToday / stats.todayOrders) * 100).toFixed(0) : 0}%
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${stats.totalOrders > 0 ? (stats.completedToday / stats.todayOrders) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">التقييم</span>
                    <Badge variant="outline">{stats.averageRating.toFixed(1)} ⭐</Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full transition-all"
                      style={{ width: `${(stats.averageRating / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Reviews */}
        <div className="mt-8 pb-20">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-600" />
            تقييمات العملاء
          </h2>
          {reviews.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                لا توجد تقييمات بعد
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${
                              s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString('ar-YE')}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-700 mt-2">{review.comment}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
