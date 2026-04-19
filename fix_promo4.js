const fs = require('fs');
let lines = fs.readFileSync('server.js', 'utf8').split('\n');
lines[1366] = "    await dbRun(`INSERT INTO promo_uses(code,uid) VALUES($1,$2)`, [code.toUpperCase(), uid]);\r";
fs.writeFileSync('server.js', lines.join('\n'));
console.log('Fixed');
