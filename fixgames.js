/**
 * Fix remaining Lithuanian text in all game pages + admin.html
 */
const fs = require('fs');
const path = require('path');

function fix(file, replacements) {
  const p = path.join(__dirname, 'public', file);
  let html = fs.readFileSync(p, 'utf8');
  let count = 0;
  for (const [lt, en] of replacements) {
    const before = html;
    html = html.split(lt).join(en);
    if (html !== before) count++;
  }
  fs.writeFileSync(p, html, 'utf8');
  console.log(`✅ ${file} — ${count} replacements`);
}

// ── CRASH ─────────────────────────────────────────────────
fix('crash.html', [
  ['Statymų suma',          'Bet Amount'],
  ['Automatinis išėmimas',  'Auto Cash Out'],
  ['Potenciali išmoka:',    'Potential payout:'],
  ['&#128161; Strategija: A išima anksti (2x), B laukia ilgiau (5x+)', '💡 Strategy: A cashes out early (2x), B waits longer (5x+)'],
  ['Statymų suma B',        'Bet Amount B'],
  ['Automatinis išėmimas B','Auto Cash Out B'],
  ['ŽAIDĖJAI ŠIO RAUNDO',  'PLAYERS THIS ROUND'],
  ['PRADĖTI',               'START'],
  ['LAIMĖTA',               'WON'],
]);

// ── DICE ──────────────────────────────────────────────────
fix('dice.html', [
  ['RIEDĖTI VIRŠ',          'ROLL OVER'],
  ['TIKIMYBĖ',              'WIN CHANCE'],
  ['Statymų suma',          'Bet Amount'],
  ['📈 Virš',               '📈 Over'],
  ['📉 Žemiau',             '📉 Under'],
  ['LAIMĖTA',               'WON'],
  ['IŠ EILĖS',              'STREAK'],
  ['📈 AUKŠČIAU',           '📈 HIGHER'],
  ['📉 ŽEMIAU',             '📉 LOWER'],
  ['IŠIMTI',                'CASH OUT'],
  ['PRADĖTI 🃏',            'START 🃏'],
  ['Laimėjimo tikimybė:',   'Win chance:'],
  ['10 kartų',              '10 rounds'],
  ['25 kartų',              '25 rounds'],
  ['50 kartų',              '50 rounds'],
  ['100 kartų',             '100 rounds'],
  ['Statymų',               'Bets'],
  ['Laimėjimų',             'Wins'],
  ['Kaip žaisti',           'How to play'],
  ['Nustatyk tikslą (pvz. <span style="color:var(--neon);">3.00x</span>)<br/>',
   'Set a target (e.g. <span style="color:var(--neon);">3.00x</span>)<br/>'],
  ['Jei atsitiktinis skaičius ≥ taikiniui — laimi!<br/>', 'If the random result ≥ target — you win!<br/>'],
  ['Daugiau rizikos = mažesnė tikimybė = didesnis koeficientas', 'Higher risk = lower chance = bigger multiplier'],
]);

// ── MINES ─────────────────────────────────────────────────
fix('mines.html', [
  ['Statymų suma',          'Bet Amount'],
  ['Maža rizika',           'Low risk'],
  ['Didele rizika',         'High risk'],
]);

// ── HILO ──────────────────────────────────────────────────
fix('hilo.html', [
  ['PRADĖKITE ŽAISTI',      'START PLAYING'],
  ['<span>AUKŠTESNIS</span>','<span>HIGHER</span>'],
  ['<span>ŽEMESNIS</span>', '<span>LOWER</span>'],
  ['Statymų suma',          'Bet Amount'],
  ['DALINTI KORTĄ',         'DEAL CARD'],
  ['Išimti dabar:',         'Cash out now:'],
  ['IŠIMTI',                'CASH OUT'],
  ['LAIMĖTA',               'WON'],
  ['&#9650; Aukštesnis — kita korta didesnė vertė<br/>', '&#9650; Higher — next card has greater value<br/>'],
  ['&#9660; Žemesnis — kita korta mažesnė vertė<br/>',  '&#9660; Lower — next card has smaller value<br/>'],
  ['&#9866; Lygus — ta pati vertė (didelė išmoka!)<br/>','&#9866; Equal — same value (big payout!)<br/>'],
  ['Kuo daugiau iš eilės — tuo didesnis koeficientas',  'The longer the streak — the bigger the multiplier'],
]);

