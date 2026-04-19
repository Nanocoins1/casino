const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'RNG_Technical_Documentation_HATHOR_Casino.pdf');

const doc = new PDFDocument({
  margin: 0,
  size: 'A4',
  bufferPages: true,
  info: {
    Title: 'HATHOR Royal Casino — RNG Technical Documentation',
    Author: 'HATHOR Royal Ltd.',
    Subject: 'RNG Certification Documentation v1.0',
    Keywords: 'RNG, Provably Fair, HMAC-SHA256, Casino, iTech Labs, eCOGRA'
  }
});

const stream = fs.createWriteStream(OUT);
doc.pipe(stream);

// ── Constants ─────────────────────────────────────────────
const GOLD   = '#c9a84c';
const DARK   = '#1a1a2e';
const GRAY   = '#555555';
const LGRAY  = '#aaaaaa';
const BLACK  = '#111111';
const GREEN  = '#1b5e20';
const WHITE  = '#ffffff';
const BGCODE = '#f0f0f0';

const ML = 55;       // margin left
const MR = 55;       // margin right
const MT = 50;       // margin top (content pages)
const PW = 595.28;   // A4 width pts
const PH = 841.89;   // A4 height pts
const CW = PW - ML - MR;  // content width

// ── Cursor tracker ────────────────────────────────────────
let cy = MT; // current Y

function nl(lines = 1) { cy += lines * 14; }

function checkPage(needed = 40) {
  if (cy + needed > PH - 60) {
    addFooter();
    doc.addPage({ margin: 0, size: 'A4' });
    cy = MT;
  }
}

// ── Drawing helpers ───────────────────────────────────────

function h1(txt) {
  checkPage(40);
  cy += 8;
  doc.rect(ML - 5, cy, CW + 10, 24).fill(DARK);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(12)
     .text(txt, ML + 4, cy + 6, { width: CW - 8, lineBreak: false });
  cy += 32;
  doc.fillColor(BLACK);
}

function h2(txt) {
  checkPage(30);
  cy += 6;
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10.5)
     .text(txt, ML, cy, { width: CW, lineBreak: false });
  cy += 14;
  doc.moveTo(ML, cy).lineTo(ML + CW, cy).strokeColor(GOLD).lineWidth(0.8).stroke();
  cy += 6;
  doc.fillColor(BLACK);
}

function h3(txt) {
  checkPage(20);
  cy += 4;
  doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(9.5)
     .text(txt, ML, cy, { width: CW, lineBreak: false });
  cy += 13;
  doc.fillColor(BLACK);
}

function para(txt, opts = {}) {
  const fsize = opts.size || 9;
  const font  = opts.bold ? 'Helvetica-Bold' : 'Helvetica';
  const color = opts.color || BLACK;
  doc.fillColor(color).font(font).fontSize(fsize);
  const h = doc.heightOfString(txt, { width: CW, lineGap: 1.5 });
  checkPage(h + 8);
  doc.text(txt, ML, cy, { width: CW, lineGap: 1.5, align: opts.align || 'left' });
  cy += h + 6;
}

function bullet(txt, indent = 0) {
  const x = ML + 10 + indent * 14;
  const w = CW - 10 - indent * 14;
  doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(9).text('•', x - 10, cy, { width: 10, lineBreak: false });
  doc.fillColor(BLACK).font('Helvetica').fontSize(9);
  const h = doc.heightOfString(txt, { width: w, lineGap: 1.5 });
  checkPage(h + 6);
  doc.text(txt, x, cy, { width: w, lineGap: 1.5 });
  cy += h + 4;
}

function codeBlock(lines) {
  const txt = Array.isArray(lines) ? lines.join('\n') : lines;
  doc.font('Courier').fontSize(7.5);
  const h = doc.heightOfString(txt, { width: CW - 16, lineGap: 2 });
  checkPage(h + 16);
  cy += 4;
  doc.rect(ML, cy, CW, h + 14).fill(BGCODE).stroke();
  doc.fillColor('#333333').text(txt, ML + 8, cy + 7, { width: CW - 16, lineGap: 2 });
  cy += h + 20;
  doc.fillColor(BLACK);
}

