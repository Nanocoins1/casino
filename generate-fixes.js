// HATHOR — Duplikatų taisymas (DALL-E 3)
// Paleidimas: node generate-fixes.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

const BASE = 'ultra premium dark luxury casino art, deep black background (#050508), warm gold and amber dramatic lighting, cinematic render quality, hyper-detailed, no text, no UI, no watermark, professional game art';

// ══════════════════════════════════════════════════════════════════
// KAS SKIRIASI kiekvienas žaidimas:
//
// CRASH vs DRAGON CRASH:
//   crash = klasikinis multiplier žaidimas — RAKETА, grafikas kyla, nėra drakono
//   dragon = Drakono crash — DRAKONAS jau sugeneruotas (thumb-dragon.png)
//
// POKER vs PREMPOKER vs VIDEOPOKER:
//   poker = Texas Hold'em — žmonės prie stalo, kortos rankose
//   prempoker = VIP aukšti statymai — ne kortos, o ŽETONŲ BOKŠTAI + auksas
//   videopoker = Mašina — APARATAS/TERMINALAS, ekranas, ne žmonės
//
// KENO vs KRIOKLIS (Plinko):
//   keno = loterija — NUMERUOTI KAMUOLIAI mašinoje, skelbimas
//   krioklis = Plinko — VERTIKALI LENTA su kaiščiais, kamuolys krenta žemyn
// ══════════════════════════════════════════════════════════════════

const IMAGES = [

  // ── CRASH — pakeičiame į RAKETĄ (ne drakonas, drakonas bus Dragon Crash) ──
  {
    file: 'thumb-crash.png',   // PERRAŠOME — dabar raketinis, ne drako
    size: '1024x1024',
    prompt: `Casino crash multiplier game visual: a sleek golden rocket ship launching vertically, leaving a bright trail of amber and white light, multiplier numbers (2x 5x 10x) dissolving upward around it like digital rain, motion blur emphasizing extreme upward speed, abstract digital grid lines in background suggesting a graph axis, split second before the crash point, pure adrenaline and mathematics, NO dragon, clean futuristic aesthetic, ${BASE}`
  },

  // ── KRIOKLIS / PLINKO — visiškai unikalus, ne kamuoliai kaip Keno ──
  {
    file: 'thumb-krioklis.png',  // NAUJAS — Plinko lenta
    size: '1024x1024',
    prompt: `Plinko casino game board close-up: a dramatic vertical board filled with rows of gleaming golden metallic pegs arranged in a triangle pattern, a single bright gold ball mid-fall bouncing off a peg, leaving a golden spark trail behind it, the ball path illuminated in warm amber light, prize buckets glowing at the bottom in different colored lights (gold, purple, green), sense of physical gravity and randomness, NOT a lottery machine, NOT numbered balls, purely mechanical peg physics, cinematic lighting, ${BASE}`
  },

  // ── PREMPOKER — ne kortos, o VIP žetonų bokštai ──
  {
    file: 'thumb-prempoker.png',  // PERRAŠOME — drastiškai skirtingas
    size: '1024x1024',
    prompt: `Ultra-exclusive VIP casino premium poker scene: extreme close-up of a towering fortress of premium casino chips stacked impossibly high, deep purple and black chips alternating with solid gold chips, a single diamond-encrusted gold card chip topper at the summit catching a spotlight, dark purple velvet surface reflecting chip tower, no human hands visible, dramatic single overhead spotlight creating long vertical shadow, sense of massive wealth and high-stakes solitude, purely about the CHIPS not cards, ${BASE}`
  },

  // ── VIDEOPOKER — mašina/aparatas, ne žmonės prie stalo ──
  {
    file: 'thumb-videopoker.png',  // PERRAŠOME — aiški mašina
    size: '1024x1024',
    prompt: `Retro arcade video poker cabinet seen from dramatic slight angle, entire machine visible: dark metallic cabinet body with chrome trim, large neon blue glowing CRT screen displaying WINNER with four aces, coin slot gleaming gold, credit meter in red LED numbers, HOLD buttons lit in cobalt blue, DEAL button pulsing orange, small jackpot amount in gold digits on top display, dark arcade room background, NO human players, purely machine aesthetics, retro-futuristic casino machine, ${BASE}`
  },

  // ── DRAGON CRASH — patvirtinamas kaip paskutinis perrašymas ──
  // (thumb-dragon.png jau buvo sugeneruotas — GERAI, paliekame)

  // ══ IKONŲ BADGE'AI — unikalūs kiekvienam žaidimui ══════════════

  // Crash raketinis icon (ne drakonas)
  {
    file: 'icon-crash.png',  // PERRAŠOME — raketinis
    size: '1024x1024',
    prompt: `Casino crash game icon: a single sleek golden rocket pointing steeply upward, motion lines trailing below, multiplier number 10x glowing below it, minimal clean design, deep black background, centered composition, premium metallic gold render, game icon badge style, ${BASE}`
  },

  // Dragon Crash icon (drakonas)
  {
    file: 'icon-dragon.png',  // NAUJAS — tik drakonas
    size: '1024x1024',
    prompt: `Casino dragon crash game icon: a fierce dragon head in profile, mouth open with golden fire breath, scales like polished obsidian with red glowing cracks, single dramatic eye glowing amber, deep black background, centered icon composition, premium render, game badge style, ${BASE}`
  },

  // Premium Poker icon — žetonai/korona (ne kortos)
  {
    file: 'icon-prempoker.png',  // NAUJAS
    size: '1024x1024',
    prompt: `Casino premium poker VIP icon: a jeweled golden crown sitting on top of a stack of purple and gold casino chips, amethyst gems in the crown, dramatic single spotlight, deep black background, centered compact icon composition, luxury render, ${BASE}`
  },

  // Video Poker icon — ekranas/mašina (ne kortos)
  {
    file: 'icon-videopoker.png',  // NAUJAS
    size: '1024x1024',
    prompt: `Casino video poker machine icon: a compact retro CRT screen in gold chrome frame showing four aces, neon blue screen glow, cobalt HOLD button lit below, deep black background, centered icon composition, retro-futuristic game badge style, ${BASE}`
  },

  // Krioklis / Plinko icon (kaiščiai, ne kamuoliai kaip Keno)
  {
    file: 'icon-krioklis.png',  // NAUJAS
    size: '1024x1024',
    prompt: `Casino plinko game icon: a triangular arrangement of golden metallic pegs on a dark board, a single bright gold ball mid-bounce between two pegs with spark effect, minimal geometric pattern, deep black background, centered icon composition, clean game badge style, ${BASE}`
  },

  // Keno icon — loterijos kamuoliai (skiriasi nuo Plinko)
  {
    file: 'icon-keno.png',  // NAUJAS
    size: '1024x1024',
    prompt: `Casino keno lottery icon: three numbered golden lottery balls (7, 23, 42) floating mid-air with amber inner glow lighting each number, arranged in a compact triangle, deep black background, centered icon composition, lottery-style game badge, ${BASE}`
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
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log(`\n🎨 HATHOR — duplikatų taisymas`);
  console.log(`📁 Išsaugoma: ${OUT}`);
  console.log(`📸 Vaizdų: ${IMAGES.length}\n`);

  let ok = 0, fail = 0;
  for (const item of IMAGES) {
    try {
      await generate(item);
      ok++;
      await new Promise(r => setTimeout(r, 1500));
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
