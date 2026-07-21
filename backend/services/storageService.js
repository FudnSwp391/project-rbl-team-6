/**
 * Supabase Storage Service — Person 4
 *
 * Upload file lên Supabase Storage bucket "course-materials".
 * Nếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY chưa cấu hình,
 * service sẽ log warning và trả null (không crash server).
 */
const { createClient } = require("@supabase/supabase-js");
const WebSocketImpl = require("ws");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const BUCKET_NAME = "edux-media";

// ── Allowed file extensions ─────────────────────────────────────────────────
const ALLOWED_EXTENSIONS = [
  ".pdf", ".doc", ".docx", ".ppt", ".pptx",
  ".zip", ".png", ".jpg", ".jpeg",
];

// ── Max file size: 50 MB ────────────────────────────────────────────────────
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// ── Supabase client (lazy init) ─────────────────────────────────────────────
let supabase = null;

function getSupabase() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || key === "your_service_role_key_here") {
    console.warn(
      "[Storage] ⚠️  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — file upload disabled"
    );
    return null;
  }

  // Only .storage calls below, no realtime channels — pass ws explicitly
  // so client construction doesn't depend on native WebSocket detection.
  supabase = createClient(url, key, { realtime: { transport: WebSocketImpl } });
  console.log("[Storage] ✅ Supabase client initialized");
  return supabase;
}

/**
 * Tính file type từ extension
 */
function getFileType(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const map = {
    ".pdf": "pdf",
    ".doc": "doc",
    ".docx": "docx",
    ".ppt": "ppt",
    ".pptx": "pptx",
    ".zip": "zip",
    ".png": "png",
    ".jpg": "jpg",
    ".jpeg": "jpg",
  };
  return map[ext] || ext.replace(".", "") || "unknown";
}

/**
 * Format file size cho UI
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate file trước khi upload
 */
function validateFile(file) {
  if (!file) {
    return { valid: false, message: "No file provided" };
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      message: `File type "${ext}" not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      message: `File size ${formatFileSize(file.size)} exceeds limit of ${formatFileSize(MAX_FILE_SIZE)}`,
    };
  }

  return { valid: true };
}

/**
 * Upload file lên Supabase Storage
 *
 * @param {Object} file  — multer file object (buffer, originalname, mimetype, size)
 * @param {string} classId — UUID của class
 * @returns {{ fileUrl, fileType, fileSize } | null}
 */
async function uploadToSupabase(file, classId) {
  const client = getSupabase();
  if (!client) {
    return null; // Supabase chưa cấu hình
  }

  // Tạo unique file path: classId/timestamp_filename
  const timestamp = Date.now();
  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${classId}/${timestamp}_${safeName}`;

  // Upload
  const { data, error } = await client.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    console.error("[Storage] Upload error:", error.message);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Lấy public URL
  const { data: urlData } = client.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    fileUrl: urlData.publicUrl,
    fileType: getFileType(file.originalname),
    fileSize: formatFileSize(file.size),
  };
}

module.exports = {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  BUCKET_NAME,
  validateFile,
  uploadToSupabase,
  getFileType,
  formatFileSize,
};