function table(headers, rows, colWidths) {
  const rowH = 16;
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  checkPage(rowH * (rows.length + 1) + 10);
  cy += 4;

  // header row
  let x = ML;
  doc.rect(ML, cy, totalW, rowH).fill(DARK);
  headers.forEach((h, i) => {
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8)
       .text(h, x + 4, cy + 4, { width: colWidths[i] - 8, lineBreak: false });
    x += colWidths[i];
  });
  cy += rowH;

  // data rows
  rows.forEach((row, ri) => {
    checkPage(rowH + 4);
    x = ML;
    const bg = ri % 2 === 0 ? '#f9f9f9' : WHITE;
    doc.rect(ML, cy, totalW, rowH).fill(bg);
    doc.rect(ML, cy, totalW, rowH).stroke('#dddddd');
    row.forEach((cell, i) => {
      doc.fillColor(BLACK).font('Helvetica').fontSize(8)
         .text(String(cell), x + 4, cy + 4, { width: colWidths[i] - 8, lineBreak: false });
      x += colWidths[i];
    });
    cy += rowH;
  });
  cy += 8;
  doc.fillColor(BLACK);
}

function divider() {
  cy += 4;
  doc.moveTo(ML, cy).lineTo(ML + CW, cy).strokeColor('#dddddd').lineWidth(0.5).stroke();
  cy += 8;
}

// ── Footer (added before page switch) ────────────────────
function addFooter() {
  const y = PH - 26;
  doc.rect(0, y - 2, PW, 28).fill('#f5f5f5');
  doc.moveTo(ML, y - 2).lineTo(ML + CW, y - 2).strokeColor(GOLD).lineWidth(0.8).stroke();
  doc.fillColor(LGRAY).font('Helvetica').fontSize(7)
     .text('HATHOR Royal Casino  ·  RNG Technical Documentation v1.0  ·  CONFIDENTIAL', ML, y + 4, { width: CW - 60, lineBreak: false });
  const pgNum = doc.bufferedPageRange().count;
  doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(7)
     .text('Page ' + pgNum, ML, y + 4, { width: CW, align: 'right', lineBreak: false });
}

// ═══════════════════════════════════════════════════════════
// COVER PAGE
// ═══════════════════════════════════════════════════════════
doc.rect(0, 0, PW, PH).fill(DARK);

// gold top bar
doc.rect(0, 0, PW, 6).fill(GOLD);

// Logo area
doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(36)
   .text('♦ HATHOR', 0, 160, { width: PW, align: 'center' });
doc.fillColor(WHITE).font('Helvetica').fontSize(16)
   .text('ROYAL CASINO', 0, 204, { width: PW, align: 'center' });

// divider line
doc.moveTo(180, 240).lineTo(PW - 180, 240).strokeColor(GOLD).lineWidth(1.5).stroke();

// document title
doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(20)
   .text('RNG Technical Documentation', 0, 262, { width: PW, align: 'center' });
doc.fillColor(GOLD).font('Helvetica').fontSize(12)
   .text('Random Number Generator — System Specification & Audit Package', 0, 292, { width: PW, align: 'center' });

// version box
doc.rect(180, 330, PW - 360, 52).strokeColor(GOLD).lineWidth(1).stroke();
doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(10)
   .text('VERSION 1.0  ·  APRIL 2026  ·  CONFIDENTIAL', 0, 346, { width: PW, align: 'center' });

// info block
const infoY = 420;
const infoData = [
  ['Operator',    'HATHOR Royal Ltd.'],
  ['Platform',    'HATHOR Royal Casino  —  hathor.casino'],
  ['Document',    'RNG Technical Documentation'],
  ['Prepared for','iTech Labs / eCOGRA Certification Audit'],
  ['RNG Type',    'HMAC-SHA256 Provably Fair CSPRNG'],
  ['Date',        'April 2026'],
];
infoData.forEach((row, i) => {
  const iy = infoY + i * 22;
  doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(9)
     .text(row[0].toUpperCase() + ':', 160, iy, { width: 110, lineBreak: false });
  doc.fillColor(WHITE).font('Helvetica').fontSize(9)
     .text(row[1], 278, iy, { width: 200, lineBreak: false });
});

