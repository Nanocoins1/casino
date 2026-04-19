const fs = require('fs');
const P = 'C:/Users/PC/casino/public';

const LANGS_LIST_STR = `var LANGS_LIST=[
  {code:'en',flag:'🇬🇧',name:'EN'},{code:'lt',flag:'🇱🇹',name:'LT'},
  {code:'ru',flag:'🇷🇺',name:'RU'},{code:'de',flag:'🇩🇪',name:'DE'},
  {code:'pl',flag:'🇵🇱',name:'PL'},{code:'fr',flag:'🇫🇷',name:'FR'},
  {code:'tr',flag:'🇹🇷',name:'TR'},{code:'ar',flag:'🇸🇦',name:'AR'},
  {code:'zh',flag:'🇨🇳',name:'ZH'},{code:'hi',flag:'🇮🇳',name:'HI'},
  {code:'uk',flag:'🇺🇦',name:'UK'}
];`;

const LANG_BAR_CSS = `
.lang-wrap{display:flex;align-items:center;}
.lang-bar{display:flex;gap:3px;flex-wrap:wrap;justify-content:flex-end;}
.lang-btn{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
  color:rgba(232,226,212,.5);border-radius:6px;padding:3px 7px;font-size:10px;
  cursor:pointer;transition:all .15s;font-family:inherit;white-space:nowrap;}
.lang-btn:hover{background:rgba(255,255,255,.1);color:#e8e2d4;}
.lang-btn.active{background:rgba(201,168,76,.15);border-color:rgba(201,168,76,.4);color:#f0c060;}`;

const APPLY_LANG_FN = `
var _lc=localStorage.getItem('hrc_lang')||'en';
function applyLang(code){
  _lc=code; localStorage.setItem('hrc_lang',code);
  var t=PAGE_LANGS[code]||PAGE_LANGS.en;
  document.querySelectorAll('[data-i18n]').forEach(function(el){var k=el.getAttribute('data-i18n');if(t[k]!==undefined)el.textContent=t[k];});
  document.querySelectorAll('[data-i18n-html]').forEach(function(el){var k=el.getAttribute('data-i18n-html');if(t[k]!==undefined)el.innerHTML=t[k];});
  document.querySelectorAll('[data-i18n-ph]').forEach(function(el){var k=el.getAttribute('data-i18n-ph');if(t[k]!==undefined)el.placeholder=t[k];});
  document.documentElement.lang=code;
  document.documentElement.dir=code==='ar'?'rtl':'ltr';
  document.querySelectorAll('#langBar .lang-btn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-lc')===code);});
}
function setLang(code){applyLang(code);}
document.addEventListener('DOMContentLoaded',function(){
  var bar=document.getElementById('langBar');
  if(bar){LANGS_LIST.forEach(function(l){var b=document.createElement('button');b.className='lang-btn';b.textContent=l.flag+' '+l.name;b.setAttribute('data-lc',l.code);b.addEventListener('click',function(){setLang(l.code);});bar.appendChild(b);});}
  applyLang(_lc);
});`;

