const fs = require('fs');

const file = 'C:/Users/PC/casino/public/index.html';
let content = fs.readFileSync(file, 'utf8');

console.log('File length:', content.length);

// ── CHANGE 1: Replace RobotHero ──
const startMarker = 'function RobotHero() {';
const endMarker = 'function App(){';
const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1) { console.error('ERROR: Cannot find RobotHero start'); process.exit(1); }
if (endIdx === -1) { console.error('ERROR: Cannot find function App() start'); process.exit(1); }

console.log('RobotHero start:', startIdx, 'App start:', endIdx);

const newRobotHero = `function RobotHero() {
  const cvRef = React.useRef(null);
  React.useEffect(()=>{
    const cv = cvRef.current; if(!cv) return;
    const ctx = cv.getContext('2d');
    let W, H, raf;
    const particles = [];
    const coins = [];

    function resize() {
      W = cv.width = cv.offsetWidth * window.devicePixelRatio;
      H = cv.height = cv.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      W = cv.offsetWidth; H = cv.offsetHeight;
    }
    resize();

    // Orb particles
    for(let i = 0; i < 120; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 60 + Math.random() * 80;
      particles.push({
        angle, radius,
        speed: (Math.random() - 0.5) * 0.008,
        size: 0.8 + Math.random() * 2.5,
        alpha: 0.3 + Math.random() * 0.7,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.04,
        orbitTilt: (Math.random() - 0.5) * 0.8,
      });
    }

    // Floating coins
    for(let i = 0; i < 22; i++) {
      coins.push({
        x: Math.random() * 340,
        y: Math.random() * 420,
        vy: -(0.4 + Math.random() * 0.7),
        vx: (Math.random() - 0.5) * 0.3,
        r: 7 + Math.random() * 9,
        rot: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.06,
        alpha: 0.15 + Math.random() * 0.5,
      });
    }

    let t = 0;
    function draw() {
      raf = requestAnimationFrame(draw);
      t += 0.012;
      ctx.clearRect(0, 0, W, H);

      const cx = W * 0.5, cy = H * 0.48;

      // Deep glow background
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 180);
      bg.addColorStop(0, 'rgba(201,168,76,0.12)');
      bg.addColorStop(0.4, 'rgba(139,92,246,0.06)');
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, 180, 0, Math.PI*2);
      ctx.fillStyle = bg; ctx.fill();

      // Core orb
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 72);
      core.addColorStop(0, 'rgba(255,235,150,0.95)');
      core.addColorStop(0.25, 'rgba(240,192,96,0.85)');
      core.addColorStop(0.55, 'rgba(201,168,76,0.5)');
      core.addColorStop(0.8, 'rgba(139,92,246,0.2)');
      core.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, 72, 0, Math.PI*2);
      ctx.fillStyle = core; ctx.fill();

      // Inner bright core
      const inner = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
      inner.addColorStop(0, 'rgba(255,255,255,0.9)');
      inner.addColorStop(0.5, 'rgba(255,220,100,0.6)');
      inner.addColorStop(1, 'rgba(201,168,76,0)');
      ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI*2);
      ctx.fillStyle = inner; ctx.fill();

      // Pulsing rings
      for(let r = 0; r < 3; r++) {
        const rSize = 85 + r*38 + Math.sin(t*1.5 + r*1.2)*6;
        const rAlpha = (0.25 - r*0.07) * (0.7 + Math.sin(t*2 + r)*0.3);
        ctx.beginPath(); ctx.arc(cx, cy, rSize, 0, Math.PI*2);
        ctx.strokeStyle = \`rgba(201,168,76,\${rAlpha})\`;
        ctx.lineWidth = 1.5 - r*0.3; ctx.stroke();
      }

      // Rotating energy lines
      for(let l = 0; l < 6; l++) {
        const lAngle = t*0.4 + l * Math.PI/3;
        const lLen = 55 + Math.sin(t*2 + l)*15;
        const x1 = cx + Math.cos(lAngle)*28, y1 = cy + Math.sin(lAngle)*28;
        const x2 = cx + Math.cos(lAngle)*lLen, y2 = cy + Math.sin(lAngle)*lLen;
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, 'rgba(255,220,80,0.8)');
        grad.addColorStop(1, 'rgba(139,92,246,0)');
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
        ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.stroke();
      }

      // Orbiting particles
      particles.forEach(function(p) {
        p.angle += p.speed;
        p.pulse += p.pulseSpeed;
        const px = cx + Math.cos(p.angle) * p.radius;
        const py = cy + Math.sin(p.angle) * p.radius * (1 - Math.abs(p.orbitTilt)*0.4);
        const alpha = p.alpha * (0.6 + Math.sin(p.pulse)*0.4);
        const sz = p.size * (0.8 + Math.sin(p.pulse)*0.3);
        ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI*2);
        const goldness = Math.random() > 0.15;
        ctx.fillStyle = goldness ? \`rgba(240,192,96,\${alpha})\` : \`rgba(180,140,255,\${alpha*0.7})\`;
        ctx.fill();
      });

      // Floating coins
      coins.forEach(function(c) {
        c.y += c.vy; c.x += c.vx; c.rot += c.rotSpeed;
        if(c.y < -20) { c.y = H + 10; c.x = Math.random()*340; }
        const scaleX = Math.abs(Math.cos(c.rot));
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.scale(scaleX, 1);
        const cg = ctx.createRadialGradient(0,0,0,0,0,c.r);
        cg.addColorStop(0, \`rgba(255,235,120,\${c.alpha})\`);
        cg.addColorStop(0.6, \`rgba(201,168,76,\${c.alpha*0.8})\`);
        cg.addColorStop(1, \`rgba(120,80,20,\${c.alpha*0.4})\`);
        ctx.beginPath(); ctx.ellipse(0,0,c.r,c.r*0.25,0,0,Math.PI*2);
        ctx.fillStyle = cg; ctx.fill();
        ctx.strokeStyle = \`rgba(255,210,80,\${c.alpha*0.6})\`; ctx.lineWidth=0.8; ctx.stroke();
        ctx.restore();
      });

      // HATHOR symbol text
      ctx.save();
      ctx.globalAlpha = 0.12 + Math.sin(t*0.8)*0.04;
      ctx.font = 'bold 11px Cinzel, serif';
      ctx.fillStyle = '#c9a84c';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '4px';
      ctx.fillText('\u2B21 HATHOR \u2B21', cx, cy + 105);
      ctx.restore();
    }
    draw();
    window.addEventListener('resize', resize);
    return function() { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return React.createElement('div', {
    style: { position:'relative', flexShrink:0, width:'320px', height:'420px', zIndex:2 }
  },
    React.createElement('canvas', {
      ref: cvRef,
      style: { width:'100%', height:'100%', display:'block' }
    })
  );
}

`;

