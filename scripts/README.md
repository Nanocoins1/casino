# HATHOR i18n — Translation Automation

## Kaip pridėti naują žaidimą su auto-vertimu

### 1. Greitai — viena komanda:
```bash
export ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE

node scripts/sync-translations.js --key cosmicDice --title "COSMIC DICE" --desc "3D physics dice · roll to win"
```

Skriptas automatiškai:
- Išverčia į LT, RU, DE, PL, FR, TR, AR, ZH
- Įrašo į index.html visose kalbose
- Rodo ką pridėjo

### 2. Patikrinti kas neišversta:
```bash
node scripts/sync-translations.js --check
```

### 3. Sync viską kas trūksta:
```bash
export ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
node scripts/sync-translations.js
```

---

## Kaip pridėti naują kalbą

1. Atidaryti `public/index.html`
2. Rasti paskutinę kalbą ir pridėti naują pagal tą pačią struktūrą (EN kaip šablonas)
3. Paleisti: `node scripts/sync-translations.js` — automatiškai užpildys žaidimų vertimus

---

## Kalbų kodai
| Kodas | Kalba |
|-------|-------|
| en | English |
| lt | Lietuvių |
| ru | Русский |
| de | Deutsch |
| pl | Polski |
| fr | Français |
| tr | Türkçe |
| ar | العربية |
| zh | 中文 |

---

## ANTHROPIC_API_KEY nustatymas (Windows)
```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
node scripts/sync-translations.js --key myGame --title "My Game" --desc "Description"
```
