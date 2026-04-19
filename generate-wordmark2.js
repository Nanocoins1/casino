// generate-wordmark2.js — HATHOR 3D wordmark, cleaner generation + processing
require('dotenv').config();
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const sharp = require('sharp');

const API_KEY = process.env.OPENAI_API_KEY;
const IMG = path.join(__dirname, 'public', 'img');

function callDalle(prompt, size) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model:'dall-e-3', prompt, n:1, size,
      response_format:'b64_json', quality:'hd', style:'vivid' });
    const req = https.request({
      hostname:'api.openai.com', path:'/v1/images/generations', method:'POST',
      headers:{ 'Content-Type':'application/json',
        'Authorization':`Bearer ${API_KEY}`, 'Content-Length':Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.error) { reject(new Error(j.error.message)); return; }
          resolve(Buffer.from(j.data[0].b64_json, 'base64'));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

const delay = ms => new Promise(r => setTimeout(r, ms));

async function save(buf, name, w, h) {
  let s = sharp(buf);
  if (w && h) s = s.resize(w, h, { fit: 'cover' });
  else if (w)  s = s.resize(w, null, { fit: 'inside' });
  else if (h)  s = s.resize(null, h, { fit: 'inside' });
  await s.png({ compressionLevel: 9 }).toFile(path.join(IMG, name));
  const meta = await sharp(path.join(IMG, name)).metadata();
  const sz   = fs.statSync(path.join(IMG, name)).size;
  console.log(`  ✅  ${name}: ${meta.width}×${meta.height}px, ${Math.round(sz/1024)}KB`);
}

(async () => {
  // ── Image 1: Full logo (Hathor goddess mark + 3D wordmark) ──────────
  console.log('[1/2] Full logo — mark + 3D HATHOR text (1792×1024)...');
  const buf1 = await callDalle(`
Ultra-premium luxury casino logo. Pure matte black background.
The composition is WIDE and HORIZONTAL: on the LEFT is a golden hexagonal medallion coin (diameter ~30% of image height) containing the Art Deco face of the Egyptian goddess Hathor — elegant, serene, with dramatic kohl eyes and a golden solar disc and cow horns crown, all sculpted in photorealistic polished gold relief.
Immediately to the RIGHT of the medallion, filling the rest of the image width: the word HATHOR in massive bold 3D extruded Serif letters. The letters are sculpted from polished 18-karat gold — mirror-smooth top surfaces, beveled extruded side faces, fine Art Deco geometric engravings on the letter tops. The letters are the SAME HEIGHT as the medallion.
Below HATHOR in small 3D platinum letters: ROYAL CASINO.
The logo sits on pure matte black with a very faint warm gold shadow/glow below. No background decorations. Cinematic studio lighting from above. Photorealistic 8K.`,
    '1792x1024');
  console.log(`  Raw: ${Math.round(buf1.length/1024)}KB`);

  // Save at display-ready sizes (wide: height 56px → CSS height 52px, crisp on Retina)
  await save(buf1, 'hathor-logo-full.png', null, 112);  // 2× retina: 112px tall
  await save(buf1, 'hathor-logo-loading.png', null, 192); // loading screen

  await delay(14000);

  // ── Image 2: Standalone 3D wordmark text only ───────────────────────
  console.log('[2/2] Standalone 3D wordmark — text only (1792×1024)...');
  const buf2 = await callDalle(`
Ultra-premium 3D metallic text logo. Pure matte black background.
The image shows ONLY the word HATHOR in 3D. The letters fill approximately 60% of the image width and 50% of the image height, centered both horizontally and vertically.
Letter style: massive, bold, slightly condensed elegant Serif font. Each letter is precision-machined from solid 18-karat gold metal: the top face is mirror-polished with warm amber reflections, the extruded side faces show deep gold-bronze layers, the edges are sharply beveled and gleaming. Art Deco chevron and diamond micro-engravings on each letter face.
The letters float above the matte black surface, casting warm diffuse golden shadows directly below. No other text, no decorations, no background elements — only the pure black and the six golden letters H-A-T-H-O-R.
Perfect horizontal centering. Cinematic overhead studio lighting. Photorealistic 8K.`,
    '1792x1024');
  console.log(`  Raw: ${Math.round(buf2.length/1024)}KB`);

  await save(buf2, 'hathor-wordmark.png', null, 96);  // 2× retina size

  console.log('\n🏆  Done!');
})().catch(console.error);
