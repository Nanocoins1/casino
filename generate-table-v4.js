// Generuoja naują ultra-prabangų pokerio stalo veltinio paveikslėlį
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

const ASSET = {
  file: 'pp-felt-v2.jpg',
  size: '1024x1024',
  prompt: `Perfect square overhead bird's-eye macro shot of the center of an ultra-premium VIP casino poker table. The entire frame is filled with deep emerald-green baize felt. In the center: a beautifully engraved oval gold inlay ring, ornate with thin interlocking vine motifs and diamond-point corner details — glowing softly under a single overhead pin-spot light. The lighting creates a dramatic radial gradient: brilliant bright emerald-jade at the very center of the oval, transitioning to deep hunter green, then to near-black velvet darkness at the four corners of the image. The felt texture is ultra-fine, soft, premium — like a billiard cloth but more refined. Scattered ONLY in the lower third: five luxury poker chips — three matte black with gold edge banding, two deep crimson with platinum edge — resting at various angles, casting tiny hard shadows. Zero playing cards. Zero text. Zero logos. Zero people. No cup holders. Just felt, gold inlay, dramatic lighting and chips. Photorealistic macro photography, 8K HDR, Hasselblad medium format look`
};

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
  const dest = path.join(OUT, ASSET.file);
  console.log(`\n⏳  Generuojamas ${ASSET.file}...`);
  try {
    const url = await dalleGen(ASSET.prompt, ASSET.size);
    await dlFile(url, dest);
    console.log(`✅  Išsaugota: ${dest}`);
    console.log('\n✨  Dabar paleisk: server.js ir atidaryk VIP Poker!');
  } catch(e) {
    console.error(`❌  Klaida: ${e.message}`);
  }
}
main();
