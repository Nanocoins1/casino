// HATHOR Casino — Synthesized Sound Engine v1.0
// Pure Web Audio API — no external files, works offline
// Usage: CasinoSounds.play('win') / CasinoSounds.play('bigWin') etc.

(function(global) {
  'use strict';

  const STORAGE_KEY = 'hrc_sounds';
  let _ctx = null;
  let _enabled = localStorage.getItem(STORAGE_KEY) !== '0';
  let _volume = parseFloat(localStorage.getItem('hrc_sounds_vol') || '0.5');

  function ctx() {
    if (!_ctx) {
      try {
        _ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch(e) { return null; }
    }
    // Resume if suspended (browser autoplay policy)
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  // Master gain node
  function masterGain() {
    const c = ctx(); if (!c) return null;
    const g = c.createGain();
    g.gain.value = _enabled ? _volume : 0;
    g.connect(c.destination);
    return g;
  }

  // ── Primitive builders ──────────────────────────────────────

  function tone(freq, type, start, duration, gainVal, master, fadeOut) {
    const c = ctx(); if (!c || !master) return;
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(gainVal, start);
    if (fadeOut) g.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(g);
    g.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.01);
  }

  function noise(start, duration, gainVal, master) {
    const c = ctx(); if (!c || !master) return;
    const bufSize = c.sampleRate * duration;
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.5;
    const g = c.createGain();
    g.gain.setValueAtTime(gainVal, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(start);
    src.stop(start + duration + 0.01);
  }

  // ── Sound definitions ───────────────────────────────────────

  const SOUNDS = {

    // Short chip click — placing a bet
    click() {
      const c = ctx(); if (!c) return;
      const m = masterGain(); if (!m) return;
      const t = c.currentTime;
      tone(800,  'sine',     t,       0.04, 0.3, m, true);
      tone(1200, 'triangle', t+0.01,  0.03, 0.2, m, true);
    },

    // Coin drop — small win or token credit
    coin() {
      const c = ctx(); if (!c) return;
      const m = masterGain(); if (!m) return;
      const t = c.currentTime;
      const notes = [1046, 1318, 1568, 2093];
      notes.forEach((f, i) => {
        tone(f, 'sine', t + i*0.07, 0.12, 0.25, m, true);
        tone(f*2, 'triangle', t + i*0.07, 0.08, 0.1, m, true);
      });
    },

    // Small win jingle — 3-note ascending
    winSmall() {
      const c = ctx(); if (!c) return;
      const m = masterGain(); if (!m) return;
      const t = c.currentTime;
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => {
        tone(f,   'sine',     t + i*0.1, 0.18, 0.3, m, true);
        tone(f*2, 'triangle', t + i*0.1, 0.15, 0.1, m, true);
      });
    },

    // Big win fanfare — triumphant arpeggio + shimmer
    bigWin() {
      const c = ctx(); if (!c) return;
      const m = masterGain(); if (!m) return;
      const t = c.currentTime;
      // Rising arpeggio
      const chord = [262, 330, 392, 523, 659, 784, 1047, 1319];
      chord.forEach((f, i) => {
        tone(f,   'sine',     t + i*0.08, 0.5 - i*0.04, 0.35, m, true);
        tone(f*2, 'triangle', t + i*0.08, 0.3 - i*0.03, 0.12, m, true);
      });
      // Shimmer noise burst
      noise(t + 0.5, 0.3, 0.08, m);
      // Held chord at end
      [523, 659, 784].forEach(f => {
        tone(f, 'sine', t + 0.7, 0.6, 0.15, m, true);
      });
    },

    // Jackpot — maximum celebration
    jackpot() {
      const c = ctx(); if (!c) return;
      const m = masterGain(); if (!m) return;
      const t = c.currentTime;
      // Long fanfare
      const scale = [262, 294, 330, 349, 392, 440, 494, 523, 659, 784, 1047];
      scale.forEach((f, i) => {
        tone(f,   'sine',     t + i*0.07, 0.4, 0.4, m, true);
        tone(f*2, 'triangle', t + i*0.07, 0.3, 0.15, m, true);
        tone(f*3, 'square',   t + i*0.07, 0.2, 0.04, m, true);
      });
      noise(t + 0.5, 0.8, 0.06, m);
      noise(t + 1.0, 0.6, 0.05, m);
      [523, 659, 784, 1047].forEach(f =>
        tone(f, 'sine', t + 0.85, 1.2, 0.2, m, true)
      );
    },

    // Level up — proud ascending scale
    levelUp() {
      const c = ctx(); if (!c) return;
      const m = masterGain(); if (!m) return;
      const t = c.currentTime;
      const notes = [392, 494, 587, 698, 784, 988, 1175];
      notes.forEach((f, i) => {
        tone(f,   'sine',     t + i*0.09, 0.2, 0.35, m, true);
        tone(f*2, 'triangle', t + i*0.09, 0.15, 0.1, m, true);
      });
      [784, 988, 1175].forEach(f =>
        tone(f, 'sine', t + 0.65, 0.5, 0.2, m, true)
      );
    },

    // Reel spin — whoosh for slots/plinko
    spin() {
      const c = ctx(); if (!c) return;
      const m = masterGain(); if (!m) return;
      const t = c.currentTime;
      const osc = c.createOscillator();
      const g   = c.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.25);
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(g); g.connect(m);
      osc.start(t); osc.stop(t + 0.26);
      noise(t, 0.2, 0.06, m);
    },

    // Card deal — soft swish
    card() {
      const c = ctx(); if (!c) return;
      const m = masterGain(); if (!m) return;
      const t = c.currentTime;
      noise(t, 0.08, 0.15, m);
      tone(400, 'sine', t, 0.06, 0.1, m, true);
    },

    // Dice roll — rattling
    dice() {
      const c = ctx(); if (!c) return;
      const m = masterGain(); if (!m) return;
      const t = c.currentTime;
      for (let i = 0; i < 5; i++) {
        const offset = i * 0.045;
        noise(t + offset, 0.04, 0.12 - i*0.02, m);
        tone(200 + Math.random()*200, 'square', t + offset, 0.03, 0.08, m, true);
      }
    },

    // Notification ping
    ping() {
      const c = ctx(); if (!c) return;
      const m = masterGain(); if (!m) return;
      const t = c.currentTime;
      tone(1047, 'sine', t,      0.12, 0.3, m, true);
      tone(1319, 'sine', t+0.06, 0.1,  0.2, m, true);
    },

    // Deposit confirmed — positive chime
    deposit() {
      const c = ctx(); if (!c) return;
      const m = masterGain(); if (!m) return;
      const t = c.currentTime;
      [523, 659, 784, 1047].forEach((f, i) =>
        tone(f, 'sine', t + i*0.08, 0.25, 0.25, m, true)
      );
    },

    // Error / bust — descending
    error() {
      const c = ctx(); if (!c) return;
      const m = masterGain(); if (!m) return;
      const t = c.currentTime;
      tone(440, 'sawtooth', t,      0.15, 0.2, m, true);
      tone(330, 'sawtooth', t+0.1,  0.15, 0.2, m, true);
      tone(220, 'sawtooth', t+0.22, 0.2,  0.25, m, true);
    },
  };

  // ── Public API ──────────────────────────────────────────────

  const CasinoSounds = {
    play(name) {
      if (!_enabled) return;
      if (SOUNDS[name]) {
        try { SOUNDS[name](); } catch(e) {}
      }
    },

    isEnabled()  { return _enabled; },
    getVolume()  { return _volume; },

    enable() {
      _enabled = true;
      localStorage.setItem(STORAGE_KEY, '1');
    },
    disable() {
      _enabled = false;
      localStorage.setItem(STORAGE_KEY, '0');
    },
    toggle() {
      _enabled ? this.disable() : this.enable();
      return _enabled;
    },
    setVolume(v) {
      _volume = Math.max(0, Math.min(1, v));
      localStorage.setItem('hrc_sounds_vol', _volume);
    },

    // Convenience: pick win sound by amount
    win(amount) {
      if      (amount >= 100000) this.play('jackpot');
      else if (amount >= 10000)  this.play('bigWin');
      else if (amount >= 1000)   this.play('winSmall');
      else                       this.play('coin');
    },
  };

  global.CasinoSounds = CasinoSounds;

  // Unlock AudioContext on first user interaction (browser policy)
  function unlock() {
    ctx();
    document.removeEventListener('click',     unlock);
    document.removeEventListener('touchstart', unlock);
    document.removeEventListener('keydown',   unlock);
  }
  document.addEventListener('click',     unlock, { once: true });
  document.addEventListener('touchstart', unlock, { once: true, passive: true });
  document.addEventListener('keydown',   unlock, { once: true });

})(window);
