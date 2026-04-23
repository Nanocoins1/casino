// ══════════════════════════════════════════════════════════════
// Remove Gemini/NanoBanana watermark from AI-generated images
//
// Strategy: the watermark is always in the bottom-right corner,
// ~3% of image width/height. We sample surrounding pixels and paint
// over that region using Sharp's composite/blur-fill trick.
//
// Usage: node scripts/remove-watermark.js
// ══════════════════════════════════════════════════════════════

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const FOLDERS = [
  'public/img/slot-pharaohs-gold',
  'public/img/poker-premium',
  'public/img/brand'
];

// How much of the bottom-right corner to "clean"
// The watermark is ~40-60px on a 2048x2048 image, so ~3% of dimension
const CORNER_RATIO = 0.045;

async function cleanWatermark(filepath) {
  const meta = await sharp(filepath).metadata();
  const w = meta.width, h = meta.height;
  const cornerSize = Math.max(48, Math.floor(Math.max(w, h) * CORNER_RATIO));

  // Sample area just ABOVE + LEFT of watermark (clean pixels)
  const sampleX = w - cornerSize * 2;
  const sampleY = h - cornerSize * 2;
  const sampleW = cornerSize;
  const sampleH = cornerSize;

  // Extract sample, blur heavily to create a "smudge" that blends
  const smudge = await sharp(filepath)
    .extract({ left: sampleX, top: sampleY, width: sampleW, height: sampleH })
    .blur(8)
    .toBuffer();

  // Composite the smudge over the watermark region
  const cleaned = await sharp(filepath)
    .composite([{
      input: smudge,
      left: w - cornerSize,
      top: h - cornerSize
    }])
    .toBuffer();

  // Write back (overwrites original — we have git history + staging is deleted so warn user)
  await sharp(cleaned).toFile(filepath + '.tmp');
  fs.renameSync(filepath + '.tmp', filepath);
}

async function main() {
  let total = 0, cleaned = 0, failed = 0;
  for (const folder of FOLDERS) {
    const full = path.join(__dirname, '..', folder);
    if (!fs.existsSync(full)) continue;
    const files = fs.readdirSync(full).filter(f => f.endsWith('.png'));
    console.log(`\n📂 ${folder} (${files.length} files)`);
    for (const f of files) {
      total++;
      const fp = path.join(full, f);
      try {
        await cleanWatermark(fp);
        console.log(`  ✓ ${f}`);
        cleaned++;
      } catch (e) {
        console.log(`  ✗ ${f}: ${e.message}`);
        failed++;
      }
    }
  }
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Processed: ${total} | Cleaned: ${cleaned} | Failed: ${failed}`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
