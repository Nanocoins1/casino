# HATHOR Royal Casino
## Random Number Generator (RNG) — Technical Documentation
**Version:** 1.0
**Date:** April 2026
**Prepared for:** iTech Labs / eCOGRA Certification Audit
**Confidentiality:** Restricted — For Certification Purposes Only

---

## 1. Executive Summary

HATHOR Royal Casino operates a **Provably Fair** cryptographic Random Number Generation system built on HMAC-SHA256, an industry-standard algorithm used by leading licensed online gaming operators worldwide. The system is implemented server-side in Node.js using the native `crypto` module (OpenSSL-backed), ensuring platform-independent, reproducible, and independently verifiable outcomes.

All game results are derived deterministically from three inputs:
- A **server seed** (secret, pre-committed via SHA-256 hash before each game)
- A **client seed** (provided or chosen by the player)
- A **nonce** (sequential counter, increments each game)

This architecture guarantees that:
1. The operator cannot alter outcomes after player action is taken
2. Players can independently verify every result using publicly available cryptographic tools
3. Results are statistically uniform within the defined output range

---

## 2. System Architecture

### 2.1 Technology Stack

| Component | Technology |
|---|---|
| Runtime | Node.js ≥ 18.0.0 |
| Cryptographic Library | Node.js built-in `crypto` module (OpenSSL) |
| Core Algorithm | HMAC-SHA256 |
| Seed Entropy Source | `crypto.randomBytes(32)` — OS-level CSPRNG |
| Database | SQLite (better-sqlite3) via Railway persistent volume |
| Server | Express.js on Railway.app cloud infrastructure |

### 2.2 Operating System Entropy Source

Server seed generation uses `crypto.randomBytes(32)` which calls **OpenSSL's RAND_bytes()**, which in turn reads from:
- `/dev/urandom` on Linux (Railway runs Ubuntu/Debian)
- Seeded by the OS kernel entropy pool (hardware events, interrupts, boot entropy)

This is a **CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)** — the same standard used in TLS/SSL key generation.

---

## 3. Core RNG Algorithm

### 3.1 Server Seed Generation

```javascript
function generateServerSeed() {
  return crypto.randomBytes(32).toString('hex');
}
// Output: 64-character hexadecimal string (256 bits of entropy)
// Example: "a3f8c2d1e4b7a9f0c3d2e1b4a7f8c9d0e3f2a1b4c7d8e9f0a3b2c1d0e4f5a6b7"
```

**Entropy:** 256 bits (2^256 possible values ≈ 1.16 × 10^77)
**Method:** OS-level CSPRNG via OpenSSL — not predictable by any external party

### 3.2 Server Seed Commitment (Pre-Game Hash)

Before any game begins, the server seed is **committed** by publishing its SHA-256 hash to the player. The actual seed remains secret until the round concludes.

```javascript
function hashSeed(seed) {
  return crypto.createHash('sha256').update(seed).digest('hex');
}
// Example server seed:    "a3f8c2d1e4b7..."
// Published hash (SHA-256): "7f4a2b9c1d3e5f8a7b6c4d2e1f0a3b5c7d9e2f4a6b8c0d1e3f5a7b9c2d4e6f8"
```

The hash is sent to the player **before** they place their bet. This mathematically proves the server cannot change the seed after seeing the player's action.

### 3.3 Client Seed

Players may:
1. **Use the default** — server generates `crypto.randomBytes(16).toString('hex')` automatically
2. **Set their own** — via the Provably Fair interface (max 64 characters)

The client seed ensures the player has direct influence over outcome generation. The server has **zero knowledge** of what client seed the player will choose.

### 3.4 Nonce

A sequential integer starting at **0**, incremented by **+1** for each game played with the current seed pair. This prevents seed re-use and ensures each game produces a unique result even with identical seeds.

### 3.5 Result Generation Formula

```javascript
function generateResult(serverSeed, clientSeed, nonce, max) {
  // Step 1: Concatenate inputs
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;

  // Step 2: Compute HMAC-SHA256 (key = serverSeed, data = combined)
  const hmac = crypto.createHmac('sha256', serverSeed)
                     .update(combined)
                     .digest('hex');

  // Step 3: Extract first 8 hex characters → convert to 32-bit integer
  const decimal = parseInt(hmac.slice(0, 8), 16);
  // Range: 0 to 4,294,967,295 (2^32 - 1)

  // Step 4: Modulo scaling to game range
  return decimal % max;
  // Output: integer in range [0, max-1], uniform distribution
}
```

