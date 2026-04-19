// generate-logo.js — HATHOR Casino brand mark icon
require('dotenv').config();
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const sharp = require('sharp');

const API_KEY = process.env.OPENAI_API_KEY;
const OUT_DIR = path.join(__dirname, 'public', 'img');

function callDalle(prompt, size, outFile) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,
      response_format: 'b64_json',
      quality: 'hd',
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
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) { reject(new Error(json.error.message)); return; }
          const b64 = json.data[0].b64_json;
          const buf = Buffer.from(b64, 'base64');
          fs.writeFileSync(outFile, buf);
          console.log(`✅  Raw saved: ${path.basename(outFile)} (${Math.round(buf.length/1024)}KB)`);
          resolve();
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  const rawFile = path.join(OUT_DIR, '_logo-raw.png');

  // ── 1. Generate the brand mark ─────────────────────────────────────
  const prompt = `Ultra-premium casino brand mark / logo icon, square format, centered on pure matte black.
The design: an ancient Egyptian Hathor goddess face viewed front-on — elegant, stylized, Art Deco interpretation.
The face is encircled by a perfect hexagonal golden frame with fine geometric engravings.
Everything is rendered in molten gold metallic tones against pure black: rich amber-gold gradients, polished metal highlights, deep shadow.
The goddess has a serene expression with dramatic Egyptian eye makeup (kohl outlines).
Her crown / headdress features a solar disk (sun disc) with curved cow horns — the traditional Hathor symbol — wrought in gold.
No text. No letters. Pure symbol / icon only.
Perfect bilateral symmetry. Ultra-clean for use as a small app icon.
Cinematic studio lighting, 8K quality, photorealistic gold metalwork.`;

  console.log('🎨  Generating HATHOR brand mark with DALL-E 3 HD...');
  await callDalle(prompt, '1024x1024', rawFile);

  // ── 2. Create multiple output sizes ────────────────────────────────
  const sizes = [
    { name: 'hathor-logo-mark.png', w: 512, q: null },   // Full res — loading screen
    { name: 'hathor-logo-topbar.png', w: 80, q: null },  // Topbar 40px display
    { name: 'icon-192.png', w: 192, q: null },           // PWA icon
    { name: 'icon-512.png', w: 512, q: null },           // PWA icon large
  ];

  console.log('\n📐  Resizing to multiple outputs...');
  for (const s of sizes) {
    const outFile = path.join(OUT_DIR, s.name);
    const before = fs.existsSync(outFile) ? fs.statSync(outFile).size : 0;
    await sharp(rawFile)
      .resize(s.w, s.w, { fit: 'cover', position: 'centre' })
      .png({ compressionLevel: 9 })
      .toFile(outFile);
    const after = fs.statSync(outFile).size;
    const changeStr = before ? ` (was ${Math.round(before/1024)}KB)` : '';
    console.log(`  ✅  ${s.name}: ${Math.round(after/1024)}KB${changeStr}`);
  }

  // Cleanup raw
  fs.unlinkSync(rawFile);
  console.log('\n🏆  HATHOR brand mark complete!');
}

run().catch(console.error);
