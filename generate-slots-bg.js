require('dotenv').config();
const fs = require('fs'), path = require('path'), https = require('https');
const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

async function gen() {
  console.log('Generating slots-bg.png...');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'dall-e-3', n: 1, size: '1024x1024', quality: 'hd', style: 'vivid',
      response_format: 'url',
      prompt: 'Dark luxury casino interior background, glowing neon slot machine reels blurred in background, cascade of golden coins falling dramatically, premium dark velvet and polished chrome surfaces, deep purple and gold ambient lighting with bokeh casino lights, ultra VIP premium atmosphere, no text no faces no characters, square format'
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const url = data.data[0].url;
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(OUT, 'slots-bg.png'));
    https.get(url, r => { r.pipe(file); file.on('finish', () => { file.close(); resolve(); }); }).on('error', reject);
  });
  console.log('✅ slots-bg.png done!');
}
gen().catch(console.error);
