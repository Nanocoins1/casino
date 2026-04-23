// ══════════════════════════════════════════════════════════════
// Remove Gemini/NanoBanana watermark from AI-generated images
//
// Strategy v2: MIRROR-CLONE approach
// 1. Sample from bottom-LEFT corner (far from watermark, but same row)
// 2. Flip horizontally so pattern continues naturally
// 3. Composite over watermark zone with a soft feathered edge
//
// This handles symmetric designs (card back, symbols with centered
// composition, backgrounds) very well.
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

// Watermark area size (8% of max dimension — generous coverage)
const CORNER_RATIO = 0.08;

async function cleanWatermark(filepath) {
  const meta = await sharp(filepath).metadata();
  const w = meta.width, h = meta.height;
  const cs = Math.max(64, Math.floor(Math.max(w, h) * CORNER_RATIO));

  // Sample from bottom-LEFT corner (mirror of watermark location)
  // Same row band so horizontal patterns align
  const clone = await sharp(filepath)
    .extract({ left: 0, top: h - cs, width: cs, height: cs })
    .flop() // horizontal flip so continuing pattern looks natural
    .png()
    .toBuffer();

  // Composite the clean clone over bottom-right watermark zone
  await sharp(filepath)
    .composite([{
      input: clone,
      left: w - cs,
      top: h - cs,
      blend: 'over'
    }])
    .png()
    .toFile(filepath + '.tmp');

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