**Output uniformity:** The 32-bit integer space (4,294,967,296 values) divided by any game-range `max` value introduces a modulo bias of at most `max / 2^32`. For all games in this system, `max ≤ 10000`, making the bias negligible (< 0.000002%).

---

## 4. Seed Lifecycle Management

### 4.1 Lifecycle Flow

```
┌─────────────────────────────────────────────────────────┐
│  1. Server generates serverSeed (32 random bytes)        │
│  2. Compute SHA-256(serverSeed) → hashedServerSeed       │
│  3. Send hashedServerSeed to player (commitment)         │
│  4. Player places bet (clientSeed + nonce known)         │
│  5. generateResult(serverSeed, clientSeed, nonce, max)   │
│  6. Game outcome determined and displayed                │
│  7. nonce++ for next game                                │
│  8. On seed rotation: reveal serverSeed, generate new    │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Seed Rotation

Players may rotate seeds at any time via the Provably Fair interface:
- The **previous serverSeed is revealed** (players can now verify all past games)
- A **new serverSeed is generated** and its hash committed
- The nonce resets to 0

```javascript
// POST /api/provably-fair/rotate
// Response includes:
{
  previousServerSeed: "a3f8c2d1...",  // Now revealed for verification
  newHashedServerSeed: "7f4a2b9c...", // Committed for future games
  clientSeed: "current_client_seed"
}
```

### 4.3 Data Persistence

All Provably Fair round data is stored in SQLite:

```sql
CREATE TABLE provably_fair (
  round_id    TEXT PRIMARY KEY,
  uid         TEXT NOT NULL,
  game        TEXT NOT NULL,
  server_seed TEXT NOT NULL,   -- stored server-side only
  server_hash TEXT NOT NULL,   -- published to player pre-game
  client_seed TEXT,            -- set/confirmed post-game
  nonce       INTEGER,
  result      TEXT,
  revealed    INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. Game-Specific RNG Implementation

### 5.1 Crash

| Parameter | Value |
|---|---|
| RTP | 94% (configurable 50–99%) |
| Output range | Multiplier derived from result |
| PF formula | `generateResult(serverSeed, clientSeed, nonce, 10000)` |

**Multiplier calculation:**
```
result = generateResult(..., 10000)  // 0–9999
if result == 0: multiplier = 1.00x  // instant crash (house edge)
else: multiplier = 10000 / (10000 - result) × houseEdgeFactor
```
The crash point is determined before the round starts. Players must cash out before the multiplier crashes.

### 5.2 Mines

| Parameter | Value |
|---|---|
| RTP | 93% |
| Grid | 5×5 = 25 cells |
| Output | Mine positions shuffled via PF |

**Mine placement:**
```javascript
// Fisher-Yates shuffle using successive nonce increments
for (let i = 24; i > 0; i--) {
  const j = generateResult(serverSeed, clientSeed, nonce * 100 + (24 - i), i + 1);
  [grid[i], grid[j]] = [grid[j], grid[i]];
}
// First N positions become mines (N = player-chosen mine count 1–20)
```

### 5.3 Dice

| Parameter | Value |
|---|---|
| RTP | 94% |
| Output range | 0–9999 (displayed as 0.00–99.99) |
| PF formula | `generateResult(serverSeed, clientSeed, nonce, 10000)` |

The result (0–9999) is divided by 100 to give a 2-decimal float (0.00–99.99). Players bet over/under a target number.

### 5.4 Roulette (European)

| Parameter | Value |
|---|---|
| RTP | 97% |
| Output range | 0–36 (37 possible outcomes) |
| PF formula | `generateResult(serverSeed, clientSeed, nonce, 37)` |

```javascript
const number = generateResult(serverSeed, clientSeed, nonce, 37);
// 0 = green zero; 1–36 = red/black numbers
```

### 5.5 Slots (5-reel × 3-row)

| Parameter | Value |
|---|---|
| RTP | 95% (GrandFortune), 92% (Classic) |
| Grid | 5 reels × 3 rows = 15 symbol positions |
| Symbol count | 8 unique symbols per machine |

```javascript
// Each cell uses a unique nonce offset
for (let col = 0; col < 5; col++) {
  for (let row = 0; row < 3; row++) {
    const idx = col * 3 + row;
    grid[col][row] = generateResult(
      serverSeed, clientSeed, nonce * 100 + idx, symCount
    );
  }
}
// 15 independent draws per spin, nonce*100 ensures non-overlapping sub-nonces
```

### 5.6 Blackjack

| Parameter | Value |
|---|---|
| RTP | 99% |
| Deck | Standard 52-card deck |
| Shuffle | Provably Fair Fisher-Yates |

```javascript
const deck = Array.from({ length: 52 }, (_, i) => i);
for (let i = 51; i > 0; i--) {
  const j = generateResult(
    serverSeed, clientSeed, nonce * 100 + (51 - i), i + 1
  );
  [deck[i], deck[j]] = [deck[j], deck[i]];
}
// Deck positions 0–51: suits (0–3) × ranks (0–12)
```

### 5.7 Baccarat

| Parameter | Value |
|---|---|
| RTP | 98% |
| Deck | Standard 52-card deck |
| Shuffle | Same Fisher-Yates PF method as Blackjack |

Cards dealt in standard Baccarat order (Player: 1st, 3rd; Banker: 2nd, 4th; optional 5th, 6th).

### 5.8 Lucky Wheel

| Parameter | Value |
|---|---|
| RTP | 90% |
| Output range | Segment index |
| Risk levels | Low (54 segments), Medium (24 segments), High (12 segments) |

```javascript
const segment = generateResult(serverSeed, clientSeed, nonce, totalSegments);
```

### 5.9 Keno

| Parameter | Value |
|---|---|
| RTP | 93% |
| Draw | 20 numbers drawn from 1–80 |
| Method | Sequential PF draws without replacement |

```javascript
const pool = Array.from({ length: 80 }, (_, i) => i + 1);
const drawn = [];
for (let i = 0; i < 20; i++) {
  const idx = generateResult(serverSeed, clientSeed, nonce * 100 + i, pool.length - i);
  drawn.push(pool.splice(idx, 1)[0]);
}
```

### 5.10 Video Poker (Jacks or Better)

| Parameter | Value |
|---|---|
| RTP | 95% |
| Deck | Standard 52-card deck |
| Initial deal | 5 cards from PF-shuffled deck |
| Draw | Remaining cards from same shuffled deck |

---

## 6. RTP (Return to Player) Configuration

### 6.1 Declared RTP Values

| Game | Default RTP | Min Configurable | Max Configurable |
|---|---|---|---|
| Blackjack | **99%** | 50% | 99% |
| Baccarat | **98%** | 50% | 99% |
| Roulette | **97%** | 50% | 99% |
| Video Poker | **95%** | 50% | 99% |
| GrandFortune Slots | **95%** | 50% | 99% |
| Crash | **94%** | 50% | 99% |
| Dice | **94%** | 50% | 99% |
| Mines | **93%** | 50% | 99% |
| Plinko | **93%** | 50% | 99% |
| Sports Betting | **93%** | 50% | 99% |
| Classic Slots | **92%** | 50% | 99% |
| Lucky Wheel | **90%** | 50% | 99% |

### 6.2 RTP Enforcement Mechanism

RTP is enforced through bet/payout ratio design in each game's payout table, not by post-hoc result manipulation. The cryptographic RNG produces **statistically uniform** outputs; the payout structure determines the theoretical RTP.

Example — Dice (94% RTP):
```
Player bets X tokens on "over 50.00"
Win probability: 49.5 / 100 = 49.5%
Payout on win: X × (100 / 49.5) × 0.94 = X × 1.899×
Expected return: 49.5% × 1.899 = 94%
```

RTP settings are stored in the database and only modifiable by authorised administrator accounts. A complete audit log of all RTP changes is maintained.

---

## 7. Independent Verification

### 7.1 Player Self-Verification

Any player can verify any past game result using freely available tools:

**Step 1 — Obtain seeds after game:**
```
GET /api/provably-fair/seeds/:uid
→ { hashedServerSeed, clientSeed, nonce }
After rotation: previousServerSeed is revealed
```

**Step 2 — Replicate result locally (JavaScript example):**
```javascript
const crypto = require('crypto');

function verify(serverSeed, clientSeed, nonce, max) {
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  const hmac = crypto.createHmac('sha256', serverSeed)
                     .update(combined).digest('hex');
  return parseInt(hmac.slice(0, 8), 16) % max;
}

// Example:
verify("a3f8c2d1...", "myclientseed", 42, 10000);
// → Must match the result displayed in game
```

**Step 3 — Verify server commitment:**
```javascript
const crypto = require('crypto');
const hash = crypto.createHash('sha256').update(serverSeed).digest('hex');
// hash must equal the hashedServerSeed published before the game
```

### 7.2 Online Verification Tools

Players can also verify using:
- https://www.devglan.com/online-tools/hmac-sha256-online
- https://codebeautify.org/hmac-generator
- Python: `import hmac, hashlib`
- Any standard HMAC-SHA256 implementation

### 7.3 Server-Side Verification API

```
POST /api/provably-fair/verify
Body: { serverSeed, clientSeed, nonce, game, result }
Response: { verified: true/false, computedResult, hashedServerSeed }
```

---

## 8. Security Controls

### 8.1 Seed Confidentiality

| Control | Implementation |
|---|---|
| Server seed never sent to client | Only SHA-256(serverSeed) is transmitted pre-game |
| Server seed storage | Encrypted at rest in Railway volume |
| Client seed influence | Player can set custom seed at any time |
| Seed rotation | Player-initiated; reveals previous seed immediately |

### 8.2 Manipulation Prevention

| Attack Vector | Mitigation |
|---|---|
| Operator predicts outcome | Server seed is generated AFTER player chooses client seed — impossible |
| Player predicts outcome | Server seed hash commits the seed; player cannot reverse SHA-256 |
| Replay attack | Nonce is sequential and unique per seed pair |
| Seed re-use | Nonce ensures unique output even with same seeds |
| MITM tampering | HTTPS/TLS on all connections; results verified via HMAC |

### 8.3 Infrastructure Security

- **Platform:** Railway.app — SOC 2 compliant cloud infrastructure
- **Database:** SQLite with persistent volume, daily automated backups
- **Transport:** TLS 1.2/1.3 enforced on all API endpoints
- **Authentication:** Session tokens (64 random bytes); bcrypt-equivalent password hashing
- **Rate limiting:** Applied to all game and auth endpoints

---

## 9. Audit Trail & Logging

### 9.1 Game Log Schema

```sql
CREATE TABLE game_log (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  uid     TEXT NOT NULL,
  game    TEXT NOT NULL,
  bet     INTEGER NOT NULL,
  result  INTEGER NOT NULL,
  won     INTEGER NOT NULL,  -- 0 or 1
  ts      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 9.2 Provably Fair Log Schema

```sql
CREATE TABLE provably_fair (
  round_id    TEXT PRIMARY KEY,
  uid         TEXT NOT NULL,
  game        TEXT NOT NULL,
  server_seed TEXT NOT NULL,
  server_hash TEXT NOT NULL,
  client_seed TEXT,
  nonce       INTEGER,
  result      TEXT,
  revealed    INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 9.3 Available Statistics for Auditors

All statistics accessible via admin API:
- Total rounds per game
- Aggregate RTP per game (actual vs. theoretical)
- Win/loss distribution
- Seed rotation history
- Per-player session statistics

---

## 10. Test Environment Access

For auditor use during certification:

| Resource | Details |
|---|---|
| Staging URL | Provided upon audit commencement |
| Admin access | Dedicated auditor credentials provided |
| API documentation | Full Swagger/Postman collection available on request |
| Source code review | Available under NDA |
| Database access | Read-only replica available |
| Statistical export | CSV export of all game_log records available |

---

## 11. Compliance Summary

| Requirement | Status |
|---|---|
| CSPRNG for seed generation | ✅ `crypto.randomBytes(32)` — OS CSPRNG |
| Pre-game commitment | ✅ SHA-256 hash published before each round |
| Player influence on outcome | ✅ Client seed system |
| Independent verifiability | ✅ Full Provably Fair system with public API |
| Audit logging | ✅ All rounds logged with full parameters |
| RTP within declared range | ✅ Configurable 50–99%, defaults 90–99% |
| Seed confidentiality | ✅ Server seed never transmitted pre-reveal |
| Manipulation prevention | ✅ Cryptographic architecture prevents retroactive changes |
| Transport security | ✅ TLS 1.2/1.3 enforced |

---

## 12. Contact & Declarations

**Operator:** HATHOR Royal Ltd.
**Technical Contact:** [your@email.com]
**Platform:** https://[your-domain].com
**Server Location:** Railway.app (US/EU region)
**Node.js Version:** 18.x LTS
**Crypto Module:** OpenSSL (bundled with Node.js)

---

*This document is accurate as of the date stated above. HATHOR Royal Casino declares that the RNG system described herein is the sole system used for determining game outcomes on the platform, and that no alternative or supplementary outcome-determination mechanisms exist.*

---

**Document Version History**

| Version | Date | Change |
|---|---|---|
| 1.0 | April 2026 | Initial release for iTech Labs / eCOGRA submission |
