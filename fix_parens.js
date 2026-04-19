const fs = require('fs');
const lines = fs.readFileSync('server.js', 'utf8').split('\n');
let fixes = 0;

const result = lines.map(line => {
  // Fix lines that end with ]; but are missing ) before ;
  // Pattern: await dbXxx(`...`, [...]) → line ends with ]; but should end with ]);
  // Also: lines that end with ] (no semicolon) with unclosed (

  const trimmed = line.trimEnd();

  // Check if ends with ]; (array then semicolon, missing paren)
  if (trimmed.endsWith('];') && trimmed.includes('await db')) {
    // Count parens to see if there's an unclosed one
    let depth = 0;
    let inBT = false;
    for (let i = 0; i < trimmed.length; i++) {
      const c = trimmed[i];
      if (c === '`') inBT = !inBT;
      if (!inBT) {
        if (c === '(') depth++;
        else if (c === ')') depth--;
      }
    }
    if (depth > 0) {
      fixes++;
      const trailing = line.slice(trimmed.length); // whitespace after
      return trimmed.slice(0, -1) + ')'.repeat(depth) + ';' + trailing;
    }
  }

  // Also fix lines ending with ] (no semicolon) with unclosed paren
  // These are multi-line calls where the array is the last arg on the line
  if (trimmed.endsWith(']') && trimmed.includes('await db') && !trimmed.includes('[') === false) {
    let depth = 0;
    let inBT = false;
    for (let i = 0; i < trimmed.length; i++) {
      const c = trimmed[i];
      if (c === '`') inBT = !inBT;
      if (!inBT) {
        if (c === '(') depth++;
        else if (c === ')') depth--;
      }
    }
    if (depth > 0) {
      fixes++;
      const trailing = line.slice(trimmed.length);
      return trimmed + ')'.repeat(depth) + trailing;
    }
  }

  return line;
});

fs.writeFileSync('server.js', result.join('\n'));
console.log(`Fixed ${fixes} missing paren(s)`);
