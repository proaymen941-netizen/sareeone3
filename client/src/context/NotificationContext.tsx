import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AlertCircle, CheckCircle, X, Bell } from 'lucide-react';
import { useAuth } from './AuthContext';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'promotion';
  title: string;
  message: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);

    // Auto remove after duration
    const duration = notification.duration || (notification.type === 'promotion' ? 10000 : 4000);
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  }, [removeNotification]);

  const showSuccess = useCallback((title: string, message = '') => {
    showNotification({ type: 'success', title, message });
  }, [showNotification]);

  const showError = useCallback((title: string, message = '') => {
    showNotification({ type: 'error', title, message });
  }, [showNotification]);

  // WebSocket Listener for real-time notifications
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('🔔 Notification WebSocket connected');
        const phone = localStorage.getItem('customer_phone');
        // مصادقة بالـ ID
        if (user?.id) {
          ws?.send(JSON.stringify({ type: 'auth', payload: { userId: user.id, userType: 'customer' } }));
        }
        // مصادقة بالهاتف أيضاً (لأن بعض الطلبات تُربط بالهاتف)
        if (phone && phone !== user?.id) {
          ws?.send(JSON.stringify({ type: 'auth', payload: { userId: phone, userType: 'customer' } }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NEW_NOTIFICATION') {
            const notif = data.payload;
            showNotification({
              type: notif.type === 'offer' ? 'promotion' : 'info',
              title: notif.title,
              message: notif.message,
              duration: 8000
            });
            
            // Play sound if possible
            try {
              const audio = new Audio('/notification.mp3');
              audio.play();
            } catch (e) {}
          } else if (data.type === 'order_status_changed' || data.type === 'order_update') {
            const { orderId, status, message: msg, orderNumber } = data.payload || {};
            const statusLabels: Record<string, string> = {
              confirmed: 'تم تأكيد طلبك',
              preparing: 'جاري تحضير طلبك',
              ready: 'طلبك جاهز للاستلام',
              picked_up: 'السائق استلم طلبك',
              on_way: 'السائق في الطريق إليك',
              delivered: 'تم تسليم طلبك بنجاح',
              cancelled: 'تم إلغاء الطلب',
            };
            const label = status ? (statusLabels[status] || `تغيرت حالة الطلب إلى ${status}`) : undefined;
            showNotification({
              type: status === 'delivered' ? 'success' : status === 'cancelled' ? 'error' : 'info',
              title: 'تحديث حالة الطلب',
              message: msg || label || `تحديث طلب ${orderNumber || orderId}`,
              duration: 10000
            });
            
            try {
              const audio = new Audio('/notification.mp3');
              audio.play();
            } catch (e) {}
          } else if (data.type === 'settings_changed') {
             // Invalidate UI settings if we have access to queryClient here
             // or just show a message. Better to handle this in useSettingsSync
          }
        } catch (e) {
          console.error('Error parsing notification message', e);
        }
      };

      ws.onclose = () => {
        console.log('🔔 Notification WebSocket disconnected, reconnecting...');
        reconnectTimeout = setTimeout(connect, 5000);
      };

      ws.onerror = () => ws?.close();
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [user, showNotification]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      showNotification,
      removeNotification,
      showSuccess,
      showError
    }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] w-full max-w-sm px-4 space-y-2">
      {notifications.map(notification => (
        <NotificationItem 
          key={notification.id}
          notification={notification}
          onRemove={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

function NotificationItem({ notification, onRemove }: { 
  notification: Notification; 
  onRemove: () => void; 
}) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div 
      className={`relative p-4 rounded-xl border shadow-lg backdrop-blur-sm ${getColors()} animate-in slide-in-from-top duration-300`}
      data-testid={`notification-${notification.type}-${notification.id}`}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            {notification.title}
          </h4>
          {notification.message && (
            <p className="text-sm text-gray-700">
              {notification.message}
            </p>
          )}
        </div>
        <button
          onClick={onRemove}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          data-testid={`button-close-notification-${notification.id}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}