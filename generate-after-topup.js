// HATHOR — paleisk ŠĮ SCRIPTĄ po OpenAI API top-up
// Generuoja: 7 likusias žaidimų ikonas + 20 avatarų/ekranų
// Kaina: ~$2.16

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

const BASE = 'pure jet-black background, warm golden amber volumetric glow, dramatic chiaroscuro lighting, ultra-sharp photorealistic 8K render, no text, no UI, no watermarks, perfect square 1:1 format, luxury dark casino aesthetic';
const AV_BASE = 'square portrait avatar for luxury dark online casino, dramatic dark background, cinematic lighting, bold distinctive character, ultra-detailed, no text, no watermarks, 1:1 square format';

const IMAGES = [

  // ══════ 7 LIKUSIOS ŽAIDIMŲ IKONOS ══════
  {file:'icon-coin.png',    prompt:`single large gold coin mid-spin seen from slight angle, heads side showing ornate king portrait in deep relief, spinning edge motion blur, ${BASE}`},
  {file:'icon-wheel.png',   prompt:`close-up luxury prize wheel showing gold red blue green wedge segments with neon outlines, golden pointer at top, mid-spin blur on outer ring, ${BASE}`},
  {file:'icon-keno.png',    prompt:`single translucent white lottery bingo ball with bold black number 7, internal glow, floating with other blurred balls behind, ${BASE}`},
  {file:'icon-krioklis.png',prompt:`small silver ball dropping through triangular arrangement of golden metallic pegs on plinko board, motion blur on ball, golden ricochet trails, ${BASE}`},
  {file:'icon-baccarat.png',prompt:`single elegant playing card face-up showing large bold number 9 and black club symbol, thin gold border, sapphire blue glow behind, ${BASE}`},
  {file:'icon-hilo.png',    prompt:`Ace of Spades playing card centered, directly above bold glowing neon GREEN upward arrow, directly below bold glowing neon RED downward arrow, three items stacked vertically, no chips no table, ${BASE}`},
  {file:'icon-pyramid.png', prompt:`golden Egyptian pyramid centered, solid reflective gold with etched hieroglyphs, at apex blazing all-seeing eye radiating amber divine light and rays, ${BASE}`},

  // ══════ 12 AVATARŲ ══════
  {file:'av-lion.png',    prompt:`majestic male lion face ultra close-up, amber glowing eyes, golden mane, deep black background, warm amber rim lighting, regal powerful expression, ${AV_BASE}`},
  {file:'av-tiger.png',   prompt:`fierce Bengal tiger face close-up, orange fur black stripes, electric blue glowing eyes, dark background with cyan mist, bold intimidating stare, ${AV_BASE}`},
  {file:'av-wolf.png',    prompt:`silver grey wolf face close-up, piercing yellow eyes, dark stormy background with blue-grey mist, fur blown by wind, wild cunning expression, moonlight rim lighting, ${AV_BASE}`},
  {file:'av-eagle.png',   prompt:`bald eagle face close-up, sharp intense yellow eyes, white head feathers dark brown body, dark blue starry background, noble powerful expression, ${AV_BASE}`},
  {file:'av-dragon.png',  prompt:`red dragon head close-up, glowing orange slit-pupil eyes, crimson black scales, fire from nostrils, black background with ember glow, ancient fearsome, ${AV_BASE}`},
  {file:'av-king.png',    prompt:`medieval king portrait, golden jeweled crown with rubies, regal bearded face, dark velvet robe gold trim, dim candlelit background, authoritative expression, ${AV_BASE}`},
  {file:'av-queen.png',   prompt:`elegant woman portrait, jeweled tiara sapphire necklace, dark purple-blue lighting background, mysterious powerful expression, ornate costume, ${AV_BASE}`},
  {file:'av-phantom.png', prompt:`masked phantom portrait, white half-mask covering left face, red rose on dark coat lapel, deep shadows single candle light, mysterious theatrical, ${AV_BASE}`},
  {file:'av-viking.png',  prompt:`fierce Norse viking warrior portrait, braided beard and hair, iron helmet, intense blue eyes, weathered battle face, storm clouds behind, amber fire light, ${AV_BASE}`},
  {file:'av-pharaoh.png', prompt:`Egyptian pharaoh portrait, golden nemes headdress with cobra and vulture symbols, kohl-lined eyes, gold collar jewelry, dark temple background with hieroglyphs, ${AV_BASE}`},
  {file:'av-ace.png',     prompt:`stylized playing card character portrait, Ace of Spades motif, black suit with spade symbol on lapel, slicked dark hair, monocle over one eye, gold card symbols in background, ${AV_BASE}`},
  {file:'av-diamond.png', prompt:`sleek character portrait wearing all-black outfit, large flawless blue diamond reflected in sunglasses, confident smirk, dark background with blue light refraction, ${AV_BASE}`},

  // ══════ KATEGORIJŲ IKONOS (5) ══════
  {file:'cat-all.png',    prompt:`four playing cards fanned: Ace Spades King Hearts Queen Diamonds Jack Clubs, gold borders, centered, pure black background, golden glow, minimal casino icon, square, no text`},
  {file:'cat-tables.png', prompt:`round casino poker table viewed from directly above, green felt, gold trim edge, small pile of gold chips center, minimal overhead view, pure black background, square, no text`},
  {file:'cat-slots.png',  prompt:`close-up single slot machine reel window showing 7-7-7 aligned, neon gold red glow, chrome frame, pure black background, square, no text`},
  {file:'cat-crash.png',  prompt:`gold rocket shooting upward diagonally with fire trail, glowing neon multiplier curve behind it, electric gold glow, pure black background, minimal icon, square, no text`},
  {file:'cat-sports.png', prompt:`football soccer ball and basketball side by side, golden light emanating from both, pure black background, clean minimal sports icon, square, no text`},

  // ══════ SPECIALŪS EKRANAI (2) ══════
  {file:'favicon.png',           prompt:`luxury casino brand logo icon: bold stylized letter H in solid gold with diamond-cut facets, warm amber glow, small diamond sparkles surrounding, pure black background, ultra-sharp minimal, H dominates square frame, no other text, square format`},
  {file:'win-celebration.png',   prompt:`casino jackpot win celebration: explosion of golden coins bursting outward from center in all directions, each coin glowing spinning, rainbow confetti streamers, two champagne bottles uncorking with foam, dramatic golden spotlight rays from above, pure black background, ultra-photorealistic, square format, no text`},
  {file:'loading-screen.png',    prompt:`luxury dark casino loading screen: letter H prominently centered in massive golden art deco typography, surrounded by ornate geometric patterns, playing card suits in corners in gold, subtle glowing roulette wheel background, pyramid silhouette, deep black gradient, ultra-luxury brand identity, no loading bar no UI, square format`},
];

async function generate(item) {
  process.stdout.write(`⚙️  ${item.file}... `);
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'dall-e-3', prompt: item.prompt, n: 1, size: '1024x1024', quality: 'hd', style: 'vivid', response_format: 'url' }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const url = data.data[0].url;
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(OUT, item.file));
    https.get(url, r => { r.pipe(file); file.on('finish', () => { file.close(); resolve(); }); }).on('error', reject);
  });
  console.log(`✅`);
}

async function main() {
  console.log(`\n🚀 HATHOR — ${IMAGES.length} vaizdai po top-up\n`);
  let ok = 0, fail = 0;
  for (const item of IMAGES) {
    try {
      await generate(item);
      ok++;
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      console.error(`❌ ${item.file}: ${err.message}`);
      fail++;
    }
  }
  console.log(`\n══════════════════════════════════`);
  console.log(`✅ Pavyko: ${ok} | ❌ Nepavyko: ${fail}`);
  console.log(`══════════════════════════════════\n`);
}
main().catch(console.error);
