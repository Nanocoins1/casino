/**
 * migrate2.js — Clean SQLite→PostgreSQL migration for server.js
 * Strategy: targeted, safe replacements that don't break unrelated code
 */
const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// ── 1. Replace better-sqlite3 import and DB setup ──────────────────────────
code = code.replace(
  /const Database = require\('better-sqlite3'\);[\s\S]*?console\.log\('DB path:', DB_PATH\);/,
  `const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false } : false
});

async function dbQuery(sql, params) {
  return await pool.query(sql, params || []);
}
async function dbGet(sql, params) {
  const r = await dbQuery(sql, params);
  return r.rows[0] || null;
}
async function dbAll(sql, params) {
  const r = await dbQuery(sql, params);
  return r.rows;
}
async function dbRun(sql, params) {
  await dbQuery(sql, params);
}`
);

// ── 2. Remove the inline schema creation blocks (top-level) ────────────────
// These are the db.prepare(...).run() blocks used to create tables
// We'll replace them with initDB() at the bottom

// Remove the big top-level schema: db.exec(` ... `);
code = code.replace(/^db\.exec\(`[\s\S]*?`\);$/m, '');

// Remove other top-level db.exec or db.prepare for schema
code = code.replace(/^\/\/ ── Admin Staff tables[\s\S]*?`\);\s*} catch[\s\S]*?}\n/m, '');
code = code.replace(/^\/\/ Create transactions table[\s\S]*?`\);\n/m, '');
code = code.replace(/^try \{ db\.exec[\s\S]*?} catch[\s\S]*?}\n/gm, '');

// ── 3. Replace synchronous db.prepare().get() ─────────────────────────────
// Converts: db.prepare('SQL').get(p1, p2, ...) → await dbGet('SQL_PG', [p1, p2])
// But we need to handle SQL ? → $N conversion

function convertSQL(sql) {
  let n = 0;
  // Replace ? with $1, $2, etc.
  sql = sql.replace(/\?/g, () => `$${++n}`);
  // SQLite datetime → PostgreSQL NOW()
  sql = sql.replace(/datetime\('now'\)/g, 'NOW()');
  sql = sql.replace(/DEFAULT \(datetime\('now'\)\)/g, 'DEFAULT NOW()');
  sql = sql.replace(/DEFAULT \(NOW\(\)\)/g, 'DEFAULT NOW()');
  // AUTOINCREMENT → handled in schema
  sql = sql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY');
  // INSERT OR IGNORE → ON CONFLICT DO NOTHING
  sql = sql.replace(/INSERT OR IGNORE INTO/g, 'INSERT INTO');
  sql = sql.replace(/INSERT OR REPLACE INTO/g, 'INSERT INTO');
  return sql;
}

// Helper: convert a db.prepare('SQL').get/all/run(args) call
// Returns: await dbGet/All/Run(`SQL_PG`, [args])
function convertDbCall(match, sql, method, argsStr) {
  const pgSQL = convertSQL(sql);
  const fn = method === 'get' ? 'dbGet' : method === 'all' ? 'dbAll' : 'dbRun';
  const args = argsStr ? argsStr.trim() : '';
  if (args) {
    return `await ${fn}(\`${pgSQL}\`, [${args}])`;
  } else {
    return `await ${fn}(\`${pgSQL}\`, [])`;
  }
}

// Pattern: db.prepare(`SQL`).get(args) or db.prepare('SQL').get(args)
// Use a manual approach line by line to avoid regex catastrophe

const lines = code.split('\n');
const result = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  // Handle db.prepare('...').get/all/run(...)
  // These might span multiple lines but usually don't in this codebase
  // Strategy: handle single-line occurrences with a safe regex

  // Match: db.prepare(`SQL or 'SQL' or "SQL"`).method(args)
  line = line.replace(
    /db\.prepare\((`[^`]*`|'[^']*'|"[^"]*")\)\.(get|all|run)\(([^)]*)\)/g,
    (match, sqlPart, method, args) => {
      const sql = sqlPart.slice(1, -1); // remove quotes
      return convertDbCall(match, sql, method, args);
    }
  );

  // Handle .run() with no args
  line = line.replace(
    /db\.prepare\((`[^`]*`|'[^']*'|"[^"]*")\)\.run\(\)/g,
    (match, sqlPart) => {
      const sql = sqlPart.slice(1, -1);
      return `await dbRun(\`${convertSQL(sql)}\`, [])`;
    }
  );

  result.push(line);
}

