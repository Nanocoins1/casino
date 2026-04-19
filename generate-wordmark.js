// generate-wordmark.js — HATHOR 3D premium wordmark logo
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
          const buf = Buffer.from(json.data[0].b64_json, 'base64');
          fs.writeFileSync(outFile, buf);
          console.log(`✅  Saved ${path.basename(outFile)} (${Math.round(buf.length/1024)}KB)`);
          resolve();
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const delay = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  // ── Generate 1: Full logo (mark + 3D wordmark) ─────────────────────
  // Wide panoramic format for the topbar
  const raw1 = path.join(OUT_DIR, '_wm-raw1.png');
  console.log('[1/2] Generating 3D logo with brand mark + wordmark (1792×1024)...');
  await callDalle(
    `Ultra-premium luxury casino logo. Wide panoramic composition against pure matte black background.
LEFT SIDE: A gleaming 3D golden hexagonal medallion/seal — inside it, an elegant Egyptian Hathor goddess face (Art Deco style, front-facing, serene expression, kohl eyes, solar disc crown with cow horns) sculpted in polished gold relief. The hexagon frame has fine geometric Egyptian engraving, beveled golden edges.
RIGHT SIDE of the medallion: the word HATHOR in massive 3D extruded letters. Each letter is sculpted from polished 18-karat gold — smooth mirror-like top surfaces, deep extruded gold side faces showing layered metal, fine hieroglyphic-style geometric patterns etched into the letter tops. The letters are in a bold elegant Serif font with slight forward lean. Below HATHOR, smaller text ROYAL CASINO in polished platinum 3D letters.
The entire composition floats on pure matte black with a subtle warm golden glow beneath the elements (floor reflection). Dramatic cinematic top-down studio lighting. NO other elements. Photorealistic, 8K quality.`,
    '1792x1024',
    raw1
  );

  await delay(14000);

  // ── Generate 2: Just the 3D wordmark text, no icon ─────────────────
  // For use when space is tight
  const raw2 = path.join(OUT_DIR, '_wm-raw2.png');
  console.log('[2/2] Generating standalone 3D wordmark text (1792×1024)...');
  await callDalle(
    `Ultra-premium 3D text logo. The single word HATHOR in massive photorealistic 3D extruded Serif letters, perfectly centered horizontally in the middle of the image. Large black space above and below the text.
The letters are forged from polished 18-karat gold metal: mirror-smooth top surfaces reflecting warm amber light, deep extruded side faces showing layered gold strata, intricate Art Deco geometric patterns (chevrons, diamonds) engraved into each letter face. The letters are bold, slightly condensed Serif style.
The letters float 5cm above the pure matte black surface, casting diffuse warm golden shadows directly below. Below HATHOR in smaller 3D gold letters: ROYAL CASINO.
Studio lighting from directly above-front creates perfect gold reflections. Pure matte black background, no gradients, no other elements. Photorealistic, 8K, wide panoramic format.`,
    '1792x1024',
    raw2
  );

  console.log('\n📐  Processing outputs...');

  // ── Process outputs with sharp ──────────────────────────────────────
  const outputs = [
    // Full logo (mark + text): trim black, resize to topbar height
    {
      src: raw1,
      dst: path.join(OUT_DIR, 'hathor-logo-full.png'),
      label: 'hathor-logo-full.png (topbar, ~300px wide)',
      process: s => s
        .trim({ background: { r:0, g:0, b:0, a:255 }, threshold: 12 })
        .resize(null, 56, { fit: 'inside', withoutEnlargement: false })
        .png({ compressionLevel: 9 }),
    },
    // Full logo: also save a medium version for loading screen
    {
      src: raw1,
      dst: path.join(OUT_DIR, 'hathor-logo-loading.png'),
      label: 'hathor-logo-loading.png (loading screen, ~480px wide)',
      process: s => s
        .trim({ background: { r:0, g:0, b:0, a:255 }, threshold: 12 })
        .resize(null, 96, { fit: 'inside', withoutEnlargement: false })
        .png({ compressionLevel: 9 }),
    },
    // Wordmark only: trim + resize for tight spaces
    {
      src: raw2,
      dst: path.join(OUT_DIR, 'hathor-wordmark.png'),
      label: 'hathor-wordmark.png (wordmark only, topbar text)',
      process: s => s
        .trim({ background: { r:0, g:0, b:0, a:255 }, threshold: 15 })
        .resize(null, 44, { fit: 'inside', withoutEnlargement: false })
        .png({ compressionLevel: 9 }),
    },
  ];

  for (const o of outputs) {
    await o.process(sharp(o.src)).toFile(o.dst);
    const sz = fs.statSync(o.dst).size;
    const { width, height } = await sharp(o.dst).metadata();
    console.log(`  ✅  ${o.label} → ${width}×${height}px, ${Math.round(sz/1024)}KB`);
  }

  // Cleanup raws
  fs.unlinkSync(raw1);
  fs.unlinkSync(raw2);

  console.log('\n🏆  Wordmark generation complete!');
}

run().catch(console.error);
