const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');
c = c.replace(
  "await dbRun(`INSERT INTO promo_codes(code,amount,max_uses) VALUES($1,$2,$3)`, [code.toUpperCase()]), amount, maxUses||1);",
  "await dbRun(`INSERT INTO promo_codes(code,amount,max_uses) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, [code.toUpperCase(), amount, maxUses||1]);"
);
fs.writeFileSync('server.js', c);
console.log('done');
