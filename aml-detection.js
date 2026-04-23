// ══════════════════════════════════════════════════════════════
// AML Pattern Detection with Claude Haiku 4.5
//
// Flow:
// 1. Hourly cron scans transactions + game_log (last 24h)
// 2. SQL heuristics pre-filter risk candidates (fast, free)
// 3. Claude Haiku analyzes each candidate → confirms/rejects with reason
// 4. Confirmed cases emailed to admin (one digest per hour, only if flagged)
//
// Cost: ~$0.001-0.003 per scan when no candidates; ~$0.01 per flagged user
// Speed: SQL filter ~100ms; AI per-user ~2-4 sec
//
// Patterns detected:
// - Structuring (multiple deposits just under threshold)
// - Rapid in-out (deposit → min play → withdraw = laundering)
// - High velocity deposits (too many in short period)
// - Chip dumping (transfers to other accounts)
// - New account with abnormally high volume
// ══════════════════════════════════════════════════════════════

const STRUCTURING_THRESHOLD = 1000;   // $1000 typical AML threshold
const STRUCTURING_WINDOW_H  = 24;     // look at last 24h
const RAPID_INOUT_RATIO     = 0.3;    // withdrew >70% of what deposited with <30% bet-to-deposit ratio

/**
 * Run one AML scan cycle. Returns flagged users with AI verdicts.
 * @param {object} deps - { dbAll, dbGet, sendEmail, emailTpl, adminEmail }
 * @returns {Promise<Array<{uid, patterns, aiVerdict}>>}
 */
