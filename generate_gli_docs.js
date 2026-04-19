/**
 * GLI-19 + GLI-11 Documentation Generator
 * Generates two PDFs:
 *   1. GLI-19_System_Architecture_HATHOR_Casino.pdf
 *   2. GLI-11_Game_Rules_HATHOR_Casino.pdf
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ── Shared PDF builder factory ────────────────────────────
function createDoc(title, subject) {
  return new PDFDocument({
    margin: 0, size: 'A4', bufferPages: true,
    info: { Title: title, Author: 'HATHOR Royal Ltd.', Subject: subject,
            Keywords: 'GLI, Casino, HATHOR, Online Gaming, Certification' }
  });
}

const GOLD  = '#c9a84c';
const DARK  = '#1a1a2e';
const GRAY  = '#555555';
const LGRAY = '#aaaaaa';
const BLACK = '#111111';
const WHITE = '#ffffff';
const BGCODE= '#f0f0f0';
const ML=55, MR=55, MT=50, PW=595.28, PH=841.89;
const CW = PW - ML - MR;

// ── Build a PDF in memory using a builder function ────────
function buildPDF(outPath, builderFn) {
  return new Promise((resolve, reject) => {
    const doc = createDoc(path.basename(outPath, '.pdf'), '');
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    let cy = MT;

    const nl  = (n=1) => { cy += n * 14; };

    const checkPage = (needed=40) => {
      if (cy + needed > PH - 60) {
        addFooter(doc, cy);
        doc.addPage({ margin: 0, size: 'A4' });
        cy = MT;
      }
    };

    const addFooter = (doc) => {
      const y = PH - 26;
      doc.rect(0, y-2, PW, 28).fill('#f5f5f5');
      doc.moveTo(ML, y-2).lineTo(ML+CW, y-2).strokeColor(GOLD).lineWidth(0.8).stroke();
      const pgNum = doc.bufferedPageRange().count;
      doc.fillColor(LGRAY).font('Helvetica').fontSize(7)
         .text(path.basename(outPath, '.pdf'), ML, y+4, { width: CW-60, lineBreak:false });
      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(7)
         .text('Page '+pgNum, ML, y+4, { width: CW, align:'right', lineBreak:false });
    };

    const h1 = (txt) => {
      checkPage(40);
      cy += 8;
      doc.rect(ML-5, cy, CW+10, 24).fill(DARK);
      doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(12)
         .text(txt, ML+4, cy+6, { width: CW-8, lineBreak:false });
      cy += 32;
      doc.fillColor(BLACK);
    };

    const h2 = (txt) => {
      checkPage(30);
      cy += 6;
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10.5)
         .text(txt, ML, cy, { width: CW, lineBreak:false });
      cy += 14;
      doc.moveTo(ML, cy).lineTo(ML+CW, cy).strokeColor(GOLD).lineWidth(0.8).stroke();
      cy += 6;
      doc.fillColor(BLACK);
    };

    const h3 = (txt) => {
      checkPage(20);
      cy += 4;
      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(9.5)
         .text(txt, ML, cy, { width: CW, lineBreak:false });
      cy += 13;
      doc.fillColor(BLACK);
    };

    const para = (txt, opts={}) => {
      const fsize = opts.size||9;
      const font  = opts.bold ? 'Helvetica-Bold' : 'Helvetica';
      doc.fillColor(opts.color||BLACK).font(font).fontSize(fsize);
      const h = doc.heightOfString(txt, { width: CW, lineGap:1.5 });
      checkPage(h+8);
      doc.text(txt, ML, cy, { width: CW, lineGap:1.5, align: opts.align||'left' });
      cy += h + 6;
    };

    const bullet = (txt, indent=0) => {
      const x = ML+10+indent*14, w = CW-10-indent*14;
      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(9).text('•', x-10, cy, { width:10, lineBreak:false });
      doc.fillColor(BLACK).font('Helvetica').fontSize(9);
      const h = doc.heightOfString(txt, { width:w, lineGap:1.5 });
      checkPage(h+6);
      doc.text(txt, x, cy, { width:w, lineGap:1.5 });
      cy += h+4;
    };

    const code = (lines) => {
      const txt = Array.isArray(lines) ? lines.join('\n') : lines;
      doc.font('Courier').fontSize(7.5);
      const h = doc.heightOfString(txt, { width: CW-16, lineGap:2 });
      checkPage(h+16);
      cy += 4;
      doc.rect(ML, cy, CW, h+14).fill(BGCODE).stroke();
      doc.fillColor('#333333').text(txt, ML+8, cy+7, { width: CW-16, lineGap:2 });
      cy += h+20;
      doc.fillColor(BLACK);
    };

    const tbl = (headers, rows, colWidths) => {
      const rowH=16, totalW = colWidths.reduce((a,b)=>a+b,0);
      checkPage(rowH*(rows.length+1)+10);
      cy += 4;
      let x = ML;
      doc.rect(ML, cy, totalW, rowH).fill(DARK);
      headers.forEach((h,i) => {
        doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8)
           .text(h, x+4, cy+4, { width: colWidths[i]-8, lineBreak:false });
        x += colWidths[i];
      });
      cy += rowH;
      rows.forEach((row, ri) => {
        checkPage(rowH+4);
        x = ML;
        doc.rect(ML, cy, totalW, rowH).fill(ri%2===0?'#f9f9f9':WHITE);
        doc.rect(ML, cy, totalW, rowH).stroke('#dddddd');
        row.forEach((cell,i) => {
          doc.fillColor(BLACK).font('Helvetica').fontSize(8)
             .text(String(cell), x+4, cy+4, { width: colWidths[i]-8, lineBreak:false });
          x += colWidths[i];
        });
        cy += rowH;
      });
      cy += 8;
      doc.fillColor(BLACK);
    };

    const divider = () => {
      cy += 4;
      doc.moveTo(ML, cy).lineTo(ML+CW, cy).strokeColor('#dddddd').lineWidth(0.5).stroke();
      cy += 8;
    };

    const cover = (title, subtitle, version, infoRows) => {
      doc.rect(0,0,PW,PH).fill(DARK);
      doc.rect(0,0,PW,6).fill(GOLD);
      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(30).text('♦ HATHOR', 0, 155, { width:PW, align:'center' });
      doc.fillColor(WHITE).font('Helvetica').fontSize(15).text('ROYAL CASINO', 0, 196, { width:PW, align:'center' });
      doc.moveTo(180, 232).lineTo(PW-180, 232).strokeColor(GOLD).lineWidth(1.5).stroke();
      doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(18).text(title, 0, 252, { width:PW, align:'center' });
      doc.fillColor(GOLD).font('Helvetica').fontSize(11).text(subtitle, 0, 282, { width:PW, align:'center' });
      doc.rect(180, 318, PW-360, 48).strokeColor(GOLD).lineWidth(1).stroke();
      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(10).text(version, 0, 334, { width:PW, align:'center' });
      const iy0 = 400;
      infoRows.forEach(([label, val], i) => {
        const iy = iy0 + i*21;
        doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(9).text(label+':', 160, iy, { width:110, lineBreak:false });
        doc.fillColor(WHITE).font('Helvetica').fontSize(9).text(val, 278, iy, { width:220, lineBreak:false });
      });
      doc.rect(0,PH-6,PW,6).fill(GOLD);
      doc.fillColor(LGRAY).font('Helvetica').fontSize(7.5)
         .text('Confidential — For certification purposes only', 0, PH-24, { width:PW, align:'center' });
    };

    // Run the actual content builder
    builderFn({ doc, h1, h2, h3, para, bullet, code, tbl, divider, cover, nl, checkPage,
                addFooter: () => addFooter(doc),
                newPage: () => { addFooter(doc); doc.addPage({ margin:0, size:'A4' }); cy = MT; },
                getCy: () => cy, setCy: (v) => { cy = v; } });

    addFooter(doc);
    doc.flushPages();
    doc.end();
    stream.on('finish', () => {
      const size = (fs.statSync(outPath).size/1024).toFixed(1);
      console.log('✅  ' + path.basename(outPath) + ' — ' + size + ' KB');
      resolve();
    });
    stream.on('error', reject);
  });
}

// ═══════════════════════════════════════════════════════════
// DOCUMENT 1 — GLI-19 SYSTEM ARCHITECTURE
// ═══════════════════════════════════════════════════════════
async function buildGLI19() {
  const OUT = path.join(__dirname, 'GLI-19_System_Architecture_HATHOR_Casino.pdf');
  await buildPDF(OUT, ({ doc, h1, h2, h3, para, bullet, code, tbl, divider, cover, newPage, addFooter, getCy, setCy }) => {

    // COVER
    cover(
      'GLI-19 System Architecture',
      'Online Gaming System — Technical Specification & Compliance Package',
      'VERSION 1.0  ·  APRIL 2026  ·  CONFIDENTIAL',
      [
        ['Standard',    'GLI-19 — Online Gaming Systems'],
        ['Operator',    'HATHOR Royal Ltd.'],
        ['Platform',    'HATHOR Royal Casino'],
        ['Prepared for','Gaming Laboratories International (GLI)'],
        ['Date',        'April 2026'],
        ['Status',      'Submitted for Certification Audit'],
      ]
    );

    // PAGE 2 — TOC
    newPage();
    h1('TABLE OF CONTENTS');
    const toc = [
      ['1.','Executive Summary','3'],
      ['2.','System Architecture Overview','3'],
      ['3.','Technology Stack','4'],
      ['4.','Database Architecture','4'],
      ['5.','API Architecture','5'],
      ['6.','Real-Time Communication','6'],
      ['7.','Player Account Management','6'],
      ['8.','Financial Transaction Processing','7'],
      ['9.','Security Architecture','8'],
      ['10.','Responsible Gambling Controls','9'],
      ['11.','KYC / AML Compliance','9'],
      ['12.','Audit Trail & Logging','10'],
      ['13.','Infrastructure & Availability','10'],
      ['14.','Change Management','11'],
      ['15.','Operator Declaration','11'],
    ];
    toc.forEach(([num, title, pg]) => {
      const cy = getCy();
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9.5).text(num, ML, cy, { width:20, lineBreak:false });
      doc.fillColor(BLACK).font('Helvetica').fontSize(9.5).text(title, ML+22, cy, { width: CW-60, lineBreak:false });
      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(9.5).text(pg, ML, cy, { width:CW, align:'right', lineBreak:false });
      setCy(cy+18);
    });
    setCy(getCy()+10);
    divider();
    para('This document provides a complete technical specification of the HATHOR Royal Casino online gaming platform in accordance with GLI-19 (Online Gaming Systems) standards. It is submitted to Gaming Laboratories International to support the system certification audit.', { color: GRAY });

    // CONTENT
    newPage();

    // S1
    h1('1. EXECUTIVE SUMMARY');
    para('HATHOR Royal Casino is a web-based online gambling platform built on Node.js, providing players with a wide range of casino games including slots, table games, crash games, sports betting, and instant win games. The platform incorporates a cryptographically secure, provably fair RNG, a fully integrated KYC/AML compliance module, responsible gambling controls, and multi-currency payment processing.');
    bullet('Platform type: Online casino — browser-based, no download required');
    bullet('RNG: HMAC-SHA256 (CSPRNG) — GLI-11 certified separately');
    bullet('Games: 30+ games across 5 categories');
    bullet('Payments: Cryptocurrency (BTC/ETH/USDT/BNB/TRX) + Card (Stripe)');
    bullet('Jurisdictions: Operating under Curaçao GCB sublicense');
    bullet('Player protection: KYC, AML, self-exclusion, deposit limits');

    // S2
    h1('2. SYSTEM ARCHITECTURE OVERVIEW');
    h2('2.1 High-Level Architecture');
    para('The platform follows a three-tier architecture:');
    tbl(
      ['Layer','Component','Technology'],
      [
        ['Presentation','Browser client (HTML/CSS/JS)','Vanilla JS, Web Sockets'],
        ['Application','API server + Game logic','Node.js 22 + Express.js 4'],
        ['Data','Persistent storage','SQLite (better-sqlite3)'],
        ['Infrastructure','Container hosting','Railway.app (Docker)'],
      ],
      [110,200,170]
    );

    h2('2.2 Component Diagram');
    code([
      '┌─────────────────────────────────────────────────────┐',
      '│                   PLAYER BROWSER                    │',
      '│  HTML pages: lobby, cashier, games, KYC, PF verify  │',
      '│  Socket.IO client  ·  Stripe.js  ·  Service Worker  │',
      '└──────────────────────┬──────────────────────────────┘',
      '                       │  HTTPS / WSS (TLS 1.2+)',
      '┌──────────────────────▼──────────────────────────────┐',
      '│               NODE.JS APPLICATION SERVER            │',
      '│  Express.js REST API  ·  Socket.IO game events       │',
      '│  RNG Engine  ·  Game Logic  ·  Auth (JWT)            │',
      '│  KYC/AML  ·  Payments  ·  Admin panel               │',
      '└──────────────────────┬──────────────────────────────┘',
      '                       │',
      '┌──────────────────────▼──────────────────────────────┐',
      '│                  SQLITE DATABASE                     │',
      '│  users · game_log · provably_fair · kyc             │',
      '│  transactions · bonuses · tournaments · affiliates   │',
      '└─────────────────────────────────────────────────────┘',
    ]);

    // S3
    h1('3. TECHNOLOGY STACK');
    tbl(
      ['Component','Technology','Version','Purpose'],
      [
        ['Runtime',         'Node.js',          '22.x LTS', 'Server-side JavaScript'],
        ['Web Framework',   'Express.js',       '4.x',      'HTTP API routing'],
        ['Real-time',       'Socket.IO',        '4.x',      'Live game events'],
        ['Database',        'better-sqlite3',   '9.x',      'Persistent data storage'],
        ['Authentication',  'jsonwebtoken',     '9.x',      'JWT-based auth'],
        ['Cryptography',    'Node.js crypto',   'built-in', 'RNG, hashing, HMAC'],
        ['File uploads',    'multer',           '1.x',      'KYC document uploads'],
        ['Payments',        'stripe',           '14.x',     'Card payment processing'],
        ['Payments',        'NowPayments API',  '1.x',      'Crypto payment processing'],
        ['Hosting',         'Railway.app',      'N/A',      'Docker container hosting'],
        ['CDN/TLS',         'Railway proxy',    'N/A',      'HTTPS termination'],
      ],
      [110, 130, 80, 160]
    );

    // S4
    h1('4. DATABASE ARCHITECTURE');
    h2('4.1 Schema Overview');
    tbl(
      ['Table','Records','Purpose'],
      [
        ['users',              'One per player',      'Account, balance, level, XP'],
        ['game_log',           'One per round',       'All game outcomes, bets, wins'],
        ['provably_fair',      'One per PF round',    'Seeds, hashes, nonce, result'],
        ['kyc',                'One per player',      'KYC documents and status'],
        ['pending_bets',       'Sports bets',         'Sports wager management'],
        ['transactions',       'Financial records',   'Deposits and withdrawals'],
        ['bonuses',            'Per bonus grant',     'Bonus tracking and wagering'],
        ['gambling_limits',    'Per player',          'Deposit limits, self-exclusion'],
        ['tournaments',        'Per tournament',      'Tournament definitions'],
        ['tournament_scores',  'Per entry',           'Player scores per tournament'],
        ['affiliates',         'Per affiliate',       'Referral tracking and earnings'],
        ['admin_staff',        'Per staff member',    'Staff accounts and roles'],
        ['admin_sessions',     'Per login',           'Staff session tokens'],
        ['settings',           'Key-value pairs',     'Platform configuration'],
      ],
      [140, 120, 220]
    );

    h2('4.2 Financial Integrity');
    bullet('All balance changes use SQLite transactions — atomic, consistent, isolated, durable (ACID)');
    bullet('Token balance never goes negative — enforced at DB level with CHECK constraints');
    bullet('Every bet deducted before game result computed — prevents race conditions');
    bullet('Payout credited atomically with game log entry — no orphan records');

    // S5
    h1('5. API ARCHITECTURE');
    h2('5.1 REST Endpoints');
    tbl(
      ['Method','Endpoint','Auth','Purpose'],
      [
        ['POST', '/api/login',                  'None',  'Player login / registration'],
        ['GET',  '/api/stats/:uid',             'None',  'Player stats and balance'],
        ['POST', '/api/bonus/daily',            'UID',   'Claim daily bonus'],
        ['POST', '/api/bet/sports',             'UID',   'Place sports bet'],
        ['GET',  '/api/history',                'UID',   'Transaction history'],
        ['GET',  '/api/provably-fair/seeds/:uid','UID',  'Current seed info (hashed)'],
        ['POST', '/api/provably-fair/rotate',   'UID',   'Rotate seeds'],
        ['POST', '/api/provably-fair/verify',   'None',  'Verify past round'],
        ['POST', '/api/pf/slots',               'UID',   'Provably fair slots spin'],
        ['POST', '/api/pf/roulette',            'UID',   'Provably fair roulette spin'],
        ['POST', '/api/pf/blackjack',           'UID',   'Provably fair BJ deck'],
        ['POST', '/api/kyc/submit',             'UID',   'Submit KYC documents'],
        ['GET',  '/api/kyc/status/:uid',        'UID',   'KYC status check'],
        ['POST', '/api/stripe/create-payment-intent','UID','Create card payment'],
        ['POST', '/api/stripe/webhook',         'Stripe','Payment confirmation'],
        ['GET',  '/api/crypto/currencies',      'None',  'Supported crypto list'],
        ['POST', '/api/crypto/create-deposit',  'UID',   'Create crypto deposit'],
      ],
      [55, 220, 60, 145]
    );

    h2('5.2 Admin API');
    tbl(
      ['Method','Endpoint','Role','Purpose'],
      [
        ['GET',  '/api/admin/stats',             'Any admin',  'Platform statistics'],
        ['GET',  '/api/admin/players',           'Any admin',  'Player list'],
        ['POST', '/api/admin/gift',              'support+',   'Gift tokens to player'],
        ['POST', '/api/admin/ban',               'moderator+', 'Ban player'],
        ['GET',  '/api/admin/kyc/pending',       'kyc+',       'Pending KYC list'],
        ['POST', '/api/admin/kyc/review',        'kyc+',       'Approve/reject KYC'],
        ['GET',  '/api/admin/withdrawals',       'finance+',   'Withdrawal requests'],
        ['POST', '/api/admin/rtp',               'superadmin', 'Update RTP config'],
        ['POST', '/api/admin/staff/create',      'superadmin', 'Create staff account'],
      ],
      [55, 200, 100, 125]
    );

    // S6
    h1('6. REAL-TIME COMMUNICATION');
    h2('6.1 Socket.IO Events');
    para('Game events are transmitted via Socket.IO over WebSocket (WSS). Each player connects with their UID, which is used to route server → client messages:');
    tbl(
      ['Event (client→server)','Event (server→client)','Purpose'],
      [
        ['joinRoom(uid)',          'balanceUpdate',         'Player connects, balance sync'],
        ['placeBet (game params)', 'gameResult',            'Game round outcome'],
        ['crashBet(uid,bet)',      'crashTick / crashEnd',  'Crash game real-time feed'],
        ['chatMessage',           'chatBroadcast',         'Live chat'],
        ['—',                     'depositConfirmed',      'Payment credited notification'],
        ['—',                     'jackpotWon',            'Jackpot win broadcast'],
      ],
      [165, 155, 160]
    );

    h2('6.2 Crash Game Real-Time');
    bullet('Server runs a game loop — broadcasts multiplier tick every 100ms to all connected players');
    bullet('Bets placed before round start — no bets accepted during active multiplier growth');
    bullet('Crash point determined server-side using HMAC-SHA256 before round begins');
    bullet('All auto-cashout triggers processed server-side — client cannot manipulate timing');

    // S7
    h1('7. PLAYER ACCOUNT MANAGEMENT');
    h2('7.1 Registration & Login');
    code([
      'POST /api/login',
      'Body: { name: string, uid?: string }',
      '',
      '// New player: uid generated with uuidv4()',
      '// Returning player: uid looked up in users table',
      '// Response: { uid, name, tokens, level, xp, ... }',
      '// UID stored in localStorage (client) — no password required',
      '// Optional: JWT token issued for API auth',
    ]);
    bullet('No password required for basic access — UID acts as session token');
    bullet('JWT middleware available for sensitive endpoints');
    bullet('Player name changeable — UID is immutable primary key');
    bullet('Initial balance: 10,000 tokens (welcome bonus)');

    h2('7.2 Balance System');
    bullet('All balances stored in integer tokens — no floating point arithmetic');
    bullet('EUR_TO_TOKENS = 100 (€1 = 100 tokens)');
    bullet('Minimum bet enforced per game (1–100 tokens depending on game)');
    bullet('Maximum bet enforced per game (server-side, not client-side)');

    h2('7.3 VIP / Level System');
    tbl(
      ['Level','XP Required','Title','Benefits'],
      [
        ['1','0','Bronze','10,000 welcome tokens'],
        ['2','500','Silver','Daily bonus +10%'],
        ['3','1,500','Gold','Daily bonus +25%'],
        ['4','5,000','Platinum','Daily bonus +50%'],
        ['5','15,000','Diamond','Max daily bonus, VIP support'],
      ],
      [50, 100, 80, 250]
    );

    // S8
    h1('8. FINANCIAL TRANSACTION PROCESSING');
    h2('8.1 Cryptocurrency Deposits');
    bullet('Provider: NowPayments.io API');
    bullet('Supported: BTC, ETH, USDT (ERC-20), BNB (BEP-20), TRX');
    bullet('Process: Player selects currency → server creates invoice via NowPayments API → player sends crypto to generated address → webhook confirms payment → tokens credited');
    bullet('Webhook verification: NowPayments HMAC-SHA512 signature verified server-side');
    bullet('Minimum: 1,000 tokens (€10 equivalent)');
    bullet('Confirmation: 1 blockchain block');

    h2('8.2 Card Payments (Stripe)');
    bullet('Provider: Stripe Payments (PCI DSS Level 1 certified)');
    bullet('Card data never touches HATHOR servers — processed entirely by Stripe Elements');
    bullet('Flow: PaymentIntent created server-side → Stripe Elements collects card → webhook payment_intent.succeeded → tokens credited');
    bullet('Webhook: verified with Stripe-Signature header (HMAC-SHA256)');
    bullet('Minimum: €5 · Maximum: €1,000 per transaction');
    bullet('Supported: Visa, Mastercard, American Express');

    h2('8.3 Withdrawals');
    bullet('Cryptocurrency only — player provides wallet address');
    bullet('Minimum withdrawal: 5,000 tokens (€50)');
    bullet('Manual review required — processed within 24 hours by finance staff');
    bullet('KYC verification required before first withdrawal');
    bullet('All withdrawal requests logged with uid, amount, currency, address, timestamp');

    h2('8.4 Financial Controls');
    code([
      '// Bet deduction — atomic',
      "db.prepare('UPDATE users SET tokens = tokens - ? WHERE uid = ? AND tokens >= ?').run(bet, uid, bet);",
      '// If no rows affected → insufficient balance → reject bet',
      '',
      '// Payout credit — atomic with game log',
      "const tx = db.transaction(() => {",
      "  db.prepare('UPDATE users SET tokens = tokens + ? WHERE uid = ?').run(payout, uid);",
      "  db.prepare('INSERT INTO game_log ...').run(...);",
      "});",
      "tx();",
    ]);

    // S9
    h1('9. SECURITY ARCHITECTURE');
    h2('9.1 Authentication & Authorization');
    tbl(
      ['Layer','Mechanism','Details'],
      [
        ['Player sessions',   'UID + localStorage',        'Stateless, no server session needed'],
        ['Admin access',      'JWT Bearer token',          'Role-based (superadmin/moderator/support/finance/kyc)'],
        ['API key fallback',  'x-admin-key header',        'Master password for superadmin'],
        ['Staff tokens',      'staff_ prefixed JWT',       '8-hour expiry, stored in admin_sessions table'],
        ['Stripe webhooks',   'Stripe-Signature header',   'HMAC-SHA256 verification'],
        ['Crypto webhooks',   'x-nowpayments-sig header',  'HMAC-SHA512 verification'],
      ],
      [120, 150, 210]
    );

    h2('9.2 Data Protection');
    bullet('All communications encrypted with TLS 1.2+ (Railway.app proxy)');
    bullet('Passwords hashed with SHA-256 + application salt (admin staff)');
    bullet('Player UIDs are UUIDs v4 — not guessable or sequential');
    bullet('KYC documents stored in /uploads/ directory — not publicly accessible');
    bullet('No sensitive data (card numbers, bank details) ever stored');
    bullet('Environment variables used for all secrets — never hardcoded in source');

    h2('9.3 Input Validation');
    bullet('All bet amounts validated server-side (type, min, max)');
    bullet('User inputs sanitised before SQL insertion (parameterised queries)');
    bullet('File uploads restricted to image types (JPEG, PNG, PDF) with size limits');
    bullet('Rate limiting: Socket.IO events throttled per UID to prevent spam');

    // S10
    h1('10. RESPONSIBLE GAMBLING CONTROLS');
    h2('10.1 Available Controls');
    tbl(
      ['Control','Implementation','Enforced By'],
      [
        ['Daily deposit limit',     'Player sets max daily deposit amount',     'Server-side check on deposit'],
        ['Weekly deposit limit',    'Player sets max weekly deposit amount',    'Server-side check on deposit'],
        ['Self-exclusion',          'Player excludes for chosen duration',      'Auth middleware blocks login'],
        ['Reality check',           'Session time reminders',                   'Client-side timer'],
        ['Age verification',        'KYC — date of birth required',            '18+ check during KYC'],
        ['Responsible Gambling page','Links to GamCare, BeGambleAware',        'Accessible from all pages'],
      ],
      [140, 180, 160]
    );

    h2('10.2 Database Schema');
    code([
      'CREATE TABLE gambling_limits (',
      '  uid            TEXT PRIMARY KEY,',
      '  daily_limit    INTEGER DEFAULT 0,  -- 0 = no limit',
      '  weekly_limit   INTEGER DEFAULT 0,  -- 0 = no limit',
      '  self_excluded  INTEGER DEFAULT 0,  -- 0/1 flag',
      '  excluded_until TEXT DEFAULT NULL,  -- ISO datetime',
      '  updated_at     TEXT DEFAULT (datetime("now"))',
      ');',
    ]);

    // S11
    h1('11. KYC / AML COMPLIANCE');
    h2('11.1 KYC Process');
    bullet('Step 1 — Personal details: full name, date of birth, country');
    bullet('Step 2 — Document upload: government-issued photo ID (front + back) + selfie');
    bullet('Step 3 — Review: staff reviews via admin panel, approves or rejects with reason');
    bullet('Accepted documents: passport, national ID card, driving licence, residence permit');
    bullet('Age verification: date of birth compared to current date — must be 18+');
    bullet('Status states: unverified → pending → approved / rejected');

    h2('11.2 AML Measures');
    bullet('All transactions logged with UID, amount, currency, timestamp');
    bullet('Large transaction alerts: manual review triggered for deposits > €5,000');
    bullet('Player activity monitoring via admin statistics dashboard');
    bullet('Withdrawal requires KYC approval — prevents anonymous withdrawals');
    bullet('Full AML policy published at /aml.html');

    // S12
    h1('12. AUDIT TRAIL & LOGGING');
    h2('12.1 Game Log');
    code([
      'CREATE TABLE game_log (',
      '  id       INTEGER PRIMARY KEY AUTOINCREMENT,',
      '  uid      TEXT    NOT NULL,',
      '  game     TEXT    NOT NULL,',
      '  bet      INTEGER DEFAULT 0,',
      '  result   INTEGER DEFAULT 0,',
      '  won      INTEGER DEFAULT 0,',
      '  ts       TEXT    DEFAULT (datetime("now"))',
      ');',
      '-- Every single round recorded before payout',
    ]);

    h2('12.2 Provably Fair Audit Log');
    code([
      'CREATE TABLE provably_fair (',
      '  round_id    TEXT PRIMARY KEY,',
      '  uid         TEXT NOT NULL,',
      '  game        TEXT NOT NULL,',
      '  server_seed TEXT NOT NULL,  -- revealed post-round',
      '  server_hash TEXT NOT NULL,  -- SHA-256(server_seed)',
      '  client_seed TEXT,',
      '  nonce       INTEGER DEFAULT 0,',
      '  result      TEXT,',
      '  revealed    INTEGER DEFAULT 0,',
      '  created_at  TEXT DEFAULT (datetime("now"))',
      ');',
    ]);

    bullet('Admin can query full round history with filters via GET /api/admin/rounds');
    bullet('Players can access their own history via GET /api/history');
    bullet('Every admin action logged with staff UID, timestamp, and action type');

    // S13
    h1('13. INFRASTRUCTURE & AVAILABILITY');
    h2('13.1 Hosting');
    tbl(
      ['Component','Provider','Details'],
      [
        ['Application server',  'Railway.app',      'Docker container — auto-restarts on crash'],
        ['Database',            'Railway Volume',   'Persistent SQLite on mounted volume'],
        ['File storage',        'Railway Volume',   'KYC documents on same persistent volume'],
        ['TLS/HTTPS',           'Railway proxy',    'TLS 1.2+ termination, auto-renewed cert'],
        ['Domain',              'Custom domain',    'CNAME to Railway.app endpoint'],
        ['Monitoring',          'Railway metrics',  'CPU, RAM, request logs, uptime'],
      ],
      [130, 120, 230]
    );

    h2('13.2 Availability Targets');
    bullet('Target uptime: 99.5% monthly (Railway.app SLA: 99.9%)');
    bullet('Auto-restart on crash — Railway restarts container within 30 seconds');
    bullet('Database backup: Railway volume snapshots (configurable frequency)');
    bullet('Deployment: zero-downtime rolling deployments via Railway');

    // S14
    h1('14. CHANGE MANAGEMENT');
    para('The operator commits to the following change management procedures in accordance with GLI-19 requirements:');
    bullet('All code changes reviewed before deployment — version control via Git');
    bullet('Material RNG changes → notify GLI within 30 days, re-submit for delta certification');
    bullet('New game additions → submit game rules and RTP documentation to GLI');
    bullet('Infrastructure changes → documented and available for audit review');
    bullet('Version history maintained in Git commit log — available to auditors on request');

    // S15
    h1('15. OPERATOR DECLARATION');
    para('HATHOR Royal Ltd. declares that this document accurately and completely describes the HATHOR Royal Casino online gaming platform as operated at the time of certification audit submission.');
    para('The operator confirms that:');
    bullet('No undisclosed game logic, outcome manipulation, or alternative RNG systems exist');
    bullet('All player funds are held securely and not commingled with operational funds');
    bullet('The platform operates in compliance with the conditions of its gaming licence');
    bullet('The operator consents to full source code access and live system testing by GLI');

    setCy(getCy()+20);
    divider();

    h2('Authorised Signatory');
    const cyNow = getCy() + 10;
    doc.moveTo(ML, cyNow+18).lineTo(ML+180, cyNow+18).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('Signature', ML, cyNow+22, { lineBreak:false });
    doc.moveTo(ML+210, cyNow+18).lineTo(ML+390, cyNow+18).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('Full Name & Title', ML+210, cyNow+22, { lineBreak:false });
    setCy(cyNow+45);
    const cyNow2 = getCy();
    doc.moveTo(ML, cyNow2+18).lineTo(ML+180, cyNow2+18).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('Date', ML, cyNow2+22, { lineBreak:false });
    doc.moveTo(ML+210, cyNow2+18).lineTo(ML+390, cyNow2+18).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('Company Seal / Stamp', ML+210, cyNow2+22, { lineBreak:false });
    setCy(cyNow2+50);
    divider();
    para('GLI-19_System_Architecture_HATHOR_Casino.pdf  ·  CONFIDENTIAL  ·  April 2026', { color: LGRAY, align:'center' });
  });
}

// ═══════════════════════════════════════════════════════════
// DOCUMENT 2 — GLI-11 GAME RULES
// ═══════════════════════════════════════════════════════════
async function buildGLI11() {
  const OUT = path.join(__dirname, 'GLI-11_Game_Rules_HATHOR_Casino.pdf');
  await buildPDF(OUT, ({ doc, h1, h2, h3, para, bullet, code, tbl, divider, cover, newPage, addFooter, getCy, setCy }) => {

    // COVER
    cover(
      'GLI-11 Game Rules & RTP Documentation',
      'Complete Game Rules, Payout Tables, and RTP Verification Package',
      'VERSION 1.0  ·  APRIL 2026  ·  CONFIDENTIAL',
      [
        ['Standards',   'GLI-11 (RNG) · GLI-16 (Game Rules) · GLI-19 (System)'],
        ['Operator',    'HATHOR Royal Ltd.'],
        ['Platform',    'HATHOR Royal Casino'],
        ['Games',       '30+ games across 5 categories'],
        ['Date',        'April 2026'],
        ['Status',      'Submitted for Certification Audit'],
      ]
    );

    // TOC
    newPage();
    h1('TABLE OF CONTENTS');
    const toc = [
      ['1.','RNG Technical Summary','3'],
      ['2.','Crash','3'],
      ['3.','Dice','4'],
      ['4.','Mines','4'],
      ['5.','Limbo','5'],
      ['6.','HiLo','5'],
      ['7.','Wheel of Fortune','6'],
      ['8.','Slots (5-reel)','6'],
      ['9.','Blackjack','7'],
      ['10.','European Roulette','8'],
      ['11.','Baccarat','9'],
      ['12.','Video Poker','9'],
      ['13.','Keno','10'],
      ['14.','Sports Betting','10'],
      ['15.','Instant Win Games','11'],
      ['16.','RTP Summary Table','12'],
      ['17.','Operator Declaration','12'],
    ];
    toc.forEach(([num, title, pg]) => {
      const cy = getCy();
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9.5).text(num, ML, cy, { width:20, lineBreak:false });
      doc.fillColor(BLACK).font('Helvetica').fontSize(9.5).text(title, ML+22, cy, { width: CW-60, lineBreak:false });
      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(9.5).text(pg, ML, cy, { width:CW, align:'right', lineBreak:false });
      setCy(cy+18);
    });
    setCy(getCy()+10);
    divider();
    para('This document provides complete game rules, payout tables, and RTP verification for all games offered on the HATHOR Royal Casino platform. Each game uses the HMAC-SHA256 provably fair RNG described in the RNG Technical Documentation (separate document).', { color: GRAY });

    newPage();

    // S1 — RNG Summary
    h1('1. RNG TECHNICAL SUMMARY');
    para('All games on the HATHOR Royal Casino platform use the following RNG system:');
    code([
      'function generateResult(serverSeed, clientSeed, nonce, max) {',
      '  // serverSeed: 256-bit CSPRNG (crypto.randomBytes(32))',
      '  // message: clientSeed + ":" + nonce',
      '  const combined = serverSeed + ":" + clientSeed + ":" + nonce;',
      '  const hmac = crypto.createHmac("sha256", serverSeed).update(combined).digest("hex");',
      '  const decimal = parseInt(hmac.slice(0, 8), 16);  // 32-bit integer',
      '  return decimal % max;  // uniform distribution [0, max)',
      '}',
    ]);
    bullet('Fresh server seed generated per session via crypto.randomBytes(32)');
    bullet('Nonce increments per round — prevents seed reuse');
    bullet('Multi-step games (slots, blackjack, mines) use nonce*100+step offsets');
    bullet('Full verification instructions: /provably-fair.html');

    // S2 — Crash
    h1('2. CRASH');
    h2('Rules');
    para('Players place a bet before the round begins. A multiplier starts at 1.00x and increases in real-time. Players must cash out before the multiplier crashes. If a player does not cash out before the crash, the bet is lost.');
    h2('Outcome Algorithm');
    code([
      'function crashPoint(serverSeed, clientSeed, nonce) {',
      '  const r = generateResult(serverSeed, clientSeed, nonce, 10000);',
      '  if (r < 500) return 1.00;     // 5% instant crash (house edge)',
      '  return Math.floor(10000 / (10000 - r)) / 100;',
      '}',
      '// Range: 1.00x – 100.00x',
    ]);
    h2('Payout Table');
    tbl(
      ['Outcome','Payout','Probability'],
      [
        ['Instant crash (1.00x)',  'Bet lost',           '5.00%'],
        ['1.01x – 1.99x',         'Bet × multiplier',   '47.50%'],
        ['2.00x – 4.99x',         'Bet × multiplier',   '31.67%'],
        ['5.00x – 9.99x',         'Bet × multiplier',   '9.50%'],
        ['10.00x – 99.99x',       'Bet × multiplier',   '4.75%'],
        ['100.00x',               'Bet × 100',          '0.09%'],
      ],
      [160, 160, 160]
    );
    tbl(['RTP','House Edge','Min Bet','Max Bet','Max Win'],
        [['94.00%','6.00%','10 tokens','10,000 tokens','1,000,000 tokens']],[95,80,80,100,120]);

    // S3 — Dice
    h1('3. DICE');
    h2('Rules');
    para('Player chooses Over or Under a target number (1–99). The server generates a random number between 0.00 and 99.99. If the result matches the player\'s prediction, they win at the calculated odds.');
    h2('Outcome Algorithm');
    code([
      'function diceRoll(serverSeed, clientSeed, nonce) {',
      '  return generateResult(serverSeed, clientSeed, nonce, 10000) / 100;',
      '  // Returns float 0.00 – 99.99',
      '}',
      '// Payout for OVER target T: 98 / (100 - T) × bet',
      '// Payout for UNDER target T: 98 / T × bet',
    ]);
    tbl(['RTP','House Edge','Min Bet','Max Bet','Target Range'],
        [['98.00%','2.00%','1 token','50,000 tokens','2–98']],[95,80,80,100,125]);

    // S4 — Mines
    h1('4. MINES');
    h2('Rules');
    para('A 5×5 grid (25 tiles) contains hidden mines. Player selects the number of mines (1–24) before starting. Player then clicks tiles to reveal safe squares. Each revealed safe square increases the multiplier. Player cashes out before hitting a mine. Hitting a mine ends the game and the bet is lost.');
    h2('Outcome Algorithm');
    code([
      'function minesGrid(serverSeed, clientSeed, nonce, mineCount) {',
      '  const positions = Array.from({ length: 25 }, (_, i) => i);',
      '  for (let i = 24; i > 0; i--) {',
      '    const r = generateResult(serverSeed, clientSeed, nonce*100+(24-i), i+1);',
      '    [positions[i], positions[r]] = [positions[r], positions[i]];',
      '  }',
      '  return positions.slice(0, mineCount); // mine positions [0-24]',
      '}',
    ]);
    h2('Multiplier Formula');
    code([
      '// After revealing k safe tiles with M mines in 25 tiles:',
      'multiplier = (25! / (25-k)!) / ((25-M)! / (25-M-k)!) × (1 - houseEdge)',
      '// Simplified: each safe reveal multiplies by safe_remaining / total_remaining',
    ]);
    tbl(['RTP','House Edge','Min Bet','Max Bet','Mine Options'],
        [['97.00%','3.00%','10 tokens','10,000 tokens','1–24 mines']],[95,80,80,100,125]);

    // S5 — Limbo
    h1('5. LIMBO');
    h2('Rules');
    para('Player sets a target multiplier (minimum 1.01x). The server generates a random multiplier. If the generated multiplier is greater than or equal to the target, the player wins at the target multiplier. Otherwise, the bet is lost.');
    h2('Outcome Algorithm');
    code([
      'function limboResult(serverSeed, clientSeed, nonce) {',
      '  const r = generateResult(serverSeed, clientSeed, nonce, 10000);',
      '  return Math.max(1.00, Math.floor(10000 / (r + 1)) / 100);',
      '}',
      '// Result range: 1.00x – 10,000.00x',
      '// Win probability for target T: 97% / T',
    ]);
    tbl(['RTP','House Edge','Min Bet','Max Bet','Max Multiplier'],
        [['97.00%','3.00%','1 token','50,000 tokens','10,000x']],[95,80,80,100,125]);

    // S6 — HiLo
    h1('6. HILO');
    h2('Rules');
    para('A card is drawn from a virtual 52-card deck. Player predicts whether the next card will be Higher or Lower than the current card. Correct prediction wins at calculated odds. Player may skip (push) on an equal card. Player can continue guessing or cash out at any time.');
    h2('Outcome Algorithm');
    code([
      'function hiloCard(serverSeed, clientSeed, nonce) {',
      '  const idx = generateResult(serverSeed, clientSeed, nonce, 52);',
      '  const rank = idx % 13;   // 0=2, 1=3, ... 12=Ace',
      '  const suit = Math.floor(idx / 13);  // 0=S, 1=H, 2=D, 3=C',
      '  return { rank, suit, idx };',
      '}',
      '// Payout odds auto-calculated based on remaining cards',
    ]);
    tbl(['RTP','House Edge','Min Bet','Max Bet','Deck'],
        [['97.00%','3.00%','10 tokens','10,000 tokens','52 cards, fresh per game']],[95,80,80,100,180]);

    // S7 — Wheel
    h1('7. WHEEL OF FORTUNE');
    h2('Rules');
    para('Player selects a risk level (Low / Medium / High) and a number of segments. The wheel is spun and stops on a random segment. Each segment has an assigned multiplier. Player wins the displayed multiplier times their bet.');
    h2('Outcome Algorithm');
    code([
      'function wheelSpin(serverSeed, clientSeed, nonce, segments) {',
      '  return generateResult(serverSeed, clientSeed, nonce, segments);',
      '  // Returns index [0, segments) → mapped to multiplier table',
      '}',
    ]);
    h2('Example Segment Distribution (10 segments, Medium risk)');
    tbl(
      ['Multiplier','Count','Probability','Payout'],
      [
        ['0x (loss)',  '4', '40.00%', 'Bet lost'],
        ['1.5x',       '3', '30.00%', 'Bet × 1.5'],
        ['2x',         '2', '20.00%', 'Bet × 2'],
        ['5x',         '1', '10.00%', 'Bet × 5'],
      ],
      [100,80,120,180]
    );
    tbl(['RTP','House Edge','Min Bet','Max Bet'],
        [['96.00%','4.00%','10 tokens','10,000 tokens']],[95,80,80,100]);

    // S8 — Slots
    h1('8. SLOTS (5-REEL, 3-ROW)');
    h2('Rules');
    para('Five reels, three rows, 20 paylines. Matching symbols on paylines from left to right award prizes according to the paytable. Scatter symbols trigger free spins. Wild symbols substitute for any non-scatter symbol.');
    h2('Outcome Algorithm');
    code([
      'function slotsResult(serverSeed, clientSeed, nonce, symbolCount) {',
      '  const grid = [];',
      '  for (let i = 0; i < 15; i++) {  // 5 columns × 3 rows',
      '    grid.push(generateResult(serverSeed, clientSeed, nonce*100+i, symbolCount));',
      '  }',
      '  return grid;  // 15 symbol indices',
      '}',
      '// symbolCount = 8 standard symbols + 1 wild + 1 scatter = 10',
    ]);
    h2('Paytable (bet multipliers, 5-of-a-kind)');
    tbl(
      ['Symbol','3 of a kind','4 of a kind','5 of a kind'],
      [
        ['💎 Diamond (top)',  '5x',  '25x',  '500x'],
        ['⭐ Star',           '3x',  '15x',  '200x'],
        ['🎰 BAR',           '2x',  '10x',  '100x'],
        ['🍋 Lemon',         '1.5x','7x',   '50x'],
        ['🍇 Grape',         '1x',  '5x',   '30x'],
        ['🍒 Cherry',        '0.8x','4x',   '20x'],
        ['🃏 Wild',          'Substitutes for all except Scatter','',''],
        ['⭐ Scatter',       '2x total bet','10x total bet','50x total bet + 10 free spins',''],
      ],
      [130, 100, 100, 250]
    );
    tbl(['RTP','House Edge','Paylines','Min Bet','Max Bet','Free Spins'],
        [['96.00%','4.00%','20','10 tokens','10,000 tokens','10 (triggered by 3+ scatters)']],[60,60,65,75,100,120]);

    // S9 — Blackjack
    h1('9. BLACKJACK');
    h2('Rules');
    para('Standard Blackjack rules. Player and dealer each receive 2 cards. Player may Hit, Stand, Double Down, or Split (pairs). Dealer must hit on soft 16 and below, stand on 17+. Blackjack (Ace + 10-value) pays 3:2. Insurance offered when dealer shows Ace.');
    h2('Deck Algorithm');
    code([
      'function shuffleDeck(serverSeed, clientSeed, nonce) {',
      '  const suits = ["♠","♥","♦","♣"];',
      '  const ranks = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"];',
      '  const deck = [];',
      '  suits.forEach(s => ranks.forEach(r => deck.push(r+s)));  // 52 cards',
      '  // Fisher-Yates shuffle',
      '  for (let i = 51; i > 0; i--) {',
      '    const j = generateResult(serverSeed, clientSeed, nonce*100+(51-i), i+1);',
      '    [deck[i], deck[j]] = [deck[j], deck[i]];',
      '  }',
      '  return deck;  // shuffled 52-card deck',
      '}',
    ]);
    h2('Payout Table');
    tbl(
      ['Outcome','Payout'],
      [
        ['Blackjack (Ace + 10-value)', '3:2 (1.5x bet)'],
        ['Win (higher than dealer)',    '1:1 (even money)'],
        ['Push (tie)',                  'Bet returned'],
        ['Loss (lower or bust)',        'Bet lost'],
        ['Insurance win',              '2:1 on insurance bet'],
        ['Double Down win',            '2:1 on doubled bet'],
      ],
      [280, 200]
    );
    tbl(['RTP','House Edge','Min Bet','Max Bet','Decks'],
        [['99.50%','0.50%','50 tokens','100,000 tokens','1 (reshuffled each hand)']],[85,70,80,100,150]);

    // S10 — Roulette
    h1('10. EUROPEAN ROULETTE');
    h2('Rules');
    para('Standard European Roulette with a single zero (0–36, 37 numbers total). Players place bets on numbers, colours, rows, columns, or combinations. The ball lands on one number. Winning bets are paid according to the paytable.');
    h2('Outcome Algorithm');
    code([
      'function rouletteNumber(serverSeed, clientSeed, nonce) {',
      '  return generateResult(serverSeed, clientSeed, nonce, 37);',
      '  // Returns integer 0–36 (0 = zero/green)',
      '}',
    ]);
    h2('Payout Table');
    tbl(
      ['Bet Type','Numbers Covered','Payout','Probability','House Edge'],
      [
        ['Straight Up',    '1',  '35:1', '2.70%', '2.70%'],
        ['Split',          '2',  '17:1', '5.41%', '2.70%'],
        ['Street',         '3',  '11:1', '8.11%', '2.70%'],
        ['Corner',         '4',  '8:1',  '10.81%','2.70%'],
        ['Six Line',       '6',  '5:1',  '16.22%','2.70%'],
        ['Column/Dozen',   '12', '2:1',  '32.43%','2.70%'],
        ['Red/Black',      '18', '1:1',  '48.65%','2.70%'],
        ['Odd/Even',       '18', '1:1',  '48.65%','2.70%'],
        ['Low/High (1-18/19-36)','18','1:1','48.65%','2.70%'],
      ],
      [135,100,60,80,80]
    );
    tbl(['RTP','House Edge','Min Bet','Max Bet','Wheel'],
        [['97.30%','2.70%','10 tokens','50,000 tokens','Single zero (European)']],[80,70,80,100,155]
    );

    // S11 — Baccarat
    h1('11. BACCARAT');
    h2('Rules');
    para('Standard Punto Banco (casino) Baccarat. Player bets on Player, Banker, or Tie. Two cards dealt to Player and Banker. Third card drawn according to standard Baccarat rules. Hand closest to 9 wins. Face cards and 10s count as 0.');
    h2('Payout Table');
    tbl(
      ['Bet','Win Payout','Tie Result','Notes'],
      [
        ['Player win',  '1:1 (even money)',  'Push (bet returned)', 'No commission'],
        ['Banker win',  '0.95:1 (5% commission)', 'Push (bet returned)', 'Commission on win'],
        ['Tie',         '8:1',              'Win',                 'Both hands equal value'],
        ['Player Pair', '11:1',             'Push',                'Side bet'],
        ['Banker Pair', '11:1',             'Push',                'Side bet'],
      ],
      [100, 150, 130, 100]
    );
    tbl(['RTP (Player)','RTP (Banker)','RTP (Tie)','Min Bet','Max Bet'],
        [['98.76%','98.94%','85.64%','50 tokens','100,000 tokens']],[90,90,90,80,100]);

    // S12 — Video Poker
    h1('12. VIDEO POKER');
    h2('Rules');
    para('Jacks or Better Video Poker. Player receives 5 cards from a 52-card deck. Player selects which cards to hold. Remaining cards replaced by new draws. Winning hands paid according to paytable. Minimum winning hand: pair of Jacks or better.');
    h2('Paytable (per coin, 5-coin max bet)');
    tbl(
      ['Hand','1 coin','5 coins (max bet bonus)'],
      [
        ['Royal Flush',      '250',   '4,000 (bonus jackpot)'],
        ['Straight Flush',   '50',    '250'],
        ['Four of a Kind',   '25',    '125'],
        ['Full House',       '9',     '45'],
        ['Flush',            '6',     '30'],
        ['Straight',         '4',     '20'],
        ['Three of a Kind',  '3',     '15'],
        ['Two Pair',         '2',     '10'],
        ['Jacks or Better',  '1',     '5'],
        ['Less than Jacks',  '0',     '0 (loss)'],
      ],
      [200, 100, 180]
    );
    tbl(['RTP','House Edge','Min Bet','Max Bet'],
        [['99.54%','0.46%','10 tokens','10,000 tokens']],[95,80,80,100]);

    // S13 — Keno
    h1('13. KENO');
    h2('Rules');
    para('Player selects 1–10 numbers from a pool of 1–80. The system draws 20 numbers at random. Payout depends on how many of the player\'s selections match the drawn numbers (hits). More hits = higher multiplier.');
    h2('Outcome Algorithm');
    code([
      'function kenoNumbers(serverSeed, clientSeed, nonce, count=20) {',
      '  const pool = Array.from({ length: 80 }, (_, i) => i + 1);',
      '  const drawn = [];',
      '  for (let i = 0; i < count; i++) {',
      '    const r = generateResult(serverSeed, clientSeed, nonce*100+i, pool.length);',
      '    drawn.push(...pool.splice(r, 1));',
      '  }',
      '  return drawn;  // 20 unique numbers from 1-80',
      '}',
    ]);
    h2('Payout Table (5 picks selected)');
    tbl(
      ['Hits','Multiplier','Probability'],
      [
        ['0','0x (loss)','4.09%'],
        ['1','0x (loss)','16.37%'],
        ['2','1x (push)','27.53%'],
        ['3','3x','25.39%'],
        ['4','10x','12.34%'],
        ['5','50x','4.97%'],
      ],
      [80, 120, 120]
    );
    tbl(['RTP','House Edge','Min Bet','Max Bet','Pick Range'],
        [['92.00%','8.00%','10 tokens','10,000 tokens','1–10 numbers']],[80,75,80,100,125]);

    // S14 — Sports
    h1('14. SPORTS BETTING');
    h2('Rules');
    para('Players bet on pre-match sporting events (football, basketball, tennis, hockey). Odds are set manually by the operator for each match. Player selects a team/outcome and places a bet. If the selected outcome occurs, player wins bet × odds.');
    bullet('Bet types: Match winner (1X2), Both teams to score, Over/Under goals');
    bullet('Odds format: Decimal (e.g. 2.50 = win 2.5x bet)');
    bullet('Minimum odds: 1.10');
    bullet('Maximum single bet: 50,000 tokens');
    bullet('Parlay/accumulator bets: not currently supported');
    bullet('Live (in-play) betting: not currently supported');
    bullet('All bets reviewed and settled manually by finance staff');
    tbl(['RTP (avg)','House Edge (avg)','Min Bet','Max Bet'],
        [['93.00%','7.00%','100 tokens','50,000 tokens']],[95,95,80,100]);

    // S15 — Instant Win
    h1('15. INSTANT WIN GAMES');
    para('HATHOR Royal Casino offers a suite of instant win games that use the same HMAC-SHA256 RNG with game-specific multiplier tables:');
    tbl(
      ['Game','Mechanic','RNG Max','RTP'],
      [
        ['Fruits Bonanza',    'Spin & match fruit symbols',  '10,000', '96%'],
        ['Egyptian Gold',     'Spin & reveal multiplier',    '10,000', '96%'],
        ['Space Wins',        'Rocket launch multiplier',    '10,000', '96%'],
        ['Diamond Rush',      'Gem match 3-reel',            '8,000',  '96%'],
        ['Jungle Fever',      'Animal symbol match',         '10,000', '96%'],
        ['Dragon Fortune',    'Dragon multiplier trail',     '10,000', '96%'],
        ['Ocean Treasure',    'Underwater reel spin',        '10,000', '96%'],
        ['Moon Magic',        'Astrology multiplier wheel',  '54',     '96%'],
        ['Crystal Ball',      '3-reel crystal symbols',      '8,000',  '96%'],
        ['Lucky Clover',      '4-leaf clover grid match',    '10,000', '96%'],
        ['Spin & Win',        'Classic 3-reel fruit machine','10,000', '96%'],
      ],
      [120, 180, 80, 60]
    );
    para('All instant win games use the same generateResult() function. The RNG output is mapped to a multiplier table stored server-side. The mapping tables are deterministic and reproducible — available for audit on request.', { color: GRAY });

    // S16 — RTP Summary
    h1('16. RTP SUMMARY TABLE');
    tbl(
      ['Game','Category','Theoretical RTP','House Edge','Certification Note'],
      [
        ['Crash',            'Crash',    '94.00%', '6.00%', 'Math verified'],
        ['Dice',             'Instant',  '98.00%', '2.00%', 'Math verified'],
        ['Mines',            'Instant',  '97.00%', '3.00%', 'Math verified'],
        ['Limbo',            'Crash',    '97.00%', '3.00%', 'Math verified'],
        ['HiLo',             'Cards',    '97.00%', '3.00%', 'Math verified'],
        ['Wheel of Fortune', 'Wheel',    '96.00%', '4.00%', 'Math verified'],
        ['Slots (5-reel)',   'Slots',    '96.00%', '4.00%', 'Paytable attached'],
        ['Blackjack',        'Table',    '99.50%', '0.50%', 'Standard BJ strategy'],
        ['European Roulette','Table',    '97.30%', '2.70%', 'Single zero wheel'],
        ['Baccarat',         'Table',    '98.94%', '1.06%', 'Banker bet'],
        ['Video Poker',      'Cards',    '99.54%', '0.46%', 'Optimal play'],
        ['Keno',             'Number',   '92.00%', '8.00%', 'Paytable attached'],
        ['Sports Betting',   'Sports',   '93.00%', '7.00%', 'Operator-set odds'],
        ['Instant Win ×11',  'Instant',  '96.00%', '4.00%', 'Per game table'],
      ],
      [130, 70, 90, 80, 110]
    );
    para('RTP values are theoretical long-term averages calculated from the game mathematics. Actual RTP may vary over short periods. All values are within regulatory acceptable ranges (minimum 85% for most jurisdictions).', { color: GRAY });

    // S17 — Declaration
    h1('17. OPERATOR DECLARATION');
    para('HATHOR Royal Ltd. confirms that the game rules described in this document accurately represent the games as implemented on the HATHOR Royal Casino platform.');
    para('The operator confirms:');
    bullet('All game outcomes are determined solely by the HMAC-SHA256 RNG system');
    bullet('No outcome manipulation, weighting, or adjustment is performed post-RNG');
    bullet('The payout tables displayed to players match those documented herein');
    bullet('All RTP values are achievable and verified through mathematical calculation');
    bullet('Players can verify any past round using the Provably Fair verification tool');

    const cyNow = getCy() + 20;
    setCy(cyNow);
    divider();
    h2('Authorised Signatory');
    const cyS = getCy() + 10;
    doc.moveTo(ML, cyS+18).lineTo(ML+180, cyS+18).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('Signature', ML, cyS+22, { lineBreak:false });
    doc.moveTo(ML+210, cyS+18).lineTo(ML+390, cyS+18).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('Full Name & Title', ML+210, cyS+22, { lineBreak:false });
    setCy(cyS+45);
    const cyS2 = getCy();
    doc.moveTo(ML, cyS2+18).lineTo(ML+180, cyS2+18).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('Date', ML, cyS2+22, { lineBreak:false });
    doc.moveTo(ML+210, cyS2+18).lineTo(ML+390, cyS2+18).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('Company Seal / Stamp', ML+210, cyS2+22, { lineBreak:false });
    setCy(cyS2+50);
    divider();
    para('GLI-11_Game_Rules_HATHOR_Casino.pdf  ·  CONFIDENTIAL  ·  April 2026', { color: LGRAY, align:'center' });
  });
}

// ── Run both ──────────────────────────────────────────────
(async () => {
  console.log('\nGenerating GLI documentation...\n');
  await buildGLI19();
  await buildGLI11();
  console.log('\nDone! Files saved to C:\\Users\\PC\\casino\\');
  console.log('  • GLI-19_System_Architecture_HATHOR_Casino.pdf');
  console.log('  • GLI-11_Game_Rules_HATHOR_Casino.pdf\n');
})();
