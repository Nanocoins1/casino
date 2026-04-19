const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

const prompt = `Casino Hi-Low prediction game icon: a glowing playing card showing the Ace of Spades centered in frame, directly above the card a large bold neon GREEN upward arrow glowing brightly, directly below the card a large bold neon RED downward arrow glowing brightly, pure black background, the card glows with golden light, clean minimalist square composition showing only: green UP arrow, golden card, red DOWN arrow stacked vertically, no people, no casino table, ultra-sharp photorealistic render, square format, 1:1 aspect ratio`;

async function main() {
  console.log('⚙️  Generuoju: icon-hilo.png...');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'hd', style: 'vivid', response_format: 'url' }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const url = data.data[0].url;
  const dest = path.join(OUT, 'icon-hilo.png');
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, r => { r.pipe(file); file.on('finish', () => { file.close(); resolve(); }); }).on('error', reject);
  });
  console.log('  ✅ Išsaugota: public/img/icon-hilo.png');
}
main().catch(console.error);
