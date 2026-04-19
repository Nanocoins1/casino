/**
 * Regenerates aml.html with clean script using JSON for translations
 */
const fs = require('fs');
const path = require('path');

const OUT = 'C:/Users/PC/casino/public/aml.html';

const CSS = `
*{box-sizing:border-box;margin:0;padding:0;}
:root{--gold:#c9a84c;--gold2:#ffd680;--bg:#0a0806;--card:rgba(255,255,255,0.03);--border:rgba(201,168,76,0.15);--cream:#e8e2d4;}
body{background:var(--bg);color:var(--cream);font-family:'Inter',sans-serif;font-size:15px;line-height:1.7;}
header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid var(--border);position:sticky;top:0;background:rgba(10,8,6,0.97);backdrop-filter:blur(10px);z-index:100;gap:12px;flex-wrap:wrap;}
.logo{font-family:'Cinzel',serif;font-size:18px;font-weight:700;color:var(--gold);text-decoration:none;letter-spacing:2px;white-space:nowrap;}
.back-link{color:var(--gold);text-decoration:none;font-size:12px;border:1px solid var(--border);padding:5px 12px;border-radius:8px;white-space:nowrap;}
.lang-bar{display:flex;gap:5px;align-items:center;flex-wrap:wrap;}
.lang-btn{background:none;border:1px solid rgba(201,168,76,0.2);border-radius:6px;color:rgba(232,226,212,0.5);font-size:11px;padding:4px 7px;cursor:pointer;transition:all .2s;}
.lang-btn.active{border-color:var(--gold);color:var(--gold);background:rgba(201,168,76,0.08);}
.lang-btn:hover{color:var(--cream);}
.container{max-width:820px;margin:0 auto;padding:48px 24px 80px;}
.page-title{font-family:'Cinzel',serif;font-size:28px;font-weight:700;color:var(--gold2);margin-bottom:8px;}
.updated{font-size:12px;color:rgba(201,168,76,0.4);margin-bottom:32px;}
h2{font-family:'Cinzel',serif;font-size:15px;font-weight:700;color:var(--gold);margin:32px 0 10px;padding-bottom:8px;border-bottom:1px solid var(--border);}
p{margin-bottom:12px;color:rgba(232,226,212,0.8);}
ul{margin:8px 0 12px 20px;color:rgba(232,226,212,0.8);}
li{margin-bottom:6px;}
.info-box{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;margin:16px 0;}
.warning-box{background:rgba(255,61,113,0.06);border:1px solid rgba(255,61,113,0.2);border-radius:10px;padding:16px;margin:20px 0;color:#ff9999;}
footer{text-align:center;padding:24px;border-top:1px solid var(--border);font-size:12px;color:rgba(201,168,76,0.3);}
`;