// bottom bar
doc.rect(0, PH - 6, PW, 6).fill(GOLD);
doc.fillColor(LGRAY).font('Helvetica').fontSize(7.5)
   .text('This document contains confidential and proprietary information. Unauthorized distribution is prohibited.',
         0, PH - 26, { width: PW, align: 'center' });

// ═══════════════════════════════════════════════════════════
// PAGE 2 — TABLE OF CONTENTS
// ═══════════════════════════════════════════════════════════
doc.addPage({ margin: 0, size: 'A4' });
cy = MT;

// page header
doc.rect(0, 0, PW, 36).fill(DARK);
doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(10)
   .text('HATHOR ROYAL CASINO  —  RNG TECHNICAL DOCUMENTATION', 0, 13, { width: PW, align: 'center' });
cy = 52;

h1('TABLE OF CONTENTS');
cy += 4;

const toc = [
  ['1.', 'Executive Summary', '3'],
  ['2.', 'System Overview', '3'],
  ['3.', 'Entropy & Seed Generation', '4'],
  ['4.', 'Core RNG Algorithm — HMAC-SHA256', '4'],
  ['5.', 'Game-Specific Implementations', '5'],
  ['6.', 'Return-to-Player (RTP) Configuration', '7'],
  ['7.', 'Provably Fair Verification', '8'],
  ['8.', 'Security Architecture', '8'],
  ['9.', 'Audit Log & Round History', '9'],
  ['10.', 'Statistical Testing', '9'],
  ['11.', 'Compliance Statement', '10'],
  ['12.', 'Operator Declaration', '10'],
];

toc.forEach(([num, title, pg]) => {
  const dots = '.'.repeat(Math.max(2, Math.floor((CW - 60) / 5.5) - title.length - 4));
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9.5)
     .text(num, ML, cy, { width: 20, lineBreak: false });
  doc.fillColor(BLACK).font('Helvetica').fontSize(9.5)
     .text(title, ML + 22, cy, { width: CW - 60, lineBreak: false });
  doc.fillColor(LGRAY).font('Helvetica').fontSize(9)
     .text(dots, ML + 22 + doc.widthOfString(title, { fontSize: 9.5 }) + 4, cy + 0.5, { lineBreak: false });
  doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(9.5)
     .text(pg, ML, cy, { width: CW, align: 'right', lineBreak: false });
  cy += 18;
});

cy += 10;
divider();
para('This document provides complete technical specifications of the Random Number Generator (RNG) system used by HATHOR Royal Casino. It is prepared in accordance with iTech Labs RNG Evaluation Criteria v4.0 and eCOGRA RNG Testing Standard, to support the certification audit process.', { color: GRAY });

addFooter();

// ═══════════════════════════════════════════════════════════
// CONTENT PAGES
// ═══════════════════════════════════════════════════════════
doc.addPage({ margin: 0, size: 'A4' });
cy = MT;

// ── Section 1 ─────────────────────────────────────────────
h1('1. EXECUTIVE SUMMARY');

para('HATHOR Royal Casino operates a cryptographically secure Random Number Generator (RNG) based on the HMAC-SHA256 algorithm. The system generates provably fair, independently verifiable game outcomes using a combination of server-side entropy and client-supplied seeds.');
nl(0.3);
para('Key properties of the system:');
bullet('Cryptographic quality: crypto.randomBytes(32) — 256 bits of OS-level entropy per round');
bullet('Algorithm: HMAC-SHA256 (RFC 2104) — collision-resistant, one-way hash function');
bullet('Provably Fair: players can verify every outcome independently after each round');
bullet('No predictability: server seed is hashed before exposure; raw seed revealed only after round ends');
bullet('Auditability: full round history stored in SQLite with SHA-256 hash chain');
bullet('No house bias: modulo bias < 0.000002% for all game parameters (max ≤ 10,000)');

// ── Section 2 ─────────────────────────────────────────────
checkPage(80);
h1('2. SYSTEM OVERVIEW');

