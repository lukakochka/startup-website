import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(__dirname, '../../public/uploads');

// Ensure uploads directory exists on startup
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `fridge-${unique}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
  if (ALLOWED.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files allowed: JPEG, PNG, WebP, HEIC'), false);
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }, // 10MB max
});
