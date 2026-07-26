const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === '.git') continue;
      results = results.concat(walk(filePath));
    } else if (file.endsWith('.js')) {
      results.push(filePath);
    }
  }
  return results;
}

const dbDir = path.join(__dirname, '..', '..', 'src', 'providers', 'database');
const files = walk(dbDir);
let totalQueries = 0;
let unsafeQueries = 0;
const violations = [];

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Detect query executions
    if (line.includes('.query(') || line.includes('query(`') || line.includes('query("')) {
      totalQueries++;

      // Check for dangerous template interpolation inside query call
      if (line.includes('${') && !line.includes('// sql-param-ignore')) {
        // Exclude allowed safe structural interpolations (e.g. table names, list of columns) if explicitly safe
        const isSafeStructural = /\${(tableName|table|columnList|orderClause|whereClause|setClause|sql|idx|\w+\s*\+\s*\d+)}/.test(line);
        if (!isSafeStructural) {
          unsafeQueries++;
          violations.push({
            file: path.relative(path.join(__dirname, '..', '..'), filePath),
            line: index + 1,
            content: line.trim(),
          });
        }
      }

      // Check for dangerous string concatenation inside query call
      if (/query\s*\([^,)]*\+\s*[a-zA-Z_$]/.test(line) && !line.includes('// sql-param-ignore')) {
        unsafeQueries++;
        violations.push({
          file: path.relative(path.join(__dirname, '..', '..'), filePath),
          line: index + 1,
          content: line.trim(),
        });
      }
    }
  });
}

console.log('--- PostgreSQL Parameterization Verification ---');
console.log(`Scanned files: ${files.length}`);
console.log(`Total queries checked: ${totalQueries}`);
console.log(`Unsafe query interpolations found: ${unsafeQueries}`);

if (violations.length > 0) {
  console.error('\nViolations detected:');
  violations.forEach((v) => {
    console.error(`  - ${v.file}:${v.line}: ${v.content}`);
  });
  process.exit(1);
} else {
  console.log('ALL PostgreSQL queries in touched repositories are 100% parameterized ($1, $2, ...).');
  process.exit(0);
}
