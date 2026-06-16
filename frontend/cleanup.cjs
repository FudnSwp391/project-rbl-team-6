const fs = require('fs');
const content = fs.readFileSync('src/ParentDashboard.jsx', 'utf8');
const lines = content.split('\n');

// Find line numbers (0-indexed)
// We want to keep lines 0..1224 (the new MessagesSection ends at line 1224, 1-indexed = index 1223)
// Then skip until the real StatCard which starts with "function StatCard"
// The real StatCard has "const colors = {" right after

let deleteFrom = -1; 
let deleteTo = -1;

// Find the second occurrence of "function StatCard" or the orphaned code after line 1224
// Specifically, after MessagesSection closes (line 1224 = index 1223), 
// find the next "function StatCard" which is the duplicate, 
// and delete until the line BEFORE the real StatCard at line 1499

for (let i = 1224; i < lines.length; i++) {
  if (lines[i].trim() === '// ═══════════════════════════════════════════════════════════════════════════════' && 
      lines[i+1] && lines[i+1].trim() === '//  SHARED UI COMPONENTS' &&
      deleteFrom === -1) {
    // This is the duplicate header after MessagesSection
    // Keep looking until we find the real StatCard (with "const colors = {")
    for (let j = i; j < lines.length; j++) {
      if (lines[j].includes('const colors = {')) {
        // Real StatCard found at j, its declaration is 1 line above
        deleteFrom = i; // start of duplicate
        deleteTo = j - 2; // end just before "function StatCard({ icon..." of real one
        break;
      }
    }
    break;
  }
}

console.log(`Delete from line ${deleteFrom+1} to ${deleteTo+1} (0-indexed: ${deleteFrom} to ${deleteTo})`);
if (deleteFrom > 0 && deleteTo > deleteFrom) {
  const newLines = [...lines.slice(0, deleteFrom), ...lines.slice(deleteTo + 1)];
  fs.writeFileSync('src/ParentDashboard.jsx', newLines.join('\n'), 'utf8');
  console.log('Done! Removed', deleteTo - deleteFrom + 1, 'lines');
} else {
  console.log('No duplicate found or wrong indices');
}
