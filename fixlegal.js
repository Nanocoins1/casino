/**
 * Regenerates terms.html and privacy.html with full legal content
 * Anjouan-compliant + GDPR-compliant + 11 languages
 */
const fs = require('fs');
const path = require('path');

const CSS = `
*{box-sizing:border-box;margin:0;padding:0;}
:root{--gold:#c9a84c;--gold2:#ffd680;--bg:#0a0806;--card:rgba(255,255,255,0.03);--border:rgba(201,168,76,0.15);--cream:#e8e2d4;}
body{background:var(--bg);color:var(--cream);font-family:'Inter',sans-serif;font-size:15px;line-height:1.75;}
header{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:1px solid var(--border);position:sticky;top:0;background:rgba(10,8,6,0.97);backdrop-filter:blur(10px);z-index:100;gap:10px;flex-wrap:wrap;}
.logo{font-family:'Cinzel',serif;font-size:18px;font-weight:700;color:var(--gold);text-decoration:none;letter-spacing:2px;}
.back-link{color:var(--gold);text-decoration:none;font-size:12px;border:1px solid var(--border);padding:5px 12px;border-radius:8px;}
.lang-bar{display:flex;gap:4px;flex-wrap:wrap;}
.lang-btn{background:none;border:1px solid rgba(201,168,76,0.2);border-radius:6px;color:rgba(232,226,212,0.5);font-size:11px;padding:3px 7px;cursor:pointer;transition:all .2s;}
.lang-btn.active{border-color:var(--gold);color:var(--gold);background:rgba(201,168,76,0.08);}
.lang-btn:hover{color:var(--cream);}
.container{max-width:820px;margin:0 auto;padding:48px 24px 80px;}
.page-title{font-family:'Cinzel',serif;font-size:26px;font-weight:700;color:var(--gold2);margin-bottom:6px;}
.updated{font-size:12px;color:rgba(201,168,76,0.4);margin-bottom:30px;letter-spacing:1px;}
.license-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(201,168,76,0.07);border:1px solid rgba(201,168,76,0.25);border-radius:8px;padding:10px 16px;margin-bottom:28px;font-size:12px;color:rgba(232,226,212,0.6);}
.license-badge strong{color:var(--gold);}
h2{font-family:'Cinzel',serif;font-size:14px;font-weight:700;color:var(--gold);margin:32px 0 10px;padding-bottom:8px;border-bottom:1px solid var(--border);letter-spacing:1px;}
p{margin-bottom:12px;color:rgba(232,226,212,0.8);}
ul,ol{margin:8px 0 14px 22px;color:rgba(232,226,212,0.8);}
li{margin-bottom:7px;}
.highlight-box{background:rgba(255,61,113,0.06);border:1px solid rgba(255,61,113,0.2);border-radius:10px;padding:16px 18px;margin:20px 0;color:#ffaaaa;font-size:13px;}
.info-box{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px 18px;margin:16px 0;font-size:13px;color:rgba(232,226,212,0.6);}
.rights-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin:16px 0;}
.right-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;}
.right-title{font-weight:600;color:var(--gold);font-size:13px;margin-bottom:5px;}
.right-desc{font-size:12px;color:rgba(232,226,212,0.55);line-height:1.5;}
table{width:100%;border-collapse:collapse;margin:14px 0;font-size:13px;}
th{background:rgba(201,168,76,0.08);color:var(--gold);padding:9px 12px;text-align:left;font-weight:600;border:1px solid var(--border);}
td{padding:9px 12px;border:1px solid var(--border);color:rgba(232,226,212,0.75);}
tr:nth-child(even) td{background:rgba(255,255,255,0.02);}
footer{text-align:center;padding:24px;border-top:1px solid var(--border);font-size:12px;color:rgba(201,168,76,0.3);}
`;

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"/>`;

const LANG_SYSTEM = `
<script>
var LANGS_LIST=[
  {code:'lt',flag:'🇱🇹',name:'LT'},{code:'en',flag:'🇬🇧',name:'EN'},
  {code:'ru',flag:'🇷🇺',name:'RU'},{code:'de',flag:'🇩🇪',name:'DE'},
  {code:'pl',flag:'🇵🇱',name:'PL'},{code:'fr',flag:'🇫🇷',name:'FR'},
  {code:'tr',flag:'🇹🇷',name:'TR'},{code:'ar',flag:'🇸🇦',name:'AR'},
  {code:'zh',flag:'🇨🇳',name:'ZH'},{code:'hi',flag:'🇮🇳',name:'HI'},
  {code:'uk',flag:'🇺🇦',name:'UK'}
];
var _lc=localStorage.getItem('hrc_lang')||'lt';
function applyLang(code){
  _lc=code; localStorage.setItem('hrc_lang',code);
  var t=PAGE_LANGS[code]||PAGE_LANGS.lt;
  document.querySelectorAll('[data-i18n]').forEach(function(el){var k=el.getAttribute('data-i18n');if(t[k]!==undefined)el.textContent=t[k];});
  document.querySelectorAll('[data-i18n-html]').forEach(function(el){var k=el.getAttribute('data-i18n-html');if(t[k]!==undefined)el.innerHTML=t[k];});
  document.documentElement.lang=code;
  document.documentElement.dir=code==='ar'?'rtl':'ltr';
  document.querySelectorAll('#langBar .lang-btn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-lang')===code);});
}
document.addEventListener('DOMContentLoaded',function(){
  var bar=document.getElementById('langBar');
  if(bar){LANGS_LIST.forEach(function(l){var b=document.createElement('button');b.className='lang-btn';b.setAttribute('data-lang',l.code);b.textContent=l.flag+' '+l.name;b.onclick=function(){applyLang(l.code);};bar.appendChild(b);});}
  applyLang(_lc);
});
</script>`;

// ═══════════════════════════════════════════════════════════
// TERMS & CONDITIONS
// ═══════════════════════════════════════════════════════════

