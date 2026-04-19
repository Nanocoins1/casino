/**
 * SQLite → PostgreSQL migration script for HATHOR Royal Casino
 *
 * Transformations applied:
 * 1. better-sqlite3 → pg (Pool)
 * 2. Synchronous DB calls → async/await
 * 3. SQL syntax: ?, datetime('now'), AUTOINCREMENT, INSERT OR IGNORE, etc.
 * 4. All helper functions → async
 * 5. All route/socket handlers → async
 * 6. Schema creation wrapped in initDB()
 */

const fs = require('fs');

// ── Read source ───────────────────────────────────────────
let code = fs.readFileSync('./server.js', 'utf8');

// ── Helper: Convert SQLite ? placeholders to $1, $2, ... ──
function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => '$' + (++i));
}

// ── Helper: Fix SQL syntax differences ───────────────────
function fixSql(sql) {
  return sql
    // datetime functions
    .replace(/datetime\('now'\)/g, 'NOW()')
    .replace(/datetime\("now"\)/g, 'NOW()')
    // AUTOINCREMENT
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
    .replace(/INTEGER PRIMARY KEY CHECK\(id=1\)/g, 'INTEGER PRIMARY KEY CHECK(id=1)')
    // Text types for timestamps
    .replace(/TEXT DEFAULT \(datetime\('now'\)\)/g, "TIMESTAMPTZ DEFAULT NOW()")
    .replace(/TEXT DEFAULT \(datetime\("now"\)\)/g, "TIMESTAMPTZ DEFAULT NOW()")
    // INSERT OR IGNORE
    .replace(/INSERT OR IGNORE INTO/g, 'INSERT INTO')
    .replace(/INSERT OR REPLACE INTO/g, 'INSERT INTO')
    // ON CONFLICT with datetime
    .replace(/updated_at=datetime\('now'\)/g, "updated_at=NOW()")
    .replace(/updated_at=datetime\("now"\)/g, "updated_at=NOW()")
    // Fix excluded references (same in PG)
    // Fix COALESCE (same in PG)
    // Fix ON CONFLICT ... DO NOTHING
    .replace(/INSERT INTO (.*?) ON CONFLICT DO NOTHING/g, 'INSERT INTO $1 ON CONFLICT DO NOTHING')
    // Placeholder conversion
    .split('?').reduce((acc, part, i, arr) => {
      if (i === arr.length - 1) return acc + part;
      return acc + part + '$' + (i + 1);
    }, '');
}

// ── 1. REPLACE IMPORTS ────────────────────────────────────
code = code.replace(
  "const Database = require('better-sqlite3');",
  "const { Pool } = require('pg');"
);

// ── 2. REPLACE DB INIT ────────────────────────────────────
code = code.replace(
  /\/\/ ── Database ─+\nconst DB_PATH[\s\S]*?const db = new Database\(DB_PATH\);\nconsole\.log\('DB path:', DB_PATH\);\n/,
  `// ── Database (PostgreSQL) ────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false
});

// Compatibility helpers matching better-sqlite3 API
function dbQuery(sql, params) {
  const pgSql = sql.replace(/datetime\('now'\)/g, 'NOW()')
    .replace(/datetime\("now"\)/g, 'NOW()');
  return pool.query(pgSql, params || []);
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
}
async function dbExec(sql) {
  await pool.query(sql
    .replace(/datetime\('now'\)/g, 'NOW()')
    .replace(/datetime\("now"\)/g, 'NOW()')
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
    .replace(/TEXT DEFAULT \\(datetime\\('now'\\)\\)/g, 'TIMESTAMPTZ DEFAULT NOW()')
    .replace(/INSERT OR IGNORE INTO/g, 'INSERT INTO')
    .replace(/INSERT OR REPLACE INTO/g, 'INSERT INTO')
  );
}

`
);

// ── 3. WRAP SCHEMA CREATION IN initDB() ──────────────────

