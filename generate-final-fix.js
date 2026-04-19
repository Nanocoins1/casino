// HATHOR — coinflip (be kauliukų!) + hilo (ne žalias stalas!)
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

const IMAGES = [

  // COINFLIP — tik moneta ore, JOKIŲ kauliukų, jokio stalo, tik tamsi fono spalva
  {
    file: 'thumb-coinflip.png',
    size: '1024x1792',
    prompt: `Casino coin flip game: a single massive gold coin spinning in mid-air, the coin completely fills the upper frame, heads side visible showing an ornate king's face embossed in deep relief with golden shine, the coin is FLAT and clearly circular — NOT a cube, NOT a dice, pure coin shape, the coin is spinning so the edge shows a blur of golden light, deep black void background with no table, no surface, no casino elements, just the spinning coin against infinite darkness, golden light emanating from the coin itself, dramatic chiaroscuro lighting, the coin is clearly HEADS on one side and TAILS (eagle) slightly blurred on the rotating edge, ultra-premium photorealistic render, no dice, no chips, no table, no people, purely the coin in space, deep black background, warm gold lighting, hyper-detailed photorealistic render, no text overlays, no UI, no watermarks, professional game advertisement poster, vertical portrait`
  },

  // HILO — STRELĖS aukštyn/žemyn, TAMSUS fonas, ne žalias stalas, ne poker
  {
    file: 'thumb-hilo.png',
    size: '1024x1792',
    prompt: `Casino Hi-Lo card prediction game: a dramatic dark scene — in the CENTER of the frame a single playing card face-down with a glowing question mark, above it a massive glowing neon arrow pointing UP (green, blazing), below it a massive glowing neon arrow pointing DOWN (red, blazing), the two arrows dominate the composition top and bottom, the background is deep indigo/midnight blue with electric neon glow — NO green casino table, NO poker chips, NO poker table, purely the UP arrow, the mystery card, and the DOWN arrow in vertical composition, this is about PREDICTION not poker, the arrows glow with electric energy, the whole image screams "will it go HIGHER or LOWER?", ultra-premium dark luxury casino advertisement, deep midnight blue background, neon green and red lighting, hyper-detailed photorealistic render, no text overlays, no UI, no watermarks, professional game art, vertical portrait composition`
  },

];

async function generate(item) {
  console.log(`⚙️  Generuoju: ${item.file}...`);
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: item.prompt,
      n: 1,
      size: item.size,
      quality: 'hd',
      style: 'vivid',
      response_format: 'url',
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const url = data.data[0].url;
  const filePath = path.join(OUT, item.file);
  await downloadFile(url, filePath);
  console.log(`  ✅ Išsaugota: public/img/${item.file}`);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
}

async function main() {
  console.log('\n🔧 HATHOR — galutinis fix\n');
  console.log('📌 coinflip → tik moneta ore (JOKIŲ kauliukų!)');
  console.log('📌 hilo     → strėlės aukštyn/žemyn (NE žalias poker stalas!)\n');
  let ok = 0, fail = 0;
  for (const item of IMAGES) {
    try {
      await generate(item);
      ok++;
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      console.error(`  ❌ Klaida (${item.file}): ${err.message}`);
      fail++;
    }
  }
  console.log(`\n✅ Pavyko: ${ok} | ❌ Nepavyko: ${fail}\n`);
}

main().catch(console.error);
