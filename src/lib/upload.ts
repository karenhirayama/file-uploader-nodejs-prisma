// src/lib/upload.ts
import multer from 'multer';
import path from 'path';

// Why file validation? Security - prevent malicious file uploads
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const maxFileSize = 10 * 1024 * 1024; // 10MB

// Why diskStorage? Temporary local storage before cloud upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Temporary storage
  },
  filename: (req, file, cb) => {
    // Why unique names? Prevent filename conflicts
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for security - only check MIME types here
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSize // Multer will handle size validation automatically
  }
});