require('dotenv').config();
const https = require('https');
const fs = require('fs');

const key = process.env.OPENAI_API_KEY;
if (!key) { console.log('No API key!'); process.exit(1); }

const body = JSON.stringify({
  model: 'dall-e-3',
  prompt: 'A stunningly beautiful and sexy Cleopatra casino mascot character. Egyptian queen wearing golden headdress with uraeus cobra, elaborate gold jewelry and earrings, elegant revealing black and gold silk outfit, long straight black hair. Confident seductive pose, full body shot, facing forward. Pure white background. Stylized luxury 2D game character illustration, sharp clean lines, vibrant colors, casino mascot art style, high detail.',
  n: 1,
  size: '1024x1024',
  quality: 'hd'
});

const options = {
  hostname: 'api.openai.com',
  path: '/v1/images/generate',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

console.log('Generating Cleopatra...');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.data && json.data[0]) {
        const url = json.data[0].url;
        console.log('SUCCESS! URL:');
        console.log(url);
        fs.writeFileSync('C:/Users/PC/casino/cleopatra_url.txt', url);
        console.log('Saved to cleopatra_url.txt');
      } else if (json.error) {
        console.log('API Error:', json.error.message);
        console.log('Code:', json.error.code);
      } else {
        console.log('Unknown response:', data.slice(0, 500));
      }
    } catch(e) {
      console.log('Parse error:', e.message);
      console.log('Raw response length:', data.length);
      console.log('First 200 chars:', data.slice(0, 200));
    }
  });
});

req.on('error', (e) => {
  console.log('Request error:', e.message);
});

req.write(body);
req.end();
