// HATHOR — Premium vaizdų generavimas (DALL-E 3, 1024x1792 portretas)
// Paleidimas: node generate-premium-all.js
// Kiekvienas žaidimas gauna UNIKALŲ, AUKŠČIAUSIOS KOKYBĖS reklaminį vaizdą
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

// Bazinis stilius — tamsus prabangus kazino
const BASE = 'ultra-premium dark luxury casino advertisement art, deep black background, warm gold and amber dramatic cinematic lighting, hyper-detailed photorealistic render, no text overlays, no UI elements, no watermarks, professional game advertisement poster quality, vertical portrait composition filling the entire frame';

// ═══════════════════════════════════════════════════════════════════
// THUMB vaizdai — 1024x1792 (portretas, puikiai tinka kortelėms)
// KIEKVIENAS yra UNIKALUS — visiškai skirtinga tema, scena, vizualinė kalba
// ═══════════════════════════════════════════════════════════════════
const THUMBS = [

  // ── POKER (Texas Hold'em) — žmonės prie stalo, kortos rankose ──
  {
    file: 'thumb-poker.png',
    size: '1024x1792',
    prompt: `Texas Hold'em poker championship scene: dramatic overhead-angle view of a large oval green felt casino table covered in scattered playing cards and poker chips, two professional players' hands visible — one revealing a royal flush of spades, the opponent's hand folding in defeat, massive pot of multi-colored chips in the center, crystal clear glass of whiskey on the rim, casino dealer in crisp white shirt with bow tie visible at the far end, warm spotlight from above creating deep dramatic shadows on the felt, casino spectators blurred in background, ${BASE}`
  },

  // ── PREMPOKER (VIP Poker) — ne kortos, o prabanga ir žetonai ──
  {
    file: 'thumb-prempoker.png',
    size: '1024x1792',
    prompt: `Ultra-exclusive VIP private poker room: an impossibly tall tower of premium casino chips stacked on a deep burgundy velvet surface — solid gold chips alternating with black onyx and deep purple chips, crystal chandelier reflected in the polished chips, a single diamond-encrusted playing card (Ace of Spades) leaning against the chip tower, no human players visible — purely about wealth and exclusivity, ambient candlelight on dark mahogany walls, velvet curtains, scattered gold coins around the base of the chip tower, atmosphere of forbidden luxury and extreme wealth, ${BASE}`
  },

  // ── VIDEOPOKER — mašina/aparatas, jokių žmonių ──
  {
    file: 'thumb-videopoker.png',
    size: '1024x1792',
    prompt: `Retro-futuristic video poker arcade machine filling the vertical frame: sleek dark metallic cabinet with chrome trim and art-deco gold inlays, large neon-blue glowing CRT screen dominating center showing four aces with ROYAL FLUSH in electric blue text, row of lit HOLD buttons in cobalt blue along bottom, single pulsing gold DEAL button, coin slot glowing warm gold, credit display in red LED digits showing big winner amount, reflective dark arcade floor below, other machines blurred in background, dramatic under-lighting casting upward shadows, empty player seat inviting the viewer, purely machine — no people, ${BASE}`
  },

  // ── CRASH (Raketinis) — RAKETA, BEZ DRAKONO ──
  {
    file: 'thumb-crash.png',
    size: '1024x1792',
    prompt: `Casino crash multiplier game: a sleek golden rocket ship blasting straight up through a dark digital space, leaving a blazing trail of white and amber fire that curves into a rising graph line showing multipliers 1x → 5x → 20x → 100x glowing in neon, the rocket at the very top of the frame about to disappear out of sight at 100x, abstract digital grid lines and graph axes glowing in the background, particles of light and number fragments falling away from the rocket's path, pure adrenaline mathematics of risk, absolutely NO dragon, no fantasy creatures, purely technological rocket and numbers aesthetic, ${BASE}`
  },

  // ── DRAGON CRASH — drakonas, be raketos ──
  {
    file: 'thumb-dragon.png',
    size: '1024x1792',
    prompt: `Epic dragon crash casino game: a massive dark dragon with scales like polished obsidian and gold trim banking dramatically through storm clouds, wings fully extended and glowing with red-orange bioluminescence along the wing membranes, golden coins and treasure raining from the dragon's claws as it flies, one enormous amber eye glowing with intelligence visible in profile, lightning illuminating the storm clouds behind, multiplier numbers (5x, 10x, 50x) appearing as magical runes dissolving in the dragon's wake, the dragon's tail looping into an infinity curve suggesting the betting graph, absolutely NO rocket or spacecraft, purely mythical dragon fantasy, ${BASE}`
  },

  // ── MINES — sprogmenys, deimantai ──
  {
    file: 'thumb-mines.png',
    size: '1024x1792',
    prompt: `Casino mines game dramatic scene: a dark grid of mysterious glowing tiles stretching into perspective depth, some tiles already flipped revealing brilliant blue-white diamonds radiating intense light, one tile in the center just being flipped to reveal a pulsing red bomb surrounded by warning sparks and a shockwave ring, the contrast between safe diamond tiles (safe, cold blue) and dangerous bomb tiles (hot red), the grid extends into infinity suggesting endless risk and reward, tense split-second atmosphere, ${BASE}`
  },

  // ── DICE — kauliukai ──
  {
    file: 'thumb-dice.png',
    size: '1024x1792',
    prompt: `Casino dice game: two large solid gold dice tumbling through the air in slow motion, one showing six dots (all dots glowing pure white), one showing five dots, dramatic motion blur on the dice surfaces suggesting rapid spinning, bright amber spotlight from above creating sharp shadows, deep black velvet background, scattered golden light particles around the dice as they tumble, a subtle glowing neon prediction line showing TARGET number below, the dice perfectly filling the vertical composition, no people visible, purely the dice and the moment of fate, ${BASE}`
  },

  // ── SLOTS — lošimo automatai ──
  {
    file: 'thumb-slots.png',
    size: '1024x1792',
    prompt: `Massive casino slot machine jackpot moment: three spinning reels just stopping in perfect alignment showing TRIPLE LUCKY SEVENS (777) in blazing gold, torrential waterfall of gold coins exploding outward from the reels filling the entire frame, jackpot lights flashing in rings of red and gold around the machine face, digital display showing GRAND JACKPOT in neon letters, celebration confetti in gold and crimson, the reels themselves lit from behind with warm amber glow, slot machine chrome frame gleaming with reflections, absolutely euphoric winning moment, ${BASE}`
  },

  // ── ROULETTE — ruletė ──
  {
    file: 'thumb-roulette.png',
    size: '1024x1792',
    prompt: `Luxury casino roulette table from dramatic elevated angle: the roulette wheel perfectly centered and lit by a single overhead spotlight, the silver ball mid-flight just above the spinning wheel about to land, a beautifully manicured hand placing the last chip stack onto RED, the wheel numbers blurred by rotation speed except for the section the ball is about to hit, felt betting layout extending away, stacks of premium chips in the background, croupier's rake barely visible at the edge, tension of the perfect moment before the ball drops, ${BASE}`
  },

  // ── BLACKJACK ──
  {
    file: 'thumb-blackjack.png',
    size: '1024x1792',
    prompt: `Casino blackjack table: two playing cards just slid face-up on green felt showing a perfect blackjack — an Ace of Spades and a King of Hearts, the Ace casting a dramatic shadow, a casino chip stack in gold and black perfectly balanced beside the cards, the card backs showing a premium casino pattern with gold metallic embossing, dealer's single face-down card visible at top of frame, edge of the felt table showing the premium padded rail, soft focused casino background, ${BASE}`
  },

  // ── SPORTS ──
  {
    file: 'thumb-sports.png',
    size: '1024x1792',
    prompt: `Sports betting casino visual: a football (soccer ball) frozen mid-flight toward a goal, stadium floodlights blazing behind creating a dramatic silhouette, 100,000 fans blurred in the background with phone lights creating a sea of sparkles, the ball in perfect detail with light reflecting off its surface, goal net visible and the ball trajectory showing it will go in the top corner, scoreboard in background showing tied score, odds appearing as glowing numbers in the dark sky, stadium atmosphere of the biggest match of the season, ${BASE}`
  },

  // ── COIN FLIP ──
  {
    file: 'thumb-coinflip.png',
    size: '1024x1792',
    prompt: `Casino coin flip game: an enormous gold coin spinning perfectly upright in mid-air, the heads side visible showing an ornate embossed crown design, coin surface catching light and showing deep relief detail, a small trail of sparkling light following the coin's rotation, the coin tumbling in slow motion against pure black, faint reflection of the coin glowing on a black mirror surface below, dramatic side lighting casting half the coin in gold and half in shadow, 50/50 tension of the perfect flip, ${BASE}`
  },

  // ── HILO — aukštai žemai ──
  {
    file: 'thumb-hilo.png',
    size: '1024x1792',
    prompt: `Casino Hi-Lo card game: a single playing card being dramatically turned face-up by gloved dealer fingers — revealing a red Queen of Hearts, cards arranged in a spread below showing previous cards already played, glowing arrows indicating HIGHER and LOWER in gold neon, the mystery of the next card embodied in a face-down card at top of the composition with a question mark shadow, card surfaces have premium embossed gold detail, dark felt background, ${BASE}`
  },

  // ── LIMBO — ribinis žaidimas ──
  {
    file: 'thumb-limbo.png',
    size: '1024x1792',
    prompt: `Casino limbo multiplier game: an abstract neon graph line climbing steeply upward in electric gold against infinite black, the line approaching a glowing red horizontal threshold line that represents the crash point, mathematical precision and tension, the multiplier number 4.20x displayed in massive glowing digits beside the line, probability mathematics expressed as floating equations dissolving in the background, the aesthetic of a Bloomberg terminal meets casino game, cold neon blues and golds against absolute darkness, ${BASE}`
  },

  // ── BACCARAT ──
  {
    file: 'thumb-baccarat.png',
    size: '1024x1792',
    prompt: `High society baccarat table: the moment of reveal — a croupier in white gloves turning over the final card with precise elegant motion on a cream-colored baccarat felt table, BANCO wins visible in the card total, crystal champagne flutes beside tall chip stacks in black and gold, baccarat shoe visible at one end of the table, wealthy players' hands in designer watches barely visible at the table edges, intimate private VIP room atmosphere with dark paneled walls, ${BASE}`
  },

  // ── WHEEL (Laimės ratas) ──
  {
    file: 'thumb-wheel.png',
    size: '1024x1792',
    prompt: `Casino fortune wheel spinning at full speed: an ornate vertical spinning wheel filling the frame, gold and crimson segments with multiplier prizes, the leather flapper ticking against golden pins at the rim, the wheel blurred by speed except for the section slowing down where the grand prize segment is about to land, celebration confetti already starting to fall from above in anticipation, dramatic center spotlight making the gold segments shine like sunlight, ${BASE}`
  },

  // ── KENO ──
  {
    file: 'thumb-keno.png',
    size: '1024x1792',
    prompt: `Casino keno lottery draw: a transparent glass lottery ball machine filled with golden numbered balls (1-80), the machine actively tumbling the balls, three winning balls having just been ejected — floating mid-air outside the machine showing numbers 7, 23, and 42 with amber inner glow illuminating each number, a keno card visible below showing the matched numbers, the lottery machine's mechanical clarity and randomness, professional lottery aesthetic, ${BASE}`
  },

  // ── KRIOKLIS (Plinko) — kaiščiai, ne kamuoliai ──
  {
    file: 'thumb-krioklis.png',
    size: '1024x1792',
    prompt: `Plinko casino game dramatic vertical board: a tall peg board filling the entire vertical frame, rows of gleaming gold metallic pins arranged in a perfect triangle pattern, a single brilliant gold ball mid-fall at the top of the frame sparkling with light, golden spark trail showing its previous bouncing path, lower portion showing the prize buckets glowing in different colors — gold jackpot bucket blazing brightest in the center bottom, the physics of controlled chaos, absolutely NOT a lottery ball machine, purely the falling ball and pegs, ${BASE}`
  },

  // ── PYRAMID ──
  {
    file: 'thumb-pyramid.png',
    size: '1024x1792',
    prompt: `Ancient Egyptian pyramid casino game: interior of a pharaoh's treasure chamber — massive stone walls covered in glowing hieroglyphics, a central altar overflowing with gold coins, sapphires and rubies, the Eye of Ra symbol glowing above the altar with golden light beams radiating outward, mystical game tiles hovering in the air showing multiplier symbols, torchlight casting dancing shadows on the stone walls, treasure overflowing from ornate golden chests, ${BASE}`
  },

];

