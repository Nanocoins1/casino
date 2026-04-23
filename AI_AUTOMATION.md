# HATHOR Casino — AI Automation Suite

Five AI-powered features built on Anthropic Claude API to reduce manual workload and flag risks automatically. Built for the Anjouan license launch.

**Requirement:** `ANTHROPIC_API_KEY` must be set in `.env`. Without it, all AI features gracefully degrade to `needs_human` / manual flow.

---

## 1. Viktor v3 — Casino Concierge with Live DB Access

**File:** `server.js` `/api/croupier` endpoint
**Model:** `claude-haiku-4-5-20251001`
**Cost:** ~$0.002 per message

Viktor now has real-time read access to each player's data:
- KYC status + rejection reason
- Pending deposits / withdrawals
- Active bonuses (type, wagering progress)
- Responsible gambling limits

Players can ask "kur mano isvedimas?" / "kodel mano KYC atmestas?" and Viktor answers with actual data. Previously it could only give generic answers.

---

## 2. KYC Auto-Review — Claude Vision

**File:** `kyc-ai-review.js`
**Trigger:** `/api/kyc/submit` (async, fires after DB save)
**Model:** `claude-sonnet-4-5-20250929` (vision-capable)
**Cost:** ~$0.015–0.03 per review (3 images)
**Speed:** ~10–20 sec per review

### Flow
1. Player submits KYC → files saved, response sent immediately (non-blocking)
2. Background: AI analyzes id_front, id_back, selfie
3. Returns one of three decisions:

| Decision | Action |
|---|---|
| `auto_approve` (≥85% confidence) | `kyc.status = 'approved'`, approval email sent |
| `auto_reject` (≥85% confidence) | `kyc.status = 'rejected'`, AI reason shown to player, resubmit email sent |
| `needs_human` | Stays `pending`, admin gets email alert with AI's detailed findings |

### Checks performed
- Document readability (blur, glare)
- Name match (case/Unicode-aware)
- Birth date match + age ≥18
- Selfie-vs-ID facial similarity
- Tampering / photoshop detection
- Document type matches claimed type

### Manual override
Admin panel → 🤖 **AI Tools** tab → re-runs auto-review on any KYC submission.

---

## 3. AML Pattern Detection — Hourly Scan

**File:** `aml-detection.js`
**Trigger:** Hourly cron (first run 5 min after boot)
**Model:** `claude-haiku-4-5-20251001` (cheap, only called for flagged candidates)
**Cost:** ~$0.001 when no candidates; ~$0.01 per flagged user

### Two-stage pipeline
**Stage 1 — SQL heuristics (fast, free):**
1. Structuring — multiple deposits just under $1000 in 24h
2. Rapid in-out — deposit ≥$500 + bet <30% of it + withdraw ≥70%
3. High velocity — 5+ deposits in one hour
4. Chip dumping — `token_transfers` over $500 or 5+ sends in 24h
5. New account (≤48h) with ≥$2000 deposited

**Stage 2 — AI confirms each candidate:**
Claude analyzes full context (account age, KYC, country, detected patterns) and returns:
```json
{
  "risk_level": "low|medium|high|critical",
  "confidence": 0-100,
  "reason": "...",
  "recommended_action": "monitor|request_kyc_enhanced|freeze_withdrawals|file_sar|ban_user"
}
```

### Output
Only `high` / `critical` users are emailed to admin as a digest. Stored in logs for SAR (Suspicious Activity Report) obligations under Anjouan license.

### Manual trigger
Admin panel → 🤖 **AI Tools** → "Run AML Scan Now".

---

## 4. Daily AI Report — 9 AM UTC Executive Digest

**File:** `daily-ai-report.js`
**Trigger:** Daily at 09:00 UTC
**Model:** `claude-sonnet-4-5-20250929`
**Cost:** ~$0.02–0.04 per report
**Recipient:** `admin_email` setting (DB) or `SMTP_USER` (.env)

### Contents
- **KPIs (24h):** GGR, payout %, rounds, active players, new signups, deposits, withdrawals, net flow, KYC queue
- **Top games** — table by wagered / net revenue
- **Big wins ≥500** — top 5
- **AI insights:**
  - 2–3 sentence executive summary
  - 2–5 prioritized action items
  - Alerts (unusual patterns)
  - Positive signals

### Manual trigger
Admin panel → 🤖 **AI Tools** → "Generate Daily Report" (emails immediately).

---

## 5. Content Factory

**File:** `server.js` `/admin/ai/content` endpoint
**Model:** `claude-sonnet-4-5-20250929`
**Cost:** ~$0.01–0.05 per generation (depends on length)

### UI
Admin panel → 🤖 **AI Tools** tab → scroll to "✍️ Content Factory"

### Content types
| Type | Output |
|---|---|
| `blog_post` | 500-800 word blog with headline + sections |
| `social_twitter` | 3 posts, ≤280 chars each |
| `social_instagram` | Caption + 8-12 hashtags |
| `social_facebook` | 100-200 word engaging post |
| `email_newsletter` | Subject line + body, 300-500 words |
| `promo_copy` | Headline + subheadline + bullets + CTA |
| `landing_headline` | 5 variants, 5 different angles |
| `seo_meta` | Title + description + 5 keywords |

### Controls
- **Tone:** professional/playful, exciting, luxurious, friendly, bold
- **Language:** EN / LT / RU / DE / ES / FR
- **Extra context:** dates, codes, bonuses, constraints

### Guardrails in system prompt
- No "guaranteed wins" language
- No pressure tactics
- No fake bonus codes (uses `[CODE_HERE]` placeholders)
- Implicit 18+ where relevant

---

## Cost Ceiling Estimate

Assuming 100 active users, 10 KYC submissions / day, 20 suspicious patterns / day:

| Feature | Daily Cost |
|---|---|
| Viktor chat | $0.20 (100 msgs) |
| KYC reviews | $0.25 (10 × $0.025) |
| AML scans | $0.50 (24 × $0.02 avg) |
| Daily report | $0.03 |
| Content Factory | on-demand only |
| **Total baseline** | **~$1 / day = ~$30 / month** |

Scales linearly with traffic. No traffic = near-zero cost.

---

## Configuration

### Required
```env
ANTHROPIC_API_KEY=sk-ant-...
```

### Optional (admin email override)
In admin panel → Settings → "admin_email" key. Falls back to `SMTP_USER`.

### All AI features are **additive** — if the API key is missing, the site works normally, AI steps are skipped, nothing crashes.

---

## Monitoring

Logs to watch in production:
```
[KYC AI] uid=X → auto_approve (conf=92%) reason="..."
[AML] SQL heuristics found N candidate(s)
[AML AI] uid=X risk=high reason="..."
[AML] Admin notified: N flagged user(s)
[DailyReport] Sent to admin@...
[Content Factory] admin generated blog_post about "..."
```

Errors are non-fatal:
- AI unavailable → falls back to `needs_human` / manual flow
- Email fails → logs error, continues

---

## Extending

Each module exports its main function for direct use:

```js
const { autoReviewKyc } = require('./kyc-ai-review');
const { runAmlScan } = require('./aml-detection');
const { generateDailyReport } = require('./daily-ai-report');
```

Admin endpoints expose on-demand triggers:
- `POST /admin/ai/kyc-rescan/:uid` — re-run KYC AI on a specific submission
- `POST /admin/ai/aml-scan` — run AML scan now, returns flagged users
- `POST /admin/ai/daily-report` — generate + email report now
- `POST /admin/ai/content` — generate marketing content (body: type, topic, tone, language, extra)

All require `x-admin-key` header (handled by `adminAuth` middleware).