h2('2.1 Technology Stack');
table(
  ['Component', 'Technology', 'Version'],
  [
    ['Runtime', 'Node.js', '22.x LTS'],
    ['RNG Algorithm', 'HMAC-SHA256 (crypto module)', 'Built-in'],
    ['Database', 'SQLite (better-sqlite3)', '9.x'],
    ['Web Framework', 'Express.js', '4.x'],
    ['Real-time', 'Socket.IO', '4.x'],
    ['Hosting', 'Railway.app (isolated container)', 'N/A'],
  ],
  [120, 200, 120]
);

h2('2.2 Data Flow');
bullet('Player initiates a game round (bet placed via Socket.IO)');
bullet('Server generates a fresh server seed using crypto.randomBytes(32)');
bullet('Server stores SHA-256 hash of the server seed in the database (seed not revealed yet)');
bullet('RNG computes outcome using HMAC-SHA256(serverSeed, clientSeed + ":" + nonce)');
bullet('Game result is calculated from the HMAC output, validated against RTP bounds');
bullet('Result sent to player; server seed revealed in round history for verification');

// ── Section 3 ─────────────────────────────────────────────
checkPage(100);
h1('3. ENTROPY & SEED GENERATION');

h2('3.1 Server Seed Generation');
para('Each game round uses a freshly generated server seed derived from the operating system\'s cryptographically secure pseudorandom number generator (CSPRNG):');
codeBlock([
  'function generateServerSeed() {',
  '  return require("crypto").randomBytes(32).toString("hex");',
  '  // Returns 64-character hex string — 256 bits of entropy',
  '  // Source: OS CSPRNG (/dev/urandom on Linux, CryptGenRandom on Windows)',
  '}',
]);
para('The server seed is generated fresh per round. It is never reused. Before the round begins, only the SHA-256 hash of the server seed is shared with the player, preventing the server from manipulating results after the bet is placed.');

h2('3.2 Client Seed');
para('The client seed is a string provided by or derived from the player:');
bullet('Default: player\'s UID (unique identifier assigned at registration)');
bullet('Custom: player may set a personal client seed string via the Provably Fair interface');
bullet('The client seed prevents the server from knowing the final outcome in advance (neither party alone controls the result)');

h2('3.3 Nonce');
para('The nonce is a per-round incrementing integer stored in the database. It ensures that identical server/client seed pairs always produce unique outcomes:');
codeBlock('nonce = (SELECT nonce FROM rounds WHERE uid = ? ORDER BY id DESC LIMIT 1) + 1');

// ── Section 4 ─────────────────────────────────────────────
checkPage(120);
h1('4. CORE RNG ALGORITHM — HMAC-SHA256');

h2('4.1 Primary Generation Function');
codeBlock([
  'function generateResult(serverSeed, clientSeed, nonce, max) {',
  '  const hmac = crypto.createHmac("sha256", serverSeed);',
  '  hmac.update(clientSeed + ":" + nonce);',
  '  const hash = hmac.digest("hex");',
  '',
  '  // Extract first 8 hex chars → 32-bit unsigned integer',
  '  const value = parseInt(hash.substring(0, 8), 16);',
  '',
  '  // Map to range [0, max)',
  '  return value % max;',
  '}',
]);

h2('4.2 Algorithm Properties');
table(
  ['Property', 'Value'],
  [
    ['Algorithm', 'HMAC-SHA256 (RFC 2104)'],
    ['Output size', '256 bits (64 hex characters)'],
    ['Key (server seed)', '256 bits — crypto.randomBytes(32)'],
    ['Message', 'clientSeed + ":" + nonce (UTF-8)'],
    ['Extracted bits', '32 bits (first 8 hex chars)'],
    ['Integer range', '0 – 4,294,967,295'],
    ['Max game range', '≤ 10,000'],
    ['Modulo bias', '< 0.000002%'],
  ],
  [220, 260]
);

h2('4.3 Modulo Bias Analysis');
para('When mapping a 32-bit value (range 0–4,294,967,295) to a game range [0, max), the modulo operation introduces a slight bias for non-power-of-two ranges. For HATHOR Casino\'s largest game range (max = 10,000):');
codeBlock([
  'Bias = (2^32 mod max) / 2^32',
  '     = (4,294,967,296 mod 10,000) / 4,294,967,296',
  '     = 7,296 / 4,294,967,296',
  '     = 0.0000017% — well within acceptable limits (< 0.01%)',
]);