// Find the big db.exec block at the top and extract it
const schemaMatch = code.match(/(db\.exec\(`[\s\S]*?`\);)\n\nconst ADMIN_PASSWORD/);
if (schemaMatch) {
  const schemaBlock = schemaMatch[1];
  const pgSchema = schemaBlock
    .replace(/db\.exec\(`/g, '')
    .replace(/`\);/g, '')
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
    .replace(/TEXT DEFAULT \(datetime\('now'\)\)/g, 'TIMESTAMPTZ DEFAULT NOW()')
    .replace(/INSERT OR IGNORE INTO jackpot/g, 'INSERT INTO jackpot')
    .replace(/ON CONFLICT DO NOTHING/g, 'ON CONFLICT DO NOTHING');

  code = code.replace(
    schemaMatch[0],
    `// Schema will be initialized in initDB()\n\nconst ADMIN_PASSWORD`
  );

  // Store schema for initDB function
  global.__pgSchema = pgSchema;
}

// ── 4. REPLACE all db.prepare().get(), .all(), .run() ─────

// Pattern: db.prepare('SQL').get(args)
// → await dbGet('SQL', [args])
code = code.replace(
  /db\.prepare\((`[^`]*`|'[^']*'|"[^"]*")\)\.get\(([^)]*)\)/g,
  (match, sql, args) => {
    const cleanSql = sql.slice(1, -1)
      .replace(/datetime\('now'\)/g, "NOW()")
      .replace(/datetime\("now"\)/g, "NOW()");
    const pgSql = convertPlaceholders(cleanSql);
    const argsArr = args.trim() ? `[${args}]` : '[]';
    return `await dbGet(\`${pgSql}\`, ${argsArr})`;
  }
);

// Pattern: db.prepare(`SQL`).get(args) — template literal
code = code.replace(
  /db\.prepare\(`([\s\S]*?)`\)\.get\(([^)]*)\)/g,
  (match, sql, args) => {
    const cleanSql = sql
      .replace(/datetime\('now'\)/g, "NOW()")
      .replace(/datetime\("now"\)/g, "NOW()");
    const pgSql = convertPlaceholders(cleanSql);
    const argsArr = args.trim() ? `[${args}]` : '[]';
    return `await dbGet(\`${pgSql}\`, ${argsArr})`;
  }
);

// Pattern: db.prepare('SQL').all(args)
code = code.replace(
  /db\.prepare\((`[^`]*`|'[^']*'|"[^"]*")\)\.all\(([^)]*)\)/g,
  (match, sql, args) => {
    const cleanSql = sql.slice(1, -1)
      .replace(/datetime\('now'\)/g, "NOW()")
      .replace(/datetime\("now"\)/g, "NOW()");
    const pgSql = convertPlaceholders(cleanSql);
    const argsArr = args.trim() ? `[${args.replace(/^\.\.\./, '')}]` : '[]';
    // Handle spread args
    if (args.trim().startsWith('...')) {
      return `await dbAll(\`${pgSql}\`, ${args.trim().slice(3)})`;
    }
    return `await dbAll(\`${pgSql}\`, ${argsArr})`;
  }
);

// Pattern: db.prepare(`SQL`).all(args) — template literal
code = code.replace(
  /db\.prepare\(`([\s\S]*?)`\)\.all\(([^)]*)\)/g,
  (match, sql, args) => {
    const cleanSql = sql
      .replace(/datetime\('now'\)/g, "NOW()")
      .replace(/datetime\("now"\)/g, "NOW()");
    const pgSql = convertPlaceholders(cleanSql);
    if (args.trim().startsWith('...')) {
      return `await dbAll(\`${pgSql}\`, ${args.trim().slice(3)})`;
    }
    const argsArr = args.trim() ? `[${args}]` : '[]';
    return `await dbAll(\`${pgSql}\`, ${argsArr})`;
  }
);

