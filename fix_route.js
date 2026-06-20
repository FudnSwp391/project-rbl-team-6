const fs = require('fs');
let s = fs.readFileSync('frontend/src/App.jsx', 'utf8');

if (!s.includes("if (normalized === '/courses') return { name: 'courses' }")) {
  s = s.replace(
    "if (normalized === '/become-tutor') return { name: 'become-tutor' }",
    "if (normalized === '/become-tutor') return { name: 'become-tutor' }\n  if (normalized === '/courses') return { name: 'courses' }"
  );
}

fs.writeFileSync('frontend/src/App.jsx', s);
console.log('Fixed /courses route');
