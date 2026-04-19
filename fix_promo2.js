const fs = require('fs');
let lines = fs.readFileSync('server.js', 'utf8').split('\n');
lines[1336] = "    await dbRun(`INSERT INTO promo_codes(code,amount,max_uses) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, [code.toUpperCase(), amount, maxUses||1]);\r";
fs.writeFileSync('server.js', lines.join('\n'));
console.log('done');
