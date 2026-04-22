// ══════════════════════════════════════════════════════════════════
// HATHOR Casino — Email Templates
// Premium HTML email designs matching the HATHOR brand
// ══════════════════════════════════════════════════════════════════

const SITE_URL = process.env.SITE_URL || 'https://hathor.casino';
const SITE_NAME = process.env.SITE_NAME || 'HATHOR Casino';

// ── Shared email layout (dark background, gold accents) ──
function emailBase({ title, preheader = '', content, ctaText, ctaUrl }) {
  const ctaBlock = ctaText && ctaUrl ? `
    <tr><td align="center" style="padding:32px 0 12px">
      <a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#c9a84c 0%,#f0c060 50%,#c9a84c 100%);color:#0a0806;font-family:Georgia,'Times New Roman',serif;font-size:14px;font-weight:700;letter-spacing:2px;text-decoration:none;border-radius:4px;box-shadow:0 4px 20px rgba(201,168,76,0.3)">
        ${ctaText}
      </a>
    </td></tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="dark"/>
<meta name="supported-color-schemes" content="dark"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#050508;font-family:Georgia,'Times New Roman',serif;color:#e8e0d0;min-width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<!-- Preheader (hidden preview text in inbox) -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preheader}</div>

<!-- Outer table for email clients -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#050508;padding:32px 16px">
  <tr><td align="center">

    <!-- Main container (max 600px) -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%">

      <!-- Logo header -->
      <tr><td align="center" style="padding:24px 0 32px">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:36px;letter-spacing:8px;color:#c9a84c;font-weight:400;line-height:1">
          HATHOR
        </div>
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:10px;letter-spacing:5px;color:rgba(201,168,76,0.5);margin-top:4px;font-style:italic">
          — ROYAL CASINO —
        </div>
      </td></tr>

      <!-- Content card -->
      <tr><td style="background:linear-gradient(180deg,#1a1410 0%,#0a0806 100%);border:1px solid rgba(201,168,76,0.2);border-radius:14px;padding:40px 32px;box-shadow:0 20px 60px rgba(0,0,0,0.5)">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">

          <!-- Decorative divider -->
          <tr><td align="center" style="padding-bottom:20px">
            <div style="width:48px;height:1px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);margin:0 auto"></div>
            <div style="display:inline-block;width:5px;height:5px;background:#c9a84c;border-radius:50%;margin:8px 0;box-shadow:0 0 8px rgba(201,168,76,0.6)"></div>
          </td></tr>

          <!-- Title -->
          <tr><td align="center" style="padding-bottom:24px">
            <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;color:#e8e0d0;letter-spacing:1px;line-height:1.3">
              ${title}
            </h1>
          </td></tr>

          <!-- Main content -->
          <tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:rgba(232,224,208,0.8);line-height:1.75;text-align:center">
            ${content}
          </td></tr>

          ${ctaBlock}

        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:24px 16px 0;text-align:center">
        <div style="font-family:Georgia,serif;font-size:10px;letter-spacing:3px;color:rgba(201,168,76,0.35);margin-bottom:8px">
          · ANJOUAN LICENSED · 18+ · PLAY RESPONSIBLY ·
        </div>
        <div style="font-family:Georgia,serif;font-size:11px;color:rgba(232,224,208,0.3);line-height:1.8">
          <a href="${SITE_URL}" style="color:rgba(201,168,76,0.5);text-decoration:none">Visit Casino</a>
          &nbsp;·&nbsp;
          <a href="${SITE_URL}/responsible.html" style="color:rgba(201,168,76,0.5);text-decoration:none">Responsible Gambling</a>
          &nbsp;·&nbsp;
          <a href="${SITE_URL}/terms.html" style="color:rgba(201,168,76,0.5);text-decoration:none">Terms</a>
        </div>
        <div style="font-family:Georgia,serif;font-size:10px;color:rgba(232,224,208,0.25);margin-top:16px">
          © ${new Date().getFullYear()} ${SITE_NAME} · All rights reserved.
        </div>
        <div style="font-family:Georgia,serif;font-size:10px;color:rgba(232,224,208,0.2);margin-top:10px;line-height:1.6;max-width:400px;margin-left:auto;margin-right:auto">
          You are receiving this email because you have an account at ${SITE_NAME}.
          If you did not request this, please ignore this message.
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── Helper: format large numbers ──
const fmt = n => typeof n === 'number' ? n.toLocaleString('en-US') : n;

// ══════════════════════════════════════════════════════════════════
// TEMPLATE 1: Welcome Email (after registration)
// ══════════════════════════════════════════════════════════════════
function emailWelcome(name = 'Guest') {
  return emailBase({
    title: `Welcome, ${name}!`,
    preheader: 'Your HATHOR Casino journey begins — claim your welcome bonus',
    content: `
      <p style="margin:0 0 16px">Thank you for joining the House of Hathor.</p>
      <p style="margin:0 0 20px">Your account has been created. Your throne in the royal hall awaits.</p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0">
        <tr><td style="background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.2);border-radius:8px;padding:20px;text-align:center">
          <div style="font-family:Georgia,serif;font-size:10px;letter-spacing:3px;color:#c9a84c;margin-bottom:10px">— WELCOME BONUS —</div>
          <div style="font-family:Georgia,serif;font-size:36px;color:#c9a84c;font-weight:400;font-style:italic;line-height:1;margin-bottom:8px">100% + 50 FS</div>
          <div style="font-size:13px;color:rgba(232,224,208,0.65)">On first deposit up to 500€</div>
        </td></tr>
      </table>

      <p style="margin:20px 0 0;font-size:13px;color:rgba(232,224,208,0.5);font-style:italic">
        Over 1,000 games await — slots, live casino, sports betting, and crash games from the world's top providers.
      </p>`,
    ctaText: 'ENTER CASINO',
    ctaUrl: SITE_URL,
  });
}

// ══════════════════════════════════════════════════════════════════
// TEMPLATE 2: Email Verification
// ══════════════════════════════════════════════════════════════════
function emailVerify(name = 'Player', verifyUrl) {
  return emailBase({
    title: 'Verify Your Email',
    preheader: 'Confirm your email address to activate your HATHOR account',
    content: `
      <p style="margin:0 0 16px">Hello ${name},</p>
      <p style="margin:0 0 16px">To complete your registration and unlock all casino features, please verify your email address by clicking the button below.</p>
      <p style="margin:0 0 16px;font-size:13px;color:rgba(232,224,208,0.55)">This link expires in <strong style="color:#c9a84c">24 hours</strong>.</p>
      <p style="margin:20px 0 0;font-size:12px;color:rgba(232,224,208,0.4);font-style:italic">
        If you didn't create an account at HATHOR, you can safely ignore this email.
      </p>`,
    ctaText: 'VERIFY EMAIL',
    ctaUrl: verifyUrl,
  });
}

// ══════════════════════════════════════════════════════════════════
// TEMPLATE 3: Password Reset
// ══════════════════════════════════════════════════════════════════
function emailPasswordReset(name = 'Player', resetUrl) {
  return emailBase({
    title: 'Reset Your Password',
    preheader: 'You requested a password reset for your HATHOR account',
    content: `
      <p style="margin:0 0 16px">Hello ${name},</p>
      <p style="margin:0 0 16px">We received a request to reset the password for your HATHOR Casino account. Click the button below to choose a new password.</p>
      <p style="margin:0 0 16px;font-size:13px;color:rgba(232,224,208,0.55)">This link expires in <strong style="color:#c9a84c">1 hour</strong>.</p>
      <div style="padding:14px;background:rgba(138,30,46,0.08);border:1px solid rgba(138,30,46,0.25);border-radius:6px;margin:20px 0">
        <p style="margin:0;font-size:12px;color:rgba(232,224,208,0.6)">
          🔒 If you didn't request this reset, please ignore this email — your password remains unchanged. Your account is secure.
        </p>
      </div>`,
    ctaText: 'RESET PASSWORD',
    ctaUrl: resetUrl,
  });
}

// ══════════════════════════════════════════════════════════════════
// TEMPLATE 4: Deposit Confirmed
// ══════════════════════════════════════════════════════════════════
function emailDepositConfirmed(name = 'Player', amount, currency = 'USD', txHash = '') {
  return emailBase({
    title: 'Deposit Confirmed',
    preheader: `Your deposit of ${amount} ${currency} has been credited`,
    content: `
      <p style="margin:0 0 20px">Hello ${name},</p>
      <p style="margin:0 0 16px">Your deposit has been successfully confirmed and credited to your HATHOR account.</p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0">
        <tr><td style="background:rgba(76,222,144,0.06);border:1px solid rgba(76,222,144,0.3);border-radius:8px;padding:24px;text-align:center">
          <div style="font-family:Georgia,serif;font-size:10px;letter-spacing:3px;color:#4cde90;margin-bottom:10px">— DEPOSIT CONFIRMED —</div>
          <div style="font-family:Georgia,serif;font-size:32px;color:#4cde90;font-weight:400;line-height:1;margin-bottom:4px">+${fmt(amount)} ${currency}</div>
          ${txHash ? `<div style="font-size:10px;color:rgba(232,224,208,0.4);margin-top:12px;word-break:break-all;font-family:'Courier New',monospace">TX: ${txHash.substring(0,32)}...</div>` : ''}
        </td></tr>
      </table>

      <p style="margin:16px 0 0;font-size:13px;color:rgba(232,224,208,0.55)">
        Your balance has been updated. Good luck at the tables!
      </p>`,
    ctaText: 'PLAY NOW',
    ctaUrl: SITE_URL,
  });
}

// ══════════════════════════════════════════════════════════════════
// TEMPLATE 5: Withdrawal Confirmed
// ══════════════════════════════════════════════════════════════════
function emailWithdrawalConfirmed(name = 'Player', amount, currency = 'USD', txHash = '') {
  return emailBase({
    title: 'Withdrawal Processed',
    preheader: `Your withdrawal of ${amount} ${currency} has been sent`,
    content: `
      <p style="margin:0 0 20px">Hello ${name},</p>
      <p style="margin:0 0 16px">Your withdrawal request has been processed and the funds have been sent to your wallet.</p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0">
        <tr><td style="background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.3);border-radius:8px;padding:24px;text-align:center">
          <div style="font-family:Georgia,serif;font-size:10px;letter-spacing:3px;color:#c9a84c;margin-bottom:10px">— WITHDRAWAL SENT —</div>
          <div style="font-family:Georgia,serif;font-size:32px;color:#c9a84c;font-weight:400;line-height:1;margin-bottom:4px">-${fmt(amount)} ${currency}</div>
          ${txHash ? `<div style="font-size:10px;color:rgba(232,224,208,0.4);margin-top:12px;word-break:break-all;font-family:'Courier New',monospace">TX: ${txHash.substring(0,32)}...</div>` : ''}
        </td></tr>
      </table>

      <p style="margin:16px 0 0;font-size:13px;color:rgba(232,224,208,0.55)">
        Crypto withdrawals typically confirm within 10-60 minutes depending on network congestion.
      </p>`,
    ctaText: 'VIEW ACCOUNT',
    ctaUrl: SITE_URL + '/#profile',
  });
}

// ══════════════════════════════════════════════════════════════════
// TEMPLATE 6: VIP Level Up
// ══════════════════════════════════════════════════════════════════
function emailVipLevelUp(name = 'Player', newLevelName, benefits = []) {
  const benefitsHtml = benefits.length ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0">
      ${benefits.map(b => `
        <tr><td style="padding:10px 16px;background:rgba(201,168,76,0.04);border-left:3px solid #c9a84c;margin-bottom:6px">
          <div style="font-family:Georgia,serif;color:#c9a84c;font-size:14px">✦ ${b}</div>
        </td></tr>
        <tr><td style="height:6px;line-height:6px">&nbsp;</td></tr>
      `).join('')}
    </table>` : '';

  return emailBase({
    title: `You've Reached ${newLevelName}!`,
    preheader: `Congratulations — you've been promoted to ${newLevelName} level`,
    content: `
      <p style="margin:0 0 20px">Congratulations, ${name}!</p>

      <div style="text-align:center;margin:24px 0">
        <div style="display:inline-block;padding:18px 36px;background:linear-gradient(135deg,rgba(201,168,76,0.15),rgba(240,192,96,0.08));border:2px solid #c9a84c;border-radius:50px">
          <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:4px;color:rgba(232,224,208,0.55);margin-bottom:4px">NEW LEVEL</div>
          <div style="font-family:Georgia,serif;font-size:24px;color:#f0c060;letter-spacing:3px">${newLevelName}</div>
        </div>
      </div>

      <p style="margin:16px 0">You've been promoted to a new VIP tier, unlocking exclusive benefits:</p>
      ${benefitsHtml}
      <p style="margin:16px 0 0;font-style:italic;color:rgba(232,224,208,0.55);font-size:13px">
        Keep playing to unlock even greater rewards.
      </p>`,
    ctaText: 'CLAIM BENEFITS',
    ctaUrl: SITE_URL + '/#vip',
  });
}

