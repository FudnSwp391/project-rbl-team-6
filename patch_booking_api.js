const fs = require('fs');
const { execSync } = require('child_process');

// Get the server.js content from the feature branch
const featureServerJs = execSync('git show ce78e6b:backend/server.js', { encoding: 'utf8' });

// Extract GET, POST, DELETE /api/bookings blocks
const lines = featureServerJs.split('\n');

let bookingApiCode = [];
let capturing = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('// GET /api/bookings — danh sách lịch học')) {
    capturing = true;
  }
  
  if (capturing) {
    bookingApiCode.push(line);
    // Stop capturing when we reach the next unrelated section
    if (line.includes('// Lấy danh sách tutors cho Admin') || line.includes('// GET /api/admin/tutors')) {
      // pop the last line
      bookingApiCode.pop();
      break;
    }
  }
}

console.log('Found booking API lines:', bookingApiCode.length);

if (bookingApiCode.length > 10) {
  let mainServerJs = fs.readFileSync('backend/server.js', 'utf8');
  
  // check if main already has it
  if (!mainServerJs.includes('app.post("/api/bookings"')) {
    // Insert before attendance endpoint or at the end
    const targetString = 'app.patch("/api/bookings/:id/attendance"';
    
    if (mainServerJs.includes(targetString)) {
      mainServerJs = mainServerJs.replace(targetString, bookingApiCode.join('\n') + '\n\n' + targetString);
      fs.writeFileSync('backend/server.js', mainServerJs);
      console.log('Successfully patched booking API endpoints!');
    } else {
      console.log('Target string for patching not found.');
    }
  } else {
    console.log('Booking API already exists in main server.js');
  }
} else {
  console.log('Could not extract booking API properly. Lines found: ', bookingApiCode.join('\n'));
}
