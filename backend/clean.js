const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const strToRemove = `const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);`;

const strToRemoveCRLF = strToRemove.replace(/\n/g, '\r\n');

code = code.replace(strToRemove, '');
code = code.replace(strToRemoveCRLF, '');

fs.writeFileSync('server.js', code);
console.log("Done clean");
