require('dotenv').config();
const https = require('https');
const fs = require('fs');

const KEY = process.env.MESHY_API_KEY;

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.meshy.ai', path, method,
      headers: {
        'Authorization': 'Bearer ' + KEY,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }, timeout: 30000
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(new Error(d.slice(0,300))); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : require('http');
    const file = fs.createWriteStream(dest);
    proto.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close(); try { fs.unlinkSync(dest); } catch(_){}
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(fs.statSync(dest).size); });
    }).on('error', e => { try { fs.unlinkSync(dest); } catch(_){} reject(e); });
  });
}

async function waitForTask(taskId, endpoint, maxMin = 10) {
  for (let i = 1; i <= maxMin * 6; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const s = await api('GET', `${endpoint}/${taskId}`);
    process.stdout.write(`\r⚙️  ${s.status} | ${s.progress||0}% | ${Math.round(i*10/60*10)/10} min   `);
    if (s.status === 'SUCCEEDED') { console.log('\n'); return s; }
    if (s.status === 'FAILED' || s.status === 'EXPIRED') throw new Error(`Nepavyko: ${JSON.stringify(s.task_error||s)}`);
  }
  throw new Error('Per ilgai!');
}

async function run() {
  const PROMPT = 'Beautiful sexy Cleopatra Egyptian queen sitting on golden ornate throne with hieroglyphics, wearing black and gold revealing outfit, golden crown with cobra snake, long black braided hair, turquoise and gold jewelry, anime game style, casino mascot character, full body, highly detailed';
  const NEG = 'ugly, deformed, blurry, low quality, extra limbs, floating objects, bad anatomy';

  // Phase 1: Preview
  console.log('🚀 Fazė 1: Preview generavimas...');
  const preview = await api('POST', '/openapi/v2/text-to-3d', {
    mode: 'preview',
    prompt: PROMPT,
    negative_prompt: NEG,
    art_style: 'realistic',
    topology: 'quad',
    target_polycount: 30000
  });
  const previewId = preview.result;
  console.log('✅ Preview ID:', previewId);
  const previewResult = await waitForTask(previewId, '/openapi/v2/text-to-3d');

  // Save thumbnail from preview
  if (previewResult.thumbnail_url) {
    await download(previewResult.thumbnail_url, 'C:/Users/PC/casino/public/img/cleo-preview-thumb.png');
    console.log('📸 Preview thumbnail išsaugotas → cleo-preview-thumb.png');
  }

  // Phase 2: Refine (high quality)
  console.log('🔥 Fazė 2: Refine — aukšta kokybė...');
  const refine = await api('POST', '/openapi/v2/text-to-3d', {
    mode: 'refine',
    preview_task_id: previewId
  });
  const refineId = refine.result;
  console.log('✅ Refine ID:', refineId);
  const refineResult = await waitForTask(refineId, '/openapi/v2/text-to-3d', 15);

  // Download final GLB
  const glbUrl = refineResult.model_urls?.glb;
  if (!glbUrl) throw new Error('GLB URL nerastas: ' + JSON.stringify(refineResult.model_urls));

  const out = 'C:/Users/PC/casino/public/img/cleopatra.glb';
  const size = await download(glbUrl, out);
  console.log(`✅ GLB išsaugotas: ${out} (${Math.round(size/1024)}KB)`);

  if (refineResult.thumbnail_url) {
    await download(refineResult.thumbnail_url, 'C:/Users/PC/casino/public/img/cleopatra-3d-thumb.png');
    console.log('✅ Final thumbnail išsaugotas');
  }
  console.log('\n🎉 KLEOPATRA 3D PARUOŠTA!');
}

run().catch(e => { console.error('\n❌', e.message); process.exit(1); });
