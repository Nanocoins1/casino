const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'public', 'cashier.html');
let html = fs.readFileSync(FILE, 'utf8');

// ── 1. Add data-i18n attributes to HTML elements ─────────
// Header back link
html = html.replace(
  '<a class="back" href="/">← Casino</a>',
  '<a class="back" href="/" data-i18n="backBtn">← Casino</a>'
);

// Page title & sub — leave as is (they're decorative)
// Demo banner
html = html.replace(
  '⚠️ Demo mode — payments are inactive. Live payments will be available once the system goes live.',
  '<span data-i18n="demoBanner">⚠️ Demo mode — payments are inactive. Live payments will be available once the system goes live.</span>'
);

// Tabs
html = html.replace('">⬇️ Crypto</div>', '" data-i18n="tabCrypto">⬇️ Crypto</div>');
html = html.replace('">💳 Card</div>',   '" data-i18n="tabCard">💳 Card</div>');
html = html.replace('">⬆️ Withdraw</div>','<span data-i18n="tabWithdraw">⬆️ Withdraw</span></div>');
html = html.replace('">📋 History</div>', '" data-i18n="tabHistory">📋 History</div>');

// Deposit section
html = html.replace('<h3>Select Currency</h3>', '<h3 data-i18n="selCur">Select Currency</h3>');
html = html.replace('<label class="label">Token Amount</label>', '<label class="label" data-i18n="tokenAmt">Token Amount</label>');
html = html.replace('<label class="label">You Pay</label>', '<label class="label" data-i18n="youPay">You Pay</label>');
html = html.replace('<label class="label">You Get (Tokens)</label>', '<label class="label" data-i18n="youGet">You Get (Tokens)</label>');
html = html.replace('>Create Deposit Address →<', ' data-i18n="createDepBtn">Create Deposit Address →<');
html = html.replace('<strong>Minimum deposit:</strong>', '<strong data-i18n="minDep">Minimum deposit:</strong>');
html = html.replace('1 block (fast)', '<span data-i18n="confirms">1 block (fast)</span>');
html = html.replace('<strong>Confirmations:</strong>', '<strong data-i18n="confirmLbl">Confirmations:</strong>');
html = html.replace('<strong>Tokens credited:</strong>', '<strong data-i18n="credited">Tokens credited:</strong>');
html = html.replace('Instantly after confirmation', '<span data-i18n="instantly">Instantly after confirmation</span>');
html = html.replace('<strong>Supported:</strong>', '<strong data-i18n="supported">Supported:</strong>');

// Payment pending
html = html.replace('<h3>⏳ Send Payment</h3>', '<h3 data-i18n="sendPayH">⏳ Send Payment</h3>');
html = html.replace('>📋 Copy<', ' data-i18n="copyBtn">📋 Copy<');
html = html.replace("Do not send less — transactions are not refundable.", '<span data-i18n="noLess">Do not send less — transactions are not refundable.</span>');
html = html.replace('>← New Deposit<', ' data-i18n="newDep">← New Deposit<');

// Deposit success
html = html.replace('>Deposit Confirmed!</h3>', ' data-i18n="depConfirmed">Deposit Confirmed!</h3>');
html = html.replace('>Tokens have been added to your account!</p>', ' data-i18n="tokensAdded">Tokens have been added to your account!</p>');
html = html.replace('>Play Now →<', ' data-i18n="playNow">Play Now →<');

// Card tab
html = html.replace('<h3>💳 Card Deposit</h3>', '<h3 data-i18n="cardDepH">💳 Card Deposit</h3>');
html = html.replace(
  '<strong>🔒 Secure payment:</strong> Card data is processed directly by <strong>Stripe</strong> — the world\'s most trusted payment provider. Your card details never touch our servers.',
  '<strong data-i18n="securePayLbl">🔒 Secure payment:</strong> <span data-i18n="securePayDesc">Card data is processed directly by <strong>Stripe</strong> — the world\'s most trusted payment provider. Your card details never touch our servers.</span>'
);
html = html.replace('<label class="label">Deposit Amount (EUR)</label>', '<label class="label" data-i18n="depAmtEur">Deposit Amount (EUR)</label>');
html = html.replace('<label class="label">EUR Amount</label>', '<label class="label" data-i18n="eurAmt">EUR Amount</label>');
html = html.replace('<label class="label">You Receive</label>', '<label class="label" data-i18n="youReceive">You Receive</label>');
html = html.replace('<label class="label">Card Details</label>', '<label class="label" data-i18n="cardDetails">Card Details</label>');
html = html.replace('>Continue to Card Payment →<', ' data-i18n="cardPayBtn">Continue to Card Payment →<');

// Card success
html = html.replace('>Payment Successful!</h3>', ' data-i18n="paySuccess">Payment Successful!</h3>');
html = html.replace('>Tokens have been added to your account.<', ' data-i18n="tokensAdded2">Tokens have been added to your account.<');
html = html.replace('>Make Another Deposit<', ' data-i18n="anotherDep">Make Another Deposit<');

