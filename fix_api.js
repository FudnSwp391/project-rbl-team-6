const fs = require('fs');
let content = fs.readFileSync('frontend/src/services/api.js');
// convert buffer to utf8 string, removing null bytes added by powershell
let str = content.toString('utf8').replace(/\0/g, '');
// replace the bad export
str = str.replace('e x p o r t   c o n s t   a p i R e q u e s t   =   r e q u e s t ; \r\n', '');
str = str.replace('export const apiRequest = request;\r\n', '');
str = str.replace('export const apiRequest = request;\n', '');

// append clean export
str = str.trim() + '\nexport const apiRequest = request;\n';
fs.writeFileSync('frontend/src/services/api.js', str);
console.log('Fixed api.js');
