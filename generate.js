#!/usr/bin/env node
// ═══════════════════════════════════════════════════════
// HATHOR — Universalus DALL-E 3 generatorius
// Naudojimas:
//   node generate.js                  → interaktyvus meniu
//   node generate.js avatar "vardas"  → vienas avatars
//   node generate.js thumb "žaidimas" → žaidimo fonas
//   node generate.js custom "failas" "promtas" → laisvas promtas
// ═══════════════════════════════════════════════════════
const fs   = require('fs');
const path = require('path');
const https = require('https');

// Nuskaitome .env rankiniu būdu (be dotenv priklausomybės)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath,'utf8').split('\n').forEach(line=>{
    const m = line.match(/^([^#=]+)=(.*)$/);
    if(m) process.env[m[1].trim()] = m[2].trim();
  });
}

const API_KEY = process.env.OPENAI_API_KEY;
const OUT     = path.join(__dirname, 'public', 'img');

if (!API_KEY) { console.error('❌ OPENAI_API_KEY nerasta .env faile!'); process.exit(1); }
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// ── Stilių bazė ──────────────────────────────────────────
const BASE_DARK  = 'ultra-premium dark luxury casino, deep black background, warm gold and amber dramatic cinematic lighting, hyper-detailed photorealistic render, no text, no UI, no watermarks';
const BASE_AVATAR = 'professional portrait photography, studio lighting, sharp focus, ultra-realistic, square composition, dark premium background, no text, no watermarks';

