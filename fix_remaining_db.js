const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// ── Remove all db.exec() schema creation blocks ───────────────────────────
// These are all covered by initDB()

// Remove: try { db.exec(`...`); } catch(e){ ... }
code = code.replace(/try \{ db\.exec\(`[\s\S]*?`\);\s*\} catch\(e\)\{[^\}]*\}\n?/g, '');

// Remove: db.exec(`...`);  (standalone)
code = code.replace(/db\.exec\(`[\s\S]*?`\);\n?/g, '');

// Remove: try { db.exec('...'); } catch(e){}
code = code.replace(/try \{ db\.exec\('[^']*'\);\s*\} catch\(e\)\{\}\n?/g, '');

// Remove ALTER TABLE (already in initDB with IF NOT EXISTS)
code = code.replace(/try \{ db\.exec\('ALTER TABLE[^']*'\);\s*\} catch\(e\)\{\}\n?/g, '');

// ── Convert remaining db.prepare().run() calls ────────────────────────────
function convertSQL(sql) {
  let n = 0;
  sql = sql.replace(/\?/g, () => `$${++n}`);
  sql = sql.replace(/datetime\('now'\)/g, 'NOW()');
  sql = sql.replace(/datetime\("now"\)/g, 'NOW()');
  return sql;
}

// Single-line db.prepare('SQL').run(args)
code = code.replace(
  /db\.prepare\(('([^']*)'|"([^"]*)")\)\.(get|all|run)\(([^)]*)\)/g,
  (match, sqlQ, sq1, sq2, method, args) => {
    const sql = convertSQL(sq1 || sq2 || '');
    const fn = method === 'get' ? 'dbGet' : method === 'all' ? 'dbAll' : 'dbRun';
    return `await ${fn}(\`${sql}\`, [${args.trim()}])`;
  }
);

// Multi-line db.prepare(`SQL`).run(args)
code = code.replace(
  /db\.prepare\(`([\s\S]*?)`\)\.(get|all|run)\(([^)]*)\)/g,
  (match, sql, method, args) => {
    const pgSQL = convertSQL(sql);
    const fn = method === 'get' ? 'dbGet' : method === 'all' ? 'dbAll' : 'dbRun';
    return `await ${fn}(\`${pgSQL}\`, [${args.trim()}])`;
  }
);

// ── Fix promo code inline schema removes ──────────────────────────────────
// Already removed by db.exec regex above, but remove any pool.query schema in routes too
code = code.replace(/\s*await pool\.query\(`CREATE TABLE IF NOT EXISTS promo_\w+[\s\S]*?`\);\n?/g, '\n');

// ── Fix the promo code array params ──────────────────────────────────────
// Pattern: [code.toUpperCase()], amount, maxUses||1  → [code.toUpperCase(), amount, maxUses||1]
code = code.replace(
  /\[code\.toUpperCase\(\)\],\s*amount,\s*maxUses\|\|1/g,
  '[code.toUpperCase(), amount, maxUses||1]'
);

// ── Fix dynamic SQL admin/bets and admin/sports-bets ─────────────────────
// Pattern: db.prepare(sql).all(...params)  → await dbAll(sql_pg, params)
// These build SQL with ? and spread params

// Find the admin bets route with dynamic SQL
code = code.replace(
  /let sql = `SELECT g\.\*.*?params\.push\(parseInt\(limit\)\);\n\s*const rows = db\.prepare\(sql\)\.all\(\.\.\.params\);/s,
  (match) => {
    // Replace ? with $N dynamically at runtime - we need to use a runtime converter
    let fixed = match;
    // Replace the SQL building to use $N
    fixed = fixed.replace(
      /if \(game\) \{ sql \+= ' AND g\.game=\?'; params\.push\(game\); \}/,
      'if (game) { sql += ` AND g.game=$${params.length+1}`; params.push(game); }'
    );
    fixed = fixed.replace(
      /if \(won !== undefined && won !== ''\) \{ sql \+= ' AND g\.won=\?'; params\.push\(parseInt\(won\)\); \}/,
      "if (won !== undefined && won !== '') { sql += ` AND g.won=$${params.length+1}`; params.push(parseInt(won)); }"
    );
    fixed = fixed.replace(
      /sql \+= ' ORDER BY g\.ts DESC LIMIT \?';\s*params\.push\(parseInt\(limit\)\);/,
      "sql += ` ORDER BY g.ts DESC LIMIT $${params.length+1}`;\n    params.push(parseInt(limit));"
    );
    fixed = fixed.replace(
      'const rows = db.prepare(sql).all(...params);',
      'const rows = await dbAll(sql, params);'
    );
    return fixed;
  }
);

// Sports bets dynamic SQL
code = code.replace(
  /if \(status\) \{ sql \+= ' AND sb\.status=\?'; params\.push\(status\); \}\s*sql \+= ' ORDER BY sb\.created_at DESC LIMIT 500';\s*const bets = db\.prepare\(sql\)\.all\(\.\.\.params\);/,
  (match) => {
    return `if (status) { sql += \` AND sb.status=\$\${params.length+1}\`; params.push(status); }
    sql += ' ORDER BY sb.created_at DESC LIMIT 500';
    const bets = await dbAll(sql, params);`;
  }
);

// ── Fix gambling_limits INSERT with wrong positional params ───────────────
// The original migration added $4,$5,$6 which is wrong for new inserts
code = code.replace(
  /db\.prepare\(`INSERT INTO gambling_limits\(uid,self_excluded,excluded_until\) VALUES\(\$4,1,\$5\)[\s\S]*?`\)\s*$/m,
  ''
);
// Find and replace the actual lines
code = code.replace(
  /db\.prepare\(`INSERT INTO gambling_limits\(uid,self_excluded,excluded_until\) VALUES[\s\S]*?`\)\s*\n\s*\.run\([^)]+\);/g,
  (match) => {
    // Extract the .run() args
    const runMatch = match.match(/\.run\(([^)]+)\)/);
    const args = runMatch ? runMatch[1] : '';
    const argList = args.split(',').map(a => a.trim());
    return `await dbRun(\`INSERT INTO gambling_limits(uid,self_excluded,excluded_until) VALUES($1,1,$2) ON CONFLICT(uid) DO UPDATE SET self_excluded=1,excluded_until=EXCLUDED.excluded_until,updated_at=NOW()\`, [${argList[0]}, ${argList[1]}]);`;
  }
);

// ── Fix gambling_limits daily/weekly INSERT ───────────────────────────────
code = code.replace(
  /db\.prepare\(`INSERT INTO gambling_limits\(uid,daily_limit,weekly_limit\)[\s\S]*?`\)\s*\n\s*\.run\([^)]+\);/g,
  (match) => {
    const runMatch = match.match(/\.run\(([^)]+)\)/);
    const args = runMatch ? runMatch[1] : '';
    const argList = args.split(',').map(a => a.trim());
    return `await dbRun(\`INSERT INTO gambling_limits(uid,daily_limit,weekly_limit) VALUES($1,$2,$3) ON CONFLICT(uid) DO UPDATE SET daily_limit=EXCLUDED.daily_limit,weekly_limit=EXCLUDED.weekly_limit,updated_at=NOW()\`, [${argList.join(', ')}]);`;
  }
);

