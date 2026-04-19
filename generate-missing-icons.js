// HATHOR — 6 trūkstamos ikonos + 2 naujos miniatūros
// Trūksta: blackjack, baccarat, sports, hilo, limbo, pyramid
// Papildomai: thumb-dragontower (atskiras nuo dragon-crash), thumb-slots-classic

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

const IMAGES = [

  // ══════════════════════════════════════════
  // IKONOS (1024x1024) — vienodas stilius
  // Tamsi fono spalva + aukso/neono žėrėjimas
  // ══════════════════════════════════════════

  {
    file: 'icon-blackjack.png',
    size: '1024x1024',
    prompt: `Casino game icon: Ace of Spades card and King of Hearts card fanned together showing the number 21, ultra-close-up view of two playing cards with ornate gold borders, the Ace clearly shows a large black spade symbol and "A", the King shows a red heart and "K", deep black background, warm golden glow between the cards, ultra-sharp photorealistic render, no text, no UI, square format, luxury casino icon style`
  },

  {
    file: 'icon-baccarat.png',
    size: '1024x1024',
    prompt: `Casino game icon: single luxurious playing card face-up showing a large ornate number 9 and a club suit symbol, the card has an elegant dark blue velvet border with thin gold trim, deep midnight blue background with subtle sapphire glow, ultra-close macro view of the card center, sophisticated and exclusive casino atmosphere, photorealistic render, no text, no UI, square format, luxury baccarat icon`
  },

  {
    file: 'icon-sports.png',
    size: '1024x1024',
    prompt: `Casino sports betting icon: a classic black-and-white soccer football frozen perfectly centered in frame, the ball glows with golden light from within, subtle motion blur on hexagonal panels suggesting fast spin, deep pure black background, warm amber and gold particle glow surrounding the ball, ultra-photorealistic render, no text, no stadium, no players — purely the glowing ball in darkness, square format, luxury casino sports icon`
  },

  {
    file: 'icon-hilo.png',
    size: '1024x1024',
    prompt: `Casino Hi-Lo card prediction icon: a single face-down playing card with ornate gold back pattern centered in frame, directly above it a bold neon GREEN arrow pointing UP (⬆), directly below it a bold neon RED arrow pointing DOWN (⬇), the two arrows glow intensely against pitch black background, the card sits between them glowing with soft golden light, ultra-clean composition, no table, no chips, no casino elements — purely the card and two neon arrows, photorealistic render, square format`
  },

  {
    file: 'icon-limbo.png',
    size: '1024x1024',
    prompt: `Casino Limbo multiplier game icon: a glowing cyan digital display showing the text "7.77x" in large bold Orbitron-style font, electric blue and cyan neon light, the number pulses with energy against a pure black background, thin electric arcs surround the display like a Tesla coil, minimalist design — purely the glowing multiplier number in darkness, no people, no casino table, ultra-clean neon aesthetic, photorealistic render, square format`
  },

  {
    file: 'icon-pyramid.png',
    size: '1024x1024',
    prompt: `Casino Pyramid Drop game icon: a perfect golden Egyptian pyramid centered in frame, the pyramid built from solid gold with deep etched hieroglyph lines on its faces, at the very apex a blazing all-seeing eye glows with amber and orange divine light, deep black desert night background, the pyramid radiates warm golden aura from its base, dramatic divine lighting from above, ultra-photorealistic render, no text, no UI, square format, luxury Egyptian casino icon`
  },

  // ══════════════════════════════════════════
  // MINIATŪROS (1024x1792) — naujos unikalios
  // ══════════════════════════════════════════

  {
    file: 'thumb-dragontower.png',
    size: '1024x1792',
    prompt: `Casino Dragon Tower game: a towering dark stone fortress rising through storm clouds, the tower has multiple glowing floors/levels each lit with amber lanterns, at the very TOP of the tower a massive horned dragon head glows with infernal orange fire breathing downward, the dragon has black scales with ember-red glow between them, a narrow glowing path/ladder ascends through the floors upward toward the dragon, dark stormy sky with lightning, deep purple and black background with orange fire accents, the composition reads vertically BOTTOM=safe floors TOP=dragon danger, ultra-premium dark luxury game art, no text, no UI, vertical portrait, photorealistic`
  },

  {
    file: 'thumb-slots-classic.png',
    size: '1024x1792',
    prompt: `Casino classic slot machine: a vintage single-armed bandit slot machine rendered in warm gold and chrome, three spinning reels visible through a glass window showing triple lucky 7s aligned perfectly (7-7-7), golden coins exploding outward from the payout tray at the bottom, the machine has an art deco style with ornate golden trim and a large jackpot lever on the right side, deep crimson red background with warm gold light, coin shower effect, ultra-premium dark luxury casino advertisement, dramatic golden spotlights from above, no text overlays, no UI, vertical portrait, photorealistic hyper-detailed render`
  },

];

async function generate(item) {
  console.log(`⚙️  Generuoju: ${item.file}...`);
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: item.prompt,
      n: 1,
      size: item.size,
      quality: 'hd',
      style: 'vivid',
      response_format: 'url',
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const url = data.data[0].url;
  const filePath = path.join(OUT, item.file);
  await downloadFile(url, filePath);
  console.log(`  ✅ Išsaugota: public/img/${item.file}`);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
}

async function main() {
  console.log('\n🏺 HATHOR — trūkstamos ikonos + naujos miniatūros\n');
  console.log('📌 Ikonos (1024×1024): blackjack, baccarat, sports, hilo, limbo, pyramid');
  console.log('📌 Miniatūros (1024×1792): dragon-tower, slots-classic\n');
  let ok = 0, fail = 0;
  for (const item of IMAGES) {
    try {
      await generate(item);
      ok++;
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      console.error(`  ❌ Klaida (${item.file}): ${err.message}`);
      fail++;
    }
  }
  console.log(`\n══════════════════════════════════`);
  console.log(`✅ Pavyko: ${ok} | ❌ Nepavyko: ${fail}`);
  console.log(`══════════════════════════════════\n`);
}

main().catch(console.error);