// ── LIMBO ─────────────────────────────────────────────────
fix('limbo.html', [
  ['Laimėjimo tikimybė:',   'Win chance:'],
  ['10 kartų',              '10 rounds'],
  ['25 kartų',              '25 rounds'],
  ['50 kartų',              '50 rounds'],
  ['100 kartų',             '100 rounds'],
  ['Statymų',               'Bets'],
  ['Laimėjimų',             'Wins'],
  ['Kaip žaisti',           'How to play'],
  ['Nustatyk tikslą (pvz. <span style="color:var(--neon);">3.00x</span>)<br/>',
   'Set a target (e.g. <span style="color:var(--neon);">3.00x</span>)<br/>'],
  ['Jei atsitiktinis skaičius ≥ taikiniui — laimi!<br/>', 'If the random result ≥ target — you win!<br/>'],
  ['Daugiau rizikos = mažesnė tikimybė = didesnis koeficientas', 'Higher risk = lower chance = bigger multiplier'],
]);

// ── KENO ──────────────────────────────────────────────────
fix('keno.html', [
  ['Žetonai',                         'Tokens'],
  ['✕ Išvalyti',                      '✕ Clear'],
  ['🎱 Žaisti dar kartą',             '🎱 Play Again'],
  ['Ištraukti skaičiai (20)',          'Drawn Numbers (20)'],
  ['Išmokų lentelė',                  'Payout Table'],
  ['Laimėjimas',                      'Payout'],
  ['Pasirinkite skaičius',            'Pick your numbers'],
  ['Žaidimai',                        'Games'],
  ['Laimėjimai',                      'Wins'],
  ['Laimėta',                         'Won'],
]);

// ── BACCARAT ──────────────────────────────────────────────
fix('baccarat.html', [
  ['ŽAIDĖJAS',                        'PLAYER'],
  ['Pasirinkite lažybą ir spauskite DALINTI', 'Place your bet and click DEAL'],
  ['LAŽYBOS TIPAS',                   'BET TYPE'],
  ['Nėra istorijos',                  'No history'],
  ['LAIMĖJOTE',                       'YOU WIN'],
]);

// ── BLACKJACK ─────────────────────────────────────────────
fix('blackjack.html', [
  ['ŽAIDĖJAS',                        'PLAYER'],
  ['Statymų suma',                    'Bet Amount'],
  ['Žetonai',                         'Tokens'],
  ['LAIMĖTA',                         'WON'],
]);

// ── ROULETTE ──────────────────────────────────────────────
fix('roulette.html', [
  ['Žetono dydis',                    'Chip Size'],
  ['Spustelėkite ant lentelės...',    'Click on the table...'],
  ['Iš viso:',                        'Total:'],
  ['&#10006; IŠVALYTI STATYMUS',      '&#10006; CLEAR BETS'],
  ['LAIMĖTA',                         'WON'],
]);

// ── VIDEO POKER ───────────────────────────────────────────
fix('videopoker.html', [
  ['MONETŲ',                          'COINS'],
  ['Išmokos (1 moneta)',              'Payouts (1 coin)'],
  ['Karališka spalva',                'Royal Flush'],
  ['Eilutė + spalva',                 'Straight Flush'],
  ['Eilutė (Straight)',               'Straight'],
  ['Žaidimai',                        'Games'],
  ['Laimėjimai',                      'Wins'],
  ['Laimėta',                         'Won'],
]);

// ── PLINKO ────────────────────────────────────────────────
fix('plinko.html', [
  ['Žetonai',                         'Tokens'],
  ['← Grįžti',                        '← Back'],
  ['🎯 Leisti kamuolį',               '🎯 Drop Ball'],
  ['Eilė:',                           'Queue:'],
  ['Žema',                            'Low'],
  ['Vidutinė',                        'Medium'],
  ['Aukšta',                          'High'],
  ['Kamuolių',                        'Balls'],
]);

