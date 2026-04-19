// Generate baccarat table background
const fs = require('fs'), path = require('path'), https = require('https');
const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

const prompt = `Luxury casino baccarat table felt surface viewed from above, deep royal green velvet texture with subtle sheen, golden oval betting zones for Player and Banker, elegant golden border trim with intricate filigree patterns, ornate card suit symbols embossed in gold scattered across the felt, warm casino amber spotlights creating dramatic lighting from above, ultra photorealistic premium texture, no text no cards no chips no people, square format`;

async function run() {
  console.log('Generating baccarat-bg.png...');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'hd', style: 'vivid', response_format: 'url' })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const url = data.data[0].url;
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(OUT, 'baccarat-bg.png'));
    https.get(url, r => { r.pipe(file); file.on('finish', () => { file.close(); resolve(); }); }).on('error', reject);
  });
  console.log('✅ baccarat-bg.png done!');
}
run().catch(console.error);
