// ══════════════════════════════════════════════════════════════
// Daily AI Report (Claude Sonnet 4.5)
//
// Runs every morning at 9 AM UTC. Analyzes prior 24h:
// - GGR (Gross Gaming Revenue = bet - won)
// - Active players, new registrations, churn signals
// - Top games by volume & by net revenue
// - Deposits / withdrawals (totals + counts)
// - KYC queue state, pending sports bets
// - AI-generated insights + action items for the owner
//
// Cost: ~$0.02-0.04 per report
// Sent to: admin_email setting (or SMTP_USER fallback)
// ══════════════════════════════════════════════════════════════

/**
 * Generate and email the daily report.
 * @param {object} deps - { dbAll, dbGet, sendEmail, emailTpl, adminEmail }
 */
async function generateDailyReport(deps) {
  const { dbAll, dbGet, sendEmail, emailTpl, adminEmail } = deps;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.log('[DailyReport] skipping — no ANTHROPIC_API_KEY'); return; }
  if (!adminEmail) { console.log('[DailyReport] skipping — no admin email'); return; }

  console.log('[DailyReport] Generating...');
  const stats = await gatherStats(dbAll, dbGet);

  // Call AI for insights
  const insights = await aiInsights(apiKey, stats).catch(e => {
    console.error('[DailyReport] AI insights failed:', e.message);
    return { summary: 'AI insights unavailable: ' + e.message, action_items: [], alerts: [] };
  });

  // Build email HTML
  const html = buildReportHtml(stats, insights);
  const subject = `📊 Daily Report — HATHOR Casino (${stats.date})`;

  try {
    await sendEmail(adminEmail, subject,
      emailTpl.emailGeneric(
        `Daily Report — ${stats.date}`,
        html,
        'OPEN ADMIN PANEL',
        (process.env.SITE_URL || 'https://hathor.casino') + '/admin.html'
      )
    );
    console.log('[DailyReport] Sent to', adminEmail);
  } catch(e) {
    console.error('[DailyReport] Email failed:', e.message);
  }
}

async function gatherStats(dbAll, dbGet) {
  const date = new Date().toISOString().slice(0, 10);
  const fail = [];
  const safe = async (label, fn) => {
    try { return await fn(); } catch(e) { fail.push(`${label}: ${e.message}`); return null; }
  };

  const [
    gameStats, topGames, depStats, wdStats, newUsers, activeUsers, kycPending, sportsPending, totalUsers, bigWins
  ] = await Promise.all([
    safe('game_log', () => dbGet(`SELECT COUNT(*) AS rounds, COALESCE(SUM(bet),0) AS wagered, COALESCE(SUM(won),0) AS paid, COUNT(DISTINCT uid) AS players
      FROM game_log WHERE ts > NOW() - INTERVAL '24 hours'`, [])),
    safe('top_games', () => dbAll(`SELECT game, COUNT(*) AS rounds, COALESCE(SUM(bet),0) AS wagered, COALESCE(SUM(won),0) AS paid
      FROM game_log WHERE ts > NOW() - INTERVAL '24 hours'
      GROUP BY game ORDER BY SUM(bet) DESC NULLS LAST LIMIT 10`, [])),
    safe('deposits', () => dbGet(`SELECT COUNT(*) AS n, COALESCE(SUM(amount_tokens),0) AS total
      FROM transactions WHERE type='deposit' AND status IN ('finished','completed','confirmed')
        AND created_at > NOW() - INTERVAL '24 hours'`, [])),
    safe('withdrawals', () => dbGet(`SELECT COUNT(*) AS n, COALESCE(SUM(amount_tokens),0) AS total
      FROM transactions WHERE type='withdraw' AND status IN ('finished','completed','confirmed','sent')
        AND created_at > NOW() - INTERVAL '24 hours'`, [])),
    safe('new_users', () => dbGet(`SELECT COUNT(*) AS n FROM users WHERE created_at > NOW() - INTERVAL '24 hours'`, [])),
    safe('active_users', () => dbGet(`SELECT COUNT(DISTINCT uid) AS n FROM game_log WHERE ts > NOW() - INTERVAL '24 hours'`, [])),
    safe('kyc_pending', () => dbGet(`SELECT COUNT(*) AS n FROM kyc WHERE status='pending'`, [])),
    safe('sports_pending', () => dbGet(`SELECT COUNT(*) AS n FROM pending_bets WHERE status='pending'`, []).catch(()=>null)),
    safe('total_users', () => dbGet(`SELECT COUNT(*) AS n FROM users`, [])),
    safe('big_wins', () => dbAll(`SELECT g.uid, u.name, g.game, g.bet, g.won, g.ts
      FROM game_log g LEFT JOIN users u ON u.uid=g.uid
      WHERE g.ts > NOW() - INTERVAL '24 hours' AND g.won >= 500
      ORDER BY g.won DESC LIMIT 5`, [])),
  ]);

  const wagered = Number(gameStats?.wagered || 0);
  const paid = Number(gameStats?.paid || 0);
  const ggr = wagered - paid;
  const payoutPct = wagered > 0 ? (paid / wagered * 100).toFixed(1) : '0.0';

  return {
    date,
    rounds: Number(gameStats?.rounds || 0),
    wagered,
    paid,
    ggr,
    payoutPct,
    activePlayers: Number(activeUsers?.n || 0),
    newPlayers: Number(newUsers?.n || 0),
    totalUsers: Number(totalUsers?.n || 0),
    deposits: { n: Number(depStats?.n || 0), total: Number(depStats?.total || 0) },
    withdrawals: { n: Number(wdStats?.n || 0), total: Number(wdStats?.total || 0) },
    topGames: topGames || [],
    kycPending: Number(kycPending?.n || 0),
    sportsPending: Number(sportsPending?.n || 0),
    bigWins: bigWins || [],
    dataFailures: fail
  };
}