// ══════════════════════════════════════════════════════════════════
// TEMPLATE 7: Tournament Result
// ══════════════════════════════════════════════════════════════════
function emailTournamentResult(name = 'Player', tournamentName, place, prize, currency = 'USD') {
  const placeEmoji = place === 1 ? '🏆' : place === 2 ? '🥈' : place === 3 ? '🥉' : '🎖️';
  const placeSuffix = place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th';
  return emailBase({
    title: 'Tournament Results',
    preheader: `You finished ${place}${placeSuffix} in ${tournamentName}`,
    content: `
      <p style="margin:0 0 20px">Hello ${name},</p>
      <p style="margin:0 0 16px">The tournament <strong style="color:#c9a84c">${tournamentName}</strong> has concluded. Here are your results:</p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0">
        <tr><td style="background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.3);border-radius:8px;padding:28px;text-align:center">
          <div style="font-size:48px;margin-bottom:12px">${placeEmoji}</div>
          <div style="font-family:Georgia,serif;font-size:14px;letter-spacing:3px;color:#c9a84c;margin-bottom:8px">YOUR POSITION</div>
          <div style="font-family:Georgia,serif;font-size:40px;color:#f0c060;font-weight:400;line-height:1;margin-bottom:16px">${place}${placeSuffix}</div>
          ${prize ? `
            <div style="padding-top:16px;border-top:1px solid rgba(201,168,76,0.2)">
              <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:2px;color:rgba(232,224,208,0.5);margin-bottom:6px">PRIZE</div>
              <div style="font-family:Georgia,serif;font-size:24px;color:#4cde90">+${fmt(prize)} ${currency}</div>
            </div>` : ''}
        </td></tr>
      </table>`,
    ctaText: 'VIEW LEADERBOARD',
    ctaUrl: SITE_URL + '/#leaderboard',
  });
}

// ══════════════════════════════════════════════════════════════════
// TEMPLATE 8: Generic notification (fallback, replaces old emailTemplate)
// ══════════════════════════════════════════════════════════════════
function emailGeneric(title, content, ctaText, ctaUrl) {
  return emailBase({
    title,
    preheader: title,
    content: `<div style="text-align:left">${content}</div>`,
    ctaText,
    ctaUrl,
  });
}

module.exports = {
  emailBase,
  emailWelcome,
  emailVerify,
  emailPasswordReset,
  emailDepositConfirmed,
  emailWithdrawalConfirmed,
  emailVipLevelUp,
  emailTournamentResult,
  emailGeneric,
};
