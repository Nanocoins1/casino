const fs = require('fs');
let lines = fs.readFileSync('server.js', 'utf8').split('\n');
const orig = lines.length;

let result = [];
let i = 0;
let inRemove = false;

while (i < lines.length) {
  const s = lines[i].trim();
  const raw = lines[i];

  // Detect top-level await pool.query blocks (not inside any function — starts at column 0)
  const startsAtCol0 = raw.length > 0 && raw[0] !== ' ' && raw[0] !== '\t';

  if (!inRemove && startsAtCol0 && raw.startsWith('await pool.query(')) {
    const ahead = lines.slice(i, i+8).join('\n');
    if (ahead.includes('CREATE TABLE') || ahead.includes('ALTER TABLE')) {
      inRemove = true;
      i++;
      continue;
    }
  }

  if (inRemove) {
    // End of block
    const trimmed = lines[i].trim();
    const isEnd = trimmed === '`);' || trimmed.startsWith('`); } catch') || trimmed === '`); }';
    if (isEnd) {
      inRemove = false;
    }
    i++;
    continue;
  }

  result.push(lines[i]);
  i++;
}

fs.writeFileSync('server.js', result.join('\n'));
console.log('Done. Lines: ' + orig + ' -> ' + result.length + ', removed: ' + (orig - result.length));