async function runAmlScan(deps) {
  const { dbAll, dbGet, sendEmail, emailTpl, adminEmail } = deps;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('[AML] Skipping scan — no ANTHROPIC_API_KEY');
    return [];
  }

  console.log('[AML] Starting scan...');
  const candidates = new Map(); // uid → { patterns: [...], data: {} }

  // ══ HEURISTIC 1: Structuring — multiple deposits just under threshold ══
  const structuringRows = await dbAll(`
    SELECT uid, COUNT(*) AS n, SUM(amount_tokens) AS total, array_agg(amount_tokens ORDER BY created_at) AS amounts
    FROM transactions
    WHERE type='deposit' AND status IN ('finished','completed','confirmed')
      AND created_at > NOW() - INTERVAL '${STRUCTURING_WINDOW_H} hours'
      AND amount_tokens BETWEEN ${STRUCTURING_THRESHOLD * 0.7} AND ${STRUCTURING_THRESHOLD * 0.99}
    GROUP BY uid
    HAVING COUNT(*) >= 3
  `, []).catch(e => { console.error('[AML] structuring query failed:', e.message); return []; });

  for (const r of structuringRows) {
    if (!candidates.has(r.uid)) candidates.set(r.uid, { patterns: [], data: {} });
    candidates.get(r.uid).patterns.push(`structuring: ${r.n} deposits totaling ${r.total}, each just under threshold`);
    candidates.get(r.uid).data.structuring_amounts = r.amounts;
  }

  // ══ HEURISTIC 2: Rapid in-out (deposit → min play → withdraw) ══
  const rapidRows = await dbAll(`
    WITH user_activity AS (
      SELECT u.uid,
        COALESCE(SUM(CASE WHEN t.type='deposit' AND t.status IN ('finished','completed','confirmed') THEN t.amount_tokens END), 0) AS deposited,
        COALESCE(SUM(CASE WHEN t.type='withdraw' AND t.status IN ('finished','completed','confirmed','sent') THEN t.amount_tokens END), 0) AS withdrawn,
        COALESCE((SELECT SUM(bet) FROM game_log WHERE uid=u.uid AND ts > NOW() - INTERVAL '24 hours'), 0) AS total_bet
      FROM users u
      JOIN transactions t ON t.uid=u.uid
      WHERE t.created_at > NOW() - INTERVAL '24 hours'
      GROUP BY u.uid
    )
    SELECT uid, deposited, withdrawn, total_bet
    FROM user_activity
    WHERE deposited >= 500
      AND withdrawn >= deposited * 0.7
      AND total_bet < deposited * ${RAPID_INOUT_RATIO}
  `, []).catch(e => { console.error('[AML] rapid in-out query failed:', e.message); return []; });

  for (const r of rapidRows) {
    if (!candidates.has(r.uid)) candidates.set(r.uid, { patterns: [], data: {} });
    candidates.get(r.uid).patterns.push(`rapid in-out: deposited ${r.deposited}, bet only ${r.total_bet}, withdrew ${r.withdrawn}`);
    candidates.get(r.uid).data.rapid_inout = { deposited: r.deposited, bet: r.total_bet, withdrawn: r.withdrawn };
  }

  // ══ HEURISTIC 3: High velocity deposits (5+ in 1 hour) ══
  const velocityRows = await dbAll(`
    SELECT uid, COUNT(*) AS n, SUM(amount_tokens) AS total
    FROM transactions
    WHERE type='deposit' AND status IN ('finished','completed','confirmed')
      AND created_at > NOW() - INTERVAL '1 hour'
    GROUP BY uid
    HAVING COUNT(*) >= 5
  `, []).catch(() => []);

  for (const r of velocityRows) {
    if (!candidates.has(r.uid)) candidates.set(r.uid, { patterns: [], data: {} });
    candidates.get(r.uid).patterns.push(`high velocity: ${r.n} deposits in last hour totaling ${r.total}`);
  }

  // ══ HEURISTIC 4: Chip dumping (transfers) ══
  const dumpingRows = await dbAll(`
    SELECT from_uid AS uid, COUNT(*) AS n, SUM(amount) AS total, array_agg(DISTINCT to_uid) AS recipients
    FROM token_transfers
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY from_uid
    HAVING SUM(amount) >= 500 OR COUNT(*) >= 5
  `, []).catch(() => []);

  for (const r of dumpingRows) {
    if (!candidates.has(r.uid)) candidates.set(r.uid, { patterns: [], data: {} });
    candidates.get(r.uid).patterns.push(`chip dumping: ${r.n} transfers totaling ${r.total} to ${r.recipients.length} recipients`);
    candidates.get(r.uid).data.dumping_recipients = r.recipients;
  }

  // ══ HEURISTIC 5: New account, abnormally high deposit ══
  const newAccountRows = await dbAll(`
    SELECT u.uid, u.created_at AS registered,
      COALESCE((SELECT SUM(amount_tokens) FROM transactions WHERE uid=u.uid AND type='deposit' AND status IN ('finished','completed','confirmed')),0) AS deposited
    FROM users u
    WHERE u.created_at > NOW() - INTERVAL '48 hours'
  `, []).catch(() => []);

  for (const r of newAccountRows) {
    if (r.deposited >= 2000) {
      if (!candidates.has(r.uid)) candidates.set(r.uid, { patterns: [], data: {} });
      candidates.get(r.uid).patterns.push(`new account (<48h) with ${r.deposited} deposited — abnormally high for new user`);
    }
  }

  console.log(`[AML] SQL heuristics found ${candidates.size} candidate(s)`);
  if (candidates.size === 0) return [];

  // ══ AI analysis — only candidates (keeps cost low) ══
  const flagged = [];
  for (const [uid, info] of candidates.entries()) {
    try {
      const user = await dbGet(`SELECT u.name, u.created_at, u.tokens, u.games_played, k.status AS kyc_status, k.country
        FROM users u LEFT JOIN kyc k ON k.uid=u.uid WHERE u.uid=$1`, [uid]).catch(()=>null);
      if (!user) continue;

      const verdict = await aiAnalyze(apiKey, uid, user, info);
      if (verdict.risk_level === 'high' || verdict.risk_level === 'critical') {
        flagged.push({ uid, user, patterns: info.patterns, aiVerdict: verdict });
      }
      console.log(`[AML AI] uid=${uid} risk=${verdict.risk_level} reason="${verdict.reason}"`);
    } catch(e) {
      console.error(`[AML AI] analysis failed for uid=${uid}:`, e.message);
    }
  }

  // ══ Email admin digest if any flagged ══
  if (flagged.length > 0 && adminEmail) {
    const html = flagged.map(f => `
      <div style="padding:14px;margin:12px 0;background:rgba(138,30,46,0.08);border:1px solid rgba(138,30,46,0.35);border-radius:6px">
        <div style="font-size:14px"><strong style="color:#c9a84c">${f.user.name}</strong> <span style="color:#888">(${f.uid})</span></div>
        <div style="margin:6px 0;color:#e44">Risk: <strong>${f.aiVerdict.risk_level.toUpperCase()}</strong> (${f.aiVerdict.confidence}%)</div>
        <div style="margin:6px 0"><strong>AI Analysis:</strong> ${f.aiVerdict.reason}</div>
        <div style="margin:6px 0"><strong>Recommended Action:</strong> ${f.aiVerdict.recommended_action}</div>
        <details style="margin-top:8px"><summary style="cursor:pointer;color:#c9a84c">Detected Patterns (${f.patterns.length})</summary>
          <ul style="margin:6px 0 0 20px;color:rgba(232,224,208,0.7);font-size:12px">${f.patterns.map(p=>`<li>${p}</li>`).join('')}</ul>
        </details>
      </div>
    `).join('');

    try {
      await sendEmail(adminEmail, `🚨 AML Alert — ${flagged.length} high-risk user(s) detected`,
        emailTpl.emailGeneric(
          'AML Pattern Detection Alert',
          `<p style="line-height:1.7">Automated AML scan has identified <strong>${flagged.length}</strong> user(s) exhibiting high-risk patterns:</p>
           ${html}
           <p style="line-height:1.7;margin-top:20px;font-size:12px;color:rgba(232,224,208,0.6)">
             Review in admin panel. This scan runs hourly. SAR (Suspicious Activity Report) may be required under Anjouan license obligations.
           </p>`,
          'OPEN ADMIN PANEL',
          (process.env.SITE_URL || 'https://hathor.casino') + '/admin.html'
        )
      );
      console.log(`[AML] Admin notified: ${flagged.length} flagged user(s)`);
    } catch(e) {
      console.error('[AML] Admin email failed:', e.message);
    }
  }

  return flagged;
}