// ── Paruošti presetai ────────────────────────────────────
const PRESETS = {

  // ─── AVATARS ───────────────────────────────────────────
  avatars: [
    {
      file: 'av-diamond-ray.png',
      size: '1024x1024',
      prompt: `Cyberpunk-luxury male poker player, sharp angular face, dark tailored suit with subtle diamond pattern, large glowing cyan blue diamond lapel pin, slicked back dark hair, piercing ice-blue eyes, confident slight smile, dramatic low-key studio lighting, deep black background, ${BASE_AVATAR}`
    },
    {
      file: 'av-the-phantom.png',
      size: '1024x1024',
      prompt: `Mysterious male poker player wearing sleek black half-mask over left eye, sharp cheekbones, deep purple theatrical lighting, black tuxedo with purple pocket square, silver cufflinks, calculating raised eyebrow, casino reflections blurred in background, ${BASE_AVATAR}`
    },
    {
      file: 'av-crown-vic.png',
      size: '1024x1024',
      prompt: `Distinguished aristocratic senior male poker player, silver hair, warm amber eyes, gold-trimmed black velvet blazer, small golden crown lapel pin, relaxed confident expression, old-money elegance, warm golden rim lighting, deep dark background, ${BASE_AVATAR}`
    },
    {
      file: 'av-lady-noir.png',
      size: '1024x1024',
      prompt: `Glamorous female poker player, jet black blunt-bang hair, black off-shoulder evening gown, rose gold ace-of-spades pendant, deep red lips, smoky eye makeup, holding ace of spades card at chin level, pink and magenta backlighting, femme fatale luxury, ${BASE_AVATAR}`
    }
  ],

  // ─── GAME THUMBNAILS ───────────────────────────────────
  thumbs: [
    {
      file: 'thumb-prempoker.png',
      size: '1024x1792',
      prompt: `Ultra-luxury VIP private poker room, black marble table with gold inlay oval surface, scattered premium gold and platinum poker chips, two elegantly gloved hands holding ace and king of spades, crystal whiskey glass with amber liquid, dramatic single overhead spotlight, rich burgundy velvet walls, gold crown molding, cinematic depth of field, ${BASE_DARK}`
    },
    {
      file: 'thumb-slots.png',
      size: '1024x1792',
      prompt: `Luxury slot machine close-up, three golden reels showing sevens and diamonds, eruption of golden coins and sparks bursting from the machine, dramatic neon glow in gold and amber, dark luxurious casino background, bokeh lights, ${BASE_DARK}`
    },
    {
      file: 'thumb-roulette.png',
      size: '1024x1792',
      prompt: `European roulette wheel close-up shot from above, spinning motion blur on the outer ring, white ball suspended over red 7, dramatic warm gold lighting, dark casino floor background, scattered gold chips around the wheel, ${BASE_DARK}`
    },
    {
      file: 'thumb-blackjack.png',
      size: '1024x1792',
      prompt: `Blackjack table close-up, dealer's elegant gloved hands placing cards on green felt, player hand showing ace and king face-up, large stack of black and gold chips, "BLACKJACK" golden text on felt partially visible, dramatic overhead light, ${BASE_DARK}`
    },
    {
      file: 'thumb-holdem.png',
      size: '1024x1792',
      prompt: `Casino Hold'em poker table, five community cards face-up on green felt — royal flush of hearts, two hands visible folding and revealing cards, large central pot of premium chips, cinematic overhead shot, dramatic warm lighting, ${BASE_DARK}`
    },
    {
      file: 'thumb-3card.png',
      size: '1024x1792',
      prompt: `Three Card Poker table, three playing cards face up showing a royal flush — Ace, King, Queen of spades, elegant gold chip stack beside them, dark green premium felt, dramatic spotlight from above, luxury casino atmosphere, ${BASE_DARK}`
    },
    {
      file: 'thumb-plinko.png',
      size: '1024x1792',
      prompt: `Plinko board close-up, golden ball bouncing between gleaming metal pegs, motion trail of light, bottom slots glowing with gold multiplier labels, futuristic luxury casino aesthetic, neon and gold color scheme, ${BASE_DARK}`
    },
    {
      file: 'thumb-crash.png',
      size: '1024x1792',
      prompt: `Aviator crash game visualization, a sleek golden jet plane soaring upward with a glowing multiplier curve trail, dramatic dark sky background with golden light burst, tension and excitement, luxury casino style, ${BASE_DARK}`
    },
    {
      file: 'thumb-mines.png',
      size: '1024x1792',
      prompt: `Mines casino game grid, 5x5 dark tiles, some revealing gleaming diamonds with golden light rays, one tile showing a red glowing mine about to explode, dramatic dark luxury aesthetic, tension and suspense, ${BASE_DARK}`
    },
    {
      file: 'thumb-hilo.png',
      size: '1024x1792',
      prompt: `Hi-Lo card game, single oversized playing card floating in dramatic light — ace of spades on one side, glowing UP and DOWN arrows in gold below it, mysterious dark luxury casino background, ${BASE_DARK}`
    },
    {
      file: 'thumb-baccarat.png',
      size: '1024x1792',
      prompt: `Baccarat table, two elegant hands — player and banker — each holding face-down cards about to be revealed, pure luxury casino setting, gold and black color scheme, dramatic low lighting, Asian luxury casino aesthetic, ${BASE_DARK}`
    },
    {
      file: 'thumb-keno.png',
      size: '1024x1792',
      prompt: `Keno lottery balls in a transparent glass drum, glowing numbered spheres in gold and white, several balls erupting outward with golden light trails, luxury casino display board in background, ${BASE_DARK}`
    }
  ],

  // ─── EXTRA / MISC ──────────────────────────────────────
  extras: [
    {
      file: 'hero-bg.jpg',
      size: '1792x1024',
      prompt: `Wide panoramic luxury casino interior, grand hall with ornate gold chandeliers, deep green carpet, multiple gaming tables with dealers, warm amber and gold lighting, no people faces visible, aspirational wealth aesthetic, ${BASE_DARK}`
    },
    {
      file: 'vip-banner.jpg',
      size: '1792x1024',
      prompt: `VIP casino lounge, exclusive private room with dark walls, gold accents, leather chairs around a private poker table, subtle ambient lighting, champagne glasses, prestige and exclusivity, no faces, ${BASE_DARK}`
    }
  ]
};

