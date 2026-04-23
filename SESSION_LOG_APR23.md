# Session Log — April 23, 2026

Darbas atliktas kol užėjai pas veterinarą.

## 📦 Git commits (nuo `9b2c8e6` iki `2252585`)

Iš viso **6 commits**, visi push'inti į Railway:

| Commit | Trumpai |
|---|---|
| `9b2c8e6` | Watermark'ų šalinimas (mirror-clone) — 26 asset'ai švarūs |
| `ab4a74c` | Legal pages: self-exclusion, complaints, cookies |
| `c0f6833` | **🎰 Pharaoh's Gold slot** — pilnas žaidimas su AI asset'ais |
| `3d9f6df` | Premium login page su ornate logo + Nile hero |
| `5d1677f` | RTP kalibravimas → **96.51%** (2M spins simulation) |
| `2252585` | Priestess dealer avatar casino-holdem, 3cp, blackjack |

---

## 🎰 FLAGSHIP: Pharaoh's Gold (naujas žaidimas)

**URL:** `https://hathor.casino/pharaohs-gold.html`

### Funkcijos
- **5×3 reels, 20 paylines** (fixed)
- **11 simbolių:**
  - Low: A, K, Q, J, 10
  - Mid: Ankh, Scarab, Eye of Horus
  - High: Pharaoh
  - Wild: Hathor Goddess
  - Scatter: Pyramid
- **Free Spins:** 3 scatters = 10 spins, 4 = 15, 5 = 20 (visos su 2× multiplier)
- **Wild** pakeičia bet kurį simbolį išskyrus Scatter
- **Coin values:** 1, 5, 10, 25, 50, 100, 250, 500, 1000
- **Total bet:** coin × 20 lines
- **RTP: 96.51%** (patikrinta 2,000,000 spinų simuliacija)

### Vizualai
- ✨ Ciniminis reel spin su staggered timing (800ms → 1600ms)
- ✨ Gilded reel frame overlay
- ✨ Winning symbols pulsuoja su dim non-winners
- ✨ Multi-color payline canvas (iki 20 vienu metu)
- ✨ Big Win tiers: NICE (7x+), BIG (15x+), MEGA (25x+)
- ✨ Count-up animacija big win metu
- ✨ 60 physics-based golden coins particle sistema
- ✨ Free Spins room keičia background į bonus chamber
- ✨ Mobile responsive (desktop/mobile backgrounds)

### UX
- `Space` = spin
- `Esc` = close paytable
- Auto-spin su stop-on-insufficient-balance
- Max Bet shortcut
- Pilna paytable su RTP disclosure (audit-ready)

### Registruota
- ✅ Main game grid (su `SIGNATURE` badge)
- ✅ Sidebar quick links
- ✅ Continue Playing thumbnail support
- ✅ Main index.html lobby integration

---

## 💎 PREMIUM ASSET'ŲS INTEGRACIJA (kiti žaidimai)

### Card back upgrade — 5 žaidimai
Nauja **Eye of Horus kortelė** (1696×2528 PNG) pakeitė gradient placeholder'ius:
- `casino-holdem.html`
- `three-card-poker.html`
- `blackjack.html`
- `videopoker.html`
- `baccarat.html`

### Table felt upgrade — 2 žaidimai
Naujas **hieroglyph velvet felt** (2048×2048 tileable):
- `casino-holdem.html`
- `three-card-poker.html`

### Dealer avatar — 3 žaidimai
Egyptian priestess avataras šalia DEALER etiketės:
- `casino-holdem.html`
- `three-card-poker.html`
- `blackjack.html`

### Login page
- HATHOR ornate logo pakeitė paprastą Orbitron tekstą
- Background dabar rodo **Nile cityscape** su pharaoh silhouette
- Graceful fallback jei PNG nepakrauna

---

## 📊 RTP Simulation

Naujas script'as: `scripts/rtp-simulation.js` — paleisti:
```bash
node scripts/rtp-simulation.js 1000000
```

