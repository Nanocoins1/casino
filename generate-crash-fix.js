// HATHOR — tik crash fix (raketa, ne grafikas)
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');
const BASE = 'ultra-premium dark luxury casino advertisement art, deep black background, warm gold and amber dramatic cinematic lighting, hyper-detailed photorealistic render, no text overlays, no UI elements, no watermarks, professional game advertisement poster quality, vertical portrait composition filling the entire frame';

// thumb-crash.png: RAKETA — absoliučiai skiriasi nuo limbo (grafiko)
// thumb-limbo.png: jau rodo grafiką einantį aukštyn — NEKEISTI
const IMAGES = [
  {
    file: 'thumb-crash.png',
    size: '1024x1792',
    prompt: `Casino crash multiplier rocket game: a massive sleek silver and gold rocket ship launching VERTICALLY straight up from a launch pad explosion of white fire and smoke, the rocket itself filling most of the vertical frame, its exhaust trail blazing amber and white downward, rocket surface reflecting stadium lights, countdown display on launch tower showing 10x then 50x then 100x in blazing red LED numbers, rocket nose pointed directly upward toward space, stars visible in the dark sky above, the rocket still accelerating — not yet crashed, the MOMENT of maximum risk and reward, absolutely NO graph lines, NO dragon, NO fantasy creatures — purely a rocket launch, photorealistic, cinematic, ${BASE}`
  },
  // thumb-poker.png: laiminantys žaidėjai prie stalo (reklamos stilius)
  // Skiriasi nuo prempoker (žetonų bokštas) ir videopoker (aparatas)
  {
    file: 'thumb-poker.png',
    size: '1024x1792',
    prompt: `Casino poker game premium advertisement: euphoric winner just revealed royal flush, throwing arms up in celebration with poker chips and cards flying through the air in a rain of winnings, three other players visible with shocked expressions, massive pile of chips in center of the green felt table being pushed toward the winner, dramatic top-down overhead spotlight, casino spectators applauding in dark background, winner's expression of pure triumph and joy, chips in gold and black flying mid-air, a premium casino advertisement showing the moment of victory, ${BASE}`
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
  console.log('\n🚀 HATHOR — Crash fix (raketa) + Poker fix\n');
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
  console.log(`\n══════════════════════════════════`);
  console.log(`✅ Pavyko: ${ok} | ❌ Nepavyko: ${fail}`);
  console.log(`══════════════════════════════════\n`);
}

main().catch(console.error);