/**
 * AI analysis for a single candidate.
 */
async function aiAnalyze(apiKey, uid, user, info) {
  const accountAgeHours = user.created_at ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 3_600_000) : null;

  const prompt = `You are an AML (Anti-Money Laundering) analyst for an online casino. Evaluate the following user activity:

USER PROFILE:
- Username: ${user.name}
- Account age: ${accountAgeHours !== null ? accountAgeHours + ' hours' : 'unknown'}
- Balance: ${user.tokens} tokens
- Games played: ${user.games_played}
- KYC status: ${user.kyc_status || 'unverified'}
- Country: ${user.country || 'unknown'}

DETECTED PATTERNS (last 24h):
${info.patterns.map(p => '- ' + p).join('\n')}

ADDITIONAL DATA:
${JSON.stringify(info.data, null, 2)}

Assess AML risk level (low/medium/high/critical) and recommend action.

Consider these red flags:
- Structuring (deposits just under regulatory thresholds)
- Rapid in-out (deposit → min play → withdraw = laundering)
- Chip dumping between accounts
- Abnormal velocity for new accounts
- Absence of genuine gambling behavior

OUTPUT strict JSON (no markdown):
{
  "risk_level": "low" | "medium" | "high" | "critical",
  "confidence": 0-100,
  "reason": "1-2 sentence explanation focusing on AML perspective",
  "recommended_action": "monitor" | "request_kyc_enhanced" | "freeze_withdrawals" | "file_sar" | "ban_user"
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',  // Fast + cheap for routine AML scans
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'AI error');

  const text = data.content?.[0]?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned non-JSON');
  return JSON.parse(jsonMatch[0]);
}

/**
 * Schedule hourly AML scans.
 * @param {object|Function} depsOrFactory - Either a deps object or an async () => deps factory (for fresh adminEmail per run)
 */
function scheduleAmlScans(depsOrFactory) {
  const getDeps = async () => typeof depsOrFactory === 'function' ? await depsOrFactory() : depsOrFactory;
  const run = async () => {
    try { await runAmlScan(await getDeps()); }
    catch(e) { console.error('[AML] scan error:', e.message); }
  };
  // First run 5 minutes after startup (let server settle)
  setTimeout(run, 5 * 60 * 1000);
  // Then hourly
  setInterval(run, 60 * 60 * 1000);
  console.log('[AML] Hourly pattern detection scheduled');
}

module.exports = { runAmlScan, scheduleAmlScans };
