// Generate background images for remaining games
const fs = require('fs'), path = require('path'), https = require('https');
const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

const images = [
  {
    name: 'dragon-tower-bg.png',
    prompt: 'Dark fantasy castle tower interior at night, spiraling stone staircase ascending into darkness, glowing amber torches on ancient stone walls, mystical dragon scales embedded in stonework, golden coins scattered on steps, dramatic upward perspective, ultra premium dark fantasy atmosphere, no text no characters, square format'
  },
  {
    name: 'coinflip-bg.png',
    prompt: 'Luxury casino close-up of spinning gold coin mid-air, dramatic macro photography, dark velvet casino background, golden light bokeh effects, premium coin reflecting casino lights, heads and tails concept, ultra VIP premium feel, no text, square format'
  },
  {
    name: 'hilo-bg.png',
    prompt: 'Dark luxury casino card table felt surface, glowing playing cards fanned out in elegant arc, golden card suit symbols spades hearts diamonds clubs scattered, dramatic amber spotlight from above, premium dark atmosphere, ultra VIP casino feel, no text, square format'
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
