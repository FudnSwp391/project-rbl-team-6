const fs = require('fs');

try {
  let p1 = 'frontend/src/TutorDetailPage.jsx';
  if (fs.existsSync(p1)) {
    let s = fs.readFileSync(p1, 'utf8');
    s = s.replace(
      '<span className="material-symbols-outlined">event_available</span> Đặt Lịch Học',
      '<span className="material-symbols-outlined">event_available</span> Đặt Lịch Học'
    );
    // Add onClick to the button
    s = s.replace(
      '<button className="w-full h-[48px] bg-[#00288e]',
      '<button onClick={() => window.location.hash = \'/booking/\' + tutor.id} className="w-full h-[48px] bg-[#00288e]'
    );
    fs.writeFileSync(p1, s);
  }
} catch (e) {
  console.log(e);
}

try {
  let p2 = 'frontend/src/pages/TutorProfile.jsx';
  if (fs.existsSync(p2)) {
    let s = fs.readFileSync(p2, 'utf8');
    // Just in case there are any leftover alerts or hrefs we can make sure it works
    // It already has onClick={() => window.location.hash = '/booking/' + id}
    fs.writeFileSync(p2, s);
  }
} catch (e) {
  console.log(e);
}

console.log('Patched Book buttons');