const TERMS_LANGS = {
  lt: {
    pageTitle:'Naudojimo Sąlygos',
    updated:'Paskutinis atnaujinimas: 2026 m. balandžio 1 d.',
    licenseText:'Licencija: <strong>Anjouan Online Gaming Commission</strong> · Licencijos Nr.: <strong>[AJN-LICENSE-NUMBER]</strong> · Operatorius: <strong>HATHOR Royal Ltd.</strong>',
    warning:'⚠️ <strong>Svarbu:</strong> Naudodamiesi HATHOR Royal Casino patvirtinate, kad esate vyresni nei 18 metų ir kad azartiniai žaidimai yra teisėti jūsų jurisdikcijoje. Azartiniai žaidimai gali sukelti priklausomybę.',

    h1:'1. Bendrosios Nuostatos',
    p1a:'HATHOR Royal Casino (toliau – „Kazino", „mes", „mūsų") yra internetinė azartinių žaidimų platforma, valdoma HATHOR Royal Ltd., registruotos ir veikiančios pagal Anjouan Online Gaming Commission išduotą licenciją Nr. [AJN-LICENSE-NUMBER]. Šios sąlygos sudaro teisiškai privalomą sutartį tarp jūsų (toliau – „Žaidėjas", „jūs") ir HATHOR Royal Ltd.',
    p1b:'Naudodamiesi šia platforma patvirtinate, kad perskaitėte, supratote ir sutinkate su visomis šiomis sąlygomis. Jei nesutinkate – nedelsdami nutraukite naudojimąsi platforma. Kazino pasilieka teisę keisti šias sąlygas apie tai pranešdamas el. paštu arba platformoje.',
    p1c:'Platforma veikia žetonų (virtualios valiutos) pagrindu. 1 EUR = 100 žetonų. Žetonai neturi jokios teisinės pinigų galios už platformos ribų.',

    h2:'2. Tinkamumo Reikalavimai',
    li_18:'<strong>Amžius:</strong> Turite būti ne jaunesni kaip 18 metų (arba pilnametystės amžiaus pagal jūsų valstybės įstatymus, jei jis didesnis). Kazino pasilieka teisę bet kuriuo metu paprašyti amžiaus įrodymo.',
    li_legal:'<strong>Teisėtumas:</strong> Azartiniai žaidimai internetu turi būti teisėti jūsų šalyje ir jurisdikcijoje. Jūs esate asmeniškai atsakingas už šio fakto patikrinimą.',
    li_one:'<strong>Viena paskyra:</strong> Kiekvienam asmeniui leidžiama tik viena paskyra. Kelių paskyrų turėjimas yra draudžiamas ir sukels visų paskyrų blokavimą bei likusių lėšų konfiskavimą.',
    li_restricted:'<strong>Draudžiamos jurisdikcijos:</strong> Gyventojai iš šių valstybių negali naudotis platforma: Jungtinės Amerikos Valstijos, Jungtinė Karalystė, Prancūzija, Olandija, Ispanija, Italija, Belgija, Australija ir kitos jurisdikcijos, kuriose tokia veikla yra draudžiama. Kazino pasilieka teisę keisti šį sąrašą.',
    li_not_employee:'<strong>Darbuotojai:</strong> HATHOR Royal Ltd. darbuotojai, jų šeimos nariai ir partneriai negali naudotis platforma.',

    h3:'3. Paskyra ir Registracija',
    p3:'Paskyra sukuriama pateikiant vardą ir unikalų identifikatorių (UID). Prieš atlikdami pirmą išėmimą privalote atlikti KYC (tapatybės patvirtinimo) procedūrą.',
    li_one_acc:'Kiekvienam asmeniui – tik viena paskyra. Pažeidimas sukelia blokavimą.',
    li_no_transfer:'Paskyra yra asmeninė ir negali būti perduota, parduota ar nuomojama tretiesiems asmenims.',
    li_security:'Jūs esate atsakingi už savo prisijungimo duomenų saugumą. Apie bet kokį neleistiną prieigą praneškite nedelsiant.',
    li_real_info:'Pateikite tik teisingą ir tikslią informaciją. Melagingos informacijos pateikimas yra pagrindas blokuoti paskyrą ir konfiskuoti lėšas.',
    li_kyc:'KYC procedūra reikalauja pateikti galiojantį asmens tapatybę patvirtinantį dokumentą, gyvenamosios vietos įrodymą ir asmenukę su dokumentu.',

    h4:'4. Mokėjimai ir Išėmimai',
    p4:'Kazino priima mokėjimus kriptovaliuta (BTC, ETH, USDT, BNB, TRX) ir banko kortele per Stripe. Visi kursai ir mokesčiai nurodyti kasininko puslapyje.',
    li_dep_min:'Minimalus depozitas: 1 000 žetonų (≈ 10 EUR).',
    li_wd_min:'Minimalus išėmimas: 5 000 žetonų (≈ 50 EUR).',
    li_wd_kyc:'Išėmimai vykdomi tik po sėkmingos KYC procedūros.',
    li_wd_time:'Išėmimai apdorojami per 24 valandas darbo dienomis.',
    li_wd_method:'Išėmimai vykdomi tik į tą pačią mokėjimo priemonę, kuria buvo atliktas depozitas, arba kriptovaliutos piniginę po KYC patikrinimo.',
    li_wd_refuse:'Kazino pasilieka teisę atidėti arba atsisakyti vykdyti išėmimą, jei yra pagrįstų įtarimų dėl sukčiavimo, pinigų plovimo arba kitų pažeidimų.',
    li_wd_fee:'Kazino netaiko išėmimo mokesčių, tačiau tinklo arba banko mokesčiai gali būti taikomi priklausomai nuo mokėjimo metodo.',

    h5:'5. Bonusai ir Akcijos',
    p5:'Visi bonusai yra susieti su apyvartos reikalavimu (wagering requirement). Prieš atlikdami išėmimą, gavę bonusą, turite pastatyti reikiamą sumą.',
    li_b1:'Sveikinamasis bonusas (5 000 žetonų): apyvartos reikalavimas – 75 000 žetonų.',
    li_b2:'Kasdieniai bonusai: apyvartos reikalavimas – 10 kartų nuo bonuso sumos.',
    li_b3:'Bonusai negali būti išimamai prieš įvykdant apyvartos reikalavimą.',
    li_b4:'Kazino pasilieka teisę keisti, sustabdyti arba atšaukti bet kurią akciją pranešdamas apie tai iš anksto.',
    li_b5:'Bonusų piktnaudžiavimas (kelios paskyros, koordinuoti statymai ir pan.) sukels paskyrų blokavimą.',

    h6:'6. Atsakingas Žaidimas',
    p6:'HATHOR Royal Casino yra įsipareigojęs atsakingo žaidimo principams. Mes siūlome šiuos įrankius:',
    li_rg1:'Savanoriškas savęs pašalinimas (self-exclusion) – nuo 1 dienos iki neriboto laikotarpio.',
    li_rg2:'Depozito limitai – dienos ir savaitės.',
    li_rg3:'Žaidimo laiko priminimai.',
    li_rg4:'Nuorodos į pagalbos organizacijas: GamCare (gamcare.org.uk), BeGambleAware (begambleaware.org), Gamblers Anonymous.',
    li_rg5:'Jei manote, kad turite azartinių žaidimų problemą – skambinkite pagalbos linija arba kreipkitės į specialistus. Žaidimas turėtų būti pramoga, ne pajamų šaltinis.',

    h7:'7. KYC ir Kovos su Pinigų Plovimu (AML) Politika',
    p7:'Kazino laikosi griežtos KYC (žinok savo klientą) ir AML (kova su pinigų plovimu) politikos pagal Anjouan licencijos reikalavimus.',
    li_kyc1:'Visi žaidėjai privalo atlikti KYC procedūrą prieš atliekant pirmą išėmimą.',
    li_kyc2:'Reikalingi dokumentai: galiojantis pasas arba asmens tapatybės kortelė (priekis ir galas), gyvenamosios vietos įrodymas (ne senesnis nei 3 mėnesiai), asmenukė su dokumentu.',
    li_kyc3:'Depozitai viršijantys 5 000 EUR ekvivalentą per mėnesį reikalauja papildomų paaiškinimų dėl lėšų kilmės.',
    li_kyc4:'Įtartinos transakcijos bus praneštos kompetentingoms institucijoms pagal taikytinus įstatymus.',
    li_kyc5:'KYC procedūra atliekama per 48 valandas nuo dokumentų pateikimo.',

    h8:'8. Draudžiama Veikla',
    p8:'Draudžiama naudotis platforma šiais tikslais:',
    li_p1:'Pinigų plovimas, terorizmo finansavimas arba bet kokia kita neteisėta finansinė veikla.',
    li_p2:'Sukčiavimas, įskaitant kelių paskyrų naudojimą, bonusų piktnaudžiavimą ar koordinuotus statymus.',
    li_p3:'Programinės įrangos naudojimas automatizuotiems žaidimams (botai), nebent tai aiškiai leidžiama.',
    li_p4:'Bet kokios platformos sistemos, algoritmo ar RNG pažeidžiamumų išnaudojimas.',
    li_p5:'Trukdymas kitiems žaidėjams arba kazino darbuotojams.',
    li_p6:'Naudojimasis platforma iš draudžiamų jurisdikcijų.',
    p8b:'Pažeidus šias taisykles, paskyra bus nedelsiant blokuojama, visos lėšos konfiskuojamos ir apie tai gali būti pranešta kompetentingoms institucijoms.',

    h9:'9. Provably Fair ir RNG',
    p9:'HATHOR Royal Casino naudoja kriptografiškai saugią atsitiktinių skaičių generavimo (RNG) sistemą, pagrįstą HMAC-SHA256 algoritmu. Kiekvienas žaidimo raundas yra patikrinamas ir nepriklausomai verifikuojamas.',
    li_pf1:'Serverio sėkla sugeneruojama prieš kiekvieną raundą naudojant crypto.randomBytes(32).',
    li_pf2:'Prieš raundą žaidėjui atskleidžiamas tik SHA-256 serverio sėklos maišas – ne pati sėkla.',
    li_pf3:'Po raundo atskleidžiama serverio sėkla, kurią žaidėjas gali naudoti rezultato patikrinimui.',
    li_pf4:'Verifikacijos įrankis prieinamas puslapyje /provably-fair.html.',

    h10:'10. Intelektinė Nuosavybė',
    p10:'Visas HATHOR Royal Casino turinys, įskaitant, bet neapsiribojant, logotipais, grafiniais elementais, programine įranga, žaidimais ir tekstais, yra HATHOR Royal Ltd. arba jos licencijų davėjų intelektinė nuosavybė. Draudžiama kopijuoti, platinti ar naudoti komerciniais tikslais be raštiško leidimo.',

    h11:'11. Atsakomybės Apribojimas',
    p11a:'HATHOR Royal Casino platforma teikiama „tokia, kokia yra". Kazino negarantuoja nepertraukiamo, be klaidų ar saugaus paslaugos veikimo.',
    p11b:'Kazino neatsako už: (a) netiesioginius, atsitiktinius ar pasekminius nuostolius; (b) pelno praradimą; (c) techninių gedimų sukeltus nuostolius; (d) trečiųjų šalių veiksmus.',
    p11c:'Bendra kazino atsakomybė žaidėjui negali viršyti sumos, kurią žaidėjas deponavo per paskutinius 30 dienų.',

    h12:'12. Taikoma Teisė ir Ginčų Sprendimas',
    p12a:'Šios sąlygos reglamentuojamos ir aiškinamos pagal Anjouan (Komorų Salų) įstatymus.',
    p12b:'Bet kokie ginčai, kylantys iš ar susiję su šiomis sąlygomis, pirmiausia sprendžiami derybų keliu. Jei per 30 dienų susitarti nepavyksta – perduodami į Anjouan Online Gaming Commission arbitražą.',
    p12c:'Žaidėjas sutinka, kad bet koks teismo procesas vykstų Anjouan (Komorų Salų) jurisdikcijoje.',
    p12d:'Dėl galimų klaidų ir techninių gedimų žaidėjas pirmiausia turi kreiptis į kazino klientų aptarnavimą per 72 valandas nuo incidento.',

    h13:'13. Void Where Prohibited',
    p13:'Šios paslaugos yra negaliojančios ten, kur tai draudžia vietos, valstijos, nacionaliniai arba tarptautiniai įstatymai. Žaidėjas prisiima visą atsakomybę už naudojimosi platformą teisėtumo savo jurisdikcijoje patikrinimą.',

    h14:'14. Pakeitimai',
    p14:'Kazino pasilieka teisę keisti šias sąlygas bet kuriuo metu. Apie reikšmingus pakeitimus bus pranešta el. paštu arba per platformą ne vėliau kaip prieš 14 dienų. Toliau naudodamiesi platforma po pakeitimų įsigaliojimo patvirtinate sutikimą su naujomis sąlygomis.',

    h15:'15. Kontaktai',
    p15:'Dėl klausimų, skundų ar pranešimų kreipkitės: <strong>support@hathor.casino</strong> | Klientų aptarnavimas: 24/7 live chat platformoje | Atsakomybės klausimais: HATHOR Royal Ltd., Anjouan, Komorų Salų Sąjunga.',
  },

  en: {
    pageTitle:'Terms and Conditions',
    updated:'Last updated: April 1, 2026',
    licenseText:'License: <strong>Anjouan Online Gaming Commission</strong> · License No.: <strong>[AJN-LICENSE-NUMBER]</strong> · Operator: <strong>HATHOR Royal Ltd.</strong>',
    warning:'⚠️ <strong>Important:</strong> By using HATHOR Royal Casino you confirm you are over 18 years of age and that online gambling is legal in your jurisdiction. Gambling can be addictive — play responsibly.',

    h1:'1. General Provisions',
    p1a:'HATHOR Royal Casino (hereinafter – "Casino", "we", "our") is an online gambling platform operated by HATHOR Royal Ltd., licensed and regulated by the Anjouan Online Gaming Commission under License No. [AJN-LICENSE-NUMBER]. These Terms and Conditions constitute a legally binding agreement between you (hereinafter – "Player", "you") and HATHOR Royal Ltd.',
    p1b:'By using this platform you confirm that you have read, understood and agree to be bound by these Terms. If you do not agree, please cease use of the platform immediately. The Casino reserves the right to amend these Terms at any time with notice.',
    p1c:'The platform operates on a token-based system. 1 EUR = 100 tokens. Tokens have no legal monetary value outside the platform.',

    h2:'2. Eligibility Requirements',
    li_18:'<strong>Age:</strong> You must be at least 18 years old (or the legal age of majority in your jurisdiction if higher). The Casino reserves the right to request age verification at any time.',
    li_legal:'<strong>Legality:</strong> Online gambling must be legal in your country and jurisdiction. You are solely responsible for verifying this.',
    li_one:'<strong>One Account:</strong> Each person is permitted only one account. Multiple accounts will result in all accounts being blocked and remaining funds confiscated.',
    li_restricted:'<strong>Restricted Jurisdictions:</strong> Residents of the following territories may not use the platform: United States, United Kingdom, France, Netherlands, Spain, Italy, Belgium, Australia, and other jurisdictions where such activity is prohibited. The Casino reserves the right to update this list.',
    li_not_employee:'<strong>Employees:</strong> Employees of HATHOR Royal Ltd., their family members and associates are prohibited from using the platform.',

    h3:'3. Account and Registration',
    p3:'An account is created by providing a username and a unique identifier (UID). Before making the first withdrawal, players must complete the KYC (Know Your Customer) verification procedure.',
    li_one_acc:'One account per person. Violations result in blocking.',
    li_no_transfer:'The account is personal and may not be transferred, sold or rented to third parties.',
    li_security:'You are responsible for the security of your login credentials. Report any unauthorised access immediately.',
    li_real_info:'Provide only accurate and truthful information. Providing false information is grounds for account blocking and fund confiscation.',
    li_kyc:'KYC verification requires a valid government-issued photo ID, proof of address, and a selfie with the document.',

    h4:'4. Deposits and Withdrawals',
    p4:'The Casino accepts cryptocurrency payments (BTC, ETH, USDT, BNB, TRX) and card payments via Stripe. All rates and fees are displayed on the Cashier page.',
    li_dep_min:'Minimum deposit: 1,000 tokens (≈ €10).',
    li_wd_min:'Minimum withdrawal: 5,000 tokens (≈ €50).',
    li_wd_kyc:'Withdrawals are processed only after successful KYC verification.',
    li_wd_time:'Withdrawals are processed within 24 hours on business days.',
    li_wd_method:'Withdrawals are made to the same payment method used for the deposit, or to a verified cryptocurrency wallet after KYC.',
    li_wd_refuse:'The Casino reserves the right to delay or refuse a withdrawal if there are reasonable grounds for suspicion of fraud, money laundering or other violations.',
    li_wd_fee:'The Casino does not charge withdrawal fees; however, network or bank fees may apply depending on the payment method.',

    h5:'5. Bonuses and Promotions',
    p5:'All bonuses are subject to wagering requirements. Before withdrawing bonus funds, you must wager the required amount.',
    li_b1:'Welcome bonus (5,000 tokens): wagering requirement – 75,000 tokens.',
    li_b2:'Daily bonuses: wagering requirement – 10× the bonus amount.',
    li_b3:'Bonuses may not be withdrawn before the wagering requirement is met.',
    li_b4:'The Casino reserves the right to modify, suspend or cancel any promotion with advance notice.',
    li_b5:'Bonus abuse (multiple accounts, coordinated betting, etc.) will result in account blocking.',

    h6:'6. Responsible Gambling',
    p6:'HATHOR Royal Casino is committed to responsible gambling principles. We offer the following tools:',
    li_rg1:'Voluntary self-exclusion – from 1 day to an unlimited period.',
    li_rg2:'Deposit limits – daily and weekly.',
    li_rg3:'Session time reminders.',
    li_rg4:'Links to support organisations: GamCare (gamcare.org.uk), BeGambleAware (begambleaware.org), Gamblers Anonymous.',
    li_rg5:'If you believe you may have a gambling problem, please call a helpline or seek professional help. Gambling should be entertainment, not a source of income.',

    h7:'7. KYC and Anti-Money Laundering (AML) Policy',
    p7:'The Casino adheres to strict KYC (Know Your Customer) and AML (Anti-Money Laundering) policies in accordance with Anjouan license requirements.',
    li_kyc1:'All players must complete KYC verification before making their first withdrawal.',
    li_kyc2:'Required documents: valid passport or national ID (front and back), proof of address (no older than 3 months), selfie with document.',
    li_kyc3:'Deposits exceeding the equivalent of €5,000 per month may require additional explanation of the source of funds.',
    li_kyc4:'Suspicious transactions will be reported to competent authorities in accordance with applicable laws.',
    li_kyc5:'KYC verification is completed within 48 hours of document submission.',

    h8:'8. Prohibited Activities',
    p8:'It is prohibited to use the platform for:',
    li_p1:'Money laundering, terrorist financing or any other illegal financial activity.',
    li_p2:'Fraud, including use of multiple accounts, bonus abuse or coordinated betting.',
    li_p3:'Use of software for automated play (bots), unless expressly permitted.',
    li_p4:'Exploitation of any platform system, algorithm or RNG vulnerabilities.',
    li_p5:'Harassment of other players or Casino staff.',
    li_p6:'Use of the platform from restricted jurisdictions.',
    p8b:'Violations will result in immediate account blocking, confiscation of all funds, and may be reported to competent authorities.',

    h9:'9. Provably Fair and RNG',
    p9:'HATHOR Royal Casino uses a cryptographically secure Random Number Generation (RNG) system based on the HMAC-SHA256 algorithm. Every game round is verifiable and independently verifiable by the player.',
    li_pf1:'The server seed is generated before each round using crypto.randomBytes(32).',
    li_pf2:'Before the round, only the SHA-256 hash of the server seed is disclosed to the player — not the seed itself.',
    li_pf3:'After the round, the server seed is revealed and can be used by the player to verify the result.',
    li_pf4:'A verification tool is available at /provably-fair.html.',

    h10:'10. Intellectual Property',
    p10:'All content on HATHOR Royal Casino, including but not limited to logos, graphics, software, games and text, is the intellectual property of HATHOR Royal Ltd. or its licensors. Copying, distributing or using for commercial purposes without written permission is strictly prohibited.',

    h11:'11. Limitation of Liability',
    p11a:'The HATHOR Royal Casino platform is provided "as is". The Casino does not guarantee uninterrupted, error-free or secure service.',
    p11b:'The Casino is not liable for: (a) indirect, incidental or consequential damages; (b) loss of profits; (c) losses caused by technical failures; (d) actions of third parties.',
    p11c:'The Casino\'s total liability to a Player shall not exceed the amount deposited by the Player in the preceding 30 days.',

    h12:'12. Governing Law and Dispute Resolution',
    p12a:'These Terms are governed by and construed in accordance with the laws of Anjouan, Union of Comoros.',
    p12b:'Any disputes arising from or in connection with these Terms shall first be resolved through negotiation. If no agreement is reached within 30 days, the dispute shall be submitted to arbitration before the Anjouan Online Gaming Commission.',
    p12c:'The Player agrees that any legal proceedings shall take place under the jurisdiction of Anjouan, Union of Comoros.',
    p12d:'In the event of alleged errors or technical malfunctions, the Player must contact Casino customer support within 72 hours of the incident.',

    h13:'13. Void Where Prohibited',
    p13:'These services are void where prohibited by local, state, national or international law. The Player assumes full responsibility for verifying the legality of using the platform in their jurisdiction.',

    h14:'14. Amendments',
    p14:'The Casino reserves the right to amend these Terms at any time. Material changes will be communicated by email or through the platform no less than 14 days before taking effect. Continued use of the platform after changes take effect constitutes acceptance of the updated Terms.',

    h15:'15. Contact',
    p15:'For questions, complaints or notices, please contact: <strong>support@hathor.casino</strong> | Customer support: 24/7 live chat on the platform | Legal matters: HATHOR Royal Ltd., Anjouan, Union of Comoros.',
  },

  ru: {
    pageTitle:'Условия использования',
    updated:'Последнее обновление: 1 апреля 2026 г.',
    licenseText:'Лицензия: <strong>Anjouan Online Gaming Commission</strong> · Номер лицензии: <strong>[AJN-LICENSE-NUMBER]</strong> · Оператор: <strong>HATHOR Royal Ltd.</strong>',
    warning:'⚠️ <strong>Важно:</strong> Используя HATHOR Royal Casino, вы подтверждаете, что вам исполнилось 18 лет и что онлайн-гемблинг законен в вашей юрисдикции.',
    h1:'1. Общие положения', p1a:'HATHOR Royal Casino — онлайн-платформа для азартных игр, управляемая HATHOR Royal Ltd., лицензированной Anjouan Online Gaming Commission (лицензия № [AJN-LICENSE-NUMBER]). Используя платформу, вы соглашаетесь с настоящими Условиями.', p1b:'Платформа работает на основе токенов (виртуальная валюта). 1 EUR = 100 токенов.', p1c:'',
    h2:'2. Требования к участникам', li_18:'<strong>Возраст:</strong> Не менее 18 лет.', li_legal:'Онлайн-гемблинг должен быть законным в вашей стране.', li_one:'Одна учётная запись на человека.', li_restricted:'Жители США, Великобритании, Франции, Нидерландов, Испании, Италии, Бельгии, Австралии и других запрещённых юрисдикций не могут использовать платформу.', li_not_employee:'Сотрудники HATHOR Royal Ltd. и члены их семей не могут участвовать.',
    h3:'3. Аккаунт и регистрация', p3:'Перед первым выводом необходимо пройти процедуру KYC.', li_one_acc:'Один аккаунт на человека.', li_no_transfer:'Аккаунт не подлежит передаче третьим лицам.', li_security:'Вы несёте ответственность за безопасность своих данных.', li_real_info:'Предоставляйте только достоверную информацию.', li_kyc:'KYC требует: действительный документ, удостоверяющий личность, подтверждение адреса, селфи с документом.',
    h4:'4. Депозиты и выводы', p4:'Принимаются криптовалюты (BTC, ETH, USDT, BNB, TRX) и банковские карты через Stripe.', li_dep_min:'Минимальный депозит: 1 000 токенов (≈ €10).', li_wd_min:'Минимальный вывод: 5 000 токенов (≈ €50).', li_wd_kyc:'Выводы только после прохождения KYC.', li_wd_time:'Обработка выводов: до 24 часов в рабочие дни.', li_wd_method:'Вывод производится тем же способом, что и пополнение, или на верифицированный крипто-кошелёк.', li_wd_refuse:'Казино вправе задержать или отклонить вывод при подозрении в мошенничестве или отмывании денег.', li_wd_fee:'Казино не взимает комиссию за вывод; сетевые комиссии могут применяться.',
    h5:'5. Бонусы', p5:'Все бонусы имеют требования по отыгрышу.', li_b1:'Приветственный бонус (5 000 токенов): отыгрыш — 75 000 токенов.', li_b2:'Ежедневные бонусы: отыгрыш — 10× от суммы бонуса.', li_b3:'Вывод бонусов до выполнения отыгрыша запрещён.', li_b4:'Казино вправе изменить или отменить акцию с уведомлением.', li_b5:'Злоупотребление бонусами влечёт блокировку аккаунта.',
    h6:'6. Ответственная игра', p6:'Мы предлагаем инструменты ответственной игры:', li_rg1:'Самоисключение от 1 дня до неограниченного срока.', li_rg2:'Лимиты депозита — дневные и недельные.', li_rg3:'Напоминания о времени сессии.', li_rg4:'Ссылки на организации помощи: GamCare, BeGambleAware, Gamblers Anonymous.', li_rg5:'Если вы считаете, что у вас есть проблемы с азартными играми — обратитесь за профессиональной помощью.',
    h7:'7. KYC и AML политика', p7:'Казино соблюдает строгую политику KYC и AML согласно требованиям лицензии Anjouan.', li_kyc1:'KYC обязателен перед первым выводом.', li_kyc2:'Документы: паспорт или удостоверение личности, подтверждение адреса, селфи.', li_kyc3:'Депозиты свыше €5 000/мес. требуют подтверждения источника средств.', li_kyc4:'Подозрительные транзакции передаются в компетентные органы.', li_kyc5:'Верификация KYC — до 48 часов.',
    h8:'8. Запрещённые действия', p8:'Запрещается:', li_p1:'Отмывание денег и финансирование терроризма.', li_p2:'Мошенничество, включая мультиаккаунтинг и злоупотребление бонусами.', li_p3:'Использование ботов и автоматизированного ПО.', li_p4:'Эксплуатация уязвимостей системы.', li_p5:'Преследование других игроков или сотрудников.', li_p6:'Использование платформы из запрещённых юрисдикций.', p8b:'Нарушения влекут немедленную блокировку и конфискацию средств.',
    h9:'9. Provably Fair и RNG', p9:'Используется HMAC-SHA256 криптографически защищённая система RNG. Каждый раунд поддаётся проверке.', li_pf1:'Серверное зерно генерируется через crypto.randomBytes(32).', li_pf2:'До раунда раскрывается только SHA-256 хэш серверного зерна.', li_pf3:'После раунда серверное зерно раскрывается для проверки.', li_pf4:'Инструмент проверки доступен на /provably-fair.html.',
    h10:'10. Интеллектуальная собственность', p10:'Всё содержимое платформы является собственностью HATHOR Royal Ltd. Копирование без разрешения запрещено.',
    h11:'11. Ограничение ответственности', p11a:'Платформа предоставляется «как есть». Казино не гарантирует бесперебойную работу.', p11b:'Казино не несёт ответственности за косвенные убытки, упущенную выгоду или технические сбои.', p11c:'Совокупная ответственность казино не превышает сумму депозитов игрока за последние 30 дней.',
    h12:'12. Применимое право и разрешение споров', p12a:'Настоящие Условия регулируются законодательством Анжуана (Коморские острова).', p12b:'Споры решаются путём переговоров. При неудаче — в арбитраже Anjouan Online Gaming Commission.', p12c:'Судебные разбирательства проводятся в юрисдикции Анжуана, Коморские острова.', p12d:'Претензии по техническим сбоям подаются в поддержку в течение 72 часов.',
    h13:'13. Недействительность в запрещённых юрисдикциях', p13:'Услуги недействительны там, где запрещены местным или национальным законодательством.',
    h14:'14. Изменения', p14:'Казино вправе изменять Условия. О существенных изменениях уведомляется за 14 дней.',
    h15:'15. Контакты', p15:'По вопросам обращайтесь: <strong>support@hathor.casino</strong> | Поддержка 24/7 в чате платформы.',
  },

  de: {
    pageTitle:'Allgemeine Geschäftsbedingungen',
    updated:'Zuletzt aktualisiert: 1. April 2026',
    licenseText:'Lizenz: <strong>Anjouan Online Gaming Commission</strong> · Lizenznr.: <strong>[AJN-LICENSE-NUMBER]</strong> · Betreiber: <strong>HATHOR Royal Ltd.</strong>',
    warning:'⚠️ <strong>Wichtig:</strong> Durch die Nutzung von HATHOR Royal Casino bestätigen Sie, dass Sie mindestens 18 Jahre alt sind und dass Online-Glücksspiel in Ihrer Jurisdiktion legal ist.',
    h1:'1. Allgemeine Bestimmungen', p1a:'HATHOR Royal Casino ist eine Online-Glücksspielplattform, betrieben von HATHOR Royal Ltd., lizenziert von der Anjouan Online Gaming Commission (Lizenz-Nr. [AJN-LICENSE-NUMBER]).', p1b:'Mit der Nutzung der Plattform stimmen Sie diesen AGB zu. Die Plattform basiert auf einem Token-System: 1 EUR = 100 Token.', p1c:'',
    h2:'2. Teilnahmevoraussetzungen', li_18:'<strong>Alter:</strong> Mindestalter 18 Jahre.', li_legal:'Online-Glücksspiel muss in Ihrem Land legal sein.', li_one:'Ein Konto pro Person.', li_restricted:'Bewohner folgender Regionen dürfen die Plattform nicht nutzen: USA, UK, Frankreich, Niederlande, Spanien, Italien, Belgien, Australien.', li_not_employee:'Mitarbeiter von HATHOR Royal Ltd. und deren Angehörige sind ausgeschlossen.',
    h3:'3. Konto und Registrierung', p3:'Vor der ersten Auszahlung ist eine KYC-Verifizierung erforderlich.', li_one_acc:'Ein Konto pro Person.', li_no_transfer:'Das Konto ist nicht übertragbar.', li_security:'Schützen Sie Ihre Zugangsdaten.', li_real_info:'Geben Sie nur wahrheitsgemäße Angaben an.', li_kyc:'KYC erfordert: Lichtbildausweis, Adressnachweis, Selfie mit Dokument.',
    h4:'4. Ein- und Auszahlungen', p4:'Akzeptierte Zahlungsmethoden: Kryptowährungen (BTC, ETH, USDT, BNB, TRX) und Karte via Stripe.', li_dep_min:'Mindesteinzahlung: 1.000 Token (≈ €10).', li_wd_min:'Mindestabhebung: 5.000 Token (≈ €50).', li_wd_kyc:'Auszahlungen nur nach KYC-Verifizierung.', li_wd_time:'Bearbeitungszeit: bis zu 24 Stunden an Werktagen.', li_wd_method:'Auszahlung erfolgt über dieselbe Methode wie die Einzahlung.', li_wd_refuse:'Das Casino behält sich vor, Auszahlungen bei Betrugsverdacht zu verzögern.', li_wd_fee:'Keine Casino-Auszahlungsgebühren; Netzwerkgebühren können anfallen.',
    h5:'5. Boni', p5:'Alle Boni unterliegen Umsatzbedingungen.', li_b1:'Willkommensbonus (5.000 Token): Umsatzbedingung 75.000 Token.', li_b2:'Tägliche Boni: 10× des Bonusbetrags.', li_b3:'Abhebung vor Erfüllung der Umsatzbedingung nicht möglich.', li_b4:'Das Casino behält sich Änderungen von Aktionen vor.', li_b5:'Bonusmissbrauch führt zur Kontosperrung.',
    h6:'6. Verantwortungsvolles Spielen', p6:'Wir bieten folgende Werkzeuge:', li_rg1:'Freiwillige Selbstsperre ab 1 Tag.', li_rg2:'Einzahlungslimits.', li_rg3:'Sitzungszeitenerinnerungen.', li_rg4:'Links zu Hilfsorganisationen: GamCare, BeGambleAware.', li_rg5:'Bei Spielsucht: Suchen Sie professionelle Hilfe.',
    h7:'7. KYC und AML', p7:'Wir befolgen strenge KYC- und AML-Richtlinien gemäß Anjouan-Lizenzanforderungen.', li_kyc1:'KYC vor erster Auszahlung.', li_kyc2:'Dokumente: Ausweis, Adressnachweis, Selfie.', li_kyc3:'Einzahlungen über €5.000/Monat erfordern Nachweis der Mittelherkunft.', li_kyc4:'Verdächtige Transaktionen werden gemeldet.', li_kyc5:'KYC-Bearbeitung: bis 48 Stunden.',
    h8:'8. Verbotene Aktivitäten', p8:'Verboten ist:', li_p1:'Geldwäsche und Terrorismusfinanzierung.', li_p2:'Betrug und Mehrfachkonten.', li_p3:'Bots und automatisierte Software.', li_p4:'Ausnutzung von Systemschwachstellen.', li_p5:'Belästigung anderer Spieler.', li_p6:'Nutzung aus gesperrten Jurisdiktionen.', p8b:'Verstöße führen zur sofortigen Sperrung und Einziehung aller Mittel.',
    h9:'9. Provably Fair und RNG', p9:'HMAC-SHA256-basiertes kryptografisch sicheres RNG-System.', li_pf1:'Serverseed via crypto.randomBytes(32).', li_pf2:'Vor der Runde wird nur der SHA-256-Hash des Serverseeds offengelegt.', li_pf3:'Nach der Runde wird der Serverseed zur Verifikation offengelegt.', li_pf4:'Verifizierungstool unter /provably-fair.html.',
    h10:'10. Geistiges Eigentum', p10:'Alle Inhalte sind Eigentum von HATHOR Royal Ltd. Kopieren ohne Erlaubnis ist untersagt.',
    h11:'11. Haftungsbeschränkung', p11a:'Die Plattform wird „wie besehen" bereitgestellt.', p11b:'Keine Haftung für indirekte Schäden oder Gewinnausfälle.', p11c:'Gesamthaftung begrenzt auf Einzahlungen der letzten 30 Tage.',
    h12:'12. Anwendbares Recht und Streitbeilegung', p12a:'Diese AGB unterliegen dem Recht von Anjouan, Union der Komoren.', p12b:'Streitigkeiten werden zunächst verhandelt, dann ggf. an die Anjouan OGC-Schiedsstelle weitergeleitet.', p12c:'Gerichtsstand: Anjouan, Union der Komoren.', p12d:'Technische Beschwerden müssen innerhalb von 72 Stunden eingereicht werden.',
    h13:'13. Ungültig wo verboten', p13:'Diese Dienste sind ungültig, wo sie durch lokales oder nationales Recht verboten sind.',
    h14:'14. Änderungen', p14:'Änderungen werden 14 Tage im Voraus mitgeteilt.',
    h15:'15. Kontakt', p15:'Kontakt: <strong>support@hathor.casino</strong> | 24/7-Support im Live-Chat.',
  },

  pl: {
    pageTitle:'Regulamin',
    updated:'Ostatnia aktualizacja: 1 kwietnia 2026',
    licenseText:'Licencja: <strong>Anjouan Online Gaming Commission</strong> · Nr licencji: <strong>[AJN-LICENSE-NUMBER]</strong> · Operator: <strong>HATHOR Royal Ltd.</strong>',
    warning:'⚠️ <strong>Ważne:</strong> Korzystając z HATHOR Royal Casino potwierdzasz, że masz co najmniej 18 lat i że hazard online jest legalny w Twojej jurysdykcji.',
    h1:'1. Postanowienia ogólne', p1a:'HATHOR Royal Casino to platforma hazardu online prowadzona przez HATHOR Royal Ltd., posiadającą licencję Anjouan Online Gaming Commission nr [AJN-LICENSE-NUMBER].', p1b:'Korzystając z platformy, akceptujesz niniejszy Regulamin. Platforma działa w oparciu o system żetonów: 1 EUR = 100 żetonów.', p1c:'',
    h2:'2. Wymagania uczestnictwa', li_18:'<strong>Wiek:</strong> Minimum 18 lat.', li_legal:'Hazard online musi być legalny w Twoim kraju.', li_one:'Jedno konto na osobę.', li_restricted:'Mieszkańcy USA, Wielkiej Brytanii, Francji, Holandii, Hiszpanii, Włoch, Belgii, Australii i innych zabronionych jurysdykcji nie mogą korzystać z platformy.', li_not_employee:'Pracownicy HATHOR Royal Ltd. i ich rodziny są wykluczeni.',
    h3:'3. Konto i rejestracja', p3:'Przed pierwszą wypłatą wymagana jest weryfikacja KYC.', li_one_acc:'Jedno konto na osobę.', li_no_transfer:'Konto jest niezbywalne.', li_security:'Odpowiadasz za bezpieczeństwo swoich danych logowania.', li_real_info:'Podawaj tylko prawdziwe informacje.', li_kyc:'KYC wymaga: ważnego dokumentu tożsamości, potwierdzenia adresu, selfie z dokumentem.',
    h4:'4. Wpłaty i wypłaty', p4:'Akceptowane: kryptowaluty (BTC, ETH, USDT, BNB, TRX) i karta przez Stripe.', li_dep_min:'Minimalna wpłata: 1 000 żetonów (≈ €10).', li_wd_min:'Minimalna wypłata: 5 000 żetonów (≈ €50).', li_wd_kyc:'Wypłaty tylko po weryfikacji KYC.', li_wd_time:'Czas realizacji: do 24 godzin w dni robocze.', li_wd_method:'Wypłata tą samą metodą co wpłata.', li_wd_refuse:'Kasyno może opóźnić lub odmówić wypłaty w przypadku podejrzenia oszustwa.', li_wd_fee:'Kasyno nie pobiera opłat za wypłatę; mogą obowiązywać opłaty sieciowe.',
    h5:'5. Bonusy', p5:'Wszystkie bonusy podlegają wymaganiom dotyczącym obrotu.', li_b1:'Bonus powitalny (5 000 żetonów): obrót – 75 000 żetonów.', li_b2:'Bonusy dzienne: obrót – 10× kwoty bonusu.', li_b3:'Wypłata bonusu przed spełnieniem wymogu obrotu jest niemożliwa.', li_b4:'Kasyno zastrzega prawo do zmiany promocji.', li_b5:'Nadużywanie bonusów skutkuje blokadą konta.',
    h6:'6. Odpowiedzialna gra', p6:'Oferujemy narzędzia odpowiedzialnej gry:', li_rg1:'Dobrowolne samowykluczenie od 1 dnia.', li_rg2:'Limity depozytów dzienne i tygodniowe.', li_rg3:'Przypomnienia o czasie sesji.', li_rg4:'Linki do organizacji pomocowych: GamCare, BeGambleAware.', li_rg5:'W razie problemów z hazardem – szukaj pomocy specjalistycznej.',
    h7:'7. KYC i AML', p7:'Stosujemy rygorystyczną politykę KYC i AML zgodnie z wymogami licencji Anjouan.', li_kyc1:'KYC wymagane przed pierwszą wypłatą.', li_kyc2:'Dokumenty: dowód tożsamości, potwierdzenie adresu, selfie.', li_kyc3:'Depozyty powyżej €5 000/mies. wymagają wyjaśnienia źródła środków.', li_kyc4:'Podejrzane transakcje są zgłaszane właściwym organom.', li_kyc5:'Weryfikacja KYC: do 48 godzin.',
    h8:'8. Działania zabronione', p8:'Zabrania się:', li_p1:'Prania pieniędzy i finansowania terroryzmu.', li_p2:'Oszustwa, w tym wielokrotnych kont i nadużyć bonusów.', li_p3:'Korzystania z botów i oprogramowania automatyzującego.', li_p4:'Wykorzystywania luk w systemie.', li_p5:'Nękania innych graczy lub pracowników.', li_p6:'Korzystania z platformy z zabronionych jurysdykcji.', p8b:'Naruszenia skutkują natychmiastową blokadą i konfiskatą środków.',
    h9:'9. Provably Fair i RNG', p9:'System RNG oparty na HMAC-SHA256. Każda runda jest weryfikowalna.', li_pf1:'Seed serwera generowany przez crypto.randomBytes(32).', li_pf2:'Przed rundą ujawniany jest tylko hash SHA-256 seedu.', li_pf3:'Po rundzie seed serwera jest ujawniany do weryfikacji.', li_pf4:'Narzędzie weryfikacji: /provably-fair.html.',
    h10:'10. Własność intelektualna', p10:'Wszelkie treści są własnością HATHOR Royal Ltd. Kopiowanie bez zgody jest zabronione.',
    h11:'11. Ograniczenie odpowiedzialności', p11a:'Platforma udostępniana jest „w stanie, w jakim jest".', p11b:'Kasyno nie odpowiada za pośrednie szkody ani utracone zyski.', p11c:'Łączna odpowiedzialność ograniczona do depozytów z ostatnich 30 dni.',
    h12:'12. Prawo właściwe i rozwiązywanie sporów', p12a:'Regulamin podlega prawu Anjouan, Unii Komorów.', p12b:'Spory rozstrzygane są najpierw polubownie, następnie przed arbitrażem Anjouan OGC.', p12c:'Właściwość sądowa: Anjouan, Unia Komorów.', p12d:'Reklamacje techniczne: w ciągu 72 godzin od zdarzenia.',
    h13:'13. Nieważność gdzie zabronione', p13:'Usługi są nieważne tam, gdzie są zabronione przez prawo lokalne lub krajowe.',
    h14:'14. Zmiany', p14:'O istotnych zmianach informujemy z 14-dniowym wyprzedzeniem.',
    h15:'15. Kontakt', p15:'Kontakt: <strong>support@hathor.casino</strong> | Wsparcie 24/7 na czacie.',
  },
};

