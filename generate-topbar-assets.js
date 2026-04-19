// generate-topbar-assets.js
// 1. HATHOR 3D text (with big black margins for proper crop)
// 2. Topbar background — gold coins strip
require('dotenv').config();
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const sharp = require('sharp');

const API_KEY = process.env.OPENAI_API_KEY;
const IMG = path.join(__dirname, 'public', 'img');

function dalle(prompt, size) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model:'dall-e-3', prompt, n:1, size,
      response_format:'b64_json', quality:'hd', style:'vivid' });
    const req = https.request({
      hostname:'api.openai.com', path:'/v1/images/generations', method:'POST',
      headers:{ 'Content-Type':'application/json',
        'Authorization':`Bearer ${API_KEY}`, 'Content-Length':Buffer.byteLength(body) }
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

// Smart-crop: scan pixels to find content bounds, then extract
async function smartCrop(buf, outFile, displayH, label) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, ch = info.channels;
  const T = 18; // brightness threshold

  let top = h, bot = 0, lft = w, rgt = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y*w+x)*ch;
      if (data[i]>T || data[i+1]>T || data[i+2]>T) {
        if (y < top) top = y;
        if (y > bot) bot = y;
        if (x < lft) lft = x;
        if (x > rgt) rgt = x;
      }
    }
  }

  const pad = 24;
  const cx = Math.max(0, lft-pad), cy = Math.max(0, top-pad);
  const cw = Math.min(w-cx, rgt-lft+pad*2), ch2 = Math.min(h-cy, bot-top+pad*2);
  const ratio = cw/ch2;
  const outW = Math.round(displayH * ratio);

  console.log(`  Crop: ${cx},${cy} → ${cw}×${ch2}  (ratio ${ratio.toFixed(2)}:1)  →  display ${outW}×${displayH}px`);

  await sharp(buf)
    .extract({ left:cx, top:cy, width:cw, height:ch2 })
    .resize(outW*2, displayH*2, { fit:'fill' })  // 2× for Retina
    .png({ compressionLevel:9 })
    .toFile(outFile);

  const sz = fs.statSync(outFile).size;
  const m  = await sharp(outFile).metadata();
  console.log(`  ✅  ${label}: ${m.width}×${m.height}px → ${Math.round(sz/1024)}KB`);
  return { w: outW, h: displayH };
}

const delay = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  // ── 1. HATHOR 3D wordmark ──────────────────────────────────────────
  console.log('[1/2] HATHOR 3D wordmark text...');
  const buf1 = await dalle(`
Important composition rules: The word HATHOR is in the CENTER of the image. There are VERY LARGE pure black borders: the top 38% of the image is pure matte black, the bottom 38% is pure matte black. The left 18% is pure matte black, the right 18% is pure matte black. The text HATHOR occupies only the central rectangular area.

The text HATHOR: massive 3D extruded letters in polished 18-karat gold. Each letter: mirror-smooth top face with warm amber-gold reflections, deep extruded side faces showing layered gold strata, Art Deco geometric micro-engravings (chevrons, diamonds) on top. Bold condensed Serif typeface. Letters float above the black surface, casting soft warm golden shadows below. Dramatic overhead studio lighting makes the gold gleam intensely.

NO decorations outside the text. NO background elements. Just pure black and the six golden letters H-A-T-H-O-R centered in the image. Photorealistic, 8K quality.`, '1792x1024');
  console.log(`  Raw: ${Math.round(buf1.length/1024)}KB`);
  await smartCrop(buf1, path.join(IMG, 'hathor-text-3d.png'), 46, 'hathor-text-3d.png');

  await delay(14000);

  // ── 2. Topbar background — gold coins + luxury ────────────────────
  console.log('[2/2] Topbar background with gold coins...');
  const buf2 = await dalle(`
Ultra-premium casino topbar background strip. Wide panoramic format.
Deep dark background: very dark near-black with subtle dark blue-black gradient (NOT pure black — more like #04040c to #080814).
Scattered across the entire width: dozens of gleaming gold coins in various orientations — some face-up showing an Egyptian sun disc / eye of Horus engraving, some tilted at angles, some stacked in small piles. The coins are photorealistic 18-karat gold with beveled edges and deep warm reflections.
Between the coins: scattered gold dust particles, small diamond sparkles, tiny gold stars. A few larger gold gems/crystals here and there.
The density is higher at the left and right edges, sparser in the center (to leave room for the logo and UI elements).
Overall feel: rich Las Vegas premium casino vault. The coins glow warmly. No text. Pure luxury.
Cinematic lighting, 8K quality, wide panoramic format.`, '1792x1024');
  console.log(`  Raw: ${Math.round(buf2.length/1024)}KB`);

  // Topbar bg: resize to exactly 1440×80 (3× retina for the 480×26 physical display)
  // But we want it to tile/cover the 72px topbar at full width
  // Save at 1792×144 (2× the 72px height, full width)
  await sharp(buf2)
    .resize(1792, 144, { fit:'cover', position:'centre' })
    .jpeg({ quality:88, mozjpeg:true })
    .toFile(path.join(IMG, 'topbar-bg.jpg'));
  const sz2 = fs.statSync(path.join(IMG, 'topbar-bg.jpg')).size;
  const m2  = await sharp(path.join(IMG, 'topbar-bg.jpg')).metadata();
  console.log(`  ✅  topbar-bg.jpg: ${m2.width}×${m2.height}px, ${Math.round(sz2/1024)}KB`);

  console.log('\n🏆  Done!');
})().catch(console.error);
