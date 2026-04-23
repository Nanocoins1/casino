# HATHOR Casino — Klausimai auditoriui

Šie klausimai atsirado audito metu. **Neužstringu dėl šių** — tęsiu darbą,
bet reikia jūsų atsakymų **prieš launch**.

---

## Q1: Ar ADMIN_PASSWORD jau nustatytas Railway?

Railway dashboard → Variables — ar yra `ADMIN_PASSWORD` su stipriu slaptažodžiu?

Jei ne — tai **launch blocker** (žr. AUDIT_CRITICAL.md:CRITICAL-01).

---

## Q2: Ar galiu pakeisti admin auth į scrypt?

Tai paveiks visus esamus admin_staff įrašus DB. Reikėtų:
1. Pridėti `salt` stulpelį į `admin_staff` lentelę (migracija)
2. Perhash'uoti visus admin slaptažodžius (arba priversti juos iš naujo nustatyti)
3. Atnaujinti `hashAdminPw` funkciją į async scrypt

Ar duodat leidimą? Tai yra auth/DB schema pakeitimas — pagal taisykles reikia patvirtinti.

---

## Q3: Ar turite NowPayments API raktą?

`.env` dabar tuščia:
```
NOWPAYMENTS_API_KEY=
NOWPAYMENTS_IPN_SECRET=
```

Be šių real-money deposits NEVEIKIA. Auditoriai turbūt klaus ar integracija veikia.

---

## Q4: Ar Viktor AI ir el. laiškai jau deployed Railway'uje?

Patikrinta: `ANTHROPIC_API_KEY`, `SMTP_*`, `EMAIL_FROM` — visi pridėti į Railway
(matyti per `railway variables`). ✅

---

## Q5: Ar platforma naudoja TIKRĄ pinigai dabar?

Šiuo metu:
- Crypto deposit: kodas paruoštas bet `NOWPAYMENTS_API_KEY=` tuščia → **demo mode**
- Custom žaidimai (slots, roulette): client-side token update, server neatskaito

Ar auditas turi tikrinti tik infrastruktūrą, ar ir pilną real-money flow?
Jei antra — reikia:
- Aktyvuoti NowPayments raktus
- Migrate custom games į `/api/game/bet` + `/api/game/settle`

---

## Q6: Anjouan licencijos numeris

`.env` komentarai rodo:
```
# ANJOUAN_LICENSE_NUMBER=
```

Ar jau turite numerį? Reikia įrašyti į footer'į (dokumentuose jau
matyti "ANJOUAN" tekstas be konkretaus numerio).

---

## Q7: Ar susisiekiama su AXIS / agregatoriumi?

Jei bus integruojamas AXIS:
- Custom žaidimai taps nebereikalingi (providers tvarkys statymus)
- Saugumo rizikos mažesnės (jie turi licenciją ir auditą)
- Real-money flow bus per jų API

Ar per audito dienas planuojate aktyvuoti AXIS, ar pirmiausia pristatysite
dabartinę versiją kaip "tech preview"?