// Withdraw tab
html = html.replace('<h3>Withdraw Tokens</h3>', '<h3 data-i18n="wdH">Withdraw Tokens</h3>');
html = html.replace(
  '<strong>⚠️ Important:</strong> Minimum withdrawal is 5,000 tokens. Withdrawals are processed manually within 24 hours. Make sure your wallet address is correct — crypto transactions are irreversible.',
  '<strong data-i18n="warnLbl">⚠️ Important:</strong> <span data-i18n="wdWarn">Minimum withdrawal is 5,000 tokens. Withdrawals are processed manually within 24 hours. Make sure your wallet address is correct — crypto transactions are irreversible.</span>'
);
html = html.replace('<label class="label">Select Currency</label>', '<label class="label" data-i18n="selCur">Select Currency</label>');
html = html.replace('<label class="label">Token Amount</label>\n      <input class="inp" id="wdTokenInp"', '<label class="label" data-i18n="tokenAmt">Token Amount</label>\n      <input class="inp" id="wdTokenInp"');
html = html.replace('<label class="label">You Receive</label>\n        <input class="inp" id="wdCryptoInp"', '<label class="label" data-i18n="youReceive">You Receive</label>\n        <input class="inp" id="wdCryptoInp"');
html = html.replace('<label class="label">Your Wallet Address</label>', '<label class="label" data-i18n="walletLbl">Your Wallet Address</label>');
html = html.replace('placeholder="Your crypto wallet address"', 'placeholder="Your crypto wallet address" data-i18n-ph="walletPh"');
html = html.replace('>Request Withdrawal →<', ' data-i18n="wdBtn">Request Withdrawal →<');

// History tab
html = html.replace('<h3>Transaction History</h3>', '<h3 data-i18n="histH">Transaction History</h3>');

// ── 2. Add langBar after <body> ───────────────────────────
html = html.replace(
  '<div class="header">',
  '<div id="langBar" style="display:flex;flex-wrap:wrap;gap:4px;padding:6px 16px;background:rgba(0,0,0,.4);border-bottom:1px solid rgba(255,255,255,.05);justify-content:flex-end;"></div>\n<div class="header">'
);

