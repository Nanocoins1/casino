require('dotenv').config();
const express = require('express');
// Use built-in fetch (Node 18+) or polyfill
if(typeof fetch === 'undefined'){
  try{ global.fetch = require('node-fetch'); } catch(e){}
}
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false } : false
});

const nodemailer = require('nodemailer');
let speakeasy, QRCode, webpush;
try { speakeasy = require('speakeasy'); } catch(e) { console.warn('⚠️  speakeasy not installed — 2FA unavailable'); }
try { QRCode = require('qrcode'); } catch(e) { console.warn('⚠️  qrcode not installed — 2FA QR unavailable'); }
try {
  webpush = require('web-push');
  if (!process.env.VAPID_PUBLIC_KEY) {
    const keys = webpush.generateVAPIDKeys();
    console.log('🔔 Generated VAPID keys — add to env vars:');
    console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
    console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
    webpush = null; // Don't use until keys are configured
  } else {
    webpush.setVapidDetails(
      'mailto:' + (process.env.VAPID_EMAIL || 'admin@hathor.casino'),
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    console.log('🔔 Web Push (VAPID) configured');
  }
} catch(e) { console.warn('⚠️  web-push not installed — native push unavailable'); }

let emailTransporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  console.log('📧 Email transporter configured');
} else {
  console.log('📧 Email not configured (set SMTP_HOST/USER/PASS env vars)');
}

async function sendEmail(to, subject, html) {
  if (!emailTransporter) return;
  try {
    await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to, subject, html
    });
  } catch(e) {
    console.error('Email send error:', e.message);
  }
}

function emailTemplate(title, content) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0806;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px">
    <div style="text-align:center;margin-bottom:32px">
      <h1 style="font-family:Georgia,serif;color:#c9a84c;font-size:28px;margin:0;letter-spacing:4px">⬡ HATHOR</h1>
      <p style="color:rgba(201,168,76,0.5);font-size:11px;letter-spacing:3px;margin:4px 0 0">ROYAL CASINO</p>
    </div>
    <div style="background:rgba(201,168,76,0.04);border:1px solid rgba(201,168,76,0.15);border-radius:16px;padding:32px">
      <h2 style="color:#e8e2d4;font-size:20px;margin:0 0 16px">${title}</h2>
      ${content}
    </div>
    <p style="text-align:center;color:rgba(232,226,212,0.2);font-size:11px;margin-top:24px">
      HATHOR Royal Casino · <a href="https://casino-production-0712.up.railway.app" style="color:rgba(201,168,76,0.4)">Play Now</a>
    </p>
  </div>
  </body></html>`;
}

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

// ── Rate limiting ─────────────────────────────────────────────
const rateLimit = require('express-rate-limit');

// General API: 120 req / min per IP
app.use('/api/', rateLimit({
  windowMs: 60_000, max: 120,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests — slow down.' },
  skip: req => req.path.startsWith('/api/stats/') // allow frequent balance polls
}));

// Auth endpoints: 10 attempts / 15 min (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60_000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/admin/staff/login', authLimiter);

// Deposit / withdrawal: 15 per 15 min
const txLimiter = rateLimit({
  windowMs: 15 * 60_000, max: 15,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many payment requests. Please wait.' },
});
app.use('/api/crypto/deposit',  txLimiter);
app.use('/api/crypto/withdraw', txLimiter);

// KYC uploads: 5 per hour
app.use('/api/kyc', rateLimit({
  windowMs: 60 * 60_000, max: 5,
  message: { error: 'Too many KYC upload attempts.' },
}));

let _dbOk = false; // set to true once initDB succeeds
async function dbQuery(sql, params) {
  if (!_dbOk && !process.env.DATABASE_URL) return { rows: [] };
  return await pool.query(sql, params || []);
}
async function dbGet(sql, params) {
  try { const r = await dbQuery(sql, params); return r.rows[0] || null; } catch(e){ return null; }
}
async function dbAll(sql, params) {
  try { const r = await dbQuery(sql, params); return r.rows; } catch(e){ return []; }
}
async function dbRun(sql, params) {
  try { await dbQuery(sql, params); } catch(e){}
}


const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'hathor2026';
if(ADMIN_PASSWORD === 'hathor2026') {
  console.warn('⚠️  WARNING: Using default ADMIN_PASSWORD. Set ADMIN_PASSWORD env var before real-money launch!');
}

// ── Admin Staff tables (migration safe) ───────────────────


// Role permissions
const ROLE_PERMS = {
  superadmin: ['*'],
  moderator:  ['players.view','players.ban','players.unban','chat.broadcast','stats.view'],
  support:    ['players.view','players.gift','chat.broadcast'],
  finance:    ['players.view','stats.view','withdrawals.view','withdrawals.process'],
  kyc:        ['players.view','kyc.view','kyc.approve','kyc.reject'],
};

function hasPerm(role, perm) {
  const perms = ROLE_PERMS[role] || [];
  return perms.includes('*') || perms.includes(perm);
}

function hashAdminPw(pw) {
  return crypto.createHash('sha256').update(pw + 'hathor_staff_2026').digest('hex');
}

// Middleware — accepts superadmin password OR valid staff token
const adminAuth = async (req, res, next) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if(key === ADMIN_PASSWORD) {
    req.adminRole = 'superadmin';
    req.adminUser = 'superadmin';
    return next();
  }
  if(key && key.startsWith('staff_')) {
    const sess = await dbGet(`SELECT * FROM admin_sessions WHERE token=$1 AND expires_at > NOW()`, [key]);
    if(sess) {
      req.adminRole = sess.role;
      req.adminUser = sess.username;
      await dbRun(`UPDATE admin_staff SET last_login=NOW() WHERE username=$1`, [sess.username]);
      return next();
    }
  }
  return res.status(403).json({error:'Unauthorized'});
};

const affiliateAuth = async (req, res, next) => {
  const token = req.headers['x-session-token'] || (req.headers.authorization||'').replace('Bearer ','');
  const uid = await checkSession(token);
  if(!uid) return res.status(401).json({error:'Unauthorized'});
  const deal = await dbGet(`SELECT * FROM affiliate_deals WHERE uid=$1 AND status='active'`, [uid]);
  if(!deal) return res.status(403).json({error:'Not an affiliate'});
  req.affUid = uid;
  req.affDeal = deal;
  next();
};

// Permission check middleware factory
const requirePerm = (perm) => (req, res, next) => {
  if(!hasPerm(req.adminRole, perm)) return res.status(403).json({error:`Leidimas atmestas: ${perm}`, role: req.adminRole});
  next();
};

// Cleanup expired sessions every hour
setInterval(async () => { try { await dbRun(`DELETE FROM admin_sessions WHERE expires_at < NOW()`, []); } catch(e){} }, 3600000);

// ── Settings helpers ──────────────────────────────────────
const getSetting = async key => { const r=await dbGet(`SELECT value FROM settings WHERE key=$1`, [key]); return r?r.value:null; };
const setSetting = async (key,value) => await dbRun(`INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, [key,String(value)]);

// ── Provably Fair ─────────────────────────────────────────
async function pfNewRound(uid, game) {
  const serverSeed = crypto.randomBytes(32).toString('hex');
  const serverHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
  const roundId = uuidv4();
  await dbRun(`INSERT INTO provably_fair(round_id,uid,game,server_seed,server_hash) VALUES($1,$2,$3,$4,$5)`,
    [roundId, uid, game, serverSeed, serverHash]);
  return { roundId, serverHash };
}
async function pfReveal(roundId, clientSeed, nonce) {
  const row = await dbGet(`SELECT * FROM provably_fair WHERE round_id=$1`, [roundId]);
  if(!row) return null;
  const combined = row.server_seed + '-' + (clientSeed||'default') + '-' + (nonce||0);
  const hash = crypto.createHmac('sha256', row.server_seed).update(combined).digest('hex');
  const result = parseInt(hash.slice(0,8), 16) % 10000; // 0-9999
  await dbRun(`UPDATE provably_fair SET client_seed=$1,nonce=$2,result=$3,revealed=1 WHERE round_id=$4`,
    [clientSeed||'default', nonce||0, result, roundId]);
  return { roundId, serverSeed: row.server_seed, serverHash: row.server_hash, clientSeed: clientSeed||'default', nonce: nonce||0, result, hash };
}

// ── Gambling limits helpers ────────────────────────────────
async function getLimits(uid) {
  return await dbGet(`SELECT * FROM gambling_limits WHERE uid=$1`, [uid])
    || { uid, daily_limit:0, weekly_limit:0, self_excluded:0, excluded_until:null };
}
async function checkLimits(uid, betAmount) {
  const lim = await getLimits(uid);
  if(lim.self_excluded) {
    if(lim.excluded_until && new Date(lim.excluded_until) < new Date()) {
      await dbRun(`UPDATE gambling_limits SET self_excluded=0,excluded_until=NULL WHERE uid=$1`, [uid]);
    } else {
      return { blocked: true, reason: 'self_excluded' };
    }
  }
  if(lim.daily_limit > 0) {
    const today = new Date().toISOString().split('T')[0];
    const row = await dbGet(`SELECT COALESCE(SUM(bet),0) as total FROM game_log WHERE uid=$1 AND ts>=$2`, [uid, today+'T00:00:00']);
    if((row.total + betAmount) > lim.daily_limit) return { blocked: true, reason: 'daily_limit' };
  }
  if(lim.weekly_limit > 0) {
    const weekAgo = new Date(Date.now()-7*24*60*60*1000).toISOString();
    const row = await dbGet(`SELECT COALESCE(SUM(bet),0) as total FROM game_log WHERE uid=$1 AND ts>=$2`, [uid, weekAgo]);
    if((row.total + betAmount) > lim.weekly_limit) return { blocked: true, reason: 'weekly_limit' };
  }
  return { blocked: false };
}

// ── Bonus helpers ──────────────────────────────────────────
async function getActiveBonus(uid) {
  return await dbGet(`SELECT * FROM bonuses WHERE uid=$1 AND status='active' ORDER BY created_at ASC LIMIT 1`, [uid]) || null;
}
async function giveBonus(uid, type, amount, wageringMultiplier) {
  const id = uuidv4();
  const wagering_req = amount * (wageringMultiplier || 10);
  const expires_at = new Date(Date.now() + 30*24*60*60*1000).toISOString();
  await dbRun(`INSERT INTO bonuses(id,uid,type,amount,wagering_req,wagered,status,expires_at) VALUES($1,$2,$3,$4,$5,0,$6,$7)`,
    [id, uid, type, amount, wagering_req, 'active', expires_at]);
  const u = await getUser(uid);
  if(u) { u.tokens += amount; await saveUser(u); }
  return { id, amount, wagering_req };
}
async function updateWagering(uid, betAmount) {
  const bonus = await getActiveBonus(uid);
  if(!bonus) return;
  const newWagered = bonus.wagered + betAmount;
  if(newWagered >= bonus.wagering_req) {
    await dbRun(`UPDATE bonuses SET wagered=$1,status='completed' WHERE id=$2`, [newWagered, bonus.id]);
  } else {
    await dbRun(`UPDATE bonuses SET wagered=$1 WHERE id=$2`, [newWagered, bonus.id]);
  }
}

// ── New Bonus System helpers ───────────────────────────────
async function getBonusSettings() {
  const rows = await dbAll(`SELECT key, value FROM bonus_settings`);
  const s = {};
  rows.forEach(r => s[r.key] = r.value);
  return s;
}

async function trackWagering(uid, betAmount) {
  try {
    const bonuses = await dbAll(`SELECT * FROM player_bonuses WHERE uid=$1 AND status='active'`, [uid]);
    for (const b of bonuses) {
      const newDone = Math.min(b.wagering_done + betAmount, b.wagering_required);
      if (newDone >= b.wagering_required) {
        await dbRun(`UPDATE player_bonuses SET wagering_done=$1, status='completed' WHERE id=$2`, [newDone, b.id]);
        await dbRun(`UPDATE users SET tokens=tokens+$1 WHERE uid=$2`, [b.bonus_tokens, uid]);
        if(sockets[uid]) sockets[uid].socket.emit('bonusUnlocked', {bonus_tokens: b.bonus_tokens, bonus_type: b.bonus_type});
        await sendPushToUser(uid, '🎉 Bonus Unlocked!', `${b.bonus_tokens} tokens added to your balance!`, '/');
      } else {
        await dbRun(`UPDATE player_bonuses SET wagering_done=$1 WHERE id=$2`, [newDone, b.id]);
      }
    }
  } catch(e) { console.error('trackWagering error:', e.message); }
}

async function givePlayerBonus(uid, bonusType, bonusTokens, wageringRequired, expiresAt) {
  try {
    const exp = expiresAt || new Date(Date.now() + 30*24*60*60*1000).toISOString();
    await dbRun(`INSERT INTO player_bonuses(uid,bonus_type,bonus_tokens,wagering_required,expires_at) VALUES($1,$2,$3,$4,$5)`,
      [uid, bonusType, bonusTokens, wageringRequired, exp]);
  } catch(e) { console.error('givePlayerBonus error:', e.message); }
}

// ── Affiliate helpers ──────────────────────────────────────
async function getOrCreateAffiliate(uid) {
  let aff = await dbGet(`SELECT * FROM affiliates WHERE uid=$1`, [uid]);
  if(!aff) {
    const ref_code = crypto.randomBytes(4).toString('hex').toUpperCase();
    await dbRun(`INSERT INTO affiliates(uid,ref_code) VALUES($1,$2)`, [uid, ref_code]);
    aff = await dbGet(`SELECT * FROM affiliates WHERE uid=$1`, [uid]);
  }
  return aff;
}
async function processReferral(newUid, refCode) {
  if(!refCode) return;
  const aff = await dbGet(`SELECT * FROM affiliates WHERE ref_code=$1`, [refCode]);
  if(!aff || aff.uid === newUid) return;
  await dbRun(`INSERT INTO referrals(uid,ref_by) VALUES($1,$2)`, [newUid, aff.uid]);
  await dbRun(`UPDATE affiliates SET referred=referred+1 WHERE uid=$1`, [aff.uid]);
}

async function checkAndRecordFTD(uid, amountTokens) {
  try {
    const ref = await dbGet(`SELECT * FROM referrals WHERE uid=$1`, [uid]);
    if(!ref || ref.ftd_date) return; // no referral or FTD already recorded
    // Check if this is truly first deposit
    const depCount = await dbGet(`SELECT COUNT(*) as c FROM transactions WHERE uid=$1 AND type='deposit' AND status='completed'`, [uid]);
    if(parseInt(depCount?.c||0) > 1) return; // not first
    // Record FTD
    await dbRun(`UPDATE referrals SET ftd_date=NOW(), ftd_amount=$1 WHERE uid=$2`, [amountTokens, uid]);
    // Check affiliate deal for CPA
    const deal = await dbGet(`SELECT * FROM affiliate_deals WHERE uid=$1`, [ref.ref_by]);
    if(deal && deal.status==='active' && (deal.deal_type==='cpa'||deal.deal_type==='hybrid')) {
      if(amountTokens >= (deal.cpa_min_deposit||0) && !ref.cpa_paid) {
        const commId = uuidv4();
        await dbRun(`INSERT INTO affiliate_commissions(id,aff_uid,player_uid,type,amount) VALUES($1,$2,$3,'cpa',$4)`, [commId, ref.ref_by, uid, deal.cpa_amount]);
        await dbRun(`UPDATE referrals SET cpa_paid=1 WHERE uid=$1`, [uid]);
        await dbRun(`UPDATE affiliates SET earnings=earnings+$1 WHERE uid=$2`, [deal.cpa_amount, ref.ref_by]);
      }
    }
    // Player-to-player referral bonus on FTD
    try {
      const playerRef = await dbGet(`SELECT * FROM player_referrals WHERE referred_uid=$1 AND bonus_given=FALSE`, [uid]);
      if(playerRef) {
        // Give 500 tokens to referrer
        await dbRun(`UPDATE users SET tokens=tokens+500 WHERE uid=$1`, [playerRef.referrer_uid]);
        // Give 500 tokens as wagered bonus to referred player
        await givePlayerBonus(uid, 'referral', 500, 500*10, new Date(Date.now()+30*24*60*60*1000).toISOString());
        await dbRun(`UPDATE player_referrals SET bonus_given=TRUE WHERE id=$1`, [playerRef.id]);
      }
    } catch(prErr) { console.error('Player referral bonus error:', prErr.message); }
  } catch(e) { console.error('FTD check error:', e.message); }
}

// ── Tournament helpers ─────────────────────────────────────
const PRIZE_DIST = [0.40, 0.25, 0.15, 0.10, 0.05, 0.03, 0.02];

async function updateTournamentScore(uid, betAmount, gameType) {
  if(!uid || !betAmount || betAmount <= 0) return;
  try {
    const now = new Date().toISOString();
    const tournaments = await dbAll(
      `SELECT * FROM tournaments WHERE status='active' AND start_at <= $1 AND end_at >= $2 AND (game_type='all' OR game_type=$3)`,
      [now, now, gameType || 'slots']
    );
    for (const t of tournaments) {
      if(betAmount < (t.min_bet || 0)) continue;
      await dbRun(
        `INSERT INTO tournament_entries(tournament_id, uid, score) VALUES($1,$2,$3)
         ON CONFLICT(tournament_id, uid) DO UPDATE SET score = tournament_entries.score + $3`,
        [t.id, uid, betAmount]
      );
    }
  } catch(e) { console.error('updateTournamentScore error:', e.message); }
}

async function finishTournament(tournamentId) {
  try {
    const t = await dbGet(`SELECT * FROM tournaments WHERE id=$1`, [tournamentId]);
    if(!t || t.status === 'finished') return;
    await dbRun(`UPDATE tournaments SET status='finished' WHERE id=$1`, [tournamentId]);
    // Rank entries
    const entries = await dbAll(
      `SELECT te.uid, te.score, u.name FROM tournament_entries te JOIN users u ON te.uid=u.uid WHERE te.tournament_id=$1 ORDER BY te.score DESC`,
      [tournamentId]
    );
    for (let i = 0; i < entries.length; i++) {
      const rank = i + 1;
      const pct = PRIZE_DIST[i] || 0;
      const prize = pct > 0 ? Math.floor(t.prize_pool * pct) : 0;
      await dbRun(
        `UPDATE tournament_entries SET rank=$1, prize_tokens=$2 WHERE tournament_id=$3 AND uid=$4`,
        [rank, prize, tournamentId, entries[i].uid]
      );
      if (prize > 0) {
        await dbRun(`UPDATE users SET tokens=tokens+$1 WHERE uid=$2`, [prize, entries[i].uid]);
        const sock = sockets[entries[i].uid];
        if(sock) sock.socket.emit('tournamentPrize', { place: rank, prize, tournament: t.name });
        await sendPushToUser(entries[i].uid, '🏆 Tournament Prize!', `You placed #${rank} in ${t.name} — +${prize} tokens!`, '/');
        const authRow = await dbGet(`SELECT email FROM auth WHERE uid=$1`, [entries[i].uid]);
        if(authRow?.email) {
          await sendEmail(authRow.email, `🏆 Tournament Results: ${t.name}`, emailTemplate(
            `You placed #${rank} in ${t.name}!`,
            `<p style="color:rgba(232,226,212,0.7);line-height:1.7">Congratulations! You finished <strong style="color:#c9a84c">#${rank}</strong> and won <strong style="color:#c9a84c">${prize} tokens</strong>.</p>`
          ));
        }
      }
    }
    console.log(`✅ Tournament ${t.name} finished — ${entries.length} players ranked`);
  } catch(e) { console.error('finishTournament error:', e.message); }
}

async function getTournamentLeaderboard(tournamentId, limit=20) {
  return await dbAll(
    `SELECT te.uid, te.score, te.rank, te.prize_tokens, u.name, u.avatar, u.level
     FROM tournament_entries te JOIN users u ON te.uid=u.uid
     WHERE te.tournament_id=$1 ORDER BY te.score DESC LIMIT $2`,
    [tournamentId, limit]
  );
}

// Legacy compat — keep old addTournamentScore working too
async function addTournamentScore(uid, game, score) {
  await updateTournamentScore(uid, score, game);
}

// Auto-finish and auto-activate tournaments every 5 minutes
setInterval(async () => {
  try {
    const now = new Date().toISOString();
    // Activate scheduled tournaments
    const toActivate = await dbAll(`SELECT id FROM tournaments WHERE status='scheduled' AND start_at <= $1`, [now]);
    for (const t of toActivate) { await dbRun(`UPDATE tournaments SET status='active' WHERE id=$1`, [t.id]); }
    // Finish expired active tournaments
    const toFinish = await dbAll(`SELECT id FROM tournaments WHERE status='active' AND end_at < $1`, [now]);
    for (const t of toFinish) { await finishTournament(t.id); }
  } catch(e) { console.error('Tournament cron error:', e.message); }
}, 5 * 60 * 1000);

// ── RTP Configuration (per-game house edge control) ──
const RTP_DEFAULTS = {
  grand:      95,  // GrandFortune slots
  classic:    92,  // Classic slots
  plinko:     95,  // Krioklis / Plinko
  wheel:      90,  // Wheel of Fortune
  crash:      94,  // Crash
  mines:      93,  // Mines
  dice:       94,  // Dice
  videopoker: 95,  // Video Poker
  roulette:   97,  // Roulette
  blackjack:  99,  // Blackjack
  baccarat:   98,  // Baccarat
  sports:     93,  // Sports betting
};
// Persisted RTP config — loaded in initDB()
let rtpConfig = {...RTP_DEFAULTS};


const getUser = async uid => await dbGet(`SELECT * FROM users WHERE uid=$1`, [uid]);
const saveUser = async u => {
  if (!_dbOk) return; // demo mode — skip DB write
  await pool.query(
    `INSERT INTO users(uid,name,tokens,avatar,level,xp,total_won,games_played,last_bonus)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT(uid) DO UPDATE SET
      name=EXCLUDED.name, tokens=EXCLUDED.tokens, avatar=EXCLUDED.avatar,
      level=EXCLUDED.level, xp=EXCLUDED.xp, total_won=EXCLUDED.total_won,
      games_played=EXCLUDED.games_played, last_bonus=EXCLUDED.last_bonus`,
    [u.uid, u.name, u.tokens, u.avatar, u.level, u.xp, u.total_won, u.games_played, u.last_bonus]
  );
};

// ── Levels ───────────────────────────────────────────────
const LEVELS=[
  {level:1,name:'Bronze',   xpNeeded:0,     emoji:'🥉',color:'#cd7f32',cashback:0,  xpMult:1.0, dailyBonus:500,  withdrawLimit:5000,  badge:''},
  {level:2,name:'Silver',   xpNeeded:500,   emoji:'🥈',color:'#c0c0c0',cashback:1,  xpMult:1.1, dailyBonus:750,  withdrawLimit:10000, badge:'SILVER'},
  {level:3,name:'Gold',     xpNeeded:1500,  emoji:'🥇',color:'#ffd700',cashback:2,  xpMult:1.25,dailyBonus:1000, withdrawLimit:25000, badge:'GOLD'},
  {level:4,name:'Platinum', xpNeeded:4000,  emoji:'💎',color:'#e5e4e2',cashback:3,  xpMult:1.5, dailyBonus:1500, withdrawLimit:50000, badge:'PLAT'},
  {level:5,name:'Diamond',  xpNeeded:10000, emoji:'👑',color:'#b9f2ff',cashback:5,  xpMult:2.0, dailyBonus:2000, withdrawLimit:100000,badge:'VIP'},
  {level:6,name:'VIP Elite',xpNeeded:25000, emoji:'🌟',color:'#ffd680',cashback:8,  xpMult:3.0, dailyBonus:3000, withdrawLimit:999999,badge:'ELITE'},
];
const getLvInfo = xp => { let l=LEVELS[0]; for(const x of LEVELS){if(xp>=x.xpNeeded)l=x;} return l; };
const nextLvInfo = xp => LEVELS.find(l=>l.xpNeeded>xp)||null;

// ── VIP Program ───────────────────────────────────────────
const VIP_LEVELS = [
  { level: 0, name: 'Bronze',   minXp: 0,      cashback: 0,   withdrawLimit: 10000,  badge: '🥉' },
  { level: 1, name: 'Silver',   minXp: 1000,   cashback: 1,   withdrawLimit: 25000,  badge: '🥈' },
  { level: 2, name: 'Gold',     minXp: 5000,   cashback: 2,   withdrawLimit: 50000,  badge: '🥇' },
  { level: 3, name: 'Platinum', minXp: 15000,  cashback: 3,   withdrawLimit: 100000, badge: '💎' },
  { level: 4, name: 'Diamond',  minXp: 50000,  cashback: 5,   withdrawLimit: 500000, badge: '👑' },
  { level: 5, name: 'VIP',      minXp: 150000, cashback: 8,   withdrawLimit: 999999, badge: '⚜️' },
];

function getVipLevel(xp) {
  let level = VIP_LEVELS[0];
  for (const l of VIP_LEVELS) { if (xp >= l.minXp) level = l; }
  return level;
}

