const fs = require('fs');
let lines = fs.readFileSync('server.js', 'utf8').split('\n');
lines[1350] = "  await dbRun(`DELETE FROM promo_codes WHERE code=$1`, [req.params.code.toUpperCase()]);\r";
fs.writeFileSync('server.js', lines.join('\n'));
console.log('Fixed line 1351:', lines[1350]);
