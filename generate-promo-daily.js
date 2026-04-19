// Generate promo-daily.png — daily prize card background
const fs = require('fs'), path = require('path'), https = require('https');
const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

const prompt = `daily bonus reward background image for online casino: a glowing golden gift box overflowing with coins and light beams, surrounded by emerald green sparkles and confetti, a calendar with the number 1 circled in gold suggesting daily login reward, luxury dark background with deep green and gold tones, warm dramatic light, no text, square 1:1 format, ultra-photorealistic`;

async function run() {
  console.log('⚙️  promo-daily.png...');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method:'POST',
    headers:{'Authorization':`Bearer ${API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({model:'dall-e-3',prompt,n:1,size:'1024x1024',quality:'hd',style:'vivid',response_format:'url'}),
  });
  const data = await res.json();
  if(data.error) throw new Error(data.error.message);
  const url = data.data[0].url;
  await new Promise((resolve,reject)=>{
    const file=fs.createWriteStream(path.join(OUT,'promo-daily.png'));
    https.get(url,r=>{r.pipe(file);file.on('finish',()=>{file.close();resolve();});}).on('error',reject);
  });
  console.log('✅ promo-daily.png done!');
}
run().catch(console.error);
