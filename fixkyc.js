const fs = require('fs');
const P = 'C:/Users/PC/casino/public';

const LANG_BAR_CSS = `
.lang-wrap{display:flex;align-items:center;}
.lang-bar{display:flex;gap:3px;flex-wrap:wrap;justify-content:flex-end;}
.lang-btn{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
  color:rgba(232,224,208,.5);border-radius:6px;padding:3px 7px;font-size:10px;
  cursor:pointer;transition:all .15s;font-family:inherit;white-space:nowrap;}
.lang-btn:hover{background:rgba(255,255,255,.1);color:#e8e0d0;}
.lang-btn.active{background:rgba(201,168,76,.15);border-color:rgba(201,168,76,.4);color:#f0c060;}`;

const LANGS_LIST_STR = `var LANGS_LIST=[
  {code:'en',flag:'🇬🇧',name:'EN'},{code:'lt',flag:'🇱🇹',name:'LT'},
  {code:'ru',flag:'🇷🇺',name:'RU'},{code:'de',flag:'🇩🇪',name:'DE'},
  {code:'pl',flag:'🇵🇱',name:'PL'},{code:'fr',flag:'🇫🇷',name:'FR'},
  {code:'tr',flag:'🇹🇷',name:'TR'},{code:'ar',flag:'🇸🇦',name:'AR'},
  {code:'zh',flag:'🇨🇳',name:'ZH'},{code:'hi',flag:'🇮🇳',name:'HI'},
  {code:'uk',flag:'🇺🇦',name:'UK'}
];`;

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

