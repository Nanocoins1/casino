require('dotenv').config();
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MESHY_KEY = process.env.MESHY_API_KEY;
if (!MESHY_KEY) { console.log('❌ MESHY_API_KEY nėra .env faile!'); process.exit(1); }

// Konvertuojame nuotrauką į base64
const imagePath = 'C:/Users/PC/Downloads/gemini_frame1.jpg';
const imageData = fs.readFileSync(imagePath);
const base64Image = imageData.toString('base64');
const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;

console.log('🚀 Siunčiame Kleopatrą į Meshy.ai...');
console.log('📸 Nuotrauka:', imagePath, `(${Math.round(imageData.length/1024)}KB)`);

function apiRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.meshy.ai',
      path: urlPath,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + MESHY_KEY,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(data)}`));
          } else {
            resolve(data);
          }
        } catch(e) {
          reject(new Error('Parse error: ' + Buffer.concat(chunks).toString().slice(0, 200)));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log('⬇️  Siųčiame:', url.slice(0, 80) + '...');
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    proto.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        const size = fs.statSync(dest).size;
        console.log(`✅ Atsisiųsta: ${dest} (${Math.round(size/1024)}KB)`);
        resolve();
      });
    }).on('error', (e) => {
      fs.unlinkSync(dest);
      reject(e);
    });
  });
}

async function generate3D() {
  // 1. Sukuriame užduotį
  console.log('\n📤 Kuriame 3D generavimo užduotį...');
  const task = await apiRequest('POST', '/v1/image-to-3d', {
    image_url: imageDataUrl,
    enable_pbr: true,
    should_remesh: true,
    should_texture: true
  });

  const taskId = task.result;
  console.log('✅ Užduotis sukurta! ID:', taskId);
  console.log('⏳ Generuojame 3D modelį (gali užtrukti 1-3 minutes)...\n');

  // 2. Laukiame kol baigsis
  let attempts = 0;
  while (attempts < 60) {
    await new Promise(r => setTimeout(r, 5000)); // Kas 5 sekundes
    attempts++;

    const status = await apiRequest('GET', `/v1/image-to-3d/${taskId}`);
    const progress = status.progress || 0;
    const statusStr = status.status || 'PENDING';

    process.stdout.write(`\r⚙️  Statusas: ${statusStr} | Progress: ${progress}% | Bandymas: ${attempts}/60   `);

    if (statusStr === 'SUCCEEDED') {
      console.log('\n\n🎉 3D MODELIS SUGENERUOTAS!');

      // 3. Parsisiunčiame .glb failą
      const glbUrl = status.model_urls?.glb || status.model_url;
      if (!glbUrl) {
        console.log('Visi URL:', JSON.stringify(status.model_urls, null, 2));
        throw new Error('GLB URL nerastas!');
      }

      const outputPath = 'C:/Users/PC/casino/public/img/cleopatra.glb';
      await downloadFile(glbUrl, outputPath);

      // Taip pat parsisiunčiame thumbnail
      if (status.thumbnail_url) {
        await downloadFile(status.thumbnail_url, 'C:/Users/PC/casino/public/img/cleopatra-3d-thumb.png');
      }

      console.log('\n✨ SĖKMĖ!');
      console.log('📁 GLB failas:', outputPath);
      console.log('🎮 Dabar galima integruoti į Three.js!');
      return;

    } else if (statusStr === 'FAILED' || statusStr === 'EXPIRED') {
      throw new Error(`Generavimas nepavyko: ${statusStr}\n${JSON.stringify(status.task_error, null, 2)}`);
    }
  }

  throw new Error('Timeout — per ilgai generuoja. Patikrink meshy.ai dashboardą.');
}

generate3D().catch(e => {
  console.error('\n❌ Klaida:', e.message);
  process.exit(1);
});
