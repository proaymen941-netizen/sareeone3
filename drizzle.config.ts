import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, تأكد من إعداد قاعدة البيانات");
}

export default defineConfig({
  schema: "./shared/schema.ts",  // ملف الـ schema
  out: "./drizzle",              // مجلد الميجريشن
   dialect: "postgresql",          // نوع قاعدة البيانات
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