const KYC_LANGS = {
en:{back:'← Back to Casino',badge:'🛡️ KYC — IDENTITY VERIFICATION',h1:'Account Verification',
  heroDesc:'According to gambling regulations, all players must verify their identity and age before playing. This ensures only adults use the casino.',
  step1lbl:'PERSONAL INFO',step2lbl:'DOCUMENTS',step3lbl:'CONFIRMATION',
  card1h:'1. Personal Information',fullNameLbl:'Full Name *',fullNamePh:'John Smith',
  birthDateLbl:'Date of Birth *',countryLbl:'Country *',countryDefault:'— Select —',
  idTypeLbl:'Document Type *',idPassport:'Passport',idCard:'Identity Card',idDrivers:'Driver\'s License',idResidence:'Residence Permit',
  importantNote:'<strong>ℹ️ Important:</strong> Name must exactly match your documents. Age is automatically verified — only <strong>18+</strong> allowed.',
  nextBtn:'Continue →',
  card2h:'2. Document Upload',uploadInstr:'Upload clear, uncrumpled photos. Documents must be valid and not expired.',
  idFrontLbl:'Document Front Side <span class="required-badge">REQUIRED</span>',
  idFrontTitle:'Front side',idFrontSub:'JPG, PNG or PDF · max 8 MB',
  idBackLbl:'Document Back Side <span class="optional-badge">RECOMMENDED</span>',
  idBackTitle:'Back side',idBackSub:'JPG, PNG or PDF · max 8 MB',
  selfieLbl:'Selfie with Document <span class="required-badge">REQUIRED</span>',
  selfieTitle:'Photo holding the document',selfieSub:'Hold document with visible details · JPG or PNG · max 8 MB',
  acceptedDocs:'<strong>✅ Accepted documents:</strong>',
  doc1:'Passport (all countries)',doc2:'Identity card (EU countries)',doc3:'Driver\'s license (with photo)',doc4:'Residence permit',
  backBtn:'← Back',reviewBtn:'Review →',
  card3h:'3. Review & Submit',
  dataNote:'<strong>🔒 Data protection:</strong> Your documents are stored encrypted and used only for age and identity verification. Data is not shared with third parties.',
  submitBtn:'Submit Documents ✓',
  noUidTitle:'Session not found',noUidDesc:'Please log in to the casino first, then return here.',noUidBtn:'← Go to Casino',
  statusApprovedTitle:'Account Verified!',statusApprovedDesc:'Your identity has been successfully verified. You can play all casino games. Good luck!',
  statusPendingTitle:'Awaiting Review',statusPendingDesc:'Your documents have been submitted and are being reviewed. This usually takes 1–24 hours. You will be notified once confirmed.',
  statusRejectedTitle:'Documents Rejected',statusRejectedDesc:'We\'re sorry, your documents were not accepted. You may submit new documents.',
  rejectionPrefix:'📋 Reason: ',
  errName:'Enter your full name',errDob:'Select your date of birth',errCountry:'Select your country',
  errAge:'⛔ You must be at least 18 years old. Casino services are not available under 18.',
  errDobInvalid:'Invalid date of birth',errFront:'Front side of document is required',errSelfie:'Selfie with document is required',
  errRetry:'An error occurred. Please try again.',errNetwork:'Connection error. Check your internet and try again.',
  sendingLabel:'Sending...',
  revFullName:'Full name',revDob:'Date of birth',revCountry:'Country',revIdType:'Document type',revDocs:'Documents',revYears:'yr',
  revFront:'✓ Front',revBack:'✓ Back',revSelfie:'✓ Selfie'},
lt:{back:'← Grįžti į Kazino',badge:'🛡️ KYC — TAPATYBĖS PATIKRINIMAS',h1:'Paskyros Patvirtinimas',
  heroDesc:'Pagal Lietuvos azartinių lošimų įstatymą, visi žaidėjai privalo patvirtinti savo tapatybę ir amžių prieš pradėdami žaisti. Tai užtikrina, kad kazino naudotų tik pilnamečiai asmenys.',
  step1lbl:'ASMENINĖ INFO',step2lbl:'DOKUMENTAI',step3lbl:'PATVIRTINIMAS',
  card1h:'1. Asmeninė Informacija',fullNameLbl:'Vardas ir Pavardė *',fullNamePh:'Vardenis Pavardenis',
  birthDateLbl:'Gimimo Data *',countryLbl:'Šalis *',countryDefault:'— Pasirinkite —',
  idTypeLbl:'Dokumento Tipas *',idPassport:'Pasas',idCard:'Asmens tapatybės kortelė',idDrivers:'Vairuotojo pažymėjimas',idResidence:'Leidimas gyventi',
  importantNote:'<strong>ℹ️ Svarbu:</strong> Vardas ir pavardė turi tiksliai sutapti su dokumentuose nurodytais. Amžius bus automatiškai patikrintas — žaisti leidžiama tik nuo <strong>18 metų</strong>.',
  nextBtn:'Tęsti →',
  card2h:'2. Dokumentų Įkėlimas',uploadInstr:'Įkelkite aiškias, nesuglamžytas nuotraukas. Dokumentai turi būti galiojantys ir nesibaigiančiu terminu.',
  idFrontLbl:'Dokumento Priekinė Pusė <span class="required-badge">PRIVALOMA</span>',
  idFrontTitle:'Priekinė pusė',idFrontSub:'JPG, PNG arba PDF · maks. 8 MB',
  idBackLbl:'Dokumento Galinė Pusė <span class="optional-badge">REKOMENDUOJAMA</span>',
  idBackTitle:'Galinė pusė',idBackSub:'JPG, PNG arba PDF · maks. 8 MB',
  selfieLbl:'Selfie su Dokumentu <span class="required-badge">PRIVALOMA</span>',
  selfieTitle:'Nuotrauka su dokumentu rankose',selfieSub:'Laikykite dokumentą matomomis detalėmis · JPG arba PNG · maks. 8 MB',
  acceptedDocs:'<strong>✅ Priimami dokumentai:</strong>',
  doc1:'Pasas (visos šalys)',doc2:'Asmens tapatybės kortelė (ES šalys)',doc3:'Vairuotojo pažymėjimas (su nuotrauka)',doc4:'Leidimas gyventi',
  backBtn:'← Atgal',reviewBtn:'Peržiūrėti →',
  card3h:'3. Peržiūra ir Pateikimas',
  dataNote:'<strong>🔒 Duomenų apsauga:</strong> Jūsų dokumentai saugomi užšifruoti ir naudojami tik amžiaus bei tapatybės patikrinimui. Duomenys neperduodami trečiosioms šalims.',
  submitBtn:'Pateikti Dokumentus ✓',
  noUidTitle:'Sesija nerasta',noUidDesc:'Pirmiausia prisijunkite prie kazino, tada grįžkite čia.',noUidBtn:'← Eiti į Kazino',
  statusApprovedTitle:'Paskyra Patvirtinta!',statusApprovedDesc:'Jūsų tapatybė sėkmingai patvirtinta. Galite žaisti visus kazino žaidimus. Linkime sėkmės!',
  statusPendingTitle:'Laukiama Peržiūros',statusPendingDesc:'Jūsų dokumentai pateikti ir yra tikrinami. Tai paprastai užtrunka 1–24 valandas.',
  statusRejectedTitle:'Dokumentai Atmesti',statusRejectedDesc:'Apgailestaujame, jūsų dokumentai nebuvo priimti. Galite pateikti naujus dokumentus.',
  rejectionPrefix:'📋 Priežastis: ',
  errName:'Įveskite vardą ir pavardę',errDob:'Pasirinkite gimimo datą',errCountry:'Pasirinkite šalį',
  errAge:'⛔ Jums turi būti bent 18 metų. Iki 18 metų kazino paslaugos neteikiamos.',
  errDobInvalid:'Neteisinga gimimo data',errFront:'Privaloma įkelti dokumento priekinę pusę',errSelfie:'Privaloma įkelti selfie su dokumentu',
  errRetry:'Įvyko klaida. Bandykite dar kartą.',errNetwork:'Ryšio klaida. Patikrinkite internetą ir bandykite dar kartą.',
  sendingLabel:'Siunčiama...',
  revFullName:'Vardas ir pavardė',revDob:'Gimimo data',revCountry:'Šalis',revIdType:'Dokumento tipas',revDocs:'Dokumentai',revYears:'m.',
  revFront:'✓ Priekinė pusė',revBack:'✓ Galinė pusė',revSelfie:'✓ Selfie'},
ru:{back:'← Назад в казино',badge:'🛡️ KYC — ВЕРИФИКАЦИЯ ЛИЧНОСТИ',h1:'Подтверждение аккаунта',
  heroDesc:'Согласно правилам азартных игр, все игроки обязаны подтвердить свою личность и возраст перед началом игры.',
  step1lbl:'ЛИЧНЫЕ ДАННЫЕ',step2lbl:'ДОКУМЕНТЫ',step3lbl:'ПОДТВЕРЖДЕНИЕ',
  card1h:'1. Личная информация',fullNameLbl:'Полное имя *',fullNamePh:'Иван Иванов',
  birthDateLbl:'Дата рождения *',countryLbl:'Страна *',countryDefault:'— Выберите —',
  idTypeLbl:'Тип документа *',idPassport:'Паспорт',idCard:'Удостоверение личности',idDrivers:'Водительское удостоверение',idResidence:'Вид на жительство',
  importantNote:'<strong>ℹ️ Важно:</strong> Имя должно точно совпадать с документами. Возраст проверяется автоматически — допускаются только <strong>18+</strong>.',
  nextBtn:'Продолжить →',
  card2h:'2. Загрузка документов',uploadInstr:'Загрузите чёткие, несмятые фотографии. Документы должны быть действительными.',
  idFrontLbl:'Лицевая сторона документа <span class="required-badge">ОБЯЗАТЕЛЬНО</span>',
  idFrontTitle:'Лицевая сторона',idFrontSub:'JPG, PNG или PDF · макс. 8 МБ',
  idBackLbl:'Обратная сторона документа <span class="optional-badge">РЕКОМЕНДУЕТСЯ</span>',
  idBackTitle:'Обратная сторона',idBackSub:'JPG, PNG или PDF · макс. 8 МБ',
  selfieLbl:'Селфи с документом <span class="required-badge">ОБЯЗАТЕЛЬНО</span>',
  selfieTitle:'Фото с документом в руках',selfieSub:'Держите документ с видимыми деталями · JPG или PNG · макс. 8 МБ',
  acceptedDocs:'<strong>✅ Принимаемые документы:</strong>',
  doc1:'Паспорт (все страны)',doc2:'Удостоверение личности (страны ЕС)',doc3:'Водительское удостоверение (с фото)',doc4:'Вид на жительство',
  backBtn:'← Назад',reviewBtn:'Просмотр →',
  card3h:'3. Просмотр и отправка',
  dataNote:'<strong>🔒 Защита данных:</strong> Ваши документы хранятся в зашифрованном виде и используются только для проверки возраста и личности.',
  submitBtn:'Отправить документы ✓',
  noUidTitle:'Сессия не найдена',noUidDesc:'Сначала войдите в казино, затем вернитесь сюда.',noUidBtn:'← В казино',
  statusApprovedTitle:'Аккаунт подтверждён!',statusApprovedDesc:'Ваша личность успешно подтверждена. Вы можете играть во все игры казино. Удачи!',
  statusPendingTitle:'Ожидает проверки',statusPendingDesc:'Ваши документы отправлены и проверяются. Обычно это занимает 1–24 часа.',
  statusRejectedTitle:'Документы отклонены',statusRejectedDesc:'К сожалению, ваши документы не были приняты. Вы можете подать новые документы.',
  rejectionPrefix:'📋 Причина: ',
  errName:'Введите полное имя',errDob:'Выберите дату рождения',errCountry:'Выберите страну',
  errAge:'⛔ Вам должно быть не менее 18 лет.',errDobInvalid:'Неверная дата рождения',
  errFront:'Необходимо загрузить лицевую сторону документа',errSelfie:'Необходимо загрузить селфи с документом',
  errRetry:'Произошла ошибка. Попробуйте ещё раз.',errNetwork:'Ошибка соединения. Проверьте интернет.',
  sendingLabel:'Отправка...',
  revFullName:'Полное имя',revDob:'Дата рождения',revCountry:'Страна',revIdType:'Тип документа',revDocs:'Документы',revYears:'лет',
  revFront:'✓ Лицевая',revBack:'✓ Обратная',revSelfie:'✓ Селфи'},
de:{back:'← Zurück zum Casino',badge:'🛡️ KYC — IDENTITÄTSVERIFIZIERUNG',h1:'Kontoverifizierung',
  heroDesc:'Gemäß den Glücksspielvorschriften müssen alle Spieler ihre Identität und ihr Alter bestätigen.',
  step1lbl:'PERSÖNLICHES',step2lbl:'DOKUMENTE',step3lbl:'BESTÄTIGUNG',
  card1h:'1. Persönliche Informationen',fullNameLbl:'Vollständiger Name *',fullNamePh:'Max Mustermann',
  birthDateLbl:'Geburtsdatum *',countryLbl:'Land *',countryDefault:'— Auswählen —',
  idTypeLbl:'Dokumenttyp *',idPassport:'Reisepass',idCard:'Personalausweis',idDrivers:'Führerschein',idResidence:'Aufenthaltserlaubnis',
  importantNote:'<strong>ℹ️ Wichtig:</strong> Der Name muss genau mit Ihren Dokumenten übereinstimmen. Nur <strong>18+</strong> zugelassen.',
  nextBtn:'Weiter →',
  card2h:'2. Dokument-Upload',uploadInstr:'Laden Sie klare, ungeknitterte Fotos hoch. Dokumente müssen gültig sein.',
  idFrontLbl:'Vorderseite des Dokuments <span class="required-badge">PFLICHT</span>',
  idFrontTitle:'Vorderseite',idFrontSub:'JPG, PNG oder PDF · max. 8 MB',
  idBackLbl:'Rückseite des Dokuments <span class="optional-badge">EMPFOHLEN</span>',
  idBackTitle:'Rückseite',idBackSub:'JPG, PNG oder PDF · max. 8 MB',
  selfieLbl:'Selfie mit Dokument <span class="required-badge">PFLICHT</span>',
  selfieTitle:'Foto mit Dokument in der Hand',selfieSub:'Halten Sie das Dokument mit sichtbaren Details · JPG oder PNG · max. 8 MB',
  acceptedDocs:'<strong>✅ Akzeptierte Dokumente:</strong>',
  doc1:'Reisepass (alle Länder)',doc2:'Personalausweis (EU-Länder)',doc3:'Führerschein (mit Foto)',doc4:'Aufenthaltserlaubnis',
  backBtn:'← Zurück',reviewBtn:'Überprüfen →',
  card3h:'3. Überprüfung und Einreichung',
  dataNote:'<strong>🔒 Datenschutz:</strong> Ihre Dokumente werden verschlüsselt gespeichert und nur zur Alters- und Identitätsprüfung verwendet.',
  submitBtn:'Dokumente einreichen ✓',
  noUidTitle:'Sitzung nicht gefunden',noUidDesc:'Bitte melden Sie sich zuerst im Casino an.',noUidBtn:'← Zum Casino',
  statusApprovedTitle:'Konto verifiziert!',statusApprovedDesc:'Ihre Identität wurde erfolgreich verifiziert. Viel Glück!',
  statusPendingTitle:'Warte auf Überprüfung',statusPendingDesc:'Ihre Dokumente wurden eingereicht und werden geprüft. Dauert 1–24 Stunden.',
  statusRejectedTitle:'Dokumente abgelehnt',statusRejectedDesc:'Leider wurden Ihre Dokumente nicht akzeptiert. Sie können neue Dokumente einreichen.',
  rejectionPrefix:'📋 Grund: ',
  errName:'Vollständigen Namen eingeben',errDob:'Geburtsdatum auswählen',errCountry:'Land auswählen',
  errAge:'⛔ Sie müssen mindestens 18 Jahre alt sein.',errDobInvalid:'Ungültiges Geburtsdatum',
  errFront:'Vorderseite des Dokuments erforderlich',errSelfie:'Selfie mit Dokument erforderlich',
  errRetry:'Ein Fehler ist aufgetreten. Bitte erneut versuchen.',errNetwork:'Verbindungsfehler. Bitte Internet prüfen.',
  sendingLabel:'Wird gesendet...',
  revFullName:'Vollständiger Name',revDob:'Geburtsdatum',revCountry:'Land',revIdType:'Dokumenttyp',revDocs:'Dokumente',revYears:'J.',
  revFront:'✓ Vorderseite',revBack:'✓ Rückseite',revSelfie:'✓ Selfie'},
pl:{back:'← Wróć do kasyna',badge:'🛡️ KYC — WERYFIKACJA TOŻSAMOŚCI',h1:'Weryfikacja konta',
  heroDesc:'Zgodnie z przepisami dotyczącymi hazardu, wszyscy gracze muszą potwierdzić swoją tożsamość i wiek.',
  step1lbl:'DANE OSOBOWE',step2lbl:'DOKUMENTY',step3lbl:'POTWIERDZENIE',
  card1h:'1. Informacje osobiste',fullNameLbl:'Imię i nazwisko *',fullNamePh:'Jan Kowalski',
  birthDateLbl:'Data urodzenia *',countryLbl:'Kraj *',countryDefault:'— Wybierz —',
  idTypeLbl:'Typ dokumentu *',idPassport:'Paszport',idCard:'Dowód osobisty',idDrivers:'Prawo jazdy',idResidence:'Zezwolenie na pobyt',
  importantNote:'<strong>ℹ️ Ważne:</strong> Imię i nazwisko muszą dokładnie zgadzać się z dokumentami. Dozwolone tylko <strong>18+</strong>.',
  nextBtn:'Kontynuuj →',
  card2h:'2. Przesyłanie dokumentów',uploadInstr:'Prześlij wyraźne, niezmięte zdjęcia. Dokumenty muszą być ważne.',
  idFrontLbl:'Przód dokumentu <span class="required-badge">WYMAGANE</span>',
  idFrontTitle:'Przód',idFrontSub:'JPG, PNG lub PDF · maks. 8 MB',
  idBackLbl:'Tył dokumentu <span class="optional-badge">ZALECANE</span>',
  idBackTitle:'Tył',idBackSub:'JPG, PNG lub PDF · maks. 8 MB',
  selfieLbl:'Selfie z dokumentem <span class="required-badge">WYMAGANE</span>',
  selfieTitle:'Zdjęcie trzymając dokument',selfieSub:'Trzymaj dokument z widocznymi szczegółami · JPG lub PNG · maks. 8 MB',
  acceptedDocs:'<strong>✅ Akceptowane dokumenty:</strong>',
  doc1:'Paszport (wszystkie kraje)',doc2:'Dowód osobisty (kraje UE)',doc3:'Prawo jazdy (ze zdjęciem)',doc4:'Zezwolenie na pobyt',
  backBtn:'← Wstecz',reviewBtn:'Przegląd →',
  card3h:'3. Przegląd i wysyłanie',
  dataNote:'<strong>🔒 Ochrona danych:</strong> Twoje dokumenty są przechowywane w zaszyfrowanej formie i używane tylko do weryfikacji.',
  submitBtn:'Wyślij dokumenty ✓',
  noUidTitle:'Sesja nie znaleziona',noUidDesc:'Najpierw zaloguj się do kasyna.',noUidBtn:'← Do kasyna',
  statusApprovedTitle:'Konto zweryfikowane!',statusApprovedDesc:'Twoja tożsamość została pomyślnie zweryfikowana. Powodzenia!',
  statusPendingTitle:'Oczekuje na weryfikację',statusPendingDesc:'Twoje dokumenty zostały przesłane i są weryfikowane. Zwykle trwa 1–24 godziny.',
  statusRejectedTitle:'Dokumenty odrzucone',statusRejectedDesc:'Niestety Twoje dokumenty nie zostały przyjęte. Możesz przesłać nowe.',
  rejectionPrefix:'📋 Powód: ',
  errName:'Podaj imię i nazwisko',errDob:'Wybierz datę urodzenia',errCountry:'Wybierz kraj',
  errAge:'⛔ Musisz mieć co najmniej 18 lat.',errDobInvalid:'Nieprawidłowa data urodzenia',
  errFront:'Przód dokumentu jest wymagany',errSelfie:'Selfie z dokumentem jest wymagane',
  errRetry:'Wystąpił błąd. Spróbuj ponownie.',errNetwork:'Błąd połączenia. Sprawdź internet.',
  sendingLabel:'Wysyłanie...',
  revFullName:'Imię i nazwisko',revDob:'Data urodzenia',revCountry:'Kraj',revIdType:'Typ dokumentu',revDocs:'Dokumenty',revYears:'l.',
  revFront:'✓ Przód',revBack:'✓ Tył',revSelfie:'✓ Selfie'},
fr:{back:'← Retour au casino',badge:'🛡️ KYC — VÉRIFICATION D\'IDENTITÉ',h1:'Vérification du compte',
  heroDesc:'Conformément aux réglementations sur les jeux d\'argent, tous les joueurs doivent confirmer leur identité et leur âge.',
  step1lbl:'INFO PERSONNELLE',step2lbl:'DOCUMENTS',step3lbl:'CONFIRMATION',
  card1h:'1. Informations personnelles',fullNameLbl:'Nom complet *',fullNamePh:'Jean Dupont',
  birthDateLbl:'Date de naissance *',countryLbl:'Pays *',countryDefault:'— Sélectionner —',
  idTypeLbl:'Type de document *',idPassport:'Passeport',idCard:'Carte d\'identité',idDrivers:'Permis de conduire',idResidence:'Titre de séjour',
  importantNote:'<strong>ℹ️ Important:</strong> Le nom doit correspondre exactement aux documents. Seulement <strong>18+</strong> autorisé.',
  nextBtn:'Continuer →',
  card2h:'2. Téléchargement de documents',uploadInstr:'Téléchargez des photos nettes et non froissées. Les documents doivent être valides.',
  idFrontLbl:'Recto du document <span class="required-badge">REQUIS</span>',
  idFrontTitle:'Recto',idFrontSub:'JPG, PNG ou PDF · max 8 Mo',
  idBackLbl:'Verso du document <span class="optional-badge">RECOMMANDÉ</span>',
  idBackTitle:'Verso',idBackSub:'JPG, PNG ou PDF · max 8 Mo',
  selfieLbl:'Selfie avec document <span class="required-badge">REQUIS</span>',
  selfieTitle:'Photo tenant le document',selfieSub:'Tenez le document avec détails visibles · JPG ou PNG · max 8 Mo',
  acceptedDocs:'<strong>✅ Documents acceptés:</strong>',
  doc1:'Passeport (tous pays)',doc2:'Carte d\'identité (pays UE)',doc3:'Permis de conduire (avec photo)',doc4:'Titre de séjour',
  backBtn:'← Retour',reviewBtn:'Vérifier →',
  card3h:'3. Vérification et envoi',
  dataNote:'<strong>🔒 Protection des données:</strong> Vos documents sont stockés chiffrés et utilisés uniquement pour la vérification.',
  submitBtn:'Soumettre les documents ✓',
  noUidTitle:'Session non trouvée',noUidDesc:'Connectez-vous d\'abord au casino.',noUidBtn:'← Au casino',
  statusApprovedTitle:'Compte vérifié!',statusApprovedDesc:'Votre identité a été vérifiée avec succès. Bonne chance!',
  statusPendingTitle:'En attente de vérification',statusPendingDesc:'Vos documents ont été soumis et sont en cours de vérification. Prend 1–24 heures.',
  statusRejectedTitle:'Documents refusés',statusRejectedDesc:'Désolé, vos documents n\'ont pas été acceptés. Vous pouvez en soumettre de nouveaux.',
  rejectionPrefix:'📋 Raison: ',
  errName:'Entrez le nom complet',errDob:'Sélectionnez la date de naissance',errCountry:'Sélectionnez le pays',
  errAge:'⛔ Vous devez avoir au moins 18 ans.',errDobInvalid:'Date de naissance invalide',
  errFront:'Le recto du document est requis',errSelfie:'Le selfie avec document est requis',
  errRetry:'Une erreur s\'est produite. Veuillez réessayer.',errNetwork:'Erreur de connexion.',
  sendingLabel:'Envoi...',
  revFullName:'Nom complet',revDob:'Date de naissance',revCountry:'Pays',revIdType:'Type de document',revDocs:'Documents',revYears:'ans',
  revFront:'✓ Recto',revBack:'✓ Verso',revSelfie:'✓ Selfie'},
tr:{back:'← Casinoya geri dön',badge:'🛡️ KYC — KİMLİK DOĞRULAMA',h1:'Hesap Doğrulama',
  heroDesc:'Kumar düzenlemelerine göre, tüm oyuncuların oynamadan önce kimliklerini ve yaşlarını doğrulaması gerekmektedir.',
  step1lbl:'KİŞİSEL BİLGİ',step2lbl:'BELGELER',step3lbl:'ONAY',
  card1h:'1. Kişisel Bilgiler',fullNameLbl:'Ad Soyad *',fullNamePh:'Ahmet Yılmaz',
  birthDateLbl:'Doğum Tarihi *',countryLbl:'Ülke *',countryDefault:'— Seçin —',
  idTypeLbl:'Belge Türü *',idPassport:'Pasaport',idCard:'Kimlik Kartı',idDrivers:'Sürücü Belgesi',idResidence:'Oturma İzni',
  importantNote:'<strong>ℹ️ Önemli:</strong> Ad belgelerle tam olarak eşleşmelidir. Yalnızca <strong>18+</strong> kabul edilir.',
  nextBtn:'Devam Et →',
  card2h:'2. Belge Yükleme',uploadInstr:'Net, buruşuk olmayan fotoğraflar yükleyin. Belgeler geçerli olmalıdır.',
  idFrontLbl:'Belge Ön Yüzü <span class="required-badge">ZORUNLU</span>',
  idFrontTitle:'Ön yüz',idFrontSub:'JPG, PNG veya PDF · maks. 8 MB',
  idBackLbl:'Belge Arka Yüzü <span class="optional-badge">ÖNERİLİR</span>',
  idBackTitle:'Arka yüz',idBackSub:'JPG, PNG veya PDF · maks. 8 MB',
  selfieLbl:'Belgeyle Selfie <span class="required-badge">ZORUNLU</span>',
  selfieTitle:'Belgeyi tutarken fotoğraf',selfieSub:'Belgeyi görünür detaylarla tutun · JPG veya PNG · maks. 8 MB',
  acceptedDocs:'<strong>✅ Kabul edilen belgeler:</strong>',
  doc1:'Pasaport (tüm ülkeler)',doc2:'Kimlik kartı (AB ülkeleri)',doc3:'Sürücü belgesi (fotoğraflı)',doc4:'Oturma izni',
  backBtn:'← Geri',reviewBtn:'İncele →',
  card3h:'3. İnceleme ve Gönderme',
  dataNote:'<strong>🔒 Veri koruma:</strong> Belgeleriniz şifrelenmiş olarak saklanır ve yalnızca doğrulama için kullanılır.',
  submitBtn:'Belgeleri Gönder ✓',
  noUidTitle:'Oturum bulunamadı',noUidDesc:'Önce casinoya giriş yapın.',noUidBtn:'← Casinoya git',
  statusApprovedTitle:'Hesap Doğrulandı!',statusApprovedDesc:'Kimliğiniz başarıyla doğrulandı. İyi şanslar!',
  statusPendingTitle:'İnceleme Bekleniyor',statusPendingDesc:'Belgeleriniz gönderildi ve inceleniyor. 1–24 saat sürebilir.',
  statusRejectedTitle:'Belgeler Reddedildi',statusRejectedDesc:'Üzgünüz, belgeleriniz kabul edilmedi. Yeni belgeler gönderebilirsiniz.',
  rejectionPrefix:'📋 Neden: ',
  errName:'Ad soyadı girin',errDob:'Doğum tarihini seçin',errCountry:'Ülke seçin',
  errAge:'⛔ En az 18 yaşında olmalısınız.',errDobInvalid:'Geçersiz doğum tarihi',
  errFront:'Belge ön yüzü zorunludur',errSelfie:'Belgeyle selfie zorunludur',
  errRetry:'Bir hata oluştu. Lütfen tekrar deneyin.',errNetwork:'Bağlantı hatası.',
  sendingLabel:'Gönderiliyor...',
  revFullName:'Ad soyad',revDob:'Doğum tarihi',revCountry:'Ülke',revIdType:'Belge türü',revDocs:'Belgeler',revYears:'yaş',
  revFront:'✓ Ön yüz',revBack:'✓ Arka yüz',revSelfie:'✓ Selfie'},
ar:{back:'← العودة إلى الكازينو',badge:'🛡️ KYC — التحقق من الهوية',h1:'التحقق من الحساب',
  heroDesc:'وفقًا للوائح القمار، يجب على جميع اللاعبين التحقق من هويتهم وعمرهم قبل اللعب.',
  step1lbl:'المعلومات الشخصية',step2lbl:'المستندات',step3lbl:'التأكيد',
  card1h:'1. المعلومات الشخصية',fullNameLbl:'الاسم الكامل *',fullNamePh:'محمد أحمد',
  birthDateLbl:'تاريخ الميلاد *',countryLbl:'الدولة *',countryDefault:'— اختر —',
  idTypeLbl:'نوع الوثيقة *',idPassport:'جواز سفر',idCard:'بطاقة هوية',idDrivers:'رخصة قيادة',idResidence:'تصريح إقامة',
  importantNote:'<strong>ℹ️ مهم:</strong> يجب أن يتطابق الاسم تمامًا مع المستندات. مسموح فقط لمن هم <strong>18+</strong>.',
  nextBtn:'متابعة →',
  card2h:'2. رفع المستندات',uploadInstr:'ارفع صورًا واضحة وغير مجعدة. يجب أن تكون المستندات سارية.',
  idFrontLbl:'الجهة الأمامية للوثيقة <span class="required-badge">مطلوب</span>',
  idFrontTitle:'الجهة الأمامية',idFrontSub:'JPG، PNG أو PDF · الحد الأقصى 8 ميغابايت',
  idBackLbl:'الجهة الخلفية للوثيقة <span class="optional-badge">موصى به</span>',
  idBackTitle:'الجهة الخلفية',idBackSub:'JPG، PNG أو PDF · الحد الأقصى 8 ميغابايت',
  selfieLbl:'صورة مع الوثيقة <span class="required-badge">مطلوب</span>',
  selfieTitle:'صورة وأنت تحمل الوثيقة',selfieSub:'احمل الوثيقة بتفاصيل مرئية · JPG أو PNG · الحد الأقصى 8 ميغابايت',
  acceptedDocs:'<strong>✅ المستندات المقبولة:</strong>',
  doc1:'جواز سفر (جميع الدول)',doc2:'بطاقة هوية (دول الاتحاد الأوروبي)',doc3:'رخصة قيادة (مع صورة)',doc4:'تصريح إقامة',
  backBtn:'← رجوع',reviewBtn:'مراجعة →',
  card3h:'3. المراجعة والإرسال',
  dataNote:'<strong>🔒 حماية البيانات:</strong> يتم تخزين مستنداتك مشفرة وتستخدم فقط للتحقق.',
  submitBtn:'إرسال المستندات ✓',
  noUidTitle:'الجلسة غير موجودة',noUidDesc:'يرجى تسجيل الدخول إلى الكازينو أولاً.',noUidBtn:'← إلى الكازينو',
  statusApprovedTitle:'تم التحقق من الحساب!',statusApprovedDesc:'تم التحقق من هويتك بنجاح. حظًا موفقًا!',
  statusPendingTitle:'في انتظار المراجعة',statusPendingDesc:'تم تقديم مستنداتك وتخضع للمراجعة. يستغرق عادةً 1–24 ساعة.',
  statusRejectedTitle:'تم رفض المستندات',statusRejectedDesc:'نأسف، لم تُقبل مستنداتك. يمكنك تقديم مستندات جديدة.',
  rejectionPrefix:'📋 السبب: ',
  errName:'أدخل الاسم الكامل',errDob:'اختر تاريخ الميلاد',errCountry:'اختر الدولة',
  errAge:'⛔ يجب أن يكون عمرك 18 عامًا على الأقل.',errDobInvalid:'تاريخ ميلاد غير صالح',
  errFront:'الجهة الأمامية للوثيقة مطلوبة',errSelfie:'الصورة مع الوثيقة مطلوبة',
  errRetry:'حدث خطأ. حاول مرة أخرى.',errNetwork:'خطأ في الاتصال.',
  sendingLabel:'جارٍ الإرسال...',
  revFullName:'الاسم الكامل',revDob:'تاريخ الميلاد',revCountry:'الدولة',revIdType:'نوع الوثيقة',revDocs:'المستندات',revYears:'سنة',
  revFront:'✓ أمامي',revBack:'✓ خلفي',revSelfie:'✓ صورة'},
zh:{back:'← 返回赌场',badge:'🛡️ KYC — 身份验证',h1:'账户验证',
  heroDesc:'根据博彩法规，所有玩家在开始游戏前必须验证其身份和年龄。',
  step1lbl:'个人信息',step2lbl:'文件',step3lbl:'确认',
  card1h:'1. 个人信息',fullNameLbl:'全名 *',fullNamePh:'张三',
  birthDateLbl:'出生日期 *',countryLbl:'国家 *',countryDefault:'— 请选择 —',
  idTypeLbl:'文件类型 *',idPassport:'护照',idCard:'身份证',idDrivers:'驾驶证',idResidence:'居留许可',
  importantNote:'<strong>ℹ️ 重要：</strong>姓名必须与文件完全匹配。仅允许 <strong>18岁以上</strong>。',
  nextBtn:'继续 →',
  card2h:'2. 文件上传',uploadInstr:'上传清晰、未折叠的照片。文件必须有效。',
  idFrontLbl:'文件正面 <span class="required-badge">必需</span>',
  idFrontTitle:'正面',idFrontSub:'JPG、PNG或PDF · 最大8MB',
  idBackLbl:'文件背面 <span class="optional-badge">建议</span>',
  idBackTitle:'背面',idBackSub:'JPG、PNG或PDF · 最大8MB',
  selfieLbl:'持证自拍 <span class="required-badge">必需</span>',
  selfieTitle:'手持文件的照片',selfieSub:'文件细节清晰可见 · JPG或PNG · 最大8MB',
  acceptedDocs:'<strong>✅ 接受的文件：</strong>',
  doc1:'护照（所有国家）',doc2:'身份证（欧盟国家）',doc3:'驾驶证（带照片）',doc4:'居留许可',
  backBtn:'← 返回',reviewBtn:'审查 →',
  card3h:'3. 审查与提交',
  dataNote:'<strong>🔒 数据保护：</strong>您的文件以加密方式存储，仅用于验证。',
  submitBtn:'提交文件 ✓',
  noUidTitle:'未找到会话',noUidDesc:'请先登录赌场。',noUidBtn:'← 去赌场',
  statusApprovedTitle:'账户已验证！',statusApprovedDesc:'您的身份已成功验证。祝您好运！',
  statusPendingTitle:'等待审核',statusPendingDesc:'您的文件已提交，正在审核中。通常需要1–24小时。',
  statusRejectedTitle:'文件被拒绝',statusRejectedDesc:'很遗憾，您的文件未被接受。您可以提交新文件。',
  rejectionPrefix:'📋 原因：',
  errName:'输入全名',errDob:'选择出生日期',errCountry:'选择国家',
  errAge:'⛔ 您必须年满18岁。',errDobInvalid:'无效的出生日期',
  errFront:'需要文件正面',errSelfie:'需要持证自拍',
  errRetry:'发生错误。请重试。',errNetwork:'连接错误。',
  sendingLabel:'发送中...',
  revFullName:'全名',revDob:'出生日期',revCountry:'国家',revIdType:'文件类型',revDocs:'文件',revYears:'岁',
  revFront:'✓ 正面',revBack:'✓ 背面',revSelfie:'✓ 自拍'},
hi:{back:'← कैसीनो पर वापस',badge:'🛡️ KYC — पहचान सत्यापन',h1:'खाता सत्यापन',
  heroDesc:'जुआ नियमों के अनुसार, सभी खिलाड़ियों को खेलने से पहले अपनी पहचान और उम्र सत्यापित करनी होगी।',
  step1lbl:'व्यक्तिगत जानकारी',step2lbl:'दस्तावेज़',step3lbl:'पुष्टि',
  card1h:'1. व्यक्तिगत जानकारी',fullNameLbl:'पूरा नाम *',fullNamePh:'राम शर्मा',
  birthDateLbl:'जन्म तिथि *',countryLbl:'देश *',countryDefault:'— चुनें —',
  idTypeLbl:'दस्तावेज़ प्रकार *',idPassport:'पासपोर्ट',idCard:'पहचान पत्र',idDrivers:'ड्राइविंग लाइसेंस',idResidence:'निवास परमिट',
  importantNote:'<strong>ℹ️ महत्वपूर्ण:</strong> नाम दस्तावेजों से बिल्कुल मेल खाना चाहिए। केवल <strong>18+</strong> अनुमत।',
  nextBtn:'जारी रखें →',
  card2h:'2. दस्तावेज़ अपलोड',uploadInstr:'स्पष्ट, बिना क्रीज वाली तस्वीरें अपलोड करें। दस्तावेज़ वैध होने चाहिए।',
  idFrontLbl:'दस्तावेज़ का सामने का भाग <span class="required-badge">आवश्यक</span>',
  idFrontTitle:'सामने का भाग',idFrontSub:'JPG, PNG या PDF · अधिकतम 8 MB',
  idBackLbl:'दस्तावेज़ का पिछला भाग <span class="optional-badge">अनुशंसित</span>',
  idBackTitle:'पिछला भाग',idBackSub:'JPG, PNG या PDF · अधिकतम 8 MB',
  selfieLbl:'दस्तावेज़ के साथ सेल्फी <span class="required-badge">आवश्यक</span>',
  selfieTitle:'दस्तावेज़ पकड़े हुए फोटो',selfieSub:'दृश्यमान विवरण के साथ दस्तावेज़ पकड़ें · JPG या PNG · अधिकतम 8 MB',
  acceptedDocs:'<strong>✅ स्वीकृत दस्तावेज़:</strong>',
  doc1:'पासपोर्ट (सभी देश)',doc2:'पहचान पत्र (EU देश)',doc3:'ड्राइविंग लाइसेंस (फोटो सहित)',doc4:'निवास परमिट',
  backBtn:'← वापस',reviewBtn:'समीक्षा →',
  card3h:'3. समीक्षा और सबमिट',
  dataNote:'<strong>🔒 डेटा सुरक्षा:</strong> आपके दस्तावेज़ एन्क्रिप्टेड रूप में संग्रहीत हैं और केवल सत्यापन के लिए उपयोग किए जाते हैं।',
  submitBtn:'दस्तावेज़ सबमिट करें ✓',
  noUidTitle:'सत्र नहीं मिला',noUidDesc:'पहले कैसीनो में लॉगिन करें।',noUidBtn:'← कैसीनो जाएं',
  statusApprovedTitle:'खाता सत्यापित!',statusApprovedDesc:'आपकी पहचान सफलतापूर्वक सत्यापित हुई। शुभकामनाएं!',
  statusPendingTitle:'समीक्षा की प्रतीक्षा',statusPendingDesc:'आपके दस्तावेज़ जमा हो गए हैं। आमतौर पर 1–24 घंटे लगते हैं।',
  statusRejectedTitle:'दस्तावेज़ अस्वीकृत',statusRejectedDesc:'क्षमा करें, आपके दस्तावेज़ स्वीकार नहीं किए गए। नए दस्तावेज़ जमा कर सकते हैं।',
  rejectionPrefix:'📋 कारण: ',
  errName:'पूरा नाम दर्ज करें',errDob:'जन्म तिथि चुनें',errCountry:'देश चुनें',
  errAge:'⛔ आपकी उम्र कम से कम 18 साल होनी चाहिए।',errDobInvalid:'अमान्य जन्म तिथि',
  errFront:'दस्तावेज़ का सामने का भाग आवश्यक है',errSelfie:'दस्तावेज़ के साथ सेल्फी आवश्यक है',
  errRetry:'एक त्रुटि हुई। कृपया पुनः प्रयास करें।',errNetwork:'कनेक्शन त्रुटि।',
  sendingLabel:'भेज रहे हैं...',
  revFullName:'पूरा नाम',revDob:'जन्म तिथि',revCountry:'देश',revIdType:'दस्तावेज़ प्रकार',revDocs:'दस्तावेज़',revYears:'वर्ष',
  revFront:'✓ सामने',revBack:'✓ पीछे',revSelfie:'✓ सेल्फी'},
uk:{back:'← Назад до казино',badge:'🛡️ KYC — ВЕРИФІКАЦІЯ ОСОБИ',h1:'Підтвердження акаунту',
  heroDesc:'Згідно з правилами азартних ігор, усі гравці зобов\'язані підтвердити свою особу та вік перед початком гри.',
  step1lbl:'ОСОБИСТА ІНФО',step2lbl:'ДОКУМЕНТИ',step3lbl:'ПІДТВЕРДЖЕННЯ',
  card1h:'1. Особиста інформація',fullNameLbl:'Ім\'я та прізвище *',fullNamePh:'Іван Іваненко',
  birthDateLbl:'Дата народження *',countryLbl:'Країна *',countryDefault:'— Оберіть —',
  idTypeLbl:'Тип документа *',idPassport:'Паспорт',idCard:'Посвідчення особи',idDrivers:'Водійське посвідчення',idResidence:'Дозвіл на проживання',
  importantNote:'<strong>ℹ️ Важливо:</strong> Ім\'я повинно точно збігатися з документами. Дозволено лише <strong>18+</strong>.',
  nextBtn:'Продовжити →',
  card2h:'2. Завантаження документів',uploadInstr:'Завантажте чіткі, нем\'яті фотографії. Документи мають бути дійсними.',
  idFrontLbl:'Лицьова сторона документа <span class="required-badge">ОБОВ\'ЯЗКОВО</span>',
  idFrontTitle:'Лицьова сторона',idFrontSub:'JPG, PNG або PDF · макс. 8 МБ',
  idBackLbl:'Зворотна сторона документа <span class="optional-badge">РЕКОМЕНДОВАНО</span>',
  idBackTitle:'Зворотна сторона',idBackSub:'JPG, PNG або PDF · макс. 8 МБ',
  selfieLbl:'Селфі з документом <span class="required-badge">ОБОВ\'ЯЗКОВО</span>',
  selfieTitle:'Фото з документом у руках',selfieSub:'Тримайте документ з видимими деталями · JPG або PNG · макс. 8 МБ',
  acceptedDocs:'<strong>✅ Прийнятні документи:</strong>',
  doc1:'Паспорт (всі країни)',doc2:'Посвідчення особи (країни ЄС)',doc3:'Водійське посвідчення (з фото)',doc4:'Дозвіл на проживання',
  backBtn:'← Назад',reviewBtn:'Переглянути →',
  card3h:'3. Перегляд та надсилання',
  dataNote:'<strong>🔒 Захист даних:</strong> Ваші документи зберігаються в зашифрованому вигляді та використовуються лише для верифікації.',
  submitBtn:'Надіслати документи ✓',
  noUidTitle:'Сесію не знайдено',noUidDesc:'Спочатку увійдіть у казино.',noUidBtn:'← До казино',
  statusApprovedTitle:'Акаунт підтверджено!',statusApprovedDesc:'Вашу особу успішно підтверджено. Удачі!',
  statusPendingTitle:'Очікує перевірки',statusPendingDesc:'Ваші документи надіслані та перевіряються. Зазвичай 1–24 години.',
  statusRejectedTitle:'Документи відхилено',statusRejectedDesc:'На жаль, ваші документи не були прийняті. Ви можете надіслати нові.',
  rejectionPrefix:'📋 Причина: ',
  errName:'Введіть ім\'я та прізвище',errDob:'Оберіть дату народження',errCountry:'Оберіть країну',
  errAge:'⛔ Вам має бути не менше 18 років.',errDobInvalid:'Невірна дата народження',
  errFront:'Лицьова сторона документа обов\'язкова',errSelfie:'Селфі з документом обов\'язкове',
  errRetry:'Сталася помилка. Спробуйте ще раз.',errNetwork:'Помилка з\'єднання.',
  sendingLabel:'Надсилання...',
  revFullName:'Ім\'я та прізвище',revDob:'Дата народження',revCountry:'Країна',revIdType:'Тип документа',revDocs:'Документи',revYears:'р.',
  revFront:'✓ Лицьова',revBack:'✓ Зворотна',revSelfie:'✓ Селфі'}
};

