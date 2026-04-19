const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');
let fixes = 0;

// Find multiline db function calls where the last line ends with [expr];
// but is missing ) before ;
// These span multiple lines so we need to process the whole content

// Strategy: find all occurrences of `await db\w+(\n...lines...\n[...];`
// and check if parens are balanced

// Simple approach: find lines ending with `[word]; ` or `[word.prop];`
// where the function call started on a previous line (no `(` on this line)
// These need `[word])`

// Specifically look for lines matching: ends with `\];` but has no `(`
// and is preceded by a line that has an unclosed `(`
const lines = content.split('\n');
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  const trimmed = line.trimEnd();

  // Lines ending in `];` with no `(` on the line itself
  if (trimmed.endsWith('];') && !trimmed.includes('(') && i > 0) {
    // Check if this is continuing a db call from a previous line
    // Look backwards for an unclosed (
    let depth = 0;
    for (let j = i; j >= Math.max(0, i-10); j--) {
      const prevLine = lines[j];
      // Count parens in this line (simple, no template string awareness)
      for (let k = prevLine.length-1; k >= 0; k--) {
        if (prevLine[k] === ')') depth++;
        else if (prevLine[k] === '(') {
          depth--;
          if (depth < 0) {
            // Found unclosed ( somewhere above
            // Fix current line: [expr]; → [expr]);
            lines[i] = trimmed.slice(0, -1) + ');';
            fixes++;
            break;
          }
        }
      }
      if (depth < 0) break;
    }
  }
  i++;
}

content = lines.join('\n');
fs.writeFileSync('server.js', content);
console.log(`Fixed ${fixes} multiline missing-paren issues`);
