import express from "express";
import { storage } from "../storage";
import { insertMessageSchema } from "@shared/schema";
import { z } from "zod";

const router = express.Router();

// Get messages for an order
router.get("/order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const messages = await storage.getMessages(orderId);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// Get conversation between two users
router.get("/conversation", async (req, res) => {
  try {
    const { userId1, userId2, type1, type2 } = req.query;
    
    if (!userId1 || !userId2) {
      return res.status(400).json({ message: "Missing user IDs" });
    }

    // Get all messages and filter
    // This is a simplified implementation - in production you'd have a proper conversation query
    const messages = await storage.getMessages("");
    const filtered = messages.filter((m: any) => 
      (m.senderId === userId1 && m.receiverId === userId2) ||
      (m.senderId === userId2 && m.receiverId === userId1)
    );
    
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ message: "Failed to fetch conversation" });
  }
});

// Send a new message
router.post("/", async (req, res) => {
  try {
    const validatedData = insertMessageSchema.parse(req.body);
    const message = await storage.createMessage(validatedData);
    
    // Broadcast via WebSocket if available
    const ws = (req as any).app?.get('ws');
    if (ws) {
      ws.broadcast('new_message', {
        messageId: message.id,
        orderId: message.orderId,
        senderId: message.senderId,
        senderType: message.senderType,
        receiverId: message.receiverId,
        receiverType: message.receiverType,
        content: message.content,
        createdAt: message.createdAt
      });
    }
    
    res.status(201).json(message);
  } catch (error) {
    console.error("Error creating message:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid message data", details: error.errors });
    }
    res.status(500).json({ message: "Failed to create message" });
  }
});

// Mark messages as read
router.put("/read", async (req, res) => {
  try {
    const { orderId, receiverId } = req.body;
    
    if (!orderId || !receiverId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await storage.markMessagesAsRead(orderId, receiverId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ message: "Failed to mark messages as read" });
  }
});

// Get unread message count
router.get("/unread/:userId/:userType", async (req, res) => {
  try {
    const { userId, userType } = req.params;
    
    // Get all messages and count unread
    const messages = await storage.getMessages("");
    const unread = messages.filter((m: any) => 
      m.receiverId === userId && 
      m.receiverType === userType && 
      !m.isRead
    );
    
    res.json({ count: unread.length });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ message: "Failed to fetch unread count" });
  }
});

export default router;