let kyc = fs.readFileSync(P+'/kyc.html','utf8');

// Add lang bar CSS
kyc = kyc.replace('</style>', LANG_BAR_CSS + '\n</style>');

// Add lang bar to header + update back link
kyc = kyc.replace(
  '<a class="back" href="/">← Grįžti į Kazino</a>',
  '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><a class="back" href="/" data-i18n="back">← Back to Casino</a><div class="lang-wrap"><div class="lang-bar" id="langBar"></div></div></div>'
);

// Hero badge
kyc = kyc.replace('🛡️ KYC — TAPATYBĖS PATIKRINIMAS', '<span data-i18n="badge">🛡️ KYC — IDENTITY VERIFICATION</span>');

// Hero h1
kyc = kyc.replace('<h1>Paskyros Patvirtinimas</h1>', '<h1 data-i18n="h1">Account Verification</h1>');

// Hero desc
kyc = kyc.replace(
  'Pagal Lietuvos azartinių lošimų įstatymą, visi žaidėjai privalo patvirtinti savo tapatybę ir amžių prieš pradėdami žaisti. Tai užtikrina, kad kazino naudotų tik pilnamečiai asmenys.',
  '<span data-i18n="heroDesc">According to gambling regulations, all players must verify their identity and age before playing.</span>'
);

