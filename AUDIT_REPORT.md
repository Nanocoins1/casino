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

### Fazė 4 — RNG ir PROVABLY FAIR

---

**🔴 CRITICAL-05: Poker shuffle naudojo Math.random() (PATAISYTA)**
- Failas: `server.js:778`
- Problema: `Math.random()` nėra kriptografiškai saugus —
  gali būti prognozuojamas. Anjouan licencijai reikalingas crypto RNG
  visuose statomuose rezultatuose.
- **PATAISYTA:** pakeista į `crypto.randomInt(0, i+1)` (Fisher-Yates)
- Paveikia: visas poker (Texas Hold'em, Premium Poker, Casino Hold'em)

---

**🔴 CRITICAL-06: Jackpot roll naudojo Math.random() (PATAISYTA)**
- Failas: `server.js:1205`
- Problema: Jackpot win chance (3/10000) skaičiuojamas su `Math.random()`
- **PATAISYTA:** `crypto.randomInt(0, 10000)` (uniform, unpredictable)

---

**✅ Provably Fair implementacija — TEISINGA:**

- Server seed: `crypto.randomBytes(32)` (256 bitai entropijos) ✅
- Seed hash: SHA256 ✅ (rodomas žaidėjui prieš rundą)
- Combined formula: `${serverSeed}:${clientSeed}:${nonce}` ✅
- Result: HMAC-SHA256 ✅ (industry standard)
- Seeds per user laikomi memory + DB audit
- Client seed: žaidėjas gali pakeisti ✅
- Nonce: didinamas kiekvieną rundą ✅
- Rotate endpoint: `/api/provably-fair/rotate` ✅ (nauja server seed)
- Verify endpoint: `/api/provably-fair/verify` ✅

**🟡 MEDIUM-05: Modulo bias `generateResult`**
- Failas: `server.js:2210-2212`
- Problema: `parseInt(hmac.slice(0,8), 16) % max` įveda švelnų bias
  kai `max` nėra 2 laipsnis (pvz. 37 ruletei).
- Poveikis: **labai mažas** — rekomenduojama pataisyti jei Anjouan auditoriai paprašys strict uniform
- Sprendimas: rejection sampling (uint32 range, reject values ≥ floor(max_u32/N)*N)
- Prioritetas: LOW — dauguma provably fair casino naudoja tokį patį approach

---

**🟠 HIGH-03: Custom žaidimai (React) nenaudoja secure API**
- Failai: `public/index.html` (slots, roulette, blackjack)
- Problema: 71 `Math.random()` naudojimai frontend'e. Žaidimų rezultatai
  skaičiuojami **client-side** — žaidėjas su browser'io DevTools gali
  manipuliuoti.
- **Dabar BE REALIŲ PINIGŲ** šitas nežalinga (tik displayed tokens).
- **Jei pradėsim realų money žaidimą** su šiais custom games — kritinė saugumo spraga.
- **Sprendimas:**
  - **A (rekomenduojama):** Pereiti prie AXIS/Slotegrator žaidimų —
    providerių serveriai apskaičiuoja rezultatus, mūsų platforma tik rodo
  - **B:** Migrate custom games į `/api/game/bet` + `/api/game/settle`
    ~ 1-2 savaitės darbo
- Būsena: dokumentuota, sprendimas priklauso nuo verslo sprendimo apie AXIS

---

### Fazė 5 — ANJOUAN LICENCIJOS ATITIKIMAS

---

**✅ RESPONSIBLE GAMBLING — VISKAS YRA:**

| Funkcija | Būsena | Detalės |
|---|---|---|
| Self-exclusion | ✅ | `rg_limits.self_exclusion_until`, patikrinama per Socket.io |
| Cool-off period | ✅ | `rg_limits.cool_off_until` |
| Deposit limits (dienos) | ✅ | `daily_deposit_limit` |
| Loss limits (dienos) | ✅ | `daily_loss_limit` |
| Bet limits (dienos) | ✅ | `daily_bet_limit` |
| Session time limits | ✅ | `session_limit_minutes` |
| Kelti limitą 24h lag | ✅ | `isRaising()` logic |
| Help lines (BeGambleAware) | ✅ | `public/responsible.html` |
| LT lokalus helpline 116 123 | ✅ | Disclaimer'iuose |

---

**✅ KYC (Know Your Customer):**

| Funkcija | Būsena | Detalės |
|---|---|---|
| Dokumento upload (ID) | ✅ | `public/kyc.html` + `/api/kyc` |
| Proof of address | ✅ | |
| Selfie with document | ✅ | |
| Admin review workflow | ✅ | `/admin/kyc/approve`, `/admin/kyc/reject` |
| Status tracking | ✅ | pending / approved / rejected |
| Reject reason | ✅ | Email sent to user |
| Required before withdrawal | ⚠️ | **Patikrinti** jei blokuoja withdraw |

---

**✅ AML (Anti-Money Laundering):**

| Funkcija | Būsena |
|---|---|
| AML policy puslapis | ✅ `public/aml.html` |
| Transakcijų sekimas | ✅ `transactions` lentelė |
| Suspicious activity flag | ⚠️ Reikia implementuoti (big deposit → fast withdraw detection) |

---

**✅ AGE VERIFICATION:**
- 18+ gate per `localStorage.age_verified`
- Rodomas prieš main app
- Check'inamas app startup'e (`ageVerified` state)

