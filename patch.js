const fs = require('fs');
const path = require('path');

const files = [
  'frontend/src/App.jsx',
  'frontend/src/BecomeTutorPage.jsx',
  'frontend/src/FindTutorsPage.jsx',
  'frontend/src/SignIn.jsx',
  'frontend/src/SignUp.jsx',
  'frontend/src/SubjectsPage.jsx',
  'frontend/src/TutorDashboard.jsx',
  'frontend/src/TutorDetailPage.jsx',
  'frontend/src/components/StudentSidebar.jsx',
  'frontend/src/pages/CartPage.jsx'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    let newContent = content.replace(/href="#"(?!\s*onClick)/g, 'href="#" onClick={(e) => e.preventDefault()}');
    
    // Fix specific one in TutorDashboard
    if (file === 'frontend/src/TutorDashboard.jsx') {
       newContent = newContent.replace(
         '<a href="#" className="text-primary font-label-md hover:underline">',
         '<a href="#" onClick={(e) => { e.preventDefault(); setActiveTab(\'Requests\'); }} className="text-primary font-label-md hover:underline cursor-pointer">'
       );
    }
    
    if (content !== newContent) {
      fs.writeFileSync(fullPath, newContent, 'utf8');
      console.log('Patched', file);
    }
  }
});
