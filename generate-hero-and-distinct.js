// HATHOR — hero image + distinct game card images
// Paleidimas: node generate-hero-and-distinct.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.OPENAI_API_KEY;
const OUT = path.join(__dirname, 'public', 'img');

const IMAGES = [
  // ── HERO cinematic landscape image ──────────────────────────────────────
  {
    file: 'hero-casino.png',
    size: '1792x1024',
    prompt: `Cinematic ultra-wide casino interior panorama: euphoric players cheering at a packed blackjack and roulette table, golden confetti exploding in the air, stacks of chips flying, dramatic spotlight beams cutting through luxurious smoky atmosphere, deep warm amber and champagne gold lighting, crystal chandeliers overhead, rich burgundy and black interior, blurred motion of excited crowd, professional cinematic photography style, shallow depth of field, bokeh highlights, photorealistic, ultra detailed, no text, no watermarks, epic celebratory casino winning moment, 8K quality`
  },

  // ── POKER: aerial overhead green felt table ──────────────────────────────
  {
    file: 'thumb-poker.png',
    size: '1024x1792',
    prompt: `Directly overhead bird's-eye view of a circular poker table: green casino felt with white markings, five hands of playing cards fanned out around the table each held by different players, massive pile of multicolored poker chips in the center pot, scattered chips and cards, dramatic top-down lighting with circular spotlight on table center, shadows of hands visible, one player showing Royal Flush — Ace King Queen Jack Ten of spades in brilliant gold light, rich dark background beyond table edge, ultra photorealistic top-down casino photography, no faces visible, just hands and cards, ultra-premium dark luxury casino art, deep black background, warm gold and amber dramatic cinematic lighting, hyper-detailed photorealistic render, no text overlays, no UI, no watermarks, professional game art`
  },

  // ── PREMPOKER: extreme macro single Ace card leaning on chip fortress ────
  {
    file: 'thumb-prempoker.png',
    size: '1024x1792',
    prompt: `Extreme close-up macro photograph: a single Ace of Spades playing card standing upright, leaning against a massive fortress tower of stacked black and gold poker chips, card fills most of the frame, chips blurred in bokeh background stacked incredibly high, the Ace card glows with inner golden light from behind, deep black velvet background, dramatic single spotlight from above casting hard shadows, shallow depth of field, premium casino close-up photography, luxury feel, ultra sharp card details with gold foil shine, ultra-premium dark luxury casino art, deep black background, warm gold and amber dramatic cinematic lighting, hyper-detailed photorealistic render, no text overlays, no UI, no watermarks, professional game art`
  },

  // ── CRASH: rocket trajectory graph glowing neon ──────────────────────────
  {
    file: 'thumb-crash.png',
    size: '1024x1792',
    prompt: `Abstract digital casino crash game visualization: glowing green multiplier graph line shooting steeply upward on a dark grid, the line explodes at the top into golden sparks, bold glowing multiplier numbers like 2.5x 5x 10x 100x floating along the line in bright yellow-white neon, x-axis and y-axis grid lines in deep teal, particles and sparks at explosion point, sleek HUD-style interface elements, pure data visualization aesthetic, no rockets no dragons just numbers and glowing curves, neon glow effects on dark background, ultra-premium dark luxury casino art, deep black background, warm gold and amber dramatic cinematic lighting, hyper-detailed photorealistic render, no text overlays, no UI, no watermarks, professional game art`
  },

  // ── DRAGON CRASH: full dragon close-up fire breathing ───────────────────
  {
    file: 'thumb-dragon.png',
    size: '1024x1792',
    prompt: `Dramatic extreme close-up of a fearsome Chinese casino dragon: enormous golden dragon head filling the entire frame, eyes glowing brilliant amber and crimson, fire breath erupting from mouth in brilliant orange-red-gold flames, intricate iridescent scales in gold and jade green, smoke curling in golden tendrils, ancient mythical creature portrait, dark dramatic background with deep crimson glow, no rockets, no graphs, no numbers, purely a majestic terrifying dragon face with fire, ultra-premium dark luxury casino art, deep black background, warm gold and amber dramatic cinematic lighting, hyper-detailed photorealistic render, no text overlays, no UI, no watermarks, professional game art`
  },
];

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
    }).on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
}

async function main() {
  console.log('\n🎨 HATHOR — Hero + Distinct images\n');
  let ok = 0, fail = 0;
  for (const item of IMAGES) {
    try {
      await generate(item);
      ok++;
      await new Promise(r => setTimeout(r, 2500));
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
