require('dotenv').config();
const https = require('https');
const fs = require('fs');

const key = process.env.OPENAI_API_KEY;

const body = JSON.stringify({
  model: 'dall-e-3',
  prompt: 'A beautiful sexy Cleopatra casino mascot. Egyptian queen, golden headdress, black and gold outfit, full body, white background, luxury game character art.',
  n: 1,
  size: '1024x1024',
  quality: 'standard'
});

const options = {
  hostname: 'api.openai.com',
  path: '/v1/images/generate',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  },
  timeout: 90000
};

console.log('Sending request...');

const req = https.request(options, (res) => {
  console.log('HTTP Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers).slice(0, 200));

  const chunks = [];
  res.on('data', (chunk) => {
    chunks.push(chunk);
    process.stdout.write('.');
  });
  res.on('end', () => {
    const data = Buffer.concat(chunks).toString();
    console.log('\nTotal length:', data.length);

    if (data.length === 0) {
      console.log('EMPTY response!');
      return;
    }

    try {
      const json = JSON.parse(data);
      if (json.data && json.data[0]) {
        console.log('\n✅ SUCCESS!');
        console.log(json.data[0].url);
        fs.writeFileSync('cleopatra_url.txt', json.data[0].url);
      } else {
        console.log('\nResponse:', JSON.stringify(json).slice(0, 500));
      }
    } catch(e) {
      console.log('\nRaw:', data.slice(0, 500));
    }
  });
});

req.on('timeout', () => {
  console.log('Request TIMEOUT!');
  req.destroy();
});

req.on('error', (e) => {
  console.log('Error:', e.message, e.code);
});

req.write(body);
req.end();
console.log('Request sent, waiting...');