// Step labels
kyc = kyc.replace('<span class="step-label">ASMENINĖ INFO</span>', '<span class="step-label" data-i18n="step1lbl">PERSONAL INFO</span>');
kyc = kyc.replace('<span class="step-label">DOKUMENTAI</span>', '<span class="step-label" data-i18n="step2lbl">DOCUMENTS</span>');
kyc = kyc.replace('<span class="step-label">PATVIRTINIMAS</span>', '<span class="step-label" data-i18n="step3lbl">CONFIRMATION</span>');

// Card 1 heading
kyc = kyc.replace('<h3>1. Asmeninė Informacija</h3>', '<h3 data-i18n="card1h">1. Personal Information</h3>');

// Form labels & placeholders
kyc = kyc.replace('<label>Vardas ir Pavardė *</label>', '<label data-i18n="fullNameLbl">Full Name *</label>');
kyc = kyc.replace('placeholder="Vardenis Pavardenis"', 'data-i18n-ph="fullNamePh" placeholder="John Smith"');
kyc = kyc.replace('<label>Gimimo Data *</label>', '<label data-i18n="birthDateLbl">Date of Birth *</label>');
kyc = kyc.replace('<label>Šalis *</label>', '<label data-i18n="countryLbl">Country *</label>');
kyc = kyc.replace('<option value="">— Pasirinkite —</option>', '<option value="" data-i18n="countryDefault">— Select —</option>');
kyc = kyc.replace('<label>Dokumento Tipas *</label>', '<label data-i18n="idTypeLbl">Document Type *</label>');
kyc = kyc.replace('<option value="passport">Pasas</option>', '<option value="passport" data-i18n="idPassport">Passport</option>');
kyc = kyc.replace('<option value="id_card">Asmens tapatybės kortelė</option>', '<option value="id_card" data-i18n="idCard">Identity Card</option>');
kyc = kyc.replace('<option value="drivers_license">Vairuotojo pažymėjimas</option>', '<option value="drivers_license" data-i18n="idDrivers">Driver\'s License</option>');
kyc = kyc.replace('<option value="residence_permit">Leidimas gyventi</option>', '<option value="residence_permit" data-i18n="idResidence">Residence Permit</option>');

