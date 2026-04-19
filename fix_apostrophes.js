/**
 * Fix unescaped apostrophes in JS string literals in HTML files
 */
const fs = require('fs');

const FILES = [
  'C:/Users/PC/casino/public/aml.html',
];

FILES.forEach(function(fpath) {
  let txt = fs.readFileSync(fpath, 'utf8');
  const scriptOpen = txt.indexOf('<script>');
  const scriptClose = txt.lastIndexOf('</script>');
  if (scriptOpen === -1) { console.log(fpath + ': no script tag'); return; }

  let script = txt.substring(scriptOpen + 8, scriptClose);

  // Replace word-apostrophe-word (unescaped apostrophes inside JS strings)
  // char 39 = apostrophe, char 92 = backslash
  let fixed = '';
  for (let i = 0; i < script.length; i++) {
    const ch = script.charCodeAt(i);
    if (ch === 39) { // apostrophe
      const prev = i > 0 ? script[i-1] : '';
      const next = i < script.length - 1 ? script[i+1] : '';
      const prevIsWord = /[a-zA-ZÀ-ÿ]/.test(prev);
      const nextIsWord = /[a-zA-ZÀ-ÿ]/.test(next);
      const prevIsBackslash = prev === '\\';
      if (prevIsWord && nextIsWord && !prevIsBackslash) {
        // Unescaped apostrophe inside a word - escape it
        fixed += "\\'";
      } else {
        fixed += String.fromCharCode(ch);
      }
    } else {
      fixed += String.fromCharCode(ch);
    }
  }

  const newTxt = txt.substring(0, scriptOpen + 8) + fixed + txt.substring(scriptClose);
  fs.writeFileSync(fpath, newTxt);

  // Verify
  const verify = fs.readFileSync(fpath, 'utf8');
  const verifyScript = verify.substring(verify.indexOf('<script>') + 8, verify.lastIndexOf('</script>'));
  try {
    new Function(verifyScript);
    console.log(fpath + ': FIXED OK');
  } catch(e) {
    console.log(fpath + ': ERROR - ' + e.message);
  }
});
