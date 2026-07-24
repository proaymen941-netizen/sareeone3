import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, Search, Package, MapPin, Clock, Phone, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';

export default function TrackOrdersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchOrderNumber, setSearchOrderNumber] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // جلب الطلبات النشطة للعميل
  const { data: regularOrders = [], isLoading: loadingOrders } = useQuery<any[]>({
    queryKey: ['/api/orders/customer', user?.phone],
    enabled: !!user?.phone,
    queryFn: async () => {
      const res = await fetch(`/api/orders/customer/${user?.phone}`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: wasalniOrders = [], isLoading: loadingWasalni } = useQuery<any[]>({
    queryKey: ['/api/wasalni', { phone: user?.phone }],
    enabled: !!user?.phone,
    queryFn: async () => {
      const res = await fetch(`/api/wasalni?phone=${user?.phone}`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  const activeOrders = [
    ...regularOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)),
    ...wasalniOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).map(o => ({
      ...o,
      orderNumber: o.requestNumber,
      restaurantName: 'طلب وصل لي',
      isWaselLi: true
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSearchOrder = async () => {
    if (!searchOrderNumber.trim()) {
      toast({
        title: "أدخل رقم الطلب",
        description: "يرجى إدخال رقم الطلب للبحث",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      // البحث أولاً في الطلبات العادية ثم في وصل لي
      const res = await fetch(`/api/orders/number/${searchOrderNumber}`);
      if (res.ok) {
        const data = await res.json();
        setSearchedOrder(data);
      } else {
        const resW = await fetch(`/api/wasalni/number/${searchOrderNumber}`);
        if (resW.ok) {
          const dataW = await resW.json();
          setSearchedOrder({
            ...dataW,
            orderNumber: dataW.requestNumber,
            restaurantName: 'طلب وصل لي',
            isWaselLi: true
          });
        } else {
          setSearchedOrder(null);
          toast({
            title: "طلب غير موجود",
            description: "لم يتم العثور على طلب بهذا الرقم",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap = {
      pending: 'قيد المراجعة',
      confirmed: 'مؤكد',
      preparing: 'قيد التحضير',
      on_way: 'في الطريق',
      delivered: 'تم التوصيل'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap = {
      pending: 'bg-yellow-500',
      confirmed: 'bg-blue-500',
      preparing: 'bg-orange-500',
      on_way: 'bg-purple-500',
      delivered: 'bg-green-500'
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-500';
  };

  const handleViewFullTracking = (orderId: string) => {
    setLocation(`/orders/${orderId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/')}
              data-testid="button-back"
              className="rounded-full"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-black text-gray-900">تتبع الطلبات</h1>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-tight">تابع حالة طلباتك النشطة</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Search Section */}
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-black text-gray-400">
              <Search className="h-4 w-4" />
              البحث عن طلب محدد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="أدخل رقم الطلب..."
                value={searchOrderNumber}
                onChange={(e) => setSearchOrderNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchOrder()}
                className="rounded-2xl h-12 bg-gray-50 border-gray-100"
                data-testid="input-search-order"
              />
              <Button 
                onClick={handleSearchOrder}
                disabled={isSearching}
                className="rounded-2xl h-12 px-6 bg-primary font-black"
                data-testid="button-search-order"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'بحث'}
              </Button>
            </div>
            
            {searchedOrder && (
              <div className="animate-in fade-in slide-in-from-top-2 p-4 bg-orange-50/50 rounded-[1.5rem] border border-orange-100">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-primary text-sm">طلب #{searchedOrder.orderNumber}</span>
                    <Badge className={`${getStatusColor(searchedOrder.status)} text-white border-none rounded-full text-[10px] font-black`}>
                      {getStatusLabel(searchedOrder.status)}
                    </Badge>
                  </div>
                  <p className="text-xs font-bold text-gray-700">{searchedOrder.restaurantName || 'طلب متجر'}</p>
                  <Button
                    size="sm"
                    className="w-full mt-2 rounded-xl bg-white text-primary border border-orange-200 hover:bg-orange-100 transition-all font-black h-10 shadow-sm"
                    onClick={() => handleViewFullTracking(searchedOrder.id)}
                    data-testid="button-view-searched-order"
                  >
                    عرض صفحة التتبع المباشر
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Orders */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-black text-gray-400 px-2">
            <Clock className="h-4 w-4" />
            طلباتك الحالية
          </h3>

          {(loadingOrders || loadingWasalni) ? (
            <div className="flex flex-col items-center py-10 text-gray-300">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p className="text-xs font-bold">جاري تحديث الطلبات...</p>
            </div>
          ) : activeOrders.length > 0 ? (
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <div 
                  key={order.id}
                  className="p-5 bg-white rounded-[2rem] shadow-sm hover:shadow-md transition-all cursor-pointer border-none group"
                  onClick={() => handleViewFullTracking(order.id)}
                  data-testid={`order-card-${order.id}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0">
                      <h3 className="font-black text-gray-900 group-hover:text-primary transition-colors truncate">{order.restaurantName}</h3>
                      <p className="text-[10px] font-black text-gray-400 mt-0.5">رقم الطلب: {order.orderNumber}</p>
                    </div>
                    <Badge className={`${getStatusColor(order.status)} text-white border-none rounded-full text-[10px] font-black shrink-0`}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center">
                        <Package className="h-4 w-4 text-gray-400" />
                      </div>
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">الحالة: {getStatusLabel(order.status)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-primary">
                      <span className="text-[10px] font-black">تتبع</span>
                      <ArrowLeft className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
              <Package className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-xs font-bold text-gray-400">لا توجد طلبات نشطة حالياً</p>
              <Button 
                variant="link" 
                className="mt-2 text-primary font-black text-xs"
                onClick={() => setLocation('/')}
              >
                اطلب الآن
              </Button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 rounded-[2rem] border-none shadow-sm bg-white hover:bg-orange-50 transition-all group"
            onClick={() => setLocation('/orders')}
          >
            <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all">
              <Package className="h-5 w-5" />
            </div>
            <span className="text-xs font-black text-gray-700">تاريخ الطلبات</span>
          </Button>
          
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 rounded-[2rem] border-none shadow-sm bg-white hover:bg-blue-50 transition-all group"
            onClick={() => setLocation('/addresses')}
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <MapPin className="h-5 w-5" />
            </div>
            <span className="text-xs font-black text-gray-700">عناويني</span>
          </Button>
        </div>

        {/* Contact Support */}
        <div className="bg-gray-900 rounded-[2.5rem] p-6 text-white shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
          <h3 className="font-black text-lg mb-2 relative z-10">هل تواجه مشكلة؟</h3>
          <p className="text-xs text-gray-400 font-bold mb-5 relative z-10 leading-relaxed">
            فريق الدعم الفني متواجد لمساعدتك في تتبع طلبك أو حل أي مشكلة قد تواجهك.
          </p>
          <div className="flex gap-3 relative z-10">
            <Button
              className="flex-1 rounded-2xl bg-white text-gray-900 font-black hover:bg-gray-100 h-11 text-xs gap-2"
              onClick={() => window.open('tel:+967771234567')}
            >
              <Phone className="h-3.5 w-3.5" />
              اتصال سريع
            </Button>
            <Button
              className="flex-1 rounded-2xl bg-[#25D366] text-white font-black hover:opacity-90 h-11 text-xs gap-2"
              onClick={() => window.open('https://wa.me/967771234567')}
            >
              <User className="h-3.5 w-3.5" />
              واتساب
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