// Translations stored as a JS object with proper escaping
// Using a function that returns the translations to avoid any scope issues
const TRANSLATIONS = {
  en: {
    backLink: "\u2190 Back",
    pageTitle: "AML Policy",
    updated: "Anti-Money Laundering & Counter-Terrorism Financing Policy \u00b7 2026",
    warning: "\uD83D\uDEA8 HATHOR Royal Casino maintains a strict zero-tolerance policy against money laundering, fraud, and financial crime.",
    h1: "1. Introduction and Legal Basis",
    p1: "HATHOR Royal Casino operates in compliance with international AML (Anti-Money Laundering) and CFT (Counter-Terrorism Financing) standards. Our policy follows FATF (Financial Action Task Force) recommendations and Anjouan Online Gaming Commission requirements.",
    h2: "2. KYC Procedure",
    p2: "All players are required to complete KYC (Know Your Customer) verification before:",
    li_withdraw: "Withdrawing funds",
    li_threshold: "Reaching cumulative transactions equivalent to \u20AC2,000",
    li_suspicious: "When suspicious activity is detected",
    docs_title: "Required documents:",
    doc1: "Valid photo ID (passport or national ID card)",
    doc2: "Proof of address (no older than 3 months)",
    doc3: "Proof of source of funds (when required)",
    h3: "3. Risk Assessment",
    p3: "Each player is assessed according to a risk profile:",
    risk_low: "<strong>Low risk:</strong> Regular players with verified identity",
    risk_mid: "<strong>Medium risk:</strong> New players, large transactions",
    risk_high: "<strong>High risk:</strong> PEPs, large unexplained transactions",
    h4: "4. Monitoring and Reporting",
    p4: "We automatically monitor:",
    mon1: "Unusually large deposits or withdrawals",
    mon2: "Frequent small transactions (structuring)",
    mon3: "Transactions from high-risk jurisdictions",
    mon4: "Atypical gambling behaviour patterns",
    h5: "5. Prohibited Jurisdictions",
    p5: "We prohibit services to persons from:",
    jur1: "Countries on the FATF blacklist",
    jur2: "The USA and its territories",
    jur3: "Countries where online gambling is prohibited",
    h6: "6. Staff Training",
    p6: "All staff working with player accounts receive regular AML/CFT training.",
    h7: "7. Record Keeping",
    p7: "All transaction and KYC records are retained for a minimum of 7 years.",
    h8: "8. AML Officer",
    contact_html: "AML Officer: <strong>aml@hathor.casino</strong><br/>Confidential reports: <strong>compliance@hathor.casino</strong>",
    footer: "\u00a9 2026 HATHOR Royal Casino \u00b7 <a href=\"/terms.html\" style=\"color:var(--gold)\">T&amp;C</a> \u00b7 <a href=\"/privacy.html\" style=\"color:var(--gold)\">Privacy Policy</a>"
  },
  lt: {
    backLink: "\u2190 Gr\u012f\u017eti",
    pageTitle: "AML Politika",
    updated: "Kovos su pinig\u0173 plovimu ir terorizmo finansavimo prevencijos politika \u00b7 2026",
    warning: "\uD83D\uDEA8 HATHOR Royal Casino taiko nul\u012fn\u0117s tolerancijos politik\u0105 pinig\u0173 plovimui, suktyb\u0117ms ir finansiniams nusikaltimams.",
    h1: "1. \u012evadas ir teisin\u0117 baz\u0117",
    p1: "HATHOR Royal Casino vykdo veikl\u0105 laikydamasis tarptautini\u0173 kovos su pinig\u0173 plovimu (AML) ir terorizmo finansavimo prevencijos (CFT) standart\u0173. M\u016bs\u0173 politika atitinka FATF rekomendacijas.",
    h2: "2. KYC procedūra",
    p2: "Visi žaidėjai privalo pereiti KYC patikrinimą prieš:",
    li_withdraw: "Išimant lėšas",
    li_threshold: "Pasiekus 2\u00a0000 EUR ekvivalentą kumuliatyvių transakcijų",
    li_suspicious: "Kai kyla įtarimas dėl neteisėtos veiklos",
    docs_title: "Reikalingi dokumentai:",
    doc1: "Galiojantis asmens tapatybę patvirtinantis dokumentas (pasas arba asmens tapatybės kortelė)",
    doc2: "Gyvenamosios vietos įrodymas (ne senesnis nei 3 mėnesiai)",
    doc3: "Lėšų kilmės įrodymas (jei reikalaujama)",
    h3: "3. Rizikos vertinimas",
    p3: "Kiekvienas žaidėjas vertinamas pagal rizikos profilį:",
    risk_low: "<strong>Maža rizika:</strong> Nuolatiniai žaidėjai su patvirtinta tapatybe",
    risk_mid: "<strong>Vidutinė rizika:</strong> Nauji žaidėjai, didelės transakcijos",
    risk_high: "<strong>Didelė rizika:</strong> Politiškai pažeidžiami asmenys, didelės nepaaiš­kintos transakcijos",
    h4: "4. Stebėjimas ir ataskaitų teikimas",
    p4: "Automatiškai stebime:",
    mon1: "Neįprastai dideli indėliai ar išimimai",
    mon2: "Dažnos mažos transakcijos (struktūrizavimas)",
    mon3: "Transakcijos iš didelės rizikos jurisdikcijų",
    mon4: "Netipiški azartinių žaidimų elgesio modeliai",
    h5: "5. Draudžiamos jurisdikcijos",
    p5: "Draudžiame teikti paslaugas asmenims iš:",
    jur1: "Šalių FATF juodajame sąraše",
    jur2: "JAV ir jos teritorijų",
    jur3: "Šalių, kuriose internetiniai azartiniai žaidimai yra draudžiami",
    h6: "6. Personalo mokymas",
    p6: "Visi darbuotojai, dirbantys su žaidėjų sąskaitomis, reguliariai mokomi AML/CFT procedūrų.",
    h7: "7. Duomenų saugojimas",
    p7: "Visi transakcijų ir KYC įrašai saugomi mažiausiai 7 metus.",
    h8: "8. AML pareigūnas",
    contact_html: "AML pareigūnas: <strong>aml@hathor.casino</strong><br/>Konfidencialūs pranešimai: <strong>compliance@hathor.casino</strong>",
    footer: "\u00a9 2026 HATHOR Royal Casino \u00b7 <a href=\"/terms.html\" style=\"color:var(--gold)\">S\u0105lygos</a> \u00b7 <a href=\"/privacy.html\" style=\"color:var(--gold)\">Privatumo politika</a>"
  },
  ru: {
    backLink: "\u2190 \u041d\u0430\u0437\u0430\u0434",
    pageTitle: "\u041f\u043e\u043b\u0438\u0442\u0438\u043a\u0430 AML",
    updated: "\u041f\u043e\u043b\u0438\u0442\u0438\u043a\u0430 \u043f\u0440\u043e\u0442\u0438\u0432\u043e\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u043e\u0442\u043c\u044b\u0432\u0430\u043d\u0438\u044e \u0434\u0435\u043d\u0435\u0433 \u0438 \u0444\u0438\u043d\u0430\u043d\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044e \u0442\u0435\u0440\u0440\u043e\u0440\u0438\u0437\u043c\u0430 \u00b7 2026",
    warning: "\uD83D\uDEA8 HATHOR Royal Casino \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 \u043f\u043e \u043f\u0440\u0438\u043d\u0446\u0438\u043f\u0443 \u043d\u0443\u043b\u0435\u0432\u043e\u0439 \u0442\u043e\u043b\u0435\u0440\u0430\u043d\u0442\u043d\u043e\u0441\u0442\u0438 \u043a \u043e\u0442\u043c\u044b\u0432\u0430\u043d\u0438\u044e \u0434\u0435\u043d\u0435\u0433, \u043c\u043e\u0448\u0435\u043d\u043d\u0438\u0447\u0435\u0441\u0442\u0432\u0443 \u0438 \u0444\u0438\u043d\u0430\u043d\u0441\u043e\u0432\u044b\u043c \u043f\u0440\u0435\u0441\u0442\u0443\u043f\u043b\u0435\u043d\u0438\u044f\u043c.",
    h1: "1. \u0412\u0432\u0435\u0434\u0435\u043d\u0438\u0435 \u0438 \u043f\u0440\u0430\u0432\u043e\u0432\u0430\u044f \u0431\u0430\u0437\u0430",
    p1: "HATHOR Royal Casino \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 \u0432 \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0438 \u0441 \u043c\u0435\u0436\u0434\u0443\u043d\u0430\u0440\u043e\u0434\u043d\u044b\u043c\u0438 \u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u0430\u043c\u0438 AML \u0438 CFT. \u041d\u0430\u0448\u0430 \u043f\u043e\u043b\u0438\u0442\u0438\u043a\u0430 \u0441\u043b\u0435\u0434\u0443\u0435\u0442 \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0438\u044f\u043c FATF.",
    h2: "2. \u041f\u0440\u043e\u0446\u0435\u0434\u0443\u0440\u0430 KYC",
    p2: "\u0412\u0441\u0435 \u0438\u0433\u0440\u043e\u043a\u0438 \u043e\u0431\u044f\u0437\u0430\u043d\u044b \u043f\u0440\u043e\u0439\u0442\u0438 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443 KYC \u043f\u0435\u0440\u0435\u0434:",
    li_withdraw: "\u0412\u044b\u0432\u043e\u0434\u043e\u043c \u0441\u0440\u0435\u0434\u0441\u0442\u0432",
    li_threshold: "\u0414\u043e\u0441\u0442\u0438\u0436\u0435\u043d\u0438\u0435\u043c \u043a\u0443\u043c\u0443\u043b\u044f\u0442\u0438\u0432\u043d\u044b\u0445 \u0442\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u0439 \u043d\u0430 \u20AC2\u00a0000",
    li_suspicious: "\u041f\u0440\u0438 \u043f\u043e\u0434\u043e\u0437\u0440\u0435\u043d\u0438\u0438 \u0432 \u043d\u0435\u0437\u0430\u043a\u043e\u043d\u043d\u043e\u0439 \u0434\u0435\u044f\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u0438",
    docs_title: "\u0422\u0440\u0435\u0431\u0443\u0435\u043c\u044b\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b:",
    doc1: "\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442, \u0443\u0434\u043e\u0441\u0442\u043e\u0432\u0435\u0440\u044f\u044e\u0449\u0438\u0439 \u043b\u0438\u0447\u043d\u043e\u0441\u0442\u044c (\u043f\u0430\u0441\u043f\u043e\u0440\u0442 \u0438\u043b\u0438 ID-\u043a\u0430\u0440\u0442\u0430)",
    doc2: "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435 \u0430\u0434\u0440\u0435\u0441\u0430 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u044f (\u043d\u0435 \u0441\u0442\u0430\u0440\u0448\u0435 3 \u043c\u0435\u0441\u044f\u0446\u0435\u0432)",
    doc3: "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435 \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0430 \u0441\u0440\u0435\u0434\u0441\u0442\u0432 (\u043f\u0440\u0438 \u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u043e\u0441\u0442\u0438)",
    h3: "3. \u041e\u0446\u0435\u043d\u043a\u0430 \u0440\u0438\u0441\u043a\u043e\u0432",
    p3: "\u041a\u0430\u0436\u0434\u044b\u0439 \u0438\u0433\u0440\u043e\u043a \u043e\u0446\u0435\u043d\u0438\u0432\u0430\u0435\u0442\u0441\u044f \u043f\u043e \u043f\u0440\u043e\u0444\u0438\u043b\u044e \u0440\u0438\u0441\u043a\u0430:",
    risk_low: "<strong>\u041d\u0438\u0437\u043a\u0438\u0439 \u0440\u0438\u0441\u043a:</strong> \u041f\u043e\u0441\u0442\u043e\u044f\u043d\u043d\u044b\u0435 \u0438\u0433\u0440\u043e\u043a\u0438 \u0441 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u043e\u0439 \u043b\u0438\u0447\u043d\u043e\u0441\u0442\u044c\u044e",
    risk_mid: "<strong>\u0421\u0440\u0435\u0434\u043d\u0438\u0439 \u0440\u0438\u0441\u043a:</strong> \u041d\u043e\u0432\u044b\u0435 \u0438\u0433\u0440\u043e\u043a\u0438, \u043a\u0440\u0443\u043f\u043d\u044b\u0435 \u0442\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u0438",
    risk_high: "<strong>\u0412\u044b\u0441\u043e\u043a\u0438\u0439 \u0440\u0438\u0441\u043a:</strong> \u041f\u041f\u0414\u041b, \u043a\u0440\u0443\u043f\u043d\u044b\u0435 \u043d\u0435\u043e\u0431\u044a\u044f\u0441\u043d\u0451\u043d\u043d\u044b\u0435 \u0442\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u0438",
    h4: "4. \u041c\u043e\u043d\u0438\u0442\u043e\u0440\u0438\u043d\u0433 \u0438 \u043e\u0442\u0447\u0451\u0442\u043d\u043e\u0441\u0442\u044c",
    p4: "\u041c\u044b \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438 \u043e\u0442\u0441\u043b\u0435\u0436\u0438\u0432\u0430\u0435\u043c:",
    mon1: "\u041d\u0435\u043e\u0431\u044b\u0447\u043d\u043e \u0432\u044b\u0441\u043e\u043a\u0438\u0435 \u0434\u0435\u043f\u043e\u0437\u0438\u0442\u044b \u0438\u043b\u0438 \u0432\u044b\u0432\u043e\u0434\u044b",
    mon2: "\u0427\u0430\u0441\u0442\u044b\u0435 \u043c\u0435\u043b\u043a\u0438\u0435 \u0442\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u0438 (\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435)",
    mon3: "\u0422\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u0438 \u0438\u0437 \u044e\u0440\u0438\u0441\u0434\u0438\u043a\u0446\u0438\u0439 \u0432\u044b\u0441\u043e\u043a\u043e\u0433\u043e \u0440\u0438\u0441\u043a\u0430",
    mon4: "\u041d\u0435\u0442\u0438\u043f\u0438\u0447\u043d\u044b\u0435 \u043c\u043e\u0434\u0435\u043b\u0438 \u0438\u0433\u0440\u043e\u0432\u043e\u0433\u043e \u043f\u043e\u0432\u0435\u0434\u0435\u043d\u0438\u044f",
    h5: "5. \u0417\u0430\u043f\u0440\u0435\u0449\u0451\u043d\u043d\u044b\u0435 \u044e\u0440\u0438\u0441\u0434\u0438\u043a\u0446\u0438\u0438",
    p5: "\u041c\u044b \u0437\u0430\u043f\u0440\u0435\u0449\u0430\u0435\u043c \u043e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u0435 \u043b\u0438\u0446 \u0438\u0437:",
    jur1: "\u0421\u0442\u0440\u0430\u043d \u0432 \u0447\u0451\u0440\u043d\u043e\u043c \u0441\u043f\u0438\u0441\u043a\u0435 FATF",
    jur2: "\u0421\u0428\u0410 \u0438 \u0438\u0445 \u0442\u0435\u0440\u0440\u0438\u0442\u043e\u0440\u0438\u0439",
    jur3: "\u0421\u0442\u0440\u0430\u043d, \u0433\u0434\u0435 \u043e\u043d\u043b\u0430\u0439\u043d-\u0430\u0437\u0430\u0440\u0442 \u0437\u0430\u043f\u0440\u0435\u0449\u0451\u043d",
    h6: "6. \u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u0430",
    p6: "\u0412\u0441\u0435 \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u0438, \u0440\u0430\u0431\u043e\u0442\u0430\u044e\u0449\u0438\u0435 \u0441\u043e \u0441\u0447\u0435\u0442\u0430\u043c\u0438 \u0438\u0433\u0440\u043e\u043a\u043e\u0432, \u043f\u0440\u043e\u0445\u043e\u0434\u044f\u0442 \u0440\u0435\u0433\u0443\u043b\u044f\u0440\u043d\u043e\u0435 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 AML/CFT.",
    h7: "7. \u0425\u0440\u0430\u043d\u0435\u043d\u0438\u0435 \u0437\u0430\u043f\u0438\u0441\u0435\u0439",
    p7: "\u0412\u0441\u0435 \u0437\u0430\u043f\u0438\u0441\u0438 \u0442\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u0439 \u0438 KYC \u0445\u0440\u0430\u043d\u044f\u0442\u0441\u044f \u043d\u0435 \u043c\u0435\u043d\u0435\u0435 7 \u043b\u0435\u0442.",
    h8: "8. \u041e\u0444\u0438\u0446\u0435\u0440 AML",
    contact_html: "\u041e\u0444\u0438\u0446\u0435\u0440 AML: <strong>aml@hathor.casino</strong><br/>\u041a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u044b\u0435 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u044f: <strong>compliance@hathor.casino</strong>",
    footer: "\u00a9 2026 HATHOR Royal Casino \u00b7 <a href=\"/terms.html\" style=\"color:var(--gold)\">T&amp;C</a> \u00b7 <a href=\"/privacy.html\" style=\"color:var(--gold)\">\u041f\u043e\u043b\u0438\u0442\u0438\u043a\u0430 \u043a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u0438</a>"
  }
};