// Add shorter versions for remaining languages by copying EN structure
['fr','tr','ar','zh','hi','uk'].forEach(code => {
  TERMS_LANGS[code] = Object.assign({}, TERMS_LANGS.en, {
    fr: { pageTitle:'Conditions Générales', updated:'Dernière mise à jour: 1er avril 2026', licenseText:'Licence : <strong>Anjouan Online Gaming Commission</strong> · N° de licence : <strong>[AJN-LICENSE-NUMBER]</strong> · Opérateur : <strong>HATHOR Royal Ltd.</strong>', warning:'⚠️ <strong>Important :</strong> En utilisant HATHOR Royal Casino vous confirmez avoir 18 ans et que les jeux d\'argent en ligne sont légaux dans votre juridiction.' },
    tr: { pageTitle:'Kullanım Koşulları', updated:'Son güncelleme: 1 Nisan 2026', licenseText:'Lisans: <strong>Anjouan Online Gaming Commission</strong> · Lisans No: <strong>[AJN-LICENSE-NUMBER]</strong> · Operatör: <strong>HATHOR Royal Ltd.</strong>', warning:'⚠️ <strong>Önemli:</strong> HATHOR Royal Casino\'yu kullanarak 18 yaşını doldurduğunuzu ve çevrimiçi kumarın yasal olduğunu onaylıyorsunuz.' },
    ar: { pageTitle:'الشروط والأحكام', updated:'آخر تحديث: 1 أبريل 2026', licenseText:'الترخيص: <strong>Anjouan Online Gaming Commission</strong> · رقم الترخيص: <strong>[AJN-LICENSE-NUMBER]</strong> · المشغّل: <strong>HATHOR Royal Ltd.</strong>', warning:'⚠️ <strong>هام:</strong> باستخدام HATHOR Royal Casino تؤكد أن عمرك 18 عامًا على الأقل وأن القمار عبر الإنترنت قانوني في دولتك.' },
    zh: { pageTitle:'条款与条件', updated:'最后更新：2026年4月1日', licenseText:'许可证：<strong>Anjouan Online Gaming Commission</strong> · 许可证号：<strong>[AJN-LICENSE-NUMBER]</strong> · 运营商：<strong>HATHOR Royal Ltd.</strong>', warning:'⚠️ <strong>重要：</strong>使用HATHOR Royal Casino即表示您确认已年满18周岁，且在线赌博在您所在地区合法。' },
    hi: { pageTitle:'नियम और शर्तें', updated:'अंतिम अपडेट: 1 अप्रैल 2026', licenseText:'लाइसेंस: <strong>Anjouan Online Gaming Commission</strong> · लाइसेंस नं.: <strong>[AJN-LICENSE-NUMBER]</strong> · ऑपरेटर: <strong>HATHOR Royal Ltd.</strong>', warning:'⚠️ <strong>महत्वपूर्ण:</strong> HATHOR Royal Casino का उपयोग करके आप पुष्टि करते हैं कि आपकी आयु 18 वर्ष से अधिक है।' },
    uk: { pageTitle:'Умови використання', updated:'Останнє оновлення: 1 квітня 2026', licenseText:'Ліцензія: <strong>Anjouan Online Gaming Commission</strong> · Номер ліцензії: <strong>[AJN-LICENSE-NUMBER]</strong> · Оператор: <strong>HATHOR Royal Ltd.</strong>', warning:'⚠️ <strong>Важливо:</strong> Використовуючи HATHOR Royal Casino ви підтверджуєте, що вам виповнилося 18 років і що онлайн-гемблінг є законним у вашій юрисдикції.' },
  }[code] || {});
});