async function processWeeklyCashback() {
  const now = new Date();
  if (now.getDay() !== 1) return; // Only on Mondays

  const lastRun = await dbGet(`SELECT value FROM settings WHERE key='last_cashback_run'`);
  if (lastRun) {
    const lastDate = new Date(lastRun.value);
    if (now - lastDate < 6 * 24 * 60 * 60 * 1000) return; // Already ran this week
  }

  console.log('💎 Processing weekly VIP cashback...');

  const users = await dbAll(`SELECT u.uid as id, u.xp, a.email, u.name as username FROM users u LEFT JOIN auth a ON u.uid=a.uid`);
  for (const user of users) {
    const vip = getVipLevel(user.xp || 0);
    if (vip.cashback === 0) continue;

    const weekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString();
    const result = await dbGet(
      `SELECT COALESCE(SUM(CASE WHEN result < bet THEN bet-result ELSE 0 END),0) as net_loss FROM game_log WHERE uid=$1 AND ts > $2`,
      [user.id, weekAgo]
    );

    const netLoss = parseInt(result?.net_loss || 0);
    if (netLoss <= 0) continue;

    const cashbackAmount = Math.floor(netLoss * vip.cashback / 100);
    if (cashbackAmount < 100) continue;

    await dbRun(`UPDATE users SET tokens=tokens+$1 WHERE uid=$2`, [cashbackAmount, user.id]);
    if (user.email) {
      await sendEmail(user.email, `💎 Your ${vip.name} cashback is here!`, emailTemplate(
        `${vip.badge} ${vip.name} Cashback`,
        `<p style="color:rgba(232,226,212,0.7);line-height:1.7">As a <strong style="color:#c9a84c">${vip.name}</strong> member, you received <strong style="color:#c9a84c">${cashbackAmount} tokens</strong> cashback for this week's play.</p>`
      ));
    }
  }

  await dbRun(`INSERT INTO settings(key,value) VALUES('last_cashback_run',$1) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, [now.toISOString()]);
  console.log('✅ Weekly cashback processed');
}

// Process weekly cashback for a user
async function processCashback(uid) {
  const u = await getUser(uid); if(!u) return null;
  const lv = getLvInfo(u.xp||0);
  if(!lv.cashback || lv.cashback <= 0) return null;
  // Calculate losses in last 7 days
  const weekAgo = new Date(Date.now()-7*24*60*60*1000).toISOString();
  const row = await dbGet(`SELECT COALESCE(SUM(CASE WHEN result < bet THEN bet-result ELSE 0 END),0) as losses
    FROM game_log WHERE uid=$1 AND ts>=$2`, [uid, weekAgo]);
  const losses = row.losses || 0;
  if(losses <= 0) return null;
  const cashbackAmt = Math.floor(losses * lv.cashback / 100);
  if(cashbackAmt <= 0) return null;
  u.tokens += cashbackAmt;
  await saveUser(u);
  // Log as bonus
  const id = require('uuid').v4();
  await dbRun(`INSERT INTO bonuses(id,uid,type,amount,wagering_req,wagered,status,expires_at) VALUES($1,$2,$3,$4,0,0,$5,$6)`,
    [id, uid, 'cashback', cashbackAmt, 'completed', new Date().toISOString()]);
  return { cashbackAmt, level: lv.name };
}

async function addXP(uid, xp) {
  const u = await getUser(uid); if(!u) return null;
  const oldLv = getLvInfo(u.xp||0);
  const mult = oldLv.xpMult || 1.0;
  u.xp = (u.xp||0) + Math.round(xp * mult);
  u.level = getLvInfo(u.xp).level;
  await saveUser(u);
  const newLv = getLvInfo(u.xp);
  return {levelUp:newLv.level>oldLv.level, newLevel:newLv, xp:u.xp};
}

// ── Daily bonus ──────────────────────────────────────────
const DAILY=[500,750,1000,1250,1500,2000,3000];
async function claimBonus(uid) {
  const u = await getUser(uid); if(!u) return null;
  const today = new Date().toISOString().split('T')[0];
  if(u.last_bonus===today) return {alreadyClaimed:true};
  const amount = DAILY[Math.floor(Math.random()*DAILY.length)];
  u.tokens += amount; u.last_bonus = today; u.xp = (u.xp||0)+50;
  await saveUser(u);
  return {amount, tokens:u.tokens};
}

// ── Uploads ──────────────────────────────────────────────
if(!fs.existsSync('./public/avatars')) fs.mkdirSync('./public/avatars',{recursive:true});
const ALLOWED_MIME = ['image/jpeg','image/png','image/webp','image/gif'];
const ALLOWED_EXT  = ['.jpg','.jpeg','.png','.webp','.gif'];
const storage = multer.diskStorage({
  destination:'./public/avatars/',
  // Use random filename — never trust client-supplied name/uid header
  filename:(req,file,cb)=>{
    const ext = path.extname(file.originalname).toLowerCase();
    if(!ALLOWED_EXT.includes(ext)) return cb(new Error('Invalid file type'));
    cb(null, require('crypto').randomBytes(16).toString('hex') + ext);
  }
});
const upload = multer({
  storage,
  limits:{fileSize:2*1024*1024},
  fileFilter:(req,file,cb)=>{
    if(!ALLOWED_MIME.includes(file.mimetype)) return cb(new Error('Only image files allowed'));
    cb(null,true);
  }
});
// ── Security headers ───────────────────────────────────────
app.use(function(req,res,next){
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','SAMEORIGIN');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy','geolocation=(), microphone=(), camera=()');
  // HSTS: short max-age (1 day) without preload — safe for production
  res.setHeader('Strict-Transport-Security','max-age=86400');
  // CSP: permissive for CDN scripts (React, Babel, socket.io, Chart.js, OneSignal)
  res.setHeader('Content-Security-Policy',
    "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
    "frame-ancestors 'self';"
  );
  next();
});
// HTML files: never cache — always fresh from server
app.use(function(req,res,next){
  const url = req.url.split('?')[0];
  if(url === '/' || url.endsWith('.html') || url === '/index') {
    res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma','no-cache');
    res.setHeader('Expires','0');
  }
  next();
});
app.use(express.static(path.join(__dirname,'public')));
app.get('/admin', (req,res) => res.redirect('/admin.html'));
app.use(express.json());

app.post('/upload-avatar', upload.single('avatar'), async (req,res)=>{
  // Verify session token — don't trust client-supplied x-user-id header
  const token = req.headers['x-session-token'] || (req.headers.authorization||'').replace('Bearer ','');
  const uid = await checkSession(token) || req.headers['x-user-id']; // fallback for legacy
  if(!uid) return res.status(401).json({error:'Unauthorized'});
  if(!req.file) return res.status(400).json({error:'No file'});
  const url=`/avatars/${req.file.filename}`;
  const u=await getUser(uid); if(u){u.avatar=url;await saveUser(u);}
  if(sockets[uid]) sockets[uid].user={...sockets[uid].user,avatar:url};
  res.json({url});
});

async function getLeaderboardData(){
  const rows=await dbAll(`SELECT uid,name,tokens,avatar,level,xp FROM users ORDER BY tokens DESC LIMIT 20`, []);
  return rows.map((u,i)=>({rank:i+1,...u,levelInfo:getLvInfo(u.xp||0)}));
}
app.get('/leaderboard', async (req,res)=>{
  res.json(await getLeaderboardData());
});

// ── In-memory ────────────────────────────────────────────
const sockets={};
const pokerRooms={};
const roomChats={};
// 2FA temporary tokens (5-minute TTL)
const twoFaTempTokens = {}; // { token: { uid, expiresAt } }
setInterval(()=>{const now=Date.now();Object.keys(twoFaTempTokens).forEach(k=>{if(twoFaTempTokens[k].expiresAt<now)delete twoFaTempTokens[k];});}, 60000);

function addChat(roomId,entry){
  if(!roomChats[roomId]) roomChats[roomId]=[];
  roomChats[roomId].push(entry);
  if(roomChats[roomId].length>100) roomChats[roomId].shift();
  io.to(roomId).emit('chatMsg',entry);
}

// ── Cards ────────────────────────────────────────────────
const SUITS=['♠','♥','♦','♣'],RANKS=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const VV={'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14};
const RED=new Set(['♥','♦']);
const createDeck=()=>SUITS.flatMap(s=>RANKS.map(r=>({suit:s,rank:r,value:VV[r],red:RED.has(s)})));
const shuffle=arr=>{const d=[...arr];for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}return d;};

function evalHand(cards){
  if(cards.length<5)return{score:0,name:'N/A'};
  const vals=cards.map(c=>c.value).sort((a,b)=>b-a);
  const suits=cards.map(c=>c.suit);
  const cnts={};vals.forEach(v=>cnts[v]=(cnts[v]||0)+1);
  const groups=Object.entries(cnts).sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
  const counts=groups.map(g=>g[1]);
  const flush=suits.every(s=>s===suits[0]);
  const uniq=[...new Set(vals)].sort((a,b)=>a-b);
  const straight=uniq.length===5&&(uniq[4]-uniq[0]===4||uniq.join()==='2,3,4,5,14');
  const high=straight&&uniq.join()==='2,3,4,5,14'?5:vals[0];
  const base=vals.reduce((a,v,i)=>a+v*Math.pow(15,4-i),0);
  if(flush&&straight&&high===14)return{score:9e9,name:'👑 Royal Flush'};
  if(flush&&straight)return{score:8e9+high,name:'🃏 Straight Flush'};
  if(counts[0]===4)return{score:7e9+base,name:'🎲 Four of a Kind'};
  if(counts[0]===3&&counts[1]===2)return{score:6e9+base,name:'🏠 Full House'};
  if(flush)return{score:5e9+base,name:'♠ Flush'};
  if(straight)return{score:4e9+high,name:'➡️ Straight'};
  if(counts[0]===3)return{score:3e9+base,name:'3️⃣ Three of a Kind'};
  if(counts[0]===2&&counts[1]===2)return{score:2e9+base,name:'👬 Two Pair'};
  if(counts[0]===2)return{score:1e9+base,name:'👥 One Pair'};
  return{score:base,name:'🔢 High Card'};
}
function best7(hole,comm){
  const all=[...hole,...comm];let best=null;
  for(let i=0;i<all.length-1;i++)for(let j=i+1;j<all.length;j++){
    const r=evalHand(all.filter((_,k)=>k!==i&&k!==j));
    if(!best||r.score>best.score)best=r;
  }
  return best;
}

// ── Bots ─────────────────────────────────────────────────
const BNAMES=['Viktor 🤖','Sofia 🤖','Marco 🤖','Elena 🤖','Carlos 🤖','Yuki 🤖'];
const BSTYLE=['aggressive','passive','balanced','bluff'];
const mkBot=()=>({id:'bot_'+uuidv4().slice(0,8),name:BNAMES[Math.floor(Math.random()*BNAMES.length)],tokens:5000,style:BSTYLE[Math.floor(Math.random()*BSTYLE.length)],isBot:true});
function botAct(bot,room){
  const p=room.players.find(x=>x.id===bot.id);if(!p||p.folded)return null;
  const toCall=room.currentBet-p.bet,r=Math.random();
  if(bot.style==='aggressive'){if(r<.12)return{type:'fold'};if(r<.4)return{type:'raise',amount:room.bigBlind*2};if(toCall===0)return{type:'check'};return{type:'call'};}
  if(bot.style==='passive'){if(r<.25)return{type:'fold'};if(toCall===0)return{type:'check'};if(r<.7)return{type:'call'};return{type:'fold'};}
  if(bot.style==='bluff'){if(r<.08)return{type:'fold'};if(r<.45)return{type:'raise',amount:room.bigBlind*3};if(toCall===0)return{type:'check'};return{type:'call'};}
  if(r<.2)return{type:'fold'};if(r<.5&&toCall===0)return{type:'check'};if(r<.7)return toCall===0?{type:'check'}:{type:'call'};return{type:'raise',amount:room.bigBlind};
}

// ── PokerRoom ─────────────────────────────────────────────
class PokerRoom{
  constructor(id,hostId,buyIn=500,withBots=false){
    this.id=id;this.hostId=hostId;this.buyIn=buyIn;
    this.players=[];this.status='waiting';this.phase='waiting';
    this.deck=[];this.community=[];this.pot=0;this.currentBet=0;
    this.actionIndex=0;this.dealerIndex=0;
    this.smallBlind=Math.max(10,Math.floor(buyIn/20));
    this.bigBlind=this.smallBlind*2;this.botTimers=[];
    if(withBots){const c=2+Math.floor(Math.random()*2);for(let i=0;i<c;i++){const b=mkBot();this.players.push({...b,bet:0,cards:[],folded:false,allIn:false,connected:true,bestHand:null});}}
  }
  addPlayer(id,name,tokens,avatar,level){
    if(this.players.length>=6||this.players.find(p=>p.id===id))return false;
    this.players.push({id,name,tokens:Math.min(tokens,this.buyIn*3),bet:0,cards:[],folded:false,allIn:false,connected:true,bestHand:null,avatar:avatar||null,level:level||1,isBot:false});
    return true;
  }
  removePlayer(id){const i=this.players.findIndex(p=>p.id===id);if(i===-1)return;if(this.status==='waiting')this.players.splice(i,1);else{this.players[i].connected=false;this.players[i].folded=true;}}
  startGame(){if(this.players.length<2)return false;this.status='playing';this.dealerIndex=0;this.newHand();return true;}
  newHand(){
    this.botTimers.forEach(t=>clearTimeout(t));this.botTimers=[];
    this.deck=shuffle(createDeck());this.community=[];this.pot=0;this.currentBet=0;this.phase='preflop';
    const active=this.players.filter(p=>(p.connected||p.isBot)&&p.tokens>0);
    if(active.length<2){this.status='waiting';return false;}
    this.players.forEach(p=>{p.bet=0;p.cards=[];p.folded=(p.tokens<=0||(!p.connected&&!p.isBot));p.allIn=false;p.bestHand=null;});
    active.forEach(p=>{p.cards=[this.deck.pop(),this.deck.pop()];});
    const sb=this.iAfter(this.dealerIndex,1),bb=this.iAfter(this.dealerIndex,2);
    this.fBet(sb,this.smallBlind);this.fBet(bb,this.bigBlind);
    this.currentBet=this.bigBlind;this.actionIndex=this.iAfter(bb,1);this.roundStart=this.actionIndex;
    this.schedBot();return true;
  }
  iAfter(from,steps){let idx=from,found=0;for(let i=0;i<this.players.length*2;i++){idx=(idx+1)%this.players.length;if(!this.players[idx].folded){found++;if(found===steps)return idx;}}return from;}
  fBet(idx,amt){const p=this.players[idx];if(!p)return;const a=Math.min(amt,p.tokens);p.tokens-=a;p.bet+=a;this.pot+=a;if(p.tokens===0)p.allIn=true;}
  schedBot(){const cp=this.players[this.actionIndex];if(!cp||!cp.isBot)return;const t=setTimeout(async ()=>{const d=botAct(cp,this);if(d){const r=await this.action(cp.id,d.type,d.amount||0);if(r)this.broadcast();}},1200+Math.random()*2000);this.botTimers.push(t);}
  async action(pid,type,raiseBy=0){
    const p=this.players.find(x=>x.id===pid);
    if(!p||p.folded||p.allIn||this.players[this.actionIndex].id!==pid)return null;
    if(type==='fold')p.folded=true;
    else if(type==='check'){if(p.bet<this.currentBet)return null;}
    else if(type==='call')this.fBet(this.actionIndex,this.currentBet-p.bet);
    else if(type==='raise'){const m=Math.max(this.bigBlind,raiseBy);this.currentBet+=m;this.fBet(this.actionIndex,this.currentBet-p.bet);this.roundStart=this.actionIndex;}
    else if(type==='allin'){const rem=p.tokens;if(p.bet+rem>this.currentBet){this.currentBet=p.bet+rem;this.roundStart=this.actionIndex;}this.fBet(this.actionIndex,rem);}
    return await this.advance();
  }
  async advance(){
    const alive=this.players.filter(x=>!x.folded);
    if(alive.length===1){
      const w=alive[0];w.tokens+=this.pot;const wonAmt=this.pot;this.pot=0;
      const dbU=await getUser(w.id);if(dbU){dbU.tokens=w.tokens;dbU.total_won=(dbU.total_won||0)+wonAmt;await saveUser(dbU);}
      const lv=await addXP(w.id,100);
      setTimeout(()=>{this.dealerIndex=this.iAfter(this.dealerIndex,1);this.newHand();this.broadcast();},4000);
      return{event:'winner',winner:w.name,levelUp:lv?.levelUp,newLevel:lv?.newLevel};
    }
    const canAct=this.players.filter(x=>!x.folded&&!x.allIn);
    const allCalled=canAct.every(x=>x.bet===this.currentBet);
    let ni=(this.actionIndex+1)%this.players.length,loops=0;
    while(loops<this.players.length){
      const np=this.players[ni];
      if(!np.folded&&!np.allIn){if(allCalled&&ni===this.roundStart)break;if(!allCalled||np.bet<this.currentBet){this.actionIndex=ni;this.schedBot();return{event:'next'};}}
      ni=(ni+1)%this.players.length;loops++;
    }
    return await this.nextPhase();
  }
  async nextPhase(){
    this.players.forEach(p=>{p.bet=0;});this.currentBet=0;
    this.actionIndex=this.iAfter(this.dealerIndex,1);this.roundStart=this.actionIndex;
    if(this.phase==='preflop'){this.phase='flop';this.deck.pop();this.community.push(this.deck.pop(),this.deck.pop(),this.deck.pop());}
    else if(this.phase==='flop'){this.phase='turn';this.deck.pop();this.community.push(this.deck.pop());}
    else if(this.phase==='turn'){this.phase='river';this.deck.pop();this.community.push(this.deck.pop());}
    else return await this.showdown();
    this.schedBot();return{event:'phase',phase:this.phase};
  }
  async showdown(){
    this.phase='showdown';
    const alive=this.players.filter(p=>!p.folded);
    let winner=null,best=-Infinity;
    alive.forEach(p=>{p.bestHand=best7(p.cards,this.community);if(p.bestHand.score>best){best=p.bestHand.score;winner=p;}});
    if(winner){const w=winner;w.tokens+=this.pot;this.pot=0;const dbU=await getUser(w.id);if(dbU){dbU.tokens=w.tokens;await saveUser(dbU);}await addXP(w.id,150);}
    setTimeout(()=>{this.dealerIndex=this.iAfter(this.dealerIndex,1);this.newHand();this.broadcast();},5000);
    return{event:'showdown',winner:winner?.name,hand:winner?.bestHand?.name,players:alive.map(p=>({name:p.name,cards:p.cards,bestHand:p.bestHand}))};
  }
  broadcast(){this.players.filter(p=>!p.isBot).forEach(p=>{const s=sockets[p.id]?.socket;if(s)s.emit('gameState',this.getState(p.id));});}
  getState(forId){
    return{roomId:this.id,status:this.status,phase:this.phase,pot:this.pot,currentBet:this.currentBet,
      community:this.community,actionIndex:this.actionIndex,dealerIndex:this.dealerIndex,
      smallBlind:this.smallBlind,bigBlind:this.bigBlind,
      players:this.players.map((p,i)=>({
        id:p.id,name:p.name,tokens:p.tokens,bet:p.bet,folded:p.folded,allIn:p.allIn,
        connected:p.connected||p.isBot,bestHand:p.bestHand,isDealer:i===this.dealerIndex,
        isBot:p.isBot,avatar:p.avatar||null,level:p.level||1,
        cards:p.id===forId||this.phase==='showdown'?p.cards:p.cards.map(()=>null)
      }))};
  }
}

// ── Socket.io handlers ───────────────────────────────────
io.on('connection', async socket=>{
  socket.on('register', async ({name,uid,token}) =>{
    // If session token provided, verify it and use the server-side uid
    let id = uid || uuidv4();
    if(token) {
      const verifiedUid = await checkSession(token);
      if(verifiedUid) id = verifiedUid; // trust server, not client
    }
    let u=await getUser(id);
    if(!u){u={uid:id,name,tokens:10000,avatar:null,level:1,xp:0,total_won:0,games_played:0,last_bonus:null};await saveUser(u);}
    if(name && name.trim()) { u.name=name.trim().slice(0,24); await saveUser(u); }
    socket.uid=id;sockets[id]={socket,user:u};
    const lvInfo=getLvInfo(u.xp||0);
    const nextLv=nextLvInfo(u.xp||0);
    const kycRow=await dbGet(`SELECT status,rejection_reason FROM kyc WHERE uid=$1`, [id]);
    const kycStatus=kycRow?.status||'unverified';
    socket.emit('registered',{uid:id,name:u.name,tokens:u.tokens,avatar:u.avatar,level:u.level,xp:u.xp,levelInfo:lvInfo,nextLevel:nextLv,kycStatus,kycRejectionReason:kycRow?.rejection_reason||null});
    const today=new Date().toISOString().split('T')[0];
    if(u.last_bonus!==today) socket.emit('dailyBonusAvailable');
  });

  socket.on('claimDailyBonus', async () =>{
    const rgB=await dbGet(`SELECT self_exclusion_until FROM rg_limits WHERE uid=$1`,[socket.uid]);
    if(rgB?.self_exclusion_until&&new Date(rgB.self_exclusion_until)>new Date())return;
    const r=await claimBonus(socket.uid);if(!r)return;
    if(r.alreadyClaimed){socket.emit('dailyBonusResult',{alreadyClaimed:true});return;}
    if(sockets[socket.uid]) sockets[socket.uid].user.tokens=r.tokens;
    socket.emit('dailyBonusResult',r);
  });

  socket.on('updateAvatar', async ({avatarUrl}) =>{
    const u=await getUser(socket.uid);if(!u)return;u.avatar=avatarUrl;await saveUser(u);
  });

  // NOTE: saveTokens removed — client must never set their own balance directly.
  // All balance changes happen server-side only via game/deposit endpoints.
  socket.on('saveTokens', async () =>{
    // Intentionally disabled for security — emit current balance from DB
    const u=await getUser(socket.uid);if(!u)return;
    socket.emit('balanceSync',{tokens:u.tokens});
  });

  socket.on('getLeaderboard', async () =>{
    socket.emit('leaderboard',await getLeaderboardData());
  });

  socket.on('addXP', async ({xp,game,bet}) =>{
    // Check self-exclusion before any game action
    const rgRow=await dbGet(`SELECT self_exclusion_until,cool_off_until FROM rg_limits WHERE uid=$1`,[socket.uid]);
    if(rgRow){
      const now=new Date();
      if(rgRow.self_exclusion_until&&new Date(rgRow.self_exclusion_until)>now){socket.emit('selfExcluded');return;}
      if(rgRow.cool_off_until&&new Date(rgRow.cool_off_until)>now){socket.emit('coolOff');return;}
    }
    const res=await addXP(socket.uid,xp||10);
    const u=await getUser(socket.uid);if(u){u.games_played=(u.games_played||0)+1;await saveUser(u);}
    if(res&&res.levelUp) socket.emit('levelUp',res.newLevel);
    // Update wagering progress if user has active bonus
    if(bet) await updateWagering(socket.uid, bet);
    // Add to tournament score
    if(xp) await addTournamentScore(socket.uid, game||'slots', xp);
    // Check welcome bonus eligibility (first game)
    if(u && u.games_played===1){
      const existing = await dbGet(`SELECT id FROM bonuses WHERE uid=$1 AND type='welcome'`, [socket.uid]);
      if(!existing){ await giveBonus(socket.uid,'welcome',5000,15); await sendPushToUser(socket.uid, '🎁 Welcome Bonus!', 'You received 5,000 tokens. Start playing!', '/'); socket.emit('bonusAwarded',{type:'welcome',amount:5000,wagering_req:75000}); }
    }
  });

  socket.on('chatMsg', async ({msg,roomId}) =>{
    if(!msg?.trim()||!socket.uid)return;
    const u=await getUser(socket.uid);
    const lv=getLvInfo(u?.xp||0);
    const entry={uid:socket.uid,name:u?.name||'?',msg:msg.trim().slice(0,200),time:Date.now(),levelEmoji:lv.emoji,avatar:u?.avatar||null};
    if(roomId) addChat(roomId,entry);
    else io.emit('globalChat',entry);
  });

  socket.on('emoji', async ({emoji,roomId}) =>{
    const u=await getUser(socket.uid);
    const e={uid:socket.uid,name:u?.name||'?',emoji};
    if(roomId) io.to(roomId).emit('emojiReaction',e);
    else io.emit('emojiReaction',e);
  });

  socket.on('createRoom', async ({buyIn,withBots}) =>{
    const u=await getUser(socket.uid);if(!u)return;
    const roomId=Math.random().toString(36).substr(2,6).toUpperCase();
    const room=new PokerRoom(roomId,socket.uid,buyIn||500,withBots||false);
    pokerRooms[roomId]=room;
    room.addPlayer(socket.uid,u.name,u.tokens,u.avatar,u.level);
    socket.join(roomId);socket.roomId=roomId;
    roomChats[roomId]=[];
    socket.emit('roomCreated',{roomId});
    socket.emit('gameState',room.getState(socket.uid));
    socket.emit('chatHistory',[]);
  });

  socket.on('joinRoom', async ({roomId}) =>{
    const u=await getUser(socket.uid);
    const room=pokerRooms[roomId?.toUpperCase()];
    if(!u)return socket.emit('error','Not registered');
    if(!room)return socket.emit('error','Room not found');
    if(room.status!=='waiting')return socket.emit('error','Game in progress');
    if(!room.addPlayer(socket.uid,u.name,u.tokens,u.avatar,u.level))return socket.emit('error','Table full');
    socket.join(roomId);socket.roomId=roomId.toUpperCase();
    socket.emit('chatHistory',roomChats[roomId.toUpperCase()]||[]);
    addChat(roomId.toUpperCase(),{uid:'system',name:'System',msg:`${u.name} joined the table 🃏`,time:Date.now(),system:true});
    room.broadcast();
  });

  socket.on('startGame', async () =>{
    const room=pokerRooms[socket.roomId];
    if(!room||room.hostId!==socket.uid)return;
    if(room.startGame())room.broadcast();
  });

  socket.on('action', async ({type,amount}) =>{
    const room=pokerRooms[socket.roomId];
    if(!room||room.status!=='playing')return;
    const r=await room.action(socket.uid,type,amount||0);
    if(r){room.broadcast();if(r.event!=='next')io.to(socket.roomId).emit('actionResult',r);}
  });

  socket.on('getRooms', async () =>{
    const rooms = Object.values(pokerRooms).filter(r=>r.status==='waiting');
    const list = await Promise.all(rooms.map(async r=>({id:r.id,host:(await getUser(r.hostId))?.name||'?',players:r.players.filter(p=>!p.isBot).length,bots:r.players.filter(p=>p.isBot).length,buyIn:r.buyIn})));
    socket.emit('roomList', list);
  });

  socket.on('disconnect', async () =>{
    const room=pokerRooms[socket.roomId];
    if(room){room.removePlayer(socket.uid);room.broadcast();}
    if(socket.uid)delete sockets[socket.uid];
  });
});


// ── Game log helper ──────────────────────────────────────
async function logGame(uid, game, bet, result, won) {
  try { await dbRun(`INSERT INTO game_log(uid,game,bet,result,won) VALUES($1,$2,$3,$4,$5)`, [uid,game,bet,result,won?1:0]); } catch(e){}
}

// ── Jackpot ──────────────────────────────────────────────
async function getJackpot() { return await dbGet(`SELECT amount FROM jackpot WHERE id=1`, [])?.amount||50000; }
async function addToJackpot(n) { await dbRun(`UPDATE jackpot SET amount=amount+$1 WHERE id=1`, [n]); io.emit('jackpotUpdate', await getJackpot()); }
async function resetJackpot() { await dbRun(`UPDATE jackpot SET amount=50000 WHERE id=1`, []); io.emit('jackpotUpdate', 50000); }

app.get('/api/jackpot', async (req,res)=>res.json({amount:await getJackpot()}));

// Add jackpot contribution on every bet (1% of bet goes to jackpot)
app.post('/api/log-game', express.json(), async (req,res)=>{
  const {uid,game,bet,result,won} = req.body;
  await logGame(uid, game, bet, result, won);
  if(bet>0) await addToJackpot(Math.floor(bet*0.01));
  if(uid && bet>0) {
    await trackWagering(uid, bet);
    await updateTournamentScore(uid, bet, game);
  }
  res.json({ok:true, jackpot:await getJackpot()});
});

// Jackpot win endpoint
app.post('/api/jackpot-win', express.json(), async (req,res)=>{
  const {uid} = req.body;
  const amount = await getJackpot();
  const u = await getUser(uid);
  if(u){ u.tokens += amount; await saveUser(u); }
  await resetJackpot();
  io.emit('jackpotWon', {name: u?.name||'?', amount});
  res.json({amount});
});

// ── Player stats ─────────────────────────────────────────
app.get('/api/stats/:uid', async (req,res)=>{
  const {uid} = req.params;
  // Auth: only the player themselves or admins can see stats
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const callerUid = await checkSession(token);
  if(!callerUid || callerUid !== uid) return res.status(403).json({error:'Forbidden'});
  const u = await getUser(uid);
  if(!u) return res.status(404).json({error:'Not found'});
  const logs = await dbAll(`SELECT game, bet, result, won, ts FROM game_log WHERE uid=$1 ORDER BY ts DESC LIMIT 100`, [uid]);
  const byGame = {};
  logs.forEach(l=>{
    if(!byGame[l.game]) byGame[l.game]={played:0,won:0,totalBet:0,totalResult:0,biggestWin:0};
    const g=byGame[l.game];
    g.played++; if(l.won)g.won++; g.totalBet+=l.bet; g.totalResult+=l.result;
    if(l.result>g.biggestWin)g.biggestWin=l.result;
  });
  // Last 20 for chart
  const histRaw = await dbAll(`SELECT ts, result, won FROM game_log WHERE uid=$1 ORDER BY ts DESC LIMIT 20`, [uid]);
  const history = Array.isArray(histRaw) ? histRaw.reverse() : [];
  res.json({
    user: {name:u.name,tokens:u.tokens,level:u.level,xp:u.xp,total_won:u.total_won,games_played:u.games_played},
    byGame, history,
    totalGames: logs.length,
    totalWins: logs.filter(l=>l.won).length,
    biggestWin: Math.max(0,...logs.map(l=>l.result)),
  });
});

// ── Update username ───────────────────────────────────────
app.post('/api/user/update-name', express.json(), async (req,res)=>{
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const uid = await checkSession(token);
  if(!uid) return res.status(401).json({error:'Unauthorized'});
  const {name} = req.body||{};
  if(!name||name.trim().length<2) return res.status(400).json({error:'Name must be at least 2 characters'});
  if(name.trim().length>24) return res.status(400).json({error:'Name too long (max 24 chars)'});
  const clean = name.trim().replace(/[<>\"']/g,'');
  // Check uniqueness
  const existing = await dbGet(`SELECT uid FROM users WHERE name=$1 AND uid!=$2`, [clean, uid]);
  if(existing) return res.status(400).json({error:'Name already taken'});
  await dbRun(`UPDATE users SET name=$1 WHERE uid=$2`, [clean, uid]);
  res.json({ok:true, name:clean});
});

// ── P2P Token Transfer ─────────────────────────────────────
app.post('/api/tokens/send', express.json(), async (req,res)=>{
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const uid = await checkSession(token);
  if(!uid) return res.status(401).json({error:'Unauthorized'});
  const {to_name, amount} = req.body||{};
  if(!to_name||!amount) return res.status(400).json({error:'Missing fields'});
  const amt = Math.floor(Number(amount)); // floor to prevent fractional tokens
  if(!Number.isFinite(amt)||amt<1) return res.status(400).json({error:'Invalid amount'});
  if(amt>100000) return res.status(400).json({error:'Max transfer is 100,000 tokens'});
  const sender = await getUser(uid);
  if(!sender) return res.status(404).json({error:'Sender not found'});
  const recipient = await dbGet(`SELECT uid,name FROM users WHERE LOWER(name)=LOWER($1)`, [to_name.trim()]);
  if(!recipient) return res.status(404).json({error:'Player not found'});
  if(recipient.uid === uid) return res.status(400).json({error:'Cannot send to yourself'});
  // Atomic deduction with balance check — prevents race condition TOCTOU
  const deducted = await dbQuery(
    `UPDATE users SET tokens=tokens-$1 WHERE uid=$2 AND tokens>=$1 RETURNING tokens`,
    [amt, uid]);
  if(!deducted.rows.length) return res.status(400).json({error:'Insufficient balance'});
  await dbRun(`UPDATE users SET tokens=tokens+$1 WHERE uid=$2`, [amt, recipient.uid]);
  await dbRun(`INSERT INTO token_transfers(id,from_uid,to_uid,amount,note) VALUES($1,$2,$3,$4,$5)`,
    [require('uuid').v4(), uid, recipient.uid, amt, req.body.note||null]);
  // Notify recipient via socket if online
  try {
    const io = req.app.get('io');
    if(io) io.to(recipient.uid).emit('tokensReceived', {from: sender.name, amount: amt});
  } catch(e){}
  res.json({ok:true, sent:amt, to:recipient.name});
});

// ── P2P Transfer History ───────────────────────────────────
app.get('/api/tokens/transfers', async (req,res)=>{
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const uid = await checkSession(token);
  if(!uid) return res.status(401).json({error:'Unauthorized'});
  const rows = await dbAll(`
    SELECT tt.*, us.name as from_name, ur.name as to_name
    FROM token_transfers tt
    LEFT JOIN users us ON us.uid=tt.from_uid
    LEFT JOIN users ur ON ur.uid=tt.to_uid
    WHERE tt.from_uid=$1 OR tt.to_uid=$1
    ORDER BY tt.created_at DESC LIMIT 50`, [uid]);
  res.json({transfers: rows, uid});
});

// ── Affiliate/Referral DOCX report ────────────────────────
app.get('/api/referral/report.docx', async (req,res)=>{
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const uid = await checkSession(token);
  if(!uid) return res.status(401).json({error:'Unauthorized'});
  try {
    const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle } = require('docx');
    const u = await getUser(uid);
    const refs = await dbAll(`
      SELECT u.name, u.games_played, u.total_won, u.tokens, pr.created_at as joined,
             (SELECT COUNT(*) FROM transactions t WHERE t.uid=u.uid AND t.status='completed' AND t.type='deposit') as deposits
      FROM player_referrals pr
      JOIN users u ON u.uid=pr.referred_uid
      WHERE pr.referrer_uid=$1
      ORDER BY pr.created_at DESC`, [uid]);
    const transfers = await dbAll(`
      SELECT tt.amount, tt.created_at, tt.note, ur.name as to_name, uf.name as from_name
      FROM token_transfers tt
      LEFT JOIN users ur ON ur.uid=tt.to_uid
      LEFT JOIN users uf ON uf.uid=tt.from_uid
      WHERE tt.from_uid=$1 OR tt.to_uid=$1
      ORDER BY tt.created_at DESC LIMIT 100`, [uid]);
    const gameLogs = await dbAll(`SELECT game, bet, result, won, ts FROM game_log WHERE uid=$1 ORDER BY ts DESC LIMIT 200`, [uid]);

    const goldColor = 'C9A84C';
    const darkBg = '0A0806';
    const headerRun = txt => new TextRun({text:txt, bold:true, color:'FFFFFF', size:24, font:'Calibri'});
    const cellRun = txt => new TextRun({text:String(txt||'—'), size:20, font:'Calibri', color:'000000'});
    const hCell = txt => new TableCell({children:[new Paragraph({children:[new TextRun({text:txt,bold:true,size:20,font:'Calibri',color:'FFFFFF'})],alignment:AlignmentType.CENTER})], shading:{fill:goldColor}});
    const dCell = (txt,shade) => new TableCell({children:[new Paragraph({children:[cellRun(txt)],alignment:AlignmentType.CENTER})], shading:shade?{fill:'F5F0E8'}:{}});

    const refRows = refs.map((r,i) => new TableRow({children:[
      dCell(i+1, i%2===0),
      dCell(r.name, i%2===0),
      dCell(new Date(r.joined).toLocaleDateString('lt-LT'), i%2===0),
      dCell(r.games_played||0, i%2===0),
      dCell(r.deposits||0, i%2===0),
      dCell((r.total_won||0).toLocaleString()+' 🪙', i%2===0),
    ]}));

    const gameRows = gameLogs.slice(0,50).map((g,i) => new TableRow({children:[
      dCell(new Date(g.ts).toLocaleString('lt-LT'), i%2===0),
      dCell(g.game||'—', i%2===0),
      dCell((g.bet||0).toLocaleString(), i%2===0),
      dCell((g.result||0).toLocaleString(), i%2===0),
      dCell(g.won?'✓ Laimėjo':'✗ Pralaimėjo', i%2===0),
    ]}));

    const doc = new Document({
      sections:[{
        properties:{},
        children:[
          new Paragraph({children:[new TextRun({text:'HATHOR ROYAL CASINO', bold:true, size:48, color:goldColor, font:'Calibri'})], alignment:AlignmentType.CENTER, heading:HeadingLevel.TITLE}),
          new Paragraph({children:[new TextRun({text:`Žaidėjo ataskaita — ${u.name}`, size:28, color:'666666', font:'Calibri'})], alignment:AlignmentType.CENTER}),
          new Paragraph({children:[new TextRun({text:`Sugeneruota: ${new Date().toLocaleString('lt-LT')}`, size:20, color:'999999', font:'Calibri'})], alignment:AlignmentType.CENTER}),
          new Paragraph({text:''}),
          new Paragraph({children:[new TextRun({text:'📊 Statistika', bold:true, size:32, color:goldColor, font:'Calibri'})], heading:HeadingLevel.HEADING_1}),
          new Table({width:{size:100,type:WidthType.PERCENTAGE}, rows:[
            new TableRow({children:[hCell('Rodiklis'), hCell('Reikšmė')]}),
            new TableRow({children:[dCell('Žaidėjas',true), dCell(u.name,true)]}),
            new TableRow({children:[dCell('Lygis'), dCell(u.level||1)]}),
            new TableRow({children:[dCell('Balansas',true), dCell((u.tokens||0).toLocaleString()+' 🪙',true)]}),
            new TableRow({children:[dCell('Žaidimai'), dCell(u.games_played||0)]}),
            new TableRow({children:[dCell('Iš viso laimėta',true), dCell((u.total_won||0).toLocaleString()+' 🪙',true)]}),
            new TableRow({children:[dCell('Pakvietimų'), dCell(refs.length)]}),
          ]}),
          new Paragraph({text:''}),
          ...(refs.length > 0 ? [
            new Paragraph({children:[new TextRun({text:'👥 Pakviesti žaidėjai', bold:true, size:32, color:goldColor, font:'Calibri'})], heading:HeadingLevel.HEADING_1}),
            new Table({width:{size:100,type:WidthType.PERCENTAGE}, rows:[
              new TableRow({children:[hCell('#'), hCell('Vardas'), hCell('Prisijungė'), hCell('Žaidimai'), hCell('Depozitai'), hCell('Laimėta')]}),
              ...refRows
            ]}),
            new Paragraph({text:''}),
          ] : []),
          new Paragraph({children:[new TextRun({text:'🎲 Žaidimų istorija (paskutiniai 50)', bold:true, size:32, color:goldColor, font:'Calibri'})], heading:HeadingLevel.HEADING_1}),
          ...(gameRows.length > 0 ? [
            new Table({width:{size:100,type:WidthType.PERCENTAGE}, rows:[
              new TableRow({children:[hCell('Data'), hCell('Žaidimas'), hCell('Statymas'), hCell('Rezultatas'), hCell('Baigtis')]}),
              ...gameRows
            ]})
          ] : [new Paragraph({children:[new TextRun({text:'Žaidimų istorija tuščia', size:20, color:'999999', font:'Calibri'})]})]),
          new Paragraph({text:''}),
          new Paragraph({children:[new TextRun({text:'HATHOR Royal Casino — Konfidenciali ataskaita', size:16, color:'AAAAAA', font:'Calibri', italics:true})], alignment:AlignmentType.CENTER}),
        ]
      }]
    });

    const buf = await Packer.toBuffer(doc);
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition',`attachment; filename="hathor-report-${u.name}-${new Date().toISOString().slice(0,10)}.docx"`);
    res.send(buf);
  } catch(e) {
    console.error('DOCX report error:', e.message);
    res.status(500).json({error:'Report generation failed: '+e.message});
  }
});

// ── Stats Charts endpoint ─────────────────────────────────
app.get('/api/stats/charts', async (req, res) => {
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const uid = await checkSession(token);
  if (!uid) return res.status(401).json({error:'Unauthorized'});
  try {
    const now = new Date();
    const days = [];
    const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0,10));
    }
    const labels = days.map(d => dayLabels[new Date(d).getDay()]);
    // wins per day
    const winsPerDay = await Promise.all(days.map(async (d) => {
      const r = await dbGet(
        `SELECT COUNT(*) as c FROM game_log WHERE uid=$1 AND DATE(ts)=$2 AND won=1`,
        [uid, d]
      );
      return (r && r.c) ? Number(r.c) : 0;
    }));
    // losses per day
    const lossesPerDay = await Promise.all(days.map(async (d) => {
      const r = await dbGet(
        `SELECT COUNT(*) as c FROM game_log WHERE uid=$1 AND DATE(ts)=$2 AND won=0`,
        [uid, d]
      );
      return (r && r.c) ? Number(r.c) : 0;
    }));
    // game breakdown
    const gameRows = await dbAll(
      `SELECT game, COUNT(*) as cnt FROM game_log WHERE uid=$1 GROUP BY game ORDER BY cnt DESC LIMIT 6`,
      [uid]
    );
    const gameLabels = (gameRows||[]).map(r => r.game.charAt(0).toUpperCase()+r.game.slice(1));
    const gameValues = (gameRows||[]).map(r => Number(r.cnt));
    // recent games
    const recent = await dbAll(
      `SELECT game, bet, result, won, ts FROM game_log WHERE uid=$1 ORDER BY ts DESC LIMIT 10`,
      [uid]
    );
    const recentGames = (recent||[]).map(r => {
      const minsAgo = Math.round((Date.now() - new Date(r.ts).getTime()) / 60000);
      const timeStr = minsAgo < 1 ? 'Just now' : minsAgo < 60 ? minsAgo+'m ago' : Math.round(minsAgo/60)+'h ago';
      return { game: r.game, bet: r.bet, win: r.won ? r.result : 0, won: !!r.won, time: timeStr };
    });
    res.json({
      winLoss: { labels, wins: winsPerDay, losses: lossesPerDay },
      gameBreakdown: { labels: gameLabels, values: gameValues },
      recentGames,
    });
  } catch(e) {
    console.error('Stats charts error:', e);
    res.status(500).json({error:'Failed'});
  }
});

// ── AI Croupier ──────────────────────────────────────────
app.post('/api/croupier', express.json(), async (req,res)=>{
  const {uid, message, context} = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if(!apiKey) return res.json({reply:'Viktor is currently unavailable.'});
  const u = await getUser(uid)||{name:'Player',tokens:0,level:1};
  const logs = await dbAll(`SELECT game,won FROM game_log WHERE uid=$1 ORDER BY ts DESC LIMIT 10`, [uid]);
  const recentGames = logs.map(l=>`${l.game}(${l.won?'won':'lost'})`).join(', ')||'none yet';
  const jackpot = await getJackpot();
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'x-api-key':apiKey,'anthropic-version':'2023-06-01','content-type':'application/json'},
      body: JSON.stringify({
        model:'claude-haiku-4-5-20251001',
        max_tokens:200,
        system:`You are Viktor, the charming AI croupier at HATHOR Royal Casino — an elegant, witty, slightly mysterious casino dealer. You know the player personally.

Player: ${u.name} | Balance: ${u.tokens.toLocaleString()} tokens | Level: ${u.level} | Recent: ${recentGames} | Jackpot now: ${jackpot.toLocaleString()} tokens.
Current game/context: ${context||'lobby'}.

Rules:
- Be concise (1-3 sentences max)
- Be charming, sophisticated, with subtle humor
- Give relevant tips when asked
- React to wins with excitement, losses with sympathy
- Mention the jackpot occasionally
- Respond in the SAME language the player uses (Lithuanian, Russian, English, etc)
- Never break character`,
        messages:[{role:'user',content:message}]
      })
    });
    const text = await response.text();
    console.log('Anthropic raw response:', text.slice(0,200));
    let reply = 'Viktor is currently unavailable...';
    try {
      const data = JSON.parse(text);
      if(data.content && data.content[0] && data.content[0].text) {
        reply = data.content[0].text;
      } else if(data.error) {
        console.error('Anthropic error:', data.error);
        reply = 'Error: ' + (data.error.message||'unknown');
      }
    } catch(e) { console.error('Parse error:', e.message); }
    res.json({reply});
  } catch(e) {
    res.json({reply:'The connection to my crystal ball is momentarily disrupted... try again!'});
  }
});

// ── Sports Betting API proxy ─────────────────────────────
const https = require('https');
function fetchOdds(apiKey, sport, cb) {
  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal&dateFormat=iso`;
  https.get(url, res => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      try { cb(null, JSON.parse(data)); } catch(e) { cb(e); }
    });
  }).on('error', cb);
}