// ── Fix tournaments INSERT ────────────────────────────────────────────────
code = code.replace(
  /db\.prepare\("INSERT INTO tournaments[\s\S]*?"\)\s*\n\s*\.run\([^)]+\);/g,
  (match) => {
    const runMatch = match.match(/\.run\(([^)]+)\)/);
    const args = runMatch ? runMatch[1] : '';
    const argList = args.split(',').map(a => a.trim());
    return `await dbRun(\`INSERT INTO tournaments(id,name,game,prize_pool,starts_at,ends_at,status) VALUES($1,$2,$3,$4,$5,$6,'active')\`, [${argList.join(', ')}]);`;
  }
);

// ── Fix analytics daily GGR query ────────────────────────────────────────
code = code.replace(
  /const dailyGGR = db\.prepare\(`[\s\S]*?`\)\.all\([^)]*\);/g,
  (match) => {
    const sqlMatch = match.match(/db\.prepare\(`([\s\S]*?)`\)\.all\(([^)]*)\)/);
    if (!sqlMatch) return match;
    let sql = convertSQL(sqlMatch[1]);
    const args = sqlMatch[2].trim();
    return `const dailyGGR = await dbAll(\`${sql}\`, [${args}]);`;
  }
);

// ── Fix action on PokerRoom socket ────────────────────────────────────────
code = code.replace(
  "const r=room.action(",
  "const r=await room.action("
);

// ── Fix forEach with await → for...of ─────────────────────────────────────
// Find .forEach callbacks that use await
code = code.replace(
  /(\w+)\.forEach\((\w+)\s*=>\s*\{[^}]*await[^}]*\}\)/g,
  (match, arr, item) => {
    const body = match.match(/\{([^}]*)\}/)?.[1] || '';
    return `for (const ${item} of ${arr}) {\n${body}\n}`;
  }
);

// Fix promo code split array: [code.toUpperCase()], amount  → [code.toUpperCase(), amount]
// Already done above

// ── Fix INSERT OR IGNORE remnants ─────────────────────────────────────────
code = code.replace(/INSERT OR IGNORE INTO/g, 'INSERT INTO');
code = code.replace(/INSERT OR REPLACE INTO/g, 'INSERT INTO');

fs.writeFileSync('server.js', code);

const remaining = (code.match(/\bdb\.(prepare|exec|transaction)\b/g) || []).length;
console.log(`Done. Remaining db. references: ${remaining}`);