// ── Section 5 ─────────────────────────────────────────────
checkPage(60);
h1('5. GAME-SPECIFIC IMPLEMENTATIONS');

h2('5.1 Crash');
codeBlock([
  'function crashPoint(serverSeed, clientSeed, nonce) {',
  '  const r = generateResult(serverSeed, clientSeed, nonce, 10000);',
  '  if (r < 500) return 1.00;  // 5% instant crash',
  '  return Math.floor(10000 / (10000 - r)) / 100;',
  '}',
  '// Range: 1.00x – 100.00x | House edge: 4%',
]);
bullet('House edge implemented as 5% pre-crash probability (r < 500)');
bullet('Maximum theoretical multiplier: 100x (capped server-side)');
bullet('Outcome is deterministic: same seeds + nonce always return same crash point');

h2('5.2 Dice');
codeBlock([
  'function diceRoll(serverSeed, clientSeed, nonce) {',
  '  return generateResult(serverSeed, clientSeed, nonce, 10000) / 100;',
  '}',
  '// Returns float 0.00 – 99.99 | Player bets over/under a target',
]);

h2('5.3 Mines');
codeBlock([
  'function minesGrid(serverSeed, clientSeed, nonce, mineCount) {',
  '  const positions = Array.from({ length: 25 }, (_, i) => i);',
  '  // Fisher-Yates shuffle using successive HMAC calls',
  '  for (let i = 24; i > 0; i--) {',
  '    const r = generateResult(serverSeed, clientSeed, nonce * 100 + (24 - i), i + 1);',
  '    [positions[i], positions[r]] = [positions[r], positions[i]];',
  '  }',
  '  return positions.slice(0, mineCount); // mine positions',
  '}',
]);
bullet('25-cell grid, 1–24 mines configurable');
bullet('Each shuffle step uses a unique nonce offset (nonce*100 + step)');
bullet('Fisher-Yates guarantees uniform distribution across all 25! permutations');

checkPage(80);
h2('5.4 Blackjack');
codeBlock([
  'function shuffleDeck(serverSeed, clientSeed, nonce) {',
  '  const deck = [];',
  '  const suits = ["S","H","D","C"];',
  '  const ranks = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"];',
  '  suits.forEach(s => ranks.forEach(r => deck.push(r + s)));',
  '  // Fisher-Yates using per-step nonce',
  '  for (let i = 51; i > 0; i--) {',
  '    const r = generateResult(serverSeed, clientSeed, nonce * 100 + (51 - i), i + 1);',
  '    [deck[i], deck[r]] = [deck[r], deck[i]];',
  '  }',
  '  return deck;',
  '}',
]);
bullet('Standard 52-card deck, shuffled fresh for every hand');
bullet('51 independent swap operations, each seeded uniquely');

h2('5.5 Limbo');
codeBlock([
  'function limboResult(serverSeed, clientSeed, nonce) {',
  '  const r = generateResult(serverSeed, clientSeed, nonce, 10000);',
  '  return Math.max(1.00, Math.floor(10000 / (r + 1)) / 100);',
  '}',
]);

h2('5.6 HiLo');
codeBlock([
  'function hiloCard(serverSeed, clientSeed, nonce) {',
  '  return generateResult(serverSeed, clientSeed, nonce, 52);',
  '  // 0-12: rank within suit; /13 = suit (0=S,1=H,2=D,3=C)',
  '}',
]);

h2('5.7 Wheel');
codeBlock([
  'function wheelSpin(serverSeed, clientSeed, nonce, segments) {',
  '  return generateResult(serverSeed, clientSeed, nonce, segments);',
  '}',
  '// segments = total wheel positions (e.g. 54)',
]);

h2('5.8 Slots (5-reel, 3-row)');
codeBlock([
  'function slotsResult(serverSeed, clientSeed, nonce) {',
  '  const grid = [];',
  '  for (let i = 0; i < 15; i++) {',
  '    // Each cell gets its own unique nonce offset',
  '    grid.push(generateResult(serverSeed, clientSeed, nonce * 100 + i, SYMBOL_COUNT));',
  '  }',
  '  return grid; // 15 values [0, SYMBOL_COUNT)',
  '}',
]);
bullet('5 columns × 3 rows = 15 independent RNG calls per spin');
bullet('Each call uses offset nonce*100+cellIndex — never reuses a nonce');