// Info box
kyc = kyc.replace(
  '<strong>ℹ️ Svarbu:</strong> Vardas ir pavardė turi tiksliai sutapti su dokumentuose nurodytais. Amžius bus automatiškai patikrintas — žaisti leidžiama tik nuo <strong>18 metų</strong>.',
  '<span data-i18n-html="importantNote"><strong>ℹ️ Important:</strong> Name must exactly match your documents. Only <strong>18+</strong> allowed.</span>'
);

// Next button step 1
kyc = kyc.replace('<button class="btn btn-primary" onclick="goStep2()">Tęsti →</button>',
  '<button class="btn btn-primary" onclick="goStep2()" data-i18n="nextBtn">Continue →</button>');

// Card 2
kyc = kyc.replace('<h3>2. Dokumentų Įkėlimas</h3>', '<h3 data-i18n="card2h">2. Document Upload</h3>');
kyc = kyc.replace('Įkelkite aiškias, nesuglamžytas nuotraukas. Dokumentai turi būti galiojantys ir nesibaigiančiu terminu.',
  '<span data-i18n="uploadInstr">Upload clear, uncrumpled photos. Documents must be valid and not expired.</span>');

// Upload zone labels
kyc = kyc.replace('Dokumento Priekinė Pusė <span class="required-badge">PRIVALOMA</span>',
  '<span data-i18n-html="idFrontLbl">Document Front Side <span class="required-badge">REQUIRED</span></span>');