// ══════════════════════════════════════════
// PROVABLY FAIR
// ══════════════════════════════════════════
const PF_LANGS = {
en:{back:'← Back',subtitle:'Cryptographic fairness system — verify every bet yourself',how:'How it works',
  s1t:'Server seed',s1d:'Before each game the server generates a secret random number and provides only its SHA-256 hash.',
  s2t:'Client seed',s2d:'You provide your own random number (or an automatic one is used). Both seeds are combined.',
  s3t:'Result',s3d:'HMAC-SHA256 of both seeds determines the game outcome. Nobody can manipulate this process.',
  s4t:'Verification',s4d:'After the game you receive the server seed — verify the result yourself with any SHA-256 tool.',
  verifyH:'Verify a round',csLbl:'Client seed (optional)',csPh:'Your seed or leave empty',nonceLbl:'Nonce',
  verifyBtn:'🔍 Verify',verifiedMsg:'✅ Round verified',gameLbl:'Game',sHashLbl:'Server hash',sSeedLbl:'Server seed',
  cSeedLbl:'Client seed',nonceLbl2:'Nonce',resultLbl:'Result (0–9999)',
  formula:'You can verify yourself: HMAC-SHA256(serverSeed, serverSeed+"-"+clientSeed+"-"+nonce)',
  histH:'Your game history',loginMsg:'Log in to see your game history',
  dateTh:'Date',gameTh:'Game',roundTh:'Round ID',hashTh:'Hash',revealedTh:'Revealed',
  noRec:'No records',algoH:'Algorithm (technical)',algoDesc:'Each game result is calculated as follows:',
  algoNote:'You can verify this using any programming environment or online HMAC-SHA256 tools.',
  enterRound:'Enter Round ID',netErr:'Network error',yesStr:'✅ Yes',noStr:'⏳ No'},
lt:{back:'← Grįžti',subtitle:'Kriptografinė sąžiningumo sistema — patikrinkite kiekvieną lošimą patys',how:'Kaip tai veikia',
  s1t:'Serverio seed',s1d:'Prieš lošimą serveris sugeneruoja slaptą atsitiktinį skaičių ir pateikia tik jo SHA-256 hash.',
  s2t:'Kliento seed',s2d:'Jūs pateikiate savo atsitiktinį skaičių (arba naudojamas automatinis). Abu seedai jungiami.',
  s3t:'Rezultatas',s3d:'HMAC-SHA256 iš abiejų seedų nustato lošimo rezultatą. Niekas negali manipuliuoti šiuo procesu.',
  s4t:'Verifikacija',s4d:'Po lošimo gausite serverio seed — galite patys patikrinti rezultatą naudodami bet kurį SHA-256 įrankį.',
  verifyH:'Patikrinti lošimą',csLbl:'Kliento seed (neprivaloma)',csPh:'Jūsų seed arba palikite tuščią',nonceLbl:'Nonce',
  verifyBtn:'🔍 Patikrinti',verifiedMsg:'✅ Lošimas patvirtintas',gameLbl:'Žaidimas',sHashLbl:'Serverio hash',sSeedLbl:'Serverio seed',
  cSeedLbl:'Kliento seed',nonceLbl2:'Nonce',resultLbl:'Rezultatas (0–9999)',
  formula:'Galite patikrinti patys: HMAC-SHA256(serverSeed, serverSeed+"-"+clientSeed+"-"+nonce)',
  histH:'Jūsų lošimų istorija',loginMsg:'Prisijunkite, kad matytumėte lošimų istoriją',
  dateTh:'Data',gameTh:'Žaidimas',roundTh:'Round ID',hashTh:'Hash',revealedTh:'Atskleistas',
  noRec:'Nėra įrašų',algoH:'Algoritmas (techniškai)',algoDesc:'Kiekvieno lošimo rezultatas apskaičiuojamas taip:',
  algoNote:'Šį algoritmą galite patikrinti naudodami bet kurį programavimo aplinką arba internetinius HMAC-SHA256 įrankius.',
  enterRound:'Įveskite Round ID',netErr:'Tinklo klaida',yesStr:'✅ Taip',noStr:'⏳ Ne'},
ru:{back:'← Назад',subtitle:'Криптографическая система честности — проверяйте каждую ставку сами',how:'Как это работает',
  s1t:'Сид сервера',s1d:'Перед игрой сервер генерирует секретное случайное число и предоставляет только его SHA-256 хэш.',
  s2t:'Сид клиента',s2d:'Вы предоставляете своё случайное число (или используется автоматическое). Оба сида объединяются.',
  s3t:'Результат',s3d:'HMAC-SHA256 обоих сидов определяет результат игры. Никто не может манипулировать этим процессом.',
  s4t:'Верификация',s4d:'После игры вы получите сид сервера — проверьте результат сами с помощью любого SHA-256 инструмента.',
  verifyH:'Проверить раунд',csLbl:'Сид клиента (необязательно)',csPh:'Ваш сид или оставьте пустым',nonceLbl:'Nonce',
  verifyBtn:'🔍 Проверить',verifiedMsg:'✅ Раунд подтверждён',gameLbl:'Игра',sHashLbl:'Хэш сервера',sSeedLbl:'Сид сервера',
  cSeedLbl:'Сид клиента',nonceLbl2:'Nonce',resultLbl:'Результат (0–9999)',
  formula:'Проверьте сами: HMAC-SHA256(serverSeed, serverSeed+"-"+clientSeed+"-"+nonce)',
  histH:'История ваших игр',loginMsg:'Войдите, чтобы увидеть историю игр',
  dateTh:'Дата',gameTh:'Игра',roundTh:'Round ID',hashTh:'Хэш',revealedTh:'Раскрыт',
  noRec:'Нет записей',algoH:'Алгоритм (технически)',algoDesc:'Результат каждой игры рассчитывается следующим образом:',
  algoNote:'Этот алгоритм можно проверить в любой среде программирования или через онлайн-инструменты HMAC-SHA256.',
  enterRound:'Введите Round ID',netErr:'Ошибка сети',yesStr:'✅ Да',noStr:'⏳ Нет'},
de:{back:'← Zurück',subtitle:'Kryptografisches Fairness-System — überprüfen Sie jede Wette selbst',how:'Wie es funktioniert',
  s1t:'Server-Seed',s1d:'Vor jedem Spiel generiert der Server eine geheime Zufallszahl und gibt nur deren SHA-256-Hash an.',
  s2t:'Client-Seed',s2d:'Sie geben Ihre eigene Zufallszahl ein (oder es wird eine automatische verwendet). Beide Seeds werden kombiniert.',
  s3t:'Ergebnis',s3d:'HMAC-SHA256 beider Seeds bestimmt das Spielergebnis. Niemand kann diesen Prozess manipulieren.',
  s4t:'Verifizierung',s4d:'Nach dem Spiel erhalten Sie den Server-Seed — überprüfen Sie das Ergebnis selbst mit einem SHA-256-Tool.',
  verifyH:'Runde überprüfen',csLbl:'Client-Seed (optional)',csPh:'Ihr Seed oder leer lassen',nonceLbl:'Nonce',
  verifyBtn:'🔍 Überprüfen',verifiedMsg:'✅ Runde bestätigt',gameLbl:'Spiel',sHashLbl:'Server-Hash',sSeedLbl:'Server-Seed',
  cSeedLbl:'Client-Seed',nonceLbl2:'Nonce',resultLbl:'Ergebnis (0–9999)',
  formula:'Selbst überprüfen: HMAC-SHA256(serverSeed, serverSeed+"-"+clientSeed+"-"+nonce)',
  histH:'Ihre Spielhistorie',loginMsg:'Melden Sie sich an, um Ihre Spielhistorie zu sehen',
  dateTh:'Datum',gameTh:'Spiel',roundTh:'Round ID',hashTh:'Hash',revealedTh:'Aufgedeckt',
  noRec:'Keine Einträge',algoH:'Algorithmus (technisch)',algoDesc:'Jedes Spielergebnis wird wie folgt berechnet:',
  algoNote:'Sie können diesen Algorithmus mit jeder Programmierumgebung oder Online-HMAC-SHA256-Tools überprüfen.',
  enterRound:'Round ID eingeben',netErr:'Netzwerkfehler',yesStr:'✅ Ja',noStr:'⏳ Nein'},
pl:{back:'← Wróć',subtitle:'Kryptograficzny system uczciwości — weryfikuj każdy zakład samodzielnie',how:'Jak to działa',
  s1t:'Seed serwera',s1d:'Przed grą serwer generuje tajną liczbę losową i podaje tylko jej skrót SHA-256.',
  s2t:'Seed klienta',s2d:'Podajesz własną liczbę losową (lub używana jest automatyczna). Oba seedy są łączone.',
  s3t:'Wynik',s3d:'HMAC-SHA256 obu seedów określa wynik gry. Nikt nie może manipulować tym procesem.',
  s4t:'Weryfikacja',s4d:'Po grze otrzymasz seed serwera — możesz samodzielnie zweryfikować wynik dowolnym narzędziem SHA-256.',
  verifyH:'Zweryfikuj rundę',csLbl:'Seed klienta (opcjonalnie)',csPh:'Twój seed lub pozostaw puste',nonceLbl:'Nonce',
  verifyBtn:'🔍 Weryfikuj',verifiedMsg:'✅ Runda potwierdzona',gameLbl:'Gra',sHashLbl:'Hash serwera',sSeedLbl:'Seed serwera',
  cSeedLbl:'Seed klienta',nonceLbl2:'Nonce',resultLbl:'Wynik (0–9999)',
  formula:'Sprawdź sam: HMAC-SHA256(serverSeed, serverSeed+"-"+clientSeed+"-"+nonce)',
  histH:'Historia Twoich gier',loginMsg:'Zaloguj się, aby zobaczyć historię gier',
  dateTh:'Data',gameTh:'Gra',roundTh:'Round ID',hashTh:'Hash',revealedTh:'Ujawniony',
  noRec:'Brak rekordów',algoH:'Algorytm (technicznie)',algoDesc:'Wynik każdej gry jest obliczany następująco:',
  algoNote:'Możesz zweryfikować ten algorytm w dowolnym środowisku programistycznym lub online narzędziami HMAC-SHA256.',
  enterRound:'Podaj Round ID',netErr:'Błąd sieci',yesStr:'✅ Tak',noStr:'⏳ Nie'},
fr:{back:'← Retour',subtitle:'Système d\'équité cryptographique — vérifiez chaque mise vous-même',how:'Comment ça marche',
  s1t:'Seed serveur',s1d:'Avant chaque jeu, le serveur génère un nombre aléatoire secret et fournit uniquement son hash SHA-256.',
  s2t:'Seed client',s2d:'Vous fournissez votre propre nombre aléatoire (ou un automatique est utilisé). Les deux seeds sont combinés.',
  s3t:'Résultat',s3d:'Le HMAC-SHA256 des deux seeds détermine le résultat du jeu. Personne ne peut manipuler ce processus.',
  s4t:'Vérification',s4d:'Après le jeu vous recevez le seed serveur — vérifiez le résultat vous-même avec n\'importe quel outil SHA-256.',
  verifyH:'Vérifier un tour',csLbl:'Seed client (optionnel)',csPh:'Votre seed ou laisser vide',nonceLbl:'Nonce',
  verifyBtn:'🔍 Vérifier',verifiedMsg:'✅ Tour vérifié',gameLbl:'Jeu',sHashLbl:'Hash serveur',sSeedLbl:'Seed serveur',
  cSeedLbl:'Seed client',nonceLbl2:'Nonce',resultLbl:'Résultat (0–9999)',
  formula:'Vérifiez vous-même: HMAC-SHA256(serverSeed, serverSeed+"-"+clientSeed+"-"+nonce)',
  histH:'Historique de vos jeux',loginMsg:'Connectez-vous pour voir l\'historique',
  dateTh:'Date',gameTh:'Jeu',roundTh:'Round ID',hashTh:'Hash',revealedTh:'Révélé',
  noRec:'Aucun enregistrement',algoH:'Algorithme (technique)',algoDesc:'Le résultat de chaque jeu est calculé comme suit:',
  algoNote:'Vous pouvez vérifier cet algorithme avec n\'importe quel environnement de programmation ou outil HMAC-SHA256 en ligne.',
  enterRound:'Entrer Round ID',netErr:'Erreur réseau',yesStr:'✅ Oui',noStr:'⏳ Non'},
tr:{back:'← Geri',subtitle:'Kriptografik adalet sistemi — her bahsinizi kendiniz doğrulayın',how:'Nasıl çalışır',
  s1t:'Sunucu seed\'i',s1d:'Her oyundan önce sunucu gizli bir rastgele sayı üretir ve yalnızca SHA-256 karmasını sağlar.',
  s2t:'İstemci seed\'i',s2d:'Kendi rastgele sayınızı sağlarsınız (veya otomatik kullanılır). Her iki seed birleştirilir.',
  s3t:'Sonuç',s3d:'Her iki seed\'in HMAC-SHA256\'sı oyun sonucunu belirler. Kimse bu süreci manipüle edemez.',
  s4t:'Doğrulama',s4d:'Oyundan sonra sunucu seed\'ini alırsınız — herhangi bir SHA-256 aracıyla sonucu kendiniz doğrulayabilirsiniz.',
  verifyH:'Tur doğrula',csLbl:'İstemci seed\'i (isteğe bağlı)',csPh:'Seed\'iniz veya boş bırakın',nonceLbl:'Nonce',
  verifyBtn:'🔍 Doğrula',verifiedMsg:'✅ Tur doğrulandı',gameLbl:'Oyun',sHashLbl:'Sunucu karma',sSeedLbl:'Sunucu seed',
  cSeedLbl:'İstemci seed',nonceLbl2:'Nonce',resultLbl:'Sonuç (0–9999)',
  formula:'Kendiniz doğrulayın: HMAC-SHA256(serverSeed, serverSeed+"-"+clientSeed+"-"+nonce)',
  histH:'Oyun geçmişiniz',loginMsg:'Oyun geçmişini görmek için giriş yapın',
  dateTh:'Tarih',gameTh:'Oyun',roundTh:'Round ID',hashTh:'Karma',revealedTh:'Açıklandı',
  noRec:'Kayıt yok',algoH:'Algoritma (teknik)',algoDesc:'Her oyun sonucu şu şekilde hesaplanır:',
  algoNote:'Bu algoritmayı herhangi bir programlama ortamı veya çevrimiçi HMAC-SHA256 araçlarıyla doğrulayabilirsiniz.',
  enterRound:'Round ID girin',netErr:'Ağ hatası',yesStr:'✅ Evet',noStr:'⏳ Hayır'},
ar:{back:'← رجوع',subtitle:'نظام عدالة تشفيري — تحقق من كل رهان بنفسك',how:'كيف يعمل',
  s1t:'بذرة الخادم',s1d:'قبل كل لعبة يولّد الخادم رقمًا عشوائيًا سريًا ويوفر فقط تجزئة SHA-256 الخاصة به.',
  s2t:'بذرة العميل',s2d:'تقدم رقمك العشوائي الخاص (أو يُستخدم رقم تلقائي). يتم دمج كلا البذرتين.',
  s3t:'النتيجة',s3d:'يحدد HMAC-SHA256 للبذرتين نتيجة اللعبة. لا يمكن لأحد التلاعب بهذه العملية.',
  s4t:'التحقق',s4d:'بعد اللعبة ستحصل على بذرة الخادم — تحقق من النتيجة بنفسك باستخدام أي أداة SHA-256.',
  verifyH:'تحقق من الجولة',csLbl:'بذرة العميل (اختياري)',csPh:'بذرتك أو اتركه فارغًا',nonceLbl:'Nonce',
  verifyBtn:'🔍 تحقق',verifiedMsg:'✅ تم التحقق من الجولة',gameLbl:'اللعبة',sHashLbl:'تجزئة الخادم',sSeedLbl:'بذرة الخادم',
  cSeedLbl:'بذرة العميل',nonceLbl2:'Nonce',resultLbl:'النتيجة (0–9999)',
  formula:'تحقق بنفسك: HMAC-SHA256(serverSeed, serverSeed+"-"+clientSeed+"-"+nonce)',
  histH:'سجل ألعابك',loginMsg:'سجّل الدخول لرؤية سجل الألعاب',
  dateTh:'التاريخ',gameTh:'اللعبة',roundTh:'Round ID',hashTh:'التجزئة',revealedTh:'مكشوف',
  noRec:'لا توجد سجلات',algoH:'الخوارزمية (تقنيًا)',algoDesc:'يُحسب نتيجة كل لعبة على النحو التالي:',
  algoNote:'يمكنك التحقق من هذه الخوارزمية باستخدام أي بيئة برمجية أو أدوات HMAC-SHA256 عبر الإنترنت.',
  enterRound:'أدخل Round ID',netErr:'خطأ في الشبكة',yesStr:'✅ نعم',noStr:'⏳ لا'},
zh:{back:'← 返回',subtitle:'密码学公平系统 — 自行验证每一次投注',how:'工作原理',
  s1t:'服务器种子',s1d:'每次游戏前，服务器生成一个秘密随机数，仅提供其SHA-256哈希值。',
  s2t:'客户端种子',s2d:'您提供自己的随机数（或使用自动生成的）。两个种子合并使用。',
  s3t:'结果',s3d:'两个种子的HMAC-SHA256决定游戏结果。没有人可以操纵这个过程。',
  s4t:'验证',s4d:'游戏后您将收到服务器种子 — 可使用任何SHA-256工具自行验证结果。',
  verifyH:'验证回合',csLbl:'客户端种子（可选）',csPh:'您的种子或留空',nonceLbl:'Nonce',
  verifyBtn:'🔍 验证',verifiedMsg:'✅ 回合已验证',gameLbl:'游戏',sHashLbl:'服务器哈希',sSeedLbl:'服务器种子',
  cSeedLbl:'客户端种子',nonceLbl2:'Nonce',resultLbl:'结果 (0–9999)',
  formula:'自行验证: HMAC-SHA256(serverSeed, serverSeed+"-"+clientSeed+"-"+nonce)',
  histH:'您的游戏历史',loginMsg:'登录以查看游戏历史',
  dateTh:'日期',gameTh:'游戏',roundTh:'回合ID',hashTh:'哈希',revealedTh:'已揭示',
  noRec:'无记录',algoH:'算法（技术）',algoDesc:'每个游戏结果计算如下：',
  algoNote:'您可以使用任何编程环境或在线HMAC-SHA256工具验证此算法。',
  enterRound:'输入回合ID',netErr:'网络错误',yesStr:'✅ 是',noStr:'⏳ 否'},
hi:{back:'← वापस',subtitle:'क्रिप्टोग्राफिक फेयरनेस सिस्टम — हर बेट खुद सत्यापित करें',how:'यह कैसे काम करता है',
  s1t:'सर्वर सीड',s1d:'हर गेम से पहले सर्वर एक गुप्त रैंडम नंबर बनाता है और केवल उसका SHA-256 हैश देता है।',
  s2t:'क्लाइंट सीड',s2d:'आप अपना रैंडम नंबर देते हैं (या ऑटोमैटिक उपयोग होता है)। दोनों सीड मिलाए जाते हैं।',
  s3t:'परिणाम',s3d:'दोनों सीड का HMAC-SHA256 गेम परिणाम निर्धारित करता है। कोई भी इस प्रक्रिया में हेरफेर नहीं कर सकता।',
  s4t:'सत्यापन',s4d:'गेम के बाद आपको सर्वर सीड मिलेगा — किसी भी SHA-256 टूल से खुद परिणाम सत्यापित करें।',
  verifyH:'राउंड सत्यापित करें',csLbl:'क्लाइंट सीड (वैकल्पिक)',csPh:'आपका सीड या खाली छोड़ें',nonceLbl:'Nonce',
  verifyBtn:'🔍 सत्यापित करें',verifiedMsg:'✅ राउंड सत्यापित',gameLbl:'गेम',sHashLbl:'सर्वर हैश',sSeedLbl:'सर्वर सीड',
  cSeedLbl:'क्लाइंट सीड',nonceLbl2:'Nonce',resultLbl:'परिणाम (0–9999)',
  formula:'खुद सत्यापित करें: HMAC-SHA256(serverSeed, serverSeed+"-"+clientSeed+"-"+nonce)',
  histH:'आपका गेम इतिहास',loginMsg:'गेम इतिहास देखने के लिए लॉगिन करें',
  dateTh:'तारीख',gameTh:'गेम',roundTh:'Round ID',hashTh:'हैश',revealedTh:'उजागर',
  noRec:'कोई रिकॉर्ड नहीं',algoH:'एल्गोरिदम (तकनीकी)',algoDesc:'हर गेम परिणाम इस प्रकार गणना किया जाता है:',
  algoNote:'आप इस एल्गोरिदम को किसी भी प्रोग्रामिंग वातावरण या ऑनलाइन HMAC-SHA256 टूल से सत्यापित कर सकते हैं।',
  enterRound:'Round ID दर्ज करें',netErr:'नेटवर्क त्रुटि',yesStr:'✅ हाँ',noStr:'⏳ नहीं'},
uk:{back:'← Назад',subtitle:'Криптографічна система чесності — перевіряйте кожну ставку самі',how:'Як це працює',
  s1t:'Seed сервера',s1d:'Перед кожною грою сервер генерує секретне випадкове число та надає лише його SHA-256 хеш.',
  s2t:'Seed клієнта',s2d:'Ви надаєте власне випадкове число (або використовується автоматичне). Обидва сіди об\'єднуються.',
  s3t:'Результат',s3d:'HMAC-SHA256 обох сідів визначає результат гри. Ніхто не може маніпулювати цим процесом.',
  s4t:'Верифікація',s4d:'Після гри ви отримаєте seed сервера — перевірте результат самі будь-яким SHA-256 інструментом.',
  verifyH:'Перевірити раунд',csLbl:'Seed клієнта (необов\'язково)',csPh:'Ваш seed або залиште порожнім',nonceLbl:'Nonce',
  verifyBtn:'🔍 Перевірити',verifiedMsg:'✅ Раунд підтверджено',gameLbl:'Гра',sHashLbl:'Хеш сервера',sSeedLbl:'Seed сервера',
  cSeedLbl:'Seed клієнта',nonceLbl2:'Nonce',resultLbl:'Результат (0–9999)',
  formula:'Перевірте самі: HMAC-SHA256(serverSeed, serverSeed+"-"+clientSeed+"-"+nonce)',
  histH:'Ваша історія ігор',loginMsg:'Увійдіть, щоб переглянути історію ігор',
  dateTh:'Дата',gameTh:'Гра',roundTh:'Round ID',hashTh:'Хеш',revealedTh:'Розкрито',
  noRec:'Немає записів',algoH:'Алгоритм (технічно)',algoDesc:'Результат кожної гри обчислюється так:',
  algoNote:'Цей алгоритм можна перевірити у будь-якому середовищі програмування або онлайн-інструментах HMAC-SHA256.',
  enterRound:'Введіть Round ID',netErr:'Помилка мережі',yesStr:'✅ Так',noStr:'⏳ Ні'}
};

const pfHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Provably Fair — HATHOR Royal Casino</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=DM+Mono:wght@400;500&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  :root{--gold:#c9a84c;--gold2:#ffd680;--bg:#0a0806;--card:rgba(255,255,255,0.03);--border:rgba(201,168,76,0.15);--cream:#e8e2d4;--green:#2ecc71;--purple:#7b2fff;}
  body{background:var(--bg);color:var(--cream);font-family:'Inter',sans-serif;font-size:15px;line-height:1.7;}
  header{display:flex;align-items:center;justify-content:space-between;padding:12px 24px;border-bottom:1px solid var(--border);position:sticky;top:0;background:rgba(10,8,6,0.95);backdrop-filter:blur(10px);z-index:100;gap:12px;flex-wrap:wrap;}
  .logo{font-family:'Cinzel',serif;font-size:20px;font-weight:700;color:var(--gold);text-decoration:none;letter-spacing:2px;}
  .back-link{color:var(--gold);text-decoration:none;font-size:13px;border:1px solid var(--border);padding:6px 14px;border-radius:8px;white-space:nowrap;}
  .container{max-width:860px;margin:0 auto;padding:48px 24px 80px;}
  .page-title{font-family:'Cinzel',serif;font-size:28px;font-weight:700;color:var(--gold2);margin-bottom:8px;}
  .page-sub{font-size:14px;color:rgba(232,226,212,0.6);margin-bottom:40px;}
  h2{font-family:'Cinzel',serif;font-size:16px;font-weight:700;color:var(--gold);margin:36px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--border);}
  p{margin-bottom:12px;color:rgba(232,226,212,0.8);}
  .how-it-works{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin:16px 0 32px;}
  .step{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px;position:relative;}
  .step-num{font-family:'DM Mono',monospace;font-size:32px;font-weight:700;color:rgba(201,168,76,0.15);position:absolute;top:12px;right:14px;}
  .step-icon{font-size:24px;margin-bottom:10px;}
  .step-title{font-weight:600;font-size:13px;color:var(--gold);margin-bottom:6px;}
  .step-desc{font-size:12px;color:rgba(232,226,212,0.6);}
  .verify-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:28px;margin:24px 0;}
  .inp{width:100%;padding:10px 14px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:8px;color:var(--cream);font-family:'DM Mono',monospace;font-size:12px;outline:none;margin-bottom:12px;}
  .inp:focus{border-color:var(--gold);}
  .btn{padding:12px 28px;border-radius:10px;border:none;cursor:pointer;font-family:'Cinzel',serif;font-size:13px;font-weight:700;letter-spacing:1px;background:linear-gradient(135deg,#c9a84c,#ffd680);color:#0a0806;transition:all .2s;width:100%;}
  .btn:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(201,168,76,0.3);}
  .result-box{display:none;background:rgba(46,204,113,0.06);border:1px solid rgba(46,204,113,0.25);border-radius:12px;padding:20px;margin-top:20px;}
  .result-box.error{background:rgba(255,61,113,0.06);border-color:rgba(255,61,113,0.25);}
  .result-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px;}
  .result-row:last-child{border:none;}
  .result-label{color:rgba(232,226,212,0.5);}
  .result-val{font-family:'DM Mono',monospace;color:var(--cream);word-break:break-all;max-width:60%;text-align:right;}
  .hash-display{font-family:'DM Mono',monospace;font-size:10px;background:rgba(0,0,0,0.3);padding:10px;border-radius:6px;word-break:break-all;color:var(--green);margin:8px 0;}
  .history-table{width:100%;border-collapse:collapse;font-size:13px;}
  .history-table th{padding:10px 12px;text-align:left;font-family:'Cinzel',serif;font-size:10px;letter-spacing:2px;color:rgba(201,168,76,0.5);border-bottom:1px solid var(--border);}
  .history-table td{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.04);font-family:'DM Mono',monospace;font-size:11px;}
  footer{text-align:center;padding:24px;border-top:1px solid var(--border);font-size:12px;color:rgba(201,168,76,0.3);}
  ${LANG_BAR_CSS}
</style>
</head>
<body>
<header>
  <a class="logo" href="/">&#x2B21; HATHOR</a>
  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
    <a class="back-link" href="/" data-i18n="back">← Back</a>
    <div class="lang-wrap"><div class="lang-bar" id="langBar"></div></div>
  </div>
</header>
<div class="container">
  <div class="page-title">Provably Fair</div>
  <div class="page-sub" data-i18n="subtitle">Cryptographic fairness system — verify every bet yourself</div>

  <h2 data-i18n="how">How it works</h2>
  <div class="how-it-works">
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-icon">&#128273;</div>
      <div class="step-title" data-i18n="s1t">Server seed</div>
      <div class="step-desc" data-i18n="s1d">Before each game the server generates a secret random number and provides only its SHA-256 hash.</div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-icon">&#127922;</div>
      <div class="step-title" data-i18n="s2t">Client seed</div>
      <div class="step-desc" data-i18n="s2d">You provide your own random number (or an automatic one is used). Both seeds are combined.</div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-icon">&#128290;</div>
      <div class="step-title" data-i18n="s3t">Result</div>
      <div class="step-desc" data-i18n="s3d">HMAC-SHA256 of both seeds determines the game outcome. Nobody can manipulate this process.</div>
    </div>
    <div class="step">
      <div class="step-num">4</div>
      <div class="step-icon">&#9989;</div>
      <div class="step-title" data-i18n="s4t">Verification</div>
      <div class="step-desc" data-i18n="s4d">After the game you receive the server seed — verify the result yourself with any SHA-256 tool.</div>
    </div>
  </div>

  <h2 data-i18n="verifyH">Verify a round</h2>
  <div class="verify-card">
    <label style="font-size:12px;color:rgba(232,226,212,0.5);display:block;margin-bottom:4px;">Round ID</label>
    <input class="inp" id="v-round-id" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"/>
    <label style="font-size:12px;color:rgba(232,226,212,0.5);display:block;margin-bottom:4px;" data-i18n="csLbl">Client seed (optional)</label>
    <input class="inp" id="v-client-seed" data-i18n-ph="csPh" placeholder="Your seed or leave empty"/>
    <label style="font-size:12px;color:rgba(232,226,212,0.5);display:block;margin-bottom:4px;" data-i18n="nonceLbl">Nonce</label>
    <input class="inp" id="v-nonce" placeholder="0" value="0"/>
    <button class="btn" id="verifyBtnEl" onclick="verifyRound()">&#128269; Verify</button>

    <div class="result-box" id="verify-result">
      <div style="font-family:'Cinzel',serif;font-size:13px;color:var(--green);margin-bottom:14px;" id="verifiedMsgEl">&#9989; Round verified</div>
      <div class="result-row"><span class="result-label">Round ID</span><span class="result-val" id="res-id"></span></div>
      <div class="result-row"><span class="result-label" data-i18n="gameLbl">Game</span><span class="result-val" id="res-game"></span></div>
      <div class="result-row"><span class="result-label" data-i18n="sHashLbl">Server hash</span><span class="result-val" id="res-shash" style="font-size:10px;"></span></div>
      <div class="result-row"><span class="result-label" data-i18n="sSeedLbl">Server seed</span><span class="result-val" id="res-sseed" style="font-size:10px;"></span></div>
      <div class="result-row"><span class="result-label" data-i18n="cSeedLbl">Client seed</span><span class="result-val" id="res-cseed"></span></div>
      <div class="result-row"><span class="result-label" data-i18n="nonceLbl2">Nonce</span><span class="result-val" id="res-nonce"></span></div>
      <div class="result-row"><span class="result-label" data-i18n="resultLbl">Result (0–9999)</span><span class="result-val" id="res-result" style="color:var(--gold2);font-size:16px;font-weight:700;"></span></div>
      <div style="margin-top:14px;font-size:11px;color:rgba(232,226,212,0.4);" data-i18n="formula">You can verify yourself: HMAC-SHA256(serverSeed, serverSeed+"-"+clientSeed+"-"+nonce)</div>
    </div>
    <div class="result-box error" id="verify-error">
      <div style="color:#ff9999;" id="verify-error-msg"></div>
    </div>
  </div>

  <h2 data-i18n="histH">Your game history</h2>
  <div id="history-section">
    <div id="history-login" style="text-align:center;padding:32px;color:rgba(232,226,212,0.4);" data-i18n="loginMsg">Log in to see your game history</div>
    <div id="history-table-wrap" style="display:none;overflow-x:auto;">
      <table class="history-table">
        <thead><tr>
          <th data-i18n="dateTh">Date</th>
          <th data-i18n="gameTh">Game</th>
          <th>Round ID</th>
          <th data-i18n="hashTh">Hash</th>
          <th data-i18n="revealedTh">Revealed</th>
        </tr></thead>
        <tbody id="history-tbody"></tbody>
      </table>
    </div>
  </div>

  <h2 data-i18n="algoH">Algorithm (technical)</h2>
  <p data-i18n="algoDesc">Each game result is calculated as follows:</p>
  <div class="hash-display">combined = serverSeed + "-" + clientSeed + "-" + nonce
hash = HMAC-SHA256(key=serverSeed, data=combined)
result = parseInt(hash[0..7], 16) % 10000  // 0-9999</div>
  <p data-i18n="algoNote">You can verify this using any programming environment or online HMAC-SHA256 tools.</p>
</div>
<footer>&#169; 2026 HATHOR Royal Casino &middot; <a href="/terms.html" style="color:var(--gold);">T&amp;C</a> &middot; <a href="/responsible.html" style="color:var(--gold);">Responsible Gaming</a></footer>

