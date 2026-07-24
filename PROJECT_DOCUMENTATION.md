# تطبيق السريع ون - نظام التوصيل الشامل

## نظرة عامة على المشروع

تطبيق السريع ون هو نظام توصيل شامل يتكون من ثلاثة تطبيقات منفصلة:

1. **تطبيق العملاء** - للطلب والتصفح
2. **لوحة التحكم** - لإدارة النظام والمطاعم والطلبات
3. **تطبيق السائقين** - لإدارة توصيل الطلبات

## التقنيات المستخدمة

### Frontend (العميل)
- **React 18** - مكتبة واجهة المستخدم
- **TypeScript** - للتحقق من الأنواع
- **Vite** - أداة البناء والتطوير
- **Tailwind CSS** - للتصميم
- **Wouter** - للتوجيه
- **TanStack Query** - لإدارة البيانات
- **Lucide React** - للأيقونات
- **Radix UI** - مكونات واجهة المستخدم

### Backend (الخادم)
- **Node.js** - بيئة التشغيل
- **Express.js** - إطار عمل الخادم
- **TypeScript** - للتحقق من الأنواع
- **PostgreSQL** - قاعدة البيانات
- **Drizzle ORM** - للتفاعل مع قاعدة البيانات
- **tsx** - لتشغيل TypeScript

## هيكل المشروع

```
project/
├── client/                 # تطبيق العميل (React)
│   ├── src/
│   │   ├── components/     # مكونات واجهة المستخدم
│   │   ├── pages/          # صفحات التطبيق
│   │   ├── context/        # حالة التطبيق العامة
│   │   ├── hooks/          # React hooks مخصصة
│   │   └── lib/           # مكتبات مساعدة
├── server/                 # الخادم (Express + TypeScript)
│   ├── index.ts           # نقطة دخول الخادم
│   ├── routes.ts          # مسارات API
│   ├── storage.ts         # طبقة البيانات في الذاكرة
│   ├── db.ts             # طبقة قاعدة البيانات
│   └── vite.ts           # إعداد Vite للتطوير
├── shared/                # الكود المشترك
│   └── schema.ts         # مخطط قاعدة البيانات
└── drizzle.config.ts     # إعداد Drizzle ORM
```

## نظام المصادقة والأمان

### نظام الـ 4 نقرات للوصول لواجهة الإدارة

تم تطبيق نظام أمان خاص يتطلب:
1. النقر على شعار التطبيق 4 مرات متتالية
2. ظهور نقاط تشير لعدد النقرات
3. بعد 4 نقرات تظهر أزرار لوحة التحكم وتطبيق السائق في القائمة الجانبية
4. إعادة تعيين العداد بعد 3 ثوانٍ إذا لم تكتمل

### بيانات المصادقة

#### مدير النظام الرئيسي:
- **البريد الإلكتروني**: [يتم إنشاؤه من قاعدة البيانات]
- **كلمة المرور**: [يتم تحديدها من قبل المدير]
- **نوع المستخدم**: مدير النظام

#### سائق تجريبي:
- **رقم الهاتف**: [يتم إنشاؤه من لوحة التحكم]
- **كلمة المرور**: [يتم تحديدها من قبل المدير]
- **نوع المستخدم**: سائق

## قاعدة البيانات

### الجداول المطلوبة

```sql
-- جدول المديرين والسائقين
CREATE TABLE admin_users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  user_type TEXT NOT NULL, -- 'admin' أو 'driver'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- جدول جلسات المصادقة
CREATE TABLE admin_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id VARCHAR REFERENCES admin_users(id),
  token TEXT NOT NULL UNIQUE,
  user_type TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- جداول أخرى...
CREATE TABLE categories (...);
CREATE TABLE restaurants (...);
CREATE TABLE menu_items (...);
CREATE TABLE orders (...);
CREATE TABLE drivers (...);
CREATE TABLE special_offers (...);
```

### إعداد قاعدة البيانات

1. تم إنشاء قاعدة بيانات PostgreSQL تلقائياً
2. متغيرات البيئة متوفرة: `DATABASE_URL`, `PGHOST`, `PGPORT`, إلخ
3. الجداول تُنشأ تلقائياً عند تشغيل التطبيق

## API Endpoints

### مصادقة المديرين
- `POST /api/admin/login` - تسجيل الدخول
- `POST /api/admin/logout` - تسجيل الخروج  
- `GET /api/admin/verify` - التحقق من صحة الجلسة

