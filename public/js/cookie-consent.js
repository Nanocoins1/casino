// HATHOR Casino — GDPR Cookie Consent v1.0
// Self-contained — inject into any page

(function() {
  'use strict';
  const KEY = 'hrc_cookie_consent';
  const existing = localStorage.getItem(KEY);
  if (existing) return; // already decided

  const LANGS = {
    lt: {
      title: '🍪 Naudojame slapukus',
      body:  'Naudojame būtinus slapukus tinkamam veikimui ir analitinius slapukus patirčiai gerinti. Prašome patvirtinti savo pasirinkimą.',
      accept: 'Sutinku su visais',
      essential: 'Tik būtinieji',
      manage: 'Tvarkyti',
      manageTitle: 'Slapukų nustatymai',
      categories: [
        { id: 'essential', label: 'Būtinieji',  desc: 'Prisijungimas, sesija, nustatymai. Negalima išjungti.',  locked: true  },
        { id: 'analytics', label: 'Analitiniai', desc: 'Anoniminiai lankomumo duomenys padeda tobulinti platformą.', locked: false },
        { id: 'marketing', label: 'Rinkodaros',  desc: 'Personalizuoti pasiūlymai ir bonusų pranešimai.',           locked: false },
      ],
      saveBtn: 'Išsaugoti',
      privacyLink: 'Privatumo politika',
    },
    en: {
      title: '🍪 We use cookies',
      body:  'We use essential cookies for site functionality and optional analytics cookies to improve your experience. Please confirm your choice.',
      accept: 'Accept All',
      essential: 'Essential Only',
      manage: 'Manage',
      manageTitle: 'Cookie Settings',
      categories: [
        { id: 'essential', label: 'Essential',  desc: 'Login session, preferences, security. Cannot be disabled.', locked: true  },
        { id: 'analytics', label: 'Analytics',  desc: 'Anonymous usage data helps us improve the platform.',       locked: false },
        { id: 'marketing', label: 'Marketing',  desc: 'Personalised offers and bonus notifications.',              locked: false },
      ],
      saveBtn: 'Save Preferences',
      privacyLink: 'Privacy Policy',
    },
    ru: {
      title: '🍪 Мы используем куки',
      body:  'Мы используем необходимые куки для работы сайта и аналитические — для улучшения опыта. Подтвердите свой выбор.',
      accept: 'Принять все',
      essential: 'Только необходимые',
      manage: 'Настроить',
      manageTitle: 'Настройки куки',
      categories: [
        { id: 'essential', label: 'Необходимые', desc: 'Авторизация, сессия, настройки. Нельзя отключить.', locked: true  },
        { id: 'analytics', label: 'Аналитика',   desc: 'Анонимные данные помогают улучшить платформу.',    locked: false },
        { id: 'marketing', label: 'Маркетинг',   desc: 'Персонализированные предложения и бонусы.',        locked: false },
      ],
      saveBtn: 'Сохранить',
      privacyLink: 'Политика конфиденциальности',
    },
  };

  function t() {
    const lang = localStorage.getItem('hrc_lang') || 'en';
    return LANGS[lang] || LANGS.en;
  }

  // ── CSS ────────────────────────────────────────────────────
  const css = `
  #hrc-cookie-banner {
    position:fixed;bottom:0;left:0;right:0;z-index:99999;
    background:rgba(6,5,14,0.97);border-top:1px solid rgba(240,192,96,0.2);
    backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
    padding:16px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;
    font-family:'Space Grotesk',system-ui,sans-serif;
    box-shadow:0 -8px 32px rgba(0,0,0,0.6);
    transform:translateY(100%);transition:transform .4s cubic-bezier(.16,1,.3,1);
  }
  #hrc-cookie-banner.visible { transform:translateY(0); }
  /* Push mobile nav up if present */
  .mobile-nav { bottom: 72px !important; }
  #hrc-cookie-text { flex:1;min-width:200px; }
  #hrc-cookie-text strong { color:#f0c060;font-size:14px;display:block;margin-bottom:4px; }
  #hrc-cookie-text p { color:rgba(232,224,208,.55);font-size:12px;line-height:1.5;margin:0; }
  #hrc-cookie-btns { display:flex;gap:8px;flex-wrap:wrap;align-items:center; }
  .hrc-cb { padding:9px 18px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;
    font-family:inherit;letter-spacing:.3px;transition:all .2s;border:none;white-space:nowrap; }
  .hrc-cb-accept { background:linear-gradient(135deg,#c9a84c,#f0c060);color:#080600; }
  .hrc-cb-accept:hover { transform:translateY(-1px);box-shadow:0 4px 16px rgba(240,192,96,.4); }
  .hrc-cb-essential { background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:rgba(232,224,208,.7); }
  .hrc-cb-essential:hover { color:#e8e0d0;background:rgba(255,255,255,.1); }
  .hrc-cb-manage { background:none;border:none;color:rgba(232,224,208,.35);font-size:11px;
    text-decoration:underline;cursor:pointer;padding:4px;font-family:inherit; }
  .hrc-cb-manage:hover { color:rgba(232,224,208,.65); }

  /* Modal */
  #hrc-cookie-modal {
    position:fixed;inset:0;z-index:100000;display:none;
    background:rgba(0,0,0,.7);backdrop-filter:blur(6px);
    align-items:center;justify-content:center;padding:20px;
  }
  #hrc-cookie-modal.open { display:flex; }
  #hrc-cookie-box {
    background:#07060f;border:1px solid rgba(240,192,96,.2);border-radius:18px;
    max-width:480px;width:100%;padding:28px;
    box-shadow:0 24px 64px rgba(0,0,0,.7);
    animation:slideUp .3s cubic-bezier(.16,1,.3,1);
  }
  @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
  #hrc-cookie-box h3 { font-family:'Orbitron',system-ui;color:#f0c060;font-size:16px;letter-spacing:1px;margin:0 0 8px; }
  #hrc-cookie-box p  { color:rgba(232,224,208,.4);font-size:12px;line-height:1.6;margin:0 0 20px; }
  .hrc-cat { display:flex;align-items:flex-start;gap:12px;padding:12px 0;
    border-bottom:1px solid rgba(255,255,255,.05); }
  .hrc-cat:last-of-type { border-bottom:none; }
  .hrc-cat-info { flex:1; }
  .hrc-cat-info strong { font-size:13px;color:rgba(232,224,208,.9);display:block;margin-bottom:3px; }
  .hrc-cat-info span { font-size:11px;color:rgba(232,224,208,.35);line-height:1.5; }
  /* Toggle */
  .hrc-toggle { position:relative;width:40px;height:22px;flex-shrink:0;margin-top:2px; }
  .hrc-toggle input { opacity:0;width:0;height:0; }
  .hrc-toggle-slider {
    position:absolute;inset:0;background:rgba(255,255,255,.1);
    border-radius:22px;cursor:pointer;transition:.2s;
    border:1px solid rgba(255,255,255,.1);
  }
  .hrc-toggle-slider:before {
    content:'';position:absolute;width:16px;height:16px;left:2px;bottom:2px;
    background:rgba(232,224,208,.4);border-radius:50%;transition:.2s;
  }
  .hrc-toggle input:checked + .hrc-toggle-slider { background:rgba(240,192,96,.25);border-color:rgba(240,192,96,.4); }
  .hrc-toggle input:checked + .hrc-toggle-slider:before { transform:translateX(18px);background:#f0c060; }
  .hrc-toggle.locked .hrc-toggle-slider { opacity:.4;cursor:not-allowed; }
  .hrc-modal-btns { display:flex;gap:8px;margin-top:20px;justify-content:flex-end; }
  .hrc-privacy { font-size:10px;color:rgba(232,224,208,.2);margin-top:10px;text-align:center; }
  .hrc-privacy a { color:rgba(201,168,76,.4);text-decoration:none; }
  .hrc-privacy a:hover { color:rgba(201,168,76,.7); }
  `;

  function inject() {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    const tx = t();

    // ── Banner ──────────────────────────────────────────────
    const banner = document.createElement('div');
    banner.id = 'hrc-cookie-banner';
    banner.innerHTML = `
      <div id="hrc-cookie-text">
        <strong>${tx.title}</strong>
        <p>${tx.body}</p>
      </div>
      <div id="hrc-cookie-btns">
        <button class="hrc-cb hrc-cb-accept"    onclick="HRCConsent.acceptAll()">${tx.accept}</button>
        <button class="hrc-cb hrc-cb-essential" onclick="HRCConsent.essentialOnly()">${tx.essential}</button>
        <button class="hrc-cb-manage"           onclick="HRCConsent.openModal()">${tx.manage}</button>
      </div>`;
    document.body.appendChild(banner);

    // ── Modal ───────────────────────────────────────────────
    const modal = document.createElement('div');
    modal.id = 'hrc-cookie-modal';

    const toggles = tx.categories.map(cat => `
      <div class="hrc-cat">
        <div class="hrc-cat-info">
          <strong>${cat.label}</strong>
          <span>${cat.desc}</span>
        </div>
        <label class="hrc-toggle${cat.locked?' locked':''}">
          <input type="checkbox" id="hrc-toggle-${cat.id}"
            ${cat.locked?'checked disabled':'checked'}/>
          <span class="hrc-toggle-slider"></span>
        </label>
      </div>`).join('');

    modal.innerHTML = `
      <div id="hrc-cookie-box">
        <h3>${tx.manageTitle}</h3>
        <p>${tx.body}</p>
        ${toggles}
        <div class="hrc-modal-btns">
          <button class="hrc-cb hrc-cb-essential" onclick="HRCConsent.closeModal()" style="flex:1">${tx.essential}</button>
          <button class="hrc-cb hrc-cb-accept"    onclick="HRCConsent.savePrefs()"  style="flex:1">${tx.saveBtn}</button>
        </div>
        <div class="hrc-privacy"><a href="/privacy.html" target="_blank">${tx.privacyLink}</a></div>
      </div>`;
    document.body.appendChild(modal);

    // Animate in
    requestAnimationFrame(() => {
      setTimeout(() => banner.classList.add('visible'), 80);
    });
  }

  function save(prefs) {
    localStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), ...prefs }));
    dismiss();
  }
  function dismiss() {
    const b = document.getElementById('hrc-cookie-banner');
    if (b) { b.style.transform = 'translateY(100%)'; setTimeout(()=>b.remove(), 400); }
    // restore mobile nav position
    const nav = document.querySelector('.mobile-nav');
    if (nav) nav.style.bottom = '';
    document.getElementById('hrc-cookie-modal')?.classList.remove('open');
  }

  window.HRCConsent = {
    acceptAll()    { save({ essential:true, analytics:true, marketing:true }); },
    essentialOnly(){ save({ essential:true, analytics:false, marketing:false }); },
    openModal()    { document.getElementById('hrc-cookie-modal')?.classList.add('open'); },
    closeModal()   { this.essentialOnly(); },
    savePrefs() {
      const cats = ['analytics','marketing'];
      const prefs = { essential: true };
      cats.forEach(id => {
        const el = document.getElementById('hrc-toggle-' + id);
        prefs[id] = el ? el.checked : false;
      });
      save(prefs);
    },
    // Check if a category is allowed (use after page load)
    allowed(cat) {
      try {
        const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
        return !!stored[cat];
      } catch(e) { return false; }
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
