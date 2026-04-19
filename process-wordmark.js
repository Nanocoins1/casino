// process-wordmark.js — crop and resize the already-downloaded raw images
const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const OUT_DIR = path.join(__dirname, 'public', 'img');

// raw1 = full logo (icon + 3D text), raw2 = wordmark only
// They were saved before the script errored — check if they exist
const raw1 = path.join(OUT_DIR, '_wm-raw1.png');
const raw2 = path.join(OUT_DIR, '_wm-raw2.png');

async function smartCrop(srcFile, dstFile, targetHeight) {
  // Get image metadata
  const meta = await sharp(srcFile).metadata();
  console.log(`  Source: ${meta.width}×${meta.height}`);

  // Find content bounds by scanning rows/cols for non-black pixels
  const { data, info } = await sharp(srcFile)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const ch = info.channels; // 3 or 4

  const THRESH = 20; // brightness threshold

  let top = 0, bottom = h - 1, left = 0, right = w - 1;

  // Find top
  outer: for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      if (data[i] > THRESH || data[i+1] > THRESH || data[i+2] > THRESH) {
        top = y; break outer;
      }
    }
  }

  // Find bottom
  outer: for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      if (data[i] > THRESH || data[i+1] > THRESH || data[i+2] > THRESH) {
        bottom = y; break outer;
      }
    }
  }

  // Find left
  outer: for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * ch;
      if (data[i] > THRESH || data[i+1] > THRESH || data[i+2] > THRESH) {
        left = x; break outer;
      }
    }
  }

  // Find right
  outer: for (let x = w - 1; x >= 0; x--) {
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * ch;
      if (data[i] > THRESH || data[i+1] > THRESH || data[i+2] > THRESH) {
        right = x; break outer;
      }
    }
  }

  // Add small padding
  const pad = 20;
  const cx = Math.max(0, left - pad);
  const cy = Math.max(0, top - pad);
  const cw = Math.min(w - cx, right - left + pad * 2);
  const ch2 = Math.min(h - cy, bottom - top + pad * 2);

  console.log(`  Content bounds: x=${cx} y=${cy} w=${cw} h=${ch2}`);

  await sharp(srcFile)
    .extract({ left: cx, top: cy, width: cw, height: ch2 })
    .resize(null, targetHeight, { fit: 'inside', withoutEnlargement: false })
    .png({ compressionLevel: 9 })
    .toFile(dstFile);

  const outMeta = await sharp(dstFile).metadata();
  const sz = fs.statSync(dstFile).size;
  console.log(`  ✅  Saved: ${outMeta.width}×${outMeta.height}px, ${Math.round(sz/1024)}KB → ${path.basename(dstFile)}`);
}

(async () => {
  if (!fs.existsSync(raw1) || !fs.existsSync(raw2)) {
    console.error('❌  Raw files not found! Run generate-wordmark.js first.');
    process.exit(1);
  }

  console.log('\n[1] Processing full logo (icon + wordmark) → topbar version (56px tall)');
  await smartCrop(raw1, path.join(OUT_DIR, 'hathor-logo-full.png'), 56);

  console.log('\n[2] Processing full logo → loading screen version (96px tall)');
  await smartCrop(raw1, path.join(OUT_DIR, 'hathor-logo-loading.png'), 96);

  console.log('\n[3] Processing wordmark only → topbar text version (44px tall)');
  await smartCrop(raw2, path.join(OUT_DIR, 'hathor-wordmark.png'), 44);

  // Cleanup raws
  fs.unlinkSync(raw1);
  fs.unlinkSync(raw2);
  console.log('\n🏆  Done! Cleaned up raw files.');
})();
