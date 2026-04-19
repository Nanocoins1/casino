const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');
let fixes = 0;

// Fix patterns where the array closing ] was removed by fix_brackets.js
// Remaining patterns: [expr) where expr is a property access, number, string, etc.
// These were: [expr) → should be [expr])
// After fix_brackets.js: [word] (paren removed) → but many still remain as [word.prop)

// Pattern: [anything_without_brackets)  where ) is the function call closer
// This handles: [aff.uid), [uid), [token), etc.
content = content.replace(/\[([^\[\]()]+)\)/g, (match, inner) => {
  // inner is the content between [ and )
  // This should become [inner])
  fixes++;
  return '[' + inner + '])';
});

// But now we may have introduced [x]) when the original was already correct ([x])
// or we may have ]), that's already there...
// Actually [x]) is the correct form, so if we see [x]]) we've doubled up
content = content.replace(/\]\]\)/g, '])');
// And [x]]; → [x]);
content = content.replace(/\]\];/g, ']);');

fs.writeFileSync('server.js', content);
console.log(`Applied ${fixes} bracket fixes`);
