// Generate remaining game backgrounds
const fs = require('fs'), path = require('path'), https = require('https');
const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

const images = [
  {
    name: 'keno-bg.png',
    prompt: 'Dark luxury casino bingo keno hall, glowing numbered balls floating in dramatic light, deep purple and dark blue atmosphere, golden number grid, mystical orbs of light, ultra premium VIP casino feel, abstract background, no text no characters, square format'
  },
  {
    name: 'wheel-bg.png',
    prompt: 'Luxury casino fortune wheel close-up, ornate golden spinning wheel with colorful segments, dramatic spotlight from above, dark premium background, glittering gold and jewel tones, prize wheel glow, ultra VIP casino atmosphere, no text no characters, square format'
  },
  {
    name: 'videopoker-bg.png',
    prompt: 'Dark luxury casino video poker machine interior, glowing neon poker cards on dark velvet, dramatic amber and blue lighting, premium card symbols aces kings queens jacks, holographic display effect, ultra VIP casino atmosphere, no text no characters, square format'
  },
  {
    name: 'dice-bg.png',
    prompt: 'Dark luxury casino craps table aerial view, glowing golden dice mid-roll on dark green felt, dramatic overhead spotlight, golden chips scattered, premium casino atmosphere, motion blur on tumbling dice, ultra VIP feel, no text no characters, square format'
  }
];

async function genOne(item) {
  console.log(`Generating ${item.name}...`);
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'dall-e-3', prompt: item.prompt, n: 1, size: '1024x1024', quality: 'hd', style: 'vivid', response_format: 'url' })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const url = data.data[0].url;
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(OUT, item.name));
    https.get(url, r => { r.pipe(file); file.on('finish', () => { file.close(); resolve(); }); }).on('error', reject);
  });
  console.log(`✅ ${item.name} done!`);
}

async function run() {
  for (const item of images) {
    await genOne(item);
  }
}
run().catch(console.error);
