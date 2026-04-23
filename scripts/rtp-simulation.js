// RTP simulation for Pharaoh's Gold — runs 1M spins and reports actual RTP
// Usage: node scripts/rtp-simulation.js [spins]

const SYMBOLS = {
  '10':     { pay:[0,0,8,25,75]     },
  'J':      { pay:[0,0,8,25,75]     },
  'Q':      { pay:[0,0,12,32,100]   },
  'K':      { pay:[0,0,12,32,100]   },
  'A':      { pay:[0,0,15,50,140]   },
  'ANKH':   { pay:[0,0,25,75,200]   },
  'SCARAB': { pay:[0,0,40,120,320]  },
  'EYE':    { pay:[0,0,60,200,475]  },
  'PHARAOH':{ pay:[0,0,90,300,750]  },
  'WILD':   { pay:[0,0,110,550,1500], isWild:true },
  'SCATTER':{ payScatter:[0,0,6,20,100], isScatter:true }
};

const REEL_STRIPS = [
  ['A','K','Q','J','10','A','K','Q','J','10','ANKH','SCARAB','EYE','A','K','Q','J','10','ANKH','SCARAB','PHARAOH','A','K','Q','J','10','EYE','A','ANKH','SCATTER'],
  ['10','J','Q','K','A','ANKH','SCARAB','EYE','WILD','10','J','Q','K','A','ANKH','SCARAB','PHARAOH','10','J','Q','K','A','ANKH','EYE','WILD','SCARAB','10','J','A','SCATTER'],
  ['A','K','Q','J','10','ANKH','PHARAOH','SCARAB','EYE','WILD','A','K','Q','J','10','ANKH','EYE','PHARAOH','SCARAB','A','K','Q','J','10','WILD','EYE','ANKH','SCARAB','PHARAOH','SCATTER'],
  ['10','J','Q','K','A','ANKH','SCARAB','EYE','WILD','10','J','Q','K','A','ANKH','SCARAB','PHARAOH','10','J','Q','K','A','ANKH','EYE','WILD','SCARAB','10','J','A','SCATTER'],
  ['A','K','Q','J','10','A','K','Q','J','10','ANKH','SCARAB','EYE','A','K','Q','J','10','ANKH','SCARAB','PHARAOH','A','K','Q','J','10','EYE','A','ANKH','SCATTER']
];

const PAYLINES = [
  [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
  [0,0,1,2,2],[2,2,1,0,0],[1,0,1,2,1],[1,2,1,0,1],[0,1,1,1,0],
  [2,1,1,1,2],[1,0,0,0,1],[1,2,2,2,1],[0,1,2,2,1],[2,1,0,0,1],
  [1,0,0,1,2],[1,2,2,1,0],[0,2,0,2,0],[2,0,2,0,2],[0,1,0,1,0]
];

const NUM_LINES = 20;
const REELS = 5;
const ROWS = 3;

function spin() {
  const grid = [];
  for(let r=0; r<REELS; r++){
    const strip = REEL_STRIPS[r];
    const start = Math.floor(Math.random() * strip.length);
    const col = [];
    for(let i=0; i<ROWS; i++) col.push(strip[(start+i) % strip.length]);
    grid[r] = col;
  }
  return grid;
}

function evaluate(grid, coinVal, totalBet) {
  let totalWin = 0;
  let scatterCount = 0;
  for(let r=0; r<REELS; r++) for(let row=0; row<ROWS; row++) if(grid[r][row]==='SCATTER') scatterCount++;

  for(const line of PAYLINES){
    const symbols = [];
    for(let r=0; r<REELS; r++) symbols.push(grid[r][line[r]]);

    let checkSym = null;
    for(const s of symbols){ if(s!=='WILD' && s!=='SCATTER'){ checkSym=s; break; } }
    if(checkSym===null) checkSym='WILD';

    let matchCount = 0;
    for(let r=0; r<REELS; r++){
      if(symbols[r]===checkSym || symbols[r]==='WILD') matchCount++; else break;
    }

    if(matchCount>=3){
      const p = SYMBOLS[checkSym].pay[matchCount-1];
      if(p>0) totalWin += p * coinVal;
    }
  }

  if(scatterCount>=3){
    totalWin += SYMBOLS['SCATTER'].payScatter[scatterCount-1] * totalBet;
  }

  return { totalWin, scatterCount, triggerFS: scatterCount>=3 ? (scatterCount===3?10:scatterCount===4?15:20) : 0 };
}

function simulate(N) {
  const coinVal = 1;
  const totalBet = coinVal * NUM_LINES;
  let totalWagered = 0;
  let totalWon = 0;
  let freeSpins = 0;
  let freeSpinWins = 0;
  let bigWins = 0;
  let megaWins = 0;
  let maxWin = 0;
  let hitCount = 0;

  for(let i=0; i<N; i++){
    totalWagered += totalBet;
    const g = spin();
    const r = evaluate(g, coinVal, totalBet);
    totalWon += r.totalWin;
    if(r.totalWin > 0) hitCount++;
    if(r.totalWin > maxWin) maxWin = r.totalWin;
    if(r.totalWin >= totalBet * 15 && r.totalWin < totalBet * 25) bigWins++;
    if(r.totalWin >= totalBet * 25) megaWins++;

    // Simulate free spins at 2x multiplier
    if(r.triggerFS > 0){
      freeSpins += r.triggerFS;
      for(let f=0; f<r.triggerFS; f++){
        const fg = spin();
        const fr = evaluate(fg, coinVal, totalBet);
        const win = fr.totalWin * 2;
        totalWon += win;
        freeSpinWins += win;
      }
    }
  }

  const rtp = (totalWon / totalWagered) * 100;
  const hitRate = (hitCount / N) * 100;
  console.log('═══════════════════════════════════════════');
  console.log("PHARAOH'S GOLD — RTP SIMULATION");
  console.log('═══════════════════════════════════════════');
  console.log('Spins:            ' + N.toLocaleString());
  console.log('Total Wagered:    ' + totalWagered.toLocaleString());
  console.log('Total Won:        ' + Math.floor(totalWon).toLocaleString());
  console.log('RTP:              ' + rtp.toFixed(2) + '%');
  console.log('Hit Rate:         ' + hitRate.toFixed(2) + '%');
  console.log('Free Spins:       ' + freeSpins.toLocaleString());
  console.log('  Win from FS:    ' + Math.floor(freeSpinWins).toLocaleString());
  console.log('Big Wins (15-25x): ' + bigWins);
  console.log('Mega Wins (>25x):  ' + megaWins);
  console.log('Max Single Win:   ' + maxWin + ' (' + (maxWin/totalBet).toFixed(1) + 'x bet)');
  console.log('───────────────────────────────────────────');
  const target = 96;
  const diff = rtp - target;
  if(Math.abs(diff) < 2) console.log('✅ RTP within target range (96% ± 2%)');
  else if(diff > 0) console.log('⚠ RTP HIGH by ' + diff.toFixed(1) + '% — house edge too thin');
  else console.log('⚠ RTP LOW by ' + (-diff).toFixed(1) + '% — players may complain');
  console.log('═══════════════════════════════════════════');
}

const N = parseInt(process.argv[2]) || 1_000_000;
simulate(N);