const SPORTS_MAP = {
  soccer_epl:               '⚽ Premier League',
  soccer_spain_la_liga:     '⚽ La Liga',
  soccer_germany_bundesliga:'⚽ Bundesliga',
  soccer_italy_serie_a:     '⚽ Serie A',
  soccer_uefa_champs_league:'⚽ Champions League',
  basketball_nba:           '🏀 NBA',
  basketball_euroleague:    '🏀 Euroleague',
  tennis_atp_french_open:   '🎾 Tennis ATP',
  icehockey_nhl:            '🏒 NHL',
  americanfootball_nfl:     '🏈 NFL',
  baseball_mlb:             '⚾ MLB',
  mma_mixed_martial_arts:   '🥊 MMA / UFC',
};

app.get('/api/sports', async (req, res) => {
  // Use server env var first (more secure), fallback to query param for backwards compat
  const apiKey = process.env.ODDS_API_KEY || req.query.apiKey;
  const sport  = req.query.sport || 'soccer_epl';
  if (!apiKey) return res.status(400).json({ error: 'No API key' });
  fetchOdds(apiKey, sport, (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!Array.isArray(data)) return res.json([]);
    const games = data.slice(0, 12).map(g => ({
      id: g.id,
      sport: sport,
      home: g.home_team,
      away: g.away_team,
      time: g.commence_time,
      odds: (() => {
        const market = g.bookmakers?.[0]?.markets?.[0]?.outcomes || [];
        const h = market.find(o => o.name === g.home_team)?.price || 2;
        const a = market.find(o => o.name === g.away_team)?.price || 2;
        const d = market.find(o => o.name === 'Draw')?.price || null;
        return { home: h, away: a, draw: d };
      })()
    }));
    res.json(games);
  });
});

app.get('/api/sports-list', async (req, res) => {
  res.json(Object.entries(SPORTS_MAP).map(([k,v]) => ({ key: k, name: v })));
});





// ══════════════════════════════════════════════════════════
// DEMO SPORTS DATA (when no API key)
// ══════════════════════════════════════════════════════════
const DEMO_MATCHES = {
  soccer_epl: [
    {id:'epl1',home:'Manchester City',away:'Arsenal',time:new Date(Date.now()+3600000*2).toISOString(),odds:{home:1.85,draw:3.60,away:4.20}},
    {id:'epl2',home:'Liverpool',away:'Chelsea',time:new Date(Date.now()+3600000*5).toISOString(),odds:{home:2.10,draw:3.40,away:3.50}},
    {id:'epl3',home:'Manchester United',away:'Tottenham',time:new Date(Date.now()+3600000*8).toISOString(),odds:{home:2.40,draw:3.20,away:3.00}},
    {id:'epl4',home:'Newcastle',away:'Aston Villa',time:new Date(Date.now()+86400000).toISOString(),odds:{home:2.20,draw:3.30,away:3.40}},
    {id:'epl5',home:'Brighton',away:'West Ham',time:new Date(Date.now()+86400000*2).toISOString(),odds:{home:1.95,draw:3.50,away:4.00}},
  ],
  soccer_spain_la_liga: [
    {id:'ll1',home:'Real Madrid',away:'Barcelona',time:new Date(Date.now()+3600000*3).toISOString(),odds:{home:2.05,draw:3.50,away:3.60}},
    {id:'ll2',home:'Atletico Madrid',away:'Sevilla',time:new Date(Date.now()+3600000*6).toISOString(),odds:{home:1.75,draw:3.60,away:5.00}},
    {id:'ll3',home:'Valencia',away:'Villarreal',time:new Date(Date.now()+86400000).toISOString(),odds:{home:2.30,draw:3.20,away:3.20}},
  ],
  basketball_nba: [
    {id:'nba1',home:'LA Lakers',away:'Golden State Warriors',time:new Date(Date.now()+3600000*4).toISOString(),odds:{home:1.90,away:2.00}},
    {id:'nba2',home:'Boston Celtics',away:'Miami Heat',time:new Date(Date.now()+3600000*6).toISOString(),odds:{home:1.65,away:2.30}},
    {id:'nba3',home:'Milwaukee Bucks',away:'Philadelphia 76ers',time:new Date(Date.now()+86400000).toISOString(),odds:{home:1.80,away:2.10}},
    {id:'nba4',home:'Dallas Mavericks',away:'Phoenix Suns',time:new Date(Date.now()+86400000).toISOString(),odds:{home:2.10,away:1.80}},
  ],
  basketball_euroleague: [
    {id:'el1',home:'Real Madrid',away:'Panathinaikos',time:new Date(Date.now()+3600000*5).toISOString(),odds:{home:1.60,away:2.40}},
    {id:'el2',home:'Fenerbahce',away:'Olimpia Milano',time:new Date(Date.now()+3600000*8).toISOString(),odds:{home:1.85,away:2.05}},
    {id:'el3',home:'Zalgiris Kaunas',away:'FC Barcelona',time:new Date(Date.now()+86400000).toISOString(),odds:{home:3.20,away:1.38}},
    {id:'el4',home:'Maccabi Tel Aviv',away:'Bayern Munich',time:new Date(Date.now()+86400000).toISOString(),odds:{home:2.30,away:1.65}},
    {id:'el5',home:'Olympiacos',away:'Virtus Bologna',time:new Date(Date.now()+86400000*2).toISOString(),odds:{home:1.75,away:2.15}},
  ],
  tennis_atp_french_open: [
    {id:'t1',home:'C. Alcaraz',away:'N. Djokovic',time:new Date(Date.now()+3600000*2).toISOString(),odds:{home:2.10,away:1.75}},
    {id:'t2',home:'J. Sinner',away:'A. Zverev',time:new Date(Date.now()+3600000*4).toISOString(),odds:{home:1.80,away:2.05}},
    {id:'t3',home:'H. Hurkacz',away:'S. Tsitsipas',time:new Date(Date.now()+86400000).toISOString(),odds:{home:1.95,away:1.90}},
  ],
  icehockey_nhl: [
    {id:'nhl1',home:'Colorado Avalanche',away:'Vegas Golden Knights',time:new Date(Date.now()+3600000*6).toISOString(),odds:{home:1.85,draw:4.00,away:2.10}},
    {id:'nhl2',home:'Toronto Maple Leafs',away:'Boston Bruins',time:new Date(Date.now()+86400000).toISOString(),odds:{home:2.20,draw:4.20,away:1.85}},
  ],
  soccer_germany_bundesliga: [
    {id:'bun1',home:'Bayern Munich',away:'Borussia Dortmund',time:new Date(Date.now()+3600000*3).toISOString(),odds:{home:1.65,draw:3.80,away:5.00}},
    {id:'bun2',home:'RB Leipzig',away:'Bayer Leverkusen',time:new Date(Date.now()+3600000*6).toISOString(),odds:{home:2.10,draw:3.30,away:3.50}},
    {id:'bun3',home:'Eintracht Frankfurt',away:'Borussia Monchengladbach',time:new Date(Date.now()+86400000).toISOString(),odds:{home:1.90,draw:3.40,away:4.20}},
  ],
  soccer_italy_serie_a: [
    {id:'sa1',home:'Internazionale',away:'AC Milan',time:new Date(Date.now()+3600000*4).toISOString(),odds:{home:2.00,draw:3.40,away:3.80}},
    {id:'sa2',home:'Juventus',away:'Napoli',time:new Date(Date.now()+3600000*7).toISOString(),odds:{home:2.20,draw:3.30,away:3.30}},
    {id:'sa3',home:'AS Roma',away:'Lazio',time:new Date(Date.now()+86400000).toISOString(),odds:{home:2.30,draw:3.20,away:3.10}},
  ],
  soccer_uefa_champs_league: [
    {id:'ucl1',home:'Real Madrid',away:'Bayern Munich',time:new Date(Date.now()+3600000*5).toISOString(),odds:{home:1.95,draw:3.60,away:3.80}},
    {id:'ucl2',home:'Manchester City',away:'PSG',time:new Date(Date.now()+3600000*8).toISOString(),odds:{home:1.70,draw:3.70,away:4.80}},
    {id:'ucl3',home:'Barcelona',away:'Inter Milan',time:new Date(Date.now()+86400000).toISOString(),odds:{home:1.85,draw:3.50,away:4.30}},
    {id:'ucl4',home:'Liverpool',away:'Atletico Madrid',time:new Date(Date.now()+86400000*2).toISOString(),odds:{home:1.80,draw:3.60,away:4.50}},
  ],
  americanfootball_nfl: [
    {id:'nfl1',home:'Kansas City Chiefs',away:'San Francisco 49ers',time:new Date(Date.now()+3600000*5).toISOString(),odds:{home:1.75,away:2.15}},
    {id:'nfl2',home:'Buffalo Bills',away:'Miami Dolphins',time:new Date(Date.now()+86400000).toISOString(),odds:{home:1.60,away:2.45}},
    {id:'nfl3',home:'Dallas Cowboys',away:'Philadelphia Eagles',time:new Date(Date.now()+86400000).toISOString(),odds:{home:2.00,away:1.90}},
    {id:'nfl4',home:'Baltimore Ravens',away:'Cincinnati Bengals',time:new Date(Date.now()+86400000*2).toISOString(),odds:{home:1.85,away:2.05}},
  ],
  baseball_mlb: [
    {id:'mlb1',home:'New York Yankees',away:'Boston Red Sox',time:new Date(Date.now()+3600000*3).toISOString(),odds:{home:1.70,away:2.25}},
    {id:'mlb2',home:'Los Angeles Dodgers',away:'San Francisco Giants',time:new Date(Date.now()+3600000*6).toISOString(),odds:{home:1.55,away:2.60}},
    {id:'mlb3',home:'Houston Astros',away:'Texas Rangers',time:new Date(Date.now()+86400000).toISOString(),odds:{home:1.80,away:2.10}},
  ],
  mma_mixed_martial_arts: [
    {id:'mma1',home:'Jon Jones',away:'Stipe Miocic',time:new Date(Date.now()+3600000*10).toISOString(),odds:{home:1.45,away:2.80}},
    {id:'mma2',home:'Islam Makhachev',away:'Charles Oliveira',time:new Date(Date.now()+86400000).toISOString(),odds:{home:1.55,away:2.55}},
    {id:'mma3',home:'Alex Pereira',away:'Jiri Prochazka',time:new Date(Date.now()+86400000*3).toISOString(),odds:{home:1.75,away:2.15}},
  ],
};

// Override sports endpoint to serve demo data when no API key
app.get('/api/sports-demo', async (req,res)=>{
  const sport = req.query.sport || 'soccer_epl';
  const matches = DEMO_MATCHES[sport] || DEMO_MATCHES.soccer_epl;
  // Randomize odds slightly each request for realism
  const live = matches.map(m=>({
    ...m,
    odds:{
      home: parseFloat((m.odds.home + (Math.random()-.5)*.1).toFixed(2)),
      draw: m.odds.draw ? parseFloat((m.odds.draw + (Math.random()-.5)*.1).toFixed(2)) : undefined,
      away: parseFloat((m.odds.away + (Math.random()-.5)*.1).toFixed(2)),
    }
  }));
  res.json(live);
});


// ══════════════════════════════════════════════════════════
// CRYPTO PAYMENTS — NOWPayments
// ══════════════════════════════════════════════════════════
const NOW_API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const NOW_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || '';
const NOW_BASE = 'https://api.nowpayments.io/v1';

// Supported currencies (stablecoins only)
const CRYPTO_CURRENCIES = [
  { id: 'usdt', name: 'Tether USD', symbol: 'USDT', icon: '₮', tokensPerUnit: 100, cgId: 'tether',
    networks: [
      { id: 'trc20',   label: 'TRC-20',   chain: 'TRON',     color: '#ff4444', fee: 'Free',   nowId: 'usdttrc20' },
      { id: 'erc20',   label: 'ERC-20',   chain: 'Ethereum', color: '#627eea', fee: '~$2',    nowId: 'usdterc20' },
      { id: 'bep20',   label: 'BEP-20',   chain: 'BSC',      color: '#f0b90b', fee: '~$0.10', nowId: 'usdtbsc'   },
    ]
  },
  { id: 'usdc', name: 'USD Coin', symbol: 'USDC', icon: '◎', tokensPerUnit: 100, cgId: 'usd-coin',
    networks: [
      { id: 'polygon', label: 'Polygon',  chain: 'Polygon',  color: '#8247e5', fee: '~$0.01', nowId: 'usdcmatic' },
      { id: 'erc20',   label: 'ERC-20',   chain: 'Ethereum', color: '#627eea', fee: '~$2',    nowId: 'usdcerc20' },
      { id: 'solana',  label: 'Solana',   chain: 'Solana',   color: '#9945ff', fee: '~$0.01', nowId: 'usdcsol'   },
    ]
  },
  { id: 'eurc', name: 'Euro Coin', symbol: 'EURC', icon: '€', tokensPerUnit: 107, cgId: 'euro-coin',
    networks: [
      { id: 'erc20',  label: 'ERC-20',  chain: 'Ethereum', color: '#627eea', fee: '~$2',    nowId: 'eurcerc20' },
      { id: 'solana', label: 'Solana',  chain: 'Solana',   color: '#9945ff', fee: '~$0.01', nowId: 'eurcsol'   },
    ]
  },
];

// Create transactions table


// Helper: NOWPayments API call
async function nowFetch(endpoint, method='GET', body=null) {
  const opts = {
    method,
    headers: { 'x-api-key': NOW_API_KEY, 'Content-Type': 'application/json' }
  };
  if(body) opts.body = JSON.stringify(body);
  const r = await fetch(NOW_BASE + endpoint, opts);
  return r.json();
}

// Get available currencies
app.get('/api/crypto/currencies', async (req,res)=>{
  res.json({ currencies: CRYPTO_CURRENCIES });
});

// Get exchange estimate
app.get('/api/crypto/estimate', async (req,res)=>{
  const { currency, tokenAmount } = req.query;
  const cur = CRYPTO_CURRENCIES.find(c=>c.id===currency);
  if(!cur) return res.status(400).json({error:'Unknown currency'});
  const cryptoAmount = (parseInt(tokenAmount)/cur.tokensPerUnit).toFixed(8);
  // Minimum deposit = 500 tokens (= 5 USDT)
  const minTokens = 500;
  res.json({ cryptoAmount, currency, tokenAmount, minTokens, rate: cur.tokensPerUnit });
});

