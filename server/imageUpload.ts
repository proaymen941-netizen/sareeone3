import express from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { STORAGE_BUCKETS, UPLOADS_DIR, getPublicUrl, deleteLocalFile, ensureUploadsDir } from './localStorage.js';

const router = express.Router();

// تهيئة مجلدات الرفع عند بدء الخادم
ensureUploadsDir();

// إعداد multer للتخزين على القرص
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = (req.body?.category || 'general') as string;
    const bucket = STORAGE_BUCKETS[category as keyof typeof STORAGE_BUCKETS] || 'general';
    const dest = path.join(UPLOADS_DIR, bucket);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomId = randomUUID().substring(0, 8);
    const extension = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
    cb(null, `${timestamp}-${randomId}.${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم. يرجى رفع صورة بصيغة JPG, PNG, WebP, أو GIF'));
    }
  },
});

// رفع صورة واحدة
router.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'لم يتم اختيار ملف' });
    }

    const category = (req.body?.category || 'general') as string;
    const bucket = STORAGE_BUCKETS[category as keyof typeof STORAGE_BUCKETS] || 'general';
    const url = getPublicUrl(req.file.filename, bucket);

    res.json({
      success: true,
      message: 'تم رفع الصورة بنجاح',
      data: {
        url,
        path: `${bucket}/${req.file.filename}`,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        category,
        contentType: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error('خطأ في رفع الصورة:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء رفع الصورة' });
  }
});

// رفع صور متعددة
router.post('/upload-multiple', upload.array('images', 10), (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'لم يتم اختيار ملفات' });
    }

    const category = (req.body?.category || 'general') as string;
    const bucket = STORAGE_BUCKETS[category as keyof typeof STORAGE_BUCKETS] || 'general';

    const uploadedFiles = files.map(file => ({
      url: getPublicUrl(file.filename, bucket),
      path: `${bucket}/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      contentType: file.mimetype,
    }));

    res.json({
      success: true,
      message: `تم رفع ${files.length} صورة بنجاح`,
      data: uploadedFiles,
      failed: [],
    });
  } catch (error) {
    console.error('خطأ في رفع الصور:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء رفع الصور' });
  }
});

// حذف صورة
router.delete('/delete', (req, res) => {
  try {
    const { url, category } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'رابط الصورة مطلوب' });
    }

    // استخراج المسار النسبي من الرابط
    const match = url.match(/\/uploads\/(.+)$/);
    if (!match) {
      return res.status(400).json({ success: false, message: 'رابط الصورة غير صحيح' });
    }

    const deleted = deleteLocalFile(match[1]);
    if (deleted) {
      res.json({ success: true, message: 'تم حذف الصورة بنجاح' });
    } else {
      res.status(404).json({ success: false, message: 'الصورة غير موجودة' });
    }
  } catch (error) {
    console.error('خطأ في حذف الصورة:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حذف الصورة' });
  }
});

// HEAD endpoint للتحقق من توفر الخدمة
router.head('/upload', (req, res) => {
  res.status(200).end();
});

export default router;
