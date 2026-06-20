const fs = require('fs');
let code = fs.readFileSync('frontend/src/TutorProfileForm.jsx', 'utf8');

// 1. Import uploadViaBackend
if (!code.includes("uploadViaBackend")) {
  const importTarget = `import { useAuth } from './AuthContext'`;
  code = code.replace(importTarget, `${importTarget}\nimport { uploadAvatarFile, uploadProofFile } from './services/upload'`);
}

// 2. Rewrite handleSubmit
const regex = /const formData = new FormData\(\)[\s\S]*?const res = await fetch\(\`\$\{API\}\/api\/tutor\/profile\`[\s\S]*?body: formData,\s*}\)[\s\S]*?const data = await res\.json\(\)/;

const newSubmitBlock = `
    try {
      let activeToken = token

      // ── Luồng đăng ký mới: tạo tài khoản trước, rồi mới tạo profile ────────
      if (isNewRegistration) {
        const regRes = await fetch(\`\${API}/api/auth/register\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: \`\${firstName.trim()} \${lastName.trim()}\`,
            email: pendingReg.email,
            password: pendingReg.password,
            role: 'tutor',
          }),
        })
        const regData = await regRes.json()
        if (!regRes.ok) throw new Error(regData.message || 'Registration failed.')
        activeToken = regData.token
        // Lưu user vào auth context (không redirect)
        loginSilent(regData.token, regData.user)
        // Xoá pending data khỏi sessionStorage
        sessionStorage.removeItem('pendingTutorReg')
      }

      // ── Upload file lên Supabase trước khi gọi lưu profile ────────────────
      let profile_photo_url = null
      let cccd_url = null

      if (profilePhotoFile) {
        profile_photo_url = await uploadAvatarFile(profilePhotoFile)
      }
      if (cccdFile) {
        cccd_url = await uploadProofFile(cccdFile)
      }

      // ── Chuẩn bị JSON Payload ──────────────────────────────────────────────
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        display_name: displayName.trim(),
        gender,
        country,
        city: city.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        subjects: subjects.join(', '),
        education,
        experience_years: experienceYears,
        language,
        hourly_rate: hourlyRate !== '' ? hourlyRate : null,
        teaching_style: teachingStyle.trim(),
        qualifications: qualifications.trim(),
        teaching_methods: JSON.stringify(teachingMethods.filter(m => m.trim())),
        suitable_students: JSON.stringify(suitableStudents),
        cert_metadata: JSON.stringify(certMetadata),
        profile_photo_url,
        cccd_url
      }

      if (day && month && year) {
        const padM = String(MONTHS.indexOf(month) + 1).padStart(2, '0')
        payload.birthday = \`\${year}-\${padM}-\${day}\`
      }

      // ── Gọi API tạo/cập nhật tutor profile ──────────────────────────────────
      const res = await fetch(\`\${API}/api/tutor/profile\`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${activeToken}\` 
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
`;

const match = code.match(regex);
if (match) {
    code = code.replace(regex, newSubmitBlock.trim());
    fs.writeFileSync('frontend/src/TutorProfileForm.jsx', code);
    console.log("Patched TutorProfileForm.jsx successfully!");
} else {
    console.log("Regex match failed");
}
