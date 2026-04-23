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