// For non-LT/EN/RU languages, use EN as base but override title/updated
const LANG_OVERRIDES = {
  de: { backLink: "\u2190 Zur\u00fcck", pageTitle: "AML-Richtlinie", updated: "Richtlinie zur Bek\u00e4mpfung von Geldw\u00e4sche und Terrorismusfinanzierung \u00b7 2026" },
  pl: { backLink: "\u2190 Wstecz", pageTitle: "Polityka AML", updated: "Polityka przeciwdzia\u0142ania praniu pieni\u0119dzy i finansowaniu terroryzmu \u00b7 2026" },
  fr: { backLink: "\u2190 Retour", pageTitle: "Politique AML", updated: "Politique de lutte contre le blanchiment d\u2019argent et le financement du terrorisme \u00b7 2026" },
  tr: { backLink: "\u2190 Geri", pageTitle: "AML Politikas\u0131", updated: "Kara Para Aklamayla M\u00fccadele ve Ter\u00f6r\u00fcn Finansman\u0131n\u0131 \u00d6nleme Politikas\u0131 \u00b7 2026" },
  ar: { backLink: "\u2190 \u0631\u062c\u0648\u0639", pageTitle: "\u0633\u064a\u0627\u0633\u0629 AML", updated: "\u0633\u064a\u0627\u0633\u0629 \u0645\u0643\u0627\u0641\u062d\u0629 \u063a\u0633\u064a\u0644 \u0627\u0644\u0623\u0645\u0648\u0627\u0644 \u00b7 2026" },
  zh: { backLink: "\u2190 \u8fd4\u56de", pageTitle: "AML\u653f\u7b56", updated: "\u53cd\u6d17\u9322\u548c\u53cd\u6050\u878d\u8d44\u653f\u7b56 \u00b7 2026" },
  hi: { backLink: "\u2190 \u0935\u093e\u092a\u0938", pageTitle: "AML \u0928\u0940\u0924\u093f", updated: "\u092e\u0928\u0940 \u0932\u0949\u0928\u094d\u0921\u094d\u0930\u093f\u0902\u0917 \u0930\u094b\u0927\u0940 \u0928\u0940\u0924\u093f \u00b7 2026" },
  uk: { backLink: "\u2190 \u041d\u0430\u0437\u0430\u0434", pageTitle: "\u041f\u043e\u043b\u0456\u0442\u0438\u043a\u0430 AML", updated: "\u041f\u043e\u043b\u0456\u0442\u0438\u043a\u0430 \u043f\u0440\u043e\u0442\u0438\u0434\u0456\u0457 \u0432\u0456\u0434\u043c\u0438\u0432\u0430\u043d\u043d\u044e \u043a\u043e\u0448\u0442\u0456\u0432 \u00b7 2026" }
};

