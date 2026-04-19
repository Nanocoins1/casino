// HATHOR — Avatarų + kategorijų ikonų + favicon + specialių ekranų generavimas
// 12 avatarų + 5 cat ikonos + 1 favicon + 1 loading screen + 1 win screen = 20 vaizdų
// Kaina: 20 × $0.08 = ~$1.60

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

const AV_BASE = 'square portrait avatar for luxury dark online casino, dramatic dark background, cinematic lighting, bold distinctive character, ultra-detailed, no text, no watermarks, 1:1 square format, game avatar style';

const IMAGES = [

  // ══════════════════════════════════════════
  // AVATARŲ PORTRETAI (12) — žaidėjų pasirinkimas
  // ══════════════════════════════════════════
  {
    file: 'av-lion.png',
    prompt: `majestic male lion face ultra close-up, amber eyes glowing, golden mane surrounding the face, deep black background, warm amber rim lighting on fur, regal and powerful expression, ${AV_BASE}`
  },
  {
    file: 'av-tiger.png',
    prompt: `fierce Bengal tiger face close-up, bright orange fur with sharp black stripes, electric blue eyes glowing, dark jungle background with cyan mist, bold intimidating stare, ${AV_BASE}`
  },
  {
    file: 'av-wolf.png',
    prompt: `silver grey wolf face close-up, piercing yellow eyes, dark stormy background with blue-grey mist, fur blown by wind, wild and cunning expression, moonlight rim lighting, ${AV_BASE}`
  },
  {
    file: 'av-eagle.png',
    prompt: `bald eagle face close-up, sharp intense yellow eyes, white feathers on head and dark brown on body, sky background dark blue with stars, powerful and noble expression, golden light, ${AV_BASE}`
  },
  {
    file: 'av-dragon.png',
    prompt: `red dragon head close-up, glowing orange eyes with vertical slit pupils, crimson and black scales, fire coming from the nostrils, deep black background with ember glow, ancient fearsome creature, ${AV_BASE}`
  },
  {
    file: 'av-king.png',
    prompt: `luxurious medieval king portrait, wearing an ornate golden crown with rubies, regal face with short beard, dark velvet robe with gold trim, dim candlelit throne room background, authoritative and wise expression, ${AV_BASE}`
  },
  {
    file: 'av-queen.png',
    prompt: `elegant casino queen portrait, a beautiful woman wearing a jeweled tiara and sapphire necklace, dark background with purple and blue lighting, mysterious powerful expression, ornate costume, ${AV_BASE}`
  },
  {
    file: 'av-phantom.png',
    prompt: `masked phantom figure portrait, wearing a white half-mask covering the left face, red rose on dark coat lapel, deep shadows with dramatic single candle light, mysterious and theatrical, deep black background, ${AV_BASE}`
  },
  {
    file: 'av-viking.png',
    prompt: `fierce Norse viking warrior portrait, braided beard and hair, wearing a horned iron helmet, intense blue eyes, weathered battle-worn face, dramatic storm clouds behind, amber fire light, ${AV_BASE}`
  },
  {
    file: 'av-pharaoh.png',
    prompt: `Egyptian pharaoh portrait, wearing the golden nemes headdress with cobra and vulture symbols, kohl-lined eyes, golden collar and pectoral jewelry, dark ancient temple background with hieroglyphs, divine and powerful, ${AV_BASE}`
  },
  {
    file: 'av-ace.png',
    prompt: `stylized playing card character portrait, a cool figure with an Ace of Spades card motif — black suit, spade symbol on lapel, slicked back dark hair, one eye covered by a monocle, dark background with gold card suit symbols, ${AV_BASE}`
  },
  {
    file: 'av-diamond.png',
    prompt: `sleek diamond heist character portrait, wearing all-black outfit, a large flawless blue diamond reflected in sunglasses, confident smirk, dark background with blue diamond light refraction patterns, ${AV_BASE}`
  },

  // ══════════════════════════════════════════
  // KATEGORIJŲ IKONOS (5) — tabs mygtukai
  // Mažos, aiškios, tamsus fonas + aukso žėrėjimas
  // ══════════════════════════════════════════
  {
    file: 'cat-all.png',
    prompt: `four playing cards fanned out showing Ace Spades King Hearts Queen Diamonds Jack Clubs, gold borders, centered composition, pure black background, golden glow, clean minimal casino icon, square format, no text`
  },
  {
    file: 'cat-tables.png',
    prompt: `round casino poker table viewed from directly above, green felt surface, gold trim edge, a small pile of gold chips in center, minimal clean overhead view, pure black background, square format, no text`
  },
  {
    file: 'cat-slots.png',
    prompt: `close-up of a single slot machine reel window showing 7-7-7 aligned in the center row, neon gold and red glow, chrome machine frame, pure black background, square format, no text`
  },
  {
    file: 'cat-crash.png',
    prompt: `small gold rocket with fire trail shooting upward diagonally, behind it a glowing neon multiplier curve line going up, electric gold glow, pure black background, minimal icon style, square format, no text`
  },
  {
    file: 'cat-sports.png',
    prompt: `football soccer ball and a basketball side by side, both glowing with golden light, pure black background, clean minimal sports icon, square format, no text`
  },

  // ══════════════════════════════════════════
  // FAVICON (1) — gražus logotipas
  // ══════════════════════════════════════════
  {
    file: 'favicon.png',
    prompt: `luxury casino brand logo icon: a bold stylized letter H made of solid gold with diamond-cut facets, the letter glows with warm amber light, surrounded by small diamond sparkles, pure black background, ultra-sharp minimal design, the letter H dominates the square frame, no other text, no decorations — purely the golden H, hyper-detailed photorealistic render, square format`
  },

  // ══════════════════════════════════════════
  // WIN CELEBRATION (1) — laimėjimo ekranas
  // ══════════════════════════════════════════
  {
    file: 'win-celebration.png',
    prompt: `casino jackpot win celebration: an explosion of golden coins bursting outward from the center in all directions, each coin glowing and spinning, rainbow confetti streamers mixed with the coins, two champagne bottles uncorking with foam, dramatic golden light rays from above like a spotlight, deep black background, pure joy and excitement, ultra-photorealistic, square format, no text`
  },

  // ══════════════════════════════════════════
  // LOADING SCREEN (1) — pradinė animacija
  // ══════════════════════════════════════════
  {
    file: 'loading-screen.png',
    prompt: `luxury dark casino loading screen background: Egyptian gold motif with the letter H prominently centered in massive golden art deco typography, surrounded by ornate geometric patterns, playing card suits (♠♥♦♣) in each corner in gold, subtle glowing roulette wheel in the background, pyramid silhouette, deep black gradient background, ultra-luxury brand identity, cinematic depth, no loading bar no UI just the decorative background, square format`
  },

];

async function generate(item) {
  process.stdout.write(`⚙️  ${item.file}... `);
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'dall-e-3', prompt: item.prompt, n: 1,
      size: '1024x1024', quality: 'hd', style: 'vivid', response_format: 'url',
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const url = data.data[0].url;
  await downloadFile(url, path.join(OUT, item.file));
  console.log(`✅`);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, r => { r.pipe(file); file.on('finish', () => { file.close(); resolve(); }); })
      .on('error', err => { fs.unlink(dest, () => {}); reject(err); });
  });
}

async function main() {
  console.log(`\n🎨 HATHOR — avatarų, kategorijų, favicon ir specialieji (${IMAGES.length} vaizdų)\n`);
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
