// HATHOR Casino — DALL-E icon generator
// Run: node generate-icons.js
require('dotenv').config();
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const API_KEY = process.env.OPENAI_API_KEY;
const IMG_DIR = path.join(__dirname, 'public', 'img');

if(!API_KEY) { console.error('No OPENAI_API_KEY in .env'); process.exit(1); }

// ── Icon definitions ──────────────────────────────────────────
const ICONS = [
  {
    file: 'nav-lobby.png',
    size: '1024x1024',
    prompt: `Ultra-premium casino lobby icon. A glowing golden hexagonal portal/arch with ornate gold filigree, floating playing cards and casino chips, dark luxury atmosphere. Pure #04040a black background. Rich gold #f0c060 tones, subtle neon glow. Clean isolated icon composition, centered. Cinematic render, no text, no letters.`
  },
  {
    file: 'nav-slots.png',
    size: '1024x1024',
    prompt: `Ultra-premium golden slot machine icon. Classic three-reel slot showing triple 7s, gleaming gold casing with jewel buttons, coin jackpot spilling out. Pure #04040a black background. Rich gold and amber tones, glowing neon highlights. Clean centered icon composition. Cinematic 3D render, no text, no letters.`
  },
  {
    file: 'nav-sports.png',
    size: '1024x1024',
    prompt: `Ultra-premium sports betting icon. A glowing golden soccer ball trophy hybrid, radiating energy lines, stadium lights in background silhouette. Pure #04040a black background. Gold #f0c060 and green neon highlights, luxury casino aesthetic. Clean centered icon. Cinematic render, no text, no letters.`
  },
  {
    file: 'nav-poker.png',
    size: '1024x1024',
    prompt: `Ultra-premium poker icon. Golden Ace of Spades card with ornate gold border, fanned royal flush cards behind it, casino felt texture. Pure #04040a black background. Rich gold #f0c060 tones, dramatic spotlight, luxury casino style. Clean centered icon composition. Cinematic render, no text, no letters.`
  },
  {
    file: 'nav-pyramid.png',
    size: '1024x1024',
    prompt: `Ultra-premium Egyptian pyramid casino icon. A majestic golden pyramid with glowing apex, ancient hieroglyph accents, sandstorm particles. Pure #04040a black background. Rich gold #f0c060 with amber and neon glow at peak. Clean centered icon composition. Cinematic 3D render, no text, no letters.`
  },
  {
    file: 'nav-cashier.png',
    size: '1024x1024',
    prompt: `Ultra-premium casino cashier/vault icon. A gleaming golden bank vault door with a circular lock wheel, gold coins and stablecoin symbols (USDT USDC) floating around it, laser security beams. Pure #04040a black background. Rich gold #f0c060 tones, neon accents. Clean centered icon. Cinematic render, no text, no letters.`
  },
  {
    file: 'cashier-hero.png',
    size: '1792x1024',
    prompt: `Ultra-luxury casino cashier panoramic banner. A breathtaking golden vault interior — enormous round vault door open to reveal stacks of gold coins and glowing stablecoin crystals (USDT, USDC, EURC). Marble floors, ornate gold columns, atmospheric fog. Pure deep black #04040a background fading at edges. Cinematic wide-angle 3D render, moody dramatic lighting, gold #f0c060 dominant color scheme. No text, no letters, no UI elements.`
  },
];

// ── API call ──────────────────────────────────────────────────
async function generateImage(prompt, size, model = 'dall-e-3') {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      prompt,
      n: 1,
      size,
      quality: 'standard',
      response_format: 'b64_json',
      style: 'vivid',
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/images/generations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if(j.error) reject(new Error(j.error.message));
          else resolve(j.data[0].b64_json);
        } catch(e) { reject(e); }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log(`🎨 Generating ${ICONS.length} images with DALL-E 3...\n`);

  for(let i = 0; i < ICONS.length; i++) {
    const ic = ICONS[i];
    const outPath = path.join(IMG_DIR, ic.file);
    console.log(`[${i+1}/${ICONS.length}] Generating ${ic.file}...`);

    try {
      const b64 = await generateImage(ic.prompt, ic.size);
      fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
      const kb = Math.round(fs.statSync(outPath).size / 1024);
      console.log(`  ✅ Saved ${ic.file} (${kb} KB)`);
    } catch(e) {
      console.error(`  ❌ Failed: ${e.message}`);
    }

    // Rate limit: max 5 req/min on standard tier — wait 13s between calls
    if(i < ICONS.length - 1) {
      process.stdout.write('  ⏳ Waiting 13s (rate limit)...');
      await new Promise(r => setTimeout(r, 13000));
      process.stdout.write(' done\n');
    }
  }

  console.log('\n🏁 Done! All images saved to public/img/');
}

main().catch(console.error);