// Create deposit
app.post('/api/crypto/deposit', express.json(), async (req,res)=>{
  const { uid, currency, tokenAmount, network } = req.body;
  if(!uid || !currency || !tokenAmount) return res.status(400).json({error:'Missing fields'});
  if(tokenAmount < 500) return res.status(400).json({error:'Minimum deposit is 500 tokens (5 USDT)'});
  const cur = CRYPTO_CURRENCIES.find(c=>c.id===currency);
  if(!cur) return res.status(400).json({error:'Unknown currency'});
  const cryptoAmount = (tokenAmount/cur.tokensPerUnit).toFixed(8);
  // Resolve network — default to first network
  const net = (cur.networks||[]).find(n=>n.id===network) || (cur.networks||[])[0];
  const payCurrency = net ? net.nowId : currency;

  if(!NOW_API_KEY) {
    // DEMO MODE — no real API key
    const demoId = 'DEMO_' + Date.now();
    const demoAddresses = {
      trc20:   'TRx8UMDWaFBXqVYmKsTbMsxwmQqBj1qGmD',
      erc20:   '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      bep20:   '0x1a2b3c4D5e6F7a8b9C0D1e2f3A4B5c6D7e8f9A0b',
      polygon: '0x9Ef9e3B0AB123456789abcdef1234567890abcde',
      solana:  'DRpbCBMxVnDK7mVeX9q7NkDmjJsWk7LhZm3h4VDZJ',
    };
    const demoAddress = demoAddresses[net?.id] || demoAddresses.erc20;
    await dbRun(`INSERT INTO transactions(id,uid,type,currency,amount_crypto,amount_tokens,status,payment_id,payment_address)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [demoId,uid,'deposit',currency,cryptoAmount,tokenAmount,'waiting',demoId,demoAddress]);
    return res.json({
      paymentId: demoId,
      address: demoAddress,
      amount: cryptoAmount,
      currency: cur.symbol,
      network: net ? { id: net.id, label: net.label, chain: net.chain } : null,
      tokenAmount,
      expiresIn: 3600,
      demo: true
    });
  }

  try {
    const payment = await nowFetch('/payment', 'POST', {
      price_amount: cryptoAmount,
      price_currency: currency,
      pay_currency: payCurrency,
      order_id: `${uid}_${Date.now()}`,
      order_description: `HATHOR Casino deposit — ${tokenAmount} tokens`,
      ipn_callback_url: process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/api/crypto/ipn`
        : null
    });
    if(payment.id) {
      await dbRun(`INSERT INTO transactions(id,uid,type,currency,amount_crypto,amount_tokens,status,payment_id,payment_address)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [payment.id, uid, 'deposit', currency, cryptoAmount, tokenAmount,
          'waiting', payment.id, payment.pay_address]);
      res.json({
        paymentId: payment.id,
        address: payment.pay_address,
        amount: payment.pay_amount,
        currency: cur.symbol,
        network: net ? { id: net.id, label: net.label, chain: net.chain } : null,
        tokenAmount,
        expiresIn: 3600
      });
    } else {
      res.status(500).json({error: payment.message||'Payment creation failed'});
    }
  } catch(e) {
    res.status(500).json({error:'Payment service unavailable'});
  }
});

// Check payment status
app.get('/api/crypto/status/:paymentId', async (req,res)=>{
  const tx = await dbGet(`SELECT * FROM transactions WHERE payment_id=$1`, [req.params.paymentId]);
  if(!tx) return res.status(404).json({error:'Not found'});
  
  // Demo mode — simulate confirmation after 60s
  if(tx.payment_id.startsWith('DEMO_')) {
    const age = Date.now() - parseInt(tx.payment_id.split('_')[1]);
    if(age > 60000 && tx.status === 'waiting') {
      await dbRun(`UPDATE transactions SET status=$1 WHERE payment_id=$2`, ['finished', tx.payment_id]);
      await dbRun(`UPDATE users SET tokens=tokens+$1 WHERE uid=$2`, [tx.amount_tokens, tx.uid]);
      await checkAndRecordFTD(tx.uid, tx.amount_tokens);
      await checkFirstDepositBonus(tx.uid, tx.amount_tokens);
      io.to(tx.uid).emit('depositConfirmed', {tokens: tx.amount_tokens, currency: tx.currency});
      // Deposit email
      try {
        const depUser = await dbGet(`SELECT a.email, u.tokens FROM auth a JOIN users u ON a.uid=u.uid WHERE a.uid=$1`, [tx.uid]);
        if (depUser?.email) {
          const eurAmount = (tx.amount_tokens / 100).toFixed(2);
          await sendEmail(depUser.email, 'Deposit confirmed — HATHOR Casino', emailTemplate(
            'Deposit Confirmed ✅',
            `<p style="color:rgba(232,226,212,0.7);line-height:1.7">Your deposit of <strong style="color:#c9a84c">€${eurAmount}</strong> has been confirmed. Your new balance: <strong style="color:#c9a84c">${depUser.tokens} tokens</strong></p>`
          ));
        }
      } catch(e) {}
      return res.json({status:'finished', tokens: tx.amount_tokens, demo:true});
    }
    return res.json({status: tx.status, demo:true});
  }
  
  if(!NOW_API_KEY) return res.json({status: tx.status});
  try {
    const data = await nowFetch(`/payment/${tx.payment_id}`);
    if(data.payment_status !== tx.status) {
      await dbRun(`UPDATE transactions SET status=$1,updated_at=NOW() WHERE payment_id=$2`, [data.payment_status, tx.payment_id]);
      if(data.payment_status === 'finished' && tx.status !== 'finished') {
        await dbRun(`UPDATE users SET tokens=tokens+$1 WHERE uid=$2`, [tx.amount_tokens, tx.uid]);
        await checkAndRecordFTD(tx.uid, tx.amount_tokens);
        await checkFirstDepositBonus(tx.uid, tx.amount_tokens);
        io.to(tx.uid).emit('depositConfirmed', {tokens: tx.amount_tokens, currency: tx.currency});
        try {
          const depUser = await dbGet(`SELECT a.email, u.tokens FROM auth a JOIN users u ON a.uid=u.uid WHERE a.uid=$1`, [tx.uid]);
          if (depUser?.email) {
            const eurAmount = (tx.amount_tokens / 100).toFixed(2);
            await sendEmail(depUser.email, 'Deposit confirmed — HATHOR Casino', emailTemplate(
              'Deposit Confirmed ✅',
              `<p style="color:rgba(232,226,212,0.7);line-height:1.7">Your deposit of <strong style="color:#c9a84c">€${eurAmount}</strong> has been confirmed. Your new balance: <strong style="color:#c9a84c">${depUser.tokens} tokens</strong></p>`
            ));
          }
        } catch(e) {}
      }
    }
    res.json({status: data.payment_status, tokens: tx.amount_tokens});
  } catch(e) {
    res.json({status: tx.status});
  }
});

// IPN webhook — NOWPayments calls this when payment status changes
app.post('/api/crypto/ipn', express.json(), async (req,res)=>{
  // Verify IPN signature — mandatory if secret is configured
  const sig = req.headers['x-nowpayments-sig'];
  if(NOW_IPN_SECRET) {
    if(!sig) { console.warn('IPN: missing signature, rejecting'); return res.status(403).json({error:'Missing signature'}); }
    const crypto = require('crypto');
    const sorted = JSON.stringify(req.body, Object.keys(req.body).sort());
    const hmac = crypto.createHmac('sha512', NOW_IPN_SECRET).update(sorted).digest('hex');
    if(hmac !== sig) { console.warn('IPN: invalid signature'); return res.status(403).json({error:'Invalid signature'}); }
  } else {
    console.warn('IPN: NOWPAYMENTS_IPN_SECRET not set — webhook unverified. Set env var for production!');
  }
  const { payment_id, payment_status, order_id } = req.body;
  const tx = await dbGet(`SELECT * FROM transactions WHERE payment_id=$1`, [payment_id]);
  if(!tx) return res.status(404).json({error:'Not found'});
  await dbRun(`UPDATE transactions SET status=$1,updated_at=NOW() WHERE payment_id=$2`, [payment_status, payment_id]);
  if(payment_status === 'finished' && tx.status !== 'finished') {
    await dbRun(`UPDATE users SET tokens=tokens+$1 WHERE uid=$2`, [tx.amount_tokens, tx.uid]);
    await checkAndRecordFTD(tx.uid, tx.amount_tokens);
    await checkFirstDepositBonus(tx.uid, tx.amount_tokens);
    io.to(tx.uid).emit('depositConfirmed', {tokens: tx.amount_tokens, currency: tx.currency});
    try {
      const depUser = await dbGet(`SELECT a.email, u.tokens FROM auth a JOIN users u ON a.uid=u.uid WHERE a.uid=$1`, [tx.uid]);
      if (depUser?.email) {
        const eurAmount = (tx.amount_tokens / 100).toFixed(2);
        await sendEmail(depUser.email, 'Deposit confirmed — HATHOR Casino', emailTemplate(
          'Deposit Confirmed ✅',
          `<p style="color:rgba(232,226,212,0.7);line-height:1.7">Your deposit of <strong style="color:#c9a84c">€${eurAmount}</strong> has been confirmed. Your new balance: <strong style="color:#c9a84c">${depUser.tokens} tokens</strong></p>`
        ));
      }
    } catch(e) {}
  }
  res.json({ok:true});
});

// Withdrawal request
app.post('/api/crypto/withdraw', express.json(), async (req,res)=>{
  const { uid, currency, tokenAmount, address } = req.body;
  if(!uid || !currency || !tokenAmount || !address) return res.status(400).json({error:'Missing fields'});
  if(tokenAmount < 5000) return res.status(400).json({error:'Minimum withdrawal is 5,000 tokens'});
  const user = await getUser(uid);
  if(!user) return res.status(404).json({error:'User not found'});
  if(user.tokens < tokenAmount) return res.status(400).json({error:'Insufficient tokens'});
  const cur = CRYPTO_CURRENCIES.find(c=>c.id===currency);
  if(!cur) return res.status(400).json({error:'Unknown currency'});
  const cryptoAmount = (tokenAmount/cur.tokensPerUnit).toFixed(8);
  // Deduct tokens immediately (hold)
  await dbRun(`UPDATE users SET tokens=tokens-$1 WHERE uid=$2`, [tokenAmount, uid]);
  const txId = 'WD_' + Date.now() + '_' + uid.slice(0,8);
  await dbRun(`INSERT INTO transactions(id,uid,type,currency,amount_crypto,amount_tokens,status,payment_address)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [txId, uid, 'withdrawal', currency, cryptoAmount, tokenAmount, 'pending', address]);
  // In demo/manual mode — admin processes withdrawals
  res.json({ok:true, txId, cryptoAmount, currency:cur.symbol, message:'Withdrawal queued. Processing within 24h.'});
});

// Transaction history
app.get('/api/crypto/history/:uid', async (req,res)=>{
  const txs = await dbAll(`SELECT * FROM transactions WHERE uid=$1 ORDER BY created_at DESC LIMIT 50`, [req.params.uid]);
  res.json(txs);
});

// Admin: pending withdrawals
app.get('/admin/withdrawals', adminAuth, async (req,res)=>{
  const pending = await dbAll(`SELECT t.*,u.name FROM transactions t JOIN users u ON t.uid=u.uid WHERE t.type='withdrawal' AND t.status='pending' ORDER BY t.created_at DESC`, []);
  res.json(pending);
});

// Admin: mark withdrawal as paid
app.post('/admin/withdrawal-paid/:txId', adminAuth, express.json(), async (req,res)=>{
  const {txHash} = req.body;
  await dbRun(`UPDATE transactions SET status='finished',tx_hash=$1,updated_at=NOW() WHERE id=$2`, [txHash||'manual', req.params.txId]);
  res.json({ok:true});
});


// ══════════════════════════════════════════════════════════
// PROVABLY FAIR SYSTEM
// ══════════════════════════════════════════════════════════

function generateServerSeed() {
  return crypto.randomBytes(32).toString('hex');
}

function hashSeed(seed) {
  return crypto.createHash('sha256').update(seed).digest('hex');
}

function generateResult(serverSeed, clientSeed, nonce, max) {
  // HMAC-SHA256 combination - industry standard
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  const hmac = crypto.createHmac('sha256', serverSeed).update(combined).digest('hex');
  // Take first 8 hex chars → convert to number → scale to range
  const decimal = parseInt(hmac.slice(0, 8), 16);
  return (decimal % max);
}

// Store active seeds per user
const userSeeds = {}; // uid -> {serverSeed, hashedServerSeed, clientSeed, nonce}

function getOrCreateSeed(uid) {
  if(!userSeeds[uid]) {
    const serverSeed = generateServerSeed();
    userSeeds[uid] = {
      serverSeed,
      hashedServerSeed: hashSeed(serverSeed),
      clientSeed: crypto.randomBytes(16).toString('hex'),
      nonce: 0
    };
  }
  return userSeeds[uid];
}

// API: Get current seed info (hashed only - never reveal server seed before game!)
app.get('/api/provably-fair/seeds/:uid', async (req,res)=>{
  const seeds = getOrCreateSeed(req.params.uid);
  res.json({
    hashedServerSeed: seeds.hashedServerSeed,
    clientSeed: seeds.clientSeed,
    nonce: seeds.nonce,
    info: 'Server seed is hidden until you rotate. After rotating, previous seed is revealed.'
  });
});

// API: Player sets their own client seed
app.post('/api/provably-fair/client-seed', express.json(), async (req,res)=>{
  const {uid, clientSeed} = req.body;
  if(!uid || !clientSeed) return res.status(400).json({error:'Missing fields'});
  const seeds = getOrCreateSeed(uid);
  seeds.clientSeed = clientSeed.slice(0, 64); // max 64 chars
  res.json({ok:true, clientSeed: seeds.clientSeed, hashedServerSeed: seeds.hashedServerSeed});
});

// API: Rotate seeds (reveals old server seed, generates new one)
app.post('/api/provably-fair/rotate', express.json(), async (req,res)=>{
  const {uid} = req.body;
  const seeds = getOrCreateSeed(uid);
  const oldServerSeed = seeds.serverSeed; // Now we can reveal this
  const newServerSeed = generateServerSeed();
  userSeeds[uid] = {
    serverSeed: newServerSeed,
    hashedServerSeed: hashSeed(newServerSeed),
    clientSeed: seeds.clientSeed,
    nonce: 0
  };
  res.json({
    ok: true,
    previousServerSeed: oldServerSeed,  // Revealed!
    newHashedServerSeed: hashSeed(newServerSeed),
    clientSeed: seeds.clientSeed
  });
});

// API: Verify a past game result
app.post('/api/provably-fair/verify', express.json(), async (req,res)=>{
  const {serverSeed, clientSeed, nonce, game, result} = req.body;
  if(!serverSeed || !clientSeed || nonce === undefined) return res.status(400).json({error:'Missing fields'});
  
  let max, computedResult, verified = false;
  
  if(game === 'roulette') {
    computedResult = generateResult(serverSeed, clientSeed, nonce, 37);
    verified = computedResult === parseInt(result);
  } else if(game === 'slots') {
    // 5 reels x 3 rows = 15 symbols
    const symbols = [];
    for(let i=0;i<15;i++) {
      symbols.push(generateResult(serverSeed, clientSeed, nonce*100+i, 8));
    }
    computedResult = symbols;
    verified = true; // Show what the result should have been
  } else if(game === 'blackjack') {
    // Verify deck order
    const deck = [];
    for(let i=0;i<52;i++) {
      deck.push(generateResult(serverSeed, clientSeed, nonce*100+i, 52-i));
    }
    computedResult = deck;
    verified = true;
  } else if(game === 'coin') {
    computedResult = generateResult(serverSeed, clientSeed, nonce, 2);
    verified = computedResult === parseInt(result);
  }
  
  res.json({
    verified,
    computedResult,
    hashedServerSeed: hashSeed(serverSeed),
    serverSeed,
    clientSeed,
    nonce,
    game
  });
});

// Provably fair spin for slots
app.post('/api/pf/slots', express.json(), async (req,res)=>{
  const {uid, machineSymbols} = req.body;
  const seeds = getOrCreateSeed(uid);
  seeds.nonce++;
  const grid = [];
  const symCount = machineSymbols || 8;
  for(let col=0;col<5;col++){
    const column = [];
    for(let row=0;row<3;row++){
      const idx = col*3+row;
      column.push(generateResult(seeds.serverSeed, seeds.clientSeed, seeds.nonce*100+idx, symCount));
    }
    grid.push(column);
  }
  res.json({
    grid, // symbol indices
    nonce: seeds.nonce,
    hashedServerSeed: seeds.hashedServerSeed,
    clientSeed: seeds.clientSeed
  });
});

// Provably fair roulette spin
app.post('/api/pf/roulette', express.json(), async (req,res)=>{
  const {uid} = req.body;
  const seeds = getOrCreateSeed(uid);
  seeds.nonce++;
  const number = generateResult(seeds.serverSeed, seeds.clientSeed, seeds.nonce, 37);
  res.json({
    number,
    nonce: seeds.nonce,
    hashedServerSeed: seeds.hashedServerSeed,
    clientSeed: seeds.clientSeed
  });
});

// Provably fair blackjack deck
app.post('/api/pf/blackjack', express.json(), async (req,res)=>{
  const {uid} = req.body;
  const seeds = getOrCreateSeed(uid);
  seeds.nonce++;
  // Generate shuffled deck order using Fisher-Yates with PF
  const deck = Array.from({length:52},(_,i)=>i);
  for(let i=51;i>0;i--){
    const j = generateResult(seeds.serverSeed, seeds.clientSeed, seeds.nonce*100+(51-i), i+1);
    [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  res.json({
    deck, // card indices 0-51
    nonce: seeds.nonce,
    hashedServerSeed: seeds.hashedServerSeed,
    clientSeed: seeds.clientSeed
  });
});


// ── STAFF AUTH ENDPOINTS ─────────────────────────────────

// Staff login
app.post('/admin/staff/login', express.json(), async (req,res)=>{
  const {username,password} = req.body||{};
  if(!username||!password) return res.status(400).json({error:'Missing data'});
  const staff = await dbGet(`SELECT * FROM admin_staff WHERE username=$1 AND active=1`, [username]);
  if(!staff || staff.password_hash !== hashAdminPw(password))
    return res.status(401).json({error:'Invalid username or password'});
  const token = 'staff_' + crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now()+12*3600000).toISOString().replace('T',' ').substring(0,19);
  await dbRun(`INSERT INTO admin_sessions(token,staff_id,role,username,expires_at) VALUES($1,$2,$3,$4,$5)`, [token,staff.id,staff.role,staff.username,expires]);
  await dbRun(`UPDATE admin_staff SET last_login=NOW() WHERE id=$1`, [staff.id]);
  res.json({ok:true,token,role:staff.role,displayName:staff.display_name||staff.username});
});

// Get my info
app.get('/admin/staff/me', adminAuth, async (req,res)=>{
  res.json({username:req.adminUser,role:req.adminRole,permissions:ROLE_PERMS[req.adminRole]||[],isSuperadmin:req.adminRole==='superadmin'});
});

// List all staff (superadmin only)
app.get('/admin/staff', adminAuth, async (req,res)=>{
  if(req.adminRole!=='superadmin') return res.status(403).json({error:'Tik superadmin'});
  const list = await dbAll(`SELECT id,username,role,display_name,created_at,last_login,active FROM admin_staff ORDER BY created_at DESC`, []);
  res.json(list);
});

// Create staff
app.post('/admin/staff/create', adminAuth, express.json(), async (req,res)=>{
  if(req.adminRole!=='superadmin') return res.status(403).json({error:'Tik superadmin'});
  const {username,password,role,display_name} = req.body||{};
  if(!username||!password||!role) return res.status(400).json({error:'Missing fields'});
  if(!ROLE_PERMS[role]||role==='superadmin') return res.status(400).json({error:'Invalid role'});
  try {
    await dbRun(`INSERT INTO admin_staff(username,password_hash,role,display_name) VALUES($1,$2,$3,$4)`, [username,hashAdminPw(password),role,display_name||username]);
    res.json({ok:true});
  } catch(e){ res.status(400).json({error:'Vartotojas jau egzistuoja'}); }
});

// Update staff
app.put('/admin/staff/:id', adminAuth, express.json(), async (req,res)=>{
  if(req.adminRole!=='superadmin') return res.status(403).json({error:'Tik superadmin'});
  const {role,display_name,active,password} = req.body||{};
  const id = req.params.id;
  if(role&&ROLE_PERMS[role]&&role!=='superadmin') await dbRun(`UPDATE admin_staff SET role=$1 WHERE id=$2`, [role,id]);
  if(display_name!==undefined) await dbRun(`UPDATE admin_staff SET display_name=$1 WHERE id=$2`, [display_name,id]);
  if(active!==undefined){ await dbRun(`UPDATE admin_staff SET active=$1 WHERE id=$2`, [active?1:0,id]); if(!active) await dbRun(`DELETE FROM admin_sessions WHERE staff_id=$1`, [id]); }
  if(password) await dbRun(`UPDATE admin_staff SET password_hash=$1 WHERE id=$2`, [hashAdminPw(password),id]);
  res.json({ok:true});
});

// Delete staff
app.delete('/admin/staff/:id', adminAuth, async (req,res)=>{
  if(req.adminRole!=='superadmin') return res.status(403).json({error:'Tik superadmin'});
  await dbRun(`DELETE FROM admin_sessions WHERE staff_id=$1`, [req.params.id]);
  await dbRun(`DELETE FROM admin_staff WHERE id=$1`, [req.params.id]);
  res.json({ok:true});
});

// ── ADMIN PANEL ──────────────────────────────────────────
// Get all players
// Ensure banned column exists (migration safe)


app.get('/admin/players', adminAuth, async (req,res)=>{
  const players = await dbAll(`
    SELECT u.uid, u.name, u.tokens, u.level, u.xp, u.games_played, u.total_won, u.created_at, u.banned,
      (SELECT MAX(ts) FROM game_log WHERE uid=u.uid) as last_active,
      (SELECT SUM(bet) FROM game_log WHERE uid=u.uid) as total_wagered,
      (SELECT COUNT(*) FROM game_log WHERE uid=u.uid) as bet_count
    FROM users u ORDER BY u.tokens DESC
  `, []);
  res.json(players);
});

// Player detail
app.get('/admin/player/:uid', adminAuth, async (req,res)=>{
  const uid = req.params.uid;
  const user = await dbGet(`SELECT * FROM users WHERE uid=$1`, [uid]);
  if(!user) return res.status(404).json({error:'Not found'});
  const recentBets = await dbAll(`SELECT * FROM game_log WHERE uid=$1 ORDER BY ts DESC LIMIT 30`, [uid]);
  const stats = await dbGet(`SELECT COUNT(*) as cnt, SUM(bet) as wagered, SUM(CASE WHEN won=1 THEN result ELSE 0 END) as won_total FROM game_log WHERE uid=$1`, [uid]);
  const kycRow = await dbGet(`SELECT status FROM kyc WHERE uid=$1`, [uid]);
  const authRow = await dbGet(`SELECT email FROM auth WHERE uid=$1`, [uid]);
  res.json({user, recentBets, stats, kycStatus: kycRow?.status||'unverified', email: authRow?.email||null});
});

// Ban / unban
app.post('/admin/ban/:uid', adminAuth, requirePerm('players.ban'), async (req,res)=>{
  await dbRun(`UPDATE users SET banned=1 WHERE uid=$1`, [req.params.uid]);
  // Kick active sessions
  await dbRun(`DELETE FROM sessions WHERE uid=$1`, [req.params.uid]);
  const u = await dbGet(`SELECT name FROM users WHERE uid=$1`, [req.params.uid]);
  res.json({ok:true, name: u?.name});
});
app.post('/admin/unban/:uid', adminAuth, requirePerm('players.unban'), async (req,res)=>{
  await dbRun(`UPDATE users SET banned=0 WHERE uid=$1`, [req.params.uid]);
  const u = await dbGet(`SELECT name FROM users WHERE uid=$1`, [req.params.uid]);
  res.json({ok:true, name: u?.name});
});

// Broadcast to global chat
app.post('/admin/broadcast', adminAuth, requirePerm('chat.broadcast'), express.json(), async (req,res)=>{
  const {msg} = req.body;
  if(!msg) return res.status(400).json({error:'No message'});
  io.emit('globalChat', {uid:'__admin', name:'🛡️ HATHOR Admin', msg, levelEmoji:'👑', time:Date.now()});
  res.json({ok:true});
});

// Give tokens to player
app.post('/admin/give-tokens', adminAuth, requirePerm('players.gift'), express.json(), async (req,res)=>{
  const {uid, amount, name} = req.body;
  let user;
  if(uid) user = await dbGet(`SELECT * FROM users WHERE uid=$1`, [uid]);
  else if(name) user = await dbGet(`SELECT * FROM users WHERE name LIKE $1`, ['%'+name+'%']);
  if(!user) return res.status(404).json({error:'Player not found'});
  await dbRun(`UPDATE users SET tokens=tokens+$1 WHERE uid=$2`, [amount, user.uid]);
  // Notify player if online
  io.emit('adminGift', {uid: user.uid, amount, from:'Admin'});
  res.json({ok:true, player:user.name, newBalance: user.tokens+amount});
});

// Set tokens directly
app.post('/admin/set-tokens', adminAuth, express.json(), async (req,res)=>{
  const {uid, amount} = req.body;
  const user = await dbGet(`SELECT * FROM users WHERE uid=$1`, [uid]);
  if(!user) return res.status(404).json({error:'Not found'});
  await dbRun(`UPDATE users SET tokens=$1 WHERE uid=$2`, [amount, uid]);
  res.json({ok:true, player:user.name, newBalance:amount});
});

// Promo codes
app.post('/admin/create-promo', adminAuth, express.json(), async (req,res)=>{
  const {code, amount, maxUses} = req.body;
  try {
    
    
    await dbRun(`INSERT INTO promo_codes(code,amount,max_uses) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, [code.toUpperCase(), amount, maxUses||1]);
    res.json({ok:true, code:code.toUpperCase(), amount, maxUses:maxUses||1});
  } catch(e){ res.status(500).json({error:e.message}); }
});

app.get('/admin/promos', adminAuth, async (req,res)=>{
  try {
    
    const codes = await dbAll(`SELECT * FROM promo_codes ORDER BY created_at DESC`, []);
    res.json(codes);
  } catch(e){ res.json([]); }
});

app.delete('/admin/promo/:code', adminAuth, async (req,res)=>{
  await dbRun(`DELETE FROM promo_codes WHERE code=$1`, [req.params.code.toUpperCase()]);
  res.json({ok:true});
});

// Player uses promo code
app.post('/api/use-promo', express.json(), async (req,res)=>{
  const {code, uid} = req.body;
  try {
    
    
    const promo = await dbGet(`SELECT * FROM promo_codes WHERE code=$1`, [code.toUpperCase()]);
    if(!promo) return res.json({ok:false, error:'Promo code not found'});
    if(promo.used_count >= promo.max_uses) return res.json({ok:false, error:'Code already used up'});
    const alreadyUsed = await dbGet(`SELECT 1 FROM promo_uses WHERE code=$1 AND uid=$2`, [code.toUpperCase(), uid]);
    if(alreadyUsed) return res.json({ok:false, error:'You already used this code'});
    await dbRun(`UPDATE promo_codes SET used_count=used_count+1 WHERE code=$1`, [code.toUpperCase()]);
    await dbRun(`INSERT INTO promo_uses(code,uid) VALUES($1,$2)`, [code.toUpperCase(), uid]);
    await dbRun(`UPDATE users SET tokens=tokens+$1 WHERE uid=$2`, [promo.amount, uid]);
    res.json({ok:true, amount:promo.amount});
  } catch(e){ res.json({ok:false, error:e.message}); }
});

// Delete player
app.delete('/admin/player/:uid', adminAuth, async (req,res)=>{
  if(req.adminRole!=='superadmin') return res.status(403).json({error:'Only superadmin can delete players'});
  await dbRun(`DELETE FROM users WHERE uid=$1`, [req.params.uid]);
  res.json({ok:true});
});

// Stats overview
app.get('/admin/overview', adminAuth, async (req,res)=>{
  const totalPlayers = await dbGet(`SELECT COUNT(*) as c FROM users`, []).c;
  const bannedPlayers = await dbGet(`SELECT COUNT(*) as c FROM users WHERE banned=1`, []).c;
  const totalTokens = await dbGet(`SELECT SUM(tokens) as s FROM users`, []).s||0;
  const richest = await dbGet(`SELECT name,tokens FROM users ORDER BY tokens DESC LIMIT 1`, []);
  const newest = await dbGet(`SELECT name,created_at FROM users ORDER BY created_at DESC LIMIT 1`, []);
  const todayStr = new Date().toISOString().slice(0,10);
  const todayBets = await dbGet(`SELECT COUNT(*) as c, SUM(bet) as wagered, SUM(CASE WHEN won=1 THEN result ELSE 0 END) as paid_out FROM game_log WHERE ts >= $1`, [todayStr+'T00:00:00']);
  const activeToday = await dbGet(`SELECT COUNT(DISTINCT uid) as c FROM game_log WHERE ts >= $1`, [todayStr+'T00:00:00']);
  const newToday = await dbGet(`SELECT COUNT(*) as c FROM users WHERE created_at >= $1`, [todayStr+'T00:00:00']);
  const houseProfit = (todayBets.wagered||0) - (todayBets.paid_out||0);
  res.json({
    totalPlayers, bannedPlayers, totalTokens, richest, newest, jackpot: await getJackpot(),
    today: {
      bets: todayBets.c||0,
      wagered: todayBets.wagered||0,
      paidOut: todayBets.paid_out||0,
      houseProfit,
      active: activeToday.c||0,
      newPlayers: newToday.c||0
    }
  });
});


// ══════════════════════════════════════════════════════════
// EMAIL REGISTRATION / AUTHENTICATION
// ══════════════════════════════════════════════════════════


const { scrypt, randomBytes: rndBytes } = require('crypto');

async function hashPwd(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, h) => err ? reject(err) : resolve(h.toString('hex')));
  });
}
async function makeSession(uid) {
  const token = rndBytes(32).toString('hex');
  const exp = new Date(Date.now() + 30*24*60*60*1000).toISOString();
  await dbRun(`INSERT INTO sessions(token,uid,expires_at) VALUES($1,$2,$3)`, [token, uid, exp]);
  return token;
}
async function checkSession(token) {
  if(!token) return null;
  const row = await dbGet(`SELECT uid FROM sessions WHERE token=$1 AND expires_at > NOW()`, [token]);
  return row?.uid || null;
}

// Registracija
app.post('/api/auth/register', express.json(), async (req, res) => {
  const { name, email, password, ref, cid, pref, promo } = req.body;
  if(!name||!email||!password) return res.status(400).json({error:'Missing required fields'});
  if(password.length < 8) return res.status(400).json({error:'Password must be at least 8 characters'});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:'Invalid email format'});

  // ── DEMO MODE bypass (no PostgreSQL) ──────────────────────────────────
  if (!_dbOk) {
    const demoUid = 'demo-' + Buffer.from(email.toLowerCase()).toString('hex').slice(0, 16);
    const demoUser = { uid: demoUid, name: name, tokens: 10000,
      avatar: null, level: 1, xp: 0, total_won: 0, games_played: 0, last_bonus: null };
    const token = demoUid + '-session';
    return res.json({ ok: true, token, uid: demoUid,
      user: { ...demoUser, levelInfo: getLvInfo(0), kycStatus: 'unverified' } });
  }
  // ─────────────────────────────────────────────────────────────────────

  const exists = await dbGet(`SELECT uid FROM auth WHERE email=$1`, [email.toLowerCase()]);
  if(exists) return res.status(400).json({error:'This email is already registered'});
  try {
    const salt = rndBytes(16).toString('hex');
    const hash = await hashPwd(password, salt);
    const uid = uuidv4();
    const user = {uid, name, tokens:10000, avatar:null, level:1, xp:0, total_won:0, games_played:0, last_bonus:null};
    await saveUser(user);
    await dbRun(`INSERT INTO auth(uid,email,password_hash,salt) VALUES($1,$2,$3,$4)`, [uid, email.toLowerCase(), hash, salt]);
    // Track affiliate referral if ref param present
    if(ref) {
      const aff = await dbGet(`SELECT uid FROM affiliates WHERE ref_code=$1`, [ref]);
      if(aff && aff.uid !== uid) {
        await dbRun(`INSERT INTO referrals(uid,ref_by,campaign_id) VALUES($1,$2,$3) ON CONFLICT(uid) DO NOTHING`, [uid, aff.uid, cid||null]);
        await dbRun(`UPDATE affiliates SET referred=referred+1 WHERE uid=$1`, [aff.uid]);
      }
    }
    // Track player-to-player referral if pref param present
    if(pref) {
      try {
        const allUsers = await dbAll(`SELECT uid, name FROM users`);
        const referrer = allUsers.find(u => getPlayerRefCode(u.name) === pref.toUpperCase());
        if(referrer && referrer.uid !== uid) {
          await dbRun(`INSERT INTO player_referrals(referrer_uid, referred_uid) VALUES($1,$2) ON CONFLICT(referred_uid) DO NOTHING`, [referrer.uid, uid]);
        }
      } catch(prefErr) { console.error('Player ref error:', prefErr.message); }
    }
    const token = await makeSession(uid);
    // Apply promo code if provided
    let promoBonus = 0;
    if(promo) {
      try {
        const promoRow = await dbGet(`SELECT * FROM promo_codes WHERE code=$1`, [promo.toUpperCase()]);
        if(promoRow && promoRow.used_count < promoRow.max_uses) {
          await dbRun(`UPDATE promo_codes SET used_count=used_count+1 WHERE code=$1`, [promoRow.code]);
          await dbRun(`INSERT INTO promo_uses(code,uid) VALUES($1,$2) ON CONFLICT DO NOTHING`, [promoRow.code, uid]);
          await dbRun(`UPDATE users SET tokens=tokens+$1 WHERE uid=$2`, [promoRow.amount, uid]);
          user.tokens += promoRow.amount;
          promoBonus = promoRow.amount;
        }
      } catch(pe) { console.warn('Promo apply error:', pe.message); }
    }
    // Send verification email
    const baseUrl = process.env.BASE_URL || 'https://casino-production-0712.up.railway.app';
    const vToken = require('crypto').randomBytes(32).toString('hex');
    const vExpires = new Date(Date.now() + 24*60*60*1000);
    await dbRun(`INSERT INTO email_verify_tokens(token,uid,expires_at) VALUES($1,$2,$3)`, [vToken, uid, vExpires]).catch(()=>{});
    await sendEmail(email, 'Welcome to HATHOR Royal Casino! 🎰', emailTemplate(
      'Welcome, ' + name + '!',
      `<p style="color:rgba(232,226,212,0.7);line-height:1.7">Your account has been created. You start with <strong style="color:#c9a84c">${(10000+promoBonus).toLocaleString()} tokens</strong>${promoBonus?` (including <strong style="color:#4ade80">+${promoBonus.toLocaleString()} promo bonus</strong>)`:''} — good luck! 🍀</p>
       <p style="margin:16px 0 8px;color:rgba(232,226,212,0.7);">Please verify your email address:</p>
       <a href="${baseUrl}/api/auth/verify-email/${vToken}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#c9a84c,#ffd680);color:#0a0806;text-decoration:none;border-radius:10px;font-weight:700">Verify Email →</a>
       <p style="margin-top:12px;color:rgba(232,226,212,0.4);font-size:12px">Link expires in 24 hours.</p>`
    ));
    res.json({ok:true, token, uid, promoBonus, user:{...user, levelInfo:getLvInfo(0), kycStatus:'unverified'}});
  } catch(e) { res.status(500).json({error:'Serverio klaida: '+e.message}); }
});

// Prisijungimas
app.post('/api/auth/login', express.json(), async (req, res) => {
  const { email, password } = req.body;
  if(!email||!password) return res.status(400).json({error:'Enter your email and password'});

  // ── DEMO MODE bypass (no PostgreSQL) ──────────────────────────────────
  if (!_dbOk) {
    const demoUid = 'demo-' + Buffer.from(email.toLowerCase()).toString('hex').slice(0, 16);
    const demoUser = { uid: demoUid, name: email.split('@')[0], tokens: 10000,
      avatar: null, level: 1, xp: 0, total_won: 0, games_played: 0, last_bonus: null };
    const token = demoUid + '-session';
    return res.json({ ok: true, token, uid: demoUid,
      user: { ...demoUser, levelInfo: getLvInfo(0), kycStatus: 'unverified' } });
  }
  // ─────────────────────────────────────────────────────────────────────

  const authRow = await dbGet(`SELECT * FROM auth WHERE email=$1`, [email.toLowerCase()]);
  if(!authRow) return res.status(401).json({error:'Invalid email or password'});
  try {
    const hash = await hashPwd(password, authRow.salt);
    if(hash !== authRow.password_hash) return res.status(401).json({error:'Invalid email or password'});
    const user = await getUser(authRow.uid);
    if(!user) return res.status(404).json({error:'Paskyra nerasta'});
    if(user.banned) return res.status(403).json({error:'This account is banned. Please contact support.'});
    // 2FA check
    if(authRow.totp_enabled && speakeasy) {
      const tempToken = rndBytes(16).toString('hex');
      twoFaTempTokens[tempToken] = { uid: authRow.uid, expiresAt: Date.now() + 5*60*1000 };
      return res.json({ requires2fa: true, tempToken });
    }
    const token = await makeSession(authRow.uid);
    const kycRow = await dbGet(`SELECT status FROM kyc WHERE uid=$1`, [authRow.uid]);
    res.json({ok:true, token, uid:authRow.uid, user:{
      ...user, levelInfo:getLvInfo(user.xp||0), nextLevel:nextLvInfo(user.xp||0),
      kycStatus: kycRow?.status||'unverified'
    }});
  } catch(e) { res.status(500).json({error:'Serverio klaida'}); }
});

// Sesijos patikrinimas
app.get('/api/auth/me', async (req, res) => {
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];

  // Demo mode session check
  if (!_dbOk && token && token.endsWith('-session')) {
    const demoUid = token.replace('-session','');
    const demoUser = { uid: demoUid, name: demoUid.replace('demo-','').slice(0,8),
      tokens: 10000, avatar: null, level: 1, xp: 0, total_won: 0, games_played: 0, last_bonus: null };
    return res.json({ uid: demoUid, user: { ...demoUser, levelInfo: getLvInfo(0), kycStatus: 'unverified' } });
  }

  const uid = await checkSession(token);
  if(!uid) return res.status(401).json({error:'Sesija negaliojanti'});
  const user = await getUser(uid);
  if(!user) return res.status(404).json({error:'Vartotojas nerastas'});
  const kycRow = await dbGet(`SELECT status FROM kyc WHERE uid=$1`, [uid]);
  const authRow = await dbGet(`SELECT email_verified FROM auth WHERE uid=$1`, [uid]);
  res.json({uid, user:{...user, kycStatus:kycRow?.status||'unverified', email_verified:!!authRow?.email_verified}});
});

// Atsijungimas
app.post('/api/auth/logout', express.json(), async (req, res) => {
  const token = req.body?.token || req.headers['x-session-token'];
  if(token) await dbRun(`DELETE FROM sessions WHERE token=$1`, [token]);
  res.json({ok:true});
});

// ── Forgot / Reset password ────────────────────────────────
app.post('/api/auth/forgot-password', authLimiter, express.json(), async (req,res) => {
  const { email } = req.body || {};
  // Always return ok to prevent email enumeration
  if(!email) return res.json({ok:true});
  try {
    const row = await dbGet(`SELECT uid FROM auth WHERE email=$1`, [email.toLowerCase()]);
    if(row) {
      const token = require('crypto').randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60*60*1000); // 1 hour
      await dbRun(`DELETE FROM password_reset_tokens WHERE uid=$1`, [row.uid]);
      await dbRun(`INSERT INTO password_reset_tokens(token,uid,expires_at) VALUES($1,$2,$3)`, [token, row.uid, expires]);
      const baseUrl = process.env.BASE_URL || 'https://casino-production-0712.up.railway.app';
      await sendEmail(email.toLowerCase(), 'Reset your HATHOR Casino password', emailTemplate(
        'Password Reset',
        `<p style="color:rgba(232,226,212,0.7);line-height:1.7">Click the button below to reset your password. This link expires in 1 hour.</p>
         <a href="${baseUrl}/login.html?mode=reset&token=${token}" style="display:inline-block;margin-top:16px;padding:14px 28px;background:linear-gradient(135deg,#c9a84c,#ffd680);color:#0a0806;text-decoration:none;border-radius:10px;font-weight:700">Reset Password →</a>
         <p style="margin-top:16px;color:rgba(232,226,212,0.4);font-size:12px">If you didn't request this, ignore this email.</p>`
      ));
    }
  } catch(e) { console.error('Forgot password error:', e.message); }
  res.json({ok:true});
});

