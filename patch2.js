const fs = require('fs');

let code = fs.readFileSync('backend/server.js', 'utf8');

const regex1 = /\/\/ Upload profile data along with images[\s\S]*?const userId = req\.user\.userId;/;
const replacement1 = `// Upload profile data (JSON based)
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
      } = req.body;
      const userId = req.user.userId;`;

code = code.replace(regex1, replacement1);

const regex2 = /const files = req\.files[\s\S]*?cccdPath = await uploadFileToStorage.*?;\r?\n      }/;
const replacement2 = `      let photoPath = profile_photo_url || null;
      let cccdPath  = cccd_url || null;`;

code = code.replace(regex2, replacement2);

fs.writeFileSync('backend/server.js', code);