// ── 3. Add multilingual script before </body> ─────────────
const langScript = `
<script>
// ── Language system ───────────────────────────────────────
var LANGS_LIST=[
  {code:'lt',flag:'🇱🇹',name:'LT'},
  {code:'en',flag:'🇬🇧',name:'EN'},
  {code:'ru',flag:'🇷🇺',name:'RU'},
  {code:'de',flag:'🇩🇪',name:'DE'},
  {code:'pl',flag:'🇵🇱',name:'PL'},
  {code:'fr',flag:'🇫🇷',name:'FR'},
  {code:'tr',flag:'🇹🇷',name:'TR'},
  {code:'ar',flag:'🇸🇦',name:'AR'},
  {code:'zh',flag:'🇨🇳',name:'ZH'},
  {code:'hi',flag:'🇮🇳',name:'HI'},
  {code:'uk',flag:'🇺🇦',name:'UK'}
];

var PAGE_LANGS = {
  lt: {
    backBtn:'← Kazino',
    demoBanner:'⚠️ Demo režimas — mokėjimai neaktyvūs. Tikri mokėjimai bus prieinami kai sistema bus paleista.',
    tabCrypto:'⬇️ Kripto',
    tabCard:'💳 Kortelė',
    tabWithdraw:'⬆️ Išimti',
    tabHistory:'📋 Istorija',
    selCur:'Pasirinkite valiutą',
    tokenAmt:'Žetonų kiekis',
    youPay:'Jūs mokate',
    youGet:'Gaunate (žetonai)',
    createDepBtn:'Sukurti depozito adresą →',
    minDep:'Minimalus depozitas:',
    confirmLbl:'Patvirtinimai:',
    confirms:'1 blokas (greitai)',
    credited:'Žetonai įskaitomi:',
    instantly:'Iš karto po patvirtinimo',
    supported:'Palaikoma:',
    sendPayH:'⏳ Siųsti mokėjimą',
    copyBtn:'📋 Kopijuoti',
    noLess:'Nesiųskite mažiau — transakcijos negrąžinamos.',
    newDep:'← Naujas depozitas',
    depConfirmed:'Depozitas patvirtintas!',
    tokensAdded:'Žetonai pridėti prie jūsų paskyros!',
    playNow:'Žaisti →',
    cardDepH:'💳 Depozitas kortele',
    securePayLbl:'🔒 Saugus mokėjimas:',
    securePayDesc:'Kortelės duomenys apdorojami tiesiai per <strong>Stripe</strong> — patikimiausią mokėjimų tiekėją pasaulyje. Jūsų kortelės duomenys nepasiekia mūsų serverių.',
    depAmtEur:'Depozito suma (EUR)',
    eurAmt:'EUR suma',
    youReceive:'Gaunate',
    cardDetails:'Kortelės duomenys',
    cardPayBtn:'Tęsti mokėjimą kortele →',
    paySuccess:'Mokėjimas sėkmingas!',
    tokensAdded2:'Žetonai pridėti prie jūsų paskyros.',
    anotherDep:'Kitas depozitas',
    wdH:'Išimti žetonus',
    warnLbl:'⚠️ Svarbu:',
    wdWarn:'Minimalus išėmimas 5 000 žetonų. Išėmimai vykdomi rankiniu būdu per 24 val. Įsitikinkite, kad piniginės adresas teisingas — kripto transakcijos negrąžinamos.',
    walletLbl:'Jūsų piniginės adresas',
    walletPh:'Jūsų kripto piniginės adresas',
    wdBtn:'Prašyti išėmimo →',
    histH:'Transakcijų istorija',
    noTx:'Transakcijų dar nėra',
    depositWord:'Depozitas',
    withdrawWord:'Išėmimas',
    expiresIn:'⏱ Baigiasi per:',
    waitingPay:'⏳ LAUKIAMA MOKĖJIMO',
    confirming:'🔄 TVIRTINAMA...',
    minAlert:'Minimalus depozitas — 1 000 žetonų',
    minWdAlert:'Minimalus išėmimas — 5 000 žetonų',
    enterAddr:'Įveskite piniginės adresą',
    errConn:'Klaida kuriant depozitą. Bandykite dar kartą.',
  },
  en: {
    backBtn:'← Casino',
    demoBanner:'⚠️ Demo mode — payments are inactive. Live payments will be available once the system goes live.',
    tabCrypto:'⬇️ Crypto',
    tabCard:'💳 Card',
    tabWithdraw:'⬆️ Withdraw',
    tabHistory:'📋 History',
    selCur:'Select Currency',
    tokenAmt:'Token Amount',
    youPay:'You Pay',
    youGet:'You Get (Tokens)',
    createDepBtn:'Create Deposit Address →',
    minDep:'Minimum deposit:',
    confirmLbl:'Confirmations:',
    confirms:'1 block (fast)',
    credited:'Tokens credited:',
    instantly:'Instantly after confirmation',
    supported:'Supported:',
    sendPayH:'⏳ Send Payment',
    copyBtn:'📋 Copy',
    noLess:'Do not send less — transactions are not refundable.',
    newDep:'← New Deposit',
    depConfirmed:'Deposit Confirmed!',
    tokensAdded:'Tokens have been added to your account!',
    playNow:'Play Now →',
    cardDepH:'💳 Card Deposit',
    securePayLbl:'🔒 Secure payment:',
    securePayDesc:'Card data is processed directly by <strong>Stripe</strong> — the world\'s most trusted payment provider. Your card details never touch our servers.',
    depAmtEur:'Deposit Amount (EUR)',
    eurAmt:'EUR Amount',
    youReceive:'You Receive',
    cardDetails:'Card Details',
    cardPayBtn:'Continue to Card Payment →',
    paySuccess:'Payment Successful!',
    tokensAdded2:'Tokens have been added to your account.',
    anotherDep:'Make Another Deposit',
    wdH:'Withdraw Tokens',
    warnLbl:'⚠️ Important:',
    wdWarn:'Minimum withdrawal is 5,000 tokens. Withdrawals are processed manually within 24 hours. Make sure your wallet address is correct — crypto transactions are irreversible.',
    walletLbl:'Your Wallet Address',
    walletPh:'Your crypto wallet address',
    wdBtn:'Request Withdrawal →',
    histH:'Transaction History',
    noTx:'No transactions yet',
    depositWord:'Deposit',
    withdrawWord:'Withdrawal',
    expiresIn:'⏱ Expires in:',
    waitingPay:'⏳ WAITING FOR PAYMENT',
    confirming:'🔄 CONFIRMING...',
    minAlert:'Minimum deposit is 1,000 tokens',
    minWdAlert:'Minimum withdrawal is 5,000 tokens',
    enterAddr:'Enter your wallet address',
    errConn:'Error creating deposit. Try again.',
  },
  ru: {
    backBtn:'← Казино',
    demoBanner:'⚠️ Демо режим — платежи неактивны. Реальные платежи будут доступны после запуска.',
    tabCrypto:'⬇️ Крипто',
    tabCard:'💳 Карта',
    tabWithdraw:'⬆️ Вывод',
    tabHistory:'📋 История',
    selCur:'Выберите валюту',
    tokenAmt:'Количество токенов',
    youPay:'Вы платите',
    youGet:'Вы получаете (токены)',
    createDepBtn:'Создать адрес для депозита →',
    minDep:'Минимальный депозит:',
    confirmLbl:'Подтверждения:',
    confirms:'1 блок (быстро)',
    credited:'Токены зачисляются:',
    instantly:'Сразу после подтверждения',
    supported:'Поддерживается:',
    sendPayH:'⏳ Отправить платёж',
    copyBtn:'📋 Копировать',
    noLess:'Не отправляйте меньше — транзакции невозвратны.',
    newDep:'← Новый депозит',
    depConfirmed:'Депозит подтверждён!',
    tokensAdded:'Токены добавлены на ваш счёт!',
    playNow:'Играть →',
    cardDepH:'💳 Депозит картой',
    securePayLbl:'🔒 Безопасный платёж:',
    securePayDesc:'Данные карты обрабатываются напрямую через <strong>Stripe</strong> — самый надёжный платёжный провайдер в мире. Ваши данные карты никогда не попадают на наши серверы.',
    depAmtEur:'Сумма депозита (EUR)',
    eurAmt:'Сумма EUR',
    youReceive:'Вы получаете',
    cardDetails:'Данные карты',
    cardPayBtn:'Перейти к оплате картой →',
    paySuccess:'Платёж успешен!',
    tokensAdded2:'Токены добавлены на ваш счёт.',
    anotherDep:'Ещё один депозит',
    wdH:'Вывод токенов',
    warnLbl:'⚠️ Важно:',
    wdWarn:'Минимальный вывод 5 000 токенов. Выводы обрабатываются вручную в течение 24 часов. Убедитесь в правильности адреса кошелька — криптотранзакции необратимы.',
    walletLbl:'Адрес вашего кошелька',
    walletPh:'Адрес вашего крипто кошелька',
    wdBtn:'Запросить вывод →',
    histH:'История транзакций',
    noTx:'Транзакций пока нет',
    depositWord:'Депозит',
    withdrawWord:'Вывод',
    expiresIn:'⏱ Истекает через:',
    waitingPay:'⏳ ОЖИДАНИЕ ПЛАТЕЖА',
    confirming:'🔄 ПОДТВЕРЖДЕНИЕ...',
    minAlert:'Минимальный депозит — 1 000 токенов',
    minWdAlert:'Минимальный вывод — 5 000 токенов',
    enterAddr:'Введите адрес кошелька',
    errConn:'Ошибка создания депозита. Попробуйте снова.',
  },
  de: {
    backBtn:'← Casino',
    demoBanner:'⚠️ Demo-Modus — Zahlungen inaktiv. Echte Zahlungen werden nach dem Start verfügbar.',
    tabCrypto:'⬇️ Krypto',
    tabCard:'💳 Karte',
    tabWithdraw:'⬆️ Auszahlung',
    tabHistory:'📋 Verlauf',
    selCur:'Währung wählen',
    tokenAmt:'Token-Betrag',
    youPay:'Sie zahlen',
    youGet:'Sie erhalten (Token)',
    createDepBtn:'Einzahlungsadresse erstellen →',
    minDep:'Mindesteinzahlung:',
    confirmLbl:'Bestätigungen:',
    confirms:'1 Block (schnell)',
    credited:'Token gutgeschrieben:',
    instantly:'Sofort nach Bestätigung',
    supported:'Unterstützt:',
    sendPayH:'⏳ Zahlung senden',
    copyBtn:'📋 Kopieren',
    noLess:'Senden Sie nicht weniger — Transaktionen sind nicht erstattungsfähig.',
    newDep:'← Neue Einzahlung',
    depConfirmed:'Einzahlung bestätigt!',
    tokensAdded:'Token wurden Ihrem Konto gutgeschrieben!',
    playNow:'Jetzt spielen →',
    cardDepH:'💳 Karteneinzahlung',
    securePayLbl:'🔒 Sichere Zahlung:',
    securePayDesc:'Kartendaten werden direkt über <strong>Stripe</strong> verarbeitet — dem weltweit vertrauenswürdigsten Zahlungsanbieter.',
    depAmtEur:'Einzahlungsbetrag (EUR)',
    eurAmt:'EUR-Betrag',
    youReceive:'Sie erhalten',
    cardDetails:'Kartendetails',
    cardPayBtn:'Weiter zur Kartenzahlung →',
    paySuccess:'Zahlung erfolgreich!',
    tokensAdded2:'Token wurden Ihrem Konto gutgeschrieben.',
    anotherDep:'Weitere Einzahlung',
    wdH:'Token auszahlen',
    warnLbl:'⚠️ Wichtig:',
    wdWarn:'Mindestabhebung 5.000 Token. Auszahlungen werden innerhalb von 24 Stunden manuell bearbeitet.',
    walletLbl:'Ihre Wallet-Adresse',
    walletPh:'Ihre Krypto-Wallet-Adresse',
    wdBtn:'Auszahlung beantragen →',
    histH:'Transaktionsverlauf',
    noTx:'Noch keine Transaktionen',
    depositWord:'Einzahlung',
    withdrawWord:'Auszahlung',
    expiresIn:'⏱ Läuft ab in:',
    waitingPay:'⏳ WARTE AUF ZAHLUNG',
    confirming:'🔄 BESTÄTIGUNG...',
    minAlert:'Mindesteinzahlung 1.000 Token',
    minWdAlert:'Mindestabhebung 5.000 Token',
    enterAddr:'Wallet-Adresse eingeben',
    errConn:'Fehler beim Erstellen der Einzahlung. Erneut versuchen.',
  },
  pl: {
    backBtn:'← Kasyno',
    demoBanner:'⚠️ Tryb demo — płatności nieaktywne. Prawdziwe płatności będą dostępne po uruchomieniu.',
    tabCrypto:'⬇️ Krypto',
    tabCard:'💳 Karta',
    tabWithdraw:'⬆️ Wypłata',
    tabHistory:'📋 Historia',
    selCur:'Wybierz walutę',
    tokenAmt:'Ilość żetonów',
    youPay:'Płacisz',
    youGet:'Otrzymujesz (żetony)',
    createDepBtn:'Utwórz adres wpłaty →',
    minDep:'Minimalna wpłata:',
    confirmLbl:'Potwierdzenia:',
    confirms:'1 blok (szybko)',
    credited:'Żetony naliczane:',
    instantly:'Natychmiast po potwierdzeniu',
    supported:'Obsługiwane:',
    sendPayH:'⏳ Wyślij płatność',
    copyBtn:'📋 Kopiuj',
    noLess:'Nie wysyłaj mniej — transakcje są bezzwrotne.',
    newDep:'← Nowa wpłata',
    depConfirmed:'Wpłata potwierdzona!',
    tokensAdded:'Żetony zostały dodane do Twojego konta!',
    playNow:'Graj teraz →',
    cardDepH:'💳 Wpłata kartą',
    securePayLbl:'🔒 Bezpieczna płatność:',
    securePayDesc:'Dane karty są przetwarzane bezpośrednio przez <strong>Stripe</strong> — najbardziej zaufanego dostawcę płatności na świecie.',
    depAmtEur:'Kwota wpłaty (EUR)',
    eurAmt:'Kwota EUR',
    youReceive:'Otrzymujesz',
    cardDetails:'Dane karty',
    cardPayBtn:'Przejdź do płatności kartą →',
    paySuccess:'Płatność zakończona sukcesem!',
    tokensAdded2:'Żetony zostały dodane do Twojego konta.',
    anotherDep:'Kolejna wpłata',
    wdH:'Wypłata żetonów',
    warnLbl:'⚠️ Ważne:',
    wdWarn:'Minimalna wypłata 5 000 żetonów. Wypłaty realizowane ręcznie w ciągu 24 godzin.',
    walletLbl:'Adres Twojego portfela',
    walletPh:'Adres Twojego portfela krypto',
    wdBtn:'Złóż wniosek o wypłatę →',
    histH:'Historia transakcji',
    noTx:'Brak transakcji',
    depositWord:'Wpłata',
    withdrawWord:'Wypłata',
    expiresIn:'⏱ Wygasa za:',
    waitingPay:'⏳ OCZEKIWANIE NA PŁATNOŚĆ',
    confirming:'🔄 POTWIERDZANIE...',
    minAlert:'Minimalna wpłata to 1 000 żetonów',
    minWdAlert:'Minimalna wypłata to 5 000 żetonów',
    enterAddr:'Wprowadź adres portfela',
    errConn:'Błąd tworzenia wpłaty. Spróbuj ponownie.',
  },
  fr: {
    backBtn:'← Casino',
    demoBanner:'⚠️ Mode démo — paiements inactifs. Les paiements réels seront disponibles au lancement.',
    tabCrypto:'⬇️ Crypto',
    tabCard:'💳 Carte',
    tabWithdraw:'⬆️ Retrait',
    tabHistory:'📋 Historique',
    selCur:'Sélectionner la devise',
    tokenAmt:'Montant en jetons',
    youPay:'Vous payez',
    youGet:'Vous recevez (jetons)',
    createDepBtn:'Créer une adresse de dépôt →',
    minDep:'Dépôt minimum :',
    confirmLbl:'Confirmations :',
    confirms:'1 bloc (rapide)',
    credited:'Jetons crédités :',
    instantly:'Immédiatement après confirmation',
    supported:'Supporté :',
    sendPayH:'⏳ Envoyer le paiement',
    copyBtn:'📋 Copier',
    noLess:'N\'envoyez pas moins — les transactions sont non remboursables.',
    newDep:'← Nouveau dépôt',
    depConfirmed:'Dépôt confirmé !',
    tokensAdded:'Les jetons ont été ajoutés à votre compte !',
    playNow:'Jouer maintenant →',
    cardDepH:'💳 Dépôt par carte',
    securePayLbl:'🔒 Paiement sécurisé :',
    securePayDesc:'Les données de carte sont traitées directement par <strong>Stripe</strong> — le fournisseur de paiement le plus fiable au monde.',
    depAmtEur:'Montant du dépôt (EUR)',
    eurAmt:'Montant EUR',
    youReceive:'Vous recevez',
    cardDetails:'Détails de la carte',
    cardPayBtn:'Continuer vers le paiement par carte →',
    paySuccess:'Paiement réussi !',
    tokensAdded2:'Les jetons ont été ajoutés à votre compte.',
    anotherDep:'Autre dépôt',
    wdH:'Retrait de jetons',
    warnLbl:'⚠️ Important :',
    wdWarn:'Retrait minimum 5 000 jetons. Les retraits sont traités manuellement sous 24 heures.',
    walletLbl:'Votre adresse de portefeuille',
    walletPh:'Votre adresse de portefeuille crypto',
    wdBtn:'Demander un retrait →',
    histH:'Historique des transactions',
    noTx:'Aucune transaction pour l\'instant',
    depositWord:'Dépôt',
    withdrawWord:'Retrait',
    expiresIn:'⏱ Expire dans :',
    waitingPay:'⏳ EN ATTENTE DE PAIEMENT',
    confirming:'🔄 CONFIRMATION...',
    minAlert:'Dépôt minimum 1 000 jetons',
    minWdAlert:'Retrait minimum 5 000 jetons',
    enterAddr:'Entrez l\'adresse de votre portefeuille',
    errConn:'Erreur lors de la création du dépôt. Réessayez.',
  },
  tr: {
    backBtn:'← Casino',
    demoBanner:'⚠️ Demo modu — ödemeler devre dışı. Gerçek ödemeler sistem başlatıldığında aktif olacak.',
    tabCrypto:'⬇️ Kripto',
    tabCard:'💳 Kart',
    tabWithdraw:'⬆️ Çekim',
    tabHistory:'📋 Geçmiş',
    selCur:'Para birimi seçin',
    tokenAmt:'Token miktarı',
    youPay:'Ödediğiniz',
    youGet:'Aldığınız (token)',
    createDepBtn:'Yatırım adresi oluştur →',
    minDep:'Minimum yatırım:',
    confirmLbl:'Onaylar:',
    confirms:'1 blok (hızlı)',
    credited:'Token yatırılma:',
    instantly:'Onaydan hemen sonra',
    supported:'Desteklenen:',
    sendPayH:'⏳ Ödeme gönder',
    copyBtn:'📋 Kopyala',
    noLess:'Daha az göndermeyin — işlemler iade edilmez.',
    newDep:'← Yeni yatırım',
    depConfirmed:'Yatırım onaylandı!',
    tokensAdded:'Tokenler hesabınıza eklendi!',
    playNow:'Şimdi oyna →',
    cardDepH:'💳 Kartla yatırım',
    securePayLbl:'🔒 Güvenli ödeme:',
    securePayDesc:'Kart verileri doğrudan <strong>Stripe</strong> üzerinden işlenir — dünyanın en güvenilir ödeme sağlayıcısı.',
    depAmtEur:'Yatırım miktarı (EUR)',
    eurAmt:'EUR miktarı',
    youReceive:'Aldığınız',
    cardDetails:'Kart bilgileri',
    cardPayBtn:'Kart ödemesine devam et →',
    paySuccess:'Ödeme başarılı!',
    tokensAdded2:'Tokenler hesabınıza eklendi.',
    anotherDep:'Başka yatırım',
    wdH:'Token çekimi',
    warnLbl:'⚠️ Önemli:',
    wdWarn:'Minimum çekim 5.000 token. Çekimler 24 saat içinde manuel olarak işlenir.',
    walletLbl:'Cüzdan adresiniz',
    walletPh:'Kripto cüzdan adresiniz',
    wdBtn:'Çekim talep et →',
    histH:'İşlem geçmişi',
    noTx:'Henüz işlem yok',
    depositWord:'Yatırım',
    withdrawWord:'Çekim',
    expiresIn:'⏱ Bitiş:',
    waitingPay:'⏳ ÖDEME BEKLENİYOR',
    confirming:'🔄 ONAYLANIYOR...',
    minAlert:'Minimum yatırım 1.000 token',
    minWdAlert:'Minimum çekim 5.000 token',
    enterAddr:'Cüzdan adresinizi girin',
    errConn:'Yatırım oluşturma hatası. Tekrar deneyin.',
  },
  ar: {
    backBtn:'← الكازينو',
    demoBanner:'⚠️ وضع تجريبي — المدفوعات غير نشطة. ستتوفر المدفوعات الحقيقية عند الإطلاق.',
    tabCrypto:'⬇️ كريبتو',
    tabCard:'💳 بطاقة',
    tabWithdraw:'⬆️ سحب',
    tabHistory:'📋 السجل',
    selCur:'اختر العملة',
    tokenAmt:'كمية الرموز',
    youPay:'تدفع',
    youGet:'تحصل على (رموز)',
    createDepBtn:'إنشاء عنوان إيداع →',
    minDep:'الحد الأدنى للإيداع:',
    confirmLbl:'التأكيدات:',
    confirms:'كتلة واحدة (سريع)',
    credited:'الرموز تُضاف:',
    instantly:'فوراً بعد التأكيد',
    supported:'المدعومة:',
    sendPayH:'⏳ إرسال الدفع',
    copyBtn:'📋 نسخ',
    noLess:'لا ترسل أقل — المعاملات غير قابلة للاسترداد.',
    newDep:'← إيداع جديد',
    depConfirmed:'تم تأكيد الإيداع!',
    tokensAdded:'تمت إضافة الرموز إلى حسابك!',
    playNow:'العب الآن →',
    cardDepH:'💳 إيداع بالبطاقة',
    securePayLbl:'🔒 دفع آمن:',
    securePayDesc:'تتم معالجة بيانات البطاقة مباشرة عبر <strong>Stripe</strong> — أكثر مزودي الدفع موثوقية في العالم.',
    depAmtEur:'مبلغ الإيداع (EUR)',
    eurAmt:'مبلغ EUR',
    youReceive:'تحصل على',
    cardDetails:'تفاصيل البطاقة',
    cardPayBtn:'المتابعة إلى الدفع بالبطاقة →',
    paySuccess:'تمت عملية الدفع بنجاح!',
    tokensAdded2:'تمت إضافة الرموز إلى حسابك.',
    anotherDep:'إيداع آخر',
    wdH:'سحب الرموز',
    warnLbl:'⚠️ مهم:',
    wdWarn:'الحد الأدنى للسحب 5,000 رمز. تتم معالجة السحوبات يدوياً خلال 24 ساعة.',
    walletLbl:'عنوان محفظتك',
    walletPh:'عنوان محفظة الكريبتو',
    wdBtn:'طلب سحب →',
    histH:'سجل المعاملات',
    noTx:'لا توجد معاملات بعد',
    depositWord:'إيداع',
    withdrawWord:'سحب',
    expiresIn:'⏱ ينتهي خلال:',
    waitingPay:'⏳ في انتظار الدفع',
    confirming:'🔄 جارٍ التأكيد...',
    minAlert:'الحد الأدنى للإيداع 1,000 رمز',
    minWdAlert:'الحد الأدنى للسحب 5,000 رمز',
    enterAddr:'أدخل عنوان محفظتك',
    errConn:'خطأ في إنشاء الإيداع. حاول مرة أخرى.',
  },
  zh: {
    backBtn:'← 赌场',
    demoBanner:'⚠️ 演示模式 — 支付未激活。系统上线后将提供真实支付。',
    tabCrypto:'⬇️ 加密货币',
    tabCard:'💳 银行卡',
    tabWithdraw:'⬆️ 提款',
    tabHistory:'📋 历史',
    selCur:'选择货币',
    tokenAmt:'代币数量',
    youPay:'您支付',
    youGet:'您获得（代币）',
    createDepBtn:'创建充值地址 →',
    minDep:'最低存款：',
    confirmLbl:'确认数：',
    confirms:'1个区块（快速）',
    credited:'代币到账：',
    instantly:'确认后立即到账',
    supported:'支持：',
    sendPayH:'⏳ 发送付款',
    copyBtn:'📋 复制',
    noLess:'请勿发送更少金额 — 交易不可退款。',
    newDep:'← 新充值',
    depConfirmed:'充值已确认！',
    tokensAdded:'代币已添加到您的账户！',
    playNow:'立即游戏 →',
    cardDepH:'💳 银行卡充值',
    securePayLbl:'🔒 安全支付：',
    securePayDesc:'卡片数据直接通过 <strong>Stripe</strong> 处理 — 全球最值得信赖的支付提供商。',
    depAmtEur:'充值金额（EUR）',
    eurAmt:'EUR 金额',
    youReceive:'您获得',
    cardDetails:'卡片详情',
    cardPayBtn:'继续银行卡支付 →',
    paySuccess:'支付成功！',
    tokensAdded2:'代币已添加到您的账户。',
    anotherDep:'再次充值',
    wdH:'提取代币',
    warnLbl:'⚠️ 重要：',
    wdWarn:'最低提款5,000代币。提款在24小时内手动处理。',
    walletLbl:'您的钱包地址',
    walletPh:'您的加密货币钱包地址',
    wdBtn:'申请提款 →',
    histH:'交易历史',
    noTx:'暂无交易',
    depositWord:'充值',
    withdrawWord:'提款',
    expiresIn:'⏱ 到期时间：',
    waitingPay:'⏳ 等待付款',
    confirming:'🔄 确认中...',
    minAlert:'最低存款1,000代币',
    minWdAlert:'最低提款5,000代币',
    enterAddr:'输入您的钱包地址',
    errConn:'创建存款时出错，请重试。',
  },
  hi: {
    backBtn:'← कैसीनो',
    demoBanner:'⚠️ डेमो मोड — भुगतान निष्क्रिय। सिस्टम लॉन्च होने पर वास्तविक भुगतान उपलब्ध होगा।',
    tabCrypto:'⬇️ क्रिप्टो',
    tabCard:'💳 कार्ड',
    tabWithdraw:'⬆️ निकासी',
    tabHistory:'📋 इतिहास',
    selCur:'मुद्रा चुनें',
    tokenAmt:'टोकन राशि',
    youPay:'आप भुगतान करते हैं',
    youGet:'आपको मिलता है (टोकन)',
    createDepBtn:'जमा पता बनाएं →',
    minDep:'न्यूनतम जमा:',
    confirmLbl:'पुष्टिकरण:',
    confirms:'1 ब्लॉक (तेज़)',
    credited:'टोकन जमा:',
    instantly:'पुष्टि के तुरंत बाद',
    supported:'समर्थित:',
    sendPayH:'⏳ भुगतान भेजें',
    copyBtn:'📋 कॉपी करें',
    noLess:'कम न भेजें — लेनदेन अपरिवर्तनीय हैं।',
    newDep:'← नई जमा',
    depConfirmed:'जमा की पुष्टि हो गई!',
    tokensAdded:'आपके खाते में टोकन जोड़े गए!',
    playNow:'अभी खेलें →',
    cardDepH:'💳 कार्ड से जमा',
    securePayLbl:'🔒 सुरक्षित भुगतान:',
    securePayDesc:'कार्ड डेटा सीधे <strong>Stripe</strong> द्वारा संसाधित किया जाता है।',
    depAmtEur:'जमा राशि (EUR)',
    eurAmt:'EUR राशि',
    youReceive:'आपको मिलता है',
    cardDetails:'कार्ड विवरण',
    cardPayBtn:'कार्ड भुगतान पर जारी रखें →',
    paySuccess:'भुगतान सफल!',
    tokensAdded2:'आपके खाते में टोकन जोड़े गए।',
    anotherDep:'एक और जमा',
    wdH:'टोकन निकालें',
    warnLbl:'⚠️ महत्वपूर्ण:',
    wdWarn:'न्यूनतम निकासी 5,000 टोकन। निकासी 24 घंटे में मैन्युअल रूप से प्रोसेस होती है।',
    walletLbl:'आपका वॉलेट पता',
    walletPh:'आपका क्रिप्टो वॉलेट पता',
    wdBtn:'निकासी का अनुरोध करें →',
    histH:'लेनदेन इतिहास',
    noTx:'अभी तक कोई लेनदेन नहीं',
    depositWord:'जमा',
    withdrawWord:'निकासी',
    expiresIn:'⏱ समाप्ति:',
    waitingPay:'⏳ भुगतान की प्रतीक्षा',
    confirming:'🔄 पुष्टि हो रही है...',
    minAlert:'न्यूनतम जमा 1,000 टोकन',
    minWdAlert:'न्यूनतम निकासी 5,000 टोकन',
    enterAddr:'अपना वॉलेट पता दर्ज करें',
    errConn:'जमा बनाने में त्रुटि। पुनः प्रयास करें।',
  },
  uk: {
    backBtn:'← Казино',
    demoBanner:'⚠️ Демо режим — платежі неактивні. Реальні платежі будуть доступні після запуску.',
    tabCrypto:'⬇️ Крипто',
    tabCard:'💳 Картка',
    tabWithdraw:'⬆️ Виведення',
    tabHistory:'📋 Історія',
    selCur:'Оберіть валюту',
    tokenAmt:'Кількість токенів',
    youPay:'Ви платите',
    youGet:'Ви отримуєте (токени)',
    createDepBtn:'Створити адресу для депозиту →',
    minDep:'Мінімальний депозит:',
    confirmLbl:'Підтвердження:',
    confirms:'1 блок (швидко)',
    credited:'Токени зараховуються:',
    instantly:'Відразу після підтвердження',
    supported:'Підтримується:',
    sendPayH:'⏳ Надіслати платіж',
    copyBtn:'📋 Копіювати',
    noLess:'Не надсилайте менше — транзакції неповоротні.',
    newDep:'← Новий депозит',
    depConfirmed:'Депозит підтверджено!',
    tokensAdded:'Токени додано до вашого рахунку!',
    playNow:'Грати зараз →',
    cardDepH:'💳 Депозит карткою',
    securePayLbl:'🔒 Безпечний платіж:',
    securePayDesc:'Дані картки обробляються безпосередньо через <strong>Stripe</strong> — найнадійнішого платіжного провайдера.',
    depAmtEur:'Сума депозиту (EUR)',
    eurAmt:'Сума EUR',
    youReceive:'Ви отримуєте',
    cardDetails:'Деталі картки',
    cardPayBtn:'Перейти до оплати карткою →',
    paySuccess:'Платіж успішний!',
    tokensAdded2:'Токени додано до вашого рахунку.',
    anotherDep:'Ще один депозит',
    wdH:'Виведення токенів',
    warnLbl:'⚠️ Важливо:',
    wdWarn:'Мінімальне виведення 5 000 токенів. Виведення обробляються вручну протягом 24 годин.',
    walletLbl:'Адреса вашого гаманця',
    walletPh:'Адреса вашого крипто гаманця',
    wdBtn:'Запросити виведення →',
    histH:'Історія транзакцій',
    noTx:'Транзакцій поки немає',
    depositWord:'Депозит',
    withdrawWord:'Виведення',
    expiresIn:'⏱ Закінчується через:',
    waitingPay:'⏳ ОЧІКУВАННЯ ПЛАТЕЖУ',
    confirming:'🔄 ПІДТВЕРДЖЕННЯ...',
    minAlert:'Мінімальний депозит — 1 000 токенів',
    minWdAlert:'Мінімальне виведення — 5 000 токенів',
    enterAddr:'Введіть адресу гаманця',
    errConn:'Помилка створення депозиту. Спробуйте знову.',
  },
};

var _lc = localStorage.getItem('hrc_lang') || 'lt';

function _t(k){ return (PAGE_LANGS[_lc]||PAGE_LANGS.lt)[k] || PAGE_LANGS.lt[k] || k; }

function applyLang(code) {
  _lc = code;
  localStorage.setItem('hrc_lang', code);
  var t = PAGE_LANGS[code] || PAGE_LANGS.lt;
  document.querySelectorAll('[data-i18n]').forEach(function(el){
    var k = el.getAttribute('data-i18n');
    if(t[k] !== undefined) el.textContent = t[k];
  });
  document.querySelectorAll('[data-i18n-html]').forEach(function(el){
    var k = el.getAttribute('data-i18n-html');
    if(t[k] !== undefined) el.innerHTML = t[k];
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(function(el){
    var k = el.getAttribute('data-i18n-ph');
    if(t[k] !== undefined) el.placeholder = t[k];
  });
  document.documentElement.lang = code;
  document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('#langBar .lang-btn').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-lang') === code);
  });
}

document.addEventListener('DOMContentLoaded', function(){
  var bar = document.getElementById('langBar');
  if(bar){
    LANGS_LIST.forEach(function(l){
      var b = document.createElement('button');
      b.className = 'lang-btn';
      b.setAttribute('data-lang', l.code);
      b.textContent = l.flag + ' ' + l.name;
      b.onclick = function(){ applyLang(l.code); };
      b.style.cssText = 'padding:3px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(232,224,208,.5);font-size:11px;cursor:pointer;font-family:Space Grotesk,sans-serif;transition:all .2s;';
      bar.appendChild(b);
    });
  }
  applyLang(_lc);
});
<\/script>`;