### الفئات
- `GET /api/categories` - جلب جميع الفئات
- `POST /api/categories` - إضافة فئة جديدة
- `PUT /api/categories/:id` - تحديث فئة
- `DELETE /api/categories/:id` - حذف فئة

### المطاعم
- `GET /api/restaurants` - جلب جميع المطاعم
- `GET /api/restaurants/:id` - جلب مطعم محدد
- `POST /api/restaurants` - إضافة مطعم جديد
- `PUT /api/restaurants/:id` - تحديث مطعم
- `DELETE /api/restaurants/:id` - حذف مطعم

### عناصر القائمة
- `GET /api/restaurants/:restaurantId/menu` - جلب قائمة مطعم
- `POST /api/menu-items` - إضافة عنصر جديد
- `PUT /api/menu-items/:id` - تحديث عنصر
- `DELETE /api/menu-items/:id` - حذف عنصر

### الطلبات
- `GET /api/orders` - جلب جميع الطلبات
- `GET /api/orders/:id` - جلب طلب محدد
- `POST /api/orders` - إنشاء طلب جديد
- `PUT /api/orders/:id` - تحديث طلب

### السائقين
- `GET /api/drivers` - جلب جميع السائقين
- `GET /api/drivers/:id` - جلب سائق محدد
- `POST /api/drivers` - إضافة سائق جديد
- `PUT /api/drivers/:id` - تحديث سائق
- `DELETE /api/drivers/:id` - حذف سائق

### العروض الخاصة
- `GET /api/special-offers` - جلب جميع العروض
- `POST /api/special-offers` - إضافة عرض جديد
- `PUT /api/special-offers/:id` - تحديث عرض
- `DELETE /api/special-offers/:id` - حذف عرض

## الواجهات

### 1. تطبيق العملاء
- الصفحة الرئيسية مع الفئات والمطاعم
- صفحة المطعم وقائمة الطعام
- عربة التسوق والطلب
- تتبع الطلبات
- الملف الشخصي والإعدادات

### 2. لوحة التحكم (المدير)
- نظرة عامة مع الإحصائيات
- إدارة الطلبات
- إدارة المطاعم وقوائم الطعام
- إدارة السائقين
- إدارة الفئات والعروض الخاصة

### 3. تطبيق السائق
- لوحة تحكم السائق
- قبول/رفض الطلبات
- تتبع الموقع والطلبات
- إحصائيات الأرباح والتوصيلات

## كيفية تشغيل المشروع

### متطلبات النظام
- Node.js 20+
- PostgreSQL
- npm أو yarn

### خطوات التشغيل

1. **تثبيت التبعيات**:
```bash
npm install
```

2. **إعداد قاعدة البيانات**:
```bash
# سيتم إنشاء قاعدة البيانات تلقائياً في Replit
npm run db:push
```

3. **تشغيل التطبيق**:
```bash
npm run dev
```

4. **الوصول للتطبيق**:
- تطبيق العملاء: `http://localhost:5000`
- لوحة التحكم: انقر 4 مرات على الشعار ← أدخل بيانات المدير
- تطبيق السائق: انقر 4 مرات على الشعار ← أدخل بيانات السائق

## أوامر مفيدة

```bash
# تشغيل التطبيق للتطوير
npm run dev

# بناء التطبيق للإنتاج
npm run build

# تشغيل التطبيق المبني
npm run start

# دفع مخطط قاعدة البيانات
npm run db:push

# توليد ملفات المايجريشن
npm run db:generate

# فحص TypeScript
npm run check
```

---

# دليل النشر والاستضافة

## 1. رفع المشروع على GitHub

### خطوات رفع المشروع:

