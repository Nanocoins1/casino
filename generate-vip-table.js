// VIP Poker table & room generator — maksimalios kokybės
require('fs').existsSync && (() => {
  const fs = require('fs'), path = require('path'), https = require('https');
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath,'utf8').split('\n').forEach(line => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    });
  }
})();

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const API_KEY = process.env.OPENAI_API_KEY;
const OUT     = path.join(__dirname, 'public', 'img');

const ASSETS = [
  // ── 1. Žaidimo arena — tamsus prabangus kambarys (fonas už visko) ──
  {
    file: 'pp-room-bg.jpg',
    size: '1024x1792',
    prompt: `Exclusive private VIP poker room, cinematic portrait view, dark dramatic atmosphere. Deep charcoal walls with subtle dark wood paneling, barely visible ornate gold leaf molding at ceiling edges. A single dramatic overhead pendant lamp casts a tight warm amber spotlight on a beautiful empty oval poker table in the center. The green baize felt is perfectly smooth and pristine, with a subtle subtle leather cushion rail in oxblood red with gold tack trim. The room is intimate — only this one table. Around it, 4 empty high-back leather chairs in deep black with gold legs. On the table: a perfect stack of premium casino chips (black and gold), two sealed decks of cards, a crystal cut glass of amber whiskey catching the light. The floor is deep black marble with faint gold veining. Background is near-black with ultra-subtle atmospheric depth. Mood: secretive, elite, cinematic. Ultra-photorealistic, 8K render quality, no text, no people, no UI elements, no watermarks, cinematic depth of field, professional architectural photography`
  },
  // ── 2. Stalo paviršius — overhead shot (naudojamas CSS table background) ──
  {
    file: 'pp-felt.jpg',
    size: '1024x1024',
    prompt: `Extreme close-up overhead shot of a luxury casino poker table felt surface, perfectly smooth deep emerald green baize, ultra-fine fabric texture visible, subtle radial light gradient from center (brighter) to edges (darker), slight vignette. In the center: a faint embossed gold crown logo watermark on the felt (subtle, elegant). Around the edges of the oval: gold metallic inlay stripe. A few premium casino chips (matte black with gold edge) and two playing cards (face down, backs showing elegant gold ornamental pattern) casually placed, catching warm overhead light. Shot from directly above, square composition, ultra-macro photorealistic render, no text, no people, warm amber directional lighting from top-left`
  },
  // ── 3. Alternatyvus — cinematic angle stalo shot ──
  {
    file: 'pp-table-side.jpg',
    size: '1024x1792',
    prompt: `Cinematic side-angle shot of a private casino poker table, low camera angle looking across the green felt surface, dramatic perspective. Five community cards face-up in a neat row at center — royal flush: Ace, King, Queen, Jack, Ten of spades — each card has an ultra-premium matte finish with gold foil edge. Large stacks of premium casino chips in black, gold and deep red arranged around the table. Crystal whiskey glasses with amber liquid on the felt rail. Warm golden spotlight from above creating long dramatic shadows. Background: blurred dark luxury casino room. Photorealistic, ultra-detailed, cinematic, 8K quality, no text, no UI, no watermarks`
  }
];

function dalleGen(prompt, size) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model:'dall-e-3', prompt, n:1, size, quality:'hd', response_format:'url' });
    const req = https.request({
      hostname:'api.openai.com', path:'/v1/images/generations', method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+API_KEY, 'Content-Length':Buffer.byteLength(body) }
    }, res => {
      let d='';
      res.on('data', c=>d+=c);
      res.on('end', ()=>{ try { const j=JSON.parse(d); j.error?reject(new Error(j.error.message)):resolve(j.data[0].url); } catch(e){ reject(e); } });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

function dlFile(url, dest) {
  return new Promise((resolve, reject) => {
    const follow = u => {
      https.get(u, res => {
        if (res.statusCode===301||res.statusCode===302) return follow(res.headers.location);
        const f = fs.createWriteStream(dest);
        res.pipe(f);
        f.on('finish', ()=>{ f.close(); resolve(); });
        f.on('error', reject);
      }).on('error', reject);
    };
    follow(url);
  });
}

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  for (const a of ASSETS) {
    const dest = path.join(OUT, a.file);
    console.log(`\n⏳ ${a.file} (${a.size})...`);
    try {
      const url = await dalleGen(a.prompt, a.size);
      await dlFile(url, dest);
      console.log(`✅ Išsaugota: ${dest}`);
    } catch(e) {
      console.error(`❌ Klaida: ${e.message}`);
    }
    await new Promise(r=>setTimeout(r,1500));
  }
  console.log('\n🎉 Visi stalo vaizdai sugeneruoti!');
}
main();
