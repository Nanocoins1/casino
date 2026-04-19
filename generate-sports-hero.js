// generate-sports-hero.js — HATHOR Casino Sports Section Visuals
// Generates: 1 hero banner + 7 sport tab icons using DALL-E 3
require('dotenv').config();
const https = require('https');
const fs    = require('fs');
const path  = require('path');

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
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) { reject(new Error(json.error.message)); return; }
          const b64 = json.data[0].b64_json;
          const buf = Buffer.from(b64, 'base64');
          fs.writeFileSync(outFile, buf);
          console.log(`✅  Saved ${path.basename(outFile)} (${Math.round(buf.length/1024)}KB)`);
          resolve();
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

const IMAGES = [
  // ─── Hero banner — 1792×1024 ────────────────────────────
  {
    file: 'sports-hero.jpg',
    size: '1792x1024',
    prompt: `Ultra-premium cinematic sports betting hero banner. Breathtaking wide-angle panorama: a colossal soccer stadium at night with 100,000 roaring fans, golden floodlight beams cutting through smoke and atmosphere, the pristine emerald pitch glowing below. Overlapping ghosted silhouettes of basketball, tennis, boxing, hockey. Rich darkness — deep black and near-black backgrounds with dramatic golden-amber volumetric light columns and subtle green pitch reflections. Cinematic depth of field, HDR, photorealistic, ultra-sharp, no text, no logos, no UI, purely atmospheric. 8K quality, wide-format sports banner.`,
  },

  // ─── Sport tab icons — 1024×1024 ────────────────────────
  {
    file: 'sport-icon-soccer.png',
    size: '1024x1024',
    prompt: `Premium sports betting icon: a single soccer / football, perfectly centered on an absolute black background. The ball is rendered in photorealistic detail with a warm golden glow radiating outward, subtle gold shimmer on the hexagonal panels, deep shadows, cinematic studio lighting from above. No text, no background elements — just the ball and pure black. Luxury dark aesthetic, 8K resolution.`,
  },
  {
    file: 'sport-icon-basketball.png',
    size: '1024x1024',
    prompt: `Premium sports betting icon: a single NBA basketball floating in the center of an absolute black background. The ball glows with warm amber-gold inner light, the seam lines lit dramatically, cinematic overhead studio lighting, subtle gold sparkle particles. No text, no background patterns — only the ball and pure black. Ultra-premium dark luxury aesthetic, photorealistic, 8K.`,
  },
  {
    file: 'sport-icon-tennis.png',
    size: '1024x1024',
    prompt: `Premium sports icon: a single tennis ball perfectly centered on pure black background. Ball rendered in photorealistic neon-lime yellow with a warm gold halo glow, dramatic studio overhead lighting, the felt texture visible in extreme detail, subtle golden light reflection underneath. Nothing else — pure black background, just the ball. Ultra-premium dark aesthetic, 8K.`,
  },
  {
    file: 'sport-icon-hockey.png',
    size: '1024x1024',
    prompt: `Premium sports icon: a black rubber hockey puck centered on absolute black background, with a dramatic icy-blue and gold glow, ice crystal particles floating around it, cinematic cold studio lighting, frost reflections. Pure black surround, nothing else. Ultra-premium dark luxury aesthetic, photorealistic, 8K.`,
  },
  {
    file: 'sport-icon-football.png',
    size: '1024x1024',
    prompt: `Premium sports icon: a single American football (NFL style) floating centered on pure black background. The pigskin leather rendered photorealistically with warm amber-gold illumination, dramatic stadium lighting from above, bold white seam laces lit brightly, subtle golden glow particles. Pure black background only. Ultra-premium dark aesthetic, 8K.`,
  },
  {
    file: 'sport-icon-mma.png',
    size: '1024x1024',
    prompt: `Premium sports icon: a pair of MMA / boxing gloves centered and dramatically lit on a pure black background. The gloves are deep midnight-black leather with gold metallic trim and buckles, cinematic overhead spotlight creating a dramatic gold-rimmed halo, subtle sparks. Nothing else in frame. Ultra-premium dark luxury aesthetic, photorealistic, 8K.`,
  },
  {
    file: 'sport-icon-baseball.png',
    size: '1024x1024',
    prompt: `Premium sports icon: a single baseball perfectly centered on pure black background. The white leather and red stitching are photorealistic, bathed in warm amber-gold cinematic studio light from above creating a golden halo glow, subtle gold sparkle particles. Pure black background, nothing else. Ultra-premium dark aesthetic, 8K.`,
  },
];

(async () => {
  console.log(`🎨  Generating ${IMAGES.length} sports visuals with DALL-E 3 HD...\n`);
  for (let i = 0; i < IMAGES.length; i++) {
    const img = IMAGES[i];
    const outFile = path.join(OUT_DIR, img.file);
    console.log(`[${i+1}/${IMAGES.length}] ${img.file} (${img.size})...`);
    try {
      await callDalle(img.prompt, img.size, outFile);
    } catch (e) {
      console.error(`  ❌  Error: ${e.message}`);
    }
    if (i < IMAGES.length - 1) {
      console.log('  ⏳  Waiting 14s (rate limit)...');
      await delay(14000);
    }
  }
  console.log('\n🏆  Done! All sports visuals generated.');
})();