// Build Terms HTML
const TERMS_HTML = `<!DOCTYPE html>
<html lang="lt">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Terms &amp; Conditions — HATHOR Royal Casino</title>
${FONTS}
<style>${CSS}</style>
</head>
<body>
<header>
  <a class="logo" href="/">&#x2B21; HATHOR</a>
  <div class="lang-bar" id="langBar"></div>
  <a class="back-link" href="/" data-i18n="backLinkTxt">&#8592; Back</a>
</header>
<div class="container">
  <div class="page-title" data-i18n="pageTitle">Terms and Conditions</div>
  <div class="updated" data-i18n="updated">Last updated: April 1, 2026</div>
  <div class="license-badge">🛡️ <span data-i18n-html="licenseText">License: <strong>Anjouan Online Gaming Commission</strong> · License No.: <strong>[AJN-LICENSE-NUMBER]</strong> · Operator: <strong>HATHOR Royal Ltd.</strong></span></div>
  <div class="highlight-box" data-i18n-html="warning"></div>

  <h2 data-i18n="h1">1. General Provisions</h2>
  <p data-i18n="p1a"></p>
  <p data-i18n="p1b"></p>

  <h2 data-i18n="h2">2. Eligibility Requirements</h2>
  <ul>
    <li data-i18n-html="li_18"></li>
    <li data-i18n="li_legal"></li>
    <li data-i18n="li_one"></li>
    <li data-i18n="li_restricted"></li>
    <li data-i18n="li_not_employee"></li>
  </ul>

  <h2 data-i18n="h3">3. Account and Registration</h2>
  <p data-i18n="p3"></p>
  <ul>
    <li data-i18n="li_one_acc"></li>
    <li data-i18n="li_no_transfer"></li>
    <li data-i18n="li_security"></li>
    <li data-i18n="li_real_info"></li>
    <li data-i18n="li_kyc"></li>
  </ul>

  <h2 data-i18n="h4">4. Deposits and Withdrawals</h2>
  <p data-i18n="p4"></p>
  <ul>
    <li data-i18n="li_dep_min"></li>
    <li data-i18n="li_wd_min"></li>
    <li data-i18n="li_wd_kyc"></li>
    <li data-i18n="li_wd_time"></li>
    <li data-i18n="li_wd_method"></li>
    <li data-i18n="li_wd_refuse"></li>
    <li data-i18n="li_wd_fee"></li>
  </ul>

  <h2 data-i18n="h5">5. Bonuses and Promotions</h2>
  <p data-i18n="p5"></p>
  <ul>
    <li data-i18n="li_b1"></li>
    <li data-i18n="li_b2"></li>
    <li data-i18n="li_b3"></li>
    <li data-i18n="li_b4"></li>
    <li data-i18n="li_b5"></li>
  </ul>

  <h2 data-i18n="h6">6. Responsible Gambling</h2>
  <p data-i18n="p6"></p>
  <ul>
    <li data-i18n="li_rg1"></li>
    <li data-i18n="li_rg2"></li>
    <li data-i18n="li_rg3"></li>
    <li data-i18n="li_rg4"></li>
    <li data-i18n="li_rg5"></li>
  </ul>

  <h2 data-i18n="h7">7. KYC and AML Policy</h2>
  <p data-i18n="p7"></p>
  <ul>
    <li data-i18n="li_kyc1"></li>
    <li data-i18n="li_kyc2"></li>
    <li data-i18n="li_kyc3"></li>
    <li data-i18n="li_kyc4"></li>
    <li data-i18n="li_kyc5"></li>
  </ul>

  <h2 data-i18n="h8">8. Prohibited Activities</h2>
  <p data-i18n="p8"></p>
  <ul>
    <li data-i18n="li_p1"></li>
    <li data-i18n="li_p2"></li>
    <li data-i18n="li_p3"></li>
    <li data-i18n="li_p4"></li>
    <li data-i18n="li_p5"></li>
    <li data-i18n="li_p6"></li>
  </ul>
  <p data-i18n="p8b"></p>

  <h2 data-i18n="h9">9. Provably Fair and RNG</h2>
  <p data-i18n="p9"></p>
  <ul>
    <li data-i18n="li_pf1"></li>
    <li data-i18n="li_pf2"></li>
    <li data-i18n="li_pf3"></li>
    <li data-i18n="li_pf4"></li>
  </ul>

  <h2 data-i18n="h10">10. Intellectual Property</h2>
  <p data-i18n="p10"></p>

  <h2 data-i18n="h11">11. Limitation of Liability</h2>
  <p data-i18n="p11a"></p>
  <p data-i18n="p11b"></p>
  <p data-i18n="p11c"></p>

  <h2 data-i18n="h12">12. Governing Law and Dispute Resolution</h2>
  <p data-i18n="p12a"></p>
  <p data-i18n="p12b"></p>
  <p data-i18n="p12c"></p>
  <p data-i18n="p12d"></p>

  <h2 data-i18n="h13">13. Void Where Prohibited</h2>
  <p data-i18n="p13"></p>

  <h2 data-i18n="h14">14. Amendments</h2>
  <p data-i18n="p14"></p>

  <h2 data-i18n="h15">15. Contact</h2>
  <p data-i18n-html="p15"></p>
</div>
<footer>© 2026 HATHOR Royal Ltd. · Licensed by Anjouan Online Gaming Commission · [AJN-LICENSE-NUMBER]</footer>
<script>
var PAGE_LANGS = ${JSON.stringify(TERMS_LANGS, null, 0)};
PAGE_LANGS.lt.backLinkTxt = '← Grįžti';
PAGE_LANGS.en.backLinkTxt = '← Back';
PAGE_LANGS.ru.backLinkTxt = '← Назад';
PAGE_LANGS.de.backLinkTxt = '← Zurück';
PAGE_LANGS.pl.backLinkTxt = '← Wstecz';
PAGE_LANGS.fr.backLinkTxt = '← Retour';
PAGE_LANGS.tr.backLinkTxt = '← Geri';
PAGE_LANGS.ar.backLinkTxt = '← رجوع';
PAGE_LANGS.zh.backLinkTxt = '← 返回';
PAGE_LANGS.hi.backLinkTxt = '← वापस';
PAGE_LANGS.uk.backLinkTxt = '← Назад';
</script>
${LANG_SYSTEM}
</body>
</html>`;

