require('dotenv').config();
const https = require('https');

const key = process.env.OPENAI_API_KEY;
console.log('Key starts with:', key ? key.slice(0, 20) + '...' : 'MISSING');

// Simple test - list models
const options = {
  hostname: 'api.openai.com',
  path: '/v1/models',
  method: 'GET',
  headers: { 'Authorization': 'Bearer ' + key }
};

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Response length:', data.length);
    try {
      const j = JSON.parse(data);
      if (j.data) console.log('Models count:', j.data.length, '— API KEY OK');
      else if (j.error) console.log('Error:', j.error.message, '| Code:', j.error.code);
    } catch(e) { console.log('Parse error, raw:', data.slice(0,200)); }
  });
});
req.on('error', e => console.log('Network error:', e.message));
req.end();