---

**✅ COMPLIANCE PAGES:**

| Puslapis | Failas |
|---|---|
| Terms & Conditions | `public/terms.html` |
| Privacy Policy | `public/privacy.html` |
| AML Policy | `public/aml.html` |
| Responsible Gambling | `public/responsible.html` |
| Provably Fair | `public/provably-fair.html` |

---

**✅ GDPR / Cookies:**
- Cookie consent banner (`COOKIE_KEY='hrc_cookie_consent'`)
- Consent granulus: essential / analytics / marketing
- Tawk.to respect'uoja consent pasirinkimą

---

**🟠 HIGH-04: Nėra audit log'ų administracinių veiksmų**
- Problema: admin KYC approve/reject, balance adjustments,
  withdrawal approvals neturi dedicated audit lentelės
- Dalinis: `game_log` (plays), `transactions` (deposits), `provably_fair` (rounds)
- Trūksta: `admin_actions_log` su (admin_uid, action, target_uid, old/new values, ip, user_agent, ts)
- Reikalauja DB schema pakeitimo — 🟡 jūsų leidimo
- Anjouan tipiškai reikalauja audit trail visoms administracinėms operacijoms

**Siūlomas sprendimas:**
```sql
CREATE TABLE admin_actions_log (
  id SERIAL PRIMARY KEY,
  admin_uid TEXT NOT NULL,
  action TEXT NOT NULL, -- 'kyc_approve', 'kyc_reject', 'balance_adjust', etc.
  target_uid TEXT,
  old_value JSONB,
  new_value JSONB,
  ip TEXT,
  user_agent TEXT,
  ts TIMESTAMPTZ DEFAULT NOW()
);
```

---

**🟠 HIGH-05: Nėra prisijungimo audit trail**
- Problema: Nėra lentelės `login_attempts` su IP, UA, success/fail
- Anjouan tipiškai reikalauja tracking'o
- **Siūlomas sprendimas:** pridėti `login_attempts` lentelę + logginti

---

**🟡 MEDIUM-06: Anjouan licencijos NUMERIS nepridėtas**
- Matyti tik "ANJOUAN" tekstas footer'iuose (įskaitant 11 kalbų disclaimer)
- Trūksta tikro **licencijos numerio** su OpenGaming watermark / seal
- Sprendimas: pridėti nr į footer + env var `ANJOUAN_LICENSE_NUMBER`
- Prioritetas: kai gausite numerį (pagal PROGRESS.md dar laukiama)

---

**🟡 MEDIUM-07: AML suspicious pattern detection**
- Nėra logic'os kuri flagina: didelis deposit → greitas withdraw be žaidimo
- Anjouan prašo aktyvaus transaction monitoring
- Sprendimas: Cron job scan'inti `transactions` + `game_log`, pridėti
  flag stulpelį + admin alerts

---

### Fazė 6 — NAŠUMAS IR UX

---

**✅ NAŠUMAS — GERAI:**

| Metrika | Reikšmė | Būsena |
|---|---|---|
| `public/` dydis | 166 MB (~87% WebP) | ✅ Didieji assets suspausti |
| `public/index.html` | 928 KB | ⚠️ Didokas, bet be būtinybės |
| React build | Production 18.3.1 ✅ | ✅ (Phase 2) |
| Preconnect/dns-prefetch hints | 8 | ✅ |
| Service Worker | v4.9 | ✅ Stale-while-revalidate |
| CSP su blob: | ✅ | (Phase 2) |
| Mobile breakpoints | 15+ (320px–1024px) | ✅ |

---

**🟡 MEDIUM-08: 530KB inline Babel skriptas**
- Problema: visas React JSX kodas vienoje `<script type="text/babel">`
- Babel naršyklėje kompiliuoja kiekvieną kartą (production warning)
- Poveikis: ~500ms-2s pridedamas puslapio boot'ui
- **Sprendimas (ilgalaikis):** Vite arba webpack build pipeline
- **Trumpalaikis sprendimas:** ignoruoti — veikia bet lėtai
- Prioritetas: post-launch refactor

---

**🟡 MEDIUM-09: Lazy loading ne visur**
- Tik 4 iš 28 `<img>` turi `loading="lazy"`
- Poveikis: nematomi paveikslėliai vis tiek kraunasi iš karto
- Sprendimas: pridėti `loading="lazy" decoding="async"` visiems ne-hero paveikslėliams
- Prioritetas: LOW (performance win)

---

**🟠 HIGH-06: Nėra DB indexų**
- Serverio kode rodo tik `PRIMARY KEY` ir `UNIQUE` (auto-indexed)
- **Trūksta:** indexų dažniausioms query'ams:
  - `game_log(uid, ts)` — dabar skaitomas kaip sequential scan
  - `transactions(uid, created_at)`
  - `sessions(uid)` — reikalingas logout
  - `rg_limits(uid)` — jau PK ✅
- Poveikis: 10-100× lėčiau kai >100k žaidimų
- **Siūlymas:** DB migration pridėti index'us
- Reikalauja DB schema pakeitimo → jūsų leidimo

---

**🟢 LOW-01: Sistemos cleanup reikalingas**
- Rastas 7.8MB debug failas `public/images/cleo-texture.png` — ištrintas ✅
- Dėl to dydis: 174M → 166M

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

