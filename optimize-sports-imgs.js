// optimize-sports-imgs.js
const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const IMG = path.join(__dirname, 'public', 'img');

const tasks = [
  // Hero: keep 1792×1024 → compressed JPEG
  { src: 'sports-hero.jpg',       dst: 'sports-hero.jpg',        w: 1792, h: 1024, fmt: 'jpeg', q: 82 },
  // Icons: resize to 192×192 PNG (sharp enough for tab icons)
  { src: 'sport-icon-soccer.png',     dst: 'sport-icon-soccer.png',     w: 192, h: 192, fmt: 'png' },
  { src: 'sport-icon-basketball.png', dst: 'sport-icon-basketball.png', w: 192, h: 192, fmt: 'png' },
  { src: 'sport-icon-tennis.png',     dst: 'sport-icon-tennis.png',     w: 192, h: 192, fmt: 'png' },
  { src: 'sport-icon-hockey.png',     dst: 'sport-icon-hockey.png',     w: 192, h: 192, fmt: 'png' },
  { src: 'sport-icon-football.png',   dst: 'sport-icon-football.png',   w: 192, h: 192, fmt: 'png' },
  { src: 'sport-icon-mma.png',        dst: 'sport-icon-mma.png',        w: 192, h: 192, fmt: 'png' },
  { src: 'sport-icon-baseball.png',   dst: 'sport-icon-baseball.png',   w: 192, h: 192, fmt: 'png' },
];

(async () => {
  for (const t of tasks) {
    const src = path.join(IMG, t.src);
    const dst = path.join(IMG, t.dst);
    const before = fs.statSync(src).size;
    let s = sharp(src).resize(t.w, t.h, { fit: 'cover', position: 'centre' });
    if (t.fmt === 'jpeg') s = s.jpeg({ quality: t.q || 82, mozjpeg: true });
    else                  s = s.png({ compressionLevel: 9, palette: false });
    await s.toFile(dst + '.tmp');
    fs.renameSync(dst + '.tmp', dst);
    const after = fs.statSync(dst).size;
    console.log(`✅  ${t.dst}: ${Math.round(before/1024)}KB → ${Math.round(after/1024)}KB (-${Math.round((1-after/before)*100)}%)`);
  }
  console.log('\n🏆  Optimization complete!');
})();