fs.writeFileSync(path.join(__dirname,'public','terms.html'), TERMS_HTML, 'utf8');
console.log('✅ terms.html written —', (TERMS_HTML.length/1024).toFixed(1)+'KB');

// ═══════════════════════════════════════════════════════════
// PRIVACY POLICY
// ═══════════════════════════════════════════════════════════

const PRIV_LANGS = {
  lt: {
    pageTitle:'Privatumo Politika',
    updated:'Įsigaliojimo data: 2026 m. balandžio 1 d. · BDAR (GDPR) atitinkanti',
    licenseText:'Duomenų valdytojas: <strong>HATHOR Royal Ltd.</strong>, veikianti pagal Anjouan Online Gaming Commission licenciją Nr. <strong>[AJN-LICENSE-NUMBER]</strong>',

    h1:'1. Duomenų valdytojas',
    p1:'Jūsų asmens duomenų valdytojas yra HATHOR Royal Ltd. (toliau – „mes", „mūsų"), veikianti pagal Anjouan (Komorų Salų) teisę. Susisiekimo el. paštas dėl privatumo klausimų: privacy@hathor.casino. Duomenų apsaugos pareigūnas (DPO): dpo@hathor.casino.',

    h2:'2. Kokie duomenys renkami',
    li_reg:'<strong>Registracijos duomenys:</strong> Vardas, unikalus identifikatorius (UID), el. paštas (jei pateiktas).',
    li_kyc:'<strong>KYC dokumentai:</strong> Asmens tapatybę patvirtinantis dokumentas (paso arba ID kopija), gyvenamosios vietos įrodymas, asmenukas su dokumentu, gimimo data, šalis.',
    li_tx:'<strong>Finansiniai duomenys:</strong> Depozitų ir išėmimų istorija, sumų dydžiai, mokėjimo metodai (kriptovaliutų adresai). Kortėlių duomenys neišsaugomi – jie apdorojami tiesiogiai per Stripe.',
    li_game:'<strong>Žaidimų duomenys:</strong> Statymų istorija, žaidimų rezultatai, balansas, bonusai, turnyrų dalyvavimai.',
    li_tech:'<strong>Techniniai duomenys:</strong> IP adresas, naršyklės tipas, operacinė sistema, sesijos trukmė, prisijungimo datos.',
    li_comm:'<strong>Komunikacijos duomenys:</strong> Pranešimai klientų aptarnavimui, live chat žinutės.',

    h3:'3. Kaip duomenys naudojami',
    li_use1:'Paskyros sukūrimas ir valdymas.',
    li_use2:'KYC procedūros vykdymas ir amžiaus patikrinimas.',
    li_use3:'Mokėjimų apdorojimas ir sukčiavimo prevencija.',
    li_use4:'AML (pinigų plovimo prevencija) reikalavimų laikymasis.',
    li_use5:'Klientų aptarnavimas ir ginčų sprendimas.',
    li_use6:'Atsakingo žaidimo įrankių teikimas.',
    li_use7:'Teisinių įsipareigojimų vykdymas.',
    li_use8:'Platformos tobulinimas ir statistinė analizė (anonimizuotais duomenimis).',

    h4:'4. Teisinis duomenų tvarkymo pagrindas (BDAR)',
    li_lb1:'<strong>Sutartis:</strong> Duomenys tvarkomi siekiant vykdyti mūsų sutartinius įsipareigojimus (paskyros valdymas, mokėjimai).',
    li_lb2:'<strong>Teisinis įpareigojimas:</strong> KYC/AML duomenys tvarkomi pagal taikytinus kovos su pinigų plovimu įstatymus.',
    li_lb3:'<strong>Teisėtas interesas:</strong> Sukčiavimo prevencija, platformos saugumo užtikrinimas.',
    li_lb4:'<strong>Sutikimas:</strong> Rinkodaros pranešimams (galite bet kada atšaukti).',

    h5:'5. Duomenų Saugojimas',
    p5:'Asmens duomenis saugome tiek, kiek reikia šioje politikoje nurodytiems tikslams pasiekti:',
    li_ret1:'Paskyros duomenys: kol paskyra aktyvi + 5 metai po uždarymo.',
    li_ret2:'KYC dokumentai: 5 metai nuo paskutinės transakcijos (teisinis reikalavimas).',
    li_ret3:'Finansinių transakcijų įrašai: 7 metai (buhalterinės apskaitos reikalavimai).',
    li_ret4:'Techniniai žurnalai: 12 mėnesių.',
    li_ret5:'Klientų aptarnavimo komunikacija: 3 metai.',

    h6:'6. Duomenų Dalinimasis su Trečiosiomis Šalimis',
    p6:'Mes neparduodame jūsų duomenų. Duomenys gali būti perduoti:',
    li_sh1:'<strong>Mokėjimų paslaugų teikėjams:</strong> Stripe (kortelių mokėjimai), NowPayments (kripto mokėjimai) – tik reikalingi apdorojimui duomenys.',
    li_sh2:'<strong>KYC paslaugų teikėjams:</strong> Dokumentų verifikavimo paslaugoms – identiteto patvirtinimui.',
    li_sh3:'<strong>Teisėsaugos institucijoms:</strong> Kai reikalaujama pagal įstatymus arba teismo sprendimu.',
    li_sh4:'<strong>Reguliacinėms institucijoms:</strong> Anjouan Online Gaming Commission ir kitoms kompetentingoms institucijoms.',
    li_sh5:'<strong>Debesų paslaugų teikėjams:</strong> Railway.app (serverių infrastruktūra) – tik techniniai duomenys.',
    p6b:'Visi tretieji asmenys privalo laikytis konfidencialumo ir naudoti duomenis tik sutartam tikslui.',

    h7:'7. Tarptautiniai Duomenų Perdavimai',
    p7:'Jūsų duomenys gali būti saugomi ir tvarkomi už Europos Ekonominės Erdvės (EEE) ribų. Tokiais atvejais mes užtikriname tinkamas apsaugos priemones per: (a) Europos Komisijos patvirtintas standartines sutarčių sąlygas (SCC); (b) tinkamo apsaugos lygio sprendimus; arba (c) kitas taikytinas apsaugos priemones pagal BDAR 46 straipsnį.',

    h8:'8. Jūsų Teisės (BDAR)',
    p8:'Pagal BDAR jūs turite šias teises:',
    r1t:'Teisė susipažinti', r1d:'Galite paprašyti kopijos visų jūsų asmens duomenų, kuriuos tvarkome.',
    r2t:'Teisė ištaisyti', r2d:'Galite paprašyti ištaisyti netikslius ar nepilnus duomenis.',
    r3t:'Teisė ištrinti', r3d:'Galite paprašyti ištrinti duomenis („teisė būti pamirštam"), nebent tai prieštarauja teisiniam įpareigojimui.',
    r4t:'Teisė apriboti', r4d:'Galite paprašyti apriboti duomenų tvarkymą tam tikromis aplinkybėmis.',
    r5t:'Teisė į perkeliamumą', r5d:'Galite gauti savo duomenis struktūrizuotu, įprastai naudojamu formatu.',
    r6t:'Teisė nesutikti', r6d:'Galite nesutikti su duomenų tvarkymu rinkodaros tikslais.',
    r7t:'Automatizuoti sprendimai', r7d:'Jūs turite teisę, kad sprendimai nebūtų priimami vien automatizuotu apdorojimu.',
    r8t:'Sutikimo atšaukimas', r8d:'Jei duomenys tvarkomi sutikimo pagrindu – galite jį atšaukti bet kada.',
    p8b:'Norėdami pasinaudoti šiomis teisėmis, kreipkitės: privacy@hathor.casino. Atsakysime per 30 dienų.',

    h9:'9. Duomenų Pažeidimai',
    p9:'Jei įvyktų asmens duomenų pažeidimas, kuris gali sukelti riziką jūsų teisėms ir laisvėms, mes:',
    li_db1:'Pranešime kompetentingai priežiūros institucijai per 72 valandas nuo pažeidimo nustatymo.',
    li_db2:'Pranešime jums tiesiogiai, jei pažeidimas gali sukelti didelę riziką jūsų teisėms.',
    li_db3:'Dokumentuosime visus pažeidimus vidinėje pažeidimų registre.',

    h10:'10. Slapukai (Cookies)',
    p10:'Mūsų platforma naudoja slapukus:',
    li_c1:'<strong>Būtini slapukai:</strong> Reikalingi platformos veikimui (sesijos, prisijungimas). Negalima jų išjungti.',
    li_c2:'<strong>Funkciniai slapukai:</strong> Įsimena jūsų nuostatas (kalba, nustatymai).',
    li_c3:'<strong>Analitiniai slapukai:</strong> Anoniminiai statistikos duomenys apie platformos naudojimą.',
    p10b:'Galite valdyti slapukus naršyklės nustatymuose. Būtinų slapukų išjungimas gali sutrikdyti platformos veikimą.',

    h11:'11. Duomenų Saugumas',
    p11:'Mes taikome šias technines ir organizacines duomenų saugumo priemones:',
    li_sec1:'Visos komunikacijos šifruojamos TLS 1.2+ protokolu.',
    li_sec2:'Duomenų bazė saugoma atskirame saugiame talpykloje (Railway persistent volume).',
    li_sec3:'Prieiga prie asmens duomenų ribojama pagal „reikia žinoti" principą.',
    li_sec4:'KYC dokumentai saugomi atskirame kataloge, neprieinama per viešą URL.',
    li_sec5:'Reguliari pažeidžiamumų analizė ir saugumo auditas.',

    h12:'12. Kontaktai ir Priežiūros Institucija',
    p12a:'Dėl privatumo klausimų: <strong>privacy@hathor.casino</strong>',
    p12b:'Duomenų apsaugos pareigūnas: <strong>dpo@hathor.casino</strong>',
    p12c:'Jei manote, kad pažeidžiamos jūsų teisės – turite teisę pateikti skundą kompetentingai priežiūros institucijai: Valstybinei duomenų apsaugos inspekcijai (vdai.gov.lt) arba kitai ES valstybės narės priežiūros institucijai pagal jūsų gyvenamąją vietą.',
  },

  en: {
    pageTitle:'Privacy Policy',
    updated:'Effective: April 1, 2026 · GDPR compliant',
    licenseText:'Data Controller: <strong>HATHOR Royal Ltd.</strong>, operating under Anjouan Online Gaming Commission License No. <strong>[AJN-LICENSE-NUMBER]</strong>',

    h1:'1. Data Controller',
    p1:'The controller of your personal data is HATHOR Royal Ltd. (hereinafter "we", "our"), operating under the laws of Anjouan, Union of Comoros. Privacy contact: privacy@hathor.casino. Data Protection Officer (DPO): dpo@hathor.casino.',

    h2:'2. Data We Collect',
    li_reg:'<strong>Registration data:</strong> Name, unique identifier (UID), email (if provided).',
    li_kyc:'<strong>KYC documents:</strong> Government-issued photo ID (passport or ID copy), proof of address, selfie with document, date of birth, country.',
    li_tx:'<strong>Financial data:</strong> Deposit and withdrawal history, amounts, payment methods (cryptocurrency addresses). Card data is not stored — processed directly by Stripe.',
    li_game:'<strong>Gaming data:</strong> Bet history, game results, balance, bonuses, tournament participation.',
    li_tech:'<strong>Technical data:</strong> IP address, browser type, operating system, session duration, login dates.',
    li_comm:'<strong>Communication data:</strong> Customer support messages, live chat transcripts.',

    h3:'3. How Data Is Used',
    li_use1:'Account creation and management.',
    li_use2:'KYC verification and age verification.',
    li_use3:'Payment processing and fraud prevention.',
    li_use4:'AML (anti-money laundering) compliance.',
    li_use5:'Customer support and dispute resolution.',
    li_use6:'Provision of responsible gambling tools.',
    li_use7:'Fulfilment of legal obligations.',
    li_use8:'Platform improvement and statistical analysis (using anonymised data).',

    h4:'4. Legal Basis for Processing (GDPR)',
    li_lb1:'<strong>Contract:</strong> Data processed to fulfil our contractual obligations (account management, payments).',
    li_lb2:'<strong>Legal obligation:</strong> KYC/AML data processed under applicable anti-money laundering laws.',
    li_lb3:'<strong>Legitimate interest:</strong> Fraud prevention and platform security.',
    li_lb4:'<strong>Consent:</strong> For marketing communications (withdrawable at any time).',

    h5:'5. Data Retention',
    p5:'We retain personal data for as long as necessary to fulfil the purposes described in this policy:',
    li_ret1:'Account data: while account is active + 5 years after closure.',
    li_ret2:'KYC documents: 5 years from last transaction (legal requirement).',
    li_ret3:'Financial transaction records: 7 years (accounting requirements).',
    li_ret4:'Technical logs: 12 months.',
    li_ret5:'Customer support communications: 3 years.',

    h6:'6. Data Sharing with Third Parties',
    p6:'We do not sell your data. Data may be shared with:',
    li_sh1:'<strong>Payment service providers:</strong> Stripe (card payments), NowPayments (crypto) — only data required for processing.',
    li_sh2:'<strong>KYC service providers:</strong> Document verification services — for identity confirmation.',
    li_sh3:'<strong>Law enforcement:</strong> When required by law or court order.',
    li_sh4:'<strong>Regulatory authorities:</strong> Anjouan Online Gaming Commission and other competent authorities.',
    li_sh5:'<strong>Cloud service providers:</strong> Railway.app (server infrastructure) — technical data only.',
    p6b:'All third parties are contractually bound to confidentiality and may only use data for the agreed purpose.',

    h7:'7. International Data Transfers',
    p7:'Your data may be stored and processed outside the European Economic Area (EEA). In such cases we ensure appropriate safeguards through: (a) European Commission-approved Standard Contractual Clauses (SCCs); (b) adequacy decisions; or (c) other applicable safeguards under GDPR Article 46.',

    h8:'8. Your Rights (GDPR)',
    p8:'Under GDPR you have the following rights:',
    r1t:'Right of Access', r1d:'You may request a copy of all personal data we hold about you.',
    r2t:'Right to Rectification', r2d:'You may request correction of inaccurate or incomplete data.',
    r3t:'Right to Erasure', r3d:'You may request deletion of your data ("right to be forgotten"), unless retention is legally required.',
    r4t:'Right to Restriction', r4d:'You may request restriction of processing in certain circumstances.',
    r5t:'Right to Portability', r5d:'You may receive your data in a structured, commonly used format.',
    r6t:'Right to Object', r6d:'You may object to processing for marketing purposes.',
    r7t:'Automated Decisions', r7d:'You have the right not to be subject to decisions based solely on automated processing.',
    r8t:'Withdrawal of Consent', r8d:'Where processing is based on consent, you may withdraw it at any time.',
    p8b:'To exercise these rights, contact: privacy@hathor.casino. We will respond within 30 days.',

    h9:'9. Data Breaches',
    p9:'In the event of a personal data breach that may risk your rights and freedoms, we will:',
    li_db1:'Notify the competent supervisory authority within 72 hours of becoming aware of the breach.',
    li_db2:'Notify you directly if the breach is likely to result in high risk to your rights.',
    li_db3:'Document all breaches in our internal breach register.',

    h10:'10. Cookies',
    p10:'Our platform uses the following cookies:',
    li_c1:'<strong>Essential cookies:</strong> Required for platform operation (sessions, login). Cannot be disabled.',
    li_c2:'<strong>Functional cookies:</strong> Remember your preferences (language, settings).',
    li_c3:'<strong>Analytical cookies:</strong> Anonymous statistics about platform usage.',
    p10b:'You can manage cookies in your browser settings. Disabling essential cookies may impair platform functionality.',

    h11:'11. Data Security',
    p11:'We apply the following technical and organisational security measures:',
    li_sec1:'All communications encrypted with TLS 1.2+.',
    li_sec2:'Database stored on a secure persistent volume (Railway).',
    li_sec3:'Access to personal data restricted on a need-to-know basis.',
    li_sec4:'KYC documents stored in a private directory, not publicly accessible.',
    li_sec5:'Regular vulnerability assessments and security audits.',

    h12:'12. Contact and Supervisory Authority',
    p12a:'Privacy enquiries: <strong>privacy@hathor.casino</strong>',
    p12b:'Data Protection Officer: <strong>dpo@hathor.casino</strong>',
    p12c:'If you believe your rights are being violated, you have the right to lodge a complaint with a competent supervisory authority — in particular, the supervisory authority in the EU Member State of your habitual residence, place of work or place of the alleged infringement.',
  },

  ru: {
    pageTitle:'Политика конфиденциальности', updated:'Вступает в силу: 1 апреля 2026 г. · Соответствует GDPR',
    licenseText:'Контролёр данных: <strong>HATHOR Royal Ltd.</strong>, лицензия Anjouan OGC № <strong>[AJN-LICENSE-NUMBER]</strong>',
    h1:'1. Контролёр данных', p1:'Контролёр ваших персональных данных — HATHOR Royal Ltd. Email: privacy@hathor.casino. DPO: dpo@hathor.casino.',
    h2:'2. Собираемые данные', li_reg:'<strong>Регистрационные:</strong> Имя, UID, email.', li_kyc:'<strong>KYC:</strong> Удостоверение личности, подтверждение адреса, селфи.', li_tx:'<strong>Финансовые:</strong> История транзакций, платёжные методы. Данные карт не хранятся.', li_game:'<strong>Игровые:</strong> История ставок, балансы, бонусы.', li_tech:'<strong>Технические:</strong> IP, браузер, ОС, сессии.', li_comm:'<strong>Коммуникации:</strong> Переписка с поддержкой.',
    h3:'3. Использование данных', li_use1:'Управление аккаунтом.', li_use2:'Верификация KYC и возраста.', li_use3:'Обработка платежей и предотвращение мошенничества.', li_use4:'Соответствие требованиям AML.', li_use5:'Поддержка клиентов.', li_use6:'Инструменты ответственной игры.', li_use7:'Исполнение законодательных обязательств.', li_use8:'Улучшение платформы (анонимные данные).',
    h4:'4. Правовые основания (GDPR)', li_lb1:'<strong>Договор:</strong> Для исполнения обязательств.', li_lb2:'<strong>Законная обязанность:</strong> KYC/AML.', li_lb3:'<strong>Законный интерес:</strong> Безопасность и защита от мошенничества.', li_lb4:'<strong>Согласие:</strong> Маркетинг (отзывается в любое время).',
    h5:'5. Сроки хранения', p5:'Данные хранятся не дольше необходимого:', li_ret1:'Данные аккаунта: пока активен + 5 лет после закрытия.', li_ret2:'KYC: 5 лет от последней транзакции.', li_ret3:'Финансовые записи: 7 лет.', li_ret4:'Технические логи: 12 месяцев.', li_ret5:'Коммуникации с поддержкой: 3 года.',
    h6:'6. Передача третьим лицам', p6:'Мы не продаём данные. Передача возможна:', li_sh1:'Stripe, NowPayments — обработка платежей.', li_sh2:'KYC-провайдеры — верификация.', li_sh3:'Правоохранительные органы — по требованию закона.', li_sh4:'Anjouan OGC и регуляторы.', li_sh5:'Railway.app — серверная инфраструктура.', p6b:'Все третьи стороны обязаны соблюдать конфиденциальность.',
    h7:'7. Международная передача данных', p7:'Данные могут обрабатываться за пределами ЕЭЗ. В таких случаях применяются стандартные договорные положения ЕК (SCC) или иные меры защиты по ст. 46 GDPR.',
    h8:'8. Ваши права (GDPR)', p8:'Согласно GDPR у вас есть следующие права:', r1t:'Право на доступ', r1d:'Запросите копию своих данных.', r2t:'Право на исправление', r2d:'Запросите исправление неточных данных.', r3t:'Право на удаление', r3d:'Запросите удаление данных, если нет законных оснований для хранения.', r4t:'Право на ограничение', r4d:'Ограничьте обработку в определённых случаях.', r5t:'Право на переносимость', r5d:'Получите данные в структурированном формате.', r6t:'Право на возражение', r6d:'Возразите против обработки в маркетинговых целях.', r7t:'Автоматизированные решения', r7d:'Право не подвергаться только автоматизированным решениям.', r8t:'Отзыв согласия', r8d:'Отзовите согласие в любое время.', p8b:'Для реализации прав: privacy@hathor.casino. Ответим в течение 30 дней.',
    h9:'9. Нарушения безопасности', p9:'При нарушении данных мы:', li_db1:'Уведомим регулятора в течение 72 часов.', li_db2:'Уведомим вас, если риск высок.', li_db3:'Задокументируем нарушение во внутреннем реестре.',
    h10:'10. Файлы cookie', p10:'Используемые типы:', li_c1:'<strong>Необходимые:</strong> Для работы платформы.', li_c2:'<strong>Функциональные:</strong> Запоминают настройки.', li_c3:'<strong>Аналитические:</strong> Анонимная статистика.', p10b:'Управляйте cookie в настройках браузера.',
    h11:'11. Безопасность данных', p11:'Применяемые меры:', li_sec1:'Шифрование TLS 1.2+.', li_sec2:'БД на защищённом persistent volume (Railway).', li_sec3:'Доступ по принципу минимальных привилегий.', li_sec4:'KYC-документы — в закрытом каталоге.', li_sec5:'Регулярный аудит безопасности.',
    h12:'12. Контакты и надзорный орган', p12a:'Вопросы конфиденциальности: <strong>privacy@hathor.casino</strong>', p12b:'DPO: <strong>dpo@hathor.casino</strong>', p12c:'Если вы считаете, что ваши права нарушены — вы вправе обратиться в надзорный орган по защите данных вашей страны.',
  },
};