// ── Core request function ────────────────────────────────
function dalleGen(prompt, size) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model:'dall-e-3', prompt, n:1, size, quality:'hd', response_format:'url' });
    const req = https.request({
      hostname:'api.openai.com', path:'/v1/images/generations', method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+API_KEY, 'Content-Length':Buffer.byteLength(body) }
    }, res => {
      let d='';
      res.on('data', c=>d+=c);
      res.on('end', ()=>{
        try { const j=JSON.parse(d); j.error?reject(new Error(j.error.message)):resolve(j.data[0].url); }
        catch(e){ reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

function dlFile(url, dest) {
  return new Promise((resolve, reject) => {
    const follow = (u) => {
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

async function genOne(asset) {
  const dest = path.join(OUT, asset.file);
  console.log(`⏳  ${asset.file}  (${asset.size})`);
  try {
    const url = await dalleGen(asset.prompt, asset.size);
    await dlFile(url, dest);
    console.log(`✅  Išsaugota → ${dest}`);
    return true;
  } catch(e) {
    console.error(`❌  Klaida (${asset.file}): ${e.message}`);
    return false;
  }
}

async function genGroup(group, label) {
  console.log(`\n════════════════════════════════\n🎨 Generuoju: ${label}\n════════════════════════════════`);
  let ok=0;
  for (const a of group) {
    const r = await genOne(a);
    if(r) ok++;
    await new Promise(r=>setTimeout(r, 1200));
  }
  console.log(`\n✔  ${ok}/${group.length} sėkmingai`);
}

// ── CLI handler ──────────────────────────────────────────
async function main() {
  const [,, cmd, arg1, arg2] = process.argv;

  if (cmd === 'avatars') {
    await genGroup(PRESETS.avatars, 'Visi botų avatarai');
  } else if (cmd === 'thumbs') {
    await genGroup(PRESETS.thumbs, 'Visi žaidimų fonai');
  } else if (cmd === 'extras') {
    await genGroup(PRESETS.extras, 'Papildomi paveikslėliai');
  } else if (cmd === 'all') {
    await genGroup(PRESETS.avatars, 'Avatarai');
    await genGroup(PRESETS.thumbs,  'Žaidimų fonai');
    await genGroup(PRESETS.extras,  'Papildomi');
  } else if (cmd === 'custom' && arg1 && arg2) {
    await genOne({ file: arg1, size: '1024x1024', prompt: arg2 });
  } else if (cmd === 'thumb' && arg1) {
    const t = PRESETS.thumbs.find(x=>x.file.includes(arg1));
    if (t) await genOne(t); else console.log('Nerasta. Galimi: '+PRESETS.thumbs.map(x=>x.file).join(', '));
  } else if (cmd === 'avatar' && arg1) {
    const a = PRESETS.avatars.find(x=>x.file.includes(arg1));
    if (a) await genOne(a); else console.log('Nerasta. Galimi: '+PRESETS.avatars.map(x=>x.file).join(', '));
  } else {
    console.log(`
╔═══════════════════════════════════════╗
║   HATHOR — DALL-E 3 Generatorius      ║
╠═══════════════════════════════════════╣
║  node generate.js all                 ║  viska generuoti
║  node generate.js avatars             ║  tik botų avatarus
║  node generate.js thumbs              ║  tik žaidimų fonus
║  node generate.js extras              ║  hero/vip banerius
║  node generate.js avatar diamond-ray  ║  vienas avatars
║  node generate.js thumb prempoker     ║  vienas fonas
║  node generate.js custom fail.png "promtas"
╚═══════════════════════════════════════╝

Presetų sąrašas:
  Avatarai : ${PRESETS.avatars.map(x=>x.file).join(', ')}
  Fonai    : ${PRESETS.thumbs.map(x=>x.file).join(', ')}
  Papildomi: ${PRESETS.extras.map(x=>x.file).join(', ')}
`);
  }

  console.log('\n🎉 Baigta!');
}

main().catch(console.error);