kyc = kyc.replace(/<div class="upload-title">Priekinė pusė<\/div>/, '<div class="upload-title" data-i18n="idFrontTitle">Front side</div>');
kyc = kyc.replace(/<div class="upload-sub">JPG, PNG arba PDF · maks. 8 MB<\/div>[\s\S]*?<div class="upload-filename" id="fn-id_front">/,
  '<div class="upload-sub" data-i18n="idFrontSub">JPG, PNG or PDF · max 8 MB</div>\n              <div class="upload-filename" id="fn-id_front">');

kyc = kyc.replace('Dokumento Galinė Pusė <span class="optional-badge">REKOMENDUOJAMA</span>',
  '<span data-i18n-html="idBackLbl">Document Back Side <span class="optional-badge">RECOMMENDED</span></span>');
kyc = kyc.replace(/<div class="upload-title">Galinė pusė<\/div>/, '<div class="upload-title" data-i18n="idBackTitle">Back side</div>');

kyc = kyc.replace('Selfie su Dokumentu <span class="required-badge">PRIVALOMA</span>',
  '<span data-i18n-html="selfieLbl">Selfie with Document <span class="required-badge">REQUIRED</span></span>');
kyc = kyc.replace('<div class="upload-title">Nuotrauka su dokumentu rankose</div>',
  '<div class="upload-title" data-i18n="selfieTitle">Photo holding the document</div>');
