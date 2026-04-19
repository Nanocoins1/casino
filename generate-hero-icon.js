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
  // Hero banner — ultra premium casino panorama
  {
    file: 'hero-casino.png',
    size: '1792x1024',
    prompt: `Ultra-premium luxury online casino hero banner, wide landscape format. Scene: a dramatic dark casino interior shot from an extremely low, wide angle — looking up slightly. Left side dominates: deep black with gold geometric art-deco patterns, glowing amber neon outline trim. Center: a grand oval green felt poker table illuminated by a single dramatic overhead spotlight, surrounded by luxury high-back leather chairs, a few premium black and gold poker chips scattered on the felt. Right side fades to dark. Bottom edge: subtle bokeh lights like casino floor. Overall palette: deep black, gold, amber, rich emerald green felt. Mood: exclusive, cinematic, aspirational. NO text overlay, NO people visible, NO UI elements, photorealistic, 8K render, ultra-wide cinematic composition`
  },
  // PWA icon 512x512 — gold crown/diamond on dark
  {
    file: 'icon-512.png',
    size: '1024x1024',
    prompt: `Square app icon for a luxury casino app. Dark near-black background (#04040a). Center: a large ornate golden crown symbol, richly detailed with diamond inlays, glowing with warm amber and gold light rays emanating outward. The crown is 3D rendered, metallic gold with subtle jewel highlights. Around it: very faint subtle star/sparkle particles. The overall feel is: premium, exclusive, royal, casino. Perfect square composition, the crown fills about 65% of the frame centered. Sharp edges for app icon use. Photorealistic 3D render, no text, no letters, no words`
  },
  // PWA icon 192x192 — same design smaller
  {
    file: 'icon-192.png',
    size: '1024x1024',
    prompt: `Square luxury casino app icon. Pure deep black background. Center: bold stylized golden crown, 3D metallic gold with diamond accents, dramatic warm lighting, inner glow of amber light. Minimalist — just the crown on black. Perfect for a small app icon. Crisp, bold, instantly recognizable. Square composition, no text, no letters`
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
    console.log(`\n⏳  ${a.file}  (${a.size})...`);
    try {
      const url = await dalleGen(a.prompt, a.size);
      await dlFile(url, dest);
      console.log(`✅  ${dest}`);
    } catch(e) { console.error(`❌  Klaida: ${e.message}`); }
    await new Promise(r=>setTimeout(r,1500));
  }
  console.log('\n🎉 Viskas sugeneruota!');
}
main();
