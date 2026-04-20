// generate-gold-buttons2.js — clean smooth gold button textures
require('dotenv').config();
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const sharp = require('sharp');

const API_KEY = process.env.OPENAI_API_KEY;
const IMG = path.join(__dirname, 'public', 'img');

function dalle(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'dall-e-3', prompt, n: 1, size: '1024x1024',
      response_format: 'b64_json', quality: 'hd', style: 'natural'
    });
    const req = https.request({
      hostname: 'api.openai.com', path: '/v1/images/generations', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          if (j.error) { reject(new Error(j.error.message)); return; }
          resolve(Buffer.from(j.data[0].b64_json, 'base64'));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

const delay = ms => new Promise(r => setTimeout(r, ms));

// Macro top-down shot of a flat gold metal plate — no engravings, no decorations
const GOLD_PROMPT = `
Macro photography of a flat polished gold metal plate, top-down view, filling the entire frame.
Pure smooth 18-karat gold surface. The gold transitions from bright warm yellow-gold at the very top edge to deep rich amber-gold at the bottom — creating a natural convex 3D lighting effect as if light hits from above.
The surface is mirror-polished with very subtle horizontal hairline brush marks — completely clean, no engravings, no text, no coins, no patterns, no decorations whatsoever.
A thin bright specular highlight runs along the top 5% of the frame (simulating a beveled top edge catching light).
The bottom 5% is slightly darker amber to simulate shadow.
Completely uniform gold gradient across the entire rectangular frame. Nothing else. Pure gold metal plate. Studio lighting. 8K macro photography.`;

const DARK_GOLD_PROMPT = `
Macro photography of a flat dark-gold metal plate, top-down view, filling the entire frame.
Deep obsidian black surface with a rich gold metallic sheen — transitions from dark near-black (#111108) in the center to warm dark amber-gold (#3d2a04) at the edges. Very subtle gold metallic luster across the surface — like dark oxidized gold or a dark onyx with gold PVD coating.
The surface is mirror-polished — completely clean, no engravings, no text, no patterns, no decorations whatsoever.
A thin bright gold specular highlight along the very top edge.
Completely uniform dark surface with gold shimmer. Studio lighting. 8K macro photography.`;

const RED_GOLD_PROMPT = `
Macro photography of a flat deep crimson metal plate, top-down view, filling the entire frame.
Rich deep red surface (#6B0A14 to #A01828) with a high-gloss lacquer finish — like a luxury sports car hood or premium lacquered jewelry box.
The red transitions from bright crimson-red at the top (catching studio light) to deep burgundy at the bottom.
Completely clean surface — no engravings, no text, no patterns, no decorations whatsoever.
A thin bright specular highlight along the very top edge (like a beveled rim catching light).
Uniform premium red lacquer across the entire frame. Studio lighting. 8K macro photography.`;

const BUTTONS = [
  { file: 'btn-primary.png',   prompt: GOLD_PROMPT,      w: 400, h: 96 },
  { file: 'btn-secondary.png', prompt: DARK_GOLD_PROMPT, w: 400, h: 96 },
  { file: 'btn-danger.png',    prompt: RED_GOLD_PROMPT,  w: 400, h: 96 },
];

(async () => {
  console.log('🎨  Regenerating clean gold button textures...\n');
  for (let i = 0; i < BUTTONS.length; i++) {
    const btn = BUTTONS[i];
    const outFile = path.join(IMG, btn.file);
    console.log(`[${i+1}/${BUTTONS.length}] ${btn.file}...`);
    try {
      const buf = await dalle(btn.prompt);
      console.log(`  Raw: ${Math.round(buf.length/1024)}KB`);
      // Crop center strip (most uniform part of the 1024×1024 image)
      await sharp(buf)
        .extract({ left: 0, top: 256, width: 1024, height: 256 }) // center band
        .resize(btn.w, btn.h, { fit: 'cover', position: 'centre' })
        .png({ compressionLevel: 9 })
        .toFile(outFile);
      const sz = fs.statSync(outFile).size;
      const meta = await sharp(outFile).metadata();
      console.log(`  ✅  ${meta.width}×${meta.height}px, ${Math.round(sz/1024)}KB`);
    } catch(e) {
      console.error(`  ❌  ${e.message}`);
    }
    if (i < BUTTONS.length - 1) { console.log('  ⏳  14s...'); await delay(14000); }
  }
  console.log('\n🏆  Done!');
})();