const LANGS_LIST = [
  {code:'en',flag:'\uD83C\uDDEC\uD83C\uDDE7',name:'EN'},
  {code:'lt',flag:'\uD83C\uDDF1\uD83C\uDDF9',name:'LT'},
  {code:'ru',flag:'\uD83C\uDDF7\uD83C\uDDFA',name:'RU'},
  {code:'de',flag:'\uD83C\uDDE9\uD83C\uDDEA',name:'DE'},
  {code:'pl',flag:'\uD83C\uDDF5\uD83C\uDDF1',name:'PL'},
  {code:'fr',flag:'\uD83C\uDDEB\uD83C\uDDF7',name:'FR'},
  {code:'tr',flag:'\uD83C\uDDF9\uD83C\uDDF7',name:'TR'},
  {code:'ar',flag:'\uD83C\uDDF8\uD83C\uDDE6',name:'AR'},
  {code:'zh',flag:'\uD83C\uDDE8\uD83C\uDDF3',name:'ZH'},
  {code:'hi',flag:'\uD83C\uDDEE\uD83C\uDDF3',name:'HI'},
  {code:'uk',flag:'\uD83C\uDDFA\uD83C\uDDE6',name:'UK'}
];

// Build translations: for DE/PL/FR/TR/AR/ZH/HI/UK: merge EN base + overrides
const allTranslations = Object.assign({}, TRANSLATIONS);
Object.keys(LANG_OVERRIDES).forEach(function(code) {
  allTranslations[code] = Object.assign({}, TRANSLATIONS.en, LANG_OVERRIDES[code]);
});

