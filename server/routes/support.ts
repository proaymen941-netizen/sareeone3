import { Router } from "express";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { supportTickets, adminUsers } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

function getDatabase() {
  const databaseUrl = process.env.DATABASE_URL!;
  const isCloudProvider = databaseUrl.includes("render.com") || databaseUrl.includes("dpg-") || databaseUrl.includes("neon.tech") || databaseUrl.includes("supabase") || databaseUrl.includes("aws");
  const hasSslMode = databaseUrl.includes("sslmode=") || databaseUrl.includes("ssl=");
  const ssl = (isCloudProvider || hasSslMode || process.env.NODE_ENV === "production" || databaseUrl.includes("ssl")) ? { rejectUnauthorized: false } : undefined;
  const client = postgres(databaseUrl, { max: 5, ssl });
  return drizzle(client);
}

// إنشاء تذكرة دعم جديدة
router.post("/", async (req, res) => {
  try {
    const { userId, customerName, customerPhone, orderId, category, subject, description } = req.body;

    if (!customerName || !customerPhone || !category || !subject || !description) {
      return res.status(400).json({ message: "جميع الحقول مطلوبة" });
    }

    const ldb = getDatabase();
    const [ticket] = await ldb
      .insert(supportTickets)
      .values({
        userId: userId || null,
        customerName,
        customerPhone,
        orderId: orderId || null,
        category,
        subject,
        description,
        status: "open",
        priority: "normal",
      })
      .returning();

    res.status(201).json({ success: true, ticket, message: "تم إرسال طلب الدعم بنجاح" });
  } catch (error: any) {
    console.error("Error creating support ticket:", error);
    res.status(500).json({ message: "خطأ في إرسال طلب الدعم" });
  }
});

// جلب تذاكر العميل
router.get("/user/:phone", async (req, res) => {
  try {
    const { phone } = req.params;
    const ldb = getDatabase();
    const tickets = await ldb
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.customerPhone, phone))
      .orderBy(desc(supportTickets.createdAt));

    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ message: "خطأ في جلب التذاكر" });
  }
});

// جلب جميع التذاكر للأدمن
router.get("/admin/all", async (req, res) => {
  try {
    const adminToken = req.headers.authorization?.split(' ')[1];
    if (!adminToken) return res.status(401).json({ message: "غير مصرح" });

    const { status, priority } = req.query;
    const ldb = getDatabase();

    let query = ldb.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
    const tickets = await query;

    const filtered = tickets.filter(t => {
      if (status && t.status !== status) return false;
      if (priority && t.priority !== priority) return false;
      return true;
    });

    res.json(filtered);
  } catch (error: any) {
    res.status(500).json({ message: "خطأ في جلب التذاكر" });
  }
});

// تحديث تذكرة الدعم (للأدمن)
router.patch("/admin/:ticketId", async (req, res) => {
  try {
    const adminToken = req.headers.authorization?.split(' ')[1];
    if (!adminToken) return res.status(401).json({ message: "غير مصرح" });

    const { ticketId } = req.params;
    const { status, priority, adminResponse, assignedTo } = req.body;

    const ldb = getDatabase();
    const updateData: any = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (adminResponse) updateData.adminResponse = adminResponse;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (status === "resolved") updateData.resolvedAt = new Date();

    const [updated] = await ldb
      .update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, ticketId))
      .returning();

    res.json({ success: true, ticket: updated });
  } catch (error: any) {
    res.status(500).json({ message: "خطأ في تحديث التذكرة" });
  }
});

// إحصائيات الدعم للأدمن
router.get("/admin/stats", async (req, res) => {
  try {
    const ldb = getDatabase();
    const tickets = await ldb.select().from(supportTickets);

    const stats = {
      total: tickets.length,
      open: tickets.filter(t => t.status === "open").length,
      inProgress: tickets.filter(t => t.status === "in_progress").length,
      resolved: tickets.filter(t => t.status === "resolved").length,
      closed: tickets.filter(t => t.status === "closed").length,
      urgent: tickets.filter(t => t.priority === "urgent").length,
      byCategory: {
        delivery: tickets.filter(t => t.category === "delivery").length,
        quality: tickets.filter(t => t.category === "quality").length,
        payment: tickets.filter(t => t.category === "payment").length,
        driver: tickets.filter(t => t.category === "driver").length,
        other: tickets.filter(t => t.category === "other").length,
      },
    };

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: "خطأ في جلب الإحصائيات" });
  }
});

export default router;
