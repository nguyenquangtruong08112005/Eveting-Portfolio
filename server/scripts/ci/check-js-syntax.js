const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === '.codegraph' || file === '.git') {
        continue;
      }
      results = results.concat(walk(filePath));
    } else if (file.endsWith('.js')) {
      results.push(filePath);
    }
  }
  return results;
}

const rootDir = path.join(__dirname, '..');
const jsFiles = walk(rootDir);
console.log(`Checking syntax for ${jsFiles.length} JavaScript files...`);

let hasError = false;

for (const file of jsFiles) {
  // Use spawnSync with shell: false (the default) to avoid shell-specific quoting.
  const result = spawnSync('node', ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`Syntax check failed for file: ${file}`);
    hasError = true;
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log('All JavaScript files syntax checked successfully.');
  process.exit(0);
}