// ── ADMIN ─────────────────────────────────────────────────
fix('admin.html', [
  ['placeholder="Slaptažodis"',       'placeholder="Password"'],
  ['🎲 Lažybos',                      '🎲 Bets'],
  ['🎰 RTP Kontrolė',                 '🎰 RTP Control'],
  ['>Viso žaidėjų<',                  '>Total Players<'],
  ['>Žetonai cirkuliacijoje<',        '>Tokens in Circulation<'],
  ['>Žetonai cirkuliac',              '>Tokens in circulat'],
  ['📅 Šiandien',                     '📅 Today'],
  ['>Aktyvūs žaidėjai<',             '>Active Players<'],
  ['>Statymų skaičius<',             '>Total Bets<'],
  ['>Nauji žaidėjai<',               '>New Players<'],
  ['>Pastatyta žetonų<',             '>Tokens Wagered<'],
  ['>Išmokėta žetonų<',             '>Tokens Paid Out<'],
  ['📢 Broadcast žinutė visiems žaidėjams (live chat)', '📢 Broadcast message to all players (live chat)'],
  ['placeholder="Pvz: Kazino techninė pertrauka 22:00..."', 'placeholder="E.g: Casino maintenance at 22:00..."'],
  ['>Siųsti 📢<',                     '>Send 📢<'],
  ['>Laukia Peržiūros<',             '>Pending Review<'],
  ['🛡️ KYC Paraiškos',               '🛡️ KYC Applications'],
  ['🎲 Žaidimų Istorija',            '🎲 Game History'],
  ['>Visi žaidimai<',               '>All Games<'],
  ['>Tik laimėjimai<',              '>Wins Only<'],
  ['>Laikas<',                       '>Time<'],
  ['>Žaidėjas<',                     '>Player<'],
  ['>Žaidimas<',                     '>Game<'],
  ['>Statymas<',                     '>Bet<'],
  ['>Rezultatas<',                   '>Result<'],
  ['>Pelnas<',                       '>Profit<'],
  ['⏳ Didelės Lažybos — Laukia Patvirtinimo', '⏳ Large Bets — Pending Approval'],
  ['Lažybos ≥ 1000 tokenų reikalauja administratoriaus patvirtinimo', 'Bets ≥ 1,000 tokens require administrator approval'],
  ['>Suma<',                         '>Amount<'],
  ['>Galimas laimėjimas<',          '>Potential Win<'],
  ['>Koeficientas<',                '>Odds<'],
  ['>Rungtynės<',                   '>Match<'],
  ['>Pasirinkimas<',                '>Selection<'],
  ['Nėra laukiančių lažybų',        'No pending bets'],
  ['⚽ Sporto Lažybos',             '⚽ Sports Bets'],
  ['>Laimėta<',                     '>Won<'],
  ['>Pralaimėta<',                  '>Lost<'],
  ['>Rungtynės<',                   '>Match<'],
  ['>Koef.<',                       '>Odds<'],
  ['👥 Žaidėjai',                   '👥 Players'],
  ['placeholder="Ieškoti pagal vardą..."', 'placeholder="Search by name..."'],
  ['>Rūšiuoti: Žetonai ↓<',        '>Sort: Tokens ↓<'],
  ['>Rūšiuoti: Žaidimai ↓<',       '>Sort: Games ↓<'],
  ['>Rūšiuoti: Pastatyta ↓<',      '>Sort: Wagered ↓<'],
  ['>Rūšiuoti: Naujausi<',         '>Sort: Newest<'],
  ['>Rūšiuoti: Aktyvūs<',         '>Sort: Active<'],
  ['>Vardas<',                      '>Name<'],
  ['>Žetonai<',                     '>Tokens<'],
  ['>Lygis<',                       '>Level<'],
  ['>Žaidimai<',                    '>Games<'],
  ['>Pastatyta<',                   '>Wagered<'],
  ['>Pask. aktyvus<',              '>Last Active<'],
  ['>Veiksmai<',                    '>Actions<'],
  ['🎰 RTP Kontrolė — Kazino pelno reguliavimas', '🎰 RTP Control — Casino profit management'],
  ['RTP (Return to Player) — procentas nuo statymų, kurį žaidėjas vidutiniškai gauna atgal ilgalaikėje perspektyvoje.',
   'RTP (Return to Player) — percentage of wagers returned to players over the long term.'],
  ['Pvz. 95% RTP reiškia, kad kazino uždirba 5% nuo kiekvieno statymų eurų. Rekomendacija: 85–97%.',
   'E.g. 95% RTP means the casino earns 5% of every wager. Recommended range: 85–97%.'],
  ['>💾 Išsaugoti RTP nustatymus<', '>💾 Save RTP Settings<'],
  ['>✓ Išsaugota!<',               '>✓ Saved!<'],
  ['>🎮 Populiariausi žaidimai<',  '>🎮 Most Popular Games<'],
  ['>👑 Top žaidėjai (apyvarta)<', '>👑 Top Players (by wagered)<'],
  ['>➕ Sukurti turnyrą<',         '>➕ Create Tournament<'],
  ['>🎮 Visi žaidimai<',          '>🎮 All Games<'],
  ['>🎡 Ruletė<',                 '>🎡 Roulette<'],
  ['placeholder="Prizų fondas (žetonai)"', 'placeholder="Prize pool (tokens)"'],
  ['Ieškoti žaidėjo affiliate kodo:', 'Search player affiliate code:'],
  ['>Ieškoti<',                   '>Search<'],
  ['🛡️ Atsakingo Žaidimo Kontrolė', '🛡️ Responsible Gambling Controls'],
  ['Ieškoti žaidėjo limitų, arba rankiniu būdu pašalinti saviišskyrimą.',
   'Search player limits, or manually cancel self-exclusion.'],
  ['placeholder="Žaidėjo UID"',   'placeholder="Player UID"'],
  ['⚠️ Atšaukti saviišskyrimą (admin only)', '⚠️ Cancel Self-Exclusion (admin only)'],
  ['placeholder="Žaidėjo UID"',   'placeholder="Player UID"'],
  ['>💰 Išmokėti cashback visiems<', '>💰 Pay Cashback to All<'],
  ['Apskaičiuoja ir išmoka savaitinį cashback visiems žaidėjams pagal jų apyvartą.',
   'Calculates and pays weekly cashback to all players based on their wagered amount.'],
  ['>🎁 Suteikti bonusą žaidėjui<', '>🎁 Grant Bonus to Player<'],
  ['placeholder="Suma (žetonai)"', 'placeholder="Amount (tokens)"'],
  ['>VIP dovanėlė<',              '>VIP Gift<'],
  ['>📊 VIP lygių paskirstymas<', '>📊 VIP Level Distribution<'],
  ['>📢 Siųsti visiems žaidėjams<', '>📢 Send to All Players<'],
  ['placeholder="Antraštė"',      'placeholder="Title"'],
  ['placeholder="Žinutės tekstas"', 'placeholder="Message text"'],
  ['>📤 Siųsti visiems<',        '>📤 Send to All<'],
  ['>👤 Siųsti konkrečiam žaidėjui<', '>👤 Send to Specific Player<'],
  ['>📤 Siųsti<',               '>📤 Send<'],
  ['Registruokitės:',            'Sign up at:'],
  ['Sukurkite naują App → Web Push → įveskite savo domeno adresą',
   'Create a new App → Web Push → enter your domain'],
  ['Railway → Settings → Variables → pridėkite:',
   'Railway → Settings → Variables → add:'],
  ['Redeploy → push notifikacijos iš karto veikia!',
   'Redeploy → push notifications will work immediately!'],
  ['👥 Darbuotojų valdymas',     '👥 Staff Management'],
  ['>Darbuotojas<',              '>Staff Member<'],
  ['>Rolė<',                    '>Role<'],
  ['>Sukurta<',                 '>Created<'],
  ['>Paskutinis prisijungimas<', '>Last Login<'],
  ['>Statusas<',                '>Status<'],
  ['>Veiksmai<',                '>Actions<'],
  ['placeholder="Slaptažodis"', 'placeholder="Password"'],
  ['>Išsaugoti<',               '>Save<'],
  ['>Atšaukti<',                '>Cancel<'],
  ['Nurodykite atmetimo priežastį (bus rodoma žaidėjui)',
   'Enter rejection reason (will be shown to the player)'],
  ['placeholder="Atmetimo priežastis..."', 'placeholder="Rejection reason..."'],
  ['>Atšaukti<',                '>Cancel<'],
  ['✕ Uždaryti',                '✕ Close'],
  ['>Žetonai<',                 '>Tokens<'],
  ['>Žaidimai<',                '>Games<'],
  ['>Laimėta<',                 '>Won<'],
  ['Paskutiniai 30 statymų',    'Last 30 bets'],
]);

console.log('\n✅ All game pages fixed!');
