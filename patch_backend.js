const fs = require('fs');

let code = fs.readFileSync('backend/server.js', 'utf8');

// Use split/join for safe replacement of exact strings across CRLF/LF issues
function replaceSafe(original, searchString, replaceString) {
    const linesSearch = searchString.split('\n').map(l => l.trim()).filter(l => l);
    
    // Find where the block begins
    const lines = original.split(/\r?\n/);
    
    let matchIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        let match = true;
        for (let j = 0; j < linesSearch.length; j++) {
            if (i + j >= lines.length || !lines[i + j].trim().includes(linesSearch[j])) {
                match = false;
                break;
            }
        }
        if (match) {
            matchIdx = i;
            break;
        }
    }
    
    if (matchIdx !== -1) {
        lines.splice(matchIdx, linesSearch.length, replaceString);
        return lines.join('\n');
    }
    console.log("Could not find block:\n", searchString.substring(0, 50));
    return original;
}

// 1. Move supabaseAdmin
const createClientOld = `const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);`;

code = replaceSafe(code, createClientOld, "");

const supabaseKeys = `const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";`;

const supabaseKeysNew = `const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);`;

code = replaceSafe(code, supabaseKeys, supabaseKeysNew);

// 2. Add /presigned-url
const profileGetRoute = `app.get("/api/tutor/profile", verifyToken, async (req, res) => {`;
const presignedRoute = `
// POST /api/tutor/presigned-url
app.post("/api/tutor/presigned-url", verifyToken, async (req, res) => {
  try {
    const { filename, bucket } = req.body;
    if (!filename) return res.status(400).json({ message: "filename is required." });
    
    const targetBucket = bucket || 'tutor-documents';
    const ext = filename.split('.').pop();
    const safePath = \`\${req.user.userId}_\${Date.now()}.\${ext}\`;

    const { data, error } = await supabaseAdmin.storage
      .from(targetBucket)
      .createSignedUploadUrl(safePath);

    if (error) {
      console.error("Supabase sign error:", error);
      return res.status(500).json({ message: "Lỗi cấu hình Storage." });
    }
    
    return res.json({ 
      signedUrl: data.signedUrl, 
      path: data.path,
      publicUrl: \`\${process.env.SUPABASE_URL}/storage/v1/object/public/\${targetBucket}/\${data.path}\`
    });
  } catch (error) {
    console.error("Presigned URL error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

app.get("/api/tutor/profile", verifyToken, async (req, res) => {`;

code = replaceSafe(code, profileGetRoute, presignedRoute);

// 3. Update /api/tutor/profile route
const profilePostOld1 = `// Upload profile data along with images
app.post(
  "/api/tutor/profile",
  verifyToken,
  // Khai báo đủ 3 file fields để multer không ném LIMIT_UNEXPECTED_FILE
  upload.fields([
    { name: "profile_photo",  maxCount: 1  },
    { name: "certificates",   maxCount: 10 },
    { name: "cccd",           maxCount: 1  },
  ]),
  // ─── Multer error handler: trả JSON thay vì HTML ───────────────────────
  (err, req, res, next) => {
    if (err) {
      return res.status(400).json({ message: err.message || "File upload error." });
    }
    next();
  },
  async (req, res) => {
    try {
      const {
        bio, subjects, experience_years,
        first_name, last_name, display_name,
        birthday, gender, country, city, phone,
        education, language, hourly_rate,
        teaching_style, qualifications,
        teaching_methods, suitable_students, cert_metadata,
      } = req.body;`;

const profilePostNew1 = `// Upload profile data (JSON based, files are uploaded directly to Supabase via presigned-url)
app.post(
  "/api/tutor/profile",
  verifyToken,
  async (req, res) => {
    try {
      const {
        bio, subjects, experience_years,
        first_name, last_name, display_name,
        birthday, gender, country, city, phone,
        education, language, hourly_rate,
        teaching_style, qualifications,
        teaching_methods, suitable_students, cert_metadata,
        profile_photo_url, cccd_url
      } = req.body;`;

code = replaceSafe(code, profilePostOld1, profilePostNew1);

const profilePostOld2 = `const files = req.files || {};
      const photoFile = files["profile_photo"] ? files["profile_photo"][0] : null;
      const certFiles = files["certificates"]  || [];
      const cccdFile  = files["cccd"]          ? files["cccd"][0]          : null;

      let photoPath = null;
      let cccdPath  = null;

      if (photoFile) {
        const ext = photoFile.originalname.split('.').pop();
        photoPath = await uploadFileToStorage(photoFile, \`profile_photos/\${userId}_\${Date.now()}.\${ext}\`);
      }
      if (cccdFile) {
        const ext = cccdFile.originalname.split('.').pop();
        cccdPath = await uploadFileToStorage(cccdFile, \`cccds/\${userId}_\${Date.now()}.\${ext}\`);
      }`;

const profilePostNew2 = `      let photoPath = profile_photo_url || null;
      let cccdPath  = cccd_url || null;`;

code = replaceSafe(code, profilePostOld2, profilePostNew2);

fs.writeFileSync('backend/server.js', code);
console.log('Done');