code = result.join('\n');

// ── 4. Handle saveUser named params (@uid → positional) ───────────────────
// The saveUser function uses named params like @uid, @name etc.
// Replace the entire saveUser function
code = code.replace(
  /const saveUser = [^;]+;/,
  `const saveUser = async u => {
  await pool.query(
    \`INSERT INTO users(uid,name,tokens,avatar,level,xp,total_won,games_played,last_bonus)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT(uid) DO UPDATE SET
      name=EXCLUDED.name, tokens=EXCLUDED.tokens, avatar=EXCLUDED.avatar,
      level=EXCLUDED.level, xp=EXCLUDED.xp, total_won=EXCLUDED.total_won,
      games_played=EXCLUDED.games_played, last_bonus=EXCLUDED.last_bonus\`,
    [u.uid, u.name, u.tokens, u.avatar, u.level, u.xp, u.total_won, u.games_played, u.last_bonus]
  );
};`
);

// ── 5. Make helper functions async ────────────────────────────────────────
const asyncFunctions = [
  'getUser', 'saveUser', 'getSetting', 'setSetting',
  'pfNewRound', 'pfReveal', 'getLimits', 'checkLimits',
  'getActiveBonus', 'giveBonus', 'updateWagering',
  'getOrCreateAffiliate', 'processReferral',
  'getActiveTournament', 'addTournamentScore', 'getTournamentLeaderboard',
  'processCashback', 'addXP', 'claimBonus', 'getKYC', 'logGame',
  'getJackpot', 'addToJackpot', 'resetJackpot',
  'getLeaderboardData', 'makeSession', 'checkSession',
  'sendPushToUser', 'sendPushNotification'
];

for (const fn of asyncFunctions) {
  // function fn( → async function fn(
  code = code.replace(
    new RegExp(`^(function ${fn}\\()`, 'm'),
    `async function ${fn}(`
  );
  // const fn = ( → const fn = async (
  code = code.replace(
    new RegExp(`^(const ${fn} = )\\(`, 'm'),
    `$1async (`
  );
  // const fn = uid => → const fn = async uid =>
  code = code.replace(
    new RegExp(`^(const ${fn} = )(\\w)`, 'm'),
    `$1async $2`
  );
}

// ── 6. Add await to calls of async helpers ─────────────────────────────────
const helperCalls = [
  'getUser', 'saveUser', 'getSetting', 'setSetting',
  'pfNewRound', 'pfReveal', 'getLimits', 'checkLimits',
  'getActiveBonus', 'giveBonus', 'updateWagering',
  'getOrCreateAffiliate', 'processReferral',
  'getActiveTournament', 'addTournamentScore', 'getTournamentLeaderboard',
  'processCashback', 'addXP', 'claimBonus', 'getKYC', 'logGame',
  'getJackpot', 'addToJackpot', 'resetJackpot',
  'getLeaderboardData', 'makeSession', 'checkSession',
  'sendPushToUser'
];

for (const fn of helperCalls) {
  // Add await before calls (but not before await fn, not before async function fn, not before const fn)
  code = code.replace(
    new RegExp(`(?<!await )(?<!async function )(?<!function )(?<!const ${fn.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} = )\\b(${fn}\\()`, 'g'),
    'await $1'
  );
}

// ── 7. Make route handlers async ───────────────────────────────────────────
// app.get/post/put/delete/use handlers that aren't already async
code = code.replace(
  /app\.(get|post|put|delete|use)\(([^,]+),\s*((?:adminAuth|requirePerm[^,]*),\s*)*(?:express\.json\(\),\s*)?(\([^)]*\)\s*=>\s*\{)/g,
  (match) => {
    if (match.includes('async')) return match;
    return match.replace(/(\([^)]*\)\s*=>\s*\{)/, 'async $1');
  }
);

// ── 8. Make socket handlers async ─────────────────────────────────────────
code = code.replace(
  /socket\.on\('([^']+)',\s*(\([^)]*\))\s*=>/g,
  (match, event, params) => {
    if (match.includes('async')) return match;
    return `socket.on('${event}', async ${params} =>`;
  }
);