kyc = kyc.replace('Laikykite dokumentą matomomis detalėmis · JPG arba PNG · maks. 8 MB',
  '<span data-i18n="selfieSub">Hold document with visible details · JPG or PNG · max 8 MB</span>');

// Accepted docs
kyc = kyc.replace('<strong>✅ Priimami dokumentai:</strong>',
  '<span data-i18n-html="acceptedDocs"><strong>✅ Accepted documents:</strong></span>');
kyc = kyc.replace('<li>Pasas (visos šalys)</li>', '<li data-i18n="doc1">Passport (all countries)</li>');
kyc = kyc.replace('<li>Asmens tapatybės kortelė (ES šalys)</li>', '<li data-i18n="doc2">Identity card (EU countries)</li>');
kyc = kyc.replace('<li>Vairuotojo pažymėjimas (su nuotrauka)</li>', '<li data-i18n="doc3">Driver\'s license (with photo)</li>');
kyc = kyc.replace('<li>Leidimas gyventi</li>', '<li data-i18n="doc4">Residence permit</li>');

// Step 2 buttons
kyc = kyc.replace('<button class="btn btn-ghost" onclick="goStep1()">← Atgal</button>',
  '<button class="btn btn-ghost" onclick="goStep1()" data-i18n="backBtn">← Back</button>');
kyc = kyc.replace('<button class="btn btn-primary" onclick="goStep3()">Peržiūrėti →</button>',
  '<button class="btn btn-primary" onclick="goStep3()" data-i18n="reviewBtn">Review →</button>');

// Card 3
kyc = kyc.replace('<h3>3. Peržiūra ir Pateikimas</h3>', '<h3 data-i18n="card3h">3. Review & Submit</h3>');
kyc = kyc.replace(
  '<strong>🔒 Duomenų apsauga:</strong> Jūsų dokumentai saugomi užšifruoti ir naudojami tik amžiaus bei tapatybės patikrinimui. Duomenys neperduodami trečiosioms šalims.',
  '<span data-i18n-html="dataNote"><strong>🔒 Data protection:</strong> Your documents are stored encrypted and used only for verification.</span>'
);
kyc = kyc.replace('<button class="btn btn-ghost" onclick="goStep2()">← Atgal</button>',
  '<button class="btn btn-ghost" onclick="goStep2()" data-i18n="backBtn">← Back</button>');
kyc = kyc.replace('Pateikti Dokumentus ✓\n          </button>', '<span data-i18n="submitBtn">Submit Documents ✓</span>\n          </button>');

// No UID section
kyc = kyc.replace('<div style="font-family:\'Orbitron\',monospace;font-size:18px;color:var(--gold);margin-bottom:12px;">Sesija nerasta</div>',
  '<div style="font-family:\'Orbitron\',monospace;font-size:18px;color:var(--gold);margin-bottom:12px;" data-i18n="noUidTitle">Session not found</div>');