['de','pl','fr','tr','ar','zh','hi','uk'].forEach(code => {
  const labels = {
    de:{ pageTitle:'Datenschutzrichtlinie', updated:'Gültig ab: 1. April 2026 · DSGVO-konform' },
    pl:{ pageTitle:'Polityka Prywatności', updated:'Data wejścia w życie: 1 kwietnia 2026 · Zgodna z RODO' },
    fr:{ pageTitle:'Politique de Confidentialité', updated:'En vigueur : 1er avril 2026 · Conforme au RGPD' },
    tr:{ pageTitle:'Gizlilik Politikası', updated:'Yürürlük tarihi: 1 Nisan 2026 · GDPR uyumlu' },
    ar:{ pageTitle:'سياسة الخصوصية', updated:'تاريخ النفاذ: 1 أبريل 2026 · متوافقة مع GDPR' },
    zh:{ pageTitle:'隐私政策', updated:'生效日期：2026年4月1日 · 符合GDPR' },
    hi:{ pageTitle:'गोपनीयता नीति', updated:'प्रभावी तिथि: 1 अप्रैल 2026 · GDPR अनुपालक' },
    uk:{ pageTitle:'Політика конфіденційності', updated:'Набуває чинності: 1 квітня 2026 р. · Відповідає GDPR' },
  };
  PRIV_LANGS[code] = Object.assign({}, PRIV_LANGS.en, labels[code] || {});
  PRIV_LANGS[code].licenseText = `Data Controller: <strong>HATHOR Royal Ltd.</strong> · Anjouan OGC License No. <strong>[AJN-LICENSE-NUMBER]</strong>`;
});

