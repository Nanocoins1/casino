// HATHOR — VISOS 19 žaidimų ikonų su VIENU konsistentišku stiliumi
// Stilius: vienas objektas, juodas fonas, auksinis žėrėjimas, fotorealistinis
// Kaina: 19 × $0.08 = ~$1.52

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

// Bazinis stilius — VIENODAS visiems
const BASE = 'pure jet-black background, warm golden amber volumetric glow radiating around the object, dramatic chiaroscuro lighting, ultra-sharp photorealistic 8K render, no text, no UI, no watermarks, perfect square 1:1 format, luxury dark casino aesthetic';

const ICONS = [
  {
    file: 'icon-slots.png',
    desc: `three golden slot machine reels showing lucky 7-7-7 aligned, the reels glow with red and gold neon, classic casino slot machine reel window close-up, coins spilling, ${BASE}`
  },
  {
    file: 'icon-roulette.png',
    desc: `roulette wheel overhead view, single white ball resting on red number 7, the wheel spins with motion blur on the outer ring, black and red numbered pockets, golden dividers between pockets, ${BASE}`
  },
  {
    file: 'icon-blackjack.png',
    desc: `two playing cards fanned: Ace of Spades (large A and ♠) overlapping King of Hearts (K and ♥), the combination shows 21, gold-edged cards with ornate backs, ${BASE}`
  },
  {
    file: 'icon-poker.png',
    desc: `five playing cards in a royal flush hand: Ace King Queen Jack Ten all in Spades, fanned out perfectly, gold-bordered cards, a single gold chip in front, ${BASE}`
  },
  {
    file: 'icon-prempoker.png',
    desc: `single magnificent golden crown encrusted with rubies and diamonds floating in darkness, the crown is the sole object, jewels catch the light creating sparkle rays, deep purple glow from below, ${BASE}`
  },
  {
    file: 'icon-videopoker.png',
    desc: `retro arcade video poker machine screen showing a winning hand of four aces, the CRT screen glows green, pixelated card graphics on the screen, chrome machine bezel, ${BASE}`
  },
  {
    file: 'icon-crash.png',
    desc: `silver and gold rocket ship launching straight upward, bright engine fire and smoke trail below, motion blur on the rocket body suggesting extreme speed, sparks and embers, ${BASE}`
  },
  {
    file: 'icon-dragon.png',
    desc: `extreme close-up of a dragon's eye — massive amber vertical slit pupil with gold and orange iris, reptilian scales surrounding the eye with ember glow between them, fire reflected in the pupil, ${BASE}`
  },
  {
    file: 'icon-mines.png',
    desc: `single large emerald green gemstone diamond-cut gem floating in air, a dark metallic mine sphere with a spike visible behind it in shadow, the gem glows with electric green internal light, ${BASE}`
  },
  {
    file: 'icon-dice.png',
    desc: `single oversized golden die showing the number SIX (6 dots) facing the camera perfectly straight, the die has mirror-polished gold faces with deep engraved dots painted in black, ${BASE}`
  },
  {
    file: 'icon-coin.png',
    desc: `single large gold coin spinning in mid-air seen from a slight angle showing the heads side — an ornate king's portrait embossed in deep relief, the coin edge shows motion blur from spinning, ${BASE}`
  },
  {
    file: 'icon-wheel.png',
    desc: `close-up of a luxurious prize wheel showing colorful segments — gold, red, blue, green wedges with glowing neon outlines, the wheel is mid-spin with a blur, golden pointer at top, ${BASE}`
  },
  {
    file: 'icon-keno.png',
    desc: `single white lottery bingo ball with bold black number 7 printed on it, the ball is translucent with internal glow, floating above a dark surface, other balls blurred behind it, ${BASE}`
  },
  {
    file: 'icon-krioklis.png',
    desc: `single small silver ball dropping through a triangular arrangement of golden metallic pegs on a plinko board, motion blur on the ball, golden trails where it ricocheted, pegboard visible, ${BASE}`
  },
  {
    file: 'icon-blackjack.png',
    desc: `two playing cards fanned: Ace of Spades (large A and ♠) overlapping King of Hearts (K and ♥), the combination shows 21, gold-edged cards with ornate backs, ${BASE}`
  },
  {
    file: 'icon-baccarat.png',
    desc: `single elegant playing card face-up showing a large bold number 9 and a black club ♣ symbol, the card has a thin gold border, sapphire blue glow emanating from behind the card, ${BASE}`
  },
  {
    file: 'icon-sports.png',
    desc: `classic black and white football soccer ball perfectly centered and floating, golden light emanating from within the ball through the hexagonal seams, subtle rotation motion blur on the panels, ${BASE}`
  },
  {
    file: 'icon-hilo.png',
    desc: `Ace of Spades playing card centered, directly above it a bold glowing neon GREEN arrow pointing UP, directly below it a bold glowing neon RED arrow pointing DOWN, three objects stacked vertically, no table no chips, ${BASE}`
  },
  {
    file: 'icon-limbo.png',
    desc: `glowing digital display showing the multiplier text "7.77×" in large bold futuristic font, electric cyan and blue neon light, the display pulses with energy, thin electric lightning arcs surround it, ${BASE}`
  },
  {
    file: 'icon-pyramid.png',
    desc: `golden Egyptian pyramid perfectly centered, built from solid reflective gold with hieroglyphs etched on the faces, at the apex a blazing all-seeing eye radiating amber divine light and rays, ${BASE}`
  },
];

// Remove duplicate blackjack (was listed twice by mistake — keep unique set)
const unique = [];
const seen = new Set();
for (const ic of ICONS) {
  if (!seen.has(ic.file)) { seen.add(ic.file); unique.push(ic); }
}

async function generate(item) {
  process.stdout.write(`⚙️  ${item.file}... `);
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'dall-e-3', prompt: item.desc, n: 1,
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
  console.log(`\n🎮 HATHOR — ${unique.length} žaidimų ikonos (vienodas stilius)\n`);
  let ok = 0, fail = 0;
  for (const item of unique) {
    try {
      await generate(item);
      ok++;
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      console.error(`❌ ${item.file}: ${err.message}`);
      fail++;
    }
  }
  console.log(`\n✅ Pavyko: ${ok} | ❌ Nepavyko: ${fail}\n`);
}
main().catch(console.error);