// Pattern: db.prepare('SQL').run(args) - single line
code = code.replace(
  /db\.prepare\((`[^`]*`|'[^']*'|"[^"]*")\)\.run\(([^)]*)\)/g,
  (match, sql, args) => {
    const cleanSql = sql.slice(1, -1)
      .replace(/datetime\('now'\)/g, "NOW()")
      .replace(/datetime\("now"\)/g, "NOW()");
    const pgSql = convertPlaceholders(cleanSql);
    // Handle named params @name style → object arg
    if (args.trim() === 'u' || args.trim() === 'user' || (args.trim() && !args.includes(',') && !args.includes("'") && !args.includes('"') && !pgSql.includes('$'))) {
      // Object-style named params - handle specially
      return `await dbRun(\`${pgSql}\`, [${args}])`;
    }
    const argsArr = args.trim() ? `[${args}]` : '[]';
    return `await dbRun(\`${pgSql}\`, ${argsArr})`;
  }
);

// Pattern: db.prepare(`SQL`).run(args) — template literal
code = code.replace(
  /db\.prepare\(`([\s\S]*?)`\)\.run\(([^;)]*)\)/g,
  (match, sql, args) => {
    const cleanSql = sql
      .replace(/datetime\('now'\)/g, "NOW()")
      .replace(/datetime\("now"\)/g, "NOW()");
    const pgSql = convertPlaceholders(cleanSql);
    const argsArr = args.trim() ? `[${args}]` : '[]';
    return `await dbRun(\`${pgSql}\`, ${argsArr})`;
  }
);

// Pattern: db.exec(`SQL`)
code = code.replace(
  /db\.exec\(`([\s\S]*?)`\);/g,
  (match, sql) => {
    const cleanSql = sql
      .replace(/datetime\('now'\)/g, "NOW()")
      .replace(/datetime\("now"\)/g, "NOW()")
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
      .replace(/TEXT DEFAULT \(datetime\('now'\)\)/g, 'TIMESTAMPTZ DEFAULT NOW()')
      .replace(/INSERT OR IGNORE INTO/g, 'INSERT INTO');
    return `await pool.query(\`${cleanSql}\`);`;
  }
);

// Pattern: db.exec('SQL')
code = code.replace(
  /db\.exec\('([^']*)'\);/g,
  (match, sql) => {
    return `await pool.query(\`${sql}\`);`;
  }
);

// ── 5. Fix remaining SQL issues ──────────────────────────

// Fix ON CONFLICT ... DO UPDATE SET ... datetime
code = code.replace(/updated_at=datetime\('now'\)/g, "updated_at=NOW()");
code = code.replace(/updated_at=datetime\("now"\)/g, "updated_at=NOW()");
code = code.replace(/submitted_at=datetime\('now'\)/g, "submitted_at=NOW()");
code = code.replace(/reviewed_at=datetime\('now'\)/g, "reviewed_at=NOW()");
code = code.replace(/last_login=datetime\('now'\)/g, "last_login=NOW()");

// Fix remaining datetime() in strings
code = code.replace(/datetime\('now'\)/g, "NOW()");
code = code.replace(/datetime\("now"\)/g, "NOW()");

// Fix ALTER TABLE (migration-safe try/catch blocks)
// These stay as-is since pool.query() is already set

// ── 6. MAKE HELPER FUNCTIONS ASYNC ───────────────────────

// Simple const arrow functions → async
const fnPatterns = [
  'const getUser =',
  'const saveUser =',
  'const getSetting =',
  'const setSetting =',
];
fnPatterns.forEach(pat => {
  code = code.replace(pat + ' ', pat + ' async ');
});

// Regular function declarations
const regFns = [
  'function pfNewRound(',
  'function pfReveal(',
  'function getLimits(',
  'function checkLimits(',
  'function getActiveBonus(',
  'function giveBonus(',
  'function updateWagering(',
  'function getOrCreateAffiliate(',
  'function processReferral(',
  'function getActiveTournament(',
  'function addTournamentScore(',
  'function getTournamentLeaderboard(',
  'function processCashback(',
  'function addXP(',
  'function claimBonus(',
  'function getKYC(',
  'function logGame(',
  'function getJackpot(',
  'function addToJackpot(',
  'function resetJackpot(',
  'function getLeaderboardData(',
  'function makeSession(',
  'function checkSession(',
];
regFns.forEach(fn => {
  code = code.replace(fn, 'async ' + fn);
});

