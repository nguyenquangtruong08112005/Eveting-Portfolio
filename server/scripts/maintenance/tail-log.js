const fs = require('fs');
const path = require('path');

const type = process.argv[2];
if (type !== 'app' && type !== 'http') {
  console.error('Usage: node scripts/tail-log.js <app|http>');
  process.exit(1);
}

const filePath = path.join(__dirname, '..', 'logs', `${type}.log`);

// Ensure logs directory and file exist
fs.mkdirSync(path.dirname(filePath), { recursive: true });
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, '');
}

// Print last 50 lines
function printTail() {
  const stat = fs.statSync(filePath);
  const size = stat.size;
  if (size === 0) return;

  const fd = fs.openSync(filePath, 'r');
  const bufferSize = Math.min(size, 65536); // Read last 64KB
  const buffer = Buffer.alloc(bufferSize);
  fs.readSync(fd, buffer, 0, bufferSize, Math.max(0, size - bufferSize));
  fs.closeSync(fd);

  const content = buffer.toString('utf8');
  const lines = content.split(/\r?\n/);
  // Remove last line if it is empty (often due to trailing newline)
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  const toPrint = lines.slice(-50);
  if (toPrint.length > 0) {
    process.stdout.write(toPrint.join('\n') + '\n');
  }
}

printTail();

// Now watch the file for changes
let currentSize = fs.statSync(filePath).size;

fs.watch(path.dirname(filePath), (eventType, filename) => {
  if (filename === `${type}.log`) {
    if (!fs.existsSync(filePath)) {
      currentSize = 0;
      return;
    }
    const stat = fs.statSync(filePath);
    if (stat.size > currentSize) {
      const fd = fs.openSync(filePath, 'r');
      const length = stat.size - currentSize;
      const buffer = Buffer.alloc(length);
      fs.readSync(fd, buffer, 0, length, currentSize);
      fs.closeSync(fd);
      process.stdout.write(buffer.toString('utf8'));
      currentSize = stat.size;
    } else if (stat.size < currentSize) {
      // File was truncated or reset
      currentSize = stat.size;
    }
  }
});
