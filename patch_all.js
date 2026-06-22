const fs = require('fs');

// 1. Fix backend server.js to add PUT /api/tutor/availability
let serverJs = fs.readFileSync('backend/server.js', 'utf8');
const availabilityApi = `// PUT /api/tutor/availability
app.put("/api/tutor/availability", verifyToken, async (req, res) => {
  try {
    const { availability } = req.body;
    await pool.query(
      "UPDATE tutor_profiles SET availability = $1 WHERE user_id = $2",
      [availability, req.user.userId]
    );
    return res.json({ message: "Availability updated successfully." });
  } catch (error) {
    console.error("PUT /api/tutor/availability error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});
`;
if (!serverJs.includes('/api/tutor/availability')) {
  const injectTarget = 'app.get("/api/tutor/profile", verifyToken, async (req, res) => {';
  const parts = serverJs.split(injectTarget);
  if (parts.length === 2) {
    fs.writeFileSync('backend/server.js', parts[0] + availabilityApi + '\n' + injectTarget + parts[1]);
    console.log('Patched server.js with /api/tutor/availability');
  } else {
    console.log('Failed to inject into server.js');
  }
}

// 2. Fix Dashboards to make EduX logo a link
const dashboards = [
  'frontend/src/TutorDashboard.jsx',
  'frontend/src/StudentDashboard.jsx',
  'frontend/src/ParentDashboard.jsx',
  'frontend/src/AdminDashboard.jsx'
];

dashboards.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // They all have this similar block:
  // <div className="flex items-center gap-sm">
  //   <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
  //     <span className="material-symbols-outlined text-[18px]">school</span>
  //   </div>
  //   <div>
  //     <h1 className="font-headline-md text-[20px] leading-tight font-black text-primary">
  //       EduX
  
  // We can just replace `<div className="flex items-center gap-sm">` with `<a href="#/" className="flex items-center gap-sm hover:opacity-80 transition-opacity">`
  // But ONLY for the logo part. We can find the index of 'EduX' and find the preceding '<div className="flex items-center gap-sm">'
  
  const logoIdx = content.indexOf('EduX');
  if (logoIdx !== -1) {
    const divIdx = content.lastIndexOf('<div className="flex items-center gap-sm">', logoIdx);
    if (divIdx !== -1 && logoIdx - divIdx < 400) {
       let newContent = content.substring(0, divIdx) + 
                        '<a href="#/" className="flex items-center gap-sm hover:opacity-80 transition-opacity">' + 
                        content.substring(divIdx + 42); // 42 is length of <div className="flex items-center gap-sm">
       
       // Need to replace the closing </div> of that container with </a>
       // This is a bit tricky with simple string manipulation.
       // Let's just use regex or exact replacement since we know the HTML structure.
       
       // Alternative: Find the block:
       /*
          <div className="flex items-center gap-sm">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[18px]">school</span>
            </div>
            <div>
              <h1 className="font-headline-md text-[20px] leading-tight font-black text-primary">
                EduX
              </h1>
              <p className="font-label-sm text-label-sm text-on-surface-variant">...</p>
            </div>
          </div>
       */
       
       const regex = /(<div className="flex items-center gap-sm">)(\s*<div.*?<\/div>\s*<div>\s*<h1.*?EduX<\/h1>\s*<p.*?<\/p>\s*<\/div>\s*)(<\/div>)/is;
       if (regex.test(content)) {
          newContent = content.replace(regex, '<a href="#/" className="flex items-center gap-sm hover:opacity-80 transition-opacity">$2</a>');
          fs.writeFileSync(file, newContent);
          console.log('Patched logo in ' + file);
       } else {
          // AdminDashboard has no <p> under EduX:
          const regexAdmin = /(<div className="flex items-center gap-sm">)(\s*<div.*?<\/div>\s*<h1.*?EduX<\/h1>\s*)(<\/div>)/is;
          if (regexAdmin.test(content)) {
            newContent = content.replace(regexAdmin, '<a href="#/" className="flex items-center gap-sm hover:opacity-80 transition-opacity">$2</a>');
            fs.writeFileSync(file, newContent);
            console.log('Patched logo in ' + file);
          } else {
             // Let's try matching just the divs
             const regexGeneral = /(<div className="flex items-center gap-sm">)(\s*<div className="w-8 h-8.*?<\/div>\s*<div>\s*<h1.*?EduX<\/h1>.*?<\/div>\s*)(<\/div>)/is;
             if (regexGeneral.test(content)) {
                newContent = content.replace(regexGeneral, '<a href="#/" className="flex items-center gap-sm hover:opacity-80 transition-opacity">$2</a>');
                fs.writeFileSync(file, newContent);
                console.log('Patched general logo in ' + file);
             } else {
                console.log('Could not match logo block in ' + file);
             }
          }
       }
    }
  }
});
