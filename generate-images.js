// HATHOR Royal Casino — DALL-E 3 Image Generator
// Paleidimas: node generate-images.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Bazinis stiliaus aprašas — vieninga estetika
const BASE = 'ultra premium dark luxury casino art, deep black background (#050508), warm gold and amber dramatic lighting, cinematic render quality, hyper-detailed, no text, no UI, no watermark, professional game art';

const IMAGES = [
  // ── HATHOR MASCOT ─────────────────────────────────
  {
    file: 'hathor-mascot.png',
    size: '1024x1792',
    prompt: `An iconic casino mascot character: ancient Egyptian robot pharaoh, full body standing pose, tall and imposing, golden metallic armor plating with engraved hieroglyphs, pharaoh nemes headdress in dark bronze with alternating gold stripes, glowing amber almond-shaped eyes, scarab emblem on chest with pulsing golden power core, one arm elegantly raised holding a glowing gold coin, subtle levitation above ground with faint golden aura rings, dramatic volumetric god-rays of warm gold light from above, deep black background, ultra-detailed 3D character concept art, premium game mascot, photorealistic render, ${BASE}`
  },

  // ── ŽAIDIMŲ KORTELĖS (1024x1024) ──────────────────
  {
    file: 'thumb-slots.png',
    size: '1024x1024',
    prompt: `Luxury casino slot machine, extreme close-up of spinning golden reels, three 7s aligned, showers of gold coins exploding outward, glowing amber jackpot display, Art Deco decorative frame with gold leaf details, volumetric gold light beams, dramatic shadows, ${BASE}`
  },
  {
    file: 'thumb-roulette.png',
    size: '1024x1024',
    prompt: `Aerial close-up of a spinning roulette wheel in motion, gold numbered segments blurred with spin, single gleaming gold ball caught mid-roll on a black pocket, deep emerald felt table surrounding, dramatic top-down spotlight, chips glinting in gold light, ${BASE}`
  },
  {
    file: 'thumb-blackjack.png',
    size: '1024x1024',
    prompt: `Natural blackjack hand: ace of spades and a king of hearts face-up on dark leather table, gold-edged cards with subtle glow, stack of gold casino chips beside them, dealer's hand partially visible, cinematic side lighting creating long gold reflections, shallow depth of field, ${BASE}`
  },
  {
    file: 'thumb-poker.png',
    size: '1024x1024',
    prompt: `Royal flush in spades (A K Q J 10) fanned out dramatically on dark felt, high-stacked gold and black casino chips tower behind the cards, dim atmospheric casino lighting with warm amber spotlight on cards, cinematic composition, ${BASE}`
  },
  {
    file: 'thumb-crash.png',
    size: '1024x1024',
    prompt: `A massive golden dragon ascending steeply through a storm of gold coins and embers, wings spread wide, scales like polished gold metal, glowing amber eyes, a large glowing multiplier number (88.00x) dissolving into light above, dark atmospheric background with dramatic orange-gold light, explosive energy, ${BASE}`
  },
  {
    file: 'thumb-mines.png',
    size: '1024x1024',
    prompt: `Top-down game grid of 25 dark obsidian tiles, several tiles overturned revealing gleaming golden gems and diamonds, one tile reveals a stylized glowing red bomb with gold casing, tension and mystery, subtle golden grid lines, atmospheric dark lighting with gem reflections scattered across black surface, ${BASE}`
  },
  {
    file: 'thumb-sports.png',
    size: '1024x1024',
    prompt: `A football/soccer ball with liquid gold metallic finish suspended mid-air over a stadium at night, camera flashes creating constellation of lights in background, dramatic upward angle shot, gold light rays emanating from the ball, hyper-realistic sports photography style, ${BASE}`
  },
  {
    file: 'thumb-wheel.png',
    size: '1024x1024',
    prompt: `Ornate luxury prize wheel slightly tilted toward camera, segments alternating between deep black and hammered gold with elegant lettering, gilded filigree spokes, single gold arrow pointer at top, single dramatic spotlight from above creating a gleaming reflection arc across the entire wheel surface, ${BASE}`
  },
  {
    file: 'thumb-dice.png',
    size: '1024x1024',
    prompt: `Two oversized casino dice (showing 6 and 6) made of solid gold with deep black pips, tumbling through the air trailing golden light streaks, scattered gold coins below catching reflections, dramatic macro lens perspective, black background with warm amber rim lighting, ${BASE}`
  },
  {
    file: 'thumb-hilo.png',
    size: '1024x1024',
    prompt: `Playing card reveal moment: a glowing gold Ace of Spades dramatically turning face-up, surrounded by motion blur of a card deck, golden arrows pointing up and down on either side, light rays emanating from the glowing card face, dark atmospheric background, ${BASE}`
  },
  {
    file: 'thumb-limbo.png',
    size: '1024x1024',
    prompt: `Abstract visualization of a multiplier bar graph going to infinity, a glowing golden line shooting steeply upward from near zero to the top of frame leaving a brilliant amber trail, deep space-like dark background with floating gold number particles (1.01x ... 99.99x), sense of extreme risk and infinite possibility, ${BASE}`
  },
  {
    file: 'thumb-baccarat.png',
    size: '1024x1024',
    prompt: `Baccarat table close-up, two hands of cards dealt on green baize: player hand (8 total) and banker hand (9 total), gold scoreboard detail visible at edge, crystal clear playing cards with gold foil borders, elegant chandelier reflection visible on polished table surface, luxury high-roller atmosphere, ${BASE}`
  },
  {
    file: 'thumb-coinflip.png',
    size: '1024x1024',
    prompt: `A large gold coin spinning in slow motion, perfectly centered, one face showing a sun emblem (heads), the other showing a moon emblem (tails), coin edges catching brilliant light creating a halo effect, crisp motion blur on spinning edge, deep black background, dramatic macro photography style, ${BASE}`
  },
  {
    file: 'thumb-keno.png',
    size: '1024x1024',
    prompt: `Keno lottery board with glowing golden numbered balls, 20 balls floating mid-air with amber inner glow lighting each number, arranged in a dramatic arc formation, empty lottery ticket partially visible below with some numbers highlighted in gold, lottery machine glass tube visible in background, ${BASE}`
  },
  {
    file: 'thumb-pyramid.png',
    size: '1024x1024',
    prompt: `Ancient Egyptian stone pyramid seen from dramatic low angle at night, glowing golden hieroglyphs illuminating its face, treasure gold coins raining down from the apex where a brilliant light beam shoots skyward, scarab beetles made of gold hovering around the peak, atmospheric desert haze, cinematic epic scale, ${BASE}`
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
  console.log(`\n🎨 HATHOR — DALL-E 3 vaizdų generatorius`);
  console.log(`📁 Išsaugoma: ${OUT}`);
  console.log(`📸 Viso vaizdų: ${IMAGES.length}\n`);

  let ok = 0, fail = 0;
  for (const item of IMAGES) {
    try {
      await generate(item);
      ok++;
      // Pauze tarp užklausų (rate limit)
      await new Promise(r => setTimeout(r, 1200));
    } catch (err) {
      console.error(`  ❌ Klaida (${item.file}): ${err.message}`);
      fail++;
    }
  }

  console.log(`\n═══════════════════════════════`);
  console.log(`✅ Pavyko: ${ok} | ❌ Nepavyko: ${fail}`);
  console.log(`📁 Vaizdai: public/img/`);
  console.log(`═══════════════════════════════\n`);
}

main().catch(console.error);