kyc = kyc.replace('<div style="font-size:13px;color:rgba(232,224,208,.4);margin-bottom:24px;">Pirmiausia prisijunkite prie kazino, tada grįžkite čia.</div>',
  '<div style="font-size:13px;color:rgba(232,224,208,.4);margin-bottom:24px;" data-i18n="noUidDesc">Please log in to the casino first, then return here.</div>');
kyc = kyc.replace('<a class="back" href="/" style="display:inline-block;padding:12px 28px;color:var(--cream);">← Eiti į Kazino</a>',
  '<a class="back" href="/" style="display:inline-block;padding:12px 28px;color:var(--cream);" data-i18n="noUidBtn">← Go to Casino</a>');

// Now inject PAGE_LANGS + LANGS_LIST + applyLang + fix JS strings
const kycLangScript = `
var PAGE_LANGS=${JSON.stringify(KYC_LANGS)};
${LANGS_LIST_STR}
${APPLY_LANG_FN}

function _t(key){return (PAGE_LANGS[_lc]||PAGE_LANGS.en)[key]||PAGE_LANGS.en[key]||key;}
`;

// Insert before let uid
kyc = kyc.replace('let uid = null;', kycLangScript + '\nlet uid = null;');

// Fix JS error strings to use translations
kyc = kyc.replace("if(!name) { showErr(err,'Įveskite vardą ir pavardę'); return; }",
  "if(!name) { showErr(err,_t('errName')); return; }");
kyc = kyc.replace("if(!dob) { showErr(err,'Pasirinkite gimimo datą'); return; }",
  "if(!dob) { showErr(err,_t('errDob')); return; }");
kyc = kyc.replace("if(!country) { showErr(err,'Pasirinkite šalį'); return; }",
  "if(!country) { showErr(err,_t('errCountry')); return; }");
kyc = kyc.replace("showErr(err,'⛔ Jums turi būti bent 18 metų. Iki 18 metų kazino paslaugos neteikiamos.');",
  "showErr(err,_t('errAge'));");
kyc = kyc.replace("if(age > 120) { showErr(err,'Neteisinga gimimo data'); return; }",
  "if(age > 120) { showErr(err,_t('errDobInvalid')); return; }");
kyc = kyc.replace("if(!uploadedFiles['id_front']) { showErr(err,'Privaloma įkelti dokumento priekinę pusę'); return; }",
  "if(!uploadedFiles['id_front']) { showErr(err,_t('errFront')); return; }");
kyc = kyc.replace("if(!uploadedFiles['selfie']) { showErr(err,'Privaloma įkelti selfie su dokumentu'); return; }",
  "if(!uploadedFiles['selfie']) { showErr(err,_t('errSelfie')); return; }");

// Fix goStep3 review table (Lithuanian hardcoded strings)
kyc = kyc.replace(
  "const idTypeNames = {\n    passport:'Pasas', id_card:'Asmens tapatybės kortelė',\n    drivers_license:'Vairuotojo pažymėjimas', residence_permit:'Leidimas gyventi'\n  };\n  const countryNames = {LT:'Lietuva',LV:'Latvija',EE:'Estija',PL:'Lenkija',DE:'Vokietija',\n    GB:'Jungtinė Karalystė',FR:'Prancūzija',SE:'Švedija',NO:'Norvegija',FI:'Suomija',\n    NL:'Nyderlandai',BE:'Belgija',AT:'Austrija',CH:'Šveicarija',OTHER:'Kita'};",
  `const t3=PAGE_LANGS[_lc]||PAGE_LANGS.en;
  const idTypeNames = {
    passport:t3.idPassport, id_card:t3.idCard,
    drivers_license:t3.idDrivers, residence_permit:t3.idResidence
  };
  const countryNames = {LT:'Lithuania',LV:'Latvia',EE:'Estonia',PL:'Poland',DE:'Germany',
    GB:'United Kingdom',FR:'France',SE:'Sweden',NO:'Norway',FI:'Finland',
    NL:'Netherlands',BE:'Belgium',AT:'Austria',CH:'Switzerland',OTHER:'Other'};`
);

kyc = kyc.replace(
  "<tr><td style=\"padding:8px 0;color:rgba(232,224,208,.35);width:40%\">Vardas ir pavardė</td>",
  "<tr><td style=\"padding:8px 0;color:rgba(232,224,208,.35);width:40%\">${t3.revFullName}</td>"
);
kyc = kyc.replace(
  "<tr><td style=\"padding:8px 0;color:rgba(232,224,208,.35)\">Gimimo data</td><td style=\"color:var(--cream)\">${formData.birth_date} (${calcAge(formData.birth_date)} m.)</td></tr>",
  "<tr><td style=\"padding:8px 0;color:rgba(232,224,208,.35)\">${t3.revDob}</td><td style=\"color:var(--cream)\">${formData.birth_date} (${calcAge(formData.birth_date)} ${t3.revYears})</td></tr>"
);
kyc = kyc.replace(
  "<tr><td style=\"padding:8px 0;color:rgba(232,224,208,.35)\">Šalis</td>",
  "<tr><td style=\"padding:8px 0;color:rgba(232,224,208,.35)\">${t3.revCountry}</td>"
);
kyc = kyc.replace(
  "<tr><td style=\"padding:8px 0;color:rgba(232,224,208,.35)\">Dokumento tipas</td>",
  "<tr><td style=\"padding:8px 0;color:rgba(232,224,208,.35)\">${t3.revIdType}</td>"
);
kyc = kyc.replace(
  "<tr><td style=\"padding:8px 0;color:rgba(232,224,208,.35)\">Dokumentai</td>",
  "<tr><td style=\"padding:8px 0;color:rgba(232,224,208,.35)\">${t3.revDocs}</td>"
);
kyc = kyc.replace(
  "✓ Priekinė pusė${uploadedFiles['id_back']?' · ✓ Galinė pusė':''} · ✓ Selfie",
  "${t3.revFront}${uploadedFiles['id_back']?' · '+t3.revBack:''} · ${t3.revSelfie}"
);

// Fix showStatus function
kyc = kyc.replace("title.textContent = 'Paskyra Patvirtinta!';",
  "title.textContent = _t('statusApprovedTitle');");
kyc = kyc.replace("desc.textContent = 'Jūsų tapatybė sėkmingai patvirtinta. Galite žaisti visus kazino žaidimus. Linkime sėkmės!';",
  "desc.textContent = _t('statusApprovedDesc');");
kyc = kyc.replace("title.textContent = 'Laukiama Peržiūros';",
  "title.textContent = _t('statusPendingTitle');");
kyc = kyc.replace("desc.textContent = 'Jūsų dokumentai pateikti ir yra tikrinami. Tai paprastai užtrunka 1–24 valandas. Gavę patvirtinimą, gausite pranešimą.';",
  "desc.textContent = _t('statusPendingDesc');");
kyc = kyc.replace("title.textContent = 'Dokumentai Atmesti';",
  "title.textContent = _t('statusRejectedTitle');");
kyc = kyc.replace("desc.textContent = 'Apgailestaujame, jūsų dokumentai nebuvo priimti. Galite pateikti naujus dokumentus.';",
  "desc.textContent = _t('statusRejectedDesc');");
kyc = kyc.replace("reason.textContent = '📋 Priežastis: ' + data.rejection_reason;",
  "reason.textContent = _t('rejectionPrefix') + data.rejection_reason;");

// Fix submit button states
kyc = kyc.replace("btn.innerHTML = '<span class=\"spinner\"></span> Siunčiama...';",
  "btn.innerHTML = '<span class=\"spinner\"></span> '+_t('sendingLabel');");
kyc = kyc.replace(/btn\.innerHTML = 'Pateikti Dokumentus ✓';/g,
  "btn.innerHTML = _t('submitBtn');");
kyc = kyc.replace("showErr(err, data.error||'Įvyko klaida. Bandykite dar kartą.');",
  "showErr(err, data.error||_t('errRetry'));");
kyc = kyc.replace("showErr(err,'Ryšio klaida. Patikrinkite internetą ir bandykite dar kartą.');",
  "showErr(err,_t('errNetwork'));");

fs.writeFileSync(P+'/kyc.html', kyc, 'utf8');
console.log('kyc.html DONE');
