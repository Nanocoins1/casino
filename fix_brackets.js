/**
 * Fix bracket/paren mismatches introduced by bad migration:
 * [someExpr)  -> [someExpr]
 * [someExpr]  -> OK
 * etc.
 */
const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');
let fixed = content;
let totalFixes = 0;

// Fix: [expr) where expr doesn't contain [ - should be [expr]
// Pattern: opening [ then content without [ then ) at end
fixed = fixed.replace(/\[([^\[\]]*)\)/g, (match, inner) => {
  // Only fix if this looks like an array literal (not part of something else)
  // If inner contains a comma or a function call, it's probably a params array
  totalFixes++;
  return `[${inner}]`;
});

// But we may have over-fixed - now check for ]) that were already correct
// Actually the above is too aggressive. Let me undo and be more specific.

// Revert and do targeted fixes
fixed = content;
totalFixes = 0;

// Pattern 1: params array with missing ] like [key) or [roundId) or [uid)
// These are simple single-item arrays: [word) -> [word]
fixed = fixed.replace(/\[(\w+)\)/g, (match, word) => {
  totalFixes++;
  return `[${word}]`;
});

// Pattern 2: [func(args) - missing closing ] after function call that ends with )
// Like [key.toLowerCase()) -> [key.toLowerCase()]
// Already handled above by the word pattern... but for chained calls:
fixed = fixed.replace(/\[([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*\(\))\)/g, (match, expr) => {
  totalFixes++;
  return `[${expr}]`;
});

// Pattern 3: parseInt(x) with missing ] -> already fixed above if standalone

fs.writeFileSync('server.js', fixed);
console.log(`Fixed ${totalFixes} bracket issues`);
