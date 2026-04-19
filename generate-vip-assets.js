require('dotenv').config();
// HATHOR — VIP Poker assets generator (DALL-E 3)
// Generuoja: VIP botų avatarus + VIP stalo foną
const fs = require('fs'), path = require('path'), https = require('https');
const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

const ASSETS = [
  // ── VIP TABLE THUMB ──
  {
    file: 'thumb-prempoker.png',
    size: '1024x1792',
    prompt: `Ultra-luxury VIP private poker room, deep black marble table with gold inlay oval poker surface, scattered premium poker chips in gold and platinum, two elegant hands holding playing cards — an ace and a king of spades fanned out, crystal whiskey glasses with amber liquid, dramatic single overhead spotlight casting deep shadows, rich burgundy velvet walls with gold crown molding, no people visible except gloved hands, cinematic depth of field, ultra-premium dark luxury casino, hyper-detailed photorealistic render, warm gold and amber dramatic lighting, no text, no UI, no watermarks`
  },
  // ── DIAMOND RAY avatar ──
  {
    file: 'av-diamond-ray.png',
    size: '1024x1024',
    prompt: `Professional poker player portrait, masculine, sharp angular face, cyberpunk-luxury style, wearing a dark tailored suit with subtle diamond pattern, a large blue diamond lapel pin glowing with cyan light, slicked back dark hair, piercing ice-blue eyes reflecting card table lights, small confident smile, dramatic low-key studio lighting, deep black background, ultra-sharp photorealistic render, luxury casino atmosphere, no text, square composition`
  },
  // ── THE PHANTOM avatar ──
  {
    file: 'av-the-phantom.png',
    size: '1024x1024',
    prompt: `Mysterious poker player portrait, wearing a sleek black half-mask covering left eye, sharp cheekbones, dark purple theatrical lighting from below, wearing a jet-black tuxedo with deep purple pocket square, shadows across face creating an enigmatic look, silver cufflinks gleaming, one eyebrow raised in a calculating expression, casino card table reflections in background (blurred), ultra-photorealistic portrait, luxury dark atmosphere, no text, square composition`
  },
  // ── CROWN VIC avatar ──
  {
    file: 'av-crown-vic.png',
    size: '1024x1024',
    prompt: `Aristocratic senior poker player portrait, distinguished silver-haired gentleman in his 60s, wearing a gold-trimmed black velvet blazer, a small golden crown pin on lapel, warm amber eyes with a knowing smile, relaxed and confident posture, fingers lightly touching a small stack of gold chips, warm golden rim lighting against dark background, old-money elegance, ultra-photorealistic portrait, classic luxury casino feel, no text, square composition`
  },
  // ── LADY NOIR avatar ──
  {
    file: 'av-lady-noir.png',
    size: '1024x1024',
    prompt: `Glamorous female poker player portrait, striking beauty, jet black hair with blunt bangs, wearing an elegant black off-shoulder evening gown, a single pink rose gold pendant necklace, deep red lips, smoky eye makeup with a sharp gaze, one gloved hand holding a playing card (ace of spades) at chin level, pink and magenta dramatic backlighting against dark background, ultra-photorealistic portrait, femme fatale luxury casino atmosphere, no text, square composition`
  }
];

function dalleRequest(prompt, size) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,
      quality: 'hd',
      response_format: 'url'
    });
    const opts = {
      hostname: 'api.openai.com',
      path: '/v1/images/generations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          if (j.error) reject(new Error(j.error.message));
          else resolve(j.data[0].url);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        https.get(res.headers.location, res2 => {
          res2.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
        }).on('error', reject);
      } else {
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }
    }).on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  for (const asset of ASSETS) {
    const dest = path.join(OUT, asset.file);
    console.log(`\n⏳ Generuoju: ${asset.file} (${asset.size})...`);
    try {
      const url = await dalleRequest(asset.prompt, asset.size);
      console.log(`   ✅ URL gautas, siunčiu...`);
      await download(url, dest);
      console.log(`   💾 Išsaugota: ${dest}`);
    } catch(e) {
      console.error(`   ❌ Klaida (${asset.file}):`, e.message);
    }
    // Pauzė tarp užklausų
    await new Promise(r => setTimeout(r, 1500));
  }
  console.log('\n🎉 Viskas baigta!');
}

main();
