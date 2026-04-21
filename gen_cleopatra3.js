require('dotenv').config();
const https = require('https');
const fs = require('fs');

const key = process.env.OPENAI_API_KEY;

const body = JSON.stringify({
  model: 'dall-e-3',
  prompt: 'A beautiful sexy Cleopatra casino mascot character. Egyptian queen wearing golden headdress with cobra, elaborate gold jewelry, elegant revealing black and gold silk outfit, long straight black hair. Confident seductive pose, full body, facing forward. Pure white background. Stylized luxury 2D game character illustration, casino mascot art style, vibrant detailed.',
  n: 1,
  size: '1024x1024',
  quality: 'hd',
  response_format: 'url'
});

const options = {
  hostname: 'api.openai.com',
  path: '/v1/images/generations',  // correct endpoint
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  },
  timeout: 90000
};

console.log('Generating Cleopatra mascot via DALL-E 3...');

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  const chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    const data = Buffer.concat(chunks).toString();
    try {
      const json = JSON.parse(data);
      if (json.data && json.data[0] && json.data[0].url) {
        console.log('\n✅ SUCCESS! Image URL:');
        console.log(json.data[0].url);
        fs.writeFileSync('C:/Users/PC/casino/public/img/cleopatra_url.txt', json.data[0].url);
        console.log('\nRevised prompt:', (json.data[0].revised_prompt||'').slice(0,150));
      } else if (json.error) {
        console.log('API Error:', json.error.message);
        console.log('Type:', json.error.type, '| Code:', json.error.code);
      } else {
        console.log('Response:', data.slice(0, 400));
      }
    } catch(e) {
      console.log('Parse error:', data.slice(0, 300));
    }
  });
});

req.on('timeout', () => { console.log('TIMEOUT!'); req.destroy(); });
req.on('error', e => console.log('Error:', e.message));
req.write(body);
req.end();
