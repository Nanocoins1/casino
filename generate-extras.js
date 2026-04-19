// HATHOR — Extra background/hero images
// bonus-bg, vip-card-bg, cashier-hero, 404-illustration
// Cost: 4 × $0.08 = ~$0.32

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

const IMAGES = [
  {
    file: 'bonus-bg.png',
    prompt: `luxury casino welcome bonus background image: explosion of golden coins raining down from above, champagne glasses, red ribbon and confetti, opulent dark background with deep black and gold tones, gift box with glowing gold bow center-stage, warm dramatic light from above, casino chip stacks, ultra-luxurious celebratory atmosphere, no text, cinematic lighting, square 1:1 format`
  },
  {
    file: 'vip-card-bg.png',
    prompt: `exclusive VIP casino membership card background texture: deep black with subtle diagonal gold metallic sheen, ornate gold filigree decorative border pattern, small diamond sparkles scattered, Egyptian pyramid motif faintly visible in lower corner, holographic rainbow shimmer stripe across center, premium luxury credit card aesthetic, ultra-detailed, square 1:1 format, no text`
  },
  {
    file: 'cashier-hero.png',
    prompt: `premium casino cashier and crypto payment hero image: golden Bitcoin and Ethereum coins floating in dramatic dark space, stacks of gold casino chips nearby, digital transaction glow lines connecting them, deep black background with golden light rays, a sleek minimalist crypto wallet interface glow in background, luxury fintech aesthetic, photorealistic, no text, square 1:1 format`
  },
  {
    file: '404-illustration.png',
    prompt: `casino-themed 404 error page illustration: a playing card table with scattered cards face-down forming the number 404, one mysterious masked dealer figure standing behind the empty table with arms spread, dramatic dark theater stage lighting from above, red velvet curtains parting on sides, golden spotlights, cinematic and theatrical mood, deep black background, ultra-stylized, no text, square 1:1 format`
  },
];

async function generate(item) {
  process.stdout.write(`⚙️  ${item.file}... `);
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'dall-e-3', prompt: item.prompt, n: 1,
      size: '1024x1024', quality: 'hd', style: 'vivid', response_format: 'url',
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const url = data.data[0].url;
  await downloadFile(url, path.join(OUT, item.file));
  console.log(`✅`);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, r => { r.pipe(file); file.on('finish', () => { file.close(); resolve(); }); })
      .on('error', err => { fs.unlink(dest, () => {}); reject(err); });
  });
}

async function main() {
  console.log(`\n🎨 HATHOR — ${IMAGES.length} extra images\n`);
  let ok = 0, fail = 0;
  for (const item of IMAGES) {
    try {
      await generate(item);
      ok++;
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      console.error(`❌ ${item.file}: ${err.message}`);
      fail++;
    }
  }
  console.log(`\n══════════════════════════════════`);
  console.log(`✅ Pavyko: ${ok} | ❌ Nepavyko: ${fail}`);
  console.log(`══════════════════════════════════\n`);
}
main().catch(console.error);
