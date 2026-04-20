// generate-lobby-icons.js — HATHOR Casino lobby & game icons (DALL-E 3 HD)
require('dotenv').config();
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const sharp = require('sharp');

const API_KEY = process.env.OPENAI_API_KEY;
const IMG = path.join(__dirname, 'public', 'img');

function dalle(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model:'dall-e-3', prompt, n:1, size:'1024x1024',
      response_format:'b64_json', quality:'hd', style:'vivid' });
    const req = https.request({
      hostname:'api.openai.com', path:'/v1/images/generations', method:'POST',
      headers:{ 'Content-Type':'application/json',
        'Authorization':`Bearer ${API_KEY}`, 'Content-Length':Buffer.byteLength(body) }
    }, res => {
      let d=''; res.on('data',c=>d+=c);
      res.on('end',()=>{
        try {
          const j=JSON.parse(d);
          if(j.error){reject(new Error(j.error.message));return;}
          resolve(Buffer.from(j.data[0].b64_json,'base64'));
        } catch(e){reject(e);}
      });
    });
    req.on('error',reject); req.write(body); req.end();
  });
}

const delay = ms => new Promise(r=>setTimeout(r,ms));

// Base style applied to every prompt
const BASE = `
Centered on pure matte black background. Single subject only, no text, no labels.
Photorealistic, dramatic cinematic studio lighting from above, 8K quality.
Luxury casino aesthetic — gold, obsidian black, deep amber glow.`;

const ICONS = [
  {
    file: 'icon-deposit.png',
    prompt: `Premium casino deposit icon.${BASE}
A single gleaming gold coin mid-air with a glowing downward arrow beside it — symbolizing deposit / adding funds.
The coin: thick, beveled edge, pure 18-karat gold with an Egyptian Eye of Horus engraved on its face, warm amber light catching the edges.
The arrow: molten gold, 3D extruded, pointing downward with a bright golden tip. Warm radiant gold glow behind both objects.`
  },
  {
    file: 'icon-bonus.png',
    prompt: `Premium casino bonus icon.${BASE}
A luxurious gift box / treasure chest bursting open, overflowing with gold coins, golden sparkles and light rays.
The box is wrapped in deep crimson velvet with a thick gleaming gold ribbon. The coins pouring out catch brilliant studio light.
Dramatic explosion of golden particles upward from the opening. Pure matte black background.`
  },
  {
    file: 'icon-all-games.png',
    prompt: `Premium casino all-games icon.${BASE}
A perfect arrangement of classic casino objects: a gleaming gold playing card (Ace of Spades) front-center,
a polished gold casino chip stacked to the left, a miniature golden dice to the right.
All rendered in photorealistic 18-karat gold with deep mirror reflections. Cinematic overhead lighting.`
  },
  {
    file: 'icon-slots.png',
    prompt: `Premium casino slot machine icon.${BASE}
A miniature gold slot machine front view — three spinning reels showing three golden 7s aligned (jackpot!).
The cabinet is crafted from polished obsidian black with thick gold trim, beveled edges.
The reels glow with warm golden backlight. Gold coin spills out from the bottom tray.`
  },
  {
    file: 'icon-poker.png',
    prompt: `Premium casino poker icon.${BASE}
A perfectly fanned hand of five playing cards — Royal Flush in gold: 10, J, Q, K, A of hearts.
The cards are rendered as thick premium gold-foil playing cards — the suit symbols are embossed gold,
card backs are deep black with gold geometric pattern. Cards fan outward with dramatic depth-of-field.`
  },
  {
    file: 'icon-blackjack.png',
    prompt: `Premium casino blackjack icon.${BASE}
Two playing cards — an Ace and a King — laid slightly overlapping, both face-up. Classic Blackjack 21.
Cards are thick premium gold-foil: the Ace of Spades has an ornate gold spade, the King has a gold crown.
Below the cards: the number 21 in 3D gold numerals, barely visible. Dark background with subtle gold glow.`
  },
  {
    file: 'icon-roulette.png',
    prompt: `Premium casino roulette icon.${BASE}
A roulette wheel viewed from a 35-degree angle above, perfectly centered.
The wheel is crafted from polished obsidian and 18-karat gold — alternating black and deep red pockets with gold dividers,
gold number plate ring, gold center hub. A single silver/chrome ball sits in a red pocket.
Dramatic overhead spotlight creates brilliant gold reflections.`
  },
  {
    file: 'icon-crash.png',
    prompt: `Premium casino crash game icon.${BASE}
A stylized golden rocket ship launching upward at a 45-degree angle, leaving a trail of gold and amber flame.
The rocket body is polished gold metal with fine engraved details, the exhaust flame is vivid amber-gold.
Below the rocket: a rising gold curve line (like a stock chart going up). Pure black background with golden glow.`
  },
  {
    file: 'icon-pyramid-game.png',
    prompt: `Premium casino pyramid game icon.${BASE}
A gleaming gold Egyptian pyramid, perfectly centered, viewed at slight elevation angle.
The pyramid is solid 18-karat gold — each stone block shows fine beveling and gold-on-gold texture variations.
The pyramid apex emits a powerful golden light beam upward. The surface reflects dramatic studio lighting.
Small golden coins scattered at the base. Pure black background.`
  },
  {
    file: 'icon-vip.png',
    prompt: `Premium casino VIP icon.${BASE}
A majestic golden crown, centered, viewed slightly from above.
The crown is crafted from solid 18-karat gold — ornate Gothic arches, sharp spires with ruby gemstones,
diamond inlays along the base ring. The gold surface has an incredible mirror polish catching warm light.
Below the crown: a subtle V-I-P shape in faint gold shadow.`
  },
];

(async () => {
  console.log(`🎨  Generating ${ICONS.length} lobby icons with DALL-E 3 HD...\n`);

  for (let i = 0; i < ICONS.length; i++) {
    const ic = ICONS[i];
    const outFile = path.join(IMG, ic.file);
    console.log(`[${i+1}/${ICONS.length}] ${ic.file}...`);

    try {
      const buf = await dalle(ic.prompt);
      console.log(`  Raw: ${Math.round(buf.length/1024)}KB`);

      // Save at 128×128 (2× Retina for 64px display)
      await sharp(buf)
        .resize(128, 128, { fit:'cover', position:'centre' })
        .png({ compressionLevel:9 })
        .toFile(outFile);

      const sz = fs.statSync(outFile).size;
      console.log(`  ✅  Saved: 128×128px, ${Math.round(sz/1024)}KB`);
    } catch(e) {
      console.error(`  ❌  ${e.message}`);
    }

    if (i < ICONS.length-1) {
      console.log('  ⏳  14s...');
      await delay(14000);
    }
  }

  console.log('\n🏆  All lobby icons done!');
})();