html = html.replace(
  '<script>if("serviceWorker"in navigator)',
  langScript + '\n<script>if("serviceWorker"in navigator)'
);

// ── 4. Patch JS alert/textContent strings to use _t() ────
// These strings are set dynamically in JS — replace hardcoded EN strings
html = html
  .replace("alert('Minimum deposit is €5')", "alert('Minimum deposit is €5')")  // keep Stripe alerts as is
  .replace("'⏳ WAITING FOR PAYMENT'", "_t('waitingPay')")
  .replace("'🔄 CONFIRMING...'",        "_t('confirming')")
  .replace("'Loading...'",              "_t('noTx') || 'Loading...'")
  .replace("'No transactions yet'",     "_t('noTx')")
  .replace("'Deposit'",                 "_t('depositWord')")
  .replace("'Withdrawal'",              "_t('withdrawWord')")
  .replace("'⏱ Expires in: '",         "_t('expiresIn') + ' '")
  .replace("alert('Minimum deposit is 1,000 tokens')", "alert(_t('minAlert'))")
  .replace("alert('Minimum withdrawal is 5,000 tokens')", "alert(_t('minWdAlert'))")
  .replace("alert('Enter your wallet address')", "alert(_t('enterAddr'))")
  .replace("alert('Error creating deposit. Try again.')", "alert(_t('errConn'))")
  .replace("'Preparing...'",  "'Preparing...'")  // keep button states as short text
  .replace("btn.textContent = 'Create Deposit Address →'", "btn.textContent = _t('createDepBtn')")
  .replace("btn.textContent = 'Creating...'", "btn.textContent = '...'");

fs.writeFileSync(FILE, html, 'utf8');
console.log('✅ cashier.html — multilingual system added (11 languages, LT default)');
