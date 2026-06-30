const fs = require('fs');
let lines = fs.readFileSync('backend/server.js', 'utf8').split('\n');

// Remove from bottom to top so line numbers don't shift!
lines.splice(3975, 4102 - 3975 + 1); // ai-suggest
lines.splice(3012, 3032 - 3012 + 1); // reviews
lines.splice(1844, 1854 - 1844 + 1); // exam-papers
lines.splice(1246, 1380 - 1246 + 1); // admin duplicates

fs.writeFileSync('backend/server.js', lines.join('\n'), 'utf8');
console.log('Cleanup complete.');
