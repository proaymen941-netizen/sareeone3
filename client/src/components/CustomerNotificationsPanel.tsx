import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Bell, X, CheckCheck, Package, Clock, Info } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';

interface CustomerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  recipientType: string;
  recipientId: string | null;
  orderId: string | null;
  isRead: boolean;
  createdAt: string;
}

export function CustomerNotificationsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const phone = user?.phone || localStorage.getItem('customer_phone') || '';
  const customerId = user?.id || '';

  const queryParams = new URLSearchParams();
  if (customerId) queryParams.set('customerId', customerId);
  if (phone) queryParams.set('phone', phone);

  const { data: notifications = [], refetch } = useQuery<CustomerNotification[]>({
    queryKey: ['/api/notifications/customer', phone, customerId],
    queryFn: async () => {
      if (!phone && !customerId) return [];
      const res = await fetch(`/api/notifications/customer?${queryParams.toString()}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!(phone || customerId),
    refetchInterval: 30000,
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/customer/mark-all-read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, customerId }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/customer'] });
      refetch();
    },
  });

  const markOneReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/customer'] });
    },
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // WebSocket listener for real-time notification refresh
  useEffect(() => {
    if (!phone && !customerId) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket | null = null;
    let reconnectTimeout: any;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        // إرسال auth بكلا المعرّفين (customerId وphone) لضمان وصول الإشعارات
        // بصرف النظر عن المعرّف الذي خزنه الخادم في recipientId
        if (customerId) {
          ws?.send(JSON.stringify({
            type: 'auth',
            payload: { userId: customerId, userType: 'customer' }
          }));
        }
        if (phone && phone !== customerId) {
          ws?.send(JSON.stringify({
            type: 'auth',
            payload: { userId: phone, userType: 'customer' }
          }));
        }
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (
            data.type === 'NEW_NOTIFICATION' ||
            data.type === 'notifications_updated' ||
            data.type === 'order_update' ||
            data.type === 'order_status_changed'
          ) {
            queryClient.invalidateQueries({ queryKey: ['/api/notifications/customer', phone, customerId] });
            refetch();
          }
        } catch (e) {}
      };
      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 5000);
      };
      ws.onerror = () => ws?.close();
    };
    connect();
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [phone, customerId, refetch, queryClient]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const getIcon = (type: string) => {
    if (type.includes('order') || type.includes('scheduled')) return <Package className="h-4 w-4 text-primary" />;
    if (type.includes('cancel')) return <X className="h-4 w-4 text-red-500" />;
    if (type.includes('status')) return <Clock className="h-4 w-4 text-blue-500" />;
    return <Info className="h-4 w-4 text-gray-500" />;
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1) return 'الآن';
    if (m < 60) return `منذ ${m} دقيقة`;
    if (h < 24) return `منذ ${h} ساعة`;
    return `منذ ${d} يوم`;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) refetch();
        }}
        className="h-10 w-10 flex items-center justify-center text-white hover:bg-white/20 rounded-full transition-colors relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-yellow-400 text-gray-900 text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-black border border-white/20">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* خلفية شفافة لإغلاق اللوحة عند الضغط خارجها */}
          <div className="fixed inset-0 z-[190]" onClick={() => setIsOpen(false)} />
          
          {/* لوحة الإشعارات - ثابتة ومرتبة */}
          <div
            className="fixed z-[200] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            style={{
              top: '64px',
              right: '8px',
              left: '8px',
              maxWidth: '380px',
              marginLeft: 'auto',
              maxHeight: '75vh',
            }}
            dir="rtl"
          >
            {/* رأس اللوحة */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-white sticky top-0">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="font-bold text-sm">الإشعارات</span>
                {unreadCount > 0 && (
                  <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                    {unreadCount} جديد
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    className="text-white/80 hover:text-white transition-colors"
                    title="تعليم الكل كمقروء"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* قائمة الإشعارات */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(75vh - 52px)' }}>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Bell className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm font-medium">لا توجد إشعارات</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.isRead) markOneReadMutation.mutate(notif.id);
                      if (notif.orderId) {
                        // تحقق من نوع الإشعار لتحديد الصفحة المناسبة
                        const isWasalniNotif = notif.type?.includes('wasalni') || notif.type?.includes('wasal');
                        if (isWasalniNotif) {
                          setLocation(`/track-orders`);
                        } else {
                          setLocation(`/orders/${notif.orderId}`);
                        }
                        setIsOpen(false);
                      }
                    }}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors ${
                      !notif.isRead ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-sm font-bold leading-tight ${!notif.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default CustomerNotificationsPanel;
