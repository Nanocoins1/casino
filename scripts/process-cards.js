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

// Check if pixel is gold-ish (high R, high G, B noticeably lower)
function isGoldPixel(r, g, b) {
  return r > 130 && g > 100 && r > b + 40 && g > b + 20;
}

async function detectCardBounds(filepath) {
  // Read raw pixels
  const { data, info } = await sharp(filepath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: w, height: h, channels } = info;

  // ─── PASS 1: find non-black bounding box (the card body) ───
  let minX = w, maxX = 0, minY = h, maxY = 0;
  let foundAny = false;

  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const idx = (y * w + x) * channels;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (r > BLACK_THRESHOLD || g > BLACK_THRESHOLD || b > BLACK_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        foundAny = true;
      }
    }
  }
  if (!foundAny) throw new Error('No non-black pixels found');

  // ─── PASS 2: tighten each edge to where gold frame starts ───
  // Scan inward from each edge of the card body along a middle line,
  // looking for the row/column where gold pixels dominate (>= 20% of line).
  const centerX = Math.floor((minX + maxX) / 2);
  const centerY = Math.floor((minY + maxY) / 2);

  const isGoldDominantRow = (y, fromX, toX) => {
    let goldCount = 0, total = 0;
    const step = Math.max(1, Math.floor((toX - fromX) / 100));
    for (let x = fromX; x <= toX; x += step) {
      const idx = (y * w + x) * channels;
      if (isGoldPixel(data[idx], data[idx + 1], data[idx + 2])) goldCount++;
      total++;
    }
    return total > 0 && goldCount / total >= 0.2;
  };
  const isGoldDominantCol = (x, fromY, toY) => {
    let goldCount = 0, total = 0;
    const step = Math.max(1, Math.floor((toY - fromY) / 100));
    for (let y = fromY; y <= toY; y += step) {
      const idx = (y * w + x) * channels;
      if (isGoldPixel(data[idx], data[idx + 1], data[idx + 2])) goldCount++;
      total++;
    }
    return total > 0 && goldCount / total >= 0.2;
  };

  // Find top edge of gold frame (scan down from minY)
  let goldTop = minY;
  for (let y = minY; y < centerY; y++) {
    if (isGoldDominantRow(y, minX, maxX)) { goldTop = y; break; }
  }
  // Find bottom edge of gold frame (scan up from maxY)
  let goldBottom = maxY;
  for (let y = maxY; y > centerY; y--) {
    if (isGoldDominantRow(y, minX, maxX)) { goldBottom = y; break; }
  }
  // Find left edge (scan right from minX)
  let goldLeft = minX;
  for (let x = minX; x < centerX; x++) {
    if (isGoldDominantCol(x, minY, maxY)) { goldLeft = x; break; }
  }
  // Find right edge (scan left from maxX)
  let goldRight = maxX;
  for (let x = maxX; x > centerX; x--) {
    if (isGoldDominantCol(x, minY, maxY)) { goldRight = x; break; }
  }

  // Sanity fallback: if gold detection failed on any edge, use non-black bounds
  if (goldTop >= centerY)    goldTop = minY;
  if (goldBottom <= centerY) goldBottom = maxY;
  if (goldLeft >= centerX)   goldLeft = minX;
  if (goldRight <= centerX)  goldRight = maxX;

  return {
    left: goldLeft,
    top: goldTop,
    width: goldRight - goldLeft,
    height: goldBottom - goldTop,
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
  // Previous batch (Kings)
  'card-1-new.png': 'clubs-Q-scorpion-alt', // Alternative Queen of Clubs (scorpion)
  'card-2-new.png': 'spades-K',              // King of Spades
  'card-3-new.png': 'clubs-K',               // King of Clubs
  'card-4-new.png': 'hearts-K',              // King of Hearts
  // New batch (Queens + Diamond King)
  'new-1.png': 'diamonds-K',                 // King of Diamonds
  'new-2.png': 'hearts-Q',                   // Queen of Hearts
  'new-3.png': 'clubs-Q',                    // Queen of Clubs (replaces scorpion for set consistency)
  'new-4.png': 'spades-Q',                   // Queen of Spades
  'new-5.png': 'diamonds-Q'                  // Queen of Diamonds
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
