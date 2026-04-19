const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');
// Fix: ])); → ]); in db calls (the extra ) was added by mistake)
// Only fix when it's a dbGet/dbAll/dbRun call
c = c.replace(/(await db(?:Get|All|Run)\([^)]*\]\)\);)/g, (match) => {
  return match.replace(/\]\)\);$/, ']);');
});
// Also fix inline (non-await) versions
c = c.replace(/\]\)\);/g, ']);');
fs.writeFileSync('server.js', c);
console.log('done');
