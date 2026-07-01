const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'chat_history.md');
const stats = fs.statSync(filePath);
const fileSizeInBytes = stats.size;

// We need to find the EPIC 0.9 document content. Let's extract in chunks and search.
// First, let's extract multiple sections to find the database schema doc

const chunkSize = 200000; // 200KB chunks
const outputDir = path.join(__dirname, 'extracted_chunks');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Extract 5 chunks from different positions to find the schema doc
const positions = [
    0,                                    // beginning
    Math.floor(fileSizeInBytes * 0.2),    // 20%
    Math.floor(fileSizeInBytes * 0.4),    // 40%  
    Math.floor(fileSizeInBytes * 0.6),    // 60%
    Math.floor(fileSizeInBytes * 0.8),    // 80%
];

const fd = fs.openSync(filePath, 'r');

positions.forEach((pos, idx) => {
    const bytesToRead = Math.min(chunkSize, fileSizeInBytes - pos);
    const buffer = Buffer.alloc(bytesToRead);
    fs.readSync(fd, buffer, 0, bytesToRead, pos);
    const outFile = path.join(outputDir, `chunk_${idx}.txt`);
    fs.writeFileSync(outFile, buffer.toString('utf8'));
    console.log(`Chunk ${idx}: position ${pos}, size ${bytesToRead} bytes -> ${outFile}`);
});

fs.closeSync(fd);

// Also search for EPIC 0.9 and GAP- keywords positions
const searchChunkSize = 50000;
let found_positions = [];

const fd2 = fs.openSync(filePath, 'r');
for (let pos = 0; pos < fileSizeInBytes; pos += searchChunkSize) {
    const bytesToRead = Math.min(searchChunkSize + 1000, fileSizeInBytes - pos); // overlap
    const buffer = Buffer.alloc(bytesToRead);
    fs.readSync(fd2, buffer, 0, bytesToRead, pos);
    const text = buffer.toString('utf8');
    
    if (text.includes('EPIC 0.9') || text.includes('Database Schema & Data Architecture')) {
        found_positions.push({ keyword: 'EPIC 0.9', position: pos });
    }
    if (text.includes('SECTION 1') && text.includes('GAP-')) {
        found_positions.push({ keyword: 'SECTION+GAP', position: pos });
    }
    if (text.includes('CREATE TABLE') || text.includes('create table')) {
        found_positions.push({ keyword: 'CREATE TABLE', position: pos });
    }
}
fs.closeSync(fd2);

console.log('\nFound keyword positions:', JSON.stringify(found_positions, null, 2));

// Extract around found positions
found_positions.forEach((fp, idx) => {
    const fd3 = fs.openSync(filePath, 'r');
    const startPos = Math.max(0, fp.position - 5000);
    const bytesToRead = Math.min(300000, fileSizeInBytes - startPos);
    const buffer = Buffer.alloc(bytesToRead);
    fs.readSync(fd3, buffer, 0, bytesToRead, startPos);
    const outFile = path.join(outputDir, `found_${idx}_${fp.keyword.replace(/[^a-zA-Z0-9]/g, '_')}.txt`);
    fs.writeFileSync(outFile, buffer.toString('utf8'));
    console.log(`Found chunk ${idx}: ${fp.keyword} at ~${fp.position} -> ${outFile}`);
    fs.closeSync(fd3);
});

console.log('\nDone! Total file size:', fileSizeInBytes, 'bytes');