// ═══════════════════════════════════════════════════════════════════
// ICON vaizdai — 512x512 (kvadratiniai ženkliukai)
// Visi nauji — unikalūs kiekvienam žaidimui
// ═══════════════════════════════════════════════════════════════════
const ICONS = [

  {
    file: 'icon-slots.png',
    size: '1024x1024',
    prompt: `Casino slots game icon badge: three glowing golden 7s on slot machine reels perfectly aligned showing jackpot, reels in chrome frame, golden coins bursting from sides, minimal centered composition, deep black background, game icon style, ${BASE}`
  },
  {
    file: 'icon-roulette.png',
    size: '1024x1024',
    prompt: `Casino roulette game icon badge: top-down view of a roulette wheel, the wheel perfectly centered, silver ball glinting in the number 7 slot, gold and dark alternating segments, minimal centered composition, deep black background, game icon style, ${BASE}`
  },
  {
    file: 'icon-crash.png',
    size: '1024x1024',
    prompt: `Casino crash game icon badge: a sleek golden rocket pointing steeply upward with motion lines trailing below, multiplier number 10x glowing below in neon, NO dragon, minimal centered composition, deep black background, game icon style, ${BASE}`
  },
  {
    file: 'icon-dragon.png',
    size: '1024x1024',
    prompt: `Casino dragon crash game icon badge: a fierce dragon head profile, amber glowing eye, mouth open with golden fire breath, obsidian scales with red glowing cracks, minimal centered composition, deep black background, game icon style, ${BASE}`
  },
  {
    file: 'icon-mines.png',
    size: '1024x1024',
    prompt: `Casino mines game icon badge: a 3x3 grid of glowing tiles, center tile showing a pulsing red bomb, surrounding tiles showing blue diamonds, minimal centered composition, deep black background, game icon style, ${BASE}`
  },
  {
    file: 'icon-dice.png',
    size: '1024x1024',
    prompt: `Casino dice game icon badge: two gold dice showing 6 and 5, tumbling mid-air with motion blur, white glowing dots, minimal centered composition, deep black background, game icon style, ${BASE}`
  },
  {
    file: 'icon-poker.png',
    size: '1024x1024',
    prompt: `Casino poker game icon badge: a royal flush of spades spread in a fan (A K Q J 10), cards with gold metallic borders, minimal centered composition, deep black background, game icon style, ${BASE}`
  },
  {
    file: 'icon-prempoker.png',
    size: '1024x1024',
    prompt: `Casino VIP premium poker game icon badge: a bejeweled gold crown sitting atop a stack of purple and gold casino chips, amethyst gems in crown, dramatic spotlight, minimal centered composition, deep black background, game icon style, ${BASE}`
  },
  {
    file: 'icon-videopoker.png',
    size: '1024x1024',
    prompt: `Casino video poker machine icon badge: a compact retro CRT screen in gold chrome frame showing four aces, neon blue glow, cobalt HOLD button lit below, minimal centered composition, deep black background, game icon style, ${BASE}`
  },
  {
    file: 'icon-coin.png',
    size: '1024x1024',
    prompt: `Casino coin flip game icon badge: a large gold coin spinning in air showing heads side with crown embossed, coin catching light on its edge, spark trail, minimal centered composition, deep black background, game icon style, ${BASE}`
  },
  {
    file: 'icon-wheel.png',
    size: '1024x1024',
    prompt: `Casino fortune wheel game icon badge: top-down view of a spinning fortune wheel, gold and crimson segments with prizes, leather flapper at top, minimal centered composition, deep black background, game icon style, ${BASE}`
  },
  {
    file: 'icon-keno.png',
    size: '1024x1024',
    prompt: `Casino keno lottery game icon badge: three numbered golden lottery balls (7, 23, 42) floating in triangle formation with amber inner glow, minimal centered composition, deep black background, game icon style, ${BASE}`
  },
  {
    file: 'icon-krioklis.png',
    size: '1024x1024',
    prompt: `Casino plinko game icon badge: triangular golden peg arrangement on dark board, a single gold ball mid-bounce between two pegs with spark, minimal centered composition, deep black background, game icon style, ${BASE}`
  },

];

