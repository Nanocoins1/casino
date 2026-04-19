// HATHOR Royal Casino — DALL-E 3 naujų vaizdų generatorius
// Paleidimas: node generate-new-images.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const BASE = 'ultra premium dark luxury casino art, deep black background (#050508), warm gold and amber dramatic lighting, cinematic render quality, hyper-detailed, no text, no UI, no watermark, professional game art';

const IMAGES = [

  // ── DRAGON CRASH — atskiras nuo paprasto Crash ─────────────────────
  {
    file: 'thumb-dragon.png',
    size: '1024x1024',
    prompt: `Massive crimson and obsidian dragon in full rage descent, wings folded back like a missile, mechanical-organic hybrid body with glowing magma cracks along scales, jaw open releasing a torrent of liquid gold fire, dramatic extreme low angle shot looking up, shattered gold coins and embers spiraling in its wake, deep red and black atmospheric smoke, apocalyptic sense of speed and destruction, ultra cinematic, ${BASE}`
  },

  // ── PREMIUM POKER — aukšti statymai, violetinis tonas ──────────────
  {
    file: 'thumb-prempoker.png',
    size: '1024x1024',
    prompt: `Ultra-exclusive VIP poker room close-up, royal flush hand (Ace through Ten of spades) fanned dramatically on deep purple velvet table, each card edged with amethyst-colored holographic foil, massive stack of black and violet casino chips with gold trim beside the hand, single overhead crystal chandelier casting prismatic purple light across the scene, shallow depth of field, ultra-luxury atmosphere, ${BASE}`
  },

  // ── VIDEO POKER — retro neon terminalas ────────────────────────────
  {
    file: 'thumb-videopoker.png',
    size: '1024x1024',
    prompt: `Retro-futuristic video poker terminal close-up, glowing neon blue screen displaying a winning hand (four aces), vintage CRT monitor aesthetic with scan lines, chrome machine body with blue LED strips, HOLD buttons glowing cobalt blue, coin slot gleaming gold, dark arcade room background with subtle blue neon reflections, cyberpunk meets classic casino aesthetic, ${BASE}`
  },

  // ── MINES — nauja versija su sprogimo momentu ──────────────────────
  {
    file: 'thumb-mines.png',
    size: '1024x1024',
    prompt: `Top-down view of a 5x5 mine grid, dark obsidian tiles with gold trim, several tiles already flipped revealing sparkling sapphire and ruby gems glowing intensely, center tile dramatically exploding — golden bomb casing mid-detonation with a brilliant white-gold shockwave radiating outward, gem fragments and gold coins scattered in the blast radius, high-tension game art style, dramatic lighting with explosion glow, ${BASE}`
  },

  // ── PROMO: BONUS kortelės fonas (1792x1024) ─────────────────────────
  {
    file: 'promo-bonus.png',
    size: '1792x1024',
    prompt: `Cinematic luxury casino bonus scene, giant ornate gift box wrapped in deep black velvet with thick gold ribbon exploding open, thousands of gold coins and gemstones erupting upward in a fountain of light, dramatic god-rays of warm amber light from above, scattered playing cards and casino chips in the explosion, bokeh background of blurred casino lights, extreme depth of field, epic prize reveal moment, ${BASE}`
  },

  // ── PROMO: VIP / CASHBACK kortelės fonas (1792x1024) ────────────────
  {
    file: 'promo-vip.png',
    size: '1792x1024',
    prompt: `Ultra-luxury VIP casino throne room, ornate golden crown hovering above a velvet-covered pedestal, surrounded by floating amethyst and diamond gemstones, deep purple and black marble background, dramatic backlighting creating a halo of violet-gold light around the crown, reflected in polished black floor, intricate gold filigree architecture visible in background, regal and exclusive atmosphere, ${BASE}`
  },

  // ── PROMO: DIENOS PRIZAS kortelės fonas (1792x1024) ─────────────────
  {
    file: 'promo-daily.png',
    size: '1792x1024',
    prompt: `Dynamic casino daily reward scene, a brilliant emerald-green lightning bolt striking down onto a floating prize sphere of swirling gold coins and glowing green crystals, radiating electric energy outward in circular arcs, dark atmospheric background with subtle grid lines like a game board, countdown timer aesthetic with gold numerals dissolving into light particles, sense of urgency and daily ritual, ${BASE}`
  },

  // ── ICON BADGES — 512x512 skaidrūs žaidimų ikonų žetonai ─────────────

  {
    file: 'icon-slots.png',
    size: '1024x1024',
    prompt: `A single perfect casino slot machine icon, three gold spinning reels showing lucky 7-7-7, Art Deco golden frame, neon amber glow behind the number sevens, deep black background, centered composition, hyper-detailed metallic render, suitable as a game icon badge, ${BASE}`
  },
  {
    file: 'icon-roulette.png',
    size: '1024x1024',
    prompt: `A perfectly rendered roulette wheel icon, top-down view, gold numbered segments gleaming, single white ball resting on a winning number, dramatic single spotlight from above, deep black background, centered composition, game icon badge style, ${BASE}`
  },
  {
    file: 'icon-crash.png',
    size: '1024x1024',
    prompt: `A bold casino crash game icon — a golden rocket ship or arrow shooting steeply upward through a burst of gold coins and sparks, bold multiplier energy, deep black background, centered icon composition, ultra-detailed metallic gold render, ${BASE}`
  },
  {
    file: 'icon-mines.png',
    size: '1024x1024',
    prompt: `A dramatic casino mines game icon — a single gleaming golden bomb with a lit fuse, surrounded by scattered gem tiles in a dark grid, tension and mystery, deep black background, centered game icon, ${BASE}`
  },
  {
    file: 'icon-dice.png',
    size: '1024x1024',
    prompt: `Two solid gold casino dice showing double sixes, tumbling through the air, perfect cube geometry with deep black pips, amber rim lighting, deep black background, centered icon composition, ${BASE}`
  },
  {
    file: 'icon-poker.png',
    size: '1024x1024',
    prompt: `A royal flush poker hand icon — five golden playing cards fanned perfectly (Ace King Queen Jack Ten of spades), gold foil card edges, deep black background, centered icon composition, dramatic single spotlight, ${BASE}`
  },
  {
    file: 'icon-coin.png',
    size: '1024x1024',
    prompt: `A spinning gold casino coin icon perfectly centered, one face showing an ancient sun emblem, the other showing a crescent moon, coin edge catching brilliant light with motion blur, deep black background, macro photography style, ${BASE}`
  },
  {
    file: 'icon-wheel.png',
    size: '1024x1024',
    prompt: `An ornate luxury prize wheel icon, gold and black alternating segments, gilded spokes, single gold arrow pointer at top, dramatic spotlight reflection arc across the entire surface, deep black background, centered icon, ${BASE}`
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
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log(`\n🎨 HATHOR — naujų vaizdų generatorius`);
  console.log(`📁 Išsaugoma: ${OUT}`);
  console.log(`📸 Viso naujų vaizdų: ${IMAGES.length}\n`);

  let ok = 0, fail = 0;
  for (const item of IMAGES) {
    try {
      await generate(item);
      ok++;
      await new Promise(r => setTimeout(r, 1500)); // rate limit
    } catch (err) {
      console.error(`  ❌ Klaida (${item.file}): ${err.message}`);
      fail++;
    }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`✅ Pavyko: ${ok} | ❌ Nepavyko: ${fail}`);
  console.log(`📁 Vaizdai: public/img/`);
  console.log(`═══════════════════════════════════════\n`);
}

main().catch(console.error);