app.post('/api/auth/reset-password', express.json(), async (req,res) => {
  const { token, password } = req.body || {};
  if(!token || !password) return res.status(400).json({error:'Missing fields'});
  if(password.length < 8) return res.status(400).json({error:'Password must be at least 8 characters'});
  try {
    const row = await dbGet(`SELECT uid, expires_at FROM password_reset_tokens WHERE token=$1`, [token]);
    if(!row) return res.status(400).json({error:'Invalid or expired reset link'});
    if(new Date(row.expires_at) < new Date()) {
      await dbRun(`DELETE FROM password_reset_tokens WHERE token=$1`, [token]);
      return res.status(400).json({error:'Reset link has expired — request a new one'});
    }
    const salt = require('crypto').randomBytes(16).toString('hex');
    const hash = await hashPwd(password, salt);
    await dbRun(`UPDATE auth SET password_hash=$1, salt=$2 WHERE uid=$3`, [hash, salt, row.uid]);
    await dbRun(`DELETE FROM password_reset_tokens WHERE token=$1`, [token]);
    await dbRun(`DELETE FROM sessions WHERE uid=$1`, [row.uid]); // invalidate all sessions
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:'Server error'}); }
});

// ── Email verification ─────────────────────────────────────
app.get('/api/auth/verify-email/:token', async (req,res) => {
  try {
    const row = await dbGet(`SELECT uid, expires_at FROM email_verify_tokens WHERE token=$1`, [req.params.token]);
    if(!row) return res.redirect('/login.html?verifyError=1');
    if(new Date(row.expires_at) < new Date()) {
      await dbRun(`DELETE FROM email_verify_tokens WHERE token=$1`, [req.params.token]);
      return res.redirect('/login.html?verifyError=expired');
    }
    await dbRun(`UPDATE auth SET email_verified=true WHERE uid=$1`, [row.uid]);
    await dbRun(`DELETE FROM email_verify_tokens WHERE token=$1`, [req.params.token]);
    res.redirect('/login.html?verified=1');
  } catch(e) { res.redirect('/login.html?verifyError=1'); }
});

app.post('/api/auth/resend-verification', express.json(), async (req,res) => {
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const uid = await checkSession(token);
  if(!uid) return res.status(401).json({error:'Unauthorized'});
  try {
    const authRow = await dbGet(`SELECT email, email_verified FROM auth WHERE uid=$1`, [uid]);
    if(!authRow) return res.status(404).json({error:'User not found'});
    if(authRow.email_verified) return res.json({ok:true, already:true});
    const vToken = require('crypto').randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24*60*60*1000); // 24 hours
    await dbRun(`DELETE FROM email_verify_tokens WHERE uid=$1`, [uid]);
    await dbRun(`INSERT INTO email_verify_tokens(token,uid,expires_at) VALUES($1,$2,$3)`, [vToken, uid, expires]);
    const baseUrl = process.env.BASE_URL || 'https://casino-production-0712.up.railway.app';
    await sendEmail(authRow.email, 'Verify your HATHOR Casino email', emailTemplate(
      'Email Verification',
      `<p style="color:rgba(232,226,212,0.7);line-height:1.7">Click below to verify your email address.</p>
       <a href="${baseUrl}/api/auth/verify-email/${vToken}" style="display:inline-block;margin-top:16px;padding:14px 28px;background:linear-gradient(135deg,#c9a84c,#ffd680);color:#0a0806;text-decoration:none;border-radius:10px;font-weight:700">Verify Email →</a>`
    ));
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:'Server error'}); }
});