const ALL_IMAGES = [...THUMBS, ...ICONS];

async function generate(item) {
  console.log(`⚙️  Generuoju: ${item.file} (${item.size})...`);
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
  console.log(`\n🎨 HATHOR — Premium vaizdų generavimas`);
  console.log(`📁 Išsaugoma: ${OUT}`);
  console.log(`📸 Vaizdų iš viso: ${ALL_IMAGES.length} (${THUMBS.length} thumb + ${ICONS.length} icon)\n`);
  console.log(`⏱️  Apytiksliai laikas: ~${Math.ceil(ALL_IMAGES.length * 12 / 60)} minutės\n`);

  let ok = 0, fail = 0;
  for (const item of ALL_IMAGES) {
    try {
      await generate(item);
      ok++;
      // DALL-E rate limit: ~5 req/min, palaukiame tarp generacijų
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`  ❌ Klaida (${item.file}): ${err.message}`);
      fail++;
      // Jei klaida — palaukiame ilgiau prieš toliau einant
      await new Promise(r => setTimeout(r, 4000));
    }
  }

  console.log(`\n══════════════════════════════════════════`);
  console.log(`✅ Pavyko: ${ok} | ❌ Nepavyko: ${fail}`);
  console.log(`══════════════════════════════════════════\n`);
}

main().catch(console.error);
