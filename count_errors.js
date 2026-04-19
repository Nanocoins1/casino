const { execSync } = require('child_process');
let count = 0;
let errors = [];
// We can't get all errors at once with node --check, so let's scan the file
// for common broken patterns instead

const fs = require('fs');
const lines = fs.readFileSync('server.js', 'utf8').split('\n');

lines.forEach((line, i) => {
  const ln = i + 1;
  const t = line.trim();

  // Missing ) after if condition: if(!x y → if(!x) y
  if (/^if\(![^\)]+\s+[a-zA-Z]/.test(t) && !t.includes(')')) {
    errors.push({ln, type:'if-missing-paren', line: t});
  }

  // Function param with ]: function foo(x]){
  if (/function\s+\w+\([^)]*\]/.test(t)) {
    errors.push({ln, type:'param-bracket', line: t});
  }

  // [); patterns (already should be fixed)
  if (t.includes('[);')) errors.push({ln, type:'empty-array-semi', line: t});
});

errors.forEach(e => console.log(`Line ${e.ln} [${e.type}]: ${e.line.substring(0,80)}`));
console.log(`\nTotal suspicious lines: ${errors.length}`);