checkPage(80);
h2('5.9 Keno');
codeBlock([
  'function kenoNumbers(serverSeed, clientSeed, nonce, count) {',
  '  const pool = Array.from({ length: 80 }, (_, i) => i + 1);',
  '  const drawn = [];',
  '  for (let i = 0; i < count; i++) {',
  '    const r = generateResult(serverSeed, clientSeed, nonce * 100 + i, pool.length);',
  '    drawn.push(...pool.splice(r, 1)); // remove drawn number',
  '  }',
  '  return drawn; // array of unique numbers 1-80',
  '}',
]);
bullet('Pool shrinks after each draw — guarantees no duplicate numbers');
bullet('Each pick uses unique nonce offset');

h2('5.10 Dice-based Instant Games (Fruits, Jungle, Ocean, etc.)');
para('Simple multiplier games use the same pattern as Dice/Limbo with game-specific multiplier tables applied to the raw RNG output. The mapping from RNG output to multiplier is deterministic and published in the game interface.');

// ── Section 6 ─────────────────────────────────────────────
checkPage(60);
h1('6. RETURN-TO-PLAYER (RTP) CONFIGURATION');

h2('6.1 RTP Values');
para('The following theoretical RTP values are configured in the server as RTP_DEFAULTS:');
table(
  ['Game', 'RTP %', 'House Edge %', 'Type'],
  [
    ['Crash',           '96.00', '4.00', 'Multiplier'],
    ['Dice',            '98.00', '2.00', 'Over/Under'],
    ['Mines',           '97.00', '3.00', 'Grid'],
    ['Limbo',           '97.00', '3.00', 'Multiplier'],
    ['HiLo',            '97.00', '3.00', 'Card'],
    ['Wheel',           '96.00', '4.00', 'Wheel'],
    ['Slots',           '96.00', '4.00', 'Reel'],
    ['Blackjack',       '99.50', '0.50', 'Table'],
    ['Baccarat',        '98.94', '1.06', 'Table'],
    ['Keno',            '92.00', '8.00', 'Number'],
    ['Video Poker',     '99.50', '0.50', 'Card'],
    ['European Roulette','97.30','2.70', 'Table'],
  ],
  [120, 60, 80, 80]
);

para('RTP values represent long-run theoretical returns over millions of rounds. They are implemented through the payout structure (multiplier tables) rather than by manipulating the RNG output. The RNG itself produces uniformly distributed values; house edge is introduced through payout ratios only.', { color: GRAY });

// ── Section 7 ─────────────────────────────────────────────
checkPage(100);
h1('7. PROVABLY FAIR VERIFICATION');

h2('7.1 Verification Process');
para('Any player can independently verify any past round using the following process:');
bullet('1. Obtain: server seed (revealed post-round), client seed, nonce — from round history');
bullet('2. Compute: HMAC-SHA256(serverSeed, clientSeed + ":" + nonce) using any standard tool');
bullet('3. Extract: first 8 hex characters → convert to decimal → apply modulo');
bullet('4. Compare: result must match the recorded game outcome exactly');

h2('7.2 Verification Tool (in-platform)');
codeBlock([
  '// Public verification endpoint: GET /api/provably-fair/verify',
  'app.get("/api/provably-fair/verify", (req, res) => {',
  '  const { serverSeed, clientSeed, nonce, game } = req.query;',
  '  const result = generateResult(serverSeed, clientSeed, parseInt(nonce), GAME_MAX[game]);',
  '  res.json({ result, hash: crypto.createHmac("sha256", serverSeed)',
  '                                  .update(clientSeed + ":" + nonce)',
  '                                  .digest("hex") });',
  '});',
]);

h2('7.3 Commitment Scheme');
bullet('Pre-round: server publishes SHA-256(serverSeed) — player cannot predict result');
bullet('Post-round: server reveals raw serverSeed — player verifies SHA-256 matches commitment');
bullet('This prevents server-side result manipulation after bets are placed');

