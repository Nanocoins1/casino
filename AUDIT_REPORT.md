# HATHOR Casino — Audit Findings Report

Kiekvienas radinys su lygiu ir sprendimu.

Lygio sistema:
- 🔴 **CRITICAL** — pataisyti PRIEŠ launch
- 🟠 **HIGH** — pataisyti per 1-2 dienas
- 🟡 **MEDIUM** — pataisyti per savaitę
- 🟢 **LOW** — gera praktika
- ℹ️ **INFO** — pastebėjimas

---

## RADINIAI

### Faz2 — SAUGUMAS

---

**🔴 CRITICAL-01: Numatytasis administravimo slaptažodis**
- Failas: `server.js:170`
- Problema: `ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'hathor2026'`
- Detalės: žr. `AUDIT_CRITICAL.md`
- Būsena: ❌ Reikalingas JŪSŲ veiksmas (Railway env var)

---

**🔴 CRITICAL-02: SHA256 admin slaptažodžio hash**
- Failas: `server.js:192-194`
- Problema: SHA256 su fiksuotu "salt" — rainbow tables ir brute-force rizika
- Detalės: žr. `AUDIT_CRITICAL.md`
- Būsena: ❌ Reikalingas kodo pakeitimas (auth ↔ reikia leidimo)

---

**🟠 HIGH-01: Timing attack slaptažodžio palyginime**
- Failas: `server.js:199, 2341, 2658`
- Problema: `===` operatorius ne constant-time
- Sprendimas: `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))`
- Būsena: ❌ Reikia auth pakeitimo ↔ jūsų leidimo

---

### Fazė 3 — FINANSINIS TIKSLUMAS

---

**🔴 CRITICAL-03: Race condition `/api/game/bet` — double-spend rizika (PATAISYTA)**
- Failas: `server.js:1109-1128`
- Problema: klasikinis read-modify-write — 2 lygiagrečios užklausos galėjo
  atskaityti daugiau tokenų nei balansas turi.
- **PATAISYTA:** Naudojama atominė SQL užklausa:
  ```sql
  UPDATE users SET tokens=tokens-$1 WHERE uid=$2 AND tokens>=$1 RETURNING tokens
  ```
  Jei nepakankamas balansas → 0 rows → pranešimas user'iui.
- Pridėtas max bet limitas (10M tokens) apsaugoti nuo overflow.

---

**🔴 CRITICAL-04: `/api/game/settle` neigi win'ai be betId + manipuliacijos rizika (PATAISYTA)**
- Failas: `server.js:1137-1162`
- Problemos:
  1. Read-modify-write race condition
  2. Be betId validavimo galima gauti free win (kviečiant settle be bet)
  3. Nebuvo win-vs-bet proporcijos patikros (galima pretenduoti milžinišką win nuo 1 token bet)
- **PATAISYTA:**
  1. Atominis `UPDATE ... RETURNING tokens`
  2. REIKALAUJAMA betId kai winAmt > 0 (neleidžiamas free win)
  3. Max win = 10,000× bet amount (fraud detection threshold)
  4. Max win sanity = 100M tokens
  5. Win sum'os <0 negali būti (Math.max(0, ...))

---

**🟡 MEDIUM-03: `claimBonus()` daily bonus race condition**
- Failas: `server.js:632-667`
- Problema: read-modify-write pattern be atominės query — leidžia
  2 lygiagrečios užklausos pretenduoti daily bonus 2 kartus.
- Rizikos lygis: ~€30 max per atakos bandymą (low).
- Rekomendacija: pakeisti į atominę:
  ```sql
  UPDATE users SET tokens=tokens+$1, last_bonus=$2, xp=xp+50
  WHERE uid=$3 AND last_bonus IS DISTINCT FROM $2 RETURNING tokens
  ```
- Būsena: dokumentuota, pataisymas post-launch.

---

**🟡 MEDIUM-04: Operacijos nėra wrapinamos DB transakcijose**
- Failai: `server.js` įvairios vietos (deposit, withdraw)
- Problema: jei serveris crashintų tarp 2 SQL query (pvz. tarp UPDATE
  transactions ir UPDATE users), DB galėtų likti nekonsistencijoje.
- Pavyzdys: deposit confirmed → transakcija pažymėta 'finished' ✅ →
  serveris crash ❌ → tokens NIEKADA nekrediti.
- Sprendimas: pakeisti multi-query operacijas į `pool.connect()` +
  `BEGIN; ...; COMMIT;`
- Rizikos lygis: MEDIUM — Railway aukštas uptime, crash retas.
- Prioritetas: post-launch.

---

**✅ Finansinis tikslumas — GERA praktika:**

- `tokens` stulpelis: **INTEGER** (ne FLOAT) ✅ — jokių 0.1+0.2=0.30000...4 bug'ų
- 1 token = €0.01 fikso racional — sąžiningas konvertavimas
- Max withdraw limitai per lygius (Bronze 10k → VIP Elite 999k)
- Idempotency: `payment_id` yra UNIQUE NowPayments id'as
- Deposit min limitas: 500 tokens (€5) — saugu
- Bet/settle dabar ATOMINIAI ✅
- Jackpot: server-authoritative, neišnaudojama
- XP: apskaičiuojamas iš statymo (server-side), imunitas manipuliacijoms
- Cashback: skaičiuojamas iš game_log audit trail (negalima apgauti)

---

**🟠 HIGH-02: npm pakete pažeidžiamumai (PATAISYTA)**
- `nodemailer` <=8.0.4: SMTP command injection, DoS (4 CVEs)
- `uuid` <14: buffer bounds check
- **Sprendimas:** upgrade į `nodemailer@latest` + `uuid@latest`
- **Būsena:** ✅ ATLIKTA (`npm install nodemailer@latest uuid@latest`)
- Verifikacija: `npm audit` dabar rodo 0 vulnerabilities

---

**✅ Saugumas GERAI:**

- **SQL injection:** visur parametrizuoti queries ($1, $2, ...) ✅
- **XSS:** React saugo, `dangerouslySetInnerHTML` naudojamas tik su hardcoded SVG ✅
- **Password hashing (users):** scrypt su salt'u ✅
- **Session tokens:** 32 bytes crypto.randomBytes() ✅
- **CSP:** griežtas allowlist su blob: support (phase 2 fixed) ✅
- **Security headers:** X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, CSP, Permissions-Policy ✅
- **Rate limiting:** įvairūs limitai (auth 10/15min, game 120/min, jackpot 10/min, kyc 5/h) ✅
- **CORS:** Socket.io allowlist, HTTP default same-origin ✅
- **Secrets:** .env gitignored, nėra secrets git'e ✅
- **2FA:** TOTP via speakeasy ✅
- **Helmet:** nereikalingas — headers rankiniu būdu pridėti teisingai ℹ️
- **CSRF:** nereikalingas — token-based auth header (ne cookie) ℹ️