async function aiInsights(apiKey, stats) {
  const prompt = `You are a casino business analyst. Analyze last 24h KPIs and give the owner concise, actionable insights.

KPIs:
- GGR (Gross Gaming Revenue): ${stats.ggr} tokens (wagered ${stats.wagered} - paid ${stats.paid})
- Payout ratio: ${stats.payoutPct}% (healthy = 92-97%)
- Rounds played: ${stats.rounds}
- Active players: ${stats.activePlayers}
- New registrations: ${stats.newPlayers}
- Total users: ${stats.totalUsers}
- Deposits: ${stats.deposits.n} totaling ${stats.deposits.total}
- Withdrawals: ${stats.withdrawals.n} totaling ${stats.withdrawals.total}
- Net money flow (deposits - withdrawals): ${stats.deposits.total - stats.withdrawals.total}
- KYC pending queue: ${stats.kycPending}
- Sports bets pending review: ${stats.sportsPending}

Top games by wager:
${stats.topGames.slice(0,5).map(g => `- ${g.game}: ${g.rounds} rounds, ${g.wagered} wagered, ${g.paid} paid, net ${Number(g.wagered)-Number(g.paid)}`).join('\n')}

Big wins (≥500):
${stats.bigWins.map(w => `- ${w.name||w.uid} won ${w.won} on ${w.game} (bet ${w.bet})`).join('\n') || '(none)'}

OUTPUT strict JSON (no markdown):
{
  "summary": "2-3 sentence executive summary of the day",
  "action_items": ["actionable item 1", "actionable item 2", ...],  // 2-5 items, prioritized
  "alerts": ["concern or anomaly"],  // empty array if nothing unusual
  "positive_signals": ["good news 1", ...]  // 1-3 items
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'AI error');
  const text = data.content?.[0]?.text || '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('AI returned non-JSON');
  return JSON.parse(m[0]);
}

function buildReportHtml(s, insights) {
  const kpi = (label, value, sub) => `
    <div style="display:inline-block;min-width:140px;padding:12px 16px;margin:4px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.25);border-radius:6px;vertical-align:top">
      <div style="font-size:11px;color:rgba(232,224,208,0.6);text-transform:uppercase;letter-spacing:0.5px">${label}</div>
      <div style="font-size:20px;color:#c9a84c;font-weight:600;margin-top:4px">${value}</div>
      ${sub ? `<div style="font-size:11px;color:rgba(232,224,208,0.55);margin-top:2px">${sub}</div>` : ''}
    </div>
  `;

  const topGamesRows = s.topGames.slice(0, 10).map(g => `
    <tr style="border-bottom:1px solid rgba(201,168,76,0.1)">
      <td style="padding:6px 10px;color:#e8e0d0">${g.game}</td>
      <td style="padding:6px 10px;text-align:right;color:#e8e0d0">${g.rounds}</td>
      <td style="padding:6px 10px;text-align:right;color:#e8e0d0">${g.wagered}</td>
      <td style="padding:6px 10px;text-align:right;color:#c9a84c">${Number(g.wagered) - Number(g.paid)}</td>
    </tr>`).join('');

  const actionsList = (insights.action_items || []).map(a => `<li style="margin:4px 0;line-height:1.5">${a}</li>`).join('');
  const alertsList = (insights.alerts || []).map(a => `<li style="margin:4px 0;line-height:1.5;color:#e44">${a}</li>`).join('');
  const positiveList = (insights.positive_signals || []).map(a => `<li style="margin:4px 0;line-height:1.5;color:#5c8">${a}</li>`).join('');

  return `
    <p style="line-height:1.7;font-size:15px">${insights.summary || ''}</p>

    <h3 style="color:#c9a84c;margin:20px 0 8px">Key Metrics (last 24h)</h3>
    <div>
      ${kpi('GGR', s.ggr, `payout ${s.payoutPct}%`)}
      ${kpi('Rounds', s.rounds)}
      ${kpi('Active players', s.activePlayers)}
      ${kpi('New signups', s.newPlayers, `of ${s.totalUsers} total`)}
      ${kpi('Deposits', s.deposits.total, `${s.deposits.n} tx`)}
      ${kpi('Withdrawals', s.withdrawals.total, `${s.withdrawals.n} tx`)}
      ${kpi('Net flow', s.deposits.total - s.withdrawals.total, 'deposits − wd')}
      ${kpi('KYC queue', s.kycPending)}
    </div>

    ${actionsList ? `<h3 style="color:#c9a84c;margin:20px 0 8px">Action Items</h3><ul style="padding-left:20px">${actionsList}</ul>` : ''}
    ${alertsList ? `<h3 style="color:#e44;margin:20px 0 8px">⚠️ Alerts</h3><ul style="padding-left:20px">${alertsList}</ul>` : ''}
    ${positiveList ? `<h3 style="color:#5c8;margin:20px 0 8px">✅ Positive Signals</h3><ul style="padding-left:20px">${positiveList}</ul>` : ''}

    ${s.topGames.length ? `
    <h3 style="color:#c9a84c;margin:20px 0 8px">Top Games</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="border-bottom:2px solid rgba(201,168,76,0.3)">
          <th style="padding:8px 10px;text-align:left;color:rgba(232,224,208,0.6);font-weight:500">Game</th>
          <th style="padding:8px 10px;text-align:right;color:rgba(232,224,208,0.6);font-weight:500">Rounds</th>
          <th style="padding:8px 10px;text-align:right;color:rgba(232,224,208,0.6);font-weight:500">Wagered</th>
          <th style="padding:8px 10px;text-align:right;color:rgba(232,224,208,0.6);font-weight:500">Net</th>
        </tr>
      </thead>
      <tbody>${topGamesRows}</tbody>
    </table>` : ''}

    ${s.dataFailures.length ? `<p style="margin-top:20px;font-size:11px;color:rgba(232,224,208,0.4)">Data collection warnings: ${s.dataFailures.join('; ')}</p>` : ''}
  `;
}

/**
 * Schedule daily report at 9 AM UTC.
 * @param {object|Function} depsOrFactory - Either a deps object or an async () => deps factory
 */
function scheduleDailyReport(depsOrFactory) {
  const getDeps = async () => typeof depsOrFactory === 'function' ? await depsOrFactory() : depsOrFactory;
  const scheduleNext = () => {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(9, 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const delay = next.getTime() - now.getTime();
    console.log(`[DailyReport] Next report in ${(delay/3600000).toFixed(1)}h`);
    setTimeout(async () => {
      try { await generateDailyReport(await getDeps()); }
      catch(e) { console.error('[DailyReport] error:', e.message); }
      scheduleNext();  // reschedule for next day
    }, delay);
  };
  scheduleNext();
}

module.exports = { generateDailyReport, scheduleDailyReport };