1. **إنشاء مستودع جديد على GitHub**:
   - اذهب إلى [github.com](https://github.com)
   - انقر على "New repository"
   - أدخل اسم المشروع: `food-delivery-app`
   - اختر "Public" أو "Private"
   - انقر "Create repository"

2. **ربط المشروع المحلي بـ GitHub**:
```bash
# تهيئة Git إذا لم يكن موجوداً
git init

# إضافة جميع الملفات
git add .

# إنشاء أول commit
git commit -m "Initial commit: Complete food delivery system with admin panel and driver app"

# ربط المستودع البعيد
git remote add origin https://github.com/YOUR_USERNAME/food-delivery-app.git

# رفع الكود
git branch -M main
git push -u origin main
```

3. **إعداد ملف `.gitignore`** (إذا لم يكن موجوداً):
```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Production builds
/dist
/build

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Database
*.db
*.sqlite

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
```

## 2. النشر على Railway.com

### لماذا Railway؟
- سهولة النشر
- دعم قواعد البيانات PostgreSQL
- نشر تلقائي من GitHub
- دومين مجاني مع HTTPS

### خطوات النشر على Railway:

#### الخطوة 1: إنشاء حساب
1. اذهب إلى [railway.app](https://railway.app)
2. انقر "Login" ← "Sign up with GitHub"
3. اربط حسابك مع GitHub

#### الخطوة 2: إنشاء مشروع جديد
1. انقر "New Project"
2. اختر "Deploy from GitHub repo"
3. اختر مستودع `food-delivery-app`
4. انقر "Deploy Now"

#### الخطوة 3: إضافة قاعدة بيانات PostgreSQL
1. في لوحة تحكم المشروع انقر "New"
2. اختر "Database" ← "Add PostgreSQL"
3. انتظر حتى يتم إنشاء قاعدة البيانات

#### الخطوة 4: ربط قاعدة البيانات بالتطبيق
1. انقر على خدمة التطبيق (ليس قاعدة البيانات)
2. اذهب إلى تبويب "Variables"
3. أضف المتغيرات التالية:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
PORT=5000
```

#### الخطوة 5: إعداد أوامر البناء
1. في تبويب "Settings"
2. في قسم "Build Command":
```bash
npm install && npm run build
```

3. في قسم "Start Command":
```bash
npm run start
```

#### الخطوة 6: إعداد الدومين
1. في تبويب "Settings"
2. في قسم "Domains"
3. انقر "Generate Domain"
4. ستحصل على رابط مثل: `https://your-app-name.up.railway.app`

### إعداد متقدم للنشر

#### إضافة ملف `railway.json`:
```json
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "npm run start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### تحديث `package.json` للنشر:
```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

## 3. نشر تلقائي من GitHub

### إعداد GitHub Actions (اختياري):

1. أنشئ مجلد `.github/workflows/`
2. أنشئ ملف `deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js 20
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests (if any)
      run: npm test --if-present
      
    - name: Build application
      run: npm run build
```

## 4. إعدادات الأمان والبيئة

### متغيرات البيئة المطلوبة:
```env
# Railway ستوفر هذه تلقائياً
DATABASE_URL=postgresql://user:password@host:port/database
PGHOST=host
PGPORT=5432
PGUSER=postgres
PGPASSWORD=password
PGDATABASE=railway

# إعدادات التطبيق
NODE_ENV=production
PORT=5000
```

### نصائح الأمان:
1. **لا تضع كلمات مرور في الكود المصدري**
2. **استخدم متغيرات البيئة دائماً**
3. **فعّل HTTPS (Railway يوفرها تلقائياً)**
4. **قم بتحديث التبعيات بانتظام**

## 5. مراقبة التطبيق

### عبر Railway:
- **Logs**: مراقبة سجلات التطبيق
- **Metrics**: مراقبة الأداء والاستخدام
- **Deployments**: تاريخ النشر والإصدارات

### نصائح للمراقبة:
1. راقب استخدام قاعدة البيانات
2. تابع أخطاء التطبيق في السجلات
3. اختبر التطبيق بانتظام بعد النشر

## الخلاصة

بعد اتباع هذه الخطوات ستحصل على:
- ✅ تطبيق توصيل شامل منشور على الإنترنت
- ✅ قاعدة بيانات PostgreSQL مُدارة
- ✅ نشر تلقائي من GitHub
- ✅ دومين مجاني مع HTTPS
- ✅ مراقبة وإحصائيات

**رابط التطبيق النهائي**: `https://your-app-name.up.railway.app`

---

## معلومات إضافية

### بيانات المصادقة للاختبار:
- **مدير النظام**: `aymenpro124@gmail.com` / `777146387`
- **سائق تجريبي**: `+967771234567` / `password123`

### نظام الـ 4 نقرات:
1. انقر على شعار "السريع ون" 4 مرات متتالية
2. ستظهر أزرار لوحة التحكم وتطبيق السائق
3. اختر النوع المناسب وسجل الدخول

### الدعم الفني:
- جميع الميزات تعمل بشكل كامل
- قاعدة البيانات متصلة ومُعدة
- نظام المصادقة آمن ومُختبر
- واجهات المستخدم جاهزة للاستخدام