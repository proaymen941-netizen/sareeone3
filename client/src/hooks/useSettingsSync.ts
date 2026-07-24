import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

export function useSettingsSync() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let authSent = false;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      (window as any).WS_MANAGER = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        // Send auth message if user is logged in
        if (isAuthenticated && user?.id) {
          ws?.send(JSON.stringify({
            type: "auth",
            payload: {
              userId: user.id,
              userType: user.userType || "customer"
            }
          }));
          authSent = true;
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === "settings_changed") {
            const key = msg.payload?.key || msg.payload?.changedKey;
            
            // Invalidate ui-settings for any settings change
            queryClient.invalidateQueries({ queryKey: ["/api/ui-settings"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/ui-settings"] });

            if (key === "restaurants" || key === "delivery_fee_settings" || key === "app_closed" || !key) {
              queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
              queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
              queryClient.invalidateQueries({ queryKey: ["/api/delivery-fees/settings"] });
            }
          } else if (msg.type === "order_status_changed" || msg.type === "order_update") {
            // Invalidate orders queries
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
            if (msg.payload?.orderId) {
              queryClient.invalidateQueries({ queryKey: [`/api/orders/${msg.payload.orderId}`] });
              queryClient.invalidateQueries({ queryKey: [`/api/orders/${msg.payload.orderId}/track`] });
            }
          } else if (msg.type === "NEW_NOTIFICATION") {
            // Invalidate notifications query
            queryClient.invalidateQueries({ queryKey: ['/api/notifications/customer'] });
            
            // If it's a message from server/driver/admin, we might want to show a toast
            // This is optional since CustomerNotificationsPanel already shows the badge
          }
        } catch (_) {}
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected, reconnecting...");
        reconnectTimeout = setTimeout(connect, 5000);
        authSent = false;
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [queryClient, user?.id, isAuthenticated]);
}
