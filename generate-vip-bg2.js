const fs = require('fs'), path = require('path'), https = require('https');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath,'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}
const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

const ASSETS = [
  {
    file: 'pp-room-bg.jpg',
    size: '1024x1792',
    prompt: `Ultra-luxury casino VIP lounge interior, portrait orientation, NO tables visible, NO cards, NO chips. Focus: deep charcoal black walls with subtle gold leaf art deco geometric patterns, tall ornate dark wood paneling with gold inlay trim, two large dramatic pendant chandeliers hanging from above with warm amber glow creating light pools on the dark floor, rich deep red velvet curtains on the sides partially visible, black marble floor with faint gold veining reflecting the chandelier light, atmosphere of extreme exclusivity and secrecy, empty room, no furniture visible, purely atmospheric and architectural, cinematic depth, heavy vignette darkening edges, central area slightly lighter with warm amber glow from above. Photorealistic, 8K, ultra-detailed, no people, no text, no UI, no poker table, no chairs`
  }
];

function dalleGen(prompt, size) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model:'dall-e-3', prompt, n:1, size, quality:'hd', response_format:'url' });
    const req = https.request({
      hostname:'api.openai.com', path:'/v1/images/generations', method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+API_KEY, 'Content-Length':Buffer.byteLength(body) }
    }, res => {
      let d=''; res.on('data',c=>d+=c);
      res.on('end',()=>{ try{ const j=JSON.parse(d); j.error?reject(new Error(j.error.message)):resolve(j.data[0].url); }catch(e){reject(e);} });
    });
    req.on('error',reject); req.write(body); req.end();
  });
}

function dlFile(url, dest) {
  return new Promise((resolve, reject) => {
    const follow = u => {
      https.get(u, res => {
        if(res.statusCode===301||res.statusCode===302) return follow(res.headers.location);
        const f=fs.createWriteStream(dest);
        res.pipe(f); f.on('finish',()=>{f.close();resolve();}); f.on('error',reject);
      }).on('error',reject);
    };
    follow(url);
  });
}

async function main() {
  for (const a of ASSETS) {
    const dest = path.join(OUT, a.file);
    console.log(`⏳ ${a.file}...`);
    try {
      const url = await dalleGen(a.prompt, a.size);
      await dlFile(url, dest);
      console.log(`✅ ${dest}`);
    } catch(e) { console.error(`❌ ${e.message}`); }
  }
  console.log('🎉 Baigta!');
}
main();