const PRIV_HTML = `<!DOCTYPE html>
<html lang="lt">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Privacy Policy — HATHOR Royal Casino</title>
${FONTS}
<style>${CSS}</style>
</head>
<body>
<header>
  <a class="logo" href="/">&#x2B21; HATHOR</a>
  <div class="lang-bar" id="langBar"></div>
  <a class="back-link" href="/" data-i18n="backLinkTxt">&#8592; Back</a>
</header>
<div class="container">
  <div class="page-title" data-i18n="pageTitle">Privacy Policy</div>
  <div class="updated" data-i18n="updated">Effective: April 1, 2026 · GDPR compliant</div>
  <div class="license-badge">🛡️ <span data-i18n-html="licenseText"></span></div>

  <h2 data-i18n="h1">1. Data Controller</h2>
  <p data-i18n="p1"></p>

  <h2 data-i18n="h2">2. Data We Collect</h2>
  <ul>
    <li data-i18n-html="li_reg"></li>
    <li data-i18n-html="li_kyc"></li>
    <li data-i18n-html="li_tx"></li>
    <li data-i18n-html="li_game"></li>
    <li data-i18n-html="li_tech"></li>
    <li data-i18n-html="li_comm"></li>
  </ul>

  <h2 data-i18n="h3">3. How Data Is Used</h2>
  <ul>
    <li data-i18n="li_use1"></li><li data-i18n="li_use2"></li>
    <li data-i18n="li_use3"></li><li data-i18n="li_use4"></li>
    <li data-i18n="li_use5"></li><li data-i18n="li_use6"></li>
    <li data-i18n="li_use7"></li><li data-i18n="li_use8"></li>
  </ul>

  <h2 data-i18n="h4">4. Legal Basis (GDPR)</h2>
  <ul>
    <li data-i18n-html="li_lb1"></li><li data-i18n-html="li_lb2"></li>
    <li data-i18n-html="li_lb3"></li><li data-i18n-html="li_lb4"></li>
  </ul>

  <h2 data-i18n="h5">5. Data Retention</h2>
  <p data-i18n="p5"></p>
  <ul>
    <li data-i18n="li_ret1"></li><li data-i18n="li_ret2"></li>
    <li data-i18n="li_ret3"></li><li data-i18n="li_ret4"></li>
    <li data-i18n="li_ret5"></li>
  </ul>

  <h2 data-i18n="h6">6. Data Sharing</h2>
  <p data-i18n="p6"></p>
  <ul>
    <li data-i18n-html="li_sh1"></li><li data-i18n-html="li_sh2"></li>
    <li data-i18n-html="li_sh3"></li><li data-i18n-html="li_sh4"></li>
    <li data-i18n-html="li_sh5"></li>
  </ul>
  <p data-i18n="p6b"></p>

  <h2 data-i18n="h7">7. International Data Transfers</h2>
  <p data-i18n="p7"></p>

  <h2 data-i18n="h8">8. Your Rights (GDPR)</h2>
  <p data-i18n="p8"></p>
  <div class="rights-grid">
    <div class="right-card"><div class="right-title" data-i18n="r1t"></div><div class="right-desc" data-i18n="r1d"></div></div>
    <div class="right-card"><div class="right-title" data-i18n="r2t"></div><div class="right-desc" data-i18n="r2d"></div></div>
    <div class="right-card"><div class="right-title" data-i18n="r3t"></div><div class="right-desc" data-i18n="r3d"></div></div>
    <div class="right-card"><div class="right-title" data-i18n="r4t"></div><div class="right-desc" data-i18n="r4d"></div></div>
    <div class="right-card"><div class="right-title" data-i18n="r5t"></div><div class="right-desc" data-i18n="r5d"></div></div>
    <div class="right-card"><div class="right-title" data-i18n="r6t"></div><div class="right-desc" data-i18n="r6d"></div></div>
    <div class="right-card"><div class="right-title" data-i18n="r7t"></div><div class="right-desc" data-i18n="r7d"></div></div>
    <div class="right-card"><div class="right-title" data-i18n="r8t"></div><div class="right-desc" data-i18n="r8d"></div></div>
  </div>
  <p data-i18n="p8b"></p>

  <h2 data-i18n="h9">9. Data Breaches</h2>
  <p data-i18n="p9"></p>
  <ul>
    <li data-i18n="li_db1"></li><li data-i18n="li_db2"></li><li data-i18n="li_db3"></li>
  </ul>

  <h2 data-i18n="h10">10. Cookies</h2>
  <p data-i18n="p10"></p>
  <ul>
    <li data-i18n-html="li_c1"></li><li data-i18n-html="li_c2"></li><li data-i18n-html="li_c3"></li>
  </ul>
  <p data-i18n="p10b"></p>

  <h2 data-i18n="h11">11. Data Security</h2>
  <p data-i18n="p11"></p>
  <ul>
    <li data-i18n="li_sec1"></li><li data-i18n="li_sec2"></li>
    <li data-i18n="li_sec3"></li><li data-i18n="li_sec4"></li><li data-i18n="li_sec5"></li>
  </ul>

  <h2 data-i18n="h12">12. Contact and Supervisory Authority</h2>
  <p data-i18n-html="p12a"></p>
  <p data-i18n-html="p12b"></p>
  <p data-i18n="p12c"></p>
</div>
<footer>© 2026 HATHOR Royal Ltd. · Licensed by Anjouan Online Gaming Commission · privacy@hathor.casino</footer>
<script>
var PAGE_LANGS = ${JSON.stringify(PRIV_LANGS, null, 0)};
PAGE_LANGS.lt.backLinkTxt='← Grįžti'; PAGE_LANGS.en.backLinkTxt='← Back';
PAGE_LANGS.ru.backLinkTxt='← Назад'; PAGE_LANGS.de.backLinkTxt='← Zurück';
PAGE_LANGS.pl.backLinkTxt='← Wstecz'; PAGE_LANGS.fr.backLinkTxt='← Retour';
PAGE_LANGS.tr.backLinkTxt='← Geri'; PAGE_LANGS.ar.backLinkTxt='← رجوع';
PAGE_LANGS.zh.backLinkTxt='← 返回'; PAGE_LANGS.hi.backLinkTxt='← वापस';
PAGE_LANGS.uk.backLinkTxt='← Назад';
</script>
${LANG_SYSTEM}
</body>
</html>`;

fs.writeFileSync(path.join(__dirname,'public','privacy.html'), PRIV_HTML, 'utf8');
console.log('✅ privacy.html written —', (PRIV_HTML.length/1024).toFixed(1)+'KB');
console.log('\nDone! Both legal pages updated.');
