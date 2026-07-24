# دليل نشر تطبيقات نظام توصيل الطعام

يحتوي هذا المشروع على ثلاثة تطبيقات منفصلة يمكن نشرها برقابط منفصلة:

## 🏗️ بنية المشروع

```
├── client/src/          # تطبيق العميل (Customer App)
├── admin/              # لوحة التحكم (Admin Dashboard)  
├── delivery/           # تطبيق السائق (Driver App)
├── server/             # الخادم الموحد (Shared Backend)
└── shared/             # المخططات المشتركة (Shared Schemas)
```

## 📦 أوامر البناء

يتضمن المشروع أوامر بناء منفصلة لكل تطبيق:

```bash
# بناء تطبيق العميل
npm run build:client

# بناء لوحة التحكم
npm run build:admin

# بناء تطبيق السائق
npm run build:delivery

# بناء جميع التطبيقات
npm run build
```

## 🚀 استراتيجيات النشر

### الخيار 1: نشر موحد مع مسارات منفصلة

**أسهل طريقة - خادم واحد مع مسارات مختلفة:**

```bash
# نشر الخادم الموحد
npm run build
npm run start

# الروابط:
# https://yourdomain.com/        -> تطبيق العميل
# https://yourdomain.com/admin   -> لوحة التحكم
# https://yourdomain.com/driver  -> تطبيق السائق
```

**المزايا:**
- سهولة الإدارة والصيانة
- قاعدة بيانات موحدة
- تكلفة أقل (خادم واحد)

### الخيار 2: نشر منفصل كلياً

**خوادم منفصلة لكل تطبيق:**

#### 1️⃣ إعداد الخادم المشترك
```bash
# إعداد قاعدة البيانات والAPI
git clone <repository>
cd <project-directory>
npm install
npm run db:push

# تشغيل الخادم فقط
npm run start:server
```

#### 2️⃣ نشر تطبيق العميل منفصلاً
```bash
# إعداد متغيرات البيئة
cat > .env.local << EOF
VITE_API_URL=https://your-api-server.com
EOF

# بناء ونشر
npm run build:client

# رفع ملفات dist/client إلى خدمة استضافة ثابتة
# مثل: Vercel, Netlify, GitHub Pages
```

#### 3️⃣ نشر لوحة التحكم منفصلة
```bash
# إعداد متغيرات البيئة
cat > .env.local << EOF
VITE_API_URL=https://your-api-server.com
VITE_APP_TYPE=admin
EOF

# بناء ونشر
npm run build:admin

# رفع ملفات dist/admin إلى استضافة منفصلة
```

#### 4️⃣ نشر تطبيق السائق منفصلاً
```bash
# إعداد متغيرات البيئة
cat > .env.local << EOF
VITE_API_URL=https://your-api-server.com
VITE_APP_TYPE=delivery
EOF

# بناء ونشر
npm run build:delivery

# رفع ملفات dist/delivery إلى استضافة منفصلة
```

**المزايا:**
- عزل كامل للتطبيقات
- قابلية توسع مستقلة
- أمان أفضل (فصل الصلاحيات)

## ☁️ نشر على خدمات السحابة

### Vercel
```bash
# تطبيق العميل
vercel --build-env VITE_API_URL=https://api.yourdomain.com
vercel --prod

# لوحة التحكم (نشر منفصل)
vercel --build-env VITE_API_URL=https://api.yourdomain.com --build-env VITE_APP_TYPE=admin
vercel --prod
```

### Netlify
```bash
# netlify.toml للعميل
[build]
  command = "npm run build:client"
  publish = "dist/client"

[build.environment]
  VITE_API_URL = "https://api.yourdomain.com"
```

### Railway
```bash
# نشر الخادم الكامل
railway login
railway link <project-id>
railway up
```

## 🔧 إعدادات متغيرات البيئة

### للخادم:
```env
DATABASE_URL=postgresql://...
PORT=5000
NODE_ENV=production
```

### للتطبيقات الأمامية:
```env
VITE_API_URL=https://api.yourdomain.com
VITE_APP_TYPE=client|admin|delivery
```

## 🛠️ إعداد النطاقات الفرعية

إذا كنت تريد نطاقات فرعية منفصلة:

```
app.yourdomain.com      -> تطبيق العميل
admin.yourdomain.com    -> لوحة التحكم
driver.yourdomain.com   -> تطبيق السائق
api.yourdomain.com      -> خادم الAPI
```

### إعداد nginx:
```nginx
# العميل
server {
    server_name app.yourdomain.com;
    root /var/www/client;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# لوحة التحكم
server {
    server_name admin.yourdomain.com;
    root /var/www/admin;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# السائق
server {
    server_name driver.yourdomain.com;
    root /var/www/delivery;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 🔐 اعتبارات الأمان

### CORS Configuration
عند النشر المنفصل، تأكد من إعداد CORS بشكل صحيح:

```javascript
// server/index.js
const cors = require('cors');

app.use(cors({
  origin: [
    'https://app.yourdomain.com',
    'https://admin.yourdomain.com', 
    'https://driver.yourdomain.com'
  ],
  credentials: true
}));
```

### متغيرات البيئة الآمنة
- لا تضع مفاتيح API في الكود
- استخدم خدمات إدارة الأسرار
- فعل HTTPS في الإنتاج

## 📊 المراقبة والصيانة

### نشر موحد:
- مراقبة خادم واحد
- لوجز موحدة
- نسخ احتياطي واحد للقاعدة

### نشر منفصل:
- مراقبة كل خدمة منفصلة
- إدارة لوجز متعددة
- تنسيق التحديثات

## 🚨 نصائح مهمة

1. **اختبر محلياً أولاً** قبل النشر
2. **استخدم أدوات CI/CD** للنشر التلقائي
3. **راقب الأداء** بعد النشر
4. **اعمل نسخ احتياطية** منتظمة
5. **وثق أي تغييرات** في الإعدادات

## 🔄 التحديث والصيانة

```bash
# تحديث جميع التبعيات
npm update

# إعادة بناء ونشر
npm run build
npm run deploy

# فحص الحالة
npm run health-check
```

---

**ملاحظة:** هذا المشروع مُهيأ للعمل بكلا الطريقتين. اختر الاستراتيجية التي تناسب احتياجاتك وميزانيتك.