var fs = require('fs');

var LANGS_LIST_STR = "const LANGS_LIST=[{code:'en',flag:'🇬🇧'},{code:'lt',flag:'🇱🇹'},{code:'ru',flag:'🇷🇺'},{code:'de',flag:'🇩🇪'},{code:'pl',flag:'🇵🇱'},{code:'fr',flag:'🇫🇷'},{code:'tr',flag:'🇹🇷'},{code:'ar',flag:'🇸🇦'},{code:'zh',flag:'🇨🇳'},{code:'hi',flag:'🇮🇳'},{code:'uk',flag:'🇺🇦'}];";

var LANG_BAR_HTML = '\n  <div class="lang-bar" id="langBar"></div>';

var LANG_BAR_CSS = `
  .lang-bar{display:flex;gap:5px;align-items:center;flex-wrap:wrap;}
  .lang-btn{background:none;border:1px solid rgba(201,168,76,0.2);border-radius:6px;color:rgba(232,226,212,0.5);font-size:11px;padding:4px 7px;cursor:pointer;transition:all .2s;}
  .lang-btn.active{border-color:var(--gold);color:var(--gold);background:rgba(201,168,76,0.08);}
  .lang-btn:hover{color:var(--cream);}`;

var APPLY_LANG_FN = `
function applyLang(code){
  var t=PAGE_LANGS[code]||PAGE_LANGS.en;
  localStorage.setItem('hrc_lang',code);
  document.querySelectorAll('[data-i18n]').forEach(function(el){var k=el.getAttribute('data-i18n');if(t[k]!==undefined)el.textContent=t[k];});
  document.querySelectorAll('[data-i18n-html]').forEach(function(el){var k=el.getAttribute('data-i18n-html');if(t[k]!==undefined)el.innerHTML=t[k];});
  document.querySelectorAll('[data-i18n-ph]').forEach(function(el){var k=el.getAttribute('data-i18n-ph');if(t[k]!==undefined)el.placeholder=t[k];});
  document.querySelectorAll('.lang-btn').forEach(function(b){b.classList.toggle('active',b.dataset.lang===code);});
  document.documentElement.lang=code;
}
document.getElementById('langBar').innerHTML=LANGS_LIST.map(function(l){return '<button class="lang-btn" data-lang="'+l.code+'" onclick="applyLang(\''+l.code+'\')">'+ l.flag+' '+l.code.toUpperCase()+'</button>';}).join('');
applyLang(localStorage.getItem('hrc_lang')||'en');
`;

// ══════════════════════════════════════════════
// AML.HTML
// ══════════════════════════════════════════════
var amlLangs = `const PAGE_LANGS = {
  en: {
    backLink:'← Back', pageTitle:'AML Policy',
    updated:'Anti-Money Laundering & Counter-Terrorism Financing Policy · 2026',
    warning:'🚨 HATHOR Royal Casino enforces a strict zero-tolerance policy against money laundering, fraud, and financial crime.',
    h1:'1. Introduction and Legal Basis', p1:'HATHOR Royal Casino operates in compliance with international AML (Anti-Money Laundering) and CFT (Counter-Terrorism Financing) standards. Our policy follows FATF (Financial Action Task Force) recommendations.',
    h2:'2. KYC Procedure', p2:'All players are required to complete KYC (Know Your Customer) verification before:',
    li_withdraw:'Withdrawing funds', li_threshold:'Reaching cumulative transactions equivalent to €2,000', li_suspicious:'When suspicious activity is detected',
    docs_title:'Required documents:', doc1:'Valid identity document (passport or ID card)', doc2:'Proof of address (no older than 3 months)', doc3:'Proof of source of funds (when required)',
    h3:'3. Risk Assessment', p3:'Each player is assessed by risk profile:',
    risk_low:'<strong>Low risk:</strong> Regular players with verified identity', risk_mid:'<strong>Medium risk:</strong> New players, large transactions', risk_high:'<strong>High risk:</strong> PEPs (politically exposed persons), large unexplained transactions',
    h4:'4. Monitoring and Reporting', p4:'We automatically monitor:',
    mon1:'Unusually large deposits or withdrawals', mon2:'Frequent small transactions (structuring)', mon3:'Transactions from high-risk jurisdictions', mon4:'Atypical gambling behaviour patterns',
    h5:'5. Prohibited Jurisdictions', p5:'We prohibit services to persons from:',
    jur1:'Countries on the FATF blacklist', jur2:'The United States and its territories', jur3:'Countries where online gambling is prohibited',
    h6:'6. Staff Training', p6:'All staff working with player accounts receive regular AML/CFT training and must report any suspicious cases to the compliance officer.',
    h7:'7. Record Keeping', p7:'All transaction and KYC records are kept for a minimum of 7 years in accordance with international requirements and provided to competent authorities on request.',
    h8:'8. AML Officer',
    contact_html:'AML Officer: <strong>aml@hathor.casino</strong><br/>Confidential reports: <strong>compliance@hathor.casino</strong>',
    footer:'© 2026 HATHOR Royal Casino · <a href="/terms.html" style="color:var(--gold)">T&amp;C</a> · <a href="/privacy.html" style="color:var(--gold)">Privacy Policy</a>',
  },
  lt: {
    backLink:'← Grįžti', pageTitle:'AML Politika',
    updated:'Kovos su pinigų plovimu ir terorizmo finansavimo prevencijos politika · 2026 m.',
    warning:'🚨 HATHOR Royal Casino taiko griežtą nulinės tolerancijos politiką pinigų plovimui, sukčiavimui ir finansinių nusikaltimų atžvilgiu.',
    h1:'1. Įvadas ir teisinė bazė', p1:'HATHOR Royal Casino vykdo veiklą laikydamasis tarptautinių kovos su pinigų plovimu (AML) ir terorizmo finansavimo prevencijos (CFT) standartų. Mūsų politika atitinka FATF rekomendacijas.',
    h2:'2. KYC procedūra', p2:'Visi žaidėjai privalomi pereiti KYC patikrinimą prieš:',
    li_withdraw:'Išimant lėšas', li_threshold:'Pasiekus 2,000 EUR ekvivalentą kumuliatyvių transakcijų', li_suspicious:'Kai kyla įtarimas dėl neteisėtos veiklos',
    docs_title:'Reikalingi dokumentai:', doc1:'Galiojantis asmens tapatybės dokumentas (pasas arba ID kortelė)', doc2:'Gyvenamosios vietos įrodymas (ne senesnis nei 3 mėnesiai)', doc3:'Lėšų kilmės įrodymas (esant poreikiui)',
    h3:'3. Rizikos vertinimas', p3:'Kiekvienas žaidėjas vertinamas pagal rizikos profilį:',
    risk_low:'<strong>Žema rizika:</strong> Reguliarūs žaidėjai su patvirtinta tapatybe', risk_mid:'<strong>Vidutinė rizika:</strong> Nauji žaidėjai, didelės transakcijos', risk_high:'<strong>Aukšta rizika:</strong> PEP (politiškai eksponuoti asmenys), didelės nesuprantamos transakcijos',
    h4:'4. Stebėjimas ir pranešimai', p4:'Automatiškai stebime:',
    mon1:'Neįprastai didelius įnešimus ar išėmimus', mon2:'Dažnus mažus sandorius (struktūrizavimas)', mon3:'Transakcijas iš didelės rizikos jurisdikcijų', mon4:'Netipišką lošimų elgsenos modelį',
    h5:'5. Draudžiamos jurisdikcijos', p5:'Draudžiame paslaugas teikti asmenims iš:',
    jur1:'FATF juodajame sąraše esančių šalių', jur2:'Jungtinių Amerikos Valstijų ir jų teritorijų', jur3:'Šalių, kuriose internetinis lošimas yra draudžiamas',
    h6:'6. Darbuotojų mokymai', p6:'Visi su žaidėjų paskyromis dirbantys darbuotojai reguliariai mokomi AML/CFT procedūrų ir privalo pranešti apie bet kokius įtartinus atvejus atsakingam pareigūnui.',
    h7:'7. Įrašų saugojimas', p7:'Visi transakcijų ir KYC dokumentai saugomi mažiausiai 7 metus pagal tarptautinius reikalavimus ir pateikiami kompetentingoms institucijoms pareikalavus.',
    h8:'8. AML pareigūnas',
    contact_html:'Atsakingas AML pareigūnas: <strong>aml@hathor.casino</strong><br/>Konfidencialūs pranešimai: <strong>compliance@hathor.casino</strong>',
    footer:'© 2026 HATHOR Royal Casino · <a href="/terms.html" style="color:var(--gold)">T&amp;C</a> · <a href="/privacy.html" style="color:var(--gold)">Privatumo politika</a>',
  },
  ru: {
    backLink:'← Назад', pageTitle:'Политика AML',
    updated:'Политика противодействия отмыванию денег и финансированию терроризма · 2026',
    warning:'🚨 HATHOR Royal Casino придерживается политики нулевой терпимости к отмыванию денег, мошенничеству и финансовым преступлениям.',
    h1:'1. Введение и правовая база', p1:'HATHOR Royal Casino работает в соответствии с международными стандартами AML и CFT. Наша политика следует рекомендациям FATF.',
    h2:'2. Процедура KYC', p2:'Все игроки обязаны пройти проверку KYC перед:',
    li_withdraw:'Выводом средств', li_threshold:'Достижением совокупных транзакций на €2,000', li_suspicious:'При подозрении в незаконной деятельности',
    docs_title:'Необходимые документы:', doc1:'Действующий документ, удостоверяющий личность', doc2:'Подтверждение адреса проживания (не старше 3 месяцев)', doc3:'Подтверждение источника средств (при необходимости)',
    h3:'3. Оценка рисков', p3:'Каждый игрок оценивается по профилю риска:',
    risk_low:'<strong>Низкий риск:</strong> Постоянные игроки с подтверждённой личностью', risk_mid:'<strong>Средний риск:</strong> Новые игроки, крупные транзакции', risk_high:'<strong>Высокий риск:</strong> ПЭЛ, крупные необъяснимые транзакции',
    h4:'4. Мониторинг и отчётность', p4:'Мы автоматически отслеживаем:',
    mon1:'Необычно крупные депозиты или выводы', mon2:'Частые мелкие транзакции (структурирование)', mon3:'Транзакции из юрисдикций высокого риска', mon4:'Нетипичные паттерны поведения в играх',
    h5:'5. Запрещённые юрисдикции', p5:'Мы запрещаем услуги лицам из:',
    jur1:'Стран в чёрном списке FATF', jur2:'США и их территорий', jur3:'Стран, где онлайн-гемблинг запрещён',
    h6:'6. Обучение персонала', p6:'Все сотрудники, работающие с аккаунтами игроков, регулярно проходят обучение AML/CFT и обязаны сообщать о подозрительных случаях.',
    h7:'7. Хранение записей', p7:'Все записи о транзакциях и KYC хранятся минимум 7 лет и предоставляются компетентным органам по запросу.',
    h8:'8. Сотрудник AML',
    contact_html:'Сотрудник AML: <strong>aml@hathor.casino</strong><br/>Конфиденциальные сообщения: <strong>compliance@hathor.casino</strong>',
    footer:'© 2026 HATHOR Royal Casino · <a href="/terms.html" style="color:var(--gold)">T&amp;C</a> · <a href="/privacy.html" style="color:var(--gold)">Политика конфиденциальности</a>',
  },
  de: { backLink:'← Zurück', pageTitle:'AML-Richtlinie', updated:'Richtlinie zur Bekämpfung von Geldwäsche und Terrorismusfinanzierung · 2026', warning:'🚨 HATHOR Royal Casino verfolgt eine strikte Null-Toleranz-Politik gegenüber Geldwäsche, Betrug und Finanzkriminalität.', h1:'1. Einleitung und Rechtsgrundlage', p1:'HATHOR Royal Casino handelt gemäß internationalen AML- und CFT-Standards. Unsere Richtlinie folgt den FATF-Empfehlungen.', h2:'2. KYC-Verfahren', p2:'Alle Spieler müssen die KYC-Prüfung vor Folgendem abschließen:', li_withdraw:'Auszahlung von Geldern', li_threshold:'Erreichen kumulativer Transaktionen von €2.000', li_suspicious:'Bei Verdacht auf illegale Aktivitäten', docs_title:'Erforderliche Dokumente:', doc1:'Gültiger Lichtbildausweis (Reisepass oder Personalausweis)', doc2:'Adressnachweis (nicht älter als 3 Monate)', doc3:'Nachweis der Mittelherkunft (bei Bedarf)', h3:'3. Risikobewertung', p3:'Jeder Spieler wird nach einem Risikoprofil bewertet:', risk_low:'<strong>Niedriges Risiko:</strong> Stammkunden mit verifizierter Identität', risk_mid:'<strong>Mittleres Risiko:</strong> Neukunden, große Transaktionen', risk_high:'<strong>Hohes Risiko:</strong> PEPs, große unerklärte Transaktionen', h4:'4. Überwachung und Meldung', p4:'Wir überwachen automatisch:', mon1:'Ungewöhnlich hohe Ein- oder Auszahlungen', mon2:'Häufige kleine Transaktionen (Strukturierung)', mon3:'Transaktionen aus Hochrisikogebieten', mon4:'Atypische Spielverhaltensmuster', h5:'5. Verbotene Jurisdiktionen', p5:'Wir verbieten Dienstleistungen für Personen aus:', jur1:'Ländern auf der FATF-Schwarzliste', jur2:'Den USA und ihren Territorien', jur3:'Ländern, in denen Online-Glücksspiel verboten ist', h6:'6. Mitarbeiterschulung', p6:'Alle Mitarbeiter, die mit Spielerkonten arbeiten, werden regelmäßig in AML/CFT-Verfahren geschult.', h7:'7. Aufbewahrung von Aufzeichnungen', p7:'Alle Transaktions- und KYC-Aufzeichnungen werden mindestens 7 Jahre aufbewahrt.', h8:'8. AML-Beauftragter', contact_html:'AML-Beauftragter: <strong>aml@hathor.casino</strong><br/>Vertrauliche Meldungen: <strong>compliance@hathor.casino</strong>', footer:'© 2026 HATHOR Royal Casino · <a href="/terms.html" style="color:var(--gold)">T&amp;C</a> · <a href="/privacy.html" style="color:var(--gold)">Datenschutz</a>', },
  pl: { backLink:'← Wstecz', pageTitle:'Polityka AML', updated:'Polityka przeciwdziałania praniu pieniędzy i finansowaniu terroryzmu · 2026', warning:'🚨 HATHOR Royal Casino stosuje politykę zerowej tolerancji wobec prania pieniędzy, oszustw i przestępstw finansowych.', h1:'1. Wprowadzenie i podstawa prawna', p1:'HATHOR Royal Casino działa zgodnie z międzynarodowymi standardami AML i CFT. Nasza polityka jest zgodna z zaleceniami FATF.', h2:'2. Procedura KYC', p2:'Wszyscy gracze muszą przejść weryfikację KYC przed:', li_withdraw:'Wypłatą środków', li_threshold:'Osiągnięciem łącznych transakcji o wartości €2 000', li_suspicious:'W przypadku podejrzenia nielegalnej działalności', docs_title:'Wymagane dokumenty:', doc1:'Ważny dokument tożsamości (paszport lub dowód osobisty)', doc2:'Potwierdzenie adresu (nie starsze niż 3 miesiące)', doc3:'Potwierdzenie źródła środków (jeśli wymagane)', h3:'3. Ocena ryzyka', p3:'Każdy gracz jest oceniany według profilu ryzyka:', risk_low:'<strong>Niskie ryzyko:</strong> Stali gracze z zweryfikowaną tożsamością', risk_mid:'<strong>Średnie ryzyko:</strong> Nowi gracze, duże transakcje', risk_high:'<strong>Wysokie ryzyko:</strong> PEP, duże niewyjaśnione transakcje', h4:'4. Monitorowanie i raportowanie', p4:'Automatycznie monitorujemy:', mon1:'Wyjątkowo duże depozyty lub wypłaty', mon2:'Częste małe transakcje (strukturyzacja)', mon3:'Transakcje z jurysdykcji wysokiego ryzyka', mon4:'Nietypowe wzorce zachowań podczas gry', h5:'5. Zakazane jurysdykcje', p5:'Zabraniamy usług osobom z:', jur1:'Krajów na czarnej liście FATF', jur2:'USA i ich terytoriów', jur3:'Krajów, gdzie hazard online jest zabroniony', h6:'6. Szkolenia pracowników', p6:'Wszyscy pracownicy obsługujący konta graczy przechodzą regularne szkolenia AML/CFT.', h7:'7. Przechowywanie dokumentacji', p7:'Wszystkie dokumenty transakcji i KYC są przechowywane przez minimum 7 lat.', h8:'8. Oficer AML', contact_html:'Oficer AML: <strong>aml@hathor.casino</strong><br/>Zgłoszenia poufne: <strong>compliance@hathor.casino</strong>', footer:'© 2026 HATHOR Royal Casino · <a href="/terms.html" style="color:var(--gold)">T&amp;C</a> · <a href="/privacy.html" style="color:var(--gold)">Polityka prywatności</a>', },
  fr: { backLink:'← Retour', pageTitle:'Politique AML', updated:'Politique de lutte contre le blanchiment d\'argent et le financement du terrorisme · 2026', warning:'🚨 HATHOR Royal Casino applique une politique de tolérance zéro contre le blanchiment d\'argent, la fraude et la criminalité financière.', h1:'1. Introduction et base juridique', p1:'HATHOR Royal Casino opère conformément aux normes internationales AML et CFT. Notre politique suit les recommandations du GAFI.', h2:'2. Procédure KYC', p2:'Tous les joueurs doivent compléter la vérification KYC avant:', li_withdraw:'Retrait de fonds', li_threshold:'Atteindre l\'équivalent de 2 000 € en transactions cumulées', li_suspicious:'En cas de soupçon d\'activité illégale', docs_title:'Documents requis:', doc1:'Document d\'identité valide (passeport ou carte d\'identité)', doc2:'Justificatif de domicile (daté de moins de 3 mois)', doc3:'Justificatif d\'origine des fonds (si nécessaire)', h3:'3. Évaluation des risques', p3:'Chaque joueur est évalué selon un profil de risque:', risk_low:'<strong>Risque faible:</strong> Joueurs réguliers avec identité vérifiée', risk_mid:'<strong>Risque moyen:</strong> Nouveaux joueurs, transactions importantes', risk_high:'<strong>Risque élevé:</strong> PPE, transactions importantes inexpliquées', h4:'4. Surveillance et déclarations', p4:'Nous surveillons automatiquement:', mon1:'Dépôts ou retraits inhabituellement importants', mon2:'Transactions fréquentes de faible montant (structuration)', mon3:'Transactions en provenance de juridictions à risque élevé', mon4:'Comportements de jeu atypiques', h5:'5. Juridictions interdites', p5:'Nous interdisons les services aux personnes de:', jur1:'Pays figurant sur la liste noire du GAFI', jur2:'Les États-Unis et leurs territoires', jur3:'Les pays où les jeux en ligne sont interdits', h6:'6. Formation du personnel', p6:'Tous les employés travaillant avec les comptes joueurs reçoivent une formation régulière AML/CFT.', h7:'7. Conservation des données', p7:'Tous les dossiers de transactions et KYC sont conservés au moins 7 ans.', h8:'8. Responsable AML', contact_html:'Responsable AML: <strong>aml@hathor.casino</strong><br/>Signalements confidentiels: <strong>compliance@hathor.casino</strong>', footer:'© 2026 HATHOR Royal Casino · <a href="/terms.html" style="color:var(--gold)">T&amp;C</a> · <a href="/privacy.html" style="color:var(--gold)">Politique de confidentialité</a>', },
  tr: { backLink:'← Geri', pageTitle:'AML Politikası', updated:'Kara Para Aklamayla Mücadele ve Terörün Finansmanını Önleme Politikası · 2026', warning:'🚨 HATHOR Royal Casino kara para aklamaya, dolandırıcılığa ve mali suçlara karşı sıfır tolerans politikası uygulamaktadır.', h1:'1. Giriş ve Yasal Dayanak', p1:'HATHOR Royal Casino uluslararası AML ve CFT standartlarına uygun faaliyet göstermektedir.', h2:'2. KYC Prosedürü', p2:'Tüm oyuncuların şunlardan önce KYC doğrulamasını tamamlaması gerekir:', li_withdraw:'Para çekimi', li_threshold:'Kümülatif işlemlerin 2.000 EUR eşdeğerine ulaşması', li_suspicious:'Yasadışı faaliyet şüphesi durumunda', docs_title:'Gerekli belgeler:', doc1:'Geçerli kimlik belgesi (pasaport veya kimlik kartı)', doc2:'İkametgah belgesi (3 aydan eski olmayan)', doc3:'Fon kaynağı belgesi (gerektiğinde)', h3:'3. Risk Değerlendirmesi', p3:'Her oyuncu risk profiline göre değerlendirilir:', risk_low:'<strong>Düşük risk:</strong> Kimliği doğrulanmış düzenli oyuncular', risk_mid:'<strong>Orta risk:</strong> Yeni oyuncular, büyük işlemler', risk_high:'<strong>Yüksek risk:</strong> Siyasi açıdan riskli kişiler, büyük açıklanamaz işlemler', h4:'4. İzleme ve Raporlama', p4:'Otomatik olarak izliyoruz:', mon1:'Olağandışı büyük para yatırma veya çekimler', mon2:'Sık küçük işlemler (yapılandırma)', mon3:'Yüksek riskli yargı bölgelerinden işlemler', mon4:'Atipik kumar davranışı kalıpları', h5:'5. Yasak Yargı Bölgeleri', p5:'Şu kişilere hizmet yasaklıdır:', jur1:'FATF kara listesindeki ülkeler', jur2:'ABD ve toprakları', jur3:'Çevrimiçi kumarın yasak olduğu ülkeler', h6:'6. Personel Eğitimi', p6:'Oyuncu hesaplarıyla çalışan tüm personel düzenli AML/CFT eğitimi alır.', h7:'7. Kayıt Tutma', p7:'Tüm işlem ve KYC belgeleri en az 7 yıl saklanır.', h8:'8. AML Görevlisi', contact_html:'AML Görevlisi: <strong>aml@hathor.casino</strong><br/>Gizli bildirimler: <strong>compliance@hathor.casino</strong>', footer:'© 2026 HATHOR Royal Casino · <a href="/terms.html" style="color:var(--gold)">T&amp;C</a> · <a href="/privacy.html" style="color:var(--gold)">Gizlilik Politikası</a>', },
  ar: { backLink:'← رجوع', pageTitle:'سياسة AML', updated:'سياسة مكافحة غسيل الأموال وتمويل الإرهاب · 2026', warning:'🚨 يطبّق HATHOR Royal Casino سياسة عدم التسامح تجاه غسيل الأموال والاحتيال والجرائم المالية.', h1:'1. المقدمة والأساس القانوني', p1:'يعمل HATHOR Royal Casino وفقًا للمعايير الدولية AML وCFT ويتبع توصيات FATF.', h2:'2. إجراءات KYC', p2:'يجب على جميع اللاعبين إكمال التحقق من KYC قبل:', li_withdraw:'سحب الأموال', li_threshold:'الوصول إلى معاملات تراكمية بقيمة 2000 يورو', li_suspicious:'عند الاشتباه في نشاط غير قانوني', docs_title:'الوثائق المطلوبة:', doc1:'وثيقة هوية سارية (جواز سفر أو بطاقة هوية)', doc2:'إثبات العنوان (لا يتجاوز 3 أشهر)', doc3:'إثبات مصدر الأموال (عند الحاجة)', h3:'3. تقييم المخاطر', p3:'يتم تقييم كل لاعب وفق ملف المخاطر:', risk_low:'<strong>مخاطر منخفضة:</strong> لاعبون منتظمون بهوية موثّقة', risk_mid:'<strong>مخاطر متوسطة:</strong> لاعبون جدد، معاملات كبيرة', risk_high:'<strong>مخاطر عالية:</strong> شخصيات سياسية، معاملات كبيرة غير مفسّرة', h4:'4. المراقبة والإبلاغ', p4:'نراقب تلقائيًا:', mon1:'الودائع أو السحوبات الكبيرة بشكل غير معتاد', mon2:'المعاملات الصغيرة المتكررة', mon3:'المعاملات من ولايات قضائية عالية المخاطر', mon4:'أنماط سلوك القمار غير النمطية', h5:'5. الولايات القضائية المحظورة', p5:'نحظر الخدمات للأشخاص من:', jur1:'الدول في القائمة السوداء لـ FATF', jur2:'الولايات المتحدة وأراضيها', jur3:'الدول التي يُحظر فيها القمار الإلكتروني', h6:'6. تدريب الموظفين', p6:'يتلقى جميع الموظفين العاملين مع حسابات اللاعبين تدريبًا منتظمًا على AML/CFT.', h7:'7. حفظ السجلات', p7:'تُحفظ جميع سجلات المعاملات و KYC لمدة 7 سنوات على الأقل.', h8:'8. مسؤول AML', contact_html:'مسؤول AML: <strong>aml@hathor.casino</strong><br/>التقارير السرية: <strong>compliance@hathor.casino</strong>', footer:'© 2026 HATHOR Royal Casino · <a href="/terms.html" style="color:var(--gold)">T&amp;C</a> · <a href="/privacy.html" style="color:var(--gold)">سياسة الخصوصية</a>', },
  zh: { backLink:'← 返回', pageTitle:'AML政策', updated:'反洗钱和反恐融资政策 · 2026', warning:'🚨 HATHOR Royal Casino对洗钱、欺诈和金融犯罪实行零容忍政策。', h1:'1. 简介与法律基础', p1:'HATHOR Royal Casino依照国际AML和CFT标准运营，遵循FATF建议。', h2:'2. KYC程序', p2:'所有玩家必须在以下情况前完成KYC验证：', li_withdraw:'提取资金', li_threshold:'累计交易达到2,000欧元等值', li_suspicious:'怀疑存在非法活动时', docs_title:'所需文件：', doc1:'有效身份证件（护照或身份证）', doc2:'居住地址证明（3个月内）', doc3:'资金来源证明（如需）', h3:'3. 风险评估', p3:'每位玩家均按风险档案进行评估：', risk_low:'<strong>低风险：</strong>经过身份验证的老玩家', risk_mid:'<strong>中风险：</strong>新玩家、大额交易', risk_high:'<strong>高风险：</strong>政治敏感人士、大额不明交易', h4:'4. 监控与报告', p4:'我们自动监控：', mon1:'异常大额存取款', mon2:'频繁小额交易（结构化）', mon3:'来自高风险司法管辖区的交易', mon4:'非典型赌博行为模式', h5:'5. 禁止的司法管辖区', p5:'我们禁止向以下地区人员提供服务：', jur1:'FATF黑名单国家', jur2:'美国及其领土', jur3:'禁止在线赌博的国家', h6:'6. 员工培训', p6:'所有管理玩家账户的员工定期接受AML/CFT培训。', h7:'7. 记录保存', p7:'所有交易和KYC记录至少保存7年。', h8:'8. AML专员', contact_html:'AML专员：<strong>aml@hathor.casino</strong><br/>保密举报：<strong>compliance@hathor.casino</strong>', footer:'© 2026 HATHOR Royal Casino · <a href="/terms.html" style="color:var(--gold)">T&amp;C</a> · <a href="/privacy.html" style="color:var(--gold)">隐私政策</a>', },
  hi: { backLink:'← वापस', pageTitle:'AML नीति', updated:'मनी लॉन्ड्रिंग रोधी और आतंकवाद वित्तपोषण रोकथाम नीति · 2026', warning:'🚨 HATHOR Royal Casino मनी लॉन्ड्रिंग, धोखाधड़ी और वित्तीय अपराध के प्रति शून्य सहनशीलता नीति लागू करता है।', h1:'1. परिचय और कानूनी आधार', p1:'HATHOR Royal Casino अंतर्राष्ट्रीय AML और CFT मानकों के अनुसार संचालित होता है।', h2:'2. KYC प्रक्रिया', p2:'सभी खिलाड़ियों को निम्न से पहले KYC सत्यापन पूरा करना होगा:', li_withdraw:'धन निकासी', li_threshold:'€2,000 के बराबर संचयी लेनदेन', li_suspicious:'अवैध गतिविधि का संदेह होने पर', docs_title:'आवश्यक दस्तावेज:', doc1:'वैध पहचान दस्तावेज (पासपोर्ट या ID)', doc2:'पते का प्रमाण (3 महीने से पुराना नहीं)', doc3:'धन के स्रोत का प्रमाण (यदि आवश्यक हो)', h3:'3. जोखिम मूल्यांकन', p3:'प्रत्येक खिलाड़ी का जोखिम प्रोफाइल के अनुसार मूल्यांकन किया जाता है:', risk_low:'<strong>कम जोखिम:</strong> सत्यापित पहचान वाले नियमित खिलाड़ी', risk_mid:'<strong>मध्यम जोखिम:</strong> नए खिलाड़ी, बड़े लेनदेन', risk_high:'<strong>उच्च जोखिम:</strong> PEP, बड़े अस्पष्ट लेनदेन', h4:'4. निगरानी और रिपोर्टिंग', p4:'हम स्वचालित रूप से निगरानी करते हैं:', mon1:'असामान्य रूप से बड़ी जमा या निकासी', mon2:'बार-बार छोटे लेनदेन (संरचना)', mon3:'उच्च जोखिम क्षेत्राधिकार से लेनदेन', mon4:'अटिपिकल जुआ व्यवहार पैटर्न', h5:'5. निषिद्ध क्षेत्राधिकार', p5:'हम इन लोगों को सेवाएं प्रतिबंधित करते हैं:', jur1:'FATF ब्लैकलिस्ट में शामिल देश', jur2:'अमेरिका और उसके क्षेत्र', jur3:'जहां ऑनलाइन जुआ प्रतिबंधित है', h6:'6. कर्मचारी प्रशिक्षण', p6:'खिलाड़ी खातों के साथ काम करने वाले सभी कर्मचारी नियमित AML/CFT प्रशिक्षण प्राप्त करते हैं।', h7:'7. रिकॉर्ड रखरखाव', p7:'सभी लेनदेन और KYC रिकॉर्ड कम से कम 7 साल तक रखे जाते हैं।', h8:'8. AML अधिकारी', contact_html:'AML अधिकारी: <strong>aml@hathor.casino</strong><br/>गोपनीय रिपोर्ट: <strong>compliance@hathor.casino</strong>', footer:'© 2026 HATHOR Royal Casino · <a href="/terms.html" style="color:var(--gold)">T&amp;C</a> · <a href="/privacy.html" style="color:var(--gold)">गोपनीयता नीति</a>', },
  uk: { backLink:'← Назад', pageTitle:'Політика AML', updated:'Політика протидії відмиванню коштів та фінансуванню тероризму · 2026', warning:'🚨 HATHOR Royal Casino застосовує суворий принцип нульової терпимості щодо відмивання грошей, шахрайства та фінансових злочинів.', h1:'1. Вступ та правова база', p1:'HATHOR Royal Casino діє відповідно до міжнародних стандартів AML та CFT і дотримується рекомендацій FATF.', h2:'2. Процедура KYC', p2:'Усі гравці зобовʼязані пройти перевірку KYC перед:', li_withdraw:'Виведенням коштів', li_threshold:'Досягненням кумулятивних транзакцій еквівалентом €2 000', li_suspicious:'При підозрі в незаконній діяльності', docs_title:'Необхідні документи:', doc1:'Дійсний документ, що посвідчує особу (паспорт або ID-картка)', doc2:'Підтвердження адреси проживання (не старше 3 місяців)', doc3:'Підтвердження джерела коштів (за необхідності)', h3:'3. Оцінка ризиків', p3:'Кожен гравець оцінюється за профілем ризику:', risk_low:'<strong>Низький ризик:</strong> Постійні гравці з підтвердженою особою', risk_mid:'<strong>Середній ризик:</strong> Нові гравці, великі транзакції', risk_high:'<strong>Високий ризик:</strong> ПЕО, великі незрозумілі транзакції', h4:'4. Моніторинг та звітність', p4:'Ми автоматично відстежуємо:', mon1:'Незвично великі депозити або виведення', mon2:'Часті дрібні транзакції (структурування)', mon3:'Транзакції з юрисдикцій високого ризику', mon4:'Нетипові моделі поведінки в іграх', h5:'5. Заборонені юрисдикції', p5:'Ми забороняємо послуги особам з:', jur1:'Країн у чорному списку FATF', jur2:'США та їхніх територій', jur3:'Країн, де онлайн-гемблінг заборонений', h6:'6. Навчання персоналу', p6:'Усі співробітники, що працюють з акаунтами гравців, регулярно проходять навчання AML/CFT.', h7:'7. Зберігання записів', p7:'Усі записи про транзакції та KYC зберігаються щонайменше 7 років.', h8:'8. Офіцер AML', contact_html:'Офіцер AML: <strong>aml@hathor.casino</strong><br/>Конфіденційні повідомлення: <strong>compliance@hathor.casino</strong>', footer:'© 2026 HATHOR Royal Casino · <a href="/terms.html" style="color:var(--gold)">T&amp;C</a> · <a href="/privacy.html" style="color:var(--gold)">Політика конфіденційності</a>', },
};`;

