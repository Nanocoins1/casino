const fs = require('fs');
let lines = fs.readFileSync('server.js', 'utf8').split('\n');
// Fix line 1364 (index 1363)
lines[1363] = "    const alreadyUsed = await dbGet(`SELECT 1 FROM promo_uses WHERE code=$1 AND uid=$2`, [code.toUpperCase(), uid]);\r";
// Also fix line 1367 if it has a similar issue
// Check what's on line 1367
console.log('Line 1367:', lines[1366]);
fs.writeFileSync('server.js', lines.join('\n'));
console.log('Fixed');
