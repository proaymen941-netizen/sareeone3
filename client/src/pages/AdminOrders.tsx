import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, CheckCircle, XCircle, Phone, MapPin, Filter, Navigation, Search, Truck, AlertCircle, Clock, User, Edit, DollarSign, Plus, Minus, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Order, Driver } from '@shared/schema';
import { generateOrderPDF } from '@/lib/generateOrderPDF';

interface EditableItem {
  name: string;
  quantity: number;
  price: number;
}

export default function AdminOrders() {
  const [, setAdminLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Record<string, string>>({});
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // حالة نافذة تعديل الأسعار
  const [editPricesOrder, setEditPricesOrder] = useState<Order | null>(null);
  const [editedItems, setEditedItems] = useState<EditableItem[]>([]);
  const [editedDeliveryFee, setEditedDeliveryFee] = useState('');
  const [priceAdjustmentNote, setPriceAdjustmentNote] = useState('');

  // حالة توليد السند PDF
  const [pdfLoadingIds, setPdfLoadingIds] = useState<Set<string>>(new Set());

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: statusFilter !== 'all' ? ['/api/orders', statusFilter] : ['/api/orders'],
    refetchInterval: 10000,
  });

  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ['/api/drivers'],
    refetchInterval: 15000,
  });

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'auth',
        payload: { userId: 'admin_dashboard', userType: 'admin' }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const liveEvents = [
          'order_update', 'driver_assigned', 'new_order',
          'order_status_changed', 'new_wasalni_request', 'NEW_NOTIFICATION',
          'driver_status_update'
        ];
        if (liveEvents.includes(message.type)) {
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
          queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [queryClient]);

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest('PUT', `/api/orders/${id}`, { status });
      return response.json();
    },
    onSuccess: (data, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      const statusLabels: Record<string, string> = {
        confirmed: 'مؤكد',
        preparing: 'قيد التحضير',
        on_way: 'في الطريق',
        delivered: 'مكتمل',
        cancelled: 'ملغي'
      };
      toast({
        title: "✅ تم تحديث الطلب",
        description: `تغيرت حالة الطلب إلى ${statusLabels[status] || status}`,
      });
    },
    onError: () => {
      toast({
        title: "❌ خطأ",
        description: "فشل تحديث الطلب",
        variant: "destructive"
      });
    }
  });

  const assignDriverMutation = useMutation({
    mutationFn: async ({ id, driverId }: { id: string; driverId: string }) => {
      const response = await apiRequest('PUT', `/api/orders/${id}/assign-driver`, { driverId });
      return response.json();
    },
    onSuccess: (data, { id, driverId }) => {
      const driver = drivers?.find(d => d.id === driverId);
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      setAssigningOrderId(null);
      setSelectedDriver(prev => ({ ...prev, [id]: '' }));
      
      toast({
        title: "✅ تم تعيين السائق",
        description: `تم توجيه الطلب للسائق ${driver?.name} بنجاح`,
      });

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'driver_assigned',
          payload: { orderId: id, driverId, driverName: driver?.name }
        }));
      }
    },
    onError: () => {
      toast({
        title: "❌ خطأ",
        description: "فشل تعيين السائق",
        variant: "destructive"
      });
      setAssigningOrderId(null);
    }
  });

  const updatePricesMutation = useMutation({
    mutationFn: async ({ id, items, deliveryFee, subtotal, totalAmount, priceAdjustmentNote }: {
      id: string;
      items: EditableItem[];
      deliveryFee: number;
      subtotal: number;
      totalAmount: number;
      priceAdjustmentNote: string;
    }) => {
      const response = await apiRequest('PUT', `/api/orders/${id}/prices`, {
        items,
        deliveryFee,
        subtotal,
        totalAmount,
        priceAdjustmentNote
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "✅ تم تعديل الأسعار",
        description: "تم تحديث أسعار الطلب بنجاح",
      });
      setEditPricesOrder(null);
    },
    onError: () => {
      toast({
        title: "❌ خطأ",
        description: "فشل تعديل أسعار الطلب",
        variant: "destructive"
      });
    }
  });

  const getOrderItems = (itemsString: string) => {
    try {
      return JSON.parse(itemsString);
    } catch {
      return [];
    }
  };

  const openEditPrices = (order: Order) => {
    const items = getOrderItems(order.items);
    setEditedItems(items.map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
      price: parseFloat(item.price)
    })));
    setEditedDeliveryFee(order.deliveryFee?.toString() || '0');
    setPriceAdjustmentNote('');
    setEditPricesOrder(order);
  };

  const { data: uiSettings } = useQuery<any[]>({ queryKey: ['/api/ui-settings'] });
  const appLogoUrl = uiSettings?.find((s: any) => s.key === 'invoice_company_logo')?.value || 
                     uiSettings?.find((s: any) => s.key === 'header_logo_url')?.value || 
                     uiSettings?.find((s: any) => s.key === 'sidebar_logo_url')?.value || '';

  // ─── توليد سند PDF ───────────────────────────────────────────────────
  const handleGeneratePDF = async (order: Order) => {
    setPdfLoadingIds((prev) => new Set(prev).add(order.id));
    try {
      const parsedItems = getOrderItems(order.items);
      await generateOrderPDF({
        orderNumber: order.orderNumber || order.id.slice(0, 8),
        date: order.createdAt,
        storeName: (order as any).restaurantName || undefined,
        logoUrl: appLogoUrl,
        items: parsedItems.map((item: any) => ({
          name: item.name || '',
          quantity: Number(item.quantity) || 1,
          price: parseFloat(item.price) || 0,
        })),
        subtotal: Number(order.subtotal) || 0,
        deliveryFee: Number(order.deliveryFee) || 0,
        total: Number(order.totalAmount) || 0,
      });
    } catch (err) {
      console.error('PDF generation error:', err);
      toast({ title: 'خطأ في توليد السند', variant: 'destructive' });
    } finally {
      setPdfLoadingIds((prev) => {
        const s = new Set(prev);
        s.delete(order.id);
        return s;
      });
    }
  };

  const calcSubtotal = () => editedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const calcTotal = () => calcSubtotal() + parseFloat(editedDeliveryFee || '0');

  const handleSavePrices = () => {
    if (!editPricesOrder) return;
    const subtotal = calcSubtotal();
    const deliveryFee = parseFloat(editedDeliveryFee || '0');
    const totalAmount = subtotal + deliveryFee;
    updatePricesMutation.mutate({
      id: editPricesOrder.id,
      items: editedItems,
      deliveryFee,
      subtotal,
      totalAmount,
      priceAdjustmentNote
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'في الانتظار', color: 'bg-yellow-500' },
      confirmed: { label: 'مؤكد', color: 'bg-blue-500' },
      preparing: { label: 'قيد التحضير', color: 'bg-orange-500' },
      on_way: { label: 'في الطريق', color: 'bg-purple-500' },
      delivered: { label: 'تم التوصيل', color: 'bg-green-500' },
      cancelled: { label: 'ملغي', color: 'bg-red-500' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={`${config.color} hover:${config.color}`}>{config.label}</Badge>;
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'on_way',
      on_way: 'delivered',
    };
    return statusFlow[currentStatus as keyof typeof statusFlow];
  };

  const getNextStatusLabel = (currentStatus: string) => {
    const labels = {
      pending: 'تأكيد الطلب',
      confirmed: 'بدء التحضير',
      preparing: 'تجهيز للتوصيل',
      on_way: 'تم التوصيل',
    };
    return labels[currentStatus as keyof typeof labels];
  };

  // دالة لحساب المسافة بالكم بين نقطتين
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // نصف قطر الأرض بالكم
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getNearestDriver = (order: Order) => {
    if (!drivers || drivers.length === 0 || !order.restaurantLatitude || !order.restaurantLongitude) return null;
    
    const availableDrivers = drivers.filter(d => d.isAvailable && d.latitude && d.longitude);
    if (availableDrivers.length === 0) return null;

    let nearest = availableDrivers[0];
    let minDistance = calculateDistance(
      parseFloat(order.restaurantLatitude), 
      parseFloat(order.restaurantLongitude),
      parseFloat(nearest.latitude!),
      parseFloat(nearest.longitude!)
    );

    availableDrivers.forEach(driver => {
      const dist = calculateDistance(
        parseFloat(order.restaurantLatitude!),
        parseFloat(order.restaurantLongitude!),
        parseFloat(driver.latitude!),
        parseFloat(driver.longitude!)
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearest = driver;
      }
    });

    return { driver: nearest, distance: minDistance.toFixed(2) };
  };

  const filteredOrders = orders?.filter(order => {
    if (statusFilter === 'all') return true;
    return order.status === statusFilter;
  }).filter(order => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      order.customerName?.toLowerCase().includes(search) ||
      order.customerPhone?.toLowerCase().includes(search) ||
      order.id?.toLowerCase().includes(search) ||
      order.deliveryAddress?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm px-6 py-4">
        <div className="flex items-center gap-3">
          <Package className="h-7 w-7 text-primary" />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">إدارة الطلبات</h1>
            <p className="text-sm text-muted-foreground">متابعة وإدارة جميع الطلبات</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdminLocation('/admin/driver-tracking')}
            className="gap-2"
          >
            <Navigation className="h-4 w-4" />
            تتبع السائقين المباشر
          </Button>
        </div>
      </div>

      <div className="p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* القائمة الجانبية للفرز */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="lg:sticky lg:top-24 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  تصفية الطلبات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { value: 'all', label: 'جميع الطلبات', icon: <Package className="h-4 w-4" /> },
                  { value: 'pending', label: 'جديدة (انتظار)', icon: <Package className="h-4 w-4 text-yellow-500" /> },
                  { value: 'confirmed', label: 'مؤكدة', icon: <CheckCircle className="h-4 w-4 text-blue-500" /> },
                  { value: 'preparing', label: 'قيد التحضير', icon: <Package className="h-4 w-4 text-orange-500" /> },
                  { value: 'on_way', label: 'في الطريق', icon: <Truck className="h-4 w-4 text-purple-500" /> },
                  { value: 'delivered', label: 'مكتملة', icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
                  { value: 'cancelled', label: 'ملغية', icon: <XCircle className="h-4 w-4 text-red-500" /> },
                ].map(({ value, label, icon }) => (
                  <Button
                    key={value}
                    variant={statusFilter === value ? 'default' : 'ghost'}
                    className="w-full justify-start gap-2"
                    onClick={() => setStatusFilter(value)}
                  >
                    {icon}
                    {label}
                    <Badge variant="secondary" className="mr-auto text-xs">
                      {value === 'all' ? orders?.length || 0 : orders?.filter(o => o.status === value).length || 0}
                    </Badge>
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">إحصائيات سريعة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الإجمالي:</span>
                    <span className="font-bold">{orders?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-yellow-600">
                    <span>جديد:</span>
                    <span className="font-bold">{orders?.filter(o => o.status === 'pending').length || 0}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>مكتمل:</span>
                    <span className="font-bold">{orders?.filter(o => o.status === 'delivered').length || 0}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>ملغي:</span>
                    <span className="font-bold">{orders?.filter(o => o.status === 'cancelled').length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* المحتوى الرئيسي للطلبات */}
        <div className="flex-1 space-y-4">
          {/* شريط البحث */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في الطلبات (الاسم، الهاتف، رقم الطلب، العنوان)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                  data-testid="input-search-orders"
                />
              </div>
            </CardContent>
          </Card>

          {/* Orders Grid */}
          <div className="space-y-4">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-6 bg-muted rounded w-32" />
                      <div className="h-6 bg-muted rounded w-20" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="h-4 bg-muted rounded w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredOrders?.length ? (
              filteredOrders.map((order) => {
                const items = getOrderItems(order.items);
                const nextStatus = getNextStatus(order.status || 'pending');
                const nextStatusLabel = getNextStatusLabel(order.status || 'pending');
                
                return (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Package className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">طلب #{order.orderNumber || order.id.slice(0,8)}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(order.createdAt)} - {new Date(order.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(order.status || 'pending')}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Customer Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">معلومات العميل</h4>
                          <p className="text-sm text-foreground">{order.customerName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{order.customerPhone}</span>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">عنوان التوصيل</h4>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <span className="text-sm text-muted-foreground block">{order.deliveryAddress}</span>
                              {order.customerLocationLat && order.customerLocationLng && (
                                <span className="text-xs text-muted-foreground/70 mt-1 block">
                                  📍 {order.customerLocationLat}, {order.customerLocationLng}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-foreground">تفاصيل الطلب</h4>
                          {order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditPrices(order)}
                              className="gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                              data-testid={`button-edit-prices-${order.id}`}
                            >
                              <Edit className="h-3 w-3" />
                              تعديل الأسعار
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {items.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span className="text-foreground">{item.name} × {item.quantity}</span>
                              <span className="text-muted-foreground">{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="border-t border-border mt-2 pt-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">المجموع الفرعي:</span>
                            <span className="text-foreground">{formatCurrency(order.subtotal)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">رسوم التوصيل:</span>
                            <span className="text-foreground">{formatCurrency(order.deliveryFee)}</span>
                          </div>
                          <div className="flex justify-between items-center font-semibold">
                            <span className="text-foreground">المجموع الكلي:</span>
                            <span className="text-primary text-lg">{formatCurrency(order.totalAmount)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Payment & Notes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-foreground mb-1">طريقة الدفع</h4>
                          <p className="text-sm text-muted-foreground">
                            {order.paymentMethod === 'cash' ? '💵 دفع نقدي' : '💳 مدفوع مسبقاً'}
                          </p>
                        </div>
                        {order.notes && (
                          <div>
                            <h4 className="font-semibold text-foreground mb-1">ملاحظات</h4>
                            <p className="text-sm text-muted-foreground">{order.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Driver Assignment Section */}
                      {(order.status !== 'delivered' && order.status !== 'cancelled') && (
                        <div className={`p-4 rounded-lg border ${order.driverId ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-foreground flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              {order.driverId ? 'السائق المعين' : 'تعيين سائق'}
                            </h4>
                            {!order.driverId && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                مطلوب تعيين
                              </Badge>
                            )}
                          </div>

                          {!order.driverId && getNearestDriver(order) && (
                            <div className="mb-3 p-2 bg-yellow-100 border border-yellow-200 rounded text-xs flex items-center justify-between">
                              <span className="flex items-center gap-1 text-yellow-800">
                                <Navigation className="h-3 w-3" />
                                السائق الأقرب للمطعم: <strong>{getNearestDriver(order)?.driver.name}</strong> 
                                ({getNearestDriver(order)?.distance} كم)
                              </span>
                              <Button 
                                size="xs" 
                                variant="outline" 
                                className="h-6 text-[10px] border-yellow-400 text-yellow-800 hover:bg-yellow-200"
                                onClick={() => {
                                  const nearest = getNearestDriver(order)?.driver;
                                  if (nearest) {
                                    setAssigningOrderId(order.id);
                                    setSelectedDriver(prev => ({ ...prev, [order.id]: nearest.id }));
                                  }
                                }}
                              >
                                اختياره
                              </Button>
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                            <Select 
                              value={assigningOrderId === order.id ? (selectedDriver[order.id] || '') : (order.driverId || '')} 
                              onValueChange={(val) => {
                                setAssigningOrderId(order.id);
                                setSelectedDriver(prev => ({ ...prev, [order.id]: val }));
                              }}
                              disabled={assigningOrderId !== null && assigningOrderId !== order.id}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="اختر سائقاً" />
                              </SelectTrigger>
                              <SelectContent>
                                {drivers?.map(driver => (
                                  <SelectItem key={driver.id} value={driver.id}>
                                    <span className="flex items-center gap-2">
                                      {driver.name}
                                      {driver.isAvailable && <Badge variant="outline" className="text-xs">متاح</Badge>}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={() => {
                                const driverId = assigningOrderId === order.id ? selectedDriver[order.id] : order.driverId;
                                if (driverId) {
                                  assignDriverMutation.mutate({ id: order.id, driverId });
                                }
                              }}
                              disabled={assigningOrderId === order.id 
                                ? (!selectedDriver[order.id] || assignDriverMutation.isPending) 
                                : assignDriverMutation.isPending}
                              className="gap-2 w-full sm:w-auto"
                            >
                              <Truck className="h-4 w-4" />
                              {assigningOrderId === order.id ? 'تأكيد التعيين' : (order.driverId ? 'تغيير' : 'تعيين')}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                        {nextStatus && order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <Button
                            onClick={() => updateOrderStatusMutation.mutate({ 
                              id: order.id, 
                              status: nextStatus 
                            })}
                            disabled={updateOrderStatusMutation.isPending}
                            className="gap-2"
                            data-testid={`button-update-order-${order.id}`}
                          >
                            <CheckCircle className="h-4 w-4" />
                            {nextStatusLabel}
                          </Button>
                        )}
                        
                        {order.status === 'pending' && (
                          <Button
                            variant="destructive"
                            onClick={() => updateOrderStatusMutation.mutate({ 
                              id: order.id, 
                              status: 'cancelled' 
                            })}
                            disabled={updateOrderStatusMutation.isPending}
                            className="gap-2"
                            data-testid={`button-cancel-order-${order.id}`}
                          >
                            <XCircle className="h-4 w-4" />
                            إلغاء الطلب
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          onClick={() => window.open(`tel:${order.customerPhone}`)}
                          className="gap-2"
                          data-testid={`button-call-customer-${order.id}`}
                        >
                          <Phone className="h-4 w-4" />
                          اتصال بالعميل
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => {
                            const address = encodeURIComponent(order.deliveryAddress);
                            const googleMapsUrl = order.customerLocationLat && order.customerLocationLng 
                              ? `https://www.google.com/maps?q=${order.customerLocationLat},${order.customerLocationLng}`
                              : `https://www.google.com/maps/search/?api=1&query=${address}`;
                            window.open(googleMapsUrl, '_blank');
                          }}
                          className="gap-2"
                          data-testid={`button-track-location-${order.id}`}
                        >
                          <Navigation className="h-4 w-4" />
                          تتبع الموقع
                        </Button>

                        {/* ── زر السند الإلكتروني ── */}
                        <Button
                          variant="outline"
                          onClick={() => handleGeneratePDF(order)}
                          disabled={pdfLoadingIds.has(order.id)}
                          className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                          data-testid={`button-pdf-${order.id}`}
                        >
                          {pdfLoadingIds.has(order.id)
                            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent inline-block" />
                            : <FileText className="h-4 w-4" />}
                          سند إلكتروني
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {statusFilter === 'all' ? 'لا توجد طلبات' : `لا توجد طلبات بهذه الحالة`}
                </h3>
                <p className="text-muted-foreground">
                  {statusFilter === 'all' 
                    ? 'ستظهر الطلبات هنا عند ورودها من العملاء'
                    : 'لا توجد طلبات بهذه الحالة حالياً'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* نافذة تعديل أسعار الطلب */}
      <Dialog open={!!editPricesOrder} onOpenChange={(open) => !open && setEditPricesOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <DollarSign className="h-5 w-5" />
              تعديل أسعار الطلب #{editPricesOrder?.orderNumber || editPricesOrder?.id?.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* تعليمات */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
              <strong>ملاحظة:</strong> استخدم هذه الأداة عند اختلاف أسعار المطعم عن أسعار التطبيق.
              سيتم تحديث إجمالي الطلب تلقائياً عند تعديل الأسعار.
            </div>

            {/* عناصر الطلب */}
            <div>
              <Label className="text-base font-semibold mb-3 block">عناصر الطلب</Label>
              <div className="space-y-3">
                {editedItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">الكمية: {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">سعر الوحدة:</Label>
                      <Input
                        type="number"
                        value={item.price}
                        onChange={(e) => {
                          const newItems = [...editedItems];
                          newItems[index] = { ...item, price: parseFloat(e.target.value) || 0 };
                          setEditedItems(newItems);
                        }}
                        className="w-28 text-center"
                        min="0"
                        step="0.5"
                      />
                      <span className="text-xs text-muted-foreground">ريال</span>
                    </div>
                    <div className="text-sm font-semibold text-primary w-20 text-left">
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* رسوم التوصيل */}
            <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
              <Label className="font-medium whitespace-nowrap">رسوم التوصيل:</Label>
              <Input
                type="number"
                value={editedDeliveryFee}
                onChange={(e) => setEditedDeliveryFee(e.target.value)}
                className="w-32 text-center"
                min="0"
                step="0.5"
              />
              <span className="text-sm text-muted-foreground">ريال</span>
            </div>

            {/* ملخص الإجماليات */}
            <div className="border rounded-lg p-4 space-y-2 bg-white">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">المجموع الفرعي:</span>
                <span className="font-medium">{formatCurrency(calcSubtotal())}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">رسوم التوصيل:</span>
                <span className="font-medium">{formatCurrency(parseFloat(editedDeliveryFee || '0'))}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>المجموع الكلي الجديد:</span>
                <span className="text-primary">{formatCurrency(calcTotal())}</span>
              </div>
              {editPricesOrder && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>المجموع القديم:</span>
                  <span className="line-through">{formatCurrency(editPricesOrder.totalAmount)}</span>
                </div>
              )}
            </div>

            {/* سبب التعديل */}
            <div>
              <Label htmlFor="adjustment-note" className="font-medium">سبب تعديل الأسعار <span className="text-red-500">*</span></Label>
              <Textarea
                id="adjustment-note"
                value={priceAdjustmentNote}
                onChange={(e) => setPriceAdjustmentNote(e.target.value)}
                placeholder="مثال: الأسعار في المطعم مختلفة عن التطبيق، تم التعديل بعد مراجعة السائق..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setEditPricesOrder(null)}>
              إلغاء
            </Button>
            <Button
              onClick={handleSavePrices}
              disabled={updatePricesMutation.isPending || !priceAdjustmentNote.trim()}
              className="bg-orange-600 hover:bg-orange-700 gap-2"
            >
              <DollarSign className="h-4 w-4" />
              {updatePricesMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
