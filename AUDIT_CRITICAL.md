# HATHOR Casino — KRITINĖS problemos (reikia jūsų sprendimo)

Šie radiniai paveikia autentifikaciją, finansus ar licencijos atitikimą.
**NETAIŠIAU be jūsų leidimo** — tik dokumentuoju su sprendimo pasiūlymais.

---

## 🔴 CRITICAL-01: Numatytasis administravimo slaptažodis

**Failas:** `server.js:170`
```javascript
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'hathor2026';
```

**Problema:** Jei Railway env kintamasis `ADMIN_PASSWORD` nenustatytas, naudojamas
numatytasis **`hathor2026`** — kuris yra **viešai matomas GitHub repository**.
Bet kas radęs kodą turi full admin prieigą.

**Sprendimas:**
1. Railway dashboard → Variables → pridėti:
   ```
   ADMIN_PASSWORD=<atsitiktinis 32+ simbolių stiprus slaptažodis>
   ```
   Generatorius: https://1password.com/password-generator/ (32 simbolių, max kompleksas)

2. Po to galima arba:
   - Pašalinti default value iš kodo (privers fail-fast jei env nenustatyta)
   - Arba palikti kaip fallback DEV tik, bet su `if (process.env.NODE_ENV === 'production') throw new Error(...)`

**Prioritetas:** **BŪTINA prieš launch.**

---

## 🔴 CRITICAL-02: Admin slaptažodžio hash'as naudoja SHA256

**Failas:** `server.js:192-194`
```javascript
function hashAdminPw(pw) {
  return crypto.createHash('sha256').update(pw + 'hathor_staff_2026').digest('hex');
}
```

**Problemos:**
1. **SHA256 nėra tinkamas slaptažodžių hash'avimui** — per greitas.
   GPU gali išbandyti milijardus variantų per sekundę (brute-force).
2. **Fiksuotas "salt"** (`'hathor_staff_2026'`) — visi admin'ai hash'uojami
   tuo pačiu salt. Jei vienas hash'as pavagiamas — visus galima atakuoti.
3. **Rainbow table atakos** — nes salt žinomas ir fiksuotas.

**Sprendimas:**
Pakeisti į scrypt (kaip jau naudojama user slaptažodžiams `server.js:2548-2552`):
```javascript
// Naujas admin_staff stulpelis: salt
// Perrašyti hashAdminPw į async + scrypt
// Per migraciją: regeneruoti visus admin hash'us su naujais salt
```

**Prioritetas:** **BŪTINA prieš launch.** Vartotojų slaptažodžiai JAU naudoja scrypt teisingai.

---

## 🟠 HIGH-01: Timing atakos slaptažodžio palyginime

**Failas:** `server.js:199, 2341, 2658`
```javascript
if(key === ADMIN_PASSWORD) { ... }
if(hash !== authRow.password_hash) { ... }
```

**Problema:** JavaScript `===` operatorius nėra constant-time. Atakuotojas
gali matuoti palyginimo laiką ir po truputį atkurti slaptažodį simbolis
po simbolio (`timing attack`).

**Sprendimas:**
```javascript
const { timingSafeEqual } = require('crypto');
function safeCompare(a, b) {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
// Naudoti visur kur palyginami slapti stringai
```

**Prioritetas:** Pataisyti per 1-2 dienas. Realūs timing atakos per internetą
yra sunkiai įgyvendinami (network jitter), bet geriausia praktika.

---

## 🟡 MEDIUM-01: Sessions tokenai localStorage'e, ne httpOnly cookies

**Failas:** `public/index.html` (įvairios vietos, `localStorage.getItem('casino_session')`)

**Problema:** XSS ataka gali paskaityti localStorage ir išvogti session token'us.
Jei žaidėjo session pavagytas — prieiga prie jo balanso.

**Dabar saugo:** CSP griežtos taisyklės (Phase 2 fixe blob:) ir React (ne innerHTML).
**Bet:** jei kada nors atsiras XSS — visi aktyvūs sessions kompromituoti.

**Sprendimas (ilgalaikis):**
- Perkelti sessions į `httpOnly` cookies
- Pridėti CSRF token'us (nes cookies siunčiasi automatiškai)
- Apsauga prieš XSS + CSRF combo

**Prioritetas:** Post-launch refactor. Dabartinė situacija priimtina
jei CSP griežta ir nėra žinomų XSS.

---

## 🟡 MEDIUM-02: Helmet.js middleware neįdiegtas

**Failas:** `server.js` (nėra `require('helmet')`)

**Problema:** Nepaleidžiamas Helmet, kuris automatiškai prideda 15+ saugumo headers.
Bet TIE headers **RANKINIU BŪDU pridėti** jūsų kode (`server.js:695-717`):
- X-Content-Type-Options ✅
- X-Frame-Options ✅
- Referrer-Policy ✅
- Permissions-Policy ✅
- HSTS ✅
- CSP ✅

**Išvada:** Helmet'o nereikia — rankinis patvirtinimas lygiaverčiai geras.
Priimtina situacija. Paliekamas kaip ℹ️ INFO.

---

## ℹ️ INFO-01: CSRF apsauga

Architektūroje naudojamas **token-based auth per `x-session-token` header**, ne cookies.
Cross-origin atakos tokiu atveju:
- Negali skaityti / nustatyti custom headers iš kito domeno
- Negali gauti cookies
- Su griežta CORS konfigūracija (yra) — pilnai apsisaugota

**Išvada:** CSRF tokenai **NEREIKALINGI** šioje architektūroje.

---

## ℹ️ INFO-02: CORS saugus

- `Socket.io` naudoja origin allowlist (ne `*`)
- HTTP API: nėra `app.use(cors())` — default same-origin only
- Saugu ✅

---

## Santrauka — ką reikia JŪSŲ leidimo pataisyti:

| ID | Pavadinimas | Laiko | Rizikos lygis |
|---|---|---|---|
| CRITICAL-01 | ADMIN_PASSWORD default | 5 min Railway | 🔴 Launch blocker |
| CRITICAL-02 | SHA256 → scrypt migration | 1-2 val kodo + migracija | 🔴 Launch blocker |
| HIGH-01 | timingSafeEqual | 30 min | 🟠 |

**CRITICAL-01** jūs galit ištaisyti dabar pat **per Railway dashboard** (prisijungti → Variables → add).

**CRITICAL-02** ir **HIGH-01** — reikia kodo pakeitimų. Jei sutinkate, aš galiu juos padaryti po 2h audito (tai paveikia auth — reikalauja jūsų leidimo pagal taisykles).