// Build aml.html
var aml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>AML Policy — HATHOR Royal Casino</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  :root{--gold:#c9a84c;--gold2:#ffd680;--bg:#0a0806;--card:rgba(255,255,255,0.03);--border:rgba(201,168,76,0.15);--cream:#e8e2d4;}
  body{background:var(--bg);color:var(--cream);font-family:'Inter',sans-serif;font-size:15px;line-height:1.7;}
  header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid var(--border);position:sticky;top:0;background:rgba(10,8,6,0.97);backdrop-filter:blur(10px);z-index:100;gap:12px;flex-wrap:wrap;}
  .logo{font-family:'Cinzel',serif;font-size:18px;font-weight:700;color:var(--gold);text-decoration:none;letter-spacing:2px;white-space:nowrap;}
  .back-link{color:var(--gold);text-decoration:none;font-size:12px;border:1px solid var(--border);padding:5px 12px;border-radius:8px;white-space:nowrap;}${LANG_BAR_CSS}
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
</style>
</head>
<body>
<header>
  <a class="logo" href="/">&#x2B21; HATHOR</a>
  <div class="lang-bar" id="langBar"></div>
  <a class="back-link" href="/" id="backLink" data-i18n="backLink">← Back</a>
</header>
<div class="container">
  <div class="page-title" data-i18n="pageTitle">AML Policy</div>
  <div class="updated" data-i18n="updated">Anti-Money Laundering Policy · 2026</div>
  <div class="warning-box" data-i18n="warning">🚨 Zero tolerance policy against money laundering.</div>
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
    <strong data-i18n="docs_title">Required documents:</strong><br/>
    &#8226; <span data-i18n="doc1"></span><br/>
    &#8226; <span data-i18n="doc2"></span><br/>
    &#8226; <span data-i18n="doc3"></span>
  </div>
  <h2 data-i18n="h3">3. Risk Assessment</h2>
  <p data-i18n="p3"></p>
  <ul>
    <li data-i18n-html="risk_low"></li>
    <li data-i18n-html="risk_mid"></li>
    <li data-i18n-html="risk_high"></li>
  </ul>
  <h2 data-i18n="h4">4. Monitoring</h2>
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
<footer data-i18n-html="footer">&#169; 2026 HATHOR Royal Casino</footer>
<script>
${LANGS_LIST_STR}
${amlLangs}
${APPLY_LANG_FN}
</script>
</body>
</html>`;

fs.writeFileSync('C:/Users/PC/casino/public/aml.html', aml, 'utf8');
console.log('aml.html DONE');

// ══════════════════════════════════════════════
// LOGIN.HTML - add language switching to existing page
// ══════════════════════════════════════════════
var loginLangs = {
  en: { tab_login:'Log In', tab_register:'Register', welcome:'Welcome!', redirecting:'Redirecting to casino...', lbl_email:'Email', lbl_pwd:'Password', lbl_name:'Full Name', lbl_pwd2:'Repeat Password', btn_login:'Log In →', btn_register:'Create Account →', age_warn:'Registration and play allowed <strong>only for 18+</strong>. Access is prohibited for minors.', no_account:'No account? <a href="#" onclick="switchTab(\'register\');return false;">Register here</a>', have_account:'Already have an account? <a href="#" onclick="switchTab(\'login\');return false;">Log in</a>', legal:'By registering you agree to <a href="/terms.html">Terms & Conditions</a> and confirm you are 18+.', ph_email:'your@email.com', ph_name:'Your Name', ph_pwd:'••••••••', ph_pwd_min:'At least 8 characters', pwd_weak:'Weak', pwd_ok:'OK', pwd_strong:'Strong', err_fill:'Fill in all fields', err_short:'Password must be at least 8 characters', err_match:'Passwords do not match', err_invalid:'Invalid email or password', err_exists:'Email already registered', logging_in:'Logging in...', registering:'Creating account...', forgot:'Forgot password?' },
  lt: { tab_login:'Prisijungti', tab_register:'Registruotis', welcome:'Sveiki atvykę!', redirecting:'Nukreipiame į kazino...', lbl_email:'El. paštas', lbl_pwd:'Slaptažodis', lbl_name:'Vardas ir Pavardė', lbl_pwd2:'Pakartokite Slaptažodį', btn_login:'Prisijungti →', btn_register:'Sukurti Paskyrą →', age_warn:'Registracija ir žaidimas leidžiami <strong>tik nuo 18 metų</strong>. Jaunesniems prieiga draudžiama.', no_account:'Neturite paskyros? <a href="#" onclick="switchTab(\'register\');return false;">Registruokitės čia</a>', have_account:'Jau turite paskyrą? <a href="#" onclick="switchTab(\'login\');return false;">Prisijunkite</a>', legal:'Registruodamiesi sutinkate su <a href="/terms.html">Naudojimo taisyklėmis</a> ir patvirtinate, kad esate 18+.', ph_email:'jusu@pastas.lt', ph_name:'Vardenis Pavardenis', ph_pwd:'••••••••', ph_pwd_min:'Bent 8 simboliai', pwd_weak:'Silpnas', pwd_ok:'Vidutinis', pwd_strong:'Stiprus', err_fill:'Užpildykite visus laukus', err_short:'Slaptažodis turi būti bent 8 simboliai', err_match:'Slaptažodžiai nesutampa', err_invalid:'Neteisingas el. paštas arba slaptažodis', err_exists:'El. paštas jau registruotas', logging_in:'Jungiamasi...', registering:'Kuriama paskyra...', forgot:'Pamiršote slaptažodį?' },
  ru: { tab_login:'Войти', tab_register:'Регистрация', welcome:'Добро пожаловать!', redirecting:'Перенаправление в казино...', lbl_email:'Email', lbl_pwd:'Пароль', lbl_name:'Имя и фамилия', lbl_pwd2:'Повторите пароль', btn_login:'Войти →', btn_register:'Создать аккаунт →', age_warn:'Регистрация и игра разрешены <strong>только для 18+</strong>.', no_account:'Нет аккаунта? <a href="#" onclick="switchTab(\'register\');return false;">Зарегистрируйтесь</a>', have_account:'Есть аккаунт? <a href="#" onclick="switchTab(\'login\');return false;">Войдите</a>', legal:'Регистрируясь, вы соглашаетесь с <a href="/terms.html">Правилами</a>.', ph_email:'your@email.com', ph_name:'Имя Фамилия', ph_pwd:'••••••••', ph_pwd_min:'Минимум 8 символов', pwd_weak:'Слабый', pwd_ok:'Средний', pwd_strong:'Сильный', err_fill:'Заполните все поля', err_short:'Пароль минимум 8 символов', err_match:'Пароли не совпадают', err_invalid:'Неверный email или пароль', err_exists:'Email уже зарегистрирован', logging_in:'Вход...', registering:'Создание аккаунта...', forgot:'Забыли пароль?' },
  de: { tab_login:'Anmelden', tab_register:'Registrieren', welcome:'Willkommen!', redirecting:'Weiterleitung zum Casino...', lbl_email:'E-Mail', lbl_pwd:'Passwort', lbl_name:'Vor- und Nachname', lbl_pwd2:'Passwort wiederholen', btn_login:'Anmelden →', btn_register:'Konto erstellen →', age_warn:'Registrierung und Spiel nur für <strong>18+</strong> erlaubt.', no_account:'Kein Konto? <a href="#" onclick="switchTab(\'register\');return false;">Registrieren</a>', have_account:'Konto vorhanden? <a href="#" onclick="switchTab(\'login\');return false;">Anmelden</a>', legal:'Durch die Registrierung stimmen Sie den <a href="/terms.html">AGB</a> zu.', ph_email:'ihre@email.de', ph_name:'Vorname Nachname', ph_pwd:'••••••••', ph_pwd_min:'Mindestens 8 Zeichen', pwd_weak:'Schwach', pwd_ok:'Mittel', pwd_strong:'Stark', err_fill:'Alle Felder ausfüllen', err_short:'Passwort mindestens 8 Zeichen', err_match:'Passwörter stimmen nicht überein', err_invalid:'Ungültige E-Mail oder falsches Passwort', err_exists:'E-Mail bereits registriert', logging_in:'Anmeldung...', registering:'Konto wird erstellt...', forgot:'Passwort vergessen?' },
  pl: { tab_login:'Zaloguj się', tab_register:'Zarejestruj się', welcome:'Witamy!', redirecting:'Przekierowanie do kasyna...', lbl_email:'Email', lbl_pwd:'Hasło', lbl_name:'Imię i nazwisko', lbl_pwd2:'Powtórz hasło', btn_login:'Zaloguj się →', btn_register:'Utwórz konto →', age_warn:'Rejestracja i gra dozwolona <strong>tylko dla 18+</strong>.', no_account:'Nie masz konta? <a href="#" onclick="switchTab(\'register\');return false;">Zarejestruj się</a>', have_account:'Masz konto? <a href="#" onclick="switchTab(\'login\');return false;">Zaloguj się</a>', legal:'Rejestrując się, akceptujesz <a href="/terms.html">Regulamin</a>.', ph_email:'twoj@email.pl', ph_name:'Imię Nazwisko', ph_pwd:'••••••••', ph_pwd_min:'Minimum 8 znaków', pwd_weak:'Słabe', pwd_ok:'Średnie', pwd_strong:'Silne', err_fill:'Wypełnij wszystkie pola', err_short:'Hasło musi mieć min. 8 znaków', err_match:'Hasła nie są zgodne', err_invalid:'Nieprawidłowy email lub hasło', err_exists:'Email już zarejestrowany', logging_in:'Logowanie...', registering:'Tworzenie konta...', forgot:'Zapomniałeś hasła?' },
  fr: { tab_login:'Se connecter', tab_register:"S'inscrire", welcome:'Bienvenue !', redirecting:'Redirection vers le casino...', lbl_email:'Email', lbl_pwd:'Mot de passe', lbl_name:'Prénom et nom', lbl_pwd2:'Répéter le mot de passe', btn_login:'Se connecter →', btn_register:'Créer un compte →', age_warn:'Inscription et jeu autorisés <strong>uniquement pour 18+</strong>.', no_account:"Pas de compte ? <a href=\"#\" onclick=\"switchTab('register');return false;\">S'inscrire</a>", have_account:"Déjà un compte ? <a href=\"#\" onclick=\"switchTab('login');return false;\">Se connecter</a>", legal:'En vous inscrivant, vous acceptez les <a href="/terms.html">CGU</a>.', ph_email:'votre@email.fr', ph_name:'Prénom Nom', ph_pwd:'••••••••', ph_pwd_min:'Au moins 8 caractères', pwd_weak:'Faible', pwd_ok:'Moyen', pwd_strong:'Fort', err_fill:'Remplissez tous les champs', err_short:'Mot de passe minimum 8 caractères', err_match:'Les mots de passe ne correspondent pas', err_invalid:'Email ou mot de passe invalide', err_exists:'Email déjà enregistré', logging_in:'Connexion...', registering:'Création du compte...', forgot:'Mot de passe oublié ?' },
  tr: { tab_login:'Giriş Yap', tab_register:'Kayıt Ol', welcome:'Hoş Geldiniz!', redirecting:"Kumarhaneye yönlendiriliyor...", lbl_email:'E-posta', lbl_pwd:'Şifre', lbl_name:'Ad Soyad', lbl_pwd2:'Şifreyi Tekrarla', btn_login:'Giriş Yap →', btn_register:'Hesap Oluştur →', age_warn:'Kayıt ve oyun <strong>yalnızca 18+</strong> için.', no_account:"Hesabınız yok mu? <a href=\"#\" onclick=\"switchTab('register');return false;\">Kayıt olun</a>", have_account:"Hesabınız var mı? <a href=\"#\" onclick=\"switchTab('login');return false;\">Giriş yapın</a>", legal:'Kaydolarak <a href="/terms.html">Şartlar</a>\'ı kabul etmiş sayılırsınız.', ph_email:'email@adresiniz.com', ph_name:'Ad Soyad', ph_pwd:'••••••••', ph_pwd_min:'En az 8 karakter', pwd_weak:'Zayıf', pwd_ok:'Orta', pwd_strong:'Güçlü', err_fill:'Tüm alanları doldurun', err_short:'Şifre en az 8 karakter', err_match:'Şifreler eşleşmiyor', err_invalid:'Geçersiz e-posta veya şifre', err_exists:'E-posta zaten kayıtlı', logging_in:'Giriş yapılıyor...', registering:'Hesap oluşturuluyor...', forgot:'Şifremi unuttum' },
  ar: { tab_login:'تسجيل الدخول', tab_register:'إنشاء حساب', welcome:'مرحباً!', redirecting:'جارٍ التوجيه إلى الكازينو...', lbl_email:'البريد الإلكتروني', lbl_pwd:'كلمة المرور', lbl_name:'الاسم الكامل', lbl_pwd2:'تكرار كلمة المرور', btn_login:'تسجيل الدخول →', btn_register:'إنشاء حساب →', age_warn:'التسجيل واللعب مسموح <strong>فقط لمن هم 18+</strong>.', no_account:'ليس لديك حساب؟ <a href="#" onclick="switchTab(\'register\');return false;">سجّل الآن</a>', have_account:'لديك حساب؟ <a href="#" onclick="switchTab(\'login\');return false;">سجّل الدخول</a>', legal:'بالتسجيل، تقبل <a href="/terms.html">الشروط والأحكام</a>.', ph_email:'بريدك@الإلكتروني.com', ph_name:'الاسم الكامل', ph_pwd:'••••••••', ph_pwd_min:'8 أحرف على الأقل', pwd_weak:'ضعيف', pwd_ok:'متوسط', pwd_strong:'قوي', err_fill:'أكمل جميع الحقول', err_short:'كلمة المرور 8 أحرف على الأقل', err_match:'كلمتا المرور غير متطابقتين', err_invalid:'البريد أو كلمة المرور غير صحيحة', err_exists:'البريد الإلكتروني مسجّل مسبقاً', logging_in:'جارٍ تسجيل الدخول...', registering:'جارٍ إنشاء الحساب...', forgot:'نسيت كلمة المرور؟' },
  zh: { tab_login:'登录', tab_register:'注册', welcome:'欢迎！', redirecting:'正在跳转到赌场...', lbl_email:'邮箱', lbl_pwd:'密码', lbl_name:'姓名', lbl_pwd2:'重复密码', btn_login:'登录 →', btn_register:'创建账户 →', age_warn:'注册和游戏仅限 <strong>18岁以上</strong>。', no_account:'没有账户？<a href="#" onclick="switchTab(\'register\');return false;">注册</a>', have_account:'已有账户？<a href="#" onclick="switchTab(\'login\');return false;">登录</a>', legal:'注册即表示您同意<a href="/terms.html">服务条款</a>。', ph_email:'你的@邮箱.com', ph_name:'姓名', ph_pwd:'••••••••', ph_pwd_min:'至少8个字符', pwd_weak:'弱', pwd_ok:'中', pwd_strong:'强', err_fill:'请填写所有字段', err_short:'密码至少8个字符', err_match:'密码不匹配', err_invalid:'邮箱或密码无效', err_exists:'邮箱已注册', logging_in:'登录中...', registering:'创建账户中...', forgot:'忘记密码？' },
  hi: { tab_login:'लॉग इन', tab_register:'रजिस्टर', welcome:'स्वागत है!', redirecting:'कैसीनो पर रीडायरेक्ट हो रहा है...', lbl_email:'ईमेल', lbl_pwd:'पासवर्ड', lbl_name:'पूरा नाम', lbl_pwd2:'पासवर्ड दोबारा', btn_login:'लॉग इन →', btn_register:'खाता बनाएं →', age_warn:'पंजीकरण और खेल केवल <strong>18+</strong> के लिए।', no_account:'खाता नहीं है? <a href="#" onclick="switchTab(\'register\');return false;">यहाँ रजिस्टर करें</a>', have_account:'खाता है? <a href="#" onclick="switchTab(\'login\');return false;">लॉग इन करें</a>', legal:'रजिस्टर करके आप <a href="/terms.html">नियमों</a> से सहमत हैं।', ph_email:'आपका@ईमेल.com', ph_name:'पूरा नाम', ph_pwd:'••••••••', ph_pwd_min:'कम से कम 8 अक्षर', pwd_weak:'कमजोर', pwd_ok:'ठीक', pwd_strong:'मजबूत', err_fill:'सभी फ़ील्ड भरें', err_short:'पासवर्ड कम से कम 8 अक्षर', err_match:'पासवर्ड मेल नहीं खाते', err_invalid:'अमान्य ईमेल या पासवर्ड', err_exists:'ईमेल पहले से पंजीकृत है', logging_in:'लॉग इन हो रहा है...', registering:'खाता बन रहा है...', forgot:'पासवर्ड भूल गए?' },
  uk: { tab_login:'Увійти', tab_register:'Реєстрація', welcome:'Ласкаво просимо!', redirecting:'Переспрямування до казино...', lbl_email:'Email', lbl_pwd:'Пароль', lbl_name:'Імʼя та прізвище', lbl_pwd2:'Повторіть пароль', btn_login:'Увійти →', btn_register:'Створити акаунт →', age_warn:'Реєстрація та гра дозволені <strong>лише для 18+</strong>.', no_account:'Немає акаунту? <a href="#" onclick="switchTab(\'register\');return false;">Зареєструйтесь</a>', have_account:'Вже є акаунт? <a href="#" onclick="switchTab(\'login\');return false;">Увійдіть</a>', legal:'Реєструючись, ви погоджуєтесь з <a href="/terms.html">Умовами</a>.', ph_email:'ваш@email.com', ph_name:'Імʼя Прізвище', ph_pwd:'••••••••', ph_pwd_min:'Мінімум 8 символів', pwd_weak:'Слабкий', pwd_ok:'Середній', pwd_strong:'Сильний', err_fill:'Заповніть усі поля', err_short:'Пароль мінімум 8 символів', err_match:'Паролі не збігаються', err_invalid:'Неправильний email або пароль', err_exists:'Email вже зареєстрований', logging_in:'Вхід...', registering:'Створення акаунту...', forgot:'Забули пароль?' },
};

// Patch login.html
var login = fs.readFileSync('C:/Users/PC/casino/public/login.html', 'utf8');

// Add lang-bar CSS before </style>
login = login.replace('</style>', LANG_BAR_CSS + '\n  .lang-wrap{position:fixed;top:12px;right:12px;z-index:999;}\n</style>');

// Add lang-bar div before .card
login = login.replace('<div class="card">', '<div class="lang-wrap"><div class="lang-bar" id="langBar"></div></div>\n<div class="card">');

// Replace all hardcoded LT text with data-i18n
login = login.replace('>Prisijungti<', ' data-i18n="tab_login">Log In<');
login = login.replace('>Registruotis<', ' data-i18n="tab_register">Register<');
login = login.replace('>Sveiki atvykę!<', ' data-i18n="welcome">Welcome!<');
login = login.replace('>Nukreipiame į kazino...<', ' data-i18n="redirecting">Redirecting...<');
login = login.replace('>El. paštas<', ' data-i18n="lbl_email">Email<');
login = login.replace(/placeholder="jusu@pastas\.lt"/g, 'placeholder="your@email.com" data-i18n-ph="ph_email"');
login = login.replace('>Slaptažodis<\n        </label>\n        <div class="inp-wrap">\n          <input class="inp" id="loginPwd"', ' data-i18n="lbl_pwd">Password</label>\n        <div class="inp-wrap">\n          <input class="inp" id="loginPwd"');
login = login.replace('>Slaptažodis<\n        </label>\n        <div class="inp-wrap">\n          <input class="inp" id="regPwd"', ' data-i18n="lbl_pwd">Password</label>\n        <div class="inp-wrap">\n          <input class="inp" id="regPwd"');
login = login.replace('>Vardas ir Pavardė<', ' data-i18n="lbl_name">Full Name<');
login = login.replace('>Pakartokite Slaptažodį<', ' data-i18n="lbl_pwd2">Repeat Password<');
login = login.replace('>Prisijungti →<', ' id="loginBtnLbl" data-i18n="btn_login">Log In →<');
login = login.replace('>Sukurti Paskyrą →<', ' id="regBtnLbl" data-i18n="btn_register">Create Account →<');
login = login.replace('placeholder="Bent 8 simboliai"', 'placeholder="At least 8 characters" data-i18n-ph="ph_pwd_min"');
login = login.replace('placeholder="Vardenis Pavardenis"', 'placeholder="Your Name" data-i18n-ph="ph_name"');

// Add PAGE_LANGS and script before </body>
var loginScript = '\n<script>\n' + LANGS_LIST_STR + '\nconst PAGE_LANGS = ' + JSON.stringify(loginLangs, null, 0) + ';\n' + APPLY_LANG_FN + '\n</script>\n';
login = login.replace('</body>', loginScript + '</body>');

fs.writeFileSync('C:/Users/PC/casino/public/login.html', login, 'utf8');
console.log('login.html DONE');

console.log('ALL DONE');
