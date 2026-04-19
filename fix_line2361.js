const fs = require('fs');
let lines = fs.readFileSync('server.js', 'utf8').split('\n');
// Fix: missing ] before )
lines[2360] = "      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [txId, uid, 'deposit', 'EUR', parseFloat(amountEur)||0, parseInt(tokens), 'finished', txId, 'card_demo']);\r";
fs.writeFileSync('server.js', lines.join('\n'));
console.log('Fixed');