// ── 7. ADD AWAIT TO FUNCTION CALLS ───────────────────────

const callsToAwait = [
  'getUser(',
  'saveUser(',
  'getSetting(',
  'setSetting(',
  'pfNewRound(',
  'pfReveal(',
  'getLimits(',
  'checkLimits(',
  'getActiveBonus(',
  'giveBonus(',
  'updateWagering(',
  'getOrCreateAffiliate(',
  'processReferral(',
  'getActiveTournament(',
  'addTournamentScore(',
  'getTournamentLeaderboard(',
  'processCashback(',
  'addXP(',
  'claimBonus(',
  'getKYC(',
  'logGame(',
  'getJackpot(',
  'addToJackpot(',
  'resetJackpot(',
  'getLeaderboardData(',
  'makeSession(',
  'checkSession(',
];

callsToAwait.forEach(call => {
  // Add await before calls that don't already have it
  // Handles: assignment, return, if condition, standalone
  const fnName = call.slice(0, -1); // remove (
  const re = new RegExp(
    `(?<!await )(?<!async )(?<!function )(?<![a-zA-Z0-9_])${fnName}\\(`,
    'g'
  );
  code = code.replace(re, `await ${call}`);
});

// ── 8. MAKE ROUTE HANDLERS ASYNC ─────────────────────────

