import fs from "node:fs";
import path from "node:path";
import multer from "multer";

const ALLOWED_MIME = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
]);

/** Builds a multer instance that writes uploaded clip files under `uploadsDir`. */
export function createUploadMiddleware(uploadsDir: string) {
  fs.mkdirSync(uploadsDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${safeName}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB — internal tool, generous but bounded
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIME.has(file.mimetype)) {
        cb(new Error(`Unsupported video type: ${file.mimetype}`));
        return;
      }
      cb(null, true);
    },
  });
}

export function uploadsRelativePath(uploadsDir: string, absoluteFilePath: string): string {
  return `/uploads/${path.relative(uploadsDir, absoluteFilePath).split(path.sep).join("/")}`;
}
