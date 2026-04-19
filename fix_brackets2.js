const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');
let fixed = content;
let totalFixes = 0;

// The problem: migration created patterns like:
//   dbGet(sql, [word]   -- missing ) at end (after fix_brackets.js wrongly removed it)
// These came from: dbGet(sql, [word) -- where ) was the function call closer
// Should be: dbGet(sql, [word])

// Fix: [anything]  followed by ; or newline where it's clearly a function call arg
// Pattern: function call `dbGet/dbAll/dbRun/pool.query(` ... [params] missing )
//
// More specifically: fix `[word]` at end of a dbGet/dbAll/dbRun call (missing closing paren)
// We look for lines ending with ], but that should end with ]);

// Pattern: something like `await dbGet(..., [x]` or `await dbRun(..., [x,y]` missing );

// Strategy: for each line, if it ends with single-item [word] and there's an unclosed (
// This is hard to do with regex. Let's just find specific patterns.

// Lines that end with ] but are missing the closing ) of a function call
// These look like: await dbGet(`...`, [expr]
// and should be:   await dbGet(`...`, [expr])

// Fix: lines ending in `], ` + something then end of line -- array was split
// Actually let's look for: dbGet/dbAll/dbRun(sql, [params] without closing )

// The simplest fix: find `], variableName` patterns that came from `], uid)` etc
// These are: dbRun(sql, [x], y, z) which should be dbRun(sql, [x, y, z])
// But that's a different issue.

// For now, fix the most common pattern:
// Pattern: `(`.....`, [word]` at end of statement (missing `)`)
// These show up as: await dbGet(`SELECT...`, [roundId]
// Should be: await dbGet(`SELECT...`, [roundId])

// Find lines where we have a db call with array param missing the closing )
const lines = fixed.split('\n');
const result = lines.map((line, i) => {
  // Count parens in the line
  let open = 0, close = 0;
  let inStr = false, strChar = '';
  let inTemplate = false;
  let templateDepth = 0;

  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    if (inTemplate) {
      if (c === '`') inTemplate = false;
    } else if (inStr) {
      if (c === strChar && line[j-1] !== '\\') inStr = false;
    } else if (c === '`') {
      inTemplate = true;
    } else if (c === '"' || c === "'") {
      inStr = true; strChar = c;
    } else if (c === '(') {
      open++;
    } else if (c === ')') {
      close++;
    }
  }

  // If line has more opens than closes and ends with ]
  // and contains an await db call — it's missing a closing )
  const trimmed = line.trimEnd();
  if (open > close && trimmed.endsWith(']') &&
      (line.includes('await db') || line.includes('await pool.query'))) {
    const diff = open - close;
    totalFixes++;
    return trimmed + ')'.repeat(diff) + ';';
  }

  // If line has more closes than opens and ends with ; (over-closed)
  // This would be the reverse problem - skip for now

  return line;
});

fixed = result.join('\n');
fs.writeFileSync('server.js', fixed);
console.log(`Fixed ${totalFixes} missing-paren issues`);
