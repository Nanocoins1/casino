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
  // Nauja didelė stalo tekstūra — tamsesnė, turtingesnė, matoma centrinis žiedas
  {
    file: 'pp-felt.jpg',
    size: '1024x1024',
    prompt: `Extreme close-up overhead bird's-eye view of an exclusive VIP casino poker table felt, perfectly filling the entire square frame. Deep forest green premium baize fabric with ultra-fine weave texture visible. Centered: a beautifully embossed circular gold ornamental ring inlay on the felt, subtle and luxurious. A soft radial spotlight from directly above creates a bright center gradually fading to very dark edges (heavy vignette). The felt color transitions: bright emerald green at center → deep hunter green → near-black at corners. Small scattered details: two elegant matte-black poker chips with gold edge catching light on the lower portion. Zero cards visible. Photorealistic macro photography, 8K detail, square overhead composition, warm amber overhead lighting, no text, no logos, no people, no UI`
  },
  // Fono nuotrauka — tik sienos ir apšvietimas, jokio stalo
  {
    file: 'pp-room-bg.jpg',
    size: '1024x1792',
    prompt: `Intimate luxury casino VIP room interior, portrait format, shot from a low angle looking slightly upward. IMPORTANT: NO tables, NO chairs, NO furniture visible at all — only walls and ceiling. Walls: very dark charcoal with subtle geometric art-deco gold leaf pattern inlaid. Ceiling: ornate dark coffered ceiling with a single large crystal chandelier hanging center, glowing warm amber. Floor: barely visible deep black marble with faint gold veining, reflecting the chandelier glow. Two tall narrow arched doorways on the sides draped with heavy oxblood-red velvet curtains with gold tassels. The overall composition is a dramatic empty room shell — architectural, theatrical, deeply dark and moody. A single warm amber spotlight cone from the chandelier illuminates only the center of the floor, leaving edges in near-darkness. Cinematic, photorealistic, 8K, no people, no text, no tables, no seats, no chips, no cards`
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
    console.log(`\n⏳ ${a.file} (${a.size})...`);
    try {
      const url = await dalleGen(a.prompt, a.size);
      await dlFile(url, dest);
      console.log(`✅ Išsaugota: ${dest}`);
    } catch(e) { console.error(`❌ Klaida: ${e.message}`); }
    await new Promise(r=>setTimeout(r,1500));
  }
  console.log('\n🎉 Baigta!');
}
main();
