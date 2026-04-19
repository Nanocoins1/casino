// Generate blackjack table background
const fs = require('fs'), path = require('path'), https = require('https');
const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

const prompt = `Luxury casino blackjack table felt surface viewed from above, deep emerald green velvet texture, golden curved betting arc lines, subtle card suit symbols embossed in gold (spades clubs diamonds hearts), ornate golden border trim, premium dark ambient casino lighting with warm spotlights, ultra photorealistic texture, no text no cards no chips, square format`;

async function run() {
  console.log('Generating bj-table-bg.png...');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'hd', style: 'vivid', response_format: 'url' })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const url = data.data[0].url;
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(OUT, 'bj-table-bg.png'));
    https.get(url, r => { r.pipe(file); file.on('finish', () => { file.close(); resolve(); }); }).on('error', reject);
  });
  console.log('✅ bj-table-bg.png done!');
}
run().catch(console.error);