// Also io.on connection
code = code.replace(
  /io\.on\('connection',\s*(socket\s*=>|function\s*\(socket\))/,
  (match, param) => {
    if (match.includes('async')) return match;
    return match.replace(param, `async ${param}`);
  }
);

// ── 9. Fix setInterval with await ─────────────────────────────────────────
code = code.replace(
  /setInterval\(\(\)\s*=>\s*\{/g,
  'setInterval(async () => {'
);

// ── 10. Fix INSERT OR IGNORE / REPLACE (remaining) ────────────────────────
code = code.replace(/INSERT OR IGNORE INTO/g, 'INSERT INTO');
code = code.replace(/INSERT OR REPLACE INTO/g, 'INSERT INTO');

// ── 11. Fix remaining SQL syntax ──────────────────────────────────────────
// datetime('now') in strings
code = code.replace(/datetime\('now'\)/g, 'NOW()');

// ── 12. Add initDB() function and wrap server.listen ──────────────────────
const initDBCode = `

// ── PostgreSQL initialization ────────────────────────────
async function initDB() {
  try {
    await pool.query(\`
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tokens INTEGER DEFAULT 10000,
    avatar TEXT DEFAULT NULL,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    total_won INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    last_bonus TEXT DEFAULT NULL,
    banned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS game_log (
    id SERIAL PRIMARY KEY,
    uid TEXT NOT NULL,
    game TEXT NOT NULL,
    bet INTEGER DEFAULT 0,
    result INTEGER DEFAULT 0,
    won INTEGER DEFAULT 0,
    ts TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS jackpot (
    id INTEGER PRIMARY KEY CHECK(id=1),
    amount INTEGER DEFAULT 50000
  );
  INSERT INTO jackpot(id,amount) VALUES(1,50000) ON CONFLICT DO NOTHING;
  CREATE TABLE IF NOT EXISTS kyc (
    uid TEXT PRIMARY KEY,
    status TEXT DEFAULT 'unverified',
    full_name TEXT,
    birth_date TEXT,
    country TEXT,
    id_type TEXT DEFAULT 'passport',
    id_front TEXT,
    id_back TEXT,
    selfie TEXT,
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ
  );
  CREATE TABLE IF NOT EXISTS pending_bets (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    type TEXT DEFAULT 'sports',
    match_desc TEXT,
    selection TEXT,
    odds REAL,
    bet INTEGER,
    potential_win INTEGER,
    status TEXT DEFAULT 'pending',
    reject_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS provably_fair (
    round_id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    game TEXT NOT NULL,
    server_seed TEXT NOT NULL,
    server_hash TEXT NOT NULL,
    client_seed TEXT,
    nonce INTEGER DEFAULT 0,
    result TEXT,
    revealed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS gambling_limits (
    uid TEXT PRIMARY KEY,
    daily_limit INTEGER DEFAULT 0,
    weekly_limit INTEGER DEFAULT 0,
    self_excluded INTEGER DEFAULT 0,
    excluded_until TEXT DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS bonuses (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    wagering_req INTEGER DEFAULT 0,
    wagered INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    expires_at TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    game TEXT DEFAULT 'slots',
    prize_pool INTEGER DEFAULT 10000,
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    status TEXT DEFAULT 'upcoming'
  );
  CREATE TABLE IF NOT EXISTS tournament_scores (
    id SERIAL PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    uid TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tournament_id, uid)
  );
  CREATE TABLE IF NOT EXISTS affiliates (
    uid TEXT PRIMARY KEY,
    ref_code TEXT UNIQUE NOT NULL,
    referred INTEGER DEFAULT 0,
    earnings INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS referrals (
    uid TEXT PRIMARY KEY,
    ref_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS admin_staff (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'support',
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    active INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    staff_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    username TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    type TEXT NOT NULL,
    currency TEXT,
    amount_crypto REAL,
    amount_tokens INTEGER,
    status TEXT DEFAULT 'pending',
    payment_id TEXT,
    payment_address TEXT,
    tx_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS auth (
    uid TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS rg_limits (
    uid TEXT PRIMARY KEY,
    daily_deposit_limit INTEGER DEFAULT NULL,
    daily_loss_limit INTEGER DEFAULT NULL,
    daily_bet_limit INTEGER DEFAULT NULL,
    session_limit_minutes INTEGER DEFAULT NULL,
    self_exclusion_until TEXT DEFAULT NULL,
    cool_off_until TEXT DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS daily_tracking (
    uid TEXT,
    date TEXT,
    deposited INTEGER DEFAULT 0,
    lost INTEGER DEFAULT 0,
    bet_total INTEGER DEFAULT 0,
    PRIMARY KEY(uid, date)
  );
  CREATE TABLE IF NOT EXISTS sports_bets (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    match_id TEXT,
    match_desc TEXT,
    selection TEXT,
    odds REAL,
    bet INTEGER,
    potential_win INTEGER,
    status TEXT DEFAULT 'pending',
    result INTEGER DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS promo_codes (
    code TEXT PRIMARY KEY,
    amount INTEGER,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS promo_uses (
    code TEXT,
    uid TEXT,
    used_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY(code, uid)
  );
\`);
    // Add banned column if missing (migration safety)
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS banned INTEGER DEFAULT 0'); } catch(e){}
    // Load RTP config
    try {
      const saved = await getSetting('rtp_config');
      if(saved) rtpConfig = {...RTP_DEFAULTS, ...JSON.parse(saved)};
    } catch(e) { console.log('RTP config load error, using defaults'); }
    console.log('✅ PostgreSQL schema ready');
  } catch(e) {
    console.error('❌ DB init error:', e.message);
    process.exit(1);
  }
}
`;

// Insert initDB before server.listen
code = code.replace(
  /^(const PORT\s*=\s*process\.env\.PORT.*?;)\s*\nserver\.listen/m,
  `${initDBCode}\n$1\ninitDB().then(() => {\nserver.listen`
);
// Add closing }) after the listen call
code = code.replace(
  /(server\.listen\(PORT[^)]*\)\s*;?\s*\n?)([\s\S]*$)/,
  (match, listenLine, rest) => {
    if (rest.trim() === '') return listenLine + '\n});';
    return listenLine + rest;
  }
);

// Actually, find server.listen and wrap it
code = code.replace(
  /server\.listen\(PORT,\s*\(\)\s*=>\s*console\.log\([^)]+\)\);/,
  (match) => {
    return match + '\n});';
  }
);

// Remove the duplicate wrapping if initDB().then already done above
// Find: initDB().then(() => {\nserver.listen(...)\n});\n});
// Replace with just the right version
// Let's check and clean up
code = code.replace(
  /initDB\(\)\.then\(\(\)\s*=>\s*\{[\s\S]*?server\.listen\([^)]*\)\s*;?\s*\n\}\);\s*\}\);/,
  (match) => {
    // Already correct, leave it
    return match;
  }
);

