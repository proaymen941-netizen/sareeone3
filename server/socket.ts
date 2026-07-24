import { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { log } from "./viteServer";
import { storage } from "./storage";

export interface SocketMessage {
  type: string;
  payload: any;
}

interface UserConnection {
  ws: WebSocket;
  userId: string;
  userType?: string;
  connectionKey: string;
  orderId?: string;
  isAlive: boolean;
}

export function setupWebSockets(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  const clients = new Map<string, UserConnection>();
  const userConnections = new Map<string, WebSocket[]>();
  const orderTrackers = new Map<string, WebSocket[]>();

  // Heartbeat interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("connection", (ws: any, req) => {
    log(`New WS connection from ${req.socket.remoteAddress}`);
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on("message", (data) => {
      try {
        const message: SocketMessage = JSON.parse(data.toString());
        handleMessage(ws, message, clients, userConnections, orderTrackers, wss);
      } catch (err) {
        log(`Failed to parse WS message: ${err}`);
      }
    });

    ws.on("close", () => {
      // جمع كل إدخالات هذا الاتصال (قد يكون مسجَّلاً بأكثر من مفتاح: customerId + phone)
      const toDelete: string[] = [];
      const keysToClean = new Set<string>();
      let closedOrderId: string | undefined;

      for (const [id, connection] of clients.entries()) {
        if (connection.ws === ws) {
          toDelete.push(id);
          keysToClean.add(connection.connectionKey);
          if (connection.orderId) closedOrderId = connection.orderId;
        }
      }

      // حذف من خريطة clients
      for (const id of toDelete) {
        clients.delete(id);
      }

      // تنظيف userConnections لكل مفتاح مرتبط بهذا الاتصال
      for (const key of keysToClean) {
        const connections = userConnections.get(key) || [];
        const filtered = connections.filter(c => c !== ws);
        if (filtered.length === 0) {
          userConnections.delete(key);
        } else {
          userConnections.set(key, filtered);
        }
      }

      // تنظيف orderTrackers إن وجد
      if (closedOrderId) {
        const trackers = orderTrackers.get(closedOrderId) || [];
        const filtered = trackers.filter(c => c !== ws);
        if (filtered.length === 0) {
          orderTrackers.delete(closedOrderId);
        } else {
          orderTrackers.set(closedOrderId, filtered);
        }
      }
    });
  });

  return {
    broadcast: (type: string, payload: any) => {
      const message = JSON.stringify({ type, payload });
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });

      // Also specifically check order trackers if it's an order update
      if (type === 'order_update' && payload.orderId) {
        const trackers = orderTrackers.get(payload.orderId) || [];
        trackers.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
    },
    sendToUser: (userId: string, type: string, payload: any) => {
      const connections = userConnections.get(userId) || [];
      const message = JSON.stringify({ type, payload });
      
      connections.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    },
    sendToDriver: (driverId: string, type: string, payload: any) => {
      const connections = userConnections.get(`driver_${driverId}`) || [];
      const message = JSON.stringify({ type, payload });
      
      connections.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    },
    sendToAdmin: (type: string, payload: any) => {
      const connections = userConnections.get('admin_dashboard') || [];
      const message = JSON.stringify({ type, payload });
      
      connections.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    },
    /**
     * Send an order update ONLY to relevant parties:
     * the order's customer (by id and/or phone), the assigned driver,
     * the admin dashboard, and any clients explicitly tracking the order.
     * This avoids the noisy global broadcast that was hitting all customers.
     */
    notifyOrder: (
      type: string,
      payload: any,
      recipients: { customerId?: string | null; customerPhone?: string | null; driverId?: string | null; orderId?: string | null; includeAdmin?: boolean } = {}
    ) => {
      const message = JSON.stringify({ type, payload });
      const sent = new Set<WebSocket>();

      const sendToKey = (key?: string | null) => {
        if (!key) return;
        const conns = userConnections.get(key) || [];
        conns.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && !sent.has(client)) {
            client.send(message);
            sent.add(client);
          }
        });
      };

      sendToKey(recipients.customerId);
      sendToKey(recipients.customerPhone);
      if (recipients.driverId) sendToKey(`driver_${recipients.driverId}`);
      if (recipients.includeAdmin !== false) sendToKey('admin_dashboard');

      const orderId = recipients.orderId || (payload && payload.orderId);
      if (orderId) {
        const trackers = orderTrackers.get(orderId) || [];
        trackers.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && !sent.has(client)) {
            client.send(message);
            sent.add(client);
          }
        });
      }
    }
  };
}

