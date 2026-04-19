const fs = require('fs');
let lines = fs.readFileSync('server.js', 'utf8').split('\n');
// Fix line 1443 (index 1442)
lines[1442] = "    await dbRun(`INSERT INTO auth(uid,email,password_hash,salt) VALUES($1,$2,$3,$4)`, [uid, email.toLowerCase(), hash, salt]);\r";
fs.writeFileSync('server.js', lines.join('\n'));
console.log('Fixed line 1443');
