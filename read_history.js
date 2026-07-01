const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'chat_history.md');
const outPath = path.join(__dirname, 'latest_chat_context.md');

try {
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    
    // Read the last 50,000 bytes (~50KB) to get a good chunk of the latest conversation
    const bytesToRead = Math.min(50000, fileSizeInBytes);
    const buffer = Buffer.alloc(bytesToRead);
    
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, bytesToRead, fileSizeInBytes - bytesToRead);
    fs.closeSync(fd);
    
    fs.writeFileSync(outPath, buffer.toString('utf8'));
    console.log('Successfully extracted the latest context to latest_chat_context.md');
} catch (err) {
    console.error('Error reading chat history:', err);
}