// ── Section 8 ─────────────────────────────────────────────
checkPage(80);
h1('8. SECURITY ARCHITECTURE');

h2('8.1 Seed Storage & Lifecycle');
table(
  ['Stage', 'Data stored', 'Visibility'],
  [
    ['Pre-round',  'SHA-256(serverSeed)',      'Public (sent to player)'],
    ['In-round',   'serverSeed (encrypted)',   'Server only'],
    ['Post-round', 'serverSeed (revealed)',    'Public (in round history)'],
    ['Next round', 'New serverSeed generated', 'Server only'],
  ],
  [110, 200, 175]
);

h2('8.2 Infrastructure Security');
bullet('Hosted on Railway.app — isolated Docker container per deployment');
bullet('HTTPS/TLS enforced for all client-server communication');
bullet('No server seed is transmitted before round completion');
bullet('Database (SQLite) stored on Railway persistent volume — not accessible externally');
bullet('Environment variables used for all secrets (JWT_SECRET, STRIPE keys)');
bullet('All Socket.IO game events authenticated via JWT middleware');

h2('8.3 Anti-Tampering');
bullet('RNG function is server-side only — no client-side outcome determination');
bullet('All bet validation and payout calculation performed server-side');
bullet('Round results written to database atomically with transaction rollback on error');
bullet('Admin actions require separate JWT role verification (role: "admin")');

// ── Section 9 ─────────────────────────────────────────────
checkPage(80);
h1('9. AUDIT LOG & ROUND HISTORY');

h2('9.1 Database Schema');
codeBlock([
  'CREATE TABLE rounds (',
  '  id          INTEGER PRIMARY KEY AUTOINCREMENT,',
  '  uid         TEXT    NOT NULL,',
  '  game        TEXT    NOT NULL,',
  '  server_seed TEXT    NOT NULL,   -- revealed post-round',
  '  server_hash TEXT    NOT NULL,   -- SHA-256 of server_seed',
  '  client_seed TEXT    NOT NULL,',
  '  nonce       INTEGER NOT NULL,',
  '  result      REAL    NOT NULL,   -- game outcome value',
  '  bet         REAL    NOT NULL,',
  '  payout      REAL    NOT NULL,',
  '  created_at  TEXT    DEFAULT (datetime("now"))',
  ');',
]);

h2('9.2 Log Integrity');
bullet('Every round is recorded before payout is processed');
bullet('Server seed revealed in the rounds table after round completion');
bullet('Players can query their full history via GET /api/history');
bullet('Admin audit endpoint: GET /api/admin/rounds — full platform history with filters');
bullet('Timestamps stored in UTC; database file backed up on Railway persistent volume');

// ── Section 10 ─────────────────────────────────────────────
checkPage(100);
h1('10. STATISTICAL TESTING');

h2('10.1 Required Test Suite');
para('The following NIST SP 800-22 statistical tests should be applied to a sample of ≥ 1,000,000 generated values:');
table(
  ['Test', 'Purpose', 'Expected result'],
  [
    ['Frequency (Monobit)',     'Proportion of 0s and 1s',          'p-value ≥ 0.01'],
    ['Block Frequency',        'Frequency within M-bit blocks',     'p-value ≥ 0.01'],
    ['Runs',                   'Oscillation between 0s and 1s',     'p-value ≥ 0.01'],
    ['Longest Run of Ones',    'Longest run within 128-bit blocks', 'p-value ≥ 0.01'],
    ['DFT (Spectral)',         'Periodic features in sequence',     'p-value ≥ 0.01'],
    ['Serial',                 'Frequency of all m-bit patterns',   'p-value ≥ 0.01'],
    ['Approximate Entropy',    'Frequency of overlapping patterns', 'p-value ≥ 0.01'],
    ['Cumulative Sums',        'Cumulative sum of adjusted values', 'p-value ≥ 0.01'],
    ['Chi-Square Uniformity',  'Uniform distribution in [0, max)',  'p-value ≥ 0.01'],
  ],
  [155, 180, 120]
);

