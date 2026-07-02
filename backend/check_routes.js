const fs = require('fs');
const lines = fs.readFileSync('backend/server.js', 'utf8').split('\n');
const routes = new Set();
lines.forEach((l, i) => {
  const m = l.match(/app\.(get|post|put|patch|delete)\(['"](\/api\/[a-zA-Z0-9_\-\/:]+)['"]/);
  if(m) {
    const route = m[1].toUpperCase() + ' ' + m[2];
    if(routes.has(route)) console.log(`Duplicate: ${route} at line ${i+1}`);
    routes.add(route);
  }
});
console.log('Route scan complete.');