content = content.substring(0, startIdx) + newRobotHero + content.substring(endIdx);

if (content.includes('cvRef')) {
  console.log('CHANGE 1: OK - cvRef found');
} else {
  console.error('CHANGE 1: FAILED');
  process.exit(1);
}

// ── CHANGE 2: Update .hero-banner CSS ──
// Normalize to LF for matching, then handle CRLF in actual replacement
const crlf = content.includes('\r\n');
const nl = crlf ? '\r\n' : '\n';

const oldHeroBanner = `.hero-banner {${nl}  border-radius:20px; padding:44px 44px;${nl}  background:${nl}    radial-gradient(ellipse 80% 100% at 0% 50%, rgba(201,168,76,.09) 0%, transparent 60%),${nl}    radial-gradient(ellipse 60% 80% at 100% 20%, rgba(139,92,246,.06) 0%, transparent 50%),${nl}    linear-gradient(135deg,rgba(14,11,4,.98) 0%,rgba(10,8,3,.99) 100%);${nl}  border:1px solid rgba(201,168,76,.14); margin-bottom:28px;${nl}  display:flex; justify-content:space-between; align-items:center; gap:32px;${nl}  position:relative; overflow:hidden;${nl}  box-shadow:0 0 0 1px rgba(201,168,76,.04) inset, 0 32px 80px rgba(0,0,0,.7);${nl}}`;

const newHeroBanner = `.hero-banner {${nl}  border-radius:20px; padding:44px 44px; min-height:320px;${nl}  background:${nl}    radial-gradient(ellipse 90% 120% at 0% 60%, rgba(201,168,76,.13) 0%, transparent 55%),${nl}    radial-gradient(ellipse 70% 90% at 100% 10%, rgba(139,92,246,.09) 0%, transparent 50%),${nl}    radial-gradient(ellipse 50% 60% at 50% 100%, rgba(201,168,76,.06) 0%, transparent 60%),${nl}    linear-gradient(135deg,rgba(16,12,4,.99) 0%,rgba(8,6,2,1) 60%,rgba(12,8,18,.99) 100%);${nl}  border:1px solid rgba(201,168,76,.18); margin-bottom:28px;${nl}  display:flex; justify-content:space-between; align-items:center; gap:32px;${nl}  position:relative; overflow:hidden;${nl}  box-shadow:0 0 0 1px rgba(201,168,76,.06) inset, 0 40px 100px rgba(0,0,0,.85), 0 0 60px rgba(201,168,76,.04) inset;${nl}}`;

if (!content.includes(oldHeroBanner)) {
  console.error('CHANGE 2: Cannot find old .hero-banner block');
  // Debug: show what's actually there
  const idx = content.indexOf('.hero-banner {');
  console.log('hero-banner context:', JSON.stringify(content.substring(idx, idx + 400)));
  process.exit(1);
}
content = content.replace(oldHeroBanner, newHeroBanner);
console.log('CHANGE 2: OK - min-height:320px added');

// ── CHANGE 3: Update .hero-title font-size ──
const oldHeroTitle = `.hero-title {${nl}  font-family:'Cinzel',serif; font-size:38px; font-weight:900;`;
const newHeroTitle = `.hero-title {${nl}  font-family:'Cinzel',serif; font-size:44px; font-weight:900;`;

if (!content.includes(oldHeroTitle)) {
  console.error('CHANGE 3: Cannot find old .hero-title block');
  const idx = content.indexOf('.hero-title {');
  console.log('hero-title context:', JSON.stringify(content.substring(idx, idx + 200)));
  process.exit(1);
}
content = content.replace(oldHeroTitle, newHeroTitle);
console.log('CHANGE 3: OK - font-size:44px set');

// Write back
fs.writeFileSync(file, content, 'utf8');
console.log('File written successfully. New length:', content.length);