h2('10.2 Game-Level Testing');
para('In addition to raw RNG tests, the following game-level statistical tests are recommended:');
bullet('RTP simulation: 10,000,000 rounds per game — measured RTP within ±0.5% of theoretical');
bullet('Distribution test: verify uniform coverage of all possible outcomes');
bullet('Independence test: no correlation between consecutive rounds');
bullet('Seed uniqueness: verify no server seed is used more than once');

// ── Section 11 ─────────────────────────────────────────────
checkPage(80);
h1('11. COMPLIANCE STATEMENT');

h2('11.1 Standards Compliance');
table(
  ['Standard', 'Status', 'Notes'],
  [
    ['HMAC-SHA256 (RFC 2104)',          '✓ Implemented', 'Node.js crypto module'],
    ['NIST SP 800-90A CSPRNG',          '✓ Compliant',   'OS entropy via crypto.randomBytes'],
    ['iTech Labs RNG Criteria v4.0',    '⏳ Pending audit', 'Documentation prepared'],
    ['eCOGRA RNG Testing Standard',     '⏳ Pending audit', 'Documentation prepared'],
    ['Provably Fair (player verif.)',    '✓ Implemented', 'Public verify endpoint'],
    ['HTTPS / TLS 1.2+',               '✓ Enforced',    'Railway.app infrastructure'],
    ['AML / KYC Player Verification',   '✓ Implemented', 'KYC module with doc upload'],
    ['Responsible Gambling Controls',   '✓ Implemented', 'Deposit limits, self-exclusion'],
  ],
  [200, 120, 165]
);

h2('11.2 Certifications Required');
bullet('iTech Labs (Malta / Australia) — primary RNG certification body');
bullet('eCOGRA (UK) — alternative / supplementary certification');
bullet('Curaçao GCB Sublicense — Antillephone N.V. or Cyberluck — requires RNG cert submission');
bullet('PCI DSS SAQ A — required for Stripe card payment integration');

// ── Section 12 ─────────────────────────────────────────────
checkPage(100);
h1('12. OPERATOR DECLARATION');

para('HATHOR Royal Casino declares that the RNG system described in this document is the sole system used for determining game outcomes on the platform, and that no alternative or supplementary outcome-determination mechanisms exist.');
nl(0.5);
para('The provably fair system is active for all games listed in Section 5. Players have access to full round history and an independent verification tool at all times.');
nl(0.5);
para('The information contained herein is accurate and complete as of April 2026. The operator commits to notifying the certification authority of any material changes to the RNG system within 30 days of implementation.');
nl(0.5);
para('The operator consents to full source code review and live system testing by the appointed certification laboratory.');

cy += 20;
divider();

h2('Authorised Signatory');
cy += 10;

// Signature lines
doc.moveTo(ML, cy + 18).lineTo(ML + 180, cy + 18).strokeColor(DARK).lineWidth(0.5).stroke();
doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('Signature', ML, cy + 22, { lineBreak: false });
doc.moveTo(ML + 210, cy + 18).lineTo(ML + 390, cy + 18).strokeColor(DARK).lineWidth(0.5).stroke();
doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('Full Name & Title', ML + 210, cy + 22, { lineBreak: false });
cy += 40;

doc.moveTo(ML, cy + 18).lineTo(ML + 180, cy + 18).strokeColor(DARK).lineWidth(0.5).stroke();
doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('Date', ML, cy + 22, { lineBreak: false });
doc.moveTo(ML + 210, cy + 18).lineTo(ML + 390, cy + 18).strokeColor(DARK).lineWidth(0.5).stroke();
doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('Company Seal / Stamp', ML + 210, cy + 22, { lineBreak: false });
cy += 50;

divider();
para('Document reference: HATHOR-RNG-DOC-v1.0  ·  Classification: CONFIDENTIAL  ·  For certification purposes only', { color: LGRAY, align: 'center' });

// ── Add footer to last page, then flush ──────────────────
addFooter();

doc.flushPages();
doc.end();

stream.on('finish', () => {
  const size = (fs.statSync(OUT).size / 1024).toFixed(1);
  console.log('');
  console.log('✅  PDF generated successfully!');
  console.log('   File : ' + OUT);
  console.log('   Size : ' + size + ' KB');
  console.log('');
});
stream.on('error', e => console.error('❌ Error:', e.message));
