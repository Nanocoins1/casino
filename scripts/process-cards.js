// ══════════════════════════════════════════════════════════════
// Auto-crop NanoBanana card images
//
// Strategy: card sits on pure black background with watermark in
// bottom-right corner of the FULL image (in the black zone).
// We detect the card rectangle by finding the bounding box of
// non-black pixels, then crop — which automatically eliminates
// the watermark since it's in the black region outside the card.
//
// Usage: node scripts/process-cards.js
// ══════════════════════════════════════════════════════════════

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const STAGING_DIR = path.join(__dirname, '..', 'public', 'img', 'cards-staging');
const OUTPUT_DIR  = path.join(__dirname, '..', 'public', 'img', 'cards');

const BLACK_THRESHOLD = 25; // pixels with all RGB below this = "black background"
const MARGIN_PAD = 8;       // add small margin around detected card

async function detectCardBounds(filepath) {
  // Read raw pixels
  const { data, info } = await sharp(filepath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: w, height: h, channels } = info;

  // Find bounding box of non-black pixels
  let minX = w, maxX = 0, minY = h, maxY = 0;
  let foundAny = false;

  // Sample every 2nd pixel for speed
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const idx = (y * w + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const isNonBlack = r > BLACK_THRESHOLD || g > BLACK_THRESHOLD || b > BLACK_THRESHOLD;
      if (isNonBlack) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        foundAny = true;
      }
    }
  }

  if (!foundAny) throw new Error('No non-black pixels found');

  // Apply margin padding, clamp to image bounds
  minX = Math.max(0, minX - MARGIN_PAD);
  minY = Math.max(0, minY - MARGIN_PAD);
  maxX = Math.min(w - 1, maxX + MARGIN_PAD);
  maxY = Math.min(h - 1, maxY + MARGIN_PAD);

  // Important: crop should NOT include the watermark area.
  // Watermark sits in BOTTOM-RIGHT of the FULL image.
  // Since the card is centered with black margin, if the card's
  // right edge is LESS than (w - watermark zone), we're fine.
  // But if the detected card happens to extend all the way right
  // (e.g., because watermark pixels exceed threshold), we trim.
  const watermarkZone = Math.floor(Math.max(w, h) * 0.05); // 5% corner
  if (maxX > w - watermarkZone && maxY > h - watermarkZone) {
    // Card extends into watermark corner — shrink slightly
    maxX = Math.min(maxX, w - watermarkZone);
    maxY = Math.min(maxY, h - watermarkZone);
  }

  return {
    left: minX,
    top: minY,
    width: maxX - minX,
    height: maxY - minY,
    origW: w, origH: h
  };
}

async function processCard(sourcePath, outputPath) {
  const bounds = await detectCardBounds(sourcePath);
  console.log(`  Detected card: ${bounds.width}×${bounds.height} at (${bounds.left}, ${bounds.top}) from ${bounds.origW}×${bounds.origH}`);

  await sharp(sourcePath)
    .extract({
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height
    })
    .toFile(outputPath);

  return bounds;
}

// Mapping: staging filename → card code
const CARD_MAP = {
  'card-1-new.png': 'clubs-Q',    // Queen of Clubs
  'card-2-new.png': 'spades-K',   // King of Spades
  'card-3-new.png': 'clubs-K',    // King of Clubs
  'card-4-new.png': 'hearts-K'    // King of Hearts
};

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const files = fs.readdirSync(STAGING_DIR).filter(f => f.endsWith('.png'));
  console.log(`\n📂 Processing ${files.length} cards from ${STAGING_DIR}`);

  let ok = 0, fail = 0;
  for (const f of files) {
    const code = CARD_MAP[f];
    if (!code) {
      console.log(`  ⚠ ${f}: no mapping (skipping)`);
      continue;
    }

    const inPath = path.join(STAGING_DIR, f);
    const outPath = path.join(OUTPUT_DIR, `${code}.png`);

    try {
      console.log(`\n▸ ${f} → ${code}.png`);
      await processCard(inPath, outPath);
      ok++;
    } catch(e) {
      console.log(`  ✗ Error: ${e.message}`);
      fail++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Processed: ${ok} | Failed: ${fail}`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
