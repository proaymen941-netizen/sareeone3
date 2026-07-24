import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

export const STORAGE_BUCKETS = {
  restaurants: 'restaurants',
  menuItems: 'menuItems',
  offers: 'offers',
  categories: 'categories',
  general: 'general',
};

export function ensureUploadsDir(): void {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  for (const bucket of Object.values(STORAGE_BUCKETS)) {
    const bucketDir = path.join(UPLOADS_DIR, bucket);
    if (!fs.existsSync(bucketDir)) {
      fs.mkdirSync(bucketDir, { recursive: true });
    }
  }
}

export function getPublicUrl(filename: string, category: string): string {
  return `/uploads/${category}/${filename}`;
}

export function deleteLocalFile(filePath: string): boolean {
  try {
    const fullPath = path.join(UPLOADS_DIR, filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export { UPLOADS_DIR };