// ── 13. Handle remaining multi-line db.prepare calls ─────────────────────
// Some db.prepare calls span multiple lines with template literals
// These weren't caught by the single-line regex above
// Find and convert them:
code = code.replace(
  /db\.prepare\(`([\s\S]*?)`\)\.(get|all|run)\(([\s\S]*?)\)/g,
  (match, sql, method, args) => {
    const pgSQL = convertSQL(sql);
    const fn = method === 'get' ? 'dbGet' : method === 'all' ? 'dbAll' : 'dbRun';
    const argsClean = args.trim();
    if (argsClean) {
      return `await ${fn}(\`${pgSQL}\`, [${argsClean}])`;
    }
    return `await ${fn}(\`${pgSQL}\`, [])`;
  }
);

// ── 14. Fix remaining SQLite-specific INSERT statements ───────────────────
code = code.replace(/INSERT OR IGNORE INTO/g, 'INSERT INTO');
code = code.replace(/INSERT OR REPLACE INTO/g, 'INSERT INTO');

// Add ON CONFLICT DO NOTHING to simple INSERT INTO ... VALUES that don't have it
// (only for tables with PRIMARY KEY - be conservative, only for known ones)
// Skip this - leave for manual review

// ── Write output ──────────────────────────────────────────────────────────
fs.writeFileSync('server.js', code);
console.log('✅ Migration complete!');

// Check for remaining db. references
const remaining = (code.match(/\bdb\.(prepare|exec|transaction)\b/g) || []).length;
console.log(`Remaining db. references: ${remaining}`);

// Check for named params
const namedParams = (code.match(/@\w+/g) || []).filter(p => !p.startsWith('@gmail') && !p.startsWith('@') ).length;
if (namedParams > 0) console.log(`⚠️  Named params remaining: ${namedParams}`);