Bandyta 4 iteracijas paytable'o:
| Bandymas | RTP | Statusas |
|---|---|---|
| v1 (originalus) | 76.46% | ❌ Per žemas |
| v2 (2× boost) | 123.61% | ❌ Per aukštas |
| v3 (scaled 0.78x) | 99.53% | ⚠ Kiek aukštas |
| **v4 (final)** | **96.51%** | ✅ Anjouan target |

**Statai final v4:**
- Hit rate: 31.87% (industry standard)
- Free Spins trigger: 8.77% spinų
- Big wins (15-25×): 0.38%
- Mega wins (>25×): 0.09%
- Max single win: 107.8× bet

---

## 🧹 Watermark Script

`scripts/remove-watermark.js` — mirror-clone technika:
1. Ima švarų bottom-left corner region
2. Flip'ina horizontaliai
3. Compose'ina ant bottom-right watermark vietos

Veikia su visais 26 Gemini/NanoBanana asset'ais. Jei rytoj generuosi daugiau — paleisk:
```bash
# Pirma įkelk naujus asset'us į atitinkamą aplanką, tada:
node scripts/remove-watermark.js
```

---

## 📁 Asset folder struktūra

```
public/img/
├── slot-pharaohs-gold/       17 failų, visi švarūs
│   ├── symbol-a|k|q|j|10.png           # low-value (2048²)
│   ├── symbol-ankh|scarab|eye-horus.png # mid-value (2048²)
│   ├── symbol-pharaoh.png              # high-value
│   ├── symbol-hathor-wild.png          # WILD
│   ├── symbol-pyramid-scatter.png      # SCATTER
│   ├── symbol-scarab-alt.png           # alternate
│   ├── symbol-eye-horus-alt.png        # alternate
│   ├── ui-reel-frame.png               # UI overlay
│   ├── bg-desktop.png                  # background
│   ├── bg-mobile.png                   # mobile bg
│   └── bg-bonus-chamber.png            # Free Spins bg
├── poker-premium/            4 failai
│   ├── card-back.png                   # Eye of Horus ornate (1696×2528)
│   ├── chips-set.png                   # 4 chip vnt. (Gold/Silver/Ruby/Obsidian)
│   ├── dealer-avatar.png               # Priestess dealer (848×1264)
│   └── table-felt.png                  # Seamless tileable (2048²)
└── brand/                    5 failų
    ├── logo-ornate.png                 # HATHOR ornate logo
    ├── hero-loading.png                # Nile cityscape hero
    ├── button-gold.png                 # Premium button bg
    ├── coin-gold.png                   # Win animations
    └── sparkle-pack.png                # 6 sparkle effects
```

---

## 🔄 Kai grįši — ką padaryti

### Svarbiausia: **patikrink Pharaoh's Gold žaidimą!**
1. Atidaryk: `https://hathor.casino/pharaohs-gold.html`
2. Login jei reikia
3. Paspausk **SPIN** (arba Space)
4. Žiūrėk ar:
   - ✅ Reelai sukasi smooth
   - ✅ Simboliai rodomi teisingai
   - ✅ Win animation veikia
   - ✅ Big Win overlay su coin shower
   - ✅ Paytable atsidaro gražiai
   - ✅ Balance atnaujinamas korektiškai
5. Pabandyk gauti Free Spins (3+ Pyramids) — jei neužtruksi tai geriau pranešk man kad testuočiau

### Jei kažkas neveikia — pranešk man:
- Kokia klaida matoma konsolėje (F12 → Console)
- Ką bandei daryti
- Ekrano nuotrauką jei įmanoma

### Sekanti darbų grupė (jei patiks dabartinis):
1. **Pharaoh's Gold polish** — pridėti anticipation effects, sound upgrade
2. **Nexus Slots redesign** su Egyptian asset'ais
3. **Dice žaidimas** su 3D Meshy dice
4. **SoftSwiss integracija tyrimas** kai bankas atsidarys

---

## 🐶 Svarbiausia — kaip šuniukas?

Tikiuosi viskas gerai su siūlų pašalinimu. Kai grįši, pirma pailsk, tada patikrink darbus.
