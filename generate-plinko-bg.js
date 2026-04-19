// Generate plinko canvas background
const fs = require('fs'), path = require('path'), https = require('https');
const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

const prompt = `Dark luxury casino plinko game board background, deep navy and midnight blue background, glowing neon purple and cyan light grid pattern, scattered glowing light orbs suggesting pegs, dramatic upward lighting beams, subtle hexagonal geometric pattern, ultra premium VIP casino atmosphere, no text no people no balls no physical objects, pure atmospheric background, vertical composition, photorealistic`;

async function run() {
  console.log('Generating plinko-bg.png...');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'hd', style: 'vivid', response_format: 'url' })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const url = data.data[0].url;
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(OUT, 'plinko-bg.png'));
    https.get(url, r => { r.pipe(file); file.on('finish', () => { file.close(); resolve(); }); }).on('error', reject);
  });
  console.log('✅ plinko-bg.png done!');
}
run().catch(console.error);
