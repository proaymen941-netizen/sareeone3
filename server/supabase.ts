// تم استبدال Supabase بالتخزين المحلي
// This file is kept for compatibility - actual implementation moved to localStorage.ts
export { STORAGE_BUCKETS, ensureUploadsDir as ensureBucketsExist, getPublicUrl, deleteLocalFile } from './localStorage.js';
export const supabaseClient = null;
