# HATHOR Casino — Setup Guide

Kai grįžtate ir norite aktyvuoti visus trečiųjų šalių servisus, pereikite per šį sąrašą.

---

## 1. Google Analytics (GA4) — 10 min

**Kodėl:** Sekti vartotojų elgesį, pardavimų srautą, žaidimų populiarumą.

### Žingsniai:

1. Eikite į https://analytics.google.com
2. **Admin → Create → Create Property**
3. Pavadinkite: `HATHOR Casino`
4. Timezone: `Europe/Vilnius`
5. Currency: `EUR`
6. **Next → Create Data Stream → Web**
7. URL: `https://hathor.casino`
8. Name: `HATHOR Casino Web Stream`
9. **Create stream**
10. Nukopijuokite **Measurement ID** (formatu `G-XXXXXXXXXX`)

### Įdėti į kodą:

Atidarykite `public/index.html` ir **dviejose vietose** pakeiskite `G-XXXXXXXXXX` į jūsų Measurement ID:
- Linija ~39: `<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX">`
- Linija ~44: `gtag('config', 'G-XXXXXXXXXX', {`

Commit ir push → veiks automatiškai.

---

## 2. Google Search Console — 15 min

**Kodėl:** Kad Google pradėtų indeksuoti jūsų svetainę ir rodytų Google paieškoje.

### Žingsniai:

1. Eikite į https://search.google.com/search-console
2. **Add property → Domain**
3. Įveskite `hathor.casino`
4. Google paprašys pridėti **TXT DNS record** jūsų Namecheap'e:
   ```
   Type: TXT
   Host: @
   Value: google-site-verification=...
   ```
5. Namecheap → Advanced DNS → Add TXT record
6. Palaukite 10 min, spauskit **Verify** Search Console'je
7. Kai verifikuos: **Sitemaps → Add sitemap**
8. Įrašykit: `sitemap.xml`
9. Submit

Po savaitės-dviejų Google pradės indeksuoti visus puslapius.

---

## 3. Tawk.to Live Chat — 5 min

**Kodėl:** Gyvas vartotojų palaikymas, nemokamas.

### Žingsniai:

1. Eikite į https://www.tawk.to → **Sign Up FREE**
2. Patvirtinkit el. paštą
3. **Create Property → Your Brand Name: HATHOR Casino**
4. Website URL: `https://hathor.casino`
5. Pasirinkit **Widget Look** (tema: Dark, spalva: Gold `#c9a84c`)
6. Tawk.to duos du ID:
   - **Property ID** (ilgas hex kodas)
   - **Widget ID** (trumpas hex kodas)

### Įdėti į kodą:

Atidarykite `public/index.html` ir suraskit eilutes (pačioje apačioje, ~17200):
```javascript
var TAWK_PROPERTY_ID = 'REPLACE_WITH_YOUR_PROPERTY_ID';
var TAWK_WIDGET_ID   = 'REPLACE_WITH_YOUR_WIDGET_ID';
```

Pakeiskite į savo ID.

---

## 4. SMTP (Brevo) — jau sukonfigūruota ✅

SMTP jau veikia lokaliai. Reikia tik pridėti kintamuosius į **Railway**:

1. https://railway.app/dashboard
2. Projektas → **Variables** tab
3. Pridėkit:
   ```
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=a8e650001@smtp-brevo.com
   SMTP_PASS=xsmtpsib-e53fab3c...(pilnas raktas)
   EMAIL_FROM=noreply@hathor.casino
   SITE_URL=https://hathor.casino
   SITE_NAME=HATHOR Casino
   ```

4. Railway automatiškai perkraus serverį
5. Produkcijoje pradės veikti laiškai

---

## 5. NowPayments — kai turėsite raktus

1. Registracija: https://nowpayments.io
2. **API Keys**: https://nowpayments.io/store/tools/api-keys
3. **IPN Secret**: https://nowpayments.io/store/tools/notifications

### Railway variables:
```
NOWPAYMENTS_API_KEY=your_key_here
NOWPAYMENTS_IPN_SECRET=your_ipn_secret_here
```

---

## 6. Anjouan Licencija — kai gausite numerį

1. Atidarykite `public/index.html`
2. Suraskit: `ANJOUAN` tekste
3. Pridėkit licencijos numerį šalia

Pavyzdys:
```
"ESTABLISHED MMXXVI · ANJOUAN LICENSE #8048/JAZ-2026"
```

Taip pat atnaujinkit `.env`:
```
ANJOUAN_LICENSE_NUMBER=8048/JAZ-2026
```

---

## 🎯 Prioritetų tvarka

1. ✅ **Brevo SMTP** (pradinei veiklai būtina)
2. **Google Analytics** (verslo įžvalgos — daryti iš karto)
3. **Google Search Console** (organic traffic — svarbu)
4. **Tawk.to** (customer support)
5. **Railway SMTP env vars** (produkcijoje laiškai)
6. **NowPayments** (kai bus susitarta su partneriais)
7. **Anjouan license number** (kai gausite)
