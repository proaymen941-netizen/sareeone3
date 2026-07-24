import { Router } from "express";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { referralCodes, referralUsages, loyaltyPoints, loyaltyTransactions, users } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

const router = Router();

function getDatabase() {
  const databaseUrl = process.env.DATABASE_URL!;
  const isCloudProvider = databaseUrl.includes("render.com") || databaseUrl.includes("dpg-") || databaseUrl.includes("neon.tech") || databaseUrl.includes("supabase") || databaseUrl.includes("aws");
  const hasSslMode = databaseUrl.includes("sslmode=") || databaseUrl.includes("ssl=");
  const ssl = (isCloudProvider || hasSslMode || process.env.NODE_ENV === "production" || databaseUrl.includes("ssl")) ? { rejectUnauthorized: false } : undefined;
  const client = postgres(databaseUrl, { max: 5, ssl });
  return drizzle(client);
}

const REFERRER_POINTS = 100;
const REFERRED_POINTS = 50;

// الحصول على رمز الإحالة للمستخدم أو إنشاؤه
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const ldb = getDatabase();

    let [referralCode] = await ldb
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.userId, userId));

    if (!referralCode) {
      const code = nanoid(8).toUpperCase();
      [referralCode] = await ldb
        .insert(referralCodes)
        .values({ userId, code, totalReferrals: 0, totalEarned: "0", isActive: true })
        .returning();
    }

    const usages = await ldb
      .select()
      .from(referralUsages)
      .where(eq(referralUsages.referrerId, userId))
      .orderBy(desc(referralUsages.createdAt));

    res.json({
      ...referralCode,
      usages,
      referrerReward: REFERRER_POINTS,
      referredReward: REFERRED_POINTS,
    });
  } catch (error: any) {
    console.error("Error fetching referral code:", error);
    res.status(500).json({ message: "خطأ في جلب رمز الإحالة" });
  }
});

// استخدام رمز الإحالة عند التسجيل
router.post("/use", async (req, res) => {
  try {
    const { code, newUserId } = req.body;
    if (!code || !newUserId) return res.status(400).json({ message: "البيانات مطلوبة" });

    const ldb = getDatabase();

    const [referralCode] = await ldb
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.code, code));

    if (!referralCode || !referralCode.isActive) {
      return res.status(404).json({ message: "رمز الإحالة غير صالح" });
    }

    if (referralCode.userId === newUserId) {
      return res.status(400).json({ message: "لا يمكنك استخدام رمز الإحالة الخاص بك" });
    }

    // التحقق من عدم استخدام المستخدم لرمز إحالة من قبل
    const existingUsage = await ldb
      .select()
      .from(referralUsages)
      .where(eq(referralUsages.referredUserId, newUserId));

    if (existingUsage.length > 0) {
      return res.status(400).json({ message: "تم استخدام رمز إحالة مسبقاً" });
    }

    // تسجيل الاستخدام
    await ldb.insert(referralUsages).values({
      referralCodeId: referralCode.id,
      referrerId: referralCode.userId,
      referredUserId: newUserId,
      pointsAwarded: REFERRER_POINTS,
      discountAwarded: "0",
    });

    // تحديث إحصائيات رمز الإحالة
    await ldb
      .update(referralCodes)
      .set({
        totalReferrals: referralCode.totalReferrals + 1,
        totalEarned: String(parseFloat(referralCode.totalEarned) + REFERRER_POINTS),
      })
      .where(eq(referralCodes.id, referralCode.id));

    // منح النقاط للمُحيل
    const [referrerPoints] = await ldb.select().from(loyaltyPoints).where(eq(loyaltyPoints.userId, referralCode.userId));
    if (referrerPoints) {
      await ldb.update(loyaltyPoints).set({
        totalPoints: referrerPoints.totalPoints + REFERRER_POINTS,
        availablePoints: referrerPoints.availablePoints + REFERRER_POINTS,
        updatedAt: new Date(),
      }).where(eq(loyaltyPoints.userId, referralCode.userId));
    } else {
      await ldb.insert(loyaltyPoints).values({ userId: referralCode.userId, totalPoints: REFERRER_POINTS, redeemedPoints: 0, availablePoints: REFERRER_POINTS, tier: "bronze" });
    }
    await ldb.insert(loyaltyTransactions).values({ userId: referralCode.userId, type: "bonus", points: REFERRER_POINTS, description: `مكافأة إحالة مستخدم جديد` });

    // منح النقاط للمُستجلب
    const [newUserPoints] = await ldb.select().from(loyaltyPoints).where(eq(loyaltyPoints.userId, newUserId));
    if (newUserPoints) {
      await ldb.update(loyaltyPoints).set({
        totalPoints: newUserPoints.totalPoints + REFERRED_POINTS,
        availablePoints: newUserPoints.availablePoints + REFERRED_POINTS,
        updatedAt: new Date(),
      }).where(eq(loyaltyPoints.userId, newUserId));
    } else {
      await ldb.insert(loyaltyPoints).values({ userId: newUserId, totalPoints: REFERRED_POINTS, redeemedPoints: 0, availablePoints: REFERRED_POINTS, tier: "bronze" });
    }
    await ldb.insert(loyaltyTransactions).values({ userId: newUserId, type: "bonus", points: REFERRED_POINTS, description: `مكافأة الانضمام برمز الإحالة` });

    res.json({ success: true, message: "تم تطبيق رمز الإحالة بنجاح", referrerPoints: REFERRER_POINTS, newUserPoints: REFERRED_POINTS });
  } catch (error: any) {
    console.error("Error using referral code:", error);
    res.status(500).json({ message: "خطأ في استخدام رمز الإحالة" });
  }
});

export default router;