// ── 2FA endpoints ─────────────────────────────────────────
// Setup: generate secret, return QR code
app.post('/api/auth/2fa/setup', express.json(), async (req,res) => {
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const uid = await checkSession(token);
  if(!uid) return res.status(401).json({error:'Unauthorized'});
  if(!speakeasy || !QRCode) return res.status(503).json({error:'2FA not available'});
  try {
    const secret = speakeasy.generateSecret({ name: 'HATHOR Casino (' + uid.slice(0,8) + ')' });
    await dbRun(`UPDATE auth SET totp_secret=$1 WHERE uid=$2`, [secret.base32, uid]);
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qrCodeUrl, otpAuthUrl: secret.otpauth_url });
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Verify token and enable 2FA
app.post('/api/auth/2fa/verify', express.json(), async (req,res) => {
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const uid = await checkSession(token);
  if(!uid) return res.status(401).json({error:'Unauthorized'});
  if(!speakeasy) return res.status(503).json({error:'2FA not available'});
  const { token: totpToken } = req.body || {};
  if(!totpToken) return res.status(400).json({error:'Missing token'});
  try {
    const authRow = await dbGet(`SELECT totp_secret FROM auth WHERE uid=$1`, [uid]);
    if(!authRow?.totp_secret) return res.status(400).json({error:'2FA not set up'});
    const valid = speakeasy.totp.verify({ secret: authRow.totp_secret, encoding: 'base32', token: totpToken, window: 2 });
    if(!valid) return res.status(400).json({error:'Invalid code'});
    await dbRun(`UPDATE auth SET totp_enabled=TRUE WHERE uid=$1`, [uid]);
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Disable 2FA
app.post('/api/auth/2fa/disable', express.json(), async (req,res) => {
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const uid = await checkSession(token);
  if(!uid) return res.status(401).json({error:'Unauthorized'});
  if(!speakeasy) return res.status(503).json({error:'2FA not available'});
  const { token: totpToken } = req.body || {};
  if(!totpToken) return res.status(400).json({error:'Missing token'});
  try {
    const authRow = await dbGet(`SELECT totp_secret, totp_enabled FROM auth WHERE uid=$1`, [uid]);
    if(!authRow?.totp_enabled) return res.status(400).json({error:'2FA not enabled'});
    const valid = speakeasy.totp.verify({ secret: authRow.totp_secret, encoding: 'base32', token: totpToken, window: 2 });
    if(!valid) return res.status(400).json({error:'Invalid code'});
    await dbRun(`UPDATE auth SET totp_enabled=FALSE, totp_secret=NULL WHERE uid=$1`, [uid]);
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// 2FA status endpoint
app.get('/api/auth/2fa/status', async (req,res) => {
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const uid = await checkSession(token);
  if(!uid) return res.status(401).json({error:'Unauthorized'});
  try {
    const authRow = await dbGet(`SELECT totp_enabled FROM auth WHERE uid=$1`, [uid]);
    res.json({ enabled: !!(authRow?.totp_enabled), available: !!(speakeasy && QRCode) });
  } catch(e) { res.status(500).json({error:e.message}); }
});

// 2FA login step
app.post('/api/auth/2fa/login', express.json(), async (req,res) => {
  if(!speakeasy) return res.status(503).json({error:'2FA not available'});
  const { tempToken, totpCode } = req.body || {};
  if(!tempToken || !totpCode) return res.status(400).json({error:'Missing fields'});
  const entry = twoFaTempTokens[tempToken];
  if(!entry || entry.expiresAt < Date.now()) return res.status(401).json({error:'Token expired or invalid'});
  try {
    const authRow = await dbGet(`SELECT * FROM auth WHERE uid=$1`, [entry.uid]);
    if(!authRow?.totp_secret) return res.status(400).json({error:'2FA not configured'});
    const valid = speakeasy.totp.verify({ secret: authRow.totp_secret, encoding: 'base32', token: totpCode, window: 2 });
    if(!valid) return res.status(400).json({error:'Invalid 2FA code'});
    delete twoFaTempTokens[tempToken];
    const user = await getUser(entry.uid);
    const sessionToken = await makeSession(entry.uid);
    const kycRow = await dbGet(`SELECT status FROM kyc WHERE uid=$1`, [entry.uid]);
    res.json({ok:true, token:sessionToken, uid:entry.uid, user:{...user, levelInfo:getLvInfo(user.xp||0), nextLevel:nextLvInfo(user.xp||0), kycStatus:kycRow?.status||'unverified'}});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Admin: email users
app.get('/admin/auth-users', adminAuth, async (req, res) => {
  const rows = await dbAll(`SELECT a.email, a.created_at, u.name, u.tokens, u.level
    FROM auth a LEFT JOIN users u ON a.uid=u.uid ORDER BY a.created_at DESC LIMIT 200`, []);
  res.json(rows);
});

// Admin: save arbitrary settings (e.g. admin_email)
app.post('/api/admin/settings', adminAuth, express.json(), async (req, res) => {
  try {
    const data = req.body || {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof key === 'string' && key.length > 0) {
        await setSetting(key, String(value));
      }
    }
    res.json({ok: true});
  } catch(e) { res.status(500).json({error: e.message}); }
});

// ══════════════════════════════════════════════════════════
// KYC / AGE VERIFICATION SYSTEM
// ══════════════════════════════════════════════════════════
if(!fs.existsSync('./kyc-docs')) fs.mkdirSync('./kyc-docs',{recursive:true});

const kycStorage=multer.diskStorage({
  destination:'./kyc-docs/',
  filename:(req,file,cb)=>{
    const uid=req.body?.uid||req.headers['x-user-id']||'unknown';
    cb(null,`${uid}_${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  }
});
const kycUpload=multer({
  storage:kycStorage,
  limits:{fileSize:8*1024*1024},
  fileFilter:(req,file,cb)=>{
    const ok=['.jpg','.jpeg','.png','.pdf','.webp'];
    cb(null,ok.includes(path.extname(file.originalname).toLowerCase()));
  }
});

function calcAge(birthDate){
  const today=new Date(),b=new Date(birthDate);
  let age=today.getFullYear()-b.getFullYear();
  const m=today.getMonth()-b.getMonth();
  if(m<0||(m===0&&today.getDate()<b.getDate()))age--;
  return age;
}
async function getKYC(uid){return await dbGet(`SELECT * FROM kyc WHERE uid=$1`, [uid]);}

// Pateikti KYC dokumentus
app.post('/api/kyc/submit', kycUpload.fields([
  {name:'id_front',maxCount:1},
  {name:'id_back',maxCount:1},
  {name:'selfie',maxCount:1}
]), async (req,res)=>{
  const {uid,full_name,birth_date,country,id_type}=req.body;
  if(!uid||!full_name||!birth_date) return res.status(400).json({error:'Missing required fields'});

  const age=calcAge(birth_date);
  if(isNaN(age)||age>120) return res.status(400).json({error:'Neteisinga gimimo data'});
  if(age<18) return res.status(400).json({error:'You must be at least 18 years old to play.',underage:true});

  const files=req.files||{};
  const id_front=files.id_front?.[0]?`/kyc-file/${files.id_front[0].filename}`:null;
  const id_back=files.id_back?.[0]?`/kyc-file/${files.id_back[0].filename}`:null;
  const selfie=files.selfie?.[0]?`/kyc-file/${files.selfie[0].filename}`:null;

  if(!id_front||!selfie) return res.status(400).json({error:'Dokumento priekis ir selfie yra privalomi'});

  const existing=await getKYC(uid);
  if(existing?.status==='approved') return res.status(400).json({error:'Your account is already verified'});

  await dbRun(`INSERT INTO kyc(uid,status,full_name,birth_date,country,id_type,id_front,id_back,selfie,submitted_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
    ON CONFLICT(uid) DO UPDATE SET
      status='pending',full_name=excluded.full_name,birth_date=excluded.birth_date,
      country=excluded.country,id_type=excluded.id_type,id_front=excluded.id_front,
      id_back=excluded.id_back,selfie=excluded.selfie,
      submitted_at=NOW(),rejection_reason=NULL,reviewed_at=NULL
    WHERE kyc.status NOT IN ('approved')
  `, [uid,'pending',full_name,birth_date,country||'',id_type||'passport',id_front,id_back,selfie]);

  res.json({ok:true,status:'pending'});
});

// KYC statusas
app.get('/api/kyc/status/:uid', async (req,res)=>{
  // Auth: user can only query their own KYC status
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const callerUid = await checkSession(token);
  if(!callerUid) return res.status(401).json({error:'Unauthorized'});
  if(callerUid !== req.params.uid) return res.status(403).json({error:'Forbidden'});
  const k=await getKYC(req.params.uid);
  res.json({
    status:k?.status||'unverified',
    full_name:k?.full_name||null,
    rejection_reason:k?.rejection_reason||null,
    submitted_at:k?.submitted_at||null,
    reviewed_at:k?.reviewed_at||null,
  });
});

// Admin: show KYC document (protected)
app.get('/kyc-file/:filename', adminAuth, async (req,res)=>{
  const filename=path.basename(req.params.filename);
  const filePath=path.join(__dirname,'kyc-docs',filename);
  if(!fs.existsSync(filePath)) return res.status(404).send('Not found');
  res.sendFile(filePath);
});

// Admin: list by status
app.get('/admin/kyc', adminAuth, async (req,res)=>{
  const status=req.query.status||'pending';
  const rows=await dbAll(`SELECT k.*,u.name as username,u.tokens,u.games_played,u.created_at as reg_date
    FROM kyc k LEFT JOIN users u ON k.uid=u.uid
    WHERE k.status=$1 ORDER BY k.submitted_at DESC`, [status]);
  res.json(rows);
});

// Admin: KYC statistika
app.get('/admin/kyc/stats', adminAuth, async (req,res)=>{
  const pending=await dbGet(`SELECT COUNT(*) as c FROM kyc WHERE status='pending'`, []).c;
  const approved=await dbGet(`SELECT COUNT(*) as c FROM kyc WHERE status='approved'`, []).c;
  const rejected=await dbGet(`SELECT COUNT(*) as c FROM kyc WHERE status='rejected'`, []).c;
  res.json({pending,approved,rejected});
});

// Admin: patvirtinti KYC
app.post('/admin/kyc/approve/:uid',adminAuth,requirePerm('kyc.approve'),async (req,res)=>{
  await dbRun(`UPDATE kyc SET status='approved',reviewed_at=NOW() WHERE uid=$1`, [req.params.uid]);
  if(sockets[req.params.uid]) sockets[req.params.uid].socket.emit('kycStatusUpdate',{status:'approved'});
  res.json({ok:true});
});

// Admin: atmesti KYC
app.post('/admin/kyc/reject/:uid',adminAuth,requirePerm('kyc.reject'),express.json(),async (req,res)=>{
  const reason=req.body?.reason||'Could not verify documents';
  await dbRun(`UPDATE kyc SET status='rejected',rejection_reason=$1,reviewed_at=NOW() WHERE uid=$2`, [reason,req.params.uid]);
  if(sockets[req.params.uid]) sockets[req.params.uid].socket.emit('kycStatusUpdate',{status:'rejected',reason});
  res.json({ok:true});
});

// Admin: delete KYC record (allows resubmission)
app.delete('/admin/kyc/:uid', adminAuth, async (req,res)=>{
  await dbRun(`DELETE FROM kyc WHERE uid=$1`, [req.params.uid]);
  res.json({ok:true});
});

// ══════════════════════════════════════════════════════════
// RESPONSIBLE GAMBLING / SPORTS BETTING PROTECTION
// ══════════════════════════════════════════════════════════



// GET /api/rg/limits/:uid
app.get('/api/rg/limits/:uid', async (req, res) => {
  const row = await dbGet(`SELECT * FROM rg_limits WHERE uid=$1`, [req.params.uid]);
  res.json(row || { uid: req.params.uid });
});

// POST /api/rg/limits
app.post('/api/rg/limits', express.json(), async (req, res) => {
  const { uid, daily_deposit_limit, daily_loss_limit, daily_bet_limit, session_limit_minutes } = req.body;
  if (!uid) return res.status(400).json({ error: 'uid required' });

  const existing = await dbGet(`SELECT * FROM rg_limits WHERE uid=$1`, [uid]);
  const now = new Date().toISOString();

  // Helper: a new value is "raising" a limit only if the new value is higher than existing (more permissive)
  function isRaising(oldVal, newVal) {
    if (newVal == null) return false;
    if (oldVal == null) return false; // going from unlimited to a limit is always lowering
    return newVal > oldVal;
  }

  const pendingRaise = {};
  const fields = { daily_deposit_limit, daily_loss_limit, daily_bet_limit, session_limit_minutes };

  if (existing) {
    for (const [field, newVal] of Object.entries(fields)) {
      if (newVal === undefined) continue;
      if (isRaising(existing[field], newVal)) {
        // Raising takes 24h — store with a note but do not apply yet
        pendingRaise[field] = newVal;
      }
    }
  }

  if (!existing) {
    await dbRun(`INSERT INTO rg_limits (uid, daily_deposit_limit, daily_loss_limit, daily_bet_limit, session_limit_minutes, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)`, [uid,
      daily_deposit_limit ?? null,
      daily_loss_limit ?? null,
      daily_bet_limit ?? null,
      session_limit_minutes ?? null,
      now]);
  } else {
    // Apply only limits that are being lowered (or set for the first time from null)
    const toApply = {};
    for (const [field, newVal] of Object.entries(fields)) {
      if (newVal === undefined) continue;
      if (!isRaising(existing[field], newVal)) {
        toApply[field] = newVal;
      }
    }
    if (Object.keys(toApply).length > 0) {
      const vals = Object.values(toApply);
      const setClauses = Object.keys(toApply).map((f,i) => `${f}=$${i+1}`).join(', ');
      await dbRun(`UPDATE rg_limits SET ${setClauses}, updated_at=$${vals.length+1} WHERE uid=$${vals.length+2}`,
        [...vals, now, uid]);
    }
  }

  const updated = await dbGet(`SELECT * FROM rg_limits WHERE uid=$1`, [uid]);
  res.json({
    ok: true,
    limits: updated,
    pendingRaise: Object.keys(pendingRaise).length > 0
      ? { fields: pendingRaise, note: 'Limit increases take 24h to take effect for your protection.' }
      : undefined
  });
});

// POST /api/rg/self-exclude
app.post('/api/rg/self-exclude', express.json(), async (req, res) => {
  const { uid, days } = req.body;
  if (!uid) return res.status(400).json({ error: 'uid required' });
  const allowed = [1, 7, 30, 180, 365, 'permanent'];
  if (!allowed.includes(days)) return res.status(400).json({ error: 'days must be 1, 7, 30, 180, 365, or "permanent"' });

  let until;
  if (days === 'permanent') {
    until = '9999-12-31T23:59:59.000Z';
  } else {
    const d = new Date();
    d.setDate(d.getDate() + days);
    until = d.toISOString();
  }

  await dbRun(`INSERT INTO rg_limits (uid, self_exclusion_until, updated_at) VALUES ($1, $2, NOW())
    ON CONFLICT(uid) DO UPDATE SET self_exclusion_until=excluded.self_exclusion_until, updated_at=excluded.updated_at`, [uid, until]);

  res.json({ ok: true, self_exclusion_until: until });
});

// POST /api/rg/cool-off
app.post('/api/rg/cool-off', express.json(), async (req, res) => {
  const { uid, hours } = req.body;
  if (!uid) return res.status(400).json({ error: 'uid required' });
  const allowed = [24, 48, 72];
  if (!allowed.includes(hours)) return res.status(400).json({ error: 'hours must be 24, 48, or 72' });

  const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  await dbRun(`INSERT INTO rg_limits (uid, cool_off_until, updated_at) VALUES ($1, $2, NOW())
    ON CONFLICT(uid) DO UPDATE SET cool_off_until=excluded.cool_off_until, updated_at=excluded.updated_at`, [uid, until]);

  res.json({ ok: true, cool_off_until: until });
});

// GET /api/rg/check/:uid
app.get('/api/rg/check/:uid', async (req, res) => {
  const uid = req.params.uid;
  const row = await dbGet(`SELECT * FROM rg_limits WHERE uid=$1`, [uid]);

  if (!row) return res.json({ allowed: true, reason: null });

  const now = new Date().toISOString();

  if (row.self_exclusion_until && now < row.self_exclusion_until) {
    const permanent = row.self_exclusion_until === '9999-12-31T23:59:59.000Z';
    return res.json({
      allowed: false,
      reason: permanent ? 'Account permanently self-excluded.' : `Self-excluded until ${row.self_exclusion_until}.`
    });
  }

  if (row.cool_off_until && now < row.cool_off_until) {
    return res.json({ allowed: false, reason: `Cool-off period active until ${row.cool_off_until}.` });
  }

  // Check daily limits
  const today = new Date().toISOString().slice(0, 10);
  const tracking = await dbGet(`SELECT * FROM daily_tracking WHERE uid=$1 AND date=$2`, [uid, today]);

  if (tracking) {
    if (row.daily_bet_limit != null && tracking.bet_total >= row.daily_bet_limit) {
      return res.json({ allowed: false, reason: `Daily bet limit of ${row.daily_bet_limit} reached.` });
    }
    if (row.daily_loss_limit != null && tracking.lost >= row.daily_loss_limit) {
      return res.json({ allowed: false, reason: `Daily loss limit of ${row.daily_loss_limit} reached.` });
    }
    if (row.daily_deposit_limit != null && tracking.deposited >= row.daily_deposit_limit) {
      return res.json({ allowed: false, reason: `Daily deposit limit of ${row.daily_deposit_limit} reached.` });
    }
  }

  res.json({ allowed: true, reason: null });
});

// POST /api/rg/track-bet
app.post('/api/rg/track-bet', express.json(), async (req, res) => {
  const { uid, bet, loss } = req.body;
  if (!uid) return res.status(400).json({ error: 'uid required' });
  const today = new Date().toISOString().slice(0, 10);
  await dbRun(`INSERT INTO daily_tracking (uid, date, bet_total, lost) VALUES ($1, $2, $3, $4)
    ON CONFLICT(uid, date) DO UPDATE SET
      bet_total = bet_total + excluded.bet_total,
      lost = lost + excluded.lost`, [uid, today, bet || 0, loss || 0]);
  res.json({ ok: true });
});

// POST /api/sports/place-bet
app.post('/api/sports/place-bet', express.json(), async (req, res) => {
  const { uid, match_id, match_desc, selection, odds, bet } = req.body;
  if (!uid || !bet || !odds) return res.status(400).json({ error: 'uid, bet, odds required' });

  const row = await dbGet(`SELECT * FROM rg_limits WHERE uid=$1`, [uid]);
  const now = new Date().toISOString();

  // Check self-exclusion
  if (row?.self_exclusion_until && now < row.self_exclusion_until) {
    const permanent = row.self_exclusion_until === '9999-12-31T23:59:59.000Z';
    return res.json({ ok: false, error: permanent ? 'Account permanently self-excluded.' : `Self-excluded until ${row.self_exclusion_until}.` });
  }

  // Check cool-off
  if (row?.cool_off_until && now < row.cool_off_until) {
    return res.json({ ok: false, error: `Cool-off period active until ${row.cool_off_until}.` });
  }

  const today = now.slice(0, 10);
  const tracking = await dbGet(`SELECT * FROM daily_tracking WHERE uid=$1 AND date=$2`, [uid, today]);

  // Check daily bet limit
  if (row?.daily_bet_limit != null) {
    const currentBets = (tracking?.bet_total || 0);
    if (currentBets + bet > row.daily_bet_limit) {
      return res.json({ ok: false, error: `Bet would exceed daily bet limit of ${row.daily_bet_limit}.` });
    }
  }

  // Check daily loss limit (conservative: count full bet as potential loss)
  if (row?.daily_loss_limit != null) {
    const currentLoss = (tracking?.lost || 0);
    if (currentLoss + bet > row.daily_loss_limit) {
      return res.json({ ok: false, error: `Bet would exceed daily loss limit of ${row.daily_loss_limit}.` });
    }
  }

  const user = await getUser(uid);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const betId = uuidv4();
  const potential_win = Math.floor(bet * odds);
  const BIG_BET_THRESHOLD = parseInt(process.env.BIG_BET_THRESHOLD || '1000');

  // Atomic deduction — prevents TOCTOU race condition
  const deductResult = await dbQuery(
    `UPDATE users SET tokens=tokens-$1 WHERE uid=$2 AND tokens>=$1 RETURNING tokens`,
    [bet, uid]);
  if(!deductResult.rows.length) return res.json({ ok: false, error: 'Insufficient tokens' });

  // Large bets require admin approval — tokens already deducted atomically
  if (bet >= BIG_BET_THRESHOLD) {
    await dbRun(`INSERT INTO pending_bets (id, uid, type, match_desc, selection, odds, bet, potential_win)
      VALUES ($1, $2, 'sports', $3, $4, $5, $6, $7)`, [betId, uid, match_desc || null, selection || null, odds, bet, potential_win]);
    if (sockets[uid]) sockets[uid].socket.emit('betPendingApproval', { betId, bet, potential_win, match_desc, selection, odds });
    return res.json({ ok: true, pending_approval: true, betId, bet, potential_win, tokens: deductResult.rows[0].tokens });
  }

  // Store bet
  await dbRun(`INSERT INTO sports_bets (id, uid, match_id, match_desc, selection, odds, bet, potential_win)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [betId, uid, match_id || null, match_desc || null, selection || null, odds, bet, potential_win]);

  // Update daily tracking
  await dbRun(`INSERT INTO daily_tracking (uid, date, bet_total, lost) VALUES ($1, $2, $3, 0)
    ON CONFLICT(uid, date) DO UPDATE SET bet_total = bet_total + excluded.bet_total`, [uid, today, bet]);

  await trackWagering(uid, bet);
  res.json({ ok: true, betId, potential_win, tokens: user.tokens - bet });
});

// GET /admin/bets - game bet history
app.get('/admin/bets', adminAuth, async (req, res) => {
  try {
    const { limit = 200, game, won } = req.query;
    let sql = `SELECT g.*, u.name FROM game_log g LEFT JOIN users u ON g.uid=u.uid WHERE 1=1`;
    const params = [];
    if (game) { sql += ` AND g.game=$${params.length+1}`; params.push(game); }
    if (won !== undefined && won !== '') { sql += ` AND g.won=$${params.length+1}`; params.push(parseInt(won)); }
    sql += ` ORDER BY g.ts DESC LIMIT $${params.length+1}`;
    params.push(parseInt(limit));
    const rows = await dbAll(sql, params);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /admin/pending-bets
app.get('/admin/pending-bets', adminAuth, async (req, res) => {
  try {
    const rows = await dbAll(`SELECT pb.*, u.name as player_name, u.tokens as player_tokens
      FROM pending_bets pb LEFT JOIN users u ON pb.uid=u.uid
      WHERE pb.status='pending' ORDER BY pb.created_at DESC`, []);
    res.json(rows);
  } catch(e) { res.json([]); }
});

// POST /admin/pending-bets/approve/:id
app.post('/admin/pending-bets/approve/:id', adminAuth, async (req, res) => {
  const pb = await dbGet(`SELECT * FROM pending_bets WHERE id=$1`, [req.params.id]);
  if (!pb) return res.status(404).json({ error: 'Not found' });
  if (pb.status !== 'pending') return res.status(400).json({ error: 'Already reviewed' });
  await dbRun(`UPDATE pending_bets SET status='approved', reviewed_at=NOW() WHERE id=$1`, [pb.id]);
  // Move to sports_bets
  await dbRun(`INSERT INTO sports_bets (id, uid, match_desc, selection, odds, bet, potential_win)
    VALUES ($1, $2, $3, $4, $5, $6, $7)`, [pb.id, pb.uid, pb.match_desc, pb.selection, pb.odds, pb.bet, pb.potential_win]);
  const today = new Date().toISOString().slice(0, 10);
  await dbRun(`INSERT INTO daily_tracking (uid, date, bet_total, lost) VALUES ($1, $2, $3, 0)
    ON CONFLICT(uid, date) DO UPDATE SET bet_total = bet_total + excluded.bet_total`, [pb.uid, today, pb.bet]);
  if (sockets[pb.uid]) sockets[pb.uid].socket.emit('betApproved', { betId: pb.id, potential_win: pb.potential_win });
  res.json({ ok: true });
});

// POST /admin/pending-bets/reject/:id
app.post('/admin/pending-bets/reject/:id', adminAuth, express.json(), async (req, res) => {
  const pb = await dbGet(`SELECT * FROM pending_bets WHERE id=$1`, [req.params.id]);
  if (!pb) return res.status(404).json({ error: 'Not found' });
  if (pb.status !== 'pending') return res.status(400).json({ error: 'Already reviewed' });
  const reason = req.body?.reason || 'Atsisakyta administratoriaus';
  await dbRun(`UPDATE pending_bets SET status='rejected', reject_reason=$1, reviewed_at=NOW() WHERE id=$2`, [reason, pb.id]);
  // Refund tokens
  await dbRun(`UPDATE users SET tokens=tokens+$1 WHERE uid=$2`, [pb.bet, pb.uid]);
  if (sockets[pb.uid]) sockets[pb.uid].socket.emit('betRejected', { betId: pb.id, bet: pb.bet, reason });
  res.json({ ok: true });
});

// GET /admin/sports-bets
app.get('/admin/sports-bets', adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT sb.*, u.name as player_name FROM sports_bets sb LEFT JOIN users u ON sb.uid=u.uid WHERE 1=1`;
    const params = [];
    if (status) { sql += ` AND sb.status=$${params.length+1}`; params.push(status); }
    sql += ' ORDER BY sb.created_at DESC LIMIT 500';
    const bets = await dbAll(sql, params);
    res.json(bets);
  } catch(e) { res.json([]); }
});

// POST /admin/sports-settle/:betId
app.post('/admin/sports-settle/:betId', adminAuth, express.json(), async (req, res) => {
  const { won } = req.body;
  if (typeof won !== 'boolean') return res.status(400).json({ error: 'won (boolean) required' });

  const bet = await dbGet(`SELECT * FROM sports_bets WHERE id=$1`, [req.params.betId]);
  if (!bet) return res.status(404).json({ error: 'Bet not found' });
  if (bet.status !== 'pending') return res.status(400).json({ error: 'Bet already settled' });

  const status = won ? 'won' : 'lost';
  const result = won ? bet.potential_win : 0;

  await dbRun(`UPDATE sports_bets SET status=$1, result=$2 WHERE id=$3`, [status, result, bet.id]);

  if (won) {
    await dbRun(`UPDATE users SET tokens=tokens+$1 WHERE uid=$2`, [bet.potential_win, bet.uid]);
  } else {
    // Record the actual loss in daily tracking
    const today = new Date().toISOString().slice(0, 10);
    await dbRun(`INSERT INTO daily_tracking (uid, date, lost) VALUES ($1, $2, $3)
      ON CONFLICT(uid, date) DO UPDATE SET lost = lost + excluded.lost`, [bet.uid, today, bet.bet]);
  }

  if (sockets[bet.uid]) {
    sockets[bet.uid].socket.emit('sportsBetSettled', { betId: bet.id, status, result });
  }

  res.json({ ok: true, status, result });
});

const PORT=process.env.PORT||3000;

// ── AI Support Chat ───────────────────────────────
app.post('/api/support', express.json(), async (req,res)=>{
  const {message, lang} = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if(!apiKey) return res.json({reply:'Support temporarily unavailable.'});
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'x-api-key':apiKey,'anthropic-version':'2023-06-01','content-type':'application/json'},
      body: JSON.stringify({
        model:'claude-haiku-4-5-20251001',
        max_tokens:200,
        system:`You are a friendly customer support agent for HATHOR Royal Casino - a premium online crypto casino. 
Language: Respond in the same language the user writes in (${lang||'en'}).
Topics you can help with: games (slots, roulette, blackjack, poker, baccarat, crash, pyramid drop, sports betting), bonuses (daily 500-3000 tokens), jackpot, crypto payments (BTC/ETH/USDT/BNB), account, Provably Fair system, VIP levels.
Be helpful, friendly and concise (2-3 sentences max). Never discuss real money gambling laws.`,
        messages:[{role:'user',content:message}]
      })
    });
    const data = await response.json();
    const reply = data.content?.[0]?.text || 'How can I help you?';
    res.json({reply});
  } catch(e) {
    res.json({reply:'Support temporarily unavailable. Please try again.'});
  }
});


// ── RTP endpoints ──
app.get('/api/rtp-config', async (req,res) => {
  res.json(rtpConfig);
});

app.post('/api/rtp-config', adminAuth, express.json(), async (req,res) => {
  const updates = req.body || {};
  for(const [k,v] of Object.entries(updates)){
    if(k in rtpConfig && typeof v==='number' && v>=50 && v<=99){
      rtpConfig[k] = Math.round(v);
    }
  }
  await setSetting('rtp_config', JSON.stringify(rtpConfig));
  res.json({ok:true, rtpConfig});
});

// ── Provably Fair endpoints ────────────────────────────────
app.post('/api/pf/new', express.json(), async (req,res) => {
  const { uid, game } = req.body || {};
  if(!uid || !game) return res.status(400).json({error:'Missing uid/game'});
  const round = await pfNewRound(uid, game);
  res.json(round);
});
app.post('/api/pf/verify', express.json(), async (req,res) => {
  const { roundId, clientSeed, nonce } = req.body || {};
  if(!roundId) return res.status(400).json({error:'Missing roundId'});
  const result = await pfReveal(roundId, clientSeed, nonce);
  if(!result) return res.status(404).json({error:'Round not found'});
  res.json(result);
});
app.get('/api/pf/history/:uid', async (req,res) => {
  const rows = await dbAll(`SELECT round_id,game,server_hash,client_seed,nonce,result,revealed,created_at FROM provably_fair WHERE uid=$1 ORDER BY created_at DESC LIMIT 50`, [req.params.uid]);
  res.json(rows);
});

// ── Gambling limits endpoints ──────────────────────────────
app.get('/api/limits/:uid', async (req,res) => {
  res.json(await getLimits(req.params.uid));
});
app.post('/api/limits', express.json(), async (req,res) => {
  const { uid, daily_limit, weekly_limit } = req.body || {};
  if(!uid) return res.status(400).json({error:'Missing uid'});
  await dbAll(`INSERT INTO gambling_limits(uid,daily_limit,weekly_limit) VALUES($1,$2,$3)
    ON CONFLICT(uid) DO UPDATE SET daily_limit=excluded.daily_limit,weekly_limit=excluded.weekly_limit,updated_at=NOW()`)
    .run(uid, daily_limit||0, weekly_limit||0);
  res.json({ok:true});
});
app.post('/api/self-exclude', express.json(), async (req,res) => {
  const { uid, days } = req.body || {};
  if(!uid) return res.status(400).json({error:'Missing uid'});
  const d = Math.min(Math.max(parseInt(days)||30, 1), 365);
  const until = new Date(Date.now() + d*24*60*60*1000).toISOString();
  await dbRun(`INSERT INTO gambling_limits(uid,self_excluded,excluded_until) VALUES($1,1,$2)
    ON CONFLICT(uid) DO UPDATE SET self_excluded=1,excluded_until=EXCLUDED.excluded_until,updated_at=NOW()`,
    [uid, until]);
  res.json({ok:true, excluded_until: until});
});
app.post('/api/self-exclude/cancel', adminAuth, express.json(), async (req,res) => {
  const { uid } = req.body || {};
  await dbRun(`UPDATE gambling_limits SET self_excluded=0,excluded_until=NULL WHERE uid=$1`, [uid]);
  res.json({ok:true});
});

// ── Bonus endpoints ────────────────────────────────────────
app.get('/api/bonus/:uid', async (req,res) => {
  const bonuses = await dbAll(`SELECT * FROM bonuses WHERE uid=$1 ORDER BY created_at DESC LIMIT 10`, [req.params.uid]);
  res.json(bonuses);
});
app.post('/api/bonus/give', adminAuth, express.json(), async (req,res) => {
  const { uid, type, amount, wagering } = req.body || {};
  if(!uid || !amount) return res.status(400).json({error:'Missing fields'});
  const result = await giveBonus(uid, type||'manual', amount, wagering||10);
  const sock = sockets[uid];
  if(sock) sock.emit('bonusAwarded', { type: type||'manual', amount, wagering_req: result.wagering_req });
  res.json({ok:true, ...result});
});
app.post('/api/bonus/welcome', express.json(), async (req,res) => {
  const { uid } = req.body || {};
  if(!uid) return res.status(400).json({error:'Missing uid'});
  const existing = await dbGet(`SELECT id FROM bonuses WHERE uid=$1 AND type='welcome'`, [uid]);
  if(existing) return res.json({ok:false, reason:'already_claimed'});
  const result = await giveBonus(uid, 'welcome', 5000, 15);
  res.json({ok:true, ...result});
});

// ── New Bonus System API endpoints ───────────────────────────

// Admin: get all bonus settings
app.get('/api/admin/bonus-settings', adminAuth, async (req, res) => {
  try {
    const s = await getBonusSettings();
    res.json(s);
  } catch(e) { res.status(500).json({error: e.message}); }
});

// Admin: update bonus settings
app.post('/api/admin/bonus-settings', adminAuth, express.json(), async (req, res) => {
  try {
    const updates = req.body || {};
    for (const [key, value] of Object.entries(updates)) {
      await dbRun(`INSERT INTO bonus_settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, [key, String(value)]);
    }
    res.json({ok: true, settings: await getBonusSettings()});
  } catch(e) { res.status(500).json({error: e.message}); }
});

// Admin: bonus stats
app.get('/api/admin/bonus-stats', adminAuth, async (req, res) => {
  try {
    const total = await dbGet(`SELECT COUNT(*) as count, COALESCE(SUM(bonus_tokens),0) as total_tokens FROM player_bonuses`, []);
    const unlocked = await dbGet(`SELECT COUNT(*) as count, COALESCE(SUM(bonus_tokens),0) as total_tokens FROM player_bonuses WHERE status='completed'`, []);
    const expired = await dbGet(`SELECT COUNT(*) as count, COALESCE(SUM(bonus_tokens),0) as total_tokens FROM player_bonuses WHERE status IN('expired','cancelled')`, []);
    const active = await dbGet(`SELECT COUNT(*) as count FROM player_bonuses WHERE status='active'`, []);
    const byType = await dbAll(`SELECT bonus_type, COUNT(*) as count, COALESCE(SUM(bonus_tokens),0) as total_tokens FROM player_bonuses GROUP BY bonus_type`, []);
    res.json({
      total: {count: parseInt(total?.count||0), tokens: parseInt(total?.total_tokens||0)},
      unlocked: {count: parseInt(unlocked?.count||0), tokens: parseInt(unlocked?.total_tokens||0)},
      expired: {count: parseInt(expired?.count||0), tokens: parseInt(expired?.total_tokens||0)},
      active: parseInt(active?.count||0),
      byType
    });
  } catch(e) { res.status(500).json({error: e.message}); }
});

// Player: get bonus status
app.get('/api/bonus/status', async (req, res) => {
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const uid = await checkSession(token);
  if(!uid) return res.status(401).json({error:'Unauthorized'});
  try {
    const active = await dbAll(`SELECT * FROM player_bonuses WHERE uid=$1 AND status='active' ORDER BY created_at DESC`, [uid]);
    const s = await getBonusSettings();
    const dailyMax = parseInt(s.daily_max || 3000);
    // Check last daily claim
    const lastDaily = await dbGet(`SELECT created_at FROM player_bonuses WHERE uid=$1 AND bonus_type='daily' ORDER BY created_at DESC LIMIT 1`, [uid]);
    let canClaimDaily = s.daily_enabled === 'true';
    if(canClaimDaily && lastDaily) {
      const lastDate = new Date(lastDaily.created_at).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      if(lastDate === today) canClaimDaily = false;
    }
    // Seconds until midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    const nextDailyIn = Math.floor((midnight - now) / 1000);
    res.json({active, canClaimDaily, nextDailyIn, dailyMax});
  } catch(e) { res.status(500).json({error: e.message}); }
});

// Player: claim daily bonus
app.post('/api/bonus/claim-daily', express.json(), async (req, res) => {
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const uid = await checkSession(token);
  if(!uid) return res.status(401).json({error:'Unauthorized'});
  try {
    const s = await getBonusSettings();
    if(s.daily_enabled !== 'true') return res.json({ok:false, error:'Daily bonus is disabled'});
    // Check if already claimed today
    const lastDaily = await dbGet(`SELECT created_at FROM player_bonuses WHERE uid=$1 AND bonus_type='daily' ORDER BY created_at DESC LIMIT 1`, [uid]);
    if(lastDaily) {
      const lastDate = new Date(lastDaily.created_at).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      if(lastDate === today) return res.json({ok:false, error:'Already claimed today'});
    }
    // Calculate streak
    const recentDailies = await dbAll(`SELECT created_at FROM player_bonuses WHERE uid=$1 AND bonus_type='daily' ORDER BY created_at DESC LIMIT 30`, [uid]);
    let streak = 1;
    for(let i = 0; i < recentDailies.length; i++) {
      const d = new Date(recentDailies[i].created_at);
      const expected = new Date();
      expected.setUTCDate(expected.getUTCDate() - (i + 1));
      const dDate = d.toISOString().split('T')[0];
      const eDate = expected.toISOString().split('T')[0];
      if(dDate === eDate) streak++;
      else break;
    }
    const base = parseInt(s.daily_base || 500);
    const mult = parseFloat(s.daily_streak_mult || 1.1);
    const maxBonus = parseInt(s.daily_max || 3000);
    let tokens = Math.floor(base * Math.pow(mult, streak - 1));
    tokens = Math.min(tokens, maxBonus);
    const wageringRequired = tokens * 5;
    const expires = new Date(Date.now() + 7*24*60*60*1000).toISOString();
    await givePlayerBonus(uid, 'daily', tokens, wageringRequired, expires);
    res.json({ok: true, tokens, wagering_required: wageringRequired, streak});
  } catch(e) { res.status(500).json({error: e.message}); }
});

// VIP status endpoint
app.get('/api/vip/status', async (req, res) => {
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const uid = await checkSession(token);
  if(!uid) return res.status(401).json({error:'Unauthorized'});
  try {
    const user = await getUser(uid);
    if(!user) return res.status(404).json({error:'User not found'});
    const xp = user.xp || 0;
    const level = getVipLevel(xp);
    const nextLevel = VIP_LEVELS.find(l => l.minXp > xp) || null;
    const xpToNext = nextLevel ? nextLevel.minXp - xp : 0;
    const progressPct = nextLevel
      ? Math.min(100, Math.round((xp - level.minXp) / (nextLevel.minXp - level.minXp) * 100))
      : 100;
    res.json({ level, nextLevel, xp, xpToNext, progressPct });
  } catch(e) { res.status(500).json({error: e.message}); }
});

// Internal: first deposit bonus (called from deposit handlers)
async function checkFirstDepositBonus(uid, depositTokens) {
  try {
    const s = await getBonusSettings();
    if(s.first_dep_enabled !== 'true') return;
    // Check if this player already has a first_deposit bonus
    const existing = await dbGet(`SELECT id FROM player_bonuses WHERE uid=$1 AND bonus_type='first_deposit'`, [uid]);
    if(existing) return;
    // Check if this is truly the first deposit
    const depCount = await dbGet(`SELECT COUNT(*) as c FROM transactions WHERE uid=$1 AND type='deposit' AND status IN('finished','completed')`, [uid]);
    if(parseInt(depCount?.c||0) > 1) return;
    const pct = parseInt(s.first_dep_pct || 100);
    const maxBonus = parseInt(s.first_dep_max || 5000);
    const wagMult = parseInt(s.first_dep_wagering || 30);
    let bonusTokens = Math.floor(depositTokens * pct / 100);
    bonusTokens = Math.min(bonusTokens, maxBonus);
    if(bonusTokens <= 0) return;
    const wageringRequired = bonusTokens * wagMult;
    const expires = new Date(Date.now() + 30*24*60*60*1000).toISOString();
    await givePlayerBonus(uid, 'first_deposit', bonusTokens, wageringRequired, expires);
    if(sockets[uid]) sockets[uid].socket.emit('bonusAwarded', {type:'first_deposit', amount: bonusTokens, wagering_req: wageringRequired});
  } catch(e) { console.error('checkFirstDepositBonus error:', e.message); }
}

// ── Affiliate endpoints ────────────────────────────────────

// Helper: calculate affiliate stats for given aff_uid and date range
async function calcAffStats(affUid, fromDate, toDate) {
  // Validate date format strictly (YYYY-MM-DD) to prevent injection
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const useDates = fromDate && toDate && dateRe.test(fromDate) && dateRe.test(toDate);

  let regCount, ftdCount;
  if(useDates) {
    regCount = await dbGet(
      `SELECT COUNT(*) as c FROM referrals r WHERE r.ref_by=$1 AND r.created_at >= $2 AND r.created_at <= $3::date + interval '1 day'`,
      [affUid, fromDate, toDate]);
    ftdCount = await dbGet(
      `SELECT COUNT(*) as c, COALESCE(SUM(r.ftd_amount),0) as ftd_total FROM referrals r WHERE r.ref_by=$1 AND r.ftd_date IS NOT NULL AND r.ftd_date >= $2 AND r.ftd_date <= $3::date + interval '1 day'`,
      [affUid, fromDate, toDate]);
  } else {
    regCount = await dbGet(
      `SELECT COUNT(*) as c FROM referrals r WHERE r.ref_by=$1`, [affUid]);
    ftdCount = await dbGet(
      `SELECT COUNT(*) as c, COALESCE(SUM(r.ftd_amount),0) as ftd_total FROM referrals r WHERE r.ref_by=$1 AND r.ftd_date IS NOT NULL`, [affUid]);
  }
  const cpaCount = await dbGet(
    `SELECT COUNT(*) as c, COALESCE(SUM(ac.amount),0) as total FROM affiliate_commissions ac WHERE ac.aff_uid=$1 AND ac.type='cpa'`, [affUid]);
  const rsTotal = await dbGet(
    `SELECT COALESCE(SUM(ac.amount),0) as total FROM affiliate_commissions ac WHERE ac.aff_uid=$1 AND ac.type='revshare'`, [affUid]);

  // GGR for all referred players
  const playerUids = await dbAll(`SELECT uid FROM referrals WHERE ref_by=$1`, [affUid]);
  const uids = playerUids.map(r=>r.uid);
  let ggr = 0, ngr = 0, totalDeposits = 0;
  if(uids.length > 0) {
    const uidList = uids.map((_,i)=>'$'+(i+2)).join(',');
    const ggrRow = await dbGet(
      `SELECT COALESCE(SUM(bet-result),0) as ggr FROM game_log WHERE uid IN(${uidList})`, [affUid, ...uids]);
    ggr = parseInt(ggrRow?.ggr||0);
    // NGR = GGR - bonuses given to those players
    const bonusRow = await dbGet(
      `SELECT COALESCE(SUM(amount),0) as total FROM bonuses WHERE uid IN(${uidList}) AND status IN('active','completed')`, [affUid, ...uids]);
    ngr = Math.max(0, ggr - parseInt(bonusRow?.total||0));
    const depRow = await dbGet(
      `SELECT COALESCE(SUM(amount_tokens),0) as total FROM transactions WHERE uid IN(${uidList}) AND type='deposit' AND status='completed'`, [affUid, ...uids]);
    totalDeposits = parseInt(depRow?.total||0);
  }

  const totalCommission = parseInt(cpaCount?.total||0) + parseInt(rsTotal?.total||0);

  return {
    registrations: parseInt(regCount?.c||0),
    ftd_count: parseInt(ftdCount?.c||0),
    ftd_amount: parseInt(ftdCount?.ftd_total||0),
    cpa_count: parseInt(cpaCount?.c||0),
    cpa_amount: parseInt(cpaCount?.total||0),
    rs_amount: parseInt(rsTotal?.total||0),
    total_deposits: totalDeposits,
    ggr, ngr,
    total_commission: totalCommission,
    casino_net: ngr - totalCommission
  };
}

// Affiliate: get own ref code (old endpoint kept for compat)
app.get('/api/affiliate/:uid', async (req,res) => {
  const aff = await getOrCreateAffiliate(req.params.uid);
  const referrals = await dbAll(`SELECT r.uid, u.name, u.created_at FROM referrals r JOIN users u ON r.uid=u.uid WHERE r.ref_by=$1`, [req.params.uid]);
  res.json({...aff, referrals});
});
app.post('/api/affiliate/register', express.json(), async (req,res) => {
  const { uid, ref_code } = req.body || {};
  if(uid && ref_code) await processReferral(uid, ref_code);
  res.json({ok:true});
});

// Admin: list all affiliates
app.get('/api/admin/affiliates', adminAuth, async (req,res) => {
  try {
    const rows = await dbAll(`
      SELECT a.uid, a.ref_code, a.referred, a.earnings, a.created_at,
        u.name, ad.deal_type, ad.cpa_amount, ad.rs_percent, ad.status
      FROM affiliates a
      LEFT JOIN users u ON a.uid=u.uid
      LEFT JOIN affiliate_deals ad ON a.uid=ad.uid
      ORDER BY a.created_at DESC
    `, []);
    res.json(rows);
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Admin: create or update affiliate deal
app.post('/api/admin/affiliates/deal', adminAuth, express.json(), async (req,res) => {
  try {
    const { uid, deal_type, cpa_amount, rs_percent, cpa_min_deposit, status, notes } = req.body || {};
    if(!uid) return res.status(400).json({error:'uid required'});
    // Ensure affiliates record exists
    const aff = await dbGet(`SELECT uid FROM affiliates WHERE uid=$1`, [uid]);
    if(!aff) {
      const ref_code = crypto.randomBytes(4).toString('hex').toUpperCase();
      await dbRun(`INSERT INTO affiliates(uid,ref_code) VALUES($1,$2) ON CONFLICT DO NOTHING`, [uid, ref_code]);
    }
    await dbRun(`
      INSERT INTO affiliate_deals(uid,deal_type,cpa_amount,rs_percent,cpa_min_deposit,status,notes)
      VALUES($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT(uid) DO UPDATE SET
        deal_type=EXCLUDED.deal_type, cpa_amount=EXCLUDED.cpa_amount,
        rs_percent=EXCLUDED.rs_percent, cpa_min_deposit=EXCLUDED.cpa_min_deposit,
        status=EXCLUDED.status, notes=EXCLUDED.notes
    `, [uid, deal_type||'hybrid', cpa_amount||50, rs_percent||25, cpa_min_deposit||0, status||'active', notes||null]);
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Admin: affiliate-level report
app.get('/api/admin/affiliates/report', adminAuth, async (req,res) => {
  try {
    const { from, to, aff_uid } = req.query;
    let where = aff_uid ? `WHERE a.uid=$1` : `WHERE 1=1`;
    const params = aff_uid ? [aff_uid] : [];
    const affiliates = await dbAll(`
      SELECT a.uid, a.ref_code, u.name, ad.deal_type, ad.cpa_amount, ad.rs_percent, ad.status
      FROM affiliates a
      LEFT JOIN users u ON a.uid=u.uid
      LEFT JOIN affiliate_deals ad ON a.uid=ad.uid
      ${where} ORDER BY a.created_at DESC
    `, params);

    const results = [];
    for(const aff of affiliates) {
      const stats = await calcAffStats(aff.uid, from, to);
      results.push({ ...aff, ...stats });
    }
    res.json(results);
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Admin: player-level report
app.get('/api/admin/affiliates/players', adminAuth, async (req,res) => {
  try {
    const { from, to, aff_uid, player_uid } = req.query;
    let where = `WHERE 1=1`;
    const params = [];
    if(aff_uid) { params.push(aff_uid); where += ` AND r.ref_by=$${params.length}`; }
    if(player_uid) { params.push(player_uid); where += ` AND r.uid=$${params.length}`; }
    if(from) { params.push(from); where += ` AND r.created_at >= $${params.length}`; }
    if(to) { params.push(to+' 23:59:59'); where += ` AND r.created_at <= $${params.length}`; }

    const players = await dbAll(`
      SELECT r.uid as player_uid, u.name as player_name,
        af.uid as aff_uid, au.name as aff_name, af.ref_code,
        ac.name as campaign_name, ac.code as campaign_code,
        r.created_at as reg_date, r.ftd_date, r.ftd_amount, r.cpa_paid,
        r.country
      FROM referrals r
      LEFT JOIN users u ON r.uid=u.uid
      LEFT JOIN affiliates af ON r.ref_by=af.uid
      LEFT JOIN users au ON af.uid=au.uid
      LEFT JOIN affiliate_campaigns ac ON r.campaign_id=ac.id
      ${where} ORDER BY r.created_at DESC LIMIT 500
    `, params);

    // Add per-player GGR/NGR
    const results = [];
    for(const p of players) {
      const ggrRow = await dbGet(`SELECT COALESCE(SUM(bet-result),0) as ggr, COALESCE(SUM(bet),0) as total_bet FROM game_log WHERE uid=$1`, [p.player_uid]);
      const bonusRow = await dbGet(`SELECT COALESCE(SUM(amount),0) as total FROM bonuses WHERE uid=$1`, [p.player_uid]);
      const depRow = await dbGet(`SELECT COALESCE(SUM(amount_tokens),0) as total FROM transactions WHERE uid=$1 AND type='deposit' AND status='completed'`, [p.player_uid]);
      const ggr = parseInt(ggrRow?.ggr||0);
      const ngr = Math.max(0, ggr - parseInt(bonusRow?.total||0));
      const cpaComm = await dbGet(`SELECT COALESCE(SUM(amount),0) as total FROM affiliate_commissions WHERE player_uid=$1 AND type='cpa'`, [p.player_uid]);
      const rsComm = await dbGet(`SELECT COALESCE(SUM(amount),0) as total FROM affiliate_commissions WHERE player_uid=$1 AND type='revshare'`, [p.player_uid]);
      const deal = await dbGet(`SELECT * FROM affiliate_deals WHERE uid=$1`, [p.aff_uid]);
      results.push({
        ...p,
        total_deposits: parseInt(depRow?.total||0),
        casino_ggr: ggr,
        casino_ngr: ngr,
        cpa_amount: parseInt(cpaComm?.total||0),
        rs_amount: parseInt(rsComm?.total||0),
        casino_net: ngr - parseInt(cpaComm?.total||0) - parseInt(rsComm?.total||0),
        deal_structure: deal ? `${deal.deal_type==='cpa'?'CPA'+deal.cpa_amount:deal.deal_type==='revshare'?'RS'+deal.rs_percent+'%':'CPA'+deal.cpa_amount+'+RS'+deal.rs_percent+'%'}` : 'N/A'
      });
    }
    res.json(results);
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Admin: campaign-level report
app.get('/api/admin/affiliates/campaigns', adminAuth, async (req,res) => {
  try {
    const { from, to } = req.query;
    const campaigns = await dbAll(`
      SELECT ac.id, ac.aff_uid, ac.name, ac.code, ac.clicks, ac.created_at,
        u.name as aff_name
      FROM affiliate_campaigns ac
      LEFT JOIN users u ON ac.aff_uid=u.uid
      ORDER BY ac.created_at DESC
    `, []);

    const results = [];
    for(const c of campaigns) {
      let where = `WHERE r.campaign_id=$1`;
      const params = [c.id];
      if(from) { params.push(from); where += ` AND r.created_at>=$${params.length}`; }
      if(to) { params.push(to+' 23:59:59'); where += ` AND r.created_at<=$${params.length}`; }
      const regCount = await dbGet(`SELECT COUNT(*) as c FROM referrals r ${where}`, params);
      const ftdCount = await dbGet(`SELECT COUNT(*) as c, COALESCE(SUM(ftd_amount),0) as ftd_total FROM referrals r WHERE r.campaign_id=$1 AND r.ftd_date IS NOT NULL`, [c.id]);
      const cpaComm = await dbGet(`SELECT COUNT(*) as c, COALESCE(SUM(ac2.amount),0) as total FROM affiliate_commissions ac2 JOIN referrals r ON r.uid=ac2.player_uid WHERE r.campaign_id=$1 AND ac2.type='cpa'`, [c.id]);
      const playerUids = await dbAll(`SELECT uid FROM referrals WHERE campaign_id=$1`, [c.id]);
      let ggr=0, ngr=0, deposits=0;
      if(playerUids.length > 0) {
        const uids = playerUids.map(r=>r.uid);
        const uidList = uids.map((_,i)=>'$'+(i+1)).join(',');
        const ggrRow = await dbGet(`SELECT COALESCE(SUM(bet-result),0) as ggr FROM game_log WHERE uid IN(${uidList})`, uids);
        const bonRow = await dbGet(`SELECT COALESCE(SUM(amount),0) as total FROM bonuses WHERE uid IN(${uidList})`, uids);
        const depRow = await dbGet(`SELECT COALESCE(SUM(amount_tokens),0) as total FROM transactions WHERE uid IN(${uidList}) AND type='deposit' AND status='completed'`, uids);
        ggr = parseInt(ggrRow?.ggr||0);
        ngr = Math.max(0, ggr - parseInt(bonRow?.total||0));
        deposits = parseInt(depRow?.total||0);
      }
      const totalComm = parseInt(cpaComm?.total||0);
      results.push({
        ...c,
        registrations: parseInt(regCount?.c||0),
        ftd_count: parseInt(ftdCount?.c||0),
        ftd_amount: parseInt(ftdCount?.ftd_total||0),
        cpa_count: parseInt(cpaComm?.c||0),
        cpa_amount: totalComm,
        total_deposits: deposits,
        casino_ggr: ggr,
        casino_ngr: ngr,
        casino_net: ngr - totalComm
      });
    }
    res.json(results);
  } catch(e) { res.status(500).json({error:e.message}); }
});

// CSV export helper
function toCSV(rows) {
  if(!rows||!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for(const r of rows) {
    lines.push(headers.map(h => {
      const v = r[h];
      if(v===null||v===undefined) return '';
      const s = String(v).replace(/"/g,'""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    }).join(','));
  }
  return lines.join('\n');
}

// Admin: CSV exports
app.get('/api/admin/affiliates/report/csv', adminAuth, async (req,res) => {
  const data = await (async()=>{ const r = await fetch(`http://localhost:${PORT}/api/admin/affiliates/report?${new URLSearchParams(req.query)}`, {headers:{'x-admin-key':ADMIN_PASSWORD}}); return r.json(); })();
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition','attachment; filename="affiliate-report.csv"');
  res.send(toCSV(Array.isArray(data)?data:[]));
});

app.get('/api/admin/affiliates/players/csv', adminAuth, async (req,res) => {
  const data = await (async()=>{ const r = await fetch(`http://localhost:${PORT}/api/admin/affiliates/players?${new URLSearchParams(req.query)}`, {headers:{'x-admin-key':ADMIN_PASSWORD}}); return r.json(); })();
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition','attachment; filename="affiliate-players.csv"');
  res.send(toCSV(Array.isArray(data)?data:[]));
});

app.get('/api/admin/affiliates/campaigns/csv', adminAuth, async (req,res) => {
  const data = await (async()=>{ const r = await fetch(`http://localhost:${PORT}/api/admin/affiliates/campaigns?${new URLSearchParams(req.query)}`, {headers:{'x-admin-key':ADMIN_PASSWORD}}); return r.json(); })();
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition','attachment; filename="affiliate-campaigns.csv"');
  res.send(toCSV(Array.isArray(data)?data:[]));
});

// Affiliate portal: get my stats
app.get('/api/affiliate/me', affiliateAuth, async (req,res) => {
  try {
    const uid = req.affUid;
    const aff = await dbGet(`SELECT * FROM affiliates WHERE uid=$1`, [uid]);
    const deal = req.affDeal;
    const stats = await calcAffStats(uid, null, null);
    const campaigns = await dbAll(`SELECT * FROM affiliate_campaigns WHERE aff_uid=$1 ORDER BY created_at DESC`, [uid]);
    const user = await getUser(uid);
    res.json({ uid, name:user?.name, ref_code:aff?.ref_code, deal, stats, campaigns });
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Affiliate portal: report
app.get('/api/affiliate/report', affiliateAuth, async (req,res) => {
  try {
    const stats = await calcAffStats(req.affUid, req.query.from, req.query.to);
    res.json(stats);
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Affiliate portal: player report
app.get('/api/affiliate/players', affiliateAuth, async (req,res) => {
  try {
    const { from, to, player_uid } = req.query;
    let where = `WHERE r.ref_by=$1`;
    const params = [req.affUid];
    if(player_uid) { params.push(player_uid); where += ` AND (r.uid=$${params.length} OR u.name ILIKE $${params.length})`; }
    if(from) { params.push(from); where += ` AND r.created_at>=$${params.length}`; }
    if(to) { params.push(to+' 23:59:59'); where += ` AND r.created_at<=$${params.length}`; }

    const players = await dbAll(`
      SELECT r.uid as player_id, u.name as username,
        r.country, ac.code as campaign_id, ac.name as campaign_name,
        r.created_at as reg_date, r.ftd_date, r.ftd_amount, r.cpa_paid
      FROM referrals r
      LEFT JOIN users u ON r.uid=u.uid
      LEFT JOIN affiliate_campaigns ac ON r.campaign_id=ac.id
      ${where} ORDER BY r.created_at DESC LIMIT 500
    `, params);

    const results = [];
    for(const p of players) {
      const depRow = await dbGet(`SELECT COALESCE(SUM(amount_tokens),0) as total FROM transactions WHERE uid=$1 AND type='deposit' AND status='completed'`, [p.player_id]);
      const ggrRow = await dbGet(`SELECT COALESCE(SUM(bet-result),0) as ggr FROM game_log WHERE uid=$1`, [p.player_id]);
      const bonRow = await dbGet(`SELECT COALESCE(SUM(amount),0) as total FROM bonuses WHERE uid=$1`, [p.player_id]);
      const cpaComm = await dbGet(`SELECT COALESCE(SUM(amount),0) as total FROM affiliate_commissions WHERE player_uid=$1 AND aff_uid=$2 AND type='cpa'`, [p.player_id, req.affUid]);
      const ggr = parseInt(ggrRow?.ggr||0);
      const ngr = Math.max(0, ggr - parseInt(bonRow?.total||0));
      results.push({
        ...p,
        total_deposits: parseInt(depRow?.total||0),
        casino_ggr: ggr,
        casino_ngr: ngr,
        cpa_count: p.cpa_paid ? 1 : 0,
        cpa_amount: parseInt(cpaComm?.total||0)
      });
    }
    res.json(results);
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Affiliate portal: CSV export
app.get('/api/affiliate/players/csv', affiliateAuth, async (req,res) => {
  const token = req.headers['x-session-token'] || (req.headers.authorization||'').replace('Bearer ','');
  const data = await (async()=>{ const r = await fetch(`http://localhost:${PORT}/api/affiliate/players?${new URLSearchParams(req.query)}`, {headers:{'x-session-token':token}}); return r.json(); })();
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition','attachment; filename="my-players.csv"');
  res.send(toCSV(Array.isArray(data)?data:[]));
});

// Affiliate portal: campaigns
app.get('/api/affiliate/campaigns', affiliateAuth, async (req,res) => {
  const campaigns = await dbAll(`SELECT * FROM affiliate_campaigns WHERE aff_uid=$1 ORDER BY created_at DESC`, [req.affUid]);
  res.json(campaigns);
});

app.post('/api/affiliate/campaigns', affiliateAuth, express.json(), async (req,res) => {
  try {
    const { name } = req.body || {};
    if(!name) return res.status(400).json({error:'Campaign name required'});
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const id = uuidv4();
    await dbRun(`INSERT INTO affiliate_campaigns(id,aff_uid,name,code) VALUES($1,$2,$3,$4)`, [id, req.affUid, name, code]);
    res.json({ok:true, id, code});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Affiliate: payout request (just logs it, admin handles manually)
app.post('/api/affiliate/payout-request', affiliateAuth, express.json(), async (req,res) => {
  try {
    const { notes, amount } = req.body || {};
    const uid = req.affUid;
    const u = await getUser(uid);
    console.log(`💸 PAYOUT REQUEST from ${u?.name||uid} | Amount: ${amount} | Notes: ${notes}`);
    // Store as a setting/log entry so admin can see it
    const key = `payout_req_${uid}_${Date.now()}`;
    await setSetting(key, JSON.stringify({ uid, name:u?.name, amount, notes, ts: new Date().toISOString() }));
    // Email admin about payout request
    try {
      const adminEmailSetting = await dbGet(`SELECT value FROM settings WHERE key='admin_email'`);
      const adminEmail = adminEmailSetting?.value || process.env.SMTP_USER;
      if (adminEmail) {
        const eurAmount = amount ? (amount / 100).toFixed(2) : '?';
        await sendEmail(adminEmail, `Affiliate payout request — ${u?.name||uid}`, emailTemplate(
          'Affiliate Payout Request 💸',
          `<p style="color:rgba(232,226,212,0.7);line-height:1.7">Affiliate payout request from <strong style="color:#c9a84c">${u?.name||uid}</strong>: <strong style="color:#c9a84c">€${eurAmount}</strong>${notes ? '<br>Notes: '+notes : ''}</p>`
        ));
      }
    } catch(emailErr) {}
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Track affiliate link click
app.get('/r/:code', async (req,res) => {
  const { code } = req.params;
  const cid = req.query.cid || null;
  // Increment campaign clicks if cid provided
  if(cid) {
    try { await dbRun(`UPDATE affiliate_campaigns SET clicks=clicks+1 WHERE code=$1`, [cid]); } catch(e){}
  }
  // Redirect to casino with ref params in URL
  const params = new URLSearchParams({ ref: code });
  if(cid) params.set('cid', cid);
  res.redirect(302, '/?' + params.toString());
});

// ── Player Referral Program ───────────────────────────────

function getPlayerRefCode(username) {
  // REF_ + alphanumeric-only uppercase username
  return 'REF_' + username.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// GET /api/referral/my-code — returns code, link, and list of referrals
app.get('/api/referral/my-code', async (req, res) => {
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const uid = await checkSession(token);
  if(!uid) return res.status(401).json({error:'Unauthorized'});
  try {
    const user = await getUser(uid);
    if(!user) return res.status(404).json({error:'User not found'});
    const code = getPlayerRefCode(user.name);
    const baseUrl = process.env.SITE_URL || 'https://casino-production-0712.up.railway.app';
    const link = `${baseUrl}/?pref=${encodeURIComponent(code)}`;
    // Get referrals
    const referrals = await dbAll(
      `SELECT u.name as username, pr.created_at as joinedAt, pr.bonus_given as hasFTD
       FROM player_referrals pr JOIN users u ON pr.referred_uid=u.uid
       WHERE pr.referrer_uid=$1 ORDER BY pr.created_at DESC`,
      [uid]
    );
    res.json({ code, link, referrals });
  } catch(e) { res.status(500).json({error: e.message}); }
});

// POST /api/referral/apply — apply a referral code (if not already referred and no deposit yet)
app.post('/api/referral/apply', express.json(), async (req, res) => {
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const uid = await checkSession(token);
  if(!uid) return res.status(401).json({error:'Unauthorized'});
  try {
    const { code } = req.body || {};
    if(!code) return res.status(400).json({error:'Missing code'});
    // Already referred?
    const existing = await dbGet(`SELECT id FROM player_referrals WHERE referred_uid=$1`, [uid]);
    if(existing) return res.status(400).json({error:'You are already linked to a referral'});
    // Already deposited?
    const depCount = await dbGet(`SELECT COUNT(*) as c FROM transactions WHERE uid=$1 AND type='deposit' AND status IN('finished','completed')`, [uid]);
    if(parseInt(depCount?.c||0) > 0) return res.status(400).json({error:'Cannot apply referral after depositing'});
    // Find referrer by code
    const allUsers = await dbAll(`SELECT uid, name FROM users`);
    const referrer = allUsers.find(u => getPlayerRefCode(u.name) === code.toUpperCase());
    if(!referrer) return res.status(404).json({error:'Invalid referral code'});
    if(referrer.uid === uid) return res.status(400).json({error:'Cannot refer yourself'});
    await dbRun(
      `INSERT INTO player_referrals(referrer_uid, referred_uid) VALUES($1,$2) ON CONFLICT(referred_uid) DO NOTHING`,
      [referrer.uid, uid]
    );
    res.json({ok: true});
  } catch(e) { res.status(500).json({error: e.message}); }
});

// ── Tournament endpoints (legacy compat) ──────────────────
app.get('/api/tournament/active', async (req,res) => {
  const now = new Date().toISOString();
  const t = await dbGet(`SELECT * FROM tournaments WHERE status='active' AND start_at<=$1 AND end_at>=$2 LIMIT 1`, [now, now]);
  if(!t) return res.json(null);
  const leaderboard = await getTournamentLeaderboard(t.id, 10);
  res.json({...t, leaderboard});
});
app.get('/api/tournament/leaderboard/:id', async (req,res) => {
  res.json(await getTournamentLeaderboard(req.params.id, 50));
});
app.post('/api/tournament/create', adminAuth, express.json(), async (req,res) => {
  const { name, game, prize_pool, starts_at, ends_at } = req.body || {};
  if(!name || !starts_at || !ends_at) return res.status(400).json({error:'Missing fields'});
  const r = await dbQuery(
    `INSERT INTO tournaments(name,game_type,prize_pool,start_at,end_at,status) VALUES($1,$2,$3,$4,$5,'scheduled') RETURNING id`,
    [name, game||'slots', prize_pool||10000, starts_at, ends_at]
  );
  res.json({ok:true, id:r.rows[0].id});
});
app.post('/api/tournament/end', adminAuth, express.json(), async (req,res) => {
  const { id } = req.body || {};
  await finishTournament(id);
  const leaderboard = await getTournamentLeaderboard(id, 50);
  res.json({ok:true, leaderboard});
});

// ── Tournament API (new) ──────────────────────────────────
// GET /api/tournaments — active + upcoming with leaderboards
app.get('/api/tournaments', async (req,res) => {
  try {
    const now = new Date().toISOString();
    const tournaments = await dbAll(
      `SELECT * FROM tournaments WHERE status IN ('active','scheduled') ORDER BY start_at ASC LIMIT 20`,
      []
    );
    const result = [];
    for (const t of tournaments) {
      const leaderboard = t.status === 'active' ? await getTournamentLeaderboard(t.id, 10) : [];
      const entryCount = await dbGet(`SELECT COUNT(*) as c FROM tournament_entries WHERE tournament_id=$1`, [t.id]);
      result.push({...t, leaderboard, entry_count: parseInt(entryCount?.c || 0)});
    }
    res.json(result);
  } catch(e) { res.status(500).json({error:e.message}); }
});

// GET /api/tournaments/:id/leaderboard — full leaderboard
app.get('/api/tournaments/:id/leaderboard', async (req,res) => {
  try {
    res.json(await getTournamentLeaderboard(parseInt(req.params.id), 100));
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Admin tournament endpoints
app.post('/api/admin/tournaments', adminAuth, express.json(), async (req,res) => {
  try {
    const { name, game_type, start_at, end_at, prize_pool, min_bet } = req.body || {};
    if(!name || !start_at || !end_at || !prize_pool) return res.status(400).json({error:'Missing fields'});
    const r = await dbQuery(
      `INSERT INTO tournaments(name,game_type,start_at,end_at,prize_pool,min_bet,status) VALUES($1,$2,$3,$4,$5,$6,'scheduled') RETURNING *`,
      [name, game_type||'all', start_at, end_at, prize_pool, min_bet||100]
    );
    res.json({ok:true, tournament: r.rows[0]});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/admin/tournaments', adminAuth, async (req,res) => {
  try {
    const tournaments = await dbAll(`SELECT t.*, (SELECT COUNT(*) FROM tournament_entries te WHERE te.tournament_id=t.id) as players FROM tournaments ORDER BY created_at DESC`, []);
    res.json(tournaments);
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.delete('/api/admin/tournaments/:id', adminAuth, async (req,res) => {
  try {
    const id = parseInt(req.params.id);
    const t = await dbGet(`SELECT status FROM tournaments WHERE id=$1`, [id]);
    if(!t) return res.status(404).json({error:'Not found'});
    if(t.status === 'finished') return res.status(400).json({error:'Cannot delete finished tournament'});
    await dbRun(`DELETE FROM tournament_entries WHERE tournament_id=$1`, [id]);
    await dbRun(`DELETE FROM tournaments WHERE id=$1`, [id]);
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// ── Analytics endpoints ────────────────────────────────────
app.get('/api/analytics', adminAuth, async (req,res) => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const weekAgo = new Date(now - 7*24*60*60*1000).toISOString();
  const monthAgo = new Date(now - 30*24*60*60*1000).toISOString();

  const totalPlayers = await dbGet(`SELECT COUNT(*) as c FROM users`, []).c;
  const activeTodayCount = await dbGet(`SELECT COUNT(DISTINCT uid) as c FROM game_log WHERE ts>=$1`, [today+'T00:00:00']).c;
  const activeWeekCount = await dbGet(`SELECT COUNT(DISTINCT uid) as c FROM game_log WHERE ts>=$1`, [weekAgo]).c;

  const ggr = await dbGet(`SELECT COALESCE(SUM(bet-result),0) as ggr FROM game_log WHERE won=0 OR result < bet`, []);
  const ggrToday = await dbGet(`SELECT COALESCE(SUM(bet-result),0) as ggr FROM game_log WHERE ts>=$1 AND (won=0 OR result<bet)`, [today+'T00:00:00']);
  const ggrWeek  = await dbGet(`SELECT COALESCE(SUM(bet-result),0) as ggr FROM game_log WHERE ts>=$1 AND (won=0 OR result<bet)`, [weekAgo]);

  const totalBets = await dbGet(`SELECT COUNT(*) as c, COALESCE(SUM(bet),0) as vol FROM game_log`, []);
  const betsToday = await dbGet(`SELECT COUNT(*) as c, COALESCE(SUM(bet),0) as vol FROM game_log WHERE ts>=$1`, [today+'T00:00:00']);

  const topGames = await dbAll(`SELECT game, COUNT(*) as plays, COALESCE(SUM(bet),0) as volume FROM game_log GROUP BY game ORDER BY plays DESC LIMIT 10`, []);
  const topPlayers = await dbAll(`SELECT uid, name, COALESCE(SUM(bet),0) as volume, COUNT(*) as plays FROM game_log g JOIN users u USING(uid) GROUP BY uid ORDER BY volume DESC LIMIT 10`, []);

  const newPlayersWeek = await dbGet(`SELECT COUNT(*) as c FROM users WHERE created_at>=$1`, [weekAgo]).c;
  const newPlayersMonth = await dbGet(`SELECT COUNT(*) as c FROM users WHERE created_at>=$1`, [monthAgo]).c;

  const dailyGGR = await dbAll(`SELECT DATE(ts) as day, COALESCE(SUM(bet-result),0) as ggr, COUNT(*) as bets
    FROM game_log WHERE ts>=$1 GROUP BY DATE(ts) ORDER BY day ASC`, [weekAgo]);

  res.json({
    totalPlayers, activeTodayCount, activeWeekCount,
    newPlayersWeek, newPlayersMonth,
    ggr: ggr.ggr, ggrToday: ggrToday.ggr, ggrWeek: ggrWeek.ggr,
    totalBets: totalBets.c, totalVolume: totalBets.vol,
    betsToday: betsToday.c, volumeToday: betsToday.vol,
    topGames, topPlayers, dailyGGR
  });
});

// ── VIP endpoints ──────────────────────────────────────────
app.get('/api/vip/:uid', async (req,res) => {
  const u = await getUser(req.params.uid);
  if(!u) return res.status(404).json({error:'Not found'});
  const lv = getLvInfo(u.xp||0);
  const next = nextLvInfo(u.xp||0);
  const pct = next ? Math.min(100, Math.round(((u.xp||0)-lv.xpNeeded)/(next.xpNeeded-lv.xpNeeded)*100)) : 100;
  // Total wagered (for cashback calc)
  const weekAgo = new Date(Date.now()-7*24*60*60*1000).toISOString();
  const wagered = await dbGet(`SELECT COALESCE(SUM(bet),0) as total FROM game_log WHERE uid=$1 AND ts>=$2`, [req.params.uid, weekAgo]);
  const losses = await dbGet(`SELECT COALESCE(SUM(CASE WHEN result<bet THEN bet-result ELSE 0 END),0) as total FROM game_log WHERE uid=$1 AND ts>=$2`, [req.params.uid, weekAgo]);
  res.json({ level: lv, nextLevel: next, xp: u.xp||0, pct, weeklyWagered: wagered.total, weeklyLosses: losses.total, cashbackPending: Math.floor((losses.total||0)*lv.cashback/100) });
});

app.post('/api/vip/cashback', express.json(), async (req,res) => {
  const { uid } = req.body||{};
  if(!uid) return res.status(400).json({error:'Missing uid'});
  const result = await processCashback(uid);
  if(!result) return res.json({ok:false, reason:'No cashback available'});
  const sock = sockets[uid];
  if(sock) sock.emit('cashbackReceived', result);
  res.json({ok:true, ...result});
});

// Admin: manually trigger cashback for all users
app.post('/api/vip/cashback-all', adminAuth, async (req,res) => {
  const users = await dbAll(`SELECT uid FROM users`, []);
  let processed = 0;
  for (const {uid} of users) { if(await processCashback(uid)) processed++; }
  res.json({ok:true, processed});
});

// ── OneSignal Push Notifications ──────────────────────────
const OS_APP_ID = process.env.ONESIGNAL_APP_ID || '';
const OS_REST_KEY = process.env.ONESIGNAL_REST_API_KEY || '';

async function sendPushNotification(filters, title, message, url) {
  if(!OS_APP_ID || !OS_REST_KEY) {
    console.log('[Push DEMO]', title, '-', message);
    return { demo: true };
  }
  try {
    const r = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + OS_REST_KEY
      },
      body: JSON.stringify({
        app_id: OS_APP_ID,
        filters: filters || [{ field: 'last_session', relation: '>', hours: '-1' }],
        headings: { en: title },
        contents: { en: message },
        url: url || '/',
        chrome_web_icon: '/favicon.ico'
      })
    });
    return await r.json();
  } catch(e) {
    console.error('Push notification error:', e.message);
    return { error: e.message };
  }
}

// Send push to specific user by external_user_id (OneSignal) + VAPID fallback
async function sendPushToUser(uid, title, message, url) {
  // Try VAPID native push first
  if(webpush) { try { await sendVapidPushToUser(uid, title, message, url); } catch(e){} }
  if(!OS_APP_ID || !OS_REST_KEY) {
    console.log('[Push DEMO -> ' + uid + ']', title, '-', message);
    return { demo: true };
  }
  return sendPushNotification(
    [{ field: 'tag', key: 'uid', relation: '=', value: uid }],
    title, message, url
  );
}

// Push status endpoint
app.get('/api/push/status', async (req,res) => {
  res.json({
    enabled: !!(OS_APP_ID && OS_REST_KEY),
    appId: OS_APP_ID || null,
    demo: !(OS_APP_ID && OS_REST_KEY)
  });
});

// Admin: send broadcast notification
app.post('/api/push/broadcast', adminAuth, express.json(), async (req,res) => {
  const { title, message, url } = req.body || {};
  if(!title || !message) return res.status(400).json({ error: 'Missing title or message' });
  const result = await sendPushNotification(null, title, message, url || '/');
  res.json({ ok: true, result, demo: !(OS_APP_ID && OS_REST_KEY) });
});

// Admin: send to specific user
app.post('/api/push/user', adminAuth, express.json(), async (req,res) => {
  const { uid, title, message, url } = req.body || {};
  if(!uid || !title || !message) return res.status(400).json({ error: 'Missing fields' });
  const result = await sendPushToUser(uid, title, message, url || '/');
  res.json({ ok: true, result, demo: !(OS_APP_ID && OS_REST_KEY) });
});

// Register push subscription (store uid tag in OneSignal)
app.post('/api/push/register', express.json(), async (req,res) => {
  const { uid, playerId } = req.body || {};
  if(!uid || !playerId) return res.json({ ok: false });
  if(!OS_APP_ID || !OS_REST_KEY) return res.json({ ok: true, demo: true });
  try {
    await fetch('https://onesignal.com/api/v1/players/' + playerId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + OS_REST_KEY },
      body: JSON.stringify({ app_id: OS_APP_ID, tags: { uid } })
    });
    res.json({ ok: true });
  } catch(e) {
    res.json({ ok: false, error: e.message });
  }
});

// ── VAPID Web Push (native browser push) ─────────────────
// Helper to send native web push to a user
async function sendVapidPushToUser(uid, title, body, url) {
  if(!webpush) return;
  try {
    const subs = await dbAll(`SELECT subscription FROM push_subscriptions WHERE uid=$1`, [uid]);
    for (const s of subs) {
      try {
        await webpush.sendNotification(s.subscription, JSON.stringify({title, body, url: url||'/'}));
      } catch(e) {
        if(e.statusCode === 410) {
          await dbRun(`DELETE FROM push_subscriptions WHERE uid=$1 AND subscription->>'endpoint'=$2`, [uid, s.subscription.endpoint]);
        }
      }
    }
  } catch(e) { console.error('VAPID push error:', e.message); }
}

// GET /api/push/vapid-key
app.get('/api/push/vapid-key', (req,res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

// POST /api/push/subscribe
app.post('/api/push/subscribe', express.json(), async (req,res) => {
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const uid = await checkSession(token);
  if(!uid) return res.status(401).json({error:'Unauthorized'});
  const { subscription } = req.body || {};
  if(!subscription || !subscription.endpoint) return res.status(400).json({error:'Missing subscription'});
  try {
    await dbRun(
      `INSERT INTO push_subscriptions(uid, subscription) VALUES($1,$2) ON CONFLICT(uid, (subscription->>'endpoint')) DO NOTHING`,
      [uid, JSON.stringify(subscription)]
    );
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// POST /api/push/unsubscribe
app.post('/api/push/unsubscribe', express.json(), async (req,res) => {
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const uid = await checkSession(token);
  if(!uid) return res.status(401).json({error:'Unauthorized'});
  const { endpoint } = req.body || {};
  try {
    if(endpoint) {
      await dbRun(`DELETE FROM push_subscriptions WHERE uid=$1 AND subscription->>'endpoint'=$2`, [uid, endpoint]);
    } else {
      await dbRun(`DELETE FROM push_subscriptions WHERE uid=$1`, [uid]);
    }
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// ── STRIPE CARD PAYMENTS ─────────────────────────────────
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_ENABLED = !!STRIPE_SECRET_KEY;

let stripe = null;
if(STRIPE_ENABLED) {
  try { stripe = require('stripe')(STRIPE_SECRET_KEY); } catch(e) { console.error('Stripe init failed:', e.message); }
}

// Tokens per EUR (1 EUR = 100 tokens)
const EUR_TO_TOKENS = 100;

// Expose publishable key to frontend
app.get('/api/stripe/config', async (req, res) => {
  const pubKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
  res.json({ publishableKey: pubKey, enabled: STRIPE_ENABLED && !!pubKey });
});

// Create Stripe PaymentIntent
app.post('/api/stripe/create-payment-intent', express.json(), async (req, res) => {
  try {
    const { uid, amountEur } = req.body;
    if(!uid) return res.status(400).json({ error: 'Missing uid' });
    const eur = parseFloat(amountEur) || 0;
    if(eur < 5) return res.status(400).json({ error: 'Minimum deposit is €5' });
    if(eur > 1000) return res.status(400).json({ error: 'Maximum deposit is €1,000' });

    const tokens = Math.floor(eur * EUR_TO_TOKENS);
    const amountCents = Math.round(eur * 100);

    if(!STRIPE_ENABLED || !stripe) {
      // Demo mode — simulate payment intent
      const demoClientSecret = 'demo_pi_' + Date.now() + '_secret_demo';
      return res.json({ clientSecret: demoClientSecret, tokens, amountEur: eur, demo: true });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      metadata: { uid, tokens: String(tokens) },
      description: `HATHOR Casino deposit — ${tokens} tokens`,
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret, tokens, amountEur: eur, demo: false });
  } catch(e) {
    console.error('Stripe PI error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Stripe webhook — called by Stripe when payment succeeds
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if(!STRIPE_ENABLED || !stripe) return res.json({ received: true });

  let event;
  try {
    if(STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET);
    } else if(process.env.NODE_ENV === 'production') {
      console.error('Stripe webhook rejected: STRIPE_WEBHOOK_SECRET not set in production');
      return res.status(403).send('Webhook secret required in production');
    } else {
      event = JSON.parse(req.body); // dev only
    }
  } catch(e) {
    console.error('Stripe webhook error:', e.message);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  if(event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const uid = pi.metadata?.uid;
    const tokens = parseInt(pi.metadata?.tokens || '0');
    if(uid && tokens > 0) {
      try {
        await dbRun(`UPDATE users SET tokens = tokens + $1 WHERE uid = $2`, [tokens, uid]);
        await checkAndRecordFTD(uid, tokens);
        await checkFirstDepositBonus(uid, tokens);
        io.to(uid).emit('depositConfirmed', { tokens, currency: 'EUR', method: 'card' });
        const txId = 'stripe_' + pi.id;
        await dbRun(`INSERT INTO transactions(id,uid,type,currency,amount_crypto,amount_tokens,status,payment_id,payment_address)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [txId, uid, 'deposit', 'EUR', pi.amount/100, tokens, 'finished', pi.id, 'card']);
        console.log(`Stripe deposit confirmed: uid=${uid} tokens=${tokens}`);
        try {
          const depUser = await dbGet(`SELECT a.email, u.tokens FROM auth a JOIN users u ON a.uid=u.uid WHERE a.uid=$1`, [uid]);
          if (depUser?.email) {
            const eurAmount = (pi.amount / 100).toFixed(2);
            await sendEmail(depUser.email, 'Deposit confirmed — HATHOR Casino', emailTemplate(
              'Deposit Confirmed ✅',
              `<p style="color:rgba(232,226,212,0.7);line-height:1.7">Your deposit of <strong style="color:#c9a84c">€${eurAmount}</strong> has been confirmed. Your new balance: <strong style="color:#c9a84c">${depUser.tokens} tokens</strong></p>`
            ));
          }
        } catch(emailErr) {}
      } catch(e) { console.error('Stripe webhook DB error:', e.message); }
    }
  }
  res.json({ received: true });
});

// Stripe demo confirm (test mode — simulate successful payment)
app.post('/api/stripe/demo-confirm', express.json(), async (req, res) => {
  try {
    const { uid, tokens, amountEur } = req.body;
    if(!uid || !tokens) return res.status(400).json({ error: 'Missing fields' });
    await dbRun(`UPDATE users SET tokens = tokens + $1 WHERE uid = $2`, [parseInt(tokens), uid]);
    await checkAndRecordFTD(uid, parseInt(tokens));
    await checkFirstDepositBonus(uid, parseInt(tokens));
    io.to(uid).emit('depositConfirmed', { tokens: parseInt(tokens), currency: 'EUR', method: 'card' });
    const txId = 'demo_card_' + Date.now();
    await dbRun(`INSERT INTO transactions(id,uid,type,currency,amount_crypto,amount_tokens,status,payment_id,payment_address)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [txId, uid, 'deposit', 'EUR', parseFloat(amountEur)||0, parseInt(tokens), 'finished', txId, 'card_demo']);
    try {
      const depUser = await dbGet(`SELECT a.email, u.tokens FROM auth a JOIN users u ON a.uid=u.uid WHERE a.uid=$1`, [uid]);
      if (depUser?.email) {
        const eurAmount = parseFloat(amountEur)||0;
        await sendEmail(depUser.email, 'Deposit confirmed — HATHOR Casino', emailTemplate(
          'Deposit Confirmed ✅',
          `<p style="color:rgba(232,226,212,0.7);line-height:1.7">Your deposit of <strong style="color:#c9a84c">€${eurAmount.toFixed(2)}</strong> has been confirmed. Your new balance: <strong style="color:#c9a84c">${depUser.tokens} tokens</strong></p>`
        ));
      }
    } catch(emailErr) {}
    res.json({ ok: true, tokens: parseInt(tokens) });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PostgreSQL Schema Init ────────────────────────────────
async function initDB() {
  try {
    await pool.query(`
  CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, name TEXT NOT NULL, tokens INTEGER DEFAULT 10000, avatar TEXT, level INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, total_won INTEGER DEFAULT 0, games_played INTEGER DEFAULT 0, last_bonus TEXT, banned INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS game_log (id SERIAL PRIMARY KEY, uid TEXT NOT NULL, game TEXT NOT NULL, bet INTEGER DEFAULT 0, result INTEGER DEFAULT 0, won INTEGER DEFAULT 0, ts TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS jackpot (id INTEGER PRIMARY KEY CHECK(id=1), amount INTEGER DEFAULT 50000);
  INSERT INTO jackpot(id,amount) VALUES(1,50000) ON CONFLICT DO NOTHING;
  CREATE TABLE IF NOT EXISTS kyc (uid TEXT PRIMARY KEY, status TEXT DEFAULT 'unverified', full_name TEXT, birth_date TEXT, country TEXT, id_type TEXT DEFAULT 'passport', id_front TEXT, id_back TEXT, selfie TEXT, rejection_reason TEXT, submitted_at TIMESTAMPTZ, reviewed_at TIMESTAMPTZ);
  CREATE TABLE IF NOT EXISTS pending_bets (id TEXT PRIMARY KEY, uid TEXT NOT NULL, type TEXT DEFAULT 'sports', match_desc TEXT, selection TEXT, odds REAL, bet INTEGER, potential_win INTEGER, status TEXT DEFAULT 'pending', reject_reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), reviewed_at TIMESTAMPTZ);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS provably_fair (round_id TEXT PRIMARY KEY, uid TEXT NOT NULL, game TEXT NOT NULL, server_seed TEXT NOT NULL, server_hash TEXT NOT NULL, client_seed TEXT, nonce INTEGER DEFAULT 0, result TEXT, revealed INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS gambling_limits (uid TEXT PRIMARY KEY, daily_limit INTEGER DEFAULT 0, weekly_limit INTEGER DEFAULT 0, self_excluded INTEGER DEFAULT 0, excluded_until TEXT, updated_at TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS bonuses (id TEXT PRIMARY KEY, uid TEXT NOT NULL, type TEXT NOT NULL, amount INTEGER DEFAULT 0, wagering_req INTEGER DEFAULT 0, wagered INTEGER DEFAULT 0, status TEXT DEFAULT 'active', expires_at TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS tournaments (id TEXT PRIMARY KEY, name TEXT NOT NULL, game TEXT DEFAULT 'slots', prize_pool INTEGER DEFAULT 10000, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, status TEXT DEFAULT 'upcoming');
  CREATE TABLE IF NOT EXISTS tournament_scores (id SERIAL PRIMARY KEY, tournament_id TEXT NOT NULL, uid TEXT NOT NULL, score INTEGER DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(tournament_id, uid));
  CREATE TABLE IF NOT EXISTS affiliates (uid TEXT PRIMARY KEY, ref_code TEXT UNIQUE NOT NULL, referred INTEGER DEFAULT 0, earnings INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS referrals (uid TEXT PRIMARY KEY, ref_by TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS admin_staff (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'support', display_name TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), last_login TIMESTAMPTZ, active INTEGER DEFAULT 1);
  CREATE TABLE IF NOT EXISTS admin_sessions (token TEXT PRIMARY KEY, staff_id INTEGER NOT NULL, role TEXT NOT NULL, username TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL);
  CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, uid TEXT NOT NULL, type TEXT NOT NULL, currency TEXT, amount_crypto REAL, amount_tokens INTEGER, status TEXT DEFAULT 'pending', payment_id TEXT, payment_address TEXT, tx_hash TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS auth (uid TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, uid TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS rg_limits (uid TEXT PRIMARY KEY, daily_deposit_limit INTEGER, daily_loss_limit INTEGER, daily_bet_limit INTEGER, session_limit_minutes INTEGER, self_exclusion_until TEXT, cool_off_until TEXT, updated_at TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS daily_tracking (uid TEXT, date TEXT, deposited INTEGER DEFAULT 0, lost INTEGER DEFAULT 0, bet_total INTEGER DEFAULT 0, PRIMARY KEY(uid, date));
  CREATE TABLE IF NOT EXISTS sports_bets (id TEXT PRIMARY KEY, uid TEXT NOT NULL, match_id TEXT, match_desc TEXT, selection TEXT, odds REAL, bet INTEGER, potential_win INTEGER, status TEXT DEFAULT 'pending', result INTEGER, created_at TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS promo_codes (code TEXT PRIMARY KEY, amount INTEGER, max_uses INTEGER DEFAULT 1, used_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS promo_uses (code TEXT, uid TEXT, used_at TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY(code, uid));
  CREATE TABLE IF NOT EXISTS affiliate_deals (uid TEXT PRIMARY KEY, deal_type TEXT DEFAULT 'hybrid', cpa_amount INTEGER DEFAULT 50, rs_percent REAL DEFAULT 25, cpa_min_deposit INTEGER DEFAULT 0, status TEXT DEFAULT 'active', notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS affiliate_campaigns (id TEXT PRIMARY KEY, aff_uid TEXT NOT NULL, name TEXT NOT NULL, code TEXT UNIQUE NOT NULL, clicks INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS affiliate_commissions (id TEXT PRIMARY KEY, aff_uid TEXT NOT NULL, player_uid TEXT, type TEXT NOT NULL, amount INTEGER NOT NULL, period TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS bonus_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS player_bonuses (id SERIAL PRIMARY KEY, uid TEXT NOT NULL, bonus_type TEXT NOT NULL, bonus_tokens INTEGER NOT NULL, wagering_required INTEGER NOT NULL, wagering_done INTEGER DEFAULT 0, status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW(), expires_at TIMESTAMPTZ);
  CREATE TABLE IF NOT EXISTS player_referrals (id SERIAL PRIMARY KEY, referrer_uid TEXT NOT NULL, referred_uid TEXT NOT NULL, bonus_given BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(referred_uid));
  CREATE TABLE IF NOT EXISTS push_subscriptions (id SERIAL PRIMARY KEY, uid TEXT NOT NULL, subscription JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS token_transfers (id TEXT PRIMARY KEY, from_uid TEXT NOT NULL, to_uid TEXT NOT NULL, amount INTEGER NOT NULL, note TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS password_reset_tokens (token TEXT PRIMARY KEY, uid TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS email_verify_tokens (token TEXT PRIMARY KEY, uid TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
`);
    await pool.query(`ALTER TABLE auth ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`).catch(()=>{});
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS push_subs_uid_endpoint ON push_subscriptions (uid, (subscription->>'endpoint'))`).catch(()=>{});
    // New-style tournament tables (separate from old ones)
    try { await pool.query(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        game_type TEXT DEFAULT 'all',
        start_at TIMESTAMPTZ NOT NULL,
        end_at TIMESTAMPTZ NOT NULL,
        prize_pool INTEGER NOT NULL DEFAULT 10000,
        status TEXT DEFAULT 'scheduled',
        min_bet INTEGER DEFAULT 100,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS tournament_entries (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL,
        uid TEXT NOT NULL,
        score INTEGER DEFAULT 0,
        rank INTEGER,
        prize_tokens INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tournament_id, uid)
      );
    `); } catch(e) { console.error('Tournament table migration error:', e.message); }
    // Ensure tournament columns exist (for old deployments)
    try { await pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ`); } catch(e){}
    try { await pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ`); } catch(e){}
    try { await pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled'`); } catch(e){}
    try { await pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS min_bet INTEGER DEFAULT 100`); } catch(e){}
    try { await pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS prize_pool INTEGER DEFAULT 10000`); } catch(e){}
    try { await pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS game_type TEXT DEFAULT 'all'`); } catch(e){}
    // 2FA columns
    try { await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT`); } catch(e){}
    try { await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE`); } catch(e){}
    // Auth email column (already exists but ensure it)
    try { await pool.query(`ALTER TABLE auth ADD COLUMN IF NOT EXISTS totp_secret TEXT`); } catch(e){}
    try { await pool.query(`ALTER TABLE auth ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE`); } catch(e){}
    // Insert default bonus settings
    await dbRun(`INSERT INTO bonus_settings(key,value) VALUES
      ('first_dep_enabled','true'),
      ('first_dep_pct','100'),
      ('first_dep_max','5000'),
      ('first_dep_wagering','30'),
      ('daily_enabled','true'),
      ('daily_base','500'),
      ('daily_max','3000'),
      ('daily_streak_mult','1.1'),
      ('cashback_enabled','false'),
      ('cashback_pct','5'),
      ('cashback_min_loss','1000')
    ON CONFLICT DO NOTHING`);
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS banned INTEGER DEFAULT 0'); } catch(e){}
    try { await pool.query('ALTER TABLE referrals ADD COLUMN IF NOT EXISTS campaign_id TEXT'); } catch(e){}
    try { await pool.query('ALTER TABLE referrals ADD COLUMN IF NOT EXISTS ftd_date TIMESTAMPTZ'); } catch(e){}
    try { await pool.query('ALTER TABLE referrals ADD COLUMN IF NOT EXISTS ftd_amount INTEGER DEFAULT 0'); } catch(e){}
    try { await pool.query('ALTER TABLE referrals ADD COLUMN IF NOT EXISTS cpa_paid INTEGER DEFAULT 0'); } catch(e){}
    try { await pool.query('ALTER TABLE referrals ADD COLUMN IF NOT EXISTS country TEXT'); } catch(e){}
    try {
      const saved = await getSetting('rtp_config');
      if(saved) rtpConfig = {...RTP_DEFAULTS, ...JSON.parse(saved)};
    } catch(e) {}
    console.log('✅ PostgreSQL schema ready');

    // ── SQLite → PostgreSQL one-time migration ─────────────────────────
    // Check multiple possible volume paths
    const possiblePaths = [
      process.env.RAILWAY_VOLUME_MOUNT_PATH ? process.env.RAILWAY_VOLUME_MOUNT_PATH + '/casino.db' : null,
      '/data/casino.db',
      '/app/data/casino.db',
      '/var/data/casino.db',
      '/mnt/casino.db',
      '/volume/casino.db',
    ].filter(Boolean);
    console.log('🔍 Checking for SQLite DB at:', possiblePaths);
    const sqlitePath = possiblePaths.find(p => fs.existsSync(p)) || null;
    console.log(sqlitePath ? `📦 Found SQLite DB at: ${sqlitePath}` : '⚠️  No SQLite DB found, skipping migration');
    if (sqlitePath) {
      try {
        const Database = require('better-sqlite3');
        const old = new Database(sqlitePath, { readonly: true });
        let migrated = 0;

        // users
        const users = old.prepare('SELECT * FROM users').all();
        for (const u of users) {
          try {
            await pool.query(
              `INSERT INTO users(uid,name,tokens,avatar,level,xp,total_won,games_played,last_bonus,banned)
               VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(uid) DO NOTHING`,
              [u.uid,u.name,u.tokens||10000,u.avatar,u.level||1,u.xp||0,u.total_won||0,u.games_played||0,u.last_bonus||null,u.banned||0]
            );
            migrated++;
          } catch(e){}
        }
        console.log(`✅ Migrated ${migrated} users from SQLite`);

        // auth
        const auths = old.prepare('SELECT * FROM auth').all();
        for (const a of auths) {
          try {
            await pool.query(
              `INSERT INTO auth(uid,email,password_hash,salt) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
              [a.uid, a.email, a.password_hash, a.salt]
            );
          } catch(e){}
        }
        console.log(`✅ Migrated ${auths.length} auth records`);

        // kyc
        try {
          const kycs = old.prepare('SELECT * FROM kyc').all();
          for (const k of kycs) {
            try {
              await pool.query(
                `INSERT INTO kyc(uid,status,full_name,birth_date,country,id_type,id_front,id_back,selfie,rejection_reason)
                 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
                [k.uid,k.status||'unverified',k.full_name||null,k.birth_date||null,k.country||null,k.id_type||'passport',k.id_front||null,k.id_back||null,k.selfie||null,k.rejection_reason||null]
              );
            } catch(e){}
          }
          console.log(`✅ Migrated ${kycs.length} KYC records`);
        } catch(e){}

        // transactions
        try {
          const txs = old.prepare('SELECT * FROM transactions').all();
          for (const t of txs) {
            try {
              await pool.query(
                `INSERT INTO transactions(id,uid,type,currency,amount_crypto,amount_tokens,status,payment_id)
                 VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
                [t.id,t.uid,t.type,t.currency||null,t.amount_crypto||0,t.amount_tokens||0,t.status||'pending',t.payment_id||null]
              );
            } catch(e){}
          }
          console.log(`✅ Migrated ${txs.length} transactions`);
        } catch(e){}

        // gambling_limits
        try {
          const limits = old.prepare('SELECT * FROM gambling_limits').all();
          for (const l of limits) {
            try {
              await pool.query(
                `INSERT INTO gambling_limits(uid,daily_limit,weekly_limit,self_excluded)
                 VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
                [l.uid,l.daily_limit||0,l.weekly_limit||0,l.self_excluded||0]
              );
            } catch(e){}
          }
        } catch(e){}

        // promo_codes
        try {
          const promos = old.prepare('SELECT * FROM promo_codes').all();
          for (const p of promos) {
            try {
              await pool.query(
                `INSERT INTO promo_codes(code,amount,max_uses,used_count) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
                [p.code,p.amount,p.max_uses||1,p.used_count||0]
              );
            } catch(e){}
          }
        } catch(e){}

        // settings
        try {
          const settings = old.prepare('SELECT * FROM settings').all();
          for (const s of settings) {
            try {
              await pool.query(
                `INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT DO NOTHING`,
                [s.key, s.value]
              );
            } catch(e){}
          }
        } catch(e){}

        old.close();
        // Rename to avoid re-migration on restart
        fs.renameSync(sqlitePath, sqlitePath + '.migrated');
        console.log('✅ SQLite → PostgreSQL migration complete! Old DB renamed to casino.db.migrated');
      } catch(e) {
        console.error('⚠️  SQLite migration error:', e.message);
      }
    }
    // ── End migration ──────────────────────────────────────────────────
    _dbOk = true;
    console.log('✅ Database ready');
  } catch(e) {
    console.warn('⚠️  DB init warning (no database — running in static/demo mode):', e.message);
  }
}

// ── Personalized Lobby ────────────────────────────────────
app.get('/api/lobby/personalized', async (req,res) => {
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const uid = await checkSession(token);
  if(!uid) return res.status(401).json({error:'Unauthorized'});
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24*60*60*1000).toISOString();

    // User's favorite games (last 30 days)
    const favorites = await dbAll(
      `SELECT game as game_type, COUNT(*) as plays, COALESCE(SUM(bet),0) as total_bet
       FROM game_log WHERE uid=$1 AND ts > $2 GROUP BY game ORDER BY plays DESC LIMIT 5`,
      [uid, thirtyDaysAgo]
    );

    // Hot games globally in last 24h
    const hotGames = await dbAll(
      `SELECT game as game_type, COUNT(*) as plays FROM game_log WHERE ts > $1 GROUP BY game ORDER BY plays DESC LIMIT 5`,
      [oneDayAgo]
    );

    // Check if new player
    const sessionCount = await dbGet(
      `SELECT COUNT(*) as c FROM game_log WHERE uid=$1`,
      [uid]
    );
    const isNewPlayer = parseInt(sessionCount?.c || 0) < 5;

    res.json({
      favorites: favorites.map(f => f.game_type),
      hotGames: hotGames.map(h => h.game_type),
      isNewPlayer
    });
  } catch(e) { res.status(500).json({error:e.message}); }
});

// ── Daily Push Scheduler (9 AM UTC) ──────────────────────
function scheduleNextDailyPush() {
  const now = new Date();
  const next9am = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0, 0));
  if(next9am <= now) next9am.setUTCDate(next9am.getUTCDate() + 1);
  const ms = next9am - now;
  setTimeout(async () => {
    try {
      const users = await dbAll(`SELECT uid FROM users`, []);
      for (const {uid} of users) {
        await sendPushToUser(uid, '🎁 Daily Bonus Available!', 'Your daily bonus is ready — claim it now!', '/');
      }
    } catch(e) { console.error('Daily push error:', e.message); }
    scheduleNextDailyPush(); // reschedule for next day
  }, ms);
}

initDB().then(() => {
  server.listen(PORT,()=>console.log(`🎰 HATHOR Royal Casino v2 (PostgreSQL) → http://localhost:${PORT}`));
  // Run VIP cashback on startup and every 24h
  processWeeklyCashback().catch(console.error);
  setInterval(() => processWeeklyCashback().catch(console.error), 24 * 60 * 60 * 1000);
  // Schedule daily bonus push at 9 AM UTC
  scheduleNextDailyPush();
});