const translationsJSON = JSON.stringify(allTranslations);

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>AML Policy \u2014 HATHOR Royal Casino</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>${CSS}</style>
</head>
<body>
<header>
  <a class="logo" href="/">\u2b21 HATHOR</a>
  <div class="lang-bar" id="langBar"></div>
  <a class="back-link" href="/" data-i18n="backLink">\u2190 Back</a>
</header>
<div class="container">
  <div class="page-title" data-i18n="pageTitle">AML Policy</div>
  <div class="updated" data-i18n="updated">Anti-Money Laundering Policy \u00b7 2026</div>
  <div class="warning-box" data-i18n="warning">\uD83D\uDEA8 Zero tolerance policy against money laundering.</div>

  <h2 data-i18n="h1">1. Introduction</h2>
  <p data-i18n="p1"></p>

  <h2 data-i18n="h2">2. KYC Procedure</h2>
  <p data-i18n="p2"></p>
  <ul>
    <li data-i18n="li_withdraw"></li>
    <li data-i18n="li_threshold"></li>
    <li data-i18n="li_suspicious"></li>
  </ul>
  <div class="info-box">
    <strong data-i18n="docs_title">Required documents:</strong>
    <ul style="margin-top:8px">
      <li data-i18n="doc1"></li>
      <li data-i18n="doc2"></li>
      <li data-i18n="doc3"></li>
    </ul>
  </div>

  <h2 data-i18n="h3">3. Risk Assessment</h2>
  <p data-i18n="p3"></p>
  <ul>
    <li data-i18n-html="risk_low"></li>
    <li data-i18n-html="risk_mid"></li>
    <li data-i18n-html="risk_high"></li>
  </ul>

  <h2 data-i18n="h4">4. Monitoring and Reporting</h2>
  <p data-i18n="p4"></p>
  <ul>
    <li data-i18n="mon1"></li>
    <li data-i18n="mon2"></li>
    <li data-i18n="mon3"></li>
    <li data-i18n="mon4"></li>
  </ul>

  <h2 data-i18n="h5">5. Prohibited Jurisdictions</h2>
  <p data-i18n="p5"></p>
  <ul>
    <li data-i18n="jur1"></li>
    <li data-i18n="jur2"></li>
    <li data-i18n="jur3"></li>
  </ul>

  <h2 data-i18n="h6">6. Staff Training</h2>
  <p data-i18n="p6"></p>

  <h2 data-i18n="h7">7. Record Keeping</h2>
  <p data-i18n="p7"></p>

  <h2 data-i18n="h8">8. AML Officer</h2>
  <div class="info-box" data-i18n-html="contact_html"></div>
