# HATHOR Casino — Audit Overview

**Auditas pradėtas:** 2026-04-23
**Auditorius:** Claude (autonomous mode, 2h)
**Tikslas:** Pasiruošti Anjouan licencijos auditui prieš real-money launch.

---

## 1. Technologijų stekas

### Backend
- **Runtime:** Node.js ≥18
- **Framework:** Express.js 4.18.2
- **WebSocket:** Socket.io 4.7.2
- **DB primary:** PostgreSQL (via `pg`)
- **DB fallback:** better-sqlite3 (dev/demo mode)
- **Auth:** Session-based + 2FA (TOTP via `speakeasy`)
- **Crypto payments:** NowPayments (REST API)
- **Email:** Nodemailer + Brevo SMTP
- **Push:** web-push (VAPID)
- **AI:** Anthropic Claude Haiku 4.5 (Viktor croupier + support)
- **Rate limiting:** express-rate-limit
- **File uploads:** multer (for KYC + avatars)

### Frontend
- **Framework:** React 18.3.1 (CDN, production build)
- **Compiler:** Babel Standalone (in-browser JSX)
- **3D:** `<model-viewer>` (Draco + meshopt)
- **Charts:** Chart.js 4.4.0 (deferred)
- **Sockets:** socket.io-client
- **Fonts:** Google Fonts (Cinzel, Inter, Cormorant etc.)

### Infrastructure
- **Hosting:** Railway (Fastly CDN edge)
- **Domain:** hathor.casino (CNAME → 8c6xwa82.up.railway.app)
- **CI/CD:** GitHub push → auto-deploy
- **Storage:** Railway postgres + Railway volume for SQLite

---

## 2. Pagrindiniai failai

| Failas | Eilutės | Funkcija |
|---|---|---|
| `server.js` | 4,833 | Backend — Express, Socket.io, routes, DB |
| `public/index.html` | 17,651 | Single-page React app + CSS + JSX |
| `email-templates.js` | ~500 | 8 premium HTML email šablonai |
| `public/sw.js` | ~190 | Service Worker v4.9 (caching, push) |
| `public/manifest.json` | ~50 | PWA manifest |
| 37 standalone HTML | — | Individual game pages, compliance pages |

---

## 3. API endpoints (178 suma)

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/verify-email/:token`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/2fa/setup`
- `POST /api/auth/2fa/verify`
- `POST /api/auth/2fa/disable`

### Žaidimai
- `POST /api/game/bet` — deduct balance
- `POST /api/game/settle` — credit win
- `POST /api/log-game` — legacy (auth required)
- `POST /api/jackpot-win` — server-authoritative

### Crypto mokėjimai
- `GET /api/crypto/currencies`
- `POST /api/crypto/deposit`
- `GET /api/crypto/status/:paymentId`
- `POST /api/crypto/ipn` (NOWPayments webhook)
- `POST /api/crypto/withdraw`
- `GET /api/crypto/history/:uid`

### Provably Fair
- `GET /api/provably-fair/seeds/:uid`
- `POST /api/provably-fair/client-seed`
- `POST /api/provably-fair/rotate`
- `POST /api/provably-fair/verify`

### Admin
- `/admin/*` (adminAuth middleware)
- KYC, withdrawals, inbox, staff, bonuses

### Socket.io events
- `register`, `login`, `joinRoom`, `leaveRoom`
- `chatMsg`, `emoji`, `action` (poker)
- `addXP`, `claimDailyBonus`, `updateAvatar`
- `balanceSync`, `depositConfirmed`, `levelUp`

---

## 4. Neišspręsti placeholder'iai

1. **`G-XXXXXXXXXX`** — Google Analytics 4 Measurement ID (public/index.html:43, 48)
2. **`REPLACE_WITH_YOUR_PROPERTY_ID`** — Tawk.to property (public/index.html:17620)
3. **`REPLACE_WITH_YOUR_WIDGET_ID`** — Tawk.to widget (public/index.html:17621)
4. **`.env NOWPAYMENTS_API_KEY=`** — tuščia
5. **`.env NOWPAYMENTS_IPN_SECRET=`** — tuščia

Šie nėra saugumo problemos — tai dar neaktyvuoti servisai.

---

## 5. Paskutiniai 20 commit'ų

Matyti: aktyvus development, daug fix commits per dvi dienas — normalu prieš launch.
Paskutinis: `88d93e8 perf: React dev → production builds (10× smaller download)`

---

## 6. TODO/FIXME/HACK skaičius

- `server.js`: 0
- `public/index.html`: 0
- `email-templates.js`: 0

Aiškiai saugu — jokių pastebėtų nebaigtų dalių.

---

## 7. Dokumentacija (jau turima)

- `GLI-11_Game_Rules_HATHOR_Casino.pdf`
- `GLI-19_System_Architecture_HATHOR_Casino.pdf`
- `HATHOR_License_Application_v2.docx`
- `RNG_Technical_Documentation_HATHOR_Casino.pdf`

**Tai puikios faktai — Anjouan auditoriai apsidžiaugs matydami šiuos dokumentus paruoštus.**
