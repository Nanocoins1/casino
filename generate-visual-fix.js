// HATHOR — vizualiai identiškų vaizdų taisymas
// Taisomi 3 vaizdai kurie atrodo per panašiai:
// prempoker (per panašus į poker), limbo (per panašus į crash raketą), coinflip (per panašus į dice)

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

const IMAGES = [

  // ── PREMPOKER ── VISIŠKAI KITOKS nei poker (ne stalas, ne čipai, ne žalia)
  // Poker = žalias stalas + žaidėjai + čipai
  // Prempoker = KARALIŠKA PRABANGA — karūna, violetinė, auksas — JOKIŲ ČIPŲ, JOKIŲ KORTŲ
  {
    file: 'thumb-prempoker.png',
    size: '1024x1792',
    prompt: `Ultra-luxury VIP casino royalty scene: a single magnificent jeweled golden crown placed on a deep purple velvet throne pedestal, the crown encrusted with large diamonds and rubies, God rays of golden light shining down from above onto the crown, purple and gold color scheme throughout, deep royal purple background with subtle gold filigree patterns, NO poker chips, NO playing cards, NO green felt table — purely royal symbols of exclusivity and power, the crown is the sole hero of the image dominating the frame, dramatic top-down divine lighting, ultra photorealistic render, 8K quality, no text, no watermarks, deep black and purple background, warm gold and amber dramatic cinematic lighting, hyper-detailed photorealistic render, professional game advertisement poster quality, vertical portrait composition`
  },

  // ── LIMBO ── VISIŠKAI KITOKS nei crash (ne raketa, ne aukštyn kylantis)
  // Crash = raketa kylanti aukštyn (vertikalu)
  // Limbo = TAIKINYS — koncentriniai žiedai, horizontalu, žydra/cyan spalva
  {
    file: 'thumb-limbo.png',
    size: '1024x1792',
    prompt: `Casino limbo multiplier game visual: a glowing neon BULLSEYE TARGET filling the frame — concentric rings in cyan and electric blue radiating outward from a blazing center point, a sharp bright arrow cursor frozen at exactly the 7.24x ring, each ring labeled with multiplier values (1x, 2x, 5x, 10x, 25x, 100x), the HORIZONTAL composition dominates — rings spread wide left and right, the arrow approaches from the left side, cyan and electric blue color palette throughout on deep black background, mathematical precision aesthetic, NO rocket, NO vertical line going up, purely circular target rings and a horizontal arrow, ultra-premium dark luxury casino art, deep black background, cyan neon lighting, hyper-detailed photorealistic render, no text overlays, no UI, no watermarks, professional game art, vertical portrait`
  },

  // ── COINFLIP ── VISIŠKAI KITOKS nei dice (ne apvalūs objektai, ne tumbling)
  // Dice = du auksiniai kubai (kauliukai) lekiantys ore
  // Coinflip = DVI RANKOS — viena meta monetą, kita gaudo — aiškus HEADS/TAILS
  {
    file: 'thumb-coinflip.png',
    size: '1024x1792',
    prompt: `Casino coin flip game: a dramatic moment — one gloved hand's thumb launching a large ornate gold coin spinning vertically into the air, the coin frozen mid-spin with motion blur on its edges, one flat side of the coin faces camera showing an intricate embossed EAGLE head in perfect detail with the words HEADS visible, the other side blurred in motion showing TAILS, coin is NOT round from above but seen EDGE-ON showing its spinning, deep red and gold color contrast (red background glow from below, gold coin), completely different from dice — this is clearly a SINGLE FLAT COIN not cubes, a second gloved hand visible below ready to catch, ultra-premium dark luxury casino art, deep red accent lighting from below, warm gold coin, hyper-detailed photorealistic render, no text overlays, no UI, no watermarks, professional game advertisement poster quality, vertical portrait composition`
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
  console.log('\n🎨 HATHOR — vizualinis fix (3 vaizdai)\n');
  console.log('📌 prempoker → karūna (violetinė, jokių čipų)');
  console.log('📌 limbo    → taikinys (žydra, ne raketa)');
  console.log('📌 coinflip → moneta rankoje (raudona, ne kauliukai)\n');
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