// (req,res)=> without async
code = code.replace(/\(req,res\)=>\{/g, 'async (req,res)=>{');
code = code.replace(/\(req,res\) => \{/g, 'async (req,res) => {');
code = code.replace(/\(req, res\) => \{/g, 'async (req, res) => {');
// Already async ones won't be double-prefixed since we check for existing async above

// Middleware
code = code.replace(
  /const adminAuth = \(req, res, next\) => \{/,
  'const adminAuth = async (req, res, next) => {'
);
code = code.replace(
  /const adminAuth = \(req,res,next\) => \{/,
  'const adminAuth = async (req,res,next) => {'
);
code = code.replace(
  /const requirePerm = \(perm\) => \(req, res, next\) => \{/,
  'const requirePerm = (perm) => async (req, res, next) => {'
);

// ── 9. MAKE SOCKET HANDLERS ASYNC ────────────────────────
code = code.replace(/socket\.on\('([^']+)',\(([^)]*)\)=>\{/g, "socket.on('$1', async ($2) => {");
code = code.replace(/socket\.on\('([^']+)', \(([^)]*)\) => \{/g, "socket.on('$1', async ($2) => {");

// ── 10. FIX SAVEUSER named params (@param style) ─────────
// saveUser uses @uid, @name, etc. — convert to positional
code = code.replace(
  /const saveUser = async u => db\.prepare\(`INSERT INTO users\(uid,name,tokens,avatar,level,xp,total_won,games_played,last_bonus\)\s*VALUES\(@uid,@name,@tokens,@avatar,@level,@xp,@total_won,@games_played,@last_bonus\)\s*ON CONFLICT\(uid\) DO UPDATE SET name=excluded\.name,tokens=excluded\.tokens,avatar=excluded\.avatar,\s*level=excluded\.level,xp=excluded\.xp,total_won=excluded\.total_won,\s*games_played=excluded\.games_played,last_bonus=excluded\.last_bonus`\)\.run\(u\);/,
  `const saveUser = async u => {
  await pool.query(\`INSERT INTO users(uid,name,tokens,avatar,level,xp,total_won,games_played,last_bonus)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
  ON CONFLICT(uid) DO UPDATE SET name=excluded.name,tokens=excluded.tokens,avatar=excluded.avatar,
  level=excluded.level,xp=excluded.xp,total_won=excluded.total_won,
  games_played=excluded.games_played,last_bonus=excluded.last_bonus\`,
  [u.uid, u.name, u.tokens, u.avatar, u.level, u.xp, u.total_won, u.games_played, u.last_bonus]);
};`
);

// ── 11. FIX SETINTERVAL (make it use async) ───────────────
code = code.replace(
  "setInterval(() => { try { db.prepare('DELETE FROM admin_sessions WHERE expires_at < datetime(\"now\")').run(); } catch(e){} }, 3600000);",
  "setInterval(async () => { try { await pool.query(\"DELETE FROM admin_sessions WHERE expires_at < NOW()\"); } catch(e){} }, 3600000);"
);

// ── 12. FIX rtpConfig loading (uses getSetting) ───────────
// The getSetting call at top level needs to be in async context
code = code.replace(
  /let rtpConfig = \{\.\.\.RTP_DEFAULTS\};\ntry \{\n  const saved = getSetting\('rtp_config'\);\n  if\(saved\) rtpConfig = \{\.\.\.RTP_DEFAULTS, \.\.\.JSON\.parse\(saved\)\};\n\} catch\(e\) \{ console\.log\('RTP config load error, using defaults'\); \}/,
  `let rtpConfig = {...RTP_DEFAULTS}; // will be loaded in initDB`
);

// ── 13. FIX try/catch ALTER TABLE blocks ─────────────────
// These are sync try-catch blocks that call db.exec - already converted above

// ── 14. ADD initDB function before server.listen ──────────
const schema = `
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
`;

const initDbFn = `
// ── PostgreSQL initialization ────────────────────────────
async function initDB() {
  try {
    await pool.query(\`${schema.replace(/`/g, '\\`')}\`);
    // Migration safety: add banned column if missing
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

code = code.replace(
  'const PORT=process.env.PORT||3000;',
  initDbFn + 'const PORT=process.env.PORT||3000;'
);

// ── 15. REPLACE server.listen to call initDB first ────────
code = code.replace(
  /server\.listen\(PORT,\(\)=>console\.log\(`[^`]*`\)\);/,
  `initDB().then(() => {
  server.listen(PORT, () => console.log(\`🎰 HATHOR Royal Casino v2 (PostgreSQL) → http://localhost:\${PORT}\`));
});`
);

// ── 16. FIX double-async (async async) ───────────────────
code = code.replace(/async async /g, 'async ');
code = code.replace(/async async\(/g, 'async(');

// ── 17. FIX getSetting/setSetting return values ───────────
// getSetting originally returns: const r=db.prepare(...).get(key); return r?r.value:null
// After transformation: returns await dbGet which already returns row or null
// Need to ensure .value is accessed
code = code.replace(
  /const getSetting = async key => \{ const r=await dbGet\('SELECT value FROM settings WHERE key=\?', \[key\]\); return r\?r\.value:null; \}/,
  "const getSetting = async key => { const r = await dbGet('SELECT value FROM settings WHERE key=\\$1', [key]); return r ? r.value : null; }"
);

// ── 18. FIX remaining try-catch db.exec blocks ───────────
// try { await pool.query(`...`); } catch(e){ console.log('...'); }
// These are fine as-is, but we need to make sure the outer function is async

// ── 19. Clean up any remaining db. references ─────────────
const remaining = (code.match(/\bdb\./g) || []).length;
if (remaining > 0) {
  console.warn(`⚠️  ${remaining} remaining db. references — check manually`);
}

// ── Write output ──────────────────────────────────────────
// Backup original
fs.copyFileSync('./server.js', './server.js.sqlite.bak');
fs.writeFileSync('./server.js', code, 'utf8');

console.log(`✅ Migration complete!`);
console.log(`   Original backed up to: server.js.sqlite.bak`);
console.log(`   Remaining db. refs: ${remaining}`);
console.log(`\n📋 Next steps:`);
console.log(`   1. npm install pg`);
console.log(`   2. Set DATABASE_URL env var in Railway`);
console.log(`   3. Remove better-sqlite3 from package.json`);
console.log(`   4. Deploy and test`);