async function handleMessage(
  ws: WebSocket, 
  message: SocketMessage, 
  clients: Map<string, UserConnection>,
  userConnections: Map<string, WebSocket[]>,
  orderTrackers: Map<string, WebSocket[]>,
  wss: WebSocketServer
) {
  switch (message.type) {
    case "auth":
      if (message.payload.userId) {
        const userId = message.payload.userId;
        const userType = message.payload.userType || 'customer';
        
        // Use consistent prefixing
        const connectionKey = userType === 'driver' ? `driver_${userId}` : userId;
        
        clients.set(`${userId}_${Date.now()}`, {
          ws,
          userId,
          userType,
          connectionKey,
          isAlive: true
        });
        
        const connections = userConnections.get(connectionKey) || [];
        connections.push(ws);
        userConnections.set(connectionKey, connections);
        
        log(`User ${userId} (${userType}) authenticated via WS with key ${connectionKey}`);
      }
      break;

    case "track_order":
      if (message.payload.orderId) {
        const orderId = message.payload.orderId;
        
        // Find existing client entry for this WS
        for (const [id, connection] of clients.entries()) {
          if (connection.ws === ws) {
            connection.orderId = orderId;
            break;
          }
        }

        const trackers = orderTrackers.get(orderId) || [];
        if (!trackers.includes(ws)) {
          trackers.push(ws);
        }
        orderTrackers.set(orderId, trackers);
        log(`Client tracking order ${orderId} via WS`);
      }
      break;
      
    case "location_update":
      const { driverId, latitude, longitude, currentLocation } = message.payload;
      if (driverId && latitude && longitude) {
        // تحديث قاعدة البيانات لضمان بقاء الموقع حتى لو انقطع الاتصال
        try {
          storage.updateDriver(driverId, {
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            currentLocation: currentLocation || undefined
          }).catch(err => console.error('Error updating driver location in DB:', err));
        } catch (e) {
          console.error('Failed to update driver location:', e);
        }

        const broadcastMsg = JSON.stringify({
          type: "driver_location",
          payload: { driverId, latitude, longitude, currentLocation, timestamp: Date.now() }
        });
        
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastMsg);
          }
        });
      }
      break;

    case "settings_update":
      // بث تغيير الإعدادات لجميع المتصلين (عملاء وسائقين)
      const settingsPayload = message.payload;
      const settingsMsg = JSON.stringify({
        type: "settings_changed",
        payload: settingsPayload
      });
      
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(settingsMsg);
        }
      });
      break;
      
    case "driver_assigned":
        const payload = message.payload;
        const orderId = payload.orderId;
        const assignedDriverId = payload.driverId;
        const driverName = payload.driverName;
      if (orderId && assignedDriverId) {
        const notificationMsg = JSON.stringify({
          type: "new_order_assigned",
          payload: { 
            orderId, 
            driverId: assignedDriverId,
            driverName,
            timestamp: Date.now()
          }
        });
        
        const driverConnections = userConnections.get(`driver_${assignedDriverId}`) || [];
        driverConnections.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(notificationMsg);
          }
        });
      }
      break;
      
    case "order_update":
      const updatePayload = message.payload;
      const updateOrderId = updatePayload.orderId;
      const status = updatePayload.status;
      const updateMessage = updatePayload.message;
      if (updateOrderId && status) {
        const updateMsg = JSON.stringify({
          type: "order_status_changed",
          payload: { 
            orderId: updateOrderId, 
            status,
            message: updateMessage,
            timestamp: Date.now()
          }
        });
        
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(updateMsg);
          }
        });
      }
      break;
  }
}
