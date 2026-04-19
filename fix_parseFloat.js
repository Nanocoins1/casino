const fs = require('fs');
let lines = fs.readFileSync('server.js', 'utf8').split('\n');
// Fix line 2361 (index 2360)
const old = lines[2360];
console.log('Old:', old.trim().substring(0,120));
lines[2360] = lines[2360].replace('parseFloat(amountEur])', 'parseFloat(amountEur)');
console.log('New:', lines[2360].trim().substring(0,120));
fs.writeFileSync('server.js', lines.join('\n'));