</div>
<footer data-i18n-html="footer">&copy; 2026 HATHOR Royal Casino</footer>

<script>
var PAGE_LANGS = ${translationsJSON};
var LANGS_LIST = ${JSON.stringify(LANGS_LIST)};

function applyLang(code) {
  var t = PAGE_LANGS[code] || PAGE_LANGS.en;
  localStorage.setItem('hrc_lang', code);
  document.documentElement.lang = code;
  document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var k = el.getAttribute('data-i18n');
    if (t[k] !== undefined) el.textContent = t[k];
  });
  document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
    var k = el.getAttribute('data-i18n-html');
    if (t[k] !== undefined) el.innerHTML = t[k];
  });
  document.querySelectorAll('.lang-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.lang === code);
  });
}

var langBar = document.getElementById('langBar');
LANGS_LIST.forEach(function(l) {
  var btn = document.createElement('button');
  btn.className = 'lang-btn';
  btn.dataset.lang = l.code;
  btn.textContent = l.flag + ' ' + l.name;
  btn.addEventListener('click', function() { applyLang(l.code); });
  langBar.appendChild(btn);
});

applyLang(localStorage.getItem('hrc_lang') || 'en');
</script>
</body>
</html>`;

fs.writeFileSync(OUT, HTML, 'utf8');
console.log('aml.html written — ' + (HTML.length / 1024).toFixed(1) + 'KB');
