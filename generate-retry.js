// HATHOR — nepavykusių paveikslėlių pakartojimas
// Paleidimas: node generate-retry.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');
const BASE = 'ultra-premium dark luxury casino art, deep black background, warm gold and amber dramatic cinematic lighting, hyper-detailed photorealistic render, no text overlays, no UI, no watermarks, professional game art';

const RETRY_IMAGES = [
  {
    file: 'thumb-slots.png',
    size: '1024x1792',
    prompt: `Casino slot machine jackpot moment: three glowing slot reels perfectly aligned showing triple 7s in gold, coins exploding outward from the reels filling the entire frame, jackpot lights flashing in rings of red and gold, digital display with large numbers, golden coins raining down, celebration confetti in gold and red, reels lit with warm amber glow, chrome machine frame, euphoric winning moment, ${BASE}`
  },
  {
    file: 'thumb-hilo.png',
    size: '1024x1792',
    prompt: `Casino high-low card prediction game: a playing card being revealed showing a red Queen of Hearts, glowing arrows pointing UP and DOWN in gold neon on either side, card spread showing previous revealed cards below, question mark hovering above a face-down card at the top, gold and dark casino felt background, dramatic card-game atmosphere, premium casino card art, ${BASE}`
  },
];

async function generate(item) {
  console.log(`⚙️  Generuoju: ${item.file}...`);
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: item.prompt,
      n: 1,
      size: item.size,
      quality: 'hd',
      style: 'vivid',
      response_format: 'url',
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const url = data.data[0].url;
  const filePath = path.join(OUT, item.file);
  await downloadFile(url, filePath);
  console.log(`  ✅ Išsaugota: public/img/${item.file}`);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
}

async function main() {
  console.log('\n🔄 HATHOR — Pakartojimas\n');
  let ok = 0, fail = 0;
  for (const item of RETRY_IMAGES) {
    try {
      await generate(item);
      ok++;
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`  ❌ Klaida (${item.file}): ${err.message}`);
      fail++;
    }
  }
  console.log(`\n✅ Pavyko: ${ok} | ❌ Nepavyko: ${fail}\n`);
}

main().catch(console.error);