<script>
var PAGE_LANGS=${JSON.stringify(PF_LANGS)};
${LANGS_LIST_STR}
${APPLY_LANG_FN}

function verifyRound(){
  var t=PAGE_LANGS[_lc]||PAGE_LANGS.en;
  var roundId=document.getElementById('v-round-id').value.trim();
  var clientSeed=document.getElementById('v-client-seed').value.trim();
  var nonce=parseInt(document.getElementById('v-nonce').value)||0;
  document.getElementById('verify-result').style.display='none';
  document.getElementById('verify-error').style.display='none';
  if(!roundId){
    document.getElementById('verify-error-msg').textContent=t.enterRound;
    document.getElementById('verify-error').style.display='block';
    return;
  }
  fetch('/api/pf/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roundId:roundId,clientSeed:clientSeed,nonce:nonce})})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.error){
        document.getElementById('verify-error-msg').textContent=d.error;
        document.getElementById('verify-error').style.display='block';
        return;
      }
      document.getElementById('res-id').textContent=d.roundId;
      document.getElementById('res-game').textContent=d.game||'—';
      document.getElementById('res-shash').textContent=d.serverHash;
      document.getElementById('res-sseed').textContent=d.serverSeed;
      document.getElementById('res-cseed').textContent=d.clientSeed;
      document.getElementById('res-nonce').textContent=d.nonce;
      document.getElementById('res-result').textContent=d.result;
      document.getElementById('verifiedMsgEl').textContent=t.verifiedMsg;
      document.getElementById('verify-result').style.display='block';
    })
    .catch(function(){
      var t2=PAGE_LANGS[_lc]||PAGE_LANGS.en;
      document.getElementById('verify-error-msg').textContent=t2.netErr;
      document.getElementById('verify-error').style.display='block';
    });
}

