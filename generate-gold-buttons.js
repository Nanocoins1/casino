// generate-gold-buttons.js — HATHOR Casino gold 3D button textures
require('dotenv').config();
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const sharp = require('sharp');

const API_KEY = process.env.OPENAI_API_KEY;
const IMG = path.join(__dirname, 'public', 'img');

function dalle(prompt, size) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model:'dall-e-3', prompt, n:1, size,
      response_format:'b64_json', quality:'hd', style:'vivid' });
    const req = https.request({
      hostname:'api.openai.com', path:'/v1/images/generations', method:'POST',
      headers:{ 'Content-Type':'application/json',
        'Authorization':`Bearer ${API_KEY}`, 'Content-Length':Buffer.byteLength(body) }
    }, res => {
      let d=''; res.on('data',c=>d+=c);
      res.on('end',()=>{
        try {
          const j=JSON.parse(d);
          if(j.error){reject(new Error(j.error.message));return;}
          resolve(Buffer.from(j.data[0].b64_json,'base64'));
        } catch(e){reject(e);}
      });
    });
    req.on('error',reject); req.write(body); req.end();
  });
}

const delay = ms => new Promise(r=>setTimeout(r,ms));

const BUTTONS = [
  {
    file: 'btn-primary.png',
    w: 400, h: 88,  // 2× retina: display at 200×44
    prompt: `Ultra-luxury casino button surface texture. Wide rectangular button shape with rounded corners (radius ~18px). Pure macro close-up of the button surface only, filling the entire frame.
The surface is crafted from polished 18-karat gold — a rich amber-gold gradient from bright warm gold (#FFD700) at the top edge to deep burnished gold (#B8860B) at the bottom. The top edge has a sharp bright highlight stripe (specular reflection) creating a 3D raised/convex illusion. The bottom edge is darker, creating depth.
Surface texture: ultra-smooth mirror-polished gold with subtle horizontal brushing marks, like a premium luxury item. Fine beveled edge all around — the bevel catches light brilliantly, making the button look physically raised off the surface.
Soft warm inner glow. No text. No icons. Just the pure gold button surface texture filling the entire image. Photorealistic 8K macro photography style.`
  },
  {
    file: 'btn-secondary.png',
    w: 400, h: 88,
    prompt: `Ultra-luxury casino button surface texture. Wide rectangular button shape with rounded corners (radius ~18px). Pure macro close-up of the button surface only, filling the entire frame.
The surface is deep obsidian black with rich gold trim — a dark near-black (#0a0806) center transitioning to deep dark amber at the edges. The border/bevel is bright 18-karat gold, highly polished, creating a premium gold-rimmed frame effect.
Top edge: thin bright gold highlight stripe. The surface has very subtle dark marble texture with gold veining. The bevel catches light making the button look physically raised.
Sophisticated, premium, luxury dark gold casino aesthetic. No text. No icons. Pure button surface texture. Photorealistic 8K macro.`
  },
  {
    file: 'btn-danger.png',
    w: 400, h: 88,
    prompt: `Ultra-luxury casino button surface texture. Wide rectangular button shape with rounded corners (radius ~18px). Pure macro close-up of the button surface only.
Deep crimson red surface (#8B0000 to #CC0000) with gold metallic bevel/trim around all edges. The surface has a premium lacquered red finish — like a high-end sports car hood. Top edge has a bright specular highlight. The gold bevel is highly polished 18-karat gold, creating a dramatic red-and-gold luxury combination.
Rich, deep, jewel-like red. Very slight inner glow. Beveled raised appearance. No text. No icons. Photorealistic 8K macro casino luxury aesthetic.`
  },
];

(async () => {
  console.log(`🎨  Generating ${BUTTONS.length} gold button textures with DALL-E 3 HD...\n`);

  for (let i = 0; i < BUTTONS.length; i++) {
    const btn = BUTTONS[i];
    const outFile = path.join(IMG, btn.file);
    console.log(`[${i+1}/${BUTTONS.length}] ${btn.file}...`);

    try {
      const buf = await dalle(btn.prompt, '1792x1024');
      console.log(`  Raw: ${Math.round(buf.length/1024)}KB`);

      await sharp(buf)
        .resize(btn.w, btn.h, { fit:'cover', position:'centre' })
        .png({ compressionLevel:9 })
        .toFile(outFile);

      const sz = fs.statSync(outFile).size;
      const meta = await sharp(outFile).metadata();
      console.log(`  ✅  Saved: ${meta.width}×${meta.height}px, ${Math.round(sz/1024)}KB`);
    } catch(e) {
      console.error(`  ❌  ${e.message}`);
    }

    if (i < BUTTONS.length-1) {
      console.log('  ⏳  14s cooldown...');
      await delay(14000);
    }
  }

  console.log('\n🏆  Gold buttons done!');
})();
