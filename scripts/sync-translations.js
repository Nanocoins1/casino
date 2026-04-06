#!/usr/bin/env node
/**
 * HATHOR Casino — Auto Translation Sync
 * ======================================
 * Automatically translates new games/content to all languages.
 *
 * Usage:
 *   node scripts/sync-translations.js              # sync missing translations
 *   node scripts/sync-translations.js --check      # just check what's missing
 *   node scripts/sync-translations.js --add-game   # interactive: add new game
 *
 * Add new game via CLI:
 *   node scripts/sync-translations.js --key nexusWheel --title "NEXUS WHEEL" --desc "3D wheel · up to 50×"
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const INDEX_PATH = path.join(__dirname, '../public/index.html');

// All supported languages with their native names
const ALL_LANGS = {
  en: 'English',
  lt: 'Lithuanian',
  ru: 'Russian',
  de: 'German',
  pl: 'Polish',
  fr: 'French',
  tr: 'Turkish',
  ar: 'Arabic',
  zh: 'Chinese (Simplified)',
};

// ─── Extract games from each language block ───────────────────────────────────
function extractGamesFromLangs(html) {
  const result = {};

  for (const lang of Object.keys(ALL_LANGS)) {
    result[lang] = {};

    // Find the games block for this language
    // Pattern: games:{\n      key:{title:'...',desc:'...'},
    const langBlockRe = new RegExp(
      `code:'${lang}'[\\s\\S]*?games:\\{([\\s\\S]*?)\\},\\s*\\n\\s*(viktor|footer)`,
      'g'
    );
    const langMatch = langBlockRe.exec(html);
    if (!langMatch) continue;

    const gamesBlock = langMatch[1];

    // Extract each game entry
    const gameRe = /(\w+):\{title:'([^']*)',desc:'([^']*)'\}/g;
    let m;
    while ((m = gameRe.exec(gamesBlock)) !== null) {
      result[lang][m[1]] = { title: m[2], desc: m[3] };
    }
    // Also handle double-quote versions
    const gameReD = /(\w+):\{title:"([^"]*)",desc:"([^"]*)"\}/g;
    while ((m = gameReD.exec(gamesBlock)) !== null) {
      result[lang][m[1]] = { title: m[2], desc: m[3] };
    }
  }

  return result;
}

// ─── Find missing translation keys ───────────────────────────────────────────
function findMissing(allGames) {
  const enKeys = Object.keys(allGames.en || {});
  const missing = {};

  for (const [lang, games] of Object.entries(allGames)) {
    if (lang === 'en') continue;
    missing[lang] = [];
    for (const key of enKeys) {
      if (!games[key]) {
        missing[lang].push(key);
      }
    }
  }

  return missing;
}

// ─── Translate missing entries via Claude API ─────────────────────────────────
async function translateMissing(allGames, missing, client) {
  const enGames = allGames.en;
  const toTranslate = {}; // lang -> [keys]

  for (const [lang, keys] of Object.entries(missing)) {
    if (keys.length > 0) toTranslate[lang] = keys;
  }

  if (Object.keys(toTranslate).length === 0) {
    console.log('✅ All translations are up to date!');
    return {};
  }

  // Build translation request
  const items = [];
  for (const [lang, keys] of Object.entries(toTranslate)) {
    for (const key of keys) {
      if (enGames[key]) {
        items.push({ lang, key, title: enGames[key].title, desc: enGames[key].desc });
      }
    }
  }

  console.log(`\n🌐 Translating ${items.length} missing entries...`);
  items.forEach(i => console.log(`  • [${i.lang}] ${i.key}: "${i.title}"`));

  const langNames = Object.fromEntries(
    Object.entries(ALL_LANGS).map(([k, v]) => [k, v])
  );

  const prompt = `You are a casino game translator. Translate these casino game titles and descriptions into the specified languages.

Keep game names (like "NEXUS SLOTS", "Dragon Crash", "HiLo") in their original form — only translate the descriptions.
Keep casino terminology consistent. Keep × multiplier symbols. Keep emojis. Be concise.

Items to translate (format: LANG|KEY|TITLE|DESC):
${items.map(i => `${i.lang}|${i.key}|${i.title}|${i.desc}`).join('\n')}

Language codes: ${JSON.stringify(langNames)}

Respond with ONLY a JSON array like this:
[
  {"lang": "lt", "key": "nexusSlots", "title": "NEXUS SLOTS", "desc": "3D ritiniai · dalelių efektai"},
  ...
]

Rules:
- Do NOT translate game names that are in ALL CAPS (NEXUS SLOTS, NEXUS WHEEL, HiLo etc.)
- DO translate the desc field into the target language
- For Arabic (ar): use RTL-appropriate phrasing
- For Lithuanian (lt): use proper Lithuanian grammar
- Keep descriptions SHORT (under 60 chars)`;

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('❌ Could not parse translation response');
    return {};
  }

  const translations = JSON.parse(jsonMatch[0]);
  const result = {};
  for (const t of translations) {
    if (!result[t.lang]) result[t.lang] = {};
    result[t.lang][t.key] = { title: t.title, desc: t.desc };
  }

  return result;
}

// ─── Inject translations back into index.html ─────────────────────────────────
function injectTranslations(html, newTranslations) {
  let updated = html;
  let count = 0;

  for (const [lang, games] of Object.entries(newTranslations)) {
    for (const [key, { title, desc }] of Object.entries(games)) {
      // Find the leaderboard entry for this language and inject after it
      // We'll insert before the closing of the games block (before "footer:" or "viktor:")
      const safeTitle = title.replace(/'/g, "\\'");
      const safeDesc = desc.replace(/'/g, "\\'");
      const newEntry = `      ${key}:{title:'${safeTitle}',desc:'${safeDesc}'},\n`;

      // Find the right insertion point: after the last game entry before footer/viktor in this lang block
      const langMarker = `code:'${lang}'`;
      const langPos = updated.indexOf(langMarker);
      if (langPos === -1) continue;

      // Find "footer:{" or "viktor:{" after langPos
      const afterLang = updated.slice(langPos);
      const footerMatch = afterLang.match(/\n\s*(footer|viktor):\{/);
      if (!footerMatch) continue;

      const insertPos = langPos + footerMatch.index + 1; // +1 for the \n

      // Check if this key already exists in this lang block
      const langBlock = updated.slice(langPos, langPos + footerMatch.index);
      if (langBlock.includes(`${key}:{title:`)) {
        console.log(`  ⏭️  [${lang}] ${key} already exists, skipping`);
        continue;
      }

      updated = updated.slice(0, insertPos) + newEntry + updated.slice(insertPos);
      count++;
      console.log(`  ✅ [${lang}] Added: ${key} → "${title}"`);
    }
  }

  return { html: updated, count };
}

// ─── Add a single new game interactively ──────────────────────────────────────
async function addGame(key, enTitle, enDesc, client) {
  console.log(`\n🎮 Adding new game: ${key}`);
  console.log(`   EN title: ${enTitle}`);
  console.log(`   EN desc:  ${enDesc}\n`);

  const html = fs.readFileSync(INDEX_PATH, 'utf8');

  // Build translations for all non-EN languages
  const langNames = Object.fromEntries(
    Object.entries(ALL_LANGS).filter(([k]) => k !== 'en')
  );

  const prompt = `Translate this casino game entry into ALL these languages: ${JSON.stringify(langNames)}

Game key: ${key}
English title: ${enTitle}
English description: ${enDesc}

Rules:
- Keep the title in original form if it's a brand name (ALL CAPS = keep as is)
- Translate only desc into each language
- Keep × symbols, emojis, and numbers
- Keep descriptions SHORT (under 60 chars)

Respond with ONLY a JSON array:
[
  {"lang": "lt", "title": "...", "desc": "..."},
  {"lang": "ru", "title": "...", "desc": "..."},
  ... (all languages)
]`;

  console.log('🌐 Translating to all languages via Claude API...');
  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('❌ Translation failed');
    process.exit(1);
  }

  const translations = JSON.parse(jsonMatch[0]);

  // Build newTranslations in the format injectTranslations expects
  const newTranslations = { en: { [key]: { title: enTitle, desc: enDesc } } };
  for (const t of translations) {
    newTranslations[t.lang] = { [key]: { title: t.title, desc: t.desc } };
  }

  const { html: updated, count } = injectTranslations(html, newTranslations);

  if (count > 0) {
    fs.writeFileSync(INDEX_PATH, updated, 'utf8');
    console.log(`\n✅ Done! Added ${count} translations to index.html`);
    console.log('📝 Don\'t forget to commit: git add public/index.html && git commit -m "i18n: add translations for ' + key + '"');
  } else {
    console.log('\n⚠️  No changes made (game may already exist in all languages)');
  }
}

// ─── Main sync function ───────────────────────────────────────────────────────
async function sync(checkOnly = false) {
  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  const allGames = extractGamesFromLangs(html);

  console.log(`\n📊 Games found in EN: ${Object.keys(allGames.en || {}).length}`);

  const missing = findMissing(allGames);
  const totalMissing = Object.values(missing).reduce((a, b) => a + b.length, 0);

  if (totalMissing === 0) {
    console.log('✅ All translations are complete!');
    return;
  }

  console.log(`\n⚠️  Missing translations: ${totalMissing} entries`);
  for (const [lang, keys] of Object.entries(missing)) {
    if (keys.length > 0) {
      console.log(`  [${lang}] ${keys.join(', ')}`);
    }
  }

  if (checkOnly) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('\n❌ ANTHROPIC_API_KEY not set. Export it first:');
    console.error('   export ANTHROPIC_API_KEY=sk-ant-...');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const newTranslations = await translateMissing(allGames, missing, client);
  const { html: updated, count } = injectTranslations(html, newTranslations);

  if (count > 0) {
    fs.writeFileSync(INDEX_PATH, updated, 'utf8');
    console.log(`\n✅ Done! Added ${count} translations to index.html`);
  }
}

// ─── CLI entry point ──────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--check')) {
    await sync(true);
    return;
  }

  // Add new game: node sync-translations.js --key myGame --title "My Game" --desc "Description"
  const keyIdx = args.indexOf('--key');
  const titleIdx = args.indexOf('--title');
  const descIdx = args.indexOf('--desc');

  if (keyIdx !== -1 && titleIdx !== -1 && descIdx !== -1) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('❌ ANTHROPIC_API_KEY not set');
      process.exit(1);
    }
    const client = new Anthropic({ apiKey });
    await addGame(args[keyIdx + 1], args[titleIdx + 1], args[descIdx + 1], client);
    return;
  }

  // Default: sync all missing
  await sync(false);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