var uid=localStorage.getItem('hrc_uid')||localStorage.getItem('casino_uid');
if(uid){
  document.getElementById('history-login').style.display='none';
  document.getElementById('history-table-wrap').style.display='block';
  fetch('/api/pf/history/'+uid)
    .then(function(r){return r.json();})
    .then(function(rows){
      var t=PAGE_LANGS[_lc]||PAGE_LANGS.en;
      var tbody=document.getElementById('history-tbody');
      if(!rows.length){
        tbody.innerHTML='<tr><td colspan="5" style="text-align:center;color:rgba(232,226,212,0.3);padding:20px;">'+t.noRec+'</td></tr>';
        return;
      }
      tbody.innerHTML=rows.map(function(r){
        var dateStr=r.created_at?r.created_at.slice(0,16):'';
        var shortId=r.round_id.slice(0,8)+'...';
        var shortHash=r.server_hash?r.server_hash.slice(0,12)+'...':'';
        var t2=PAGE_LANGS[_lc]||PAGE_LANGS.en;
        var revealedStr=r.revealed?t2.yesStr:t2.noStr;
        var revealedColor=r.revealed?'#2ecc71':'#888';
        return '<tr><td style="color:rgba(232,226,212,0.5);">'+dateStr+'</td><td>'+r.game+'</td><td style="color:rgba(201,168,76,0.7);font-size:9px;">'+shortId+'</td><td style="font-size:9px;color:rgba(232,226,212,0.4);">'+shortHash+'</td><td style="color:'+revealedColor+'">'+revealedStr+'</td></tr>';
      }).join('');
    })
    .catch(function(){});
}
</script>
</body>
</html>`;

fs.writeFileSync(P+'/provably-fair.html', pfHtml, 'utf8');
console.log('provably-fair.html DONE');

// ══════════════════════════════════════════
// LOBBY — inject lang bar + translate key strings
// ══════════════════════════════════════════
const LOBBY_LANGS = {
en:{kycVerify:'Verify',fairPlay:'🔐 Fair Play',admin:'⚙️ Admin',logout:'Log out',
  heroBadge:'✦ LICENSED CASINO PLATFORM',heroSub:'50+ games, live betting, crypto payments. Fairness verified cryptographically.',
  kycBannerTitle:'⚠️ Account not verified',kycBannerDesc:'You must verify your identity and age to play. Required by gambling regulations.',
  kycBannerBtn:'Verify now →',gamesLbl:'GAMES',playingLbl:'PLAYING NOW',rtpLbl:'AVG RTP',supportLbl:'SUPPORT',
  promoH:'Welcome! You have 🪙10,000 chips',promoDesc:'Every day — a new bonus. Play, earn XP, level up and unlock VIP privileges.',
  promoBtn:'Play now',
  fAll:'🎰 All',fPop:'🔥 Popular',fSlots:'🎰 Slots',fTable:'🃏 Table',fCrash:'📈 Crash',fSports:'⚽ Sports',fInstant:'⚡ Instant',
  secCrash:'📈 CRASH & ORIGINALS',secSlots:'🎰 SLOT MACHINES',secTable:'🃏 TABLE GAMES',secSports:'⚽ SPORTS BETTING',secInstant:'⚡ INSTANT GAMES',
  playOverlay:'PLAY',
  fKyc:'KYC Verification',fFair:'Provably Fair',fResp:'Responsible Gaming',fPriv:'Privacy Policy',fTerms:'Terms & Conditions',fHelp:'Help',
  footerText:'HATHOR Royal Casino. Gambling can be addictive — play responsibly.<br/>If you have gambling problems, contact the helpline: <strong>116 123</strong><br/>© 2025–2026 HATHOR Royal Casino. All rights reserved.',
  // game descriptions
  d_crash:'Aviator-style game. Cash out before the crash!',d_mines:'5×5 grid. Find diamonds, avoid mines!',
  d_dice:'Roll above or below the target number',d_limbo:'Set your target — will the rocket reach it?',
  d_hilo:'Higher or lower? Build a streak!',d_wheel:'Spin the wheel — 3 risk levels, up to 100×!',
  d_fruits:'Classic fruit machine, 20 winning lines',d_egyptian:'Egyptian treasures, wilds, free spins',
  d_space:'Space adventure with high multipliers',d_diamond:'Luxury diamond slots with mega jackpot',
  d_jungle:'Jungle spirit, multipliers up to ×25',d_dragon:'Dragon\'s cave with hidden treasures',
  d_ocean:'Underwater adventure with 243 ways to win',d_moon:'Magic night slot with expanding wilds',
  d_baccarat:'Classic baccarat — Player, Banker or Tie',d_blackjack:'21 — classic blackjack vs dealer',
  d_vpoker:'Jacks or Better — hold, draw, win!',d_texas:'Multiplayer poker with bots and live players',
  d_keno:'80-ball lottery — pick up to 10 numbers',d_3card:'Three card poker — fast and fun',
  d_euroulette:'European roulette with single zero',d_amroulette:'American roulette with double zero',
  d_football:'Premier League, La Liga, Champions League and more',d_basketball:'NBA, EuroLeague, live odds',
  d_tennis:'ATP, WTA tournaments, Grand Slam',d_hockey:'NHL, European leagues',
  d_wheel2:'Spin and win up to 100×',d_crystal:'Crystal ball lottery',
  d_clover:'Find the lucky four-leaf clover',d_spinwin:'Quick game, no complicated rules'},
lt:{kycVerify:'Patvirtinti',fairPlay:'🔐 Fair Play',admin:'⚙️ Admin',logout:'Atsijungti',
  heroBadge:'✦ LICENZIJUOTA KAZINO PLATFORMA',heroSub:'50+ žaidimų, tiesioginės lažybos, kriptovaliutų mokėjimai. Sąžiningumas patvirtinamas kriptografiškai.',
  kycBannerTitle:'⚠️ Paskyra nepatvirtinta',kycBannerDesc:'Norėdami žaisti, turite patvirtinti tapatybę ir amžių. Tai reikalauja lošimų taisyklės.',
  kycBannerBtn:'Patvirtinti dabar →',gamesLbl:'ŽAIDIMŲ',playingLbl:'ŽAIDŽIA DABAR',rtpLbl:'VIDUTINIS RTP',supportLbl:'PALAIKYMAS',
  promoH:'Sveikiname! Jums 🪙10,000 žetonų',promoDesc:'Kiekviena diena — naujas bonusas. Žaiskite, kaupikaite XP, kelkitės į aukštesnius lygius.',
  promoBtn:'Žaisti dabar',
  fAll:'🎰 Visi',fPop:'🔥 Populiarūs',fSlots:'🎰 Slotai',fTable:'🃏 Stalo',fCrash:'📈 Crash',fSports:'⚽ Sportas',fInstant:'⚡ Greiti',
  secCrash:'📈 CRASH & ORIGINALS',secSlots:'🎰 SLOT MAŠINOS',secTable:'🃏 STALO ŽAIDIMAI',secSports:'⚽ SPORTO LAŽYBOS',secInstant:'⚡ GREITI ŽAIDIMAI',
  playOverlay:'ŽAISTI',
  fKyc:'KYC Patikrinimas',fFair:'Provably Fair',fResp:'Atsakingas Lošimas',fPriv:'Privatumo Politika',fTerms:'Taisyklės ir Sąlygos',fHelp:'Pagalba',
  footerText:'HATHOR Royal Casino. Lošimas gali sukelti priklausomybę — lošk atsakingai.<br/>Jei turite lošimo problemų, kreipkitės: <strong>116 123</strong><br/>© 2025–2026 HATHOR Royal Casino. Visos teisės saugomos.',
  d_crash:'Aviator stiliaus žaidimas. Išimkite iki katastrofos!',d_mines:'5×5 lentelė. Raskite deimantus, išvenkite minų!',
  d_dice:'Meskite kauliukus virš arba žemiau tikslinio skaičiaus',d_limbo:'Nustatykite tikslą — ar raketa pasieks jį?',
  d_hilo:'Aukščiau ar žemiau? Kaupkite streak\'ą!',d_wheel:'Sukite ratą — 3 rizikos lygiai, iki 100×!',
  d_fruits:'Klasikinė vaisių mašina, 20 laimėjimo linijų',d_egyptian:'Egipto lobiai, laukiniai simboliai, free spins',
  d_space:'Kosmoso avantūra su dideliais koeficientais',d_diamond:'Prabangios deimantų mašinos su mega jackpot',
  d_jungle:'Džiunglių dvasia, daugintojai iki ×25',d_dragon:'Drakono ola su paslėptais lobiais',
  d_ocean:'Povandeninė nuotykis su 243 laimėjimo būdais',d_moon:'Magiška nakties mašina su expanding wilds',
  d_baccarat:'Klasikinis baccarat — Player, Banker ar Tie',d_blackjack:'21 — klasikinis blackjack prieš dilerį',
  d_vpoker:'Jacks or Better — laikykite, pakeiskite, laimėkite!',d_texas:'Multiplayer pokeris su botais ir gyvais žaidėjais',
  d_keno:'80 kamuolių loterija — pasirinkite iki 10 skaičių',d_3card:'Trijų kortelių pokeris — greitas ir linksmas',
  d_euroulette:'Europietiška ruletė su vienu nuliu',d_amroulette:'Amerikietiška ruletė su dviguba nuliu',
  d_football:'Premier League, La Liga, Champions League ir dar daugiau',d_basketball:'NBA, Eurolyga, LKL rungtynės su live koeficientais',
  d_tennis:'ATP, WTA turnyrai, Grand Slam',d_hockey:'NHL, Lietuvos čempionatas ir Europos lygos',
  d_wheel2:'Sukite ir laimėkite iki 100×',d_crystal:'Paskutinė kristalo rutulio loterija',
  d_clover:'Ieškokite keturialapio dobilo',d_spinwin:'Greitasis lošimas be jokių taisyklių'},
ru:{kycVerify:'Подтвердить',fairPlay:'🔐 Честность',admin:'⚙️ Админ',logout:'Выйти',
  heroBadge:'✦ ЛИЦЕНЗИРОВАННОЕ КАЗИНО',heroSub:'50+ игр, live ставки, крипто платежи. Честность подтверждена криптографически.',
  kycBannerTitle:'⚠️ Аккаунт не верифицирован',kycBannerDesc:'Для игры необходимо подтвердить личность и возраст.',
  kycBannerBtn:'Подтвердить сейчас →',gamesLbl:'ИГР',playingLbl:'ИГРАЮТ СЕЙЧАС',rtpLbl:'СРЕДНИЙ RTP',supportLbl:'ПОДДЕРЖКА',
  promoH:'Добро пожаловать! Вам 🪙10,000 фишек',promoDesc:'Каждый день — новый бонус. Играйте, зарабатывайте XP, повышайте уровень.',
  promoBtn:'Играть',fAll:'🎰 Все',fPop:'🔥 Популярные',fSlots:'🎰 Слоты',fTable:'🃏 Стол',fCrash:'📈 Краш',fSports:'⚽ Спорт',fInstant:'⚡ Быстрые',
  secCrash:'📈 КРАШ & ОРИГИНАЛЫ',secSlots:'🎰 ИГРОВЫЕ АВТОМАТЫ',secTable:'🃏 НАСТОЛЬНЫЕ ИГРЫ',secSports:'⚽ СТАВКИ НА СПОРТ',secInstant:'⚡ БЫСТРЫЕ ИГРЫ',
  playOverlay:'ИГРАТЬ',fKyc:'KYC Верификация',fFair:'Честность',fResp:'Ответственная игра',fPriv:'Конфиденциальность',fTerms:'Правила',fHelp:'Помощь',
  footerText:'HATHOR Royal Casino. Азартные игры могут вызвать зависимость — играйте ответственно.<br/>© 2025–2026 HATHOR Royal Casino. Все права защищены.',
  d_crash:'Игра в стиле Aviator. Выводи до крушения!',d_mines:'Сетка 5×5. Найди бриллианты, избегай мин!',
  d_dice:'Бросьте выше или ниже целевого числа',d_limbo:'Установите цель — долетит ли ракета?',
  d_hilo:'Выше или ниже? Набирайте серию!',d_wheel:'Крутите колесо — 3 уровня риска, до 100×!',
  d_fruits:'Классический фруктовый автомат, 20 линий',d_egyptian:'Египетские сокровища, wilds, free spins',
  d_space:'Космическое приключение с высокими коэффициентами',d_diamond:'Роскошные бриллиантовые слоты с мегаджекпотом',
  d_jungle:'Дух джунглей, множители до ×25',d_dragon:'Пещера дракона со скрытыми сокровищами',
  d_ocean:'Подводное приключение, 243 способа выиграть',d_moon:'Магический ночной слот с expanding wilds',
  d_baccarat:'Классический баккара — Игрок, Банкир или Ничья',d_blackjack:'21 — классический блэкджек против дилера',
  d_vpoker:'Jacks or Better — держи, меняй, выигрывай!',d_texas:'Мультиплеерный покер с ботами и живыми игроками',
  d_keno:'Лотерея из 80 шаров — выберите до 10 чисел',d_3card:'Трёхкарточный покер — быстро и весело',
  d_euroulette:'Европейская рулетка с одним нулём',d_amroulette:'Американская рулетка с двойным нулём',
  d_football:'Премьер-лига, Ла Лига, Лига Чемпионов',d_basketball:'NBA, Евролига, live коэффициенты',
  d_tennis:'ATP, WTA, Большой шлем',d_hockey:'NHL, европейские лиги',
  d_wheel2:'Крутите и выигрывайте до 100×',d_crystal:'Лотерея кристального шара',
  d_clover:'Найдите четырёхлистный клевер',d_spinwin:'Быстрая игра без сложных правил'},
de:{kycVerify:'Verifizieren',fairPlay:'🔐 Fairness',admin:'⚙️ Admin',logout:'Abmelden',
  heroBadge:'✦ LIZENZIERTE CASINO PLATTFORM',heroSub:'50+ Spiele, Live-Wetten, Krypto-Zahlungen. Fairness kryptografisch bestätigt.',
  kycBannerTitle:'⚠️ Konto nicht verifiziert',kycBannerDesc:'Sie müssen Ihre Identität und Ihr Alter bestätigen, um zu spielen.',
  kycBannerBtn:'Jetzt verifizieren →',gamesLbl:'SPIELE',playingLbl:'SPIELEN JETZT',rtpLbl:'DURCHSCHN. RTP',supportLbl:'SUPPORT',
  promoH:'Willkommen! Sie haben 🪙10.000 Chips',promoDesc:'Jeden Tag — neuer Bonus. Spielen Sie, verdienen Sie XP, steigen Sie auf.',
  promoBtn:'Jetzt spielen',fAll:'🎰 Alle',fPop:'🔥 Beliebt',fSlots:'🎰 Slots',fTable:'🃏 Tisch',fCrash:'📈 Crash',fSports:'⚽ Sport',fInstant:'⚡ Sofort',
  secCrash:'📈 CRASH & ORIGINALS',secSlots:'🎰 SPIELAUTOMATEN',secTable:'🃏 TISCHSPIELE',secSports:'⚽ SPORTWETTEN',secInstant:'⚡ SOFORTSPIELE',
  playOverlay:'SPIELEN',fKyc:'KYC Verifizierung',fFair:'Provably Fair',fResp:'Verantwortungsvolles Spielen',fPriv:'Datenschutz',fTerms:'AGB',fHelp:'Hilfe',
  footerText:'HATHOR Royal Casino. Glücksspiel kann süchtig machen — spielen Sie verantwortungsbewusst.<br/>© 2025–2026 HATHOR Royal Casino. Alle Rechte vorbehalten.',
  d_crash:'Aviator-Spiel. Auszahlen vor dem Crash!',d_mines:'5×5 Gitter. Diamanten finden, Minen vermeiden!',
  d_dice:'Über oder unter der Zielzahl würfeln',d_limbo:'Ziel setzen — erreicht die Rakete es?',
  d_hilo:'Höher oder niedriger? Seriengewinne sammeln!',d_wheel:'Rad drehen — 3 Risikostufen, bis 100×!',
  d_fruits:'Klassischer Früchteautomat, 20 Gewinnlinien',d_egyptian:'Ägyptische Schätze, Wilds, Free Spins',
  d_space:'Weltraumabenteuer mit hohen Multiplikatoren',d_diamond:'Luxuriöse Diamanten-Slots mit Mega-Jackpot',
  d_jungle:'Dschungelgeist, Multiplikatoren bis ×25',d_dragon:'Drachenhöhle mit versteckten Schätzen',
  d_ocean:'Unterwasserabenteuer mit 243 Gewinnwegen',d_moon:'Magischer Nacht-Slot mit Expanding Wilds',
  d_baccarat:'Klassisches Baccarat — Spieler, Banker oder Unentschieden',d_blackjack:'21 — klassisches Blackjack gegen den Dealer',
  d_vpoker:'Jacks or Better — halten, tauschen, gewinnen!',d_texas:'Multiplayer-Poker mit Bots und Live-Spielern',
  d_keno:'80-Kugel-Lotterie — bis zu 10 Zahlen wählen',d_3card:'Drei-Karten-Poker — schnell und lustig',
  d_euroulette:'Europäisches Roulette mit einfacher Null',d_amroulette:'Amerikanisches Roulette mit Doppelnull',
  d_football:'Premier League, La Liga, Champions League',d_basketball:'NBA, EuroLeague, Live-Quoten',
  d_tennis:'ATP, WTA, Grand Slam',d_hockey:'NHL, europäische Ligen',
  d_wheel2:'Drehen und bis 100× gewinnen',d_crystal:'Kristallkugel-Lotterie',
  d_clover:'Das vierblättrige Kleeblatt finden',d_spinwin:'Schnelles Spiel ohne komplizierte Regeln'},
pl:{kycVerify:'Zweryfikuj',fairPlay:'🔐 Fair Play',admin:'⚙️ Admin',logout:'Wyloguj',
  heroBadge:'✦ LICENCJONOWANA PLATFORMA KASYNA',heroSub:'50+ gier, zakłady na żywo, płatności krypto. Uczciwosc potwierdzona kryptograficznie.',
  kycBannerTitle:'⚠️ Konto niezweryfikowane',kycBannerDesc:'Musisz potwierdzić tożsamość i wiek, aby grać.',
  kycBannerBtn:'Zweryfikuj teraz →',gamesLbl:'GIER',playingLbl:'GRA TERAZ',rtpLbl:'ŚREDNI RTP',supportLbl:'WSPARCIE',
  promoH:'Witamy! Masz 🪙10 000 żetonów',promoDesc:'Każdy dzień — nowy bonus. Graj, zdobywaj XP, awansuj.',
  promoBtn:'Graj teraz',fAll:'🎰 Wszystkie',fPop:'🔥 Popularne',fSlots:'🎰 Sloty',fTable:'🃏 Stół',fCrash:'📈 Crash',fSports:'⚽ Sport',fInstant:'⚡ Natychmiastowe',
  secCrash:'📈 CRASH & ORYGINAŁY',secSlots:'🎰 AUTOMATY',secTable:'🃏 GRY STOŁOWE',secSports:'⚽ ZAKŁADY SPORTOWE',secInstant:'⚡ GRY NATYCHMIASTOWE',
  playOverlay:'GRAJ',fKyc:'Weryfikacja KYC',fFair:'Provably Fair',fResp:'Odpowiedzialna gra',fPriv:'Prywatność',fTerms:'Regulamin',fHelp:'Pomoc',
  footerText:'HATHOR Royal Casino. Hazard może uzależniać — graj odpowiedzialnie.<br/>© 2025–2026 HATHOR Royal Casino. Wszelkie prawa zastrzeżone.',
  d_crash:'Gra w stylu Aviator. Wypłać przed katastrofą!',d_mines:'Siatka 5×5. Znajdź diamenty, unikaj min!',
  d_dice:'Rzuć powyżej lub poniżej docelowej liczby',d_limbo:'Ustaw cel — czy rakieta go osiągnie?',
  d_hilo:'Wyżej czy niżej? Buduj serię!',d_wheel:'Kręć kołem — 3 poziomy ryzyka, do 100×!',
  d_fruits:'Klasyczny automat owocowy, 20 linii wygranych',d_egyptian:'Egipskie skarby, wilds, free spins',
  d_space:'Kosmiczna przygoda z wysokimi mnożnikami',d_diamond:'Luksusowe sloty z mega jackpotem',
  d_jungle:'Duch dżungli, mnożniki do ×25',d_dragon:'Jaskinia smoka z ukrytymi skarbami',
  d_ocean:'Podwodna przygoda, 243 sposoby wygranej',d_moon:'Magiczny nocny slot z expanding wilds',
  d_baccarat:'Klasyczne baccarat — Gracz, Krupier lub Remis',d_blackjack:'21 — klasyczny blackjack przeciwko krupierowi',
  d_vpoker:'Jacks or Better — trzymaj, wymieniaj, wygrywaj!',d_texas:'Poker wieloosobowy z botami i graczami na żywo',
  d_keno:'Loteria 80 kul — wybierz do 10 liczb',d_3card:'Poker trzech kart — szybko i zabawnie',
  d_euroulette:'Ruletka europejska z jednym zerem',d_amroulette:'Ruletka amerykańska z podwójnym zerem',
  d_football:'Premier League, La Liga, Champions League',d_basketball:'NBA, EuroLeague, kursy na żywo',
  d_tennis:'ATP, WTA, Grand Slam',d_hockey:'NHL, europejskie ligi',
  d_wheel2:'Kręć i wygrywaj do 100×',d_crystal:'Loteria kryształowej kuli',
  d_clover:'Szukaj czterolistnej koniczyny',d_spinwin:'Szybka gra bez skomplikowanych zasad'},
fr:{kycVerify:'Vérifier',fairPlay:'🔐 Équité',admin:'⚙️ Admin',logout:'Déconnexion',
  heroBadge:'✦ PLATEFORME DE CASINO LICENCIÉE',heroSub:'50+ jeux, paris en direct, paiements crypto. Équité vérifiée cryptographiquement.',
  kycBannerTitle:'⚠️ Compte non vérifié',kycBannerDesc:'Vous devez vérifier votre identité et votre âge pour jouer.',
  kycBannerBtn:'Vérifier maintenant →',gamesLbl:'JEUX',playingLbl:'JOUENT MAINTENANT',rtpLbl:'RTP MOYEN',supportLbl:'SUPPORT',
  promoH:'Bienvenue! Vous avez 🪙10 000 jetons',promoDesc:'Chaque jour — un nouveau bonus. Jouez, gagnez des XP, montez de niveau.',
  promoBtn:'Jouer',fAll:'🎰 Tout',fPop:'🔥 Populaire',fSlots:'🎰 Machines',fTable:'🃏 Table',fCrash:'📈 Crash',fSports:'⚽ Sport',fInstant:'⚡ Instantané',
  secCrash:'📈 CRASH & ORIGINAUX',secSlots:'🎰 MACHINES À SOUS',secTable:'🃏 JEUX DE TABLE',secSports:'⚽ PARIS SPORTIFS',secInstant:'⚡ JEUX INSTANTANÉS',
  playOverlay:'JOUER',fKyc:'Vérification KYC',fFair:'Provably Fair',fResp:'Jeu responsable',fPriv:'Confidentialité',fTerms:'CGU',fHelp:'Aide',
  footerText:'HATHOR Royal Casino. Le jeu peut créer une dépendance — jouez de manière responsable.<br/>© 2025–2026 HATHOR Royal Casino. Tous droits réservés.',
  d_crash:'Jeu style Aviator. Encaissez avant le crash!',d_mines:'Grille 5×5. Trouvez des diamants, évitez les mines!',
  d_dice:'Lancez au-dessus ou en-dessous du nombre cible',d_limbo:'Fixez votre objectif — la fusée l\'atteindra-t-elle?',
  d_hilo:'Plus haut ou plus bas? Construisez une série!',d_wheel:'Tournez la roue — 3 niveaux, jusqu\'à 100×!',
  d_fruits:'Machine à fruits classique, 20 lignes gagnantes',d_egyptian:'Trésors égyptiens, wilds, free spins',
  d_space:'Aventure spatiale avec hauts multiplicateurs',d_diamond:'Machines à diamants de luxe avec mega jackpot',
  d_jungle:'Esprit de la jungle, multiplicateurs jusqu\'à ×25',d_dragon:'Grotte du dragon avec trésors cachés',
  d_ocean:'Aventure sous-marine, 243 façons de gagner',d_moon:'Machine nocturne magique avec expanding wilds',
  d_baccarat:'Baccara classique — Joueur, Banquier ou Égalité',d_blackjack:'21 — blackjack classique contre le croupier',
  d_vpoker:'Jacks or Better — gardez, échangez, gagnez!',d_texas:'Poker multijoueur avec bots et joueurs en direct',
  d_keno:'Loterie à 80 boules — choisissez jusqu\'à 10 numéros',d_3card:'Poker à trois cartes — rapide et amusant',
  d_euroulette:'Roulette européenne à zéro simple',d_amroulette:'Roulette américaine à double zéro',
  d_football:'Premier League, La Liga, Champions League',d_basketball:'NBA, EuroLigue, cotes en direct',
  d_tennis:'ATP, WTA, Grand Chelem',d_hockey:'NHL, ligues européennes',
  d_wheel2:'Tournez et gagnez jusqu\'à 100×',d_crystal:'Loterie de la boule de cristal',
  d_clover:'Trouvez le trèfle à quatre feuilles',d_spinwin:'Jeu rapide sans règles compliquées'},
tr:{kycVerify:'Doğrula',fairPlay:'🔐 Adalet',admin:'⚙️ Admin',logout:'Çıkış',
  heroBadge:'✦ LİSANSLI CASINO PLATFORMU',heroSub:'50+ oyun, canlı bahis, kripto ödemeler. Adalet kriptografik olarak doğrulandı.',
  kycBannerTitle:'⚠️ Hesap doğrulanmadı',kycBannerDesc:'Oynamak için kimliğinizi ve yaşınızı doğrulamanız gerekiyor.',
  kycBannerBtn:'Şimdi doğrula →',gamesLbl:'OYUN',playingLbl:'ŞU AN OYNUYOR',rtpLbl:'ORT. RTP',supportLbl:'DESTEK',
  promoH:'Hoş geldiniz! 🪙10.000 çipiniz var',promoDesc:'Her gün yeni bonus. Oynayın, XP kazanın, seviye atlayın.',
  promoBtn:'Şimdi oyna',fAll:'🎰 Tümü',fPop:'🔥 Popüler',fSlots:'🎰 Slotlar',fTable:'🃏 Masa',fCrash:'📈 Crash',fSports:'⚽ Spor',fInstant:'⚡ Anlık',
  secCrash:'📈 CRASH & ORİJİNAL',secSlots:'🎰 SLOT MAKİNELERİ',secTable:'🃏 MASA OYUNLARI',secSports:'⚽ SPOR BAHİSLERİ',secInstant:'⚡ ANLIK OYUNLAR',
  playOverlay:'OYNA',fKyc:'KYC Doğrulama',fFair:'Provably Fair',fResp:'Sorumlu Kumar',fPriv:'Gizlilik',fTerms:'Şartlar',fHelp:'Yardım',
  footerText:'HATHOR Royal Casino. Kumar bağımlılık yaratabilir — sorumlu oynayın.<br/>© 2025–2026 HATHOR Royal Casino. Tüm haklar saklıdır.',
  d_crash:'Aviator tarzı oyun. Çökmeden önce çekin!',d_mines:'5×5 ızgara. Elmas bul, mayinden kaç!',
  d_dice:'Hedef sayının üstüne veya altına at',d_limbo:'Hedefinizi belirleyin — roket ulaşacak mı?',
  d_hilo:'Daha yüksek mi alçak mı? Seri yap!',d_wheel:'Çarkı çevir — 3 risk seviyesi, 100×\'e kadar!',
  d_fruits:'Klasik meyve makinesi, 20 kazanma çizgisi',d_egyptian:'Mısır hazineleri, wildlar, free spinler',
  d_space:'Yüksek çarpanlı uzay macerası',d_diamond:'Mega jackpotlu lüks elmas slotları',
  d_jungle:'Orman ruhu, ×25\'e kadar çarpanlar',d_dragon:'Gizli hazineli ejderha mağarası',
  d_ocean:'243 kazanma yollu su altı macerası',d_moon:'Genişleyen wildlı büyülü gece slotu',
  d_baccarat:'Klasik bakara — Oyuncu, Banker veya Beraberlik',d_blackjack:'21 — krupiyeye karşı klasik blackjack',
  d_vpoker:'Jacks or Better — tut, değiştir, kazan!',d_texas:'Botlar ve canlı oyuncularla çok oyunculu poker',
  d_keno:'80 toplu piyango — 10\'a kadar sayı seç',d_3card:'Üç kartlı poker — hızlı ve eğlenceli',
  d_euroulette:'Tek sıfırlı Avrupa ruleti',d_amroulette:'Çift sıfırlı Amerikan ruleti',
  d_football:'Premier Lig, La Liga, Şampiyonlar Ligi',d_basketball:'NBA, EuroLig, canlı oranlar',
  d_tennis:'ATP, WTA, Grand Slam',d_hockey:'NHL, Avrupa ligleri',
  d_wheel2:'Çevir ve 100×\'e kadar kazan',d_crystal:'Kristal küre piyangosu',
  d_clover:'Dört yapraklı yoncayı bul',d_spinwin:'Karmaşık kurallar olmadan hızlı oyun'},
ar:{kycVerify:'تحقق',fairPlay:'🔐 النزاهة',admin:'⚙️ إدارة',logout:'خروج',
  heroBadge:'✦ منصة كازينو مرخصة',heroSub:'50+ لعبة، رهانات مباشرة، مدفوعات تشفيرية. النزاهة مؤكدة تشفيريًا.',
  kycBannerTitle:'⚠️ الحساب غير موثق',kycBannerDesc:'يجب عليك التحقق من هويتك وعمرك للعب.',
  kycBannerBtn:'التحقق الآن →',gamesLbl:'ألعاب',playingLbl:'يلعب الآن',rtpLbl:'متوسط RTP',supportLbl:'الدعم',
  promoH:'مرحباً! لديك 🪙10,000 رقاقة',promoDesc:'كل يوم — مكافأة جديدة. العب، اكسب XP، ارتقِ بالمستوى.',
  promoBtn:'العب الآن',fAll:'🎰 الكل',fPop:'🔥 شائع',fSlots:'🎰 سلوت',fTable:'🃏 طاولة',fCrash:'📈 كراش',fSports:'⚽ رياضة',fInstant:'⚡ فوري',
  secCrash:'📈 كراش والأصليات',secSlots:'🎰 آلات السلوت',secTable:'🃏 العاب الطاولة',secSports:'⚽ رهانات رياضية',secInstant:'⚡ الألعاب الفورية',
  playOverlay:'العب',fKyc:'توثيق KYC',fFair:'عدالة مؤكدة',fResp:'اللعب المسؤول',fPriv:'الخصوصية',fTerms:'الشروط',fHelp:'المساعدة',
  footerText:'HATHOR Royal Casino. القمار قد يسبب الإدمان — العب بمسؤولية.<br/>© 2025–2026 HATHOR Royal Casino. جميع الحقوق محفوظة.',
  d_crash:'لعبة بأسلوب Aviator. اسحب قبل الانهيار!',d_mines:'شبكة 5×5. ابحث عن الماس، تجنب الألغام!',
  d_dice:'ارمِ فوق أو تحت الرقم المستهدف',d_limbo:'حدد هدفك — هل ستصل الصاروخ؟',
  d_hilo:'أعلى أم أقل؟ ابنِ سلسلة!',d_wheel:'أدر العجلة — 3 مستويات خطر، حتى 100×!',
  d_fruits:'آلة فواكه كلاسيكية، 20 خط فوز',d_egyptian:'كنوز مصرية، wilds، دورات مجانية',
  d_space:'مغامرة فضائية بمضاعفات عالية',d_diamond:'فتحات ماسية فاخرة مع جاكبوت',
  d_jungle:'روح الغابة، مضاعفات حتى ×25',d_dragon:'كهف التنين بكنوز خفية',
  d_ocean:'مغامرة تحت الماء، 243 طريقة للفوز',d_moon:'فتحة ليلية سحرية مع expanding wilds',
  d_baccarat:'باكارا كلاسيكي — لاعب، مصرفي أو تعادل',d_blackjack:'21 — بلاك جاك كلاسيكي ضد الكروبيه',
  d_vpoker:'جاكس أو بيتر — احتفظ، بدّل، اكسب!',d_texas:'بوكر متعدد اللاعبين مع روبوتات ولاعبين حقيقيين',
  d_keno:'يانصيب 80 كرة — اختر حتى 10 أرقام',d_3card:'بوكر ثلاث بطاقات — سريع وممتع',
  d_euroulette:'روليت أوروبي بصفر واحد',d_amroulette:'روليت أمريكي بصفر مزدوج',
  d_football:'الدوري الإنجليزي الممتاز، لا ليغا، دوري الأبطال',d_basketball:'NBA، يوروليغ، أسعار مباشرة',
  d_tennis:'ATP، WTA، غراند سلام',d_hockey:'NHL، الدوريات الأوروبية',
  d_wheel2:'أدر واكسب حتى 100×',d_crystal:'يانصيب الكرة الكريستالية',
  d_clover:'ابحث عن البرسيم رباعي الأوراق',d_spinwin:'لعبة سريعة بدون قواعد معقدة'},
zh:{kycVerify:'验证',fairPlay:'🔐 公平',admin:'⚙️ 管理',logout:'退出',
  heroBadge:'✦ 持牌赌场平台',heroSub:'50+游戏，实时投注，加密支付。公平性通过密码学验证。',
  kycBannerTitle:'⚠️ 账户未验证',kycBannerDesc:'您必须验证您的身份和年龄才能游戏。',
  kycBannerBtn:'立即验证 →',gamesLbl:'游戏',playingLbl:'正在游戏',rtpLbl:'平均RTP',supportLbl:'支持',
  promoH:'欢迎！您有 🪙10,000 筹码',promoDesc:'每天新奖励。游戏、赚取XP、升级解锁VIP特权。',
  promoBtn:'立即游戏',fAll:'🎰 全部',fPop:'🔥 热门',fSlots:'🎰 老虎机',fTable:'🃏 桌牌',fCrash:'📈 碰撞',fSports:'⚽ 体育',fInstant:'⚡ 即时',
  secCrash:'📈 碰撞与原创',secSlots:'🎰 老虎机',secTable:'🃏 桌牌游戏',secSports:'⚽ 体育投注',secInstant:'⚡ 即时游戏',
  playOverlay:'游戏',fKyc:'KYC认证',fFair:'可证明公平',fResp:'负责任博彩',fPriv:'隐私政策',fTerms:'条款',fHelp:'帮助',
  footerText:'HATHOR Royal Casino。赌博可能导致成瘾 — 负责任地游戏。<br/>© 2025–2026 HATHOR Royal Casino。版权所有。',
  d_crash:'Aviator风格游戏。在崩溃前收割！',d_mines:'5×5网格。找钻石，避地雷！',
  d_dice:'掷出高于或低于目标数字',d_limbo:'设定目标 — 火箭能到达吗？',
  d_hilo:'更高还是更低？积累连胜！',d_wheel:'转动转盘 — 3个风险级别，最高100×！',
  d_fruits:'经典水果机，20条获奖线',d_egyptian:'埃及宝藏，百搭，免费旋转',
  d_space:'太空冒险，高倍率',d_diamond:'豪华钻石老虎机，巨型奖池',
  d_jungle:'丛林精神，最高×25倍率',d_dragon:'龙穴，隐藏宝藏',
  d_ocean:'水下冒险，243种获奖方式',d_moon:'魔幻夜晚老虎机，扩展百搭',
  d_baccarat:'经典百家乐 — 玩家、庄家或平局',d_blackjack:'21点 — 对抗庄家的经典二十一点',
  d_vpoker:'杰克或更好 — 保留、换牌、获胜！',d_texas:'与机器人和真实玩家的多人扑克',
  d_keno:'80球彩票 — 选择最多10个数字',d_3card:'三张牌扑克 — 快速有趣',
  d_euroulette:'单零欧式轮盘',d_amroulette:'双零美式轮盘',
  d_football:'英超、西甲、冠军联赛',d_basketball:'NBA、欧洲联赛、实时赔率',
  d_tennis:'ATP、WTA、大满贯',d_hockey:'NHL、欧洲联赛',
  d_wheel2:'旋转赢取最高100×',d_crystal:'水晶球彩票',
  d_clover:'寻找四叶草',d_spinwin:'快速游戏，无复杂规则'},
hi:{kycVerify:'सत्यापित करें',fairPlay:'🔐 निष्पक्षता',admin:'⚙️ एडमिन',logout:'लॉगआउट',
  heroBadge:'✦ लाइसेंसप्राप्त कैसीनो प्लेटफॉर्म',heroSub:'50+ गेम, लाइव बेटिंग, क्रिप्टो भुगतान। निष्पक्षता क्रिप्टोग्राफिक रूप से सत्यापित।',
  kycBannerTitle:'⚠️ खाता सत्यापित नहीं',kycBannerDesc:'खेलने के लिए आपको अपनी पहचान और उम्र सत्यापित करनी होगी।',
  kycBannerBtn:'अभी सत्यापित करें →',gamesLbl:'गेम',playingLbl:'अभी खेल रहे हैं',rtpLbl:'औसत RTP',supportLbl:'सहायता',
  promoH:'स्वागत है! आपके पास 🪙10,000 चिप्स हैं',promoDesc:'हर दिन नया बोनस। खेलें, XP कमाएं, स्तर बढ़ाएं।',
  promoBtn:'अभी खेलें',fAll:'🎰 सभी',fPop:'🔥 लोकप्रिय',fSlots:'🎰 स्लॉट',fTable:'🃏 टेबल',fCrash:'📈 क्रैश',fSports:'⚽ खेल',fInstant:'⚡ तत्काल',
  secCrash:'📈 क्रैश और ओरिजिनल',secSlots:'🎰 स्लॉट मशीन',secTable:'🃏 टेबल गेम',secSports:'⚽ स्पोर्ट्स बेटिंग',secInstant:'⚡ तत्काल गेम',
  playOverlay:'खेलें',fKyc:'KYC सत्यापन',fFair:'सिद्ध निष्पक्षता',fResp:'जिम्मेदार जुआ',fPriv:'गोपनीयता',fTerms:'नियम',fHelp:'सहायता',
  footerText:'HATHOR Royal Casino। जुआ लत लगा सकता है — जिम्मेदारी से खेलें।<br/>© 2025–2026 HATHOR Royal Casino। सर्वाधिकार सुरक्षित।',
  d_crash:'एविएटर शैली का खेल। क्रैश से पहले कैश आउट करें!',d_mines:'5×5 ग्रिड। हीरे खोजें, खदानों से बचें!',
  d_dice:'लक्ष्य संख्या के ऊपर या नीचे रोल करें',d_limbo:'लक्ष्य निर्धारित करें — क्या रॉकेट पहुंचेगा?',
  d_hilo:'ऊंचा या नीचा? स्ट्रीक बनाएं!',d_wheel:'व्हील घुमाएं — 3 जोखिम स्तर, 100× तक!',
  d_fruits:'क्लासिक फल मशीन, 20 जीतने की लाइनें',d_egyptian:'मिस्र के खजाने, wilds, फ्री स्पिन',
  d_space:'उच्च गुणकों के साथ अंतरिक्ष साहसिक',d_diamond:'मेगा जैकपॉट के साथ लग्जरी डायमंड स्लॉट',
  d_jungle:'जंगल की भावना, ×25 तक गुणक',d_dragon:'छिपे खजाने के साथ ड्रैगन की गुफा',
  d_ocean:'पानी के नीचे साहसिक, जीतने के 243 तरीके',d_moon:'Expanding wilds के साथ जादुई रात का स्लॉट',
  d_baccarat:'क्लासिक बैकारेट — खिलाड़ी, बैंकर या टाई',d_blackjack:'21 — डीलर के खिलाफ क्लासिक ब्लैकजैक',
  d_vpoker:'Jacks or Better — रखें, बदलें, जीतें!',d_texas:'बॉट्स और लाइव खिलाड़ियों के साथ मल्टीप्लेयर पोकर',
  d_keno:'80 बॉल लॉटरी — 10 नंबर तक चुनें',d_3card:'तीन पत्ती पोकर — तेज और मजेदार',
  d_euroulette:'सिंगल जीरो यूरोपीय रूलेट',d_amroulette:'डबल जीरो अमेरिकी रूलेट',
  d_football:'प्रीमियर लीग, ला लीगा, चैंपियंस लीग',d_basketball:'NBA, यूरोलीग, लाइव ऑड्स',
  d_tennis:'ATP, WTA, ग्रैंड स्लैम',d_hockey:'NHL, यूरोपीय लीग',
  d_wheel2:'घुमाएं और 100× तक जीतें',d_crystal:'क्रिस्टल बॉल लॉटरी',
  d_clover:'चार पत्ती तिपतिया खोजें',d_spinwin:'जटिल नियमों के बिना तेज खेल'},
uk:{kycVerify:'Підтвердити',fairPlay:'🔐 Чесність',admin:'⚙️ Адмін',logout:'Вийти',
  heroBadge:'✦ ЛІЦЕНЗОВАНА ПЛАТФОРМА КАЗИНО',heroSub:'50+ ігор, ставки наживо, крипто-платежі. Чесність підтверджена криптографічно.',
  kycBannerTitle:'⚠️ Акаунт не верифіковано',kycBannerDesc:'Для гри необхідно підтвердити особу та вік.',
  kycBannerBtn:'Підтвердити зараз →',gamesLbl:'ІГОР',playingLbl:'ГРАЮТЬ ЗАРАЗ',rtpLbl:'СЕРЕДНІЙ RTP',supportLbl:'ПІДТРИМКА',
  promoH:'Ласкаво просимо! У вас 🪙10 000 фішок',promoDesc:'Щодня — новий бонус. Грайте, заробляйте XP, підвищуйте рівень.',
  promoBtn:'Грати',fAll:'🎰 Усі',fPop:'🔥 Популярні',fSlots:'🎰 Слоти',fTable:'🃏 Стіл',fCrash:'📈 Краш',fSports:'⚽ Спорт',fInstant:'⚡ Миттєві',
  secCrash:'📈 КРАШ ТА ОРИГІНАЛИ',secSlots:'🎰 СЛОТ-МАШИНИ',secTable:'🃏 НАСТІЛЬНІ ІГРИ',secSports:'⚽ СТАВКИ НА СПОРТ',secInstant:'⚡ МИТТЄВІ ІГРИ',
  playOverlay:'ГРАТИ',fKyc:'Верифікація KYC',fFair:'Provably Fair',fResp:'Відповідальна гра',fPriv:'Конфіденційність',fTerms:'Правила',fHelp:'Допомога',
  footerText:'HATHOR Royal Casino. Азартні ігри можуть спричинити залежність — грайте відповідально.<br/>© 2025–2026 HATHOR Royal Casino. Усі права захищені.',
  d_crash:'Гра у стилі Aviator. Виводьте до краху!',d_mines:'Сітка 5×5. Знайди діаманти, уникай мін!',
  d_dice:'Кидайте вище або нижче цільового числа',d_limbo:'Встановіть ціль — ракета досягне її?',
  d_hilo:'Вище чи нижче? Збирайте серію!',d_wheel:'Крутіть колесо — 3 рівні ризику, до 100×!',
  d_fruits:'Класична машина фруктів, 20 ліній виграшу',d_egyptian:'Єгипетські скарби, wild-и, безкоштовні спіни',
  d_space:'Космічна пригода з великими множниками',d_diamond:'Розкішні діамантові слоти з мегаджекпотом',
  d_jungle:'Дух джунглів, множники до ×25',d_dragon:'Печера дракона з прихованими скарбами',
  d_ocean:'Підводна пригода, 243 способи виграти',d_moon:'Магічний нічний слот з expanding wilds',
  d_baccarat:'Класичне баккара — Гравець, Банкір або Нічия',d_blackjack:'21 — класичний блекджек проти дилера',
  d_vpoker:'Jacks or Better — тримай, міняй, вигравай!',d_texas:'Мультиплеєрний покер з ботами та живими гравцями',
  d_keno:'Лотерея з 80 кулями — обирайте до 10 чисел',d_3card:'Трикарточний покер — швидко та весело',
  d_euroulette:'Європейська рулетка з одним нулем',d_amroulette:'Американська рулетка з подвійним нулем',
  d_football:'Прем\'єр-ліга, Ла Ліга, Ліга чемпіонів',d_basketball:'NBA, Євроліга, живі коефіцієнти',
  d_tennis:'ATP, WTA, Великий Шолом',d_hockey:'NHL, Європейські ліги',
  d_wheel2:'Крутіть і вигравайте до 100×',d_crystal:'Лотерея кришталевої кулі',
  d_clover:'Шукайте чотирилистник',d_spinwin:'Швидка гра без складних правил'}
};

let lobby = fs.readFileSync(P+'/lobby.html','utf8');

// Add lang bar CSS before </style>
lobby = lobby.replace('</style>', LANG_BAR_CSS + '\n.game-card::after{content:attr(data-play-text);position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:\'Orbitron\',monospace;font-size:15px;font-weight:900;letter-spacing:3px;color:rgba(240,192,96,.9);background:rgba(4,4,10,.85);opacity:0;transition:opacity .2s;border-radius:16px;pointer-events:none;}\n.game-card:not(.locked):hover::after{opacity:1;}\n</style>');

// Remove old ::after rule that has hardcoded text
lobby = lobby.replace(/\.game-card::after\{content:'[^']*';[^}]+\}/g, '');
lobby = lobby.replace(/\.game-card:not\(\.locked\):hover::after\{opacity:1;\}/g, '');

// Add lang bar to header
lobby = lobby.replace('<a class="header-btn" id="logoutBtn" onclick="logout()" href="#">Atsijungti</a>',
  '<a class="header-btn" id="logoutBtn" onclick="logout()" href="#" data-i18n="logout">Log out</a>');
lobby = lobby.replace('<a class="header-btn kyc-warn" id="kycBtn" href="/kyc.html" style="display:none">',
  '<a class="header-btn kyc-warn" id="kycBtn" href="/kyc.html" style="display:none" data-i18n="kycVerify">');
lobby = lobby.replace('<span class="kyc-dot"></span>Patvirtinti', '<span class="kyc-dot"></span><span data-i18n="kycVerify">Verify</span>');
lobby = lobby.replace('<a class="header-btn" href="/verify.html">🔐 Fair Play</a>',
  '<a class="header-btn" href="/verify.html" data-i18n="fairPlay">🔐 Fair Play</a>');
lobby = lobby.replace('<a class="header-btn" href="/admin.html">⚙️ Admin</a>',
  '<a class="header-btn" href="/admin.html" data-i18n="admin">⚙️ Admin</a>');
lobby = lobby.replace('<div class="header-right">',
  '<div class="header-right">');
// Insert lang bar before closing header-right
lobby = lobby.replace('<a class="header-btn" id="logoutBtn"',
  '<div class="lang-wrap"><div class="lang-bar" id="langBar"></div></div>\n    <a class="header-btn" id="logoutBtn"');

// Hero
lobby = lobby.replace('✦ LICENZIJUOTA KAZINO PLATFORMA', '<span data-i18n="heroBadge">✦ LICENSED CASINO PLATFORM</span>');
lobby = lobby.replace('50+ žaidimų, tiesioginės lažybos, kriptovaliutų mokėjimai. Sąžiningumas patvirtinamas kriptografiškai.',
  '<span data-i18n="heroSub">50+ games, live betting, crypto payments. Fairness verified cryptographically.</span>');

// KYC Banner
lobby = lobby.replace('<strong>⚠️ Paskyra nepatvirtinta</strong>', '<strong data-i18n="kycBannerTitle">⚠️ Account not verified</strong>');
lobby = lobby.replace('Norėdami žaisti, turite patvirtinti tapatybę ir amžių. Tai reikalauja Lietuvos ir ES azartinių lošimų taisyklės.',
  '<span data-i18n="kycBannerDesc">You must verify your identity and age to play.</span>');
lobby = lobby.replace('Patvirtinti dabar →', '<span data-i18n="kycBannerBtn">Verify now →</span>');

// Stats
lobby = lobby.replace('<div class="stat-l">ŽAIDIMŲ</div>', '<div class="stat-l" data-i18n="gamesLbl">GAMES</div>');
lobby = lobby.replace('<div class="stat-l">ŽAIDŽIA DABAR</div>', '<div class="stat-l" data-i18n="playingLbl">PLAYING NOW</div>');
lobby = lobby.replace('<div class="stat-l">VIDUTINIS RTP</div>', '<div class="stat-l" data-i18n="rtpLbl">AVG RTP</div>');
lobby = lobby.replace('<div class="stat-l">PALAIKYMAS</div>', '<div class="stat-l" data-i18n="supportLbl">SUPPORT</div>');

// Promo
lobby = lobby.replace('<h3>Sveikiname! Jums 🪙10,000 žetonų</h3>', '<h3 data-i18n="promoH">Welcome! You have 🪙10,000 chips</h3>');
lobby = lobby.replace('Kiekviena diena — naujas bonusas. Žaiskite, kaupikaite XP, kelkitės į aukštesnius lygius ir atrakinkite VIP privilegijas.',
  '<span data-i18n="promoDesc">Every day — a new bonus. Play, earn XP, level up and unlock VIP privileges.</span>');
lobby = lobby.replace('>Žaisti dabar</a>', ' data-i18n="promoBtn">Play now</a>');

// Filter buttons
lobby = lobby.replace('>🎰 Visi<', ' data-i18n="fAll">🎰 All<');
lobby = lobby.replace('>🔥 Populiarūs<', ' data-i18n="fPop">🔥 Popular<');
lobby = lobby.replace('>🎰 Slotai<', ' data-i18n="fSlots">🎰 Slots<');
lobby = lobby.replace('>🃏 Stalo<', ' data-i18n="fTable">🃏 Table<');
lobby = lobby.replace('>📈 Crash<', ' data-i18n="fCrash">📈 Crash<');
lobby = lobby.replace('>⚽ Sportas<', ' data-i18n="fSports">⚽ Sports<');
lobby = lobby.replace('>⚡ Greiti<', ' data-i18n="fInstant">⚡ Instant<');

// Section titles
lobby = lobby.replace('>📈 CRASH & ORIGINALS<', ' data-i18n="secCrash">📈 CRASH & ORIGINALS<');
lobby = lobby.replace('>🎰 SLOT MAŠINOS<', ' data-i18n="secSlots">🎰 SLOT MACHINES<');
lobby = lobby.replace('>🃏 STALO ŽAIDIMAI<', ' data-i18n="secTable">🃏 TABLE GAMES<');
lobby = lobby.replace('>⚽ SPORTO LAŽYBOS<', ' data-i18n="secSports">⚽ SPORTS BETTING<');
lobby = lobby.replace('>⚡ GREITI ŽAIDIMAI<', ' data-i18n="secInstant">⚡ INSTANT GAMES<');

// Game descriptions - replace each LT description with English + data-i18n
const gameDescs = [
  ['Aviator stiliaus žaidimas. Išimkite iki katastrofos!','d_crash'],
  ['5×5 lentelė. Raskite deimantus, išvenkite minų!','d_mines'],
  ['Meskite kauliukus virš arba žemiau tikslinio skaičiaus','d_dice'],
  ['Nustatykite tikslą — ar raketа pasieks jį?','d_limbo'],
  ['Aukščiau ar žemiau? Kaupkite streak\'ą!','d_hilo'],
  ['Sukite ratą — 3 rizikos lygiai, iki 100×!','d_wheel'],
  ['Klasikinė vaisių mašina, 20 laimėjimo linijų','d_fruits'],
  ['Egipto lobiai, laukiniai simboliai, free spins','d_egyptian'],
  ['Kosmoso avantūra su dideliais koeficientais','d_space'],
  ['Prabangios deimantų mašinos su mega jackpot','d_diamond'],
  ['Džiunglių dvasia, daugintojai iki ×25','d_jungle'],
  ['Drakono ola su paslėptais lobiais','d_dragon'],
  ['Povandeninė nuotykis su 243 laimėjimo būdais','d_ocean'],
  ['Magiška nakties mašina su expanding wilds','d_moon'],
  ['Klasikinis baccarat — Player, Banker ar Tie','d_baccarat'],
  ['21 — klasikinis blackjack prieš dilerį','d_blackjack'],
  ['Jacks or Better — laikykite, pakeiskite, laimėkite!','d_vpoker'],
  ['Multiplayer pokeris su botais ir gyvais žaidėjais','d_texas'],
  ['80 kamuolių loterija — pasirinkite iki 10 skaičių','d_keno'],
  ['Trijų kortelių pokeris — greitas ir linksmas','d_3card'],
  ['Europietiška ruletė su vienu nuliu','d_euroulette'],
  ['Amerikietiška ruletė su dviguba nuliu','d_amroulette'],
  ['Premier League, La Liga, Champions League ir dar daugiau','d_football'],
  ['NBA, Eurolyga, LKL rungtynės su live koeficientais','d_basketball'],
  ['ATP, WTA turnyrai, Grand Slam','d_tennis'],
  ['NHL, Lietuvos čempionatas ir Europos lygos','d_hockey'],
  ['Sukite ir laimėkite iki 100×','d_wheel2'],
  ['Paskutinė kristalo rutulio loterija','d_crystal'],
  ['Ieškokite keturialapio dobilas','d_clover'],
  ['Greitasis lošimas be jokių taisyklių','d_spinwin'],
];
gameDescs.forEach(function([lt, key]) {
  lobby = lobby.split(lt).join('<span data-i18n="'+key+'">'+LOBBY_LANGS.en[key]+'</span>');
});

// Badge texts
lobby = lobby.replace(/>⭐ POPULIARUS</g, ' data-i18n-attr="badge_pop">⭐ POPULAR<');
lobby = lobby.replace(/>✨ NAUJAS</g, '>✨ NEW<');
lobby = lobby.replace(/NERIBOTA/g, 'UNLIMITED');
lobby = lobby.replace(/REGULIUOJAMA/g, 'ADJUSTABLE');
lobby = lobby.replace(/DIDELĖ RIZIKA/g, 'HIGH RISK');
lobby = lobby.replace(/3 LYGIAI/g, '3 LEVELS');

// Sports game names (Lithuanian)
lobby = lobby.replace('>FUTBOLAS<', '>FOOTBALL<');
lobby = lobby.replace('>KREPŠINIS<', '>BASKETBALL<');
lobby = lobby.replace('>TENISAS<', '>TENNIS<');
lobby = lobby.replace('>LEDO RITULYS<', '>ICE HOCKEY<');

// Footer links
lobby = lobby.replace('>KYC Patikrinimas<', ' data-i18n="fKyc">KYC Verification<');
lobby = lobby.replace('>Provably Fair<', ' data-i18n="fFair">Provably Fair<');
lobby = lobby.replace('>Atsakingas Lošimas<', ' data-i18n="fResp">Responsible Gaming<');
lobby = lobby.replace('>Privatumo Politika<', ' data-i18n="fPriv">Privacy Policy<');
lobby = lobby.replace('>Taisyklės ir Sąlygos<', ' data-i18n="fTerms">Terms & Conditions<');
lobby = lobby.replace('>Pagalba<', ' data-i18n="fHelp">Help<');

// Footer text block
lobby = lobby.replace(
  'HATHOR Royal Casino. Lošimas gali sukelti priklausomybę — lošk atsakingai.<br/>\n    Jei turite lošimo problemų, kreipkitės į pagalbos linija: <strong>116 123</strong><br/>\n    © 2025–2026 HATHOR Royal Casino. Visos teisės saugomos.',
  '<span data-i18n-html="footerText">HATHOR Royal Casino. Gambling can be addictive — play responsibly.<br/>If you have gambling problems, contact the helpline: <strong>116 123</strong><br/>© 2025–2026 HATHOR Royal Casino. All rights reserved.</span>'
);

// Add data-play-text to all game cards (for CSS content)
lobby = lobby.replace(/<a href="[^"]*" class="game-card"([^>]*)>/g, function(m) {
  if (m.indexOf('data-play-text') >= 0) return m;
  return m.replace('>', ' data-play-text="PLAY">');
});

// Add PAGE_LANGS + LANGS_LIST + applyLang before </script>
const lobbyLangScript = `
var PAGE_LANGS=${JSON.stringify(LOBBY_LANGS)};
${LANGS_LIST_STR}
${APPLY_LANG_FN}
`;
lobby = lobby.replace('<script>\nconst uid', '<script>\n'+lobbyLangScript+'\nconst uid');

fs.writeFileSync(P+'/lobby.html', lobby, 'utf8');
console.log('lobby.html DONE');

console.log('fixpages2 ALL DONE');
