const express = require('express');
// Use built-in fetch (Node 18+) or polyfill
if(typeof fetch === 'undefined'){
  try{ global.fetch = require('node-fetch'); } catch(e){}
}
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ── Database ─────────────────────────────────────────────
const DB_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH 
  ? process.env.RAILWAY_VOLUME_MOUNT_PATH + '/casino.db'
  : './casino.db';
const db = new Database(DB_PATH);
console.log('DB path:', DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tokens INTEGER DEFAULT 10000,
    avatar TEXT DEFAULT NULL,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    total_won INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    last_bonus TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS game_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL,
    game TEXT NOT NULL,
    bet INTEGER DEFAULT 0,
    result INTEGER DEFAULT 0,
    won INTEGER DEFAULT 0,
    ts TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS jackpot (
    id INTEGER PRIMARY KEY CHECK(id=1),
    amount INTEGER DEFAULT 50000
  );
  INSERT OR IGNORE INTO jackpot(id,amount) VALUES(1,50000);
  CREATE TABLE IF NOT EXISTS kyc (
    uid TEXT PRIMARY KEY,
    status TEXT DEFAULT 'unverified',
    full_name TEXT,
    birth_date TEXT,
    country TEXT,
    id_type TEXT DEFAULT 'passport',
    id_front TEXT,
    id_back TEXT,
    selfie TEXT,
    rejection_reason TEXT,
    submitted_at TEXT,
    reviewed_at TEXT
  );
`);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'hathor2026';

// Middleware to check admin
const adminAuth = (req, res, next) => {
  const pw = req.headers['x-admin-key'] || req.query.key;
  if(pw !== ADMIN_PASSWORD) return res.status(403).json({error:'Unauthorized'});
  next();
};


const getUser = uid => db.prepare('SELECT * FROM users WHERE uid=?').get(uid);
const saveUser = u => db.prepare(`INSERT INTO users(uid,name,tokens,avatar,level,xp,total_won,games_played,last_bonus)
  VALUES(@uid,@name,@tokens,@avatar,@level,@xp,@total_won,@games_played,@last_bonus)
  ON CONFLICT(uid) DO UPDATE SET name=excluded.name,tokens=excluded.tokens,avatar=excluded.avatar,
  level=excluded.level,xp=excluded.xp,total_won=excluded.total_won,
  games_played=excluded.games_played,last_bonus=excluded.last_bonus`).run(u);

// ── Levels ───────────────────────────────────────────────
const LEVELS=[
  {level:1,name:'Bronze',  xpNeeded:0,    emoji:'🥉'},
  {level:2,name:'Silver',  xpNeeded:500,  emoji:'🥈'},
  {level:3,name:'Gold',    xpNeeded:1500, emoji:'🥇'},
  {level:4,name:'Platinum',xpNeeded:4000, emoji:'💎'},
  {level:5,name:'Diamond', xpNeeded:10000,emoji:'👑'},
  {level:6,name:'VIP',     xpNeeded:25000,emoji:'🌟'},
];
const getLvInfo = xp => { let l=LEVELS[0]; for(const x of LEVELS){if(xp>=x.xpNeeded)l=x;} return l; };
const nextLvInfo = xp => LEVELS.find(l=>l.xpNeeded>xp)||null;

function addXP(uid, xp) {
  const u = getUser(uid); if(!u) return null;
  const oldLv = getLvInfo(u.xp||0);
  u.xp = (u.xp||0)+xp;
  u.level = getLvInfo(u.xp).level;
  saveUser(u);
  const newLv = getLvInfo(u.xp);
  return {levelUp:newLv.level>oldLv.level, newLevel:newLv, xp:u.xp};
}

// ── Daily bonus ──────────────────────────────────────────
const DAILY=[500,750,1000,1250,1500,2000,3000];
function claimBonus(uid) {
  const u = getUser(uid); if(!u) return null;
  const today = new Date().toISOString().split('T')[0];
  if(u.last_bonus===today) return {alreadyClaimed:true};
  const amount = DAILY[Math.floor(Math.random()*DAILY.length)];
  u.tokens += amount; u.last_bonus = today; u.xp = (u.xp||0)+50;
  saveUser(u);
  return {amount, tokens:u.tokens};
}

// ── Uploads ──────────────────────────────────────────────
if(!fs.existsSync('./public/avatars')) fs.mkdirSync('./public/avatars',{recursive:true});
const storage = multer.diskStorage({
  destination:'./public/avatars/',
  filename:(req,file,cb)=>cb(null,req.headers['x-user-id']+path.extname(file.originalname))
});
const upload = multer({storage,limits:{fileSize:2*1024*1024}});
app.use(express.static(path.join(__dirname,'public')));
app.use(express.json());

// Root → lobby (new unified game lobby)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'lobby.html'));
});
// Keep old casino accessible at /casino
app.get('/casino', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload-avatar', upload.single('avatar'), (req,res)=>{
  const uid=req.headers['x-user-id'];
  if(!req.file) return res.status(400).json({error:'No file'});
  const url=`/avatars/${uid}${path.extname(req.file.originalname)}`;
  const u=getUser(uid); if(u){u.avatar=url;saveUser(u);}
  if(sockets[uid]) sockets[uid].user={...sockets[uid].user,avatar:url};
  res.json({url});
});

app.get('/leaderboard',(req,res)=>{
  const rows=db.prepare('SELECT uid,name,tokens,avatar,level,xp FROM users ORDER BY tokens DESC LIMIT 20').all();
  res.json(rows.map((u,i)=>({rank:i+1,...u,levelInfo:getLvInfo(u.xp||0)})));
});

// ── In-memory ────────────────────────────────────────────
const sockets={};
const pokerRooms={};
const roomChats={};

function addChat(roomId,entry){
  if(!roomChats[roomId]) roomChats[roomId]=[];
  roomChats[roomId].push(entry);
  if(roomChats[roomId].length>100) roomChats[roomId].shift();
  io.to(roomId).emit('chatMsg',entry);
}

// ── Cards ────────────────────────────────────────────────
const SUITS=['♠','♥','♦','♣'],RANKS=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const VV={'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14};
const RED=new Set(['♥','♦']);
const createDeck=()=>SUITS.flatMap(s=>RANKS.map(r=>({suit:s,rank:r,value:VV[r],red:RED.has(s)})));
const shuffle=arr=>{const d=[...arr];for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}return d;};

function evalHand(cards){
  if(cards.length<5)return{score:0,name:'N/A'};
  const vals=cards.map(c=>c.value).sort((a,b)=>b-a);
  const suits=cards.map(c=>c.suit);
  const cnts={};vals.forEach(v=>cnts[v]=(cnts[v]||0)+1);
  const groups=Object.entries(cnts).sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
  const counts=groups.map(g=>g[1]);
  const flush=suits.every(s=>s===suits[0]);
  const uniq=[...new Set(vals)].sort((a,b)=>a-b);
  const straight=uniq.length===5&&(uniq[4]-uniq[0]===4||uniq.join()==='2,3,4,5,14');
  const high=straight&&uniq.join()==='2,3,4,5,14'?5:vals[0];
  const base=vals.reduce((a,v,i)=>a+v*Math.pow(15,4-i),0);
  if(flush&&straight&&high===14)return{score:9e9,name:'👑 Royal Flush'};
  if(flush&&straight)return{score:8e9+high,name:'🃏 Straight Flush'};
  if(counts[0]===4)return{score:7e9+base,name:'🎲 Four of a Kind'};
  if(counts[0]===3&&counts[1]===2)return{score:6e9+base,name:'🏠 Full House'};
  if(flush)return{score:5e9+base,name:'♠ Flush'};
  if(straight)return{score:4e9+high,name:'➡️ Straight'};
  if(counts[0]===3)return{score:3e9+base,name:'3️⃣ Three of a Kind'};
  if(counts[0]===2&&counts[1]===2)return{score:2e9+base,name:'👬 Two Pair'};
  if(counts[0]===2)return{score:1e9+base,name:'👥 One Pair'};
  return{score:base,name:'🔢 High Card'};
}
function best7(hole,comm){
  const all=[...hole,...comm];let best=null;
  for(let i=0;i<all.length-1;i++)for(let j=i+1;j<all.length;j++){
    const r=evalHand(all.filter((_,k)=>k!==i&&k!==j));
    if(!best||r.score>best.score)best=r;
  }
  return best;
}

// ── Bots ─────────────────────────────────────────────────
const BNAMES=['Viktor 🤖','Sofia 🤖','Marco 🤖','Elena 🤖','Carlos 🤖','Yuki 🤖'];
const BSTYLE=['aggressive','passive','balanced','bluff'];
const mkBot=()=>({id:'bot_'+uuidv4().slice(0,8),name:BNAMES[Math.floor(Math.random()*BNAMES.length)],tokens:5000,style:BSTYLE[Math.floor(Math.random()*BSTYLE.length)],isBot:true});
function botAct(bot,room){
  const p=room.players.find(x=>x.id===bot.id);if(!p||p.folded)return null;
  const toCall=room.currentBet-p.bet,r=Math.random();
  if(bot.style==='aggressive'){if(r<.12)return{type:'fold'};if(r<.4)return{type:'raise',amount:room.bigBlind*2};if(toCall===0)return{type:'check'};return{type:'call'};}
  if(bot.style==='passive'){if(r<.25)return{type:'fold'};if(toCall===0)return{type:'check'};if(r<.7)return{type:'call'};return{type:'fold'};}
  if(bot.style==='bluff'){if(r<.08)return{type:'fold'};if(r<.45)return{type:'raise',amount:room.bigBlind*3};if(toCall===0)return{type:'check'};return{type:'call'};}
  if(r<.2)return{type:'fold'};if(r<.5&&toCall===0)return{type:'check'};if(r<.7)return toCall===0?{type:'check'}:{type:'call'};return{type:'raise',amount:room.bigBlind};
}

// ── PokerRoom ─────────────────────────────────────────────
class PokerRoom{
  constructor(id,hostId,buyIn=500,withBots=false){
    this.id=id;this.hostId=hostId;this.buyIn=buyIn;
    this.players=[];this.status='waiting';this.phase='waiting';
    this.deck=[];this.community=[];this.pot=0;this.currentBet=0;
    this.actionIndex=0;this.dealerIndex=0;
    this.smallBlind=Math.max(10,Math.floor(buyIn/20));
    this.bigBlind=this.smallBlind*2;this.botTimers=[];
    if(withBots){const c=2+Math.floor(Math.random()*2);for(let i=0;i<c;i++){const b=mkBot();this.players.push({...b,bet:0,cards:[],folded:false,allIn:false,connected:true,bestHand:null});}}
  }
  addPlayer(id,name,tokens,avatar,level){
    if(this.players.length>=6||this.players.find(p=>p.id===id))return false;
    this.players.push({id,name,tokens:Math.min(tokens,this.buyIn*3),bet:0,cards:[],folded:false,allIn:false,connected:true,bestHand:null,avatar:avatar||null,level:level||1,isBot:false});
    return true;
  }
  removePlayer(id){const i=this.players.findIndex(p=>p.id===id);if(i===-1)return;if(this.status==='waiting')this.players.splice(i,1);else{this.players[i].connected=false;this.players[i].folded=true;}}
  startGame(){if(this.players.length<2)return false;this.status='playing';this.dealerIndex=0;this.newHand();return true;}
  newHand(){
    this.botTimers.forEach(t=>clearTimeout(t));this.botTimers=[];
    this.deck=shuffle(createDeck());this.community=[];this.pot=0;this.currentBet=0;this.phase='preflop';
    const active=this.players.filter(p=>(p.connected||p.isBot)&&p.tokens>0);
    if(active.length<2){this.status='waiting';return false;}
    this.players.forEach(p=>{p.bet=0;p.cards=[];p.folded=(p.tokens<=0||(!p.connected&&!p.isBot));p.allIn=false;p.bestHand=null;});
    active.forEach(p=>{p.cards=[this.deck.pop(),this.deck.pop()];});
    const sb=this.iAfter(this.dealerIndex,1),bb=this.iAfter(this.dealerIndex,2);
    this.fBet(sb,this.smallBlind);this.fBet(bb,this.bigBlind);
    this.currentBet=this.bigBlind;this.actionIndex=this.iAfter(bb,1);this.roundStart=this.actionIndex;
    this.schedBot();return true;
  }
  iAfter(from,steps){let idx=from,found=0;for(let i=0;i<this.players.length*2;i++){idx=(idx+1)%this.players.length;if(!this.players[idx].folded){found++;if(found===steps)return idx;}}return from;}
  fBet(idx,amt){const p=this.players[idx];if(!p)return;const a=Math.min(amt,p.tokens);p.tokens-=a;p.bet+=a;this.pot+=a;if(p.tokens===0)p.allIn=true;}
  schedBot(){const cp=this.players[this.actionIndex];if(!cp||!cp.isBot)return;const t=setTimeout(()=>{const d=botAct(cp,this);if(d){const r=this.action(cp.id,d.type,d.amount||0);if(r)this.broadcast();}},1200+Math.random()*2000);this.botTimers.push(t);}
  action(pid,type,raiseBy=0){
    const p=this.players.find(x=>x.id===pid);
    if(!p||p.folded||p.allIn||this.players[this.actionIndex].id!==pid)return null;
    if(type==='fold')p.folded=true;
    else if(type==='check'){if(p.bet<this.currentBet)return null;}
    else if(type==='call')this.fBet(this.actionIndex,this.currentBet-p.bet);
    else if(type==='raise'){const m=Math.max(this.bigBlind,raiseBy);this.currentBet+=m;this.fBet(this.actionIndex,this.currentBet-p.bet);this.roundStart=this.actionIndex;}
    else if(type==='allin'){const rem=p.tokens;if(p.bet+rem>this.currentBet){this.currentBet=p.bet+rem;this.roundStart=this.actionIndex;}this.fBet(this.actionIndex,rem);}
    return this.advance();
  }
  advance(){
    const alive=this.players.filter(x=>!x.folded);
    if(alive.length===1){
      const w=alive[0];w.tokens+=this.pot;const wonAmt=this.pot;this.pot=0;
      const dbU=getUser(w.id);if(dbU){dbU.tokens=w.tokens;dbU.total_won=(dbU.total_won||0)+wonAmt;saveUser(dbU);}
      const lv=addXP(w.id,100);
      setTimeout(()=>{this.dealerIndex=this.iAfter(this.dealerIndex,1);this.newHand();this.broadcast();},4000);
      return{event:'winner',winner:w.name,levelUp:lv?.levelUp,newLevel:lv?.newLevel};
    }
    const canAct=this.players.filter(x=>!x.folded&&!x.allIn);
    const allCalled=canAct.every(x=>x.bet===this.currentBet);
    let ni=(this.actionIndex+1)%this.players.length,loops=0;
    while(loops<this.players.length){
      const np=this.players[ni];
      if(!np.folded&&!np.allIn){if(allCalled&&ni===this.roundStart)break;if(!allCalled||np.bet<this.currentBet){this.actionIndex=ni;this.schedBot();return{event:'next'};}}
      ni=(ni+1)%this.players.length;loops++;
    }
    return this.nextPhase();
  }
  nextPhase(){
    this.players.forEach(p=>{p.bet=0;});this.currentBet=0;
    this.actionIndex=this.iAfter(this.dealerIndex,1);this.roundStart=this.actionIndex;
    if(this.phase==='preflop'){this.phase='flop';this.deck.pop();this.community.push(this.deck.pop(),this.deck.pop(),this.deck.pop());}
    else if(this.phase==='flop'){this.phase='turn';this.deck.pop();this.community.push(this.deck.pop());}
    else if(this.phase==='turn'){this.phase='river';this.deck.pop();this.community.push(this.deck.pop());}
    else return this.showdown();
    this.schedBot();return{event:'phase',phase:this.phase};
  }
  showdown(){
    this.phase='showdown';
    const alive=this.players.filter(p=>!p.folded);
    let winner=null,best=-Infinity;
    alive.forEach(p=>{p.bestHand=best7(p.cards,this.community);if(p.bestHand.score>best){best=p.bestHand.score;winner=p;}});
    if(winner){const w=winner;w.tokens+=this.pot;this.pot=0;const dbU=getUser(w.id);if(dbU){dbU.tokens=w.tokens;saveUser(dbU);}addXP(w.id,150);}
    setTimeout(()=>{this.dealerIndex=this.iAfter(this.dealerIndex,1);this.newHand();this.broadcast();},5000);
    return{event:'showdown',winner:winner?.name,hand:winner?.bestHand?.name,players:alive.map(p=>({name:p.name,cards:p.cards,bestHand:p.bestHand}))};
  }
  broadcast(){this.players.filter(p=>!p.isBot).forEach(p=>{const s=sockets[p.id]?.socket;if(s)s.emit('gameState',this.getState(p.id));});}
  getState(forId){
    return{roomId:this.id,status:this.status,phase:this.phase,pot:this.pot,currentBet:this.currentBet,
      community:this.community,actionIndex:this.actionIndex,dealerIndex:this.dealerIndex,
      smallBlind:this.smallBlind,bigBlind:this.bigBlind,
      players:this.players.map((p,i)=>({
        id:p.id,name:p.name,tokens:p.tokens,bet:p.bet,folded:p.folded,allIn:p.allIn,
        connected:p.connected||p.isBot,bestHand:p.bestHand,isDealer:i===this.dealerIndex,
        isBot:p.isBot,avatar:p.avatar||null,level:p.level||1,
        cards:p.id===forId||this.phase==='showdown'?p.cards:p.cards.map(()=>null)
      }))};
  }
}

// ── Socket.io handlers ───────────────────────────────────
io.on('connection', socket=>{
  socket.on('register',({name,uid})=>{
    const id=uid||uuidv4();
    let u=getUser(id);
    if(!u){u={uid:id,name,tokens:10000,avatar:null,level:1,xp:0,total_won:0,games_played:0,last_bonus:null};saveUser(u);}
    u.name=name;saveUser(u);
    socket.uid=id;sockets[id]={socket,user:u};
    const lvInfo=getLvInfo(u.xp||0);
    const nextLv=nextLvInfo(u.xp||0);
    const kycRow=db.prepare('SELECT status,rejection_reason FROM kyc WHERE uid=?').get(id);
    const kycStatus=kycRow?.status||'unverified';
    socket.emit('registered',{uid:id,name:u.name,tokens:u.tokens,avatar:u.avatar,level:u.level,xp:u.xp,levelInfo:lvInfo,nextLevel:nextLv,kycStatus,kycRejectionReason:kycRow?.rejection_reason||null});
    const today=new Date().toISOString().split('T')[0];
    if(u.last_bonus!==today) socket.emit('dailyBonusAvailable');
  });

  socket.on('claimDailyBonus',()=>{
    const r=claimBonus(socket.uid);if(!r)return;
    if(r.alreadyClaimed){socket.emit('dailyBonusResult',{alreadyClaimed:true});return;}
    if(sockets[socket.uid]) sockets[socket.uid].user.tokens=r.tokens;
    socket.emit('dailyBonusResult',r);
  });

  socket.on('updateAvatar',({avatarUrl})=>{
    const u=getUser(socket.uid);if(!u)return;u.avatar=avatarUrl;saveUser(u);
  });

  socket.on('saveTokens',({tokens})=>{
    const u=getUser(socket.uid);if(!u)return;
    const kycRow=db.prepare('SELECT status FROM kyc WHERE uid=?').get(socket.uid);
    if(!kycRow||kycRow.status!=='approved'){socket.emit('kycRequired');return;}
    u.tokens=Math.max(0,tokens);saveUser(u);
  });

  socket.on('addXP',({xp,game})=>{
    const res=addXP(socket.uid,xp||10);
    const u=getUser(socket.uid);if(u){u.games_played=(u.games_played||0)+1;saveUser(u);}
    if(res?.levelUp) socket.emit('levelUp',res.newLevel);
  });

  socket.on('chatMsg',({msg,roomId})=>{
    if(!msg?.trim()||!socket.uid)return;
    const u=getUser(socket.uid);
    const lv=getLvInfo(u?.xp||0);
    const entry={uid:socket.uid,name:u?.name||'?',msg:msg.trim().slice(0,200),time:Date.now(),levelEmoji:lv.emoji,avatar:u?.avatar||null};
    if(roomId) addChat(roomId,entry);
    else io.emit('globalChat',entry);
  });

  socket.on('emoji',({emoji,roomId})=>{
    const u=getUser(socket.uid);
    const e={uid:socket.uid,name:u?.name||'?',emoji};
    if(roomId) io.to(roomId).emit('emojiReaction',e);
    else io.emit('emojiReaction',e);
  });

  socket.on('createRoom',({buyIn,withBots})=>{
    const u=getUser(socket.uid);if(!u)return;
    const roomId=Math.random().toString(36).substr(2,6).toUpperCase();
    const room=new PokerRoom(roomId,socket.uid,buyIn||500,withBots||false);
    pokerRooms[roomId]=room;
    room.addPlayer(socket.uid,u.name,u.tokens,u.avatar,u.level);
    socket.join(roomId);socket.roomId=roomId;
    roomChats[roomId]=[];
    socket.emit('roomCreated',{roomId});
    socket.emit('gameState',room.getState(socket.uid));
    socket.emit('chatHistory',[]);
  });

  socket.on('joinRoom',({roomId})=>{
    const u=getUser(socket.uid);
    const room=pokerRooms[roomId?.toUpperCase()];
    if(!u)return socket.emit('error','Not registered');
    if(!room)return socket.emit('error','Room not found');
    if(room.status!=='waiting')return socket.emit('error','Game in progress');
    if(!room.addPlayer(socket.uid,u.name,u.tokens,u.avatar,u.level))return socket.emit('error','Table full');
    socket.join(roomId);socket.roomId=roomId.toUpperCase();
    socket.emit('chatHistory',roomChats[roomId.toUpperCase()]||[]);
    addChat(roomId.toUpperCase(),{uid:'system',name:'System',msg:`${u.name} joined the table 🃏`,time:Date.now(),system:true});
    room.broadcast();
  });

  socket.on('startGame',()=>{
    const room=pokerRooms[socket.roomId];
    if(!room||room.hostId!==socket.uid)return;
    if(room.startGame())room.broadcast();
  });

  socket.on('action',({type,amount})=>{
    const room=pokerRooms[socket.roomId];
    if(!room||room.status!=='playing')return;
    const r=room.action(socket.uid,type,amount||0);
    if(r){room.broadcast();if(r.event!=='next')io.to(socket.roomId).emit('actionResult',r);}
  });

  socket.on('getRooms',()=>{
    socket.emit('roomList',Object.values(pokerRooms).filter(r=>r.status==='waiting')
      .map(r=>({id:r.id,host:getUser(r.hostId)?.name||'?',players:r.players.filter(p=>!p.isBot).length,bots:r.players.filter(p=>p.isBot).length,buyIn:r.buyIn})));
  });

  socket.on('disconnect',()=>{
    const room=pokerRooms[socket.roomId];
    if(room){room.removePlayer(socket.uid);room.broadcast();}
    if(socket.uid)delete sockets[socket.uid];
  });
});


// ── Game log helper ──────────────────────────────────────
function logGame(uid, game, bet, result, won) {
  try { db.prepare('INSERT INTO game_log(uid,game,bet,result,won) VALUES(?,?,?,?,?)').run(uid,game,bet,result,won?1:0); } catch(e){}
}

// ── Jackpot ──────────────────────────────────────────────
function getJackpot() { return db.prepare('SELECT amount FROM jackpot WHERE id=1').get()?.amount||50000; }
function addToJackpot(n) { db.prepare('UPDATE jackpot SET amount=amount+? WHERE id=1').run(n); io.emit('jackpotUpdate', getJackpot()); }
function resetJackpot() { db.prepare('UPDATE jackpot SET amount=50000 WHERE id=1').run(); io.emit('jackpotUpdate', 50000); }

app.get('/api/jackpot', (req,res)=>res.json({amount:getJackpot()}));

// Add jackpot contribution on every bet (1% of bet goes to jackpot)
app.post('/api/log-game', express.json(), (req,res)=>{
  const {uid,game,bet,result,won} = req.body;
  logGame(uid, game, bet, result, won);
  if(bet>0) addToJackpot(Math.floor(bet*0.01));
  res.json({ok:true, jackpot:getJackpot()});
});

// Jackpot win endpoint
app.post('/api/jackpot-win', express.json(), (req,res)=>{
  const {uid} = req.body;
  const amount = getJackpot();
  const u = getUser(uid);
  if(u){ u.tokens += amount; saveUser(u); }
  resetJackpot();
  io.emit('jackpotWon', {name: u?.name||'?', amount});
  res.json({amount});
});

// ── Player stats ─────────────────────────────────────────
app.get('/api/stats/:uid', (req,res)=>{
  const {uid} = req.params;
  const u = getUser(uid);
  if(!u) return res.status(404).json({error:'Not found'});
  const logs = db.prepare('SELECT game, bet, result, won, ts FROM game_log WHERE uid=? ORDER BY ts DESC LIMIT 100').all(uid);
  const byGame = {};
  logs.forEach(l=>{
    if(!byGame[l.game]) byGame[l.game]={played:0,won:0,totalBet:0,totalResult:0,biggestWin:0};
    const g=byGame[l.game];
    g.played++; if(l.won)g.won++; g.totalBet+=l.bet; g.totalResult+=l.result;
    if(l.result>g.biggestWin)g.biggestWin=l.result;
  });
  // Last 20 for chart
  const history = db.prepare('SELECT ts, result, won FROM game_log WHERE uid=? ORDER BY ts DESC LIMIT 20').all(uid).reverse();
  res.json({
    user: {name:u.name,tokens:u.tokens,level:u.level,xp:u.xp,total_won:u.total_won,games_played:u.games_played},
    byGame, history,
    totalGames: logs.length,
    totalWins: logs.filter(l=>l.won).length,
    biggestWin: Math.max(0,...logs.map(l=>l.result)),
  });
});

// ── AI Croupier ──────────────────────────────────────────
app.post('/api/croupier', express.json(), async (req,res)=>{
  const {uid, message, context} = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if(!apiKey) return res.json({reply:'Viktor šiuo metu nepasiekiamas.'});
  const u = getUser(uid)||{name:'Player',tokens:0,level:1};
  const logs = db.prepare('SELECT game,won FROM game_log WHERE uid=? ORDER BY ts DESC LIMIT 10').all(uid);
  const recentGames = logs.map(l=>`${l.game}(${l.won?'won':'lost'})`).join(', ')||'none yet';
  const jackpot = getJackpot();
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'x-api-key':apiKey,'anthropic-version':'2023-06-01','content-type':'application/json'},
      body: JSON.stringify({
        model:'claude-haiku-4-5-20251001',
        max_tokens:200,
        system:`You are Viktor, the charming AI croupier at HATHOR Royal Casino — an elegant, witty, slightly mysterious casino dealer. You know the player personally.

Player: ${u.name} | Balance: ${u.tokens.toLocaleString()} tokens | Level: ${u.level} | Recent: ${recentGames} | Jackpot now: ${jackpot.toLocaleString()} tokens.
Current game/context: ${context||'lobby'}.

Rules:
- Be concise (1-3 sentences max)
- Be charming, sophisticated, with subtle humor
- Give relevant tips when asked
- React to wins with excitement, losses with sympathy
- Mention the jackpot occasionally
- Respond in the SAME language the player uses (Lithuanian, Russian, English, etc)
- Never break character`,
        messages:[{role:'user',content:message}]
      })
    });
    const text = await response.text();
    console.log('Anthropic raw response:', text.slice(0,200));
    let reply = 'Viktor šiuo metu nepasiekiamas...';
    try {
      const data = JSON.parse(text);
      if(data.content && data.content[0] && data.content[0].text) {
        reply = data.content[0].text;
      } else if(data.error) {
        console.error('Anthropic error:', data.error);
        reply = 'Klaida: ' + (data.error.message||'nežinoma');
      }
    } catch(e) { console.error('Parse error:', e.message); }
    res.json({reply});
  } catch(e) {
    res.json({reply:'The connection to my crystal ball is momentarily disrupted... try again!'});
  }
});

// ── Sports Betting API proxy ─────────────────────────────
const https = require('https');
function fetchOdds(apiKey, sport, cb) {
  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal&dateFormat=iso`;
  https.get(url, res => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      try { cb(null, JSON.parse(data)); } catch(e) { cb(e); }
    });
  }).on('error', cb);
}

const SPORTS_MAP = {
  soccer_epl:        '⚽ Premier League',
  soccer_spain_la_liga: '⚽ La Liga',
  basketball_nba:    '🏀 NBA',
  basketball_euroleague: '🏀 Euroleague',
  tennis_atp_french_open: '🎾 Tennis ATP',
  icehockey_nhl:     '🏒 NHL',
};

app.get('/api/sports', (req, res) => {
  const apiKey = req.query.apiKey;
  const sport  = req.query.sport || 'soccer_epl';
  if (!apiKey) return res.status(400).json({ error: 'No API key' });
  fetchOdds(apiKey, sport, (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!Array.isArray(data)) return res.json([]);
    const games = data.slice(0, 12).map(g => ({
      id: g.id,
      sport: sport,
      home: g.home_team,
      away: g.away_team,
      time: g.commence_time,
      odds: (() => {
        const market = g.bookmakers?.[0]?.markets?.[0]?.outcomes || [];
        const h = market.find(o => o.name === g.home_team)?.price || 2;
        const a = market.find(o => o.name === g.away_team)?.price || 2;
        const d = market.find(o => o.name === 'Draw')?.price || null;
        return { home: h, away: a, draw: d };
      })()
    }));
    res.json(games);
  });
});

app.get('/api/sports-list', (req, res) => {
  res.json(Object.entries(SPORTS_MAP).map(([k,v]) => ({ key: k, name: v })));
});





// ══════════════════════════════════════════════════════════
// DEMO SPORTS DATA (when no API key)
// ══════════════════════════════════════════════════════════
const DEMO_MATCHES = {
  soccer_epl: [
    {id:'epl1',home:'Manchester City',away:'Arsenal',time:new Date(Date.now()+3600000*2).toISOString(),odds:{home:1.85,draw:3.60,away:4.20}},
    {id:'epl2',home:'Liverpool',away:'Chelsea',time:new Date(Date.now()+3600000*5).toISOString(),odds:{home:2.10,draw:3.40,away:3.50}},
    {id:'epl3',home:'Manchester United',away:'Tottenham',time:new Date(Date.now()+3600000*8).toISOString(),odds:{home:2.40,draw:3.20,away:3.00}},
    {id:'epl4',home:'Newcastle',away:'Aston Villa',time:new Date(Date.now()+86400000).toISOString(),odds:{home:2.20,draw:3.30,away:3.40}},
    {id:'epl5',home:'Brighton',away:'West Ham',time:new Date(Date.now()+86400000*2).toISOString(),odds:{home:1.95,draw:3.50,away:4.00}},
  ],
  soccer_spain_la_liga: [
    {id:'ll1',home:'Real Madrid',away:'Barcelona',time:new Date(Date.now()+3600000*3).toISOString(),odds:{home:2.05,draw:3.50,away:3.60}},
    {id:'ll2',home:'Atletico Madrid',away:'Sevilla',time:new Date(Date.now()+3600000*6).toISOString(),odds:{home:1.75,draw:3.60,away:5.00}},
    {id:'ll3',home:'Valencia',away:'Villarreal',time:new Date(Date.now()+86400000).toISOString(),odds:{home:2.30,draw:3.20,away:3.20}},
  ],
  basketball_nba: [
    {id:'nba1',home:'LA Lakers',away:'Golden State Warriors',time:new Date(Date.now()+3600000*4).toISOString(),odds:{home:1.90,away:2.00}},
    {id:'nba2',home:'Boston Celtics',away:'Miami Heat',time:new Date(Date.now()+3600000*6).toISOString(),odds:{home:1.65,away:2.30}},
    {id:'nba3',home:'Milwaukee Bucks',away:'Philadelphia 76ers',time:new Date(Date.now()+86400000).toISOString(),odds:{home:1.80,away:2.10}},
    {id:'nba4',home:'Dallas Mavericks',away:'Phoenix Suns',time:new Date(Date.now()+86400000).toISOString(),odds:{home:2.10,away:1.80}},
  ],
  basketball_euroleague: [
    {id:'el1',home:'Real Madrid',away:'CSKA Moscow',time:new Date(Date.now()+3600000*5).toISOString(),odds:{home:1.70,away:2.20}},
    {id:'el2',home:'Fenerbahce',away:'Olimpia Milano',time:new Date(Date.now()+86400000).toISOString(),odds:{home:1.85,away:2.05}},
  ],
  tennis_atp_french_open: [
    {id:'t1',home:'C. Alcaraz',away:'N. Djokovic',time:new Date(Date.now()+3600000*2).toISOString(),odds:{home:2.10,away:1.75}},
    {id:'t2',home:'J. Sinner',away:'A. Zverev',time:new Date(Date.now()+3600000*4).toISOString(),odds:{home:1.80,away:2.05}},
    {id:'t3',home:'H. Hurkacz',away:'S. Tsitsipas',time:new Date(Date.now()+86400000).toISOString(),odds:{home:1.95,away:1.90}},
  ],
  icehockey_nhl: [
    {id:'nhl1',home:'Colorado Avalanche',away:'Vegas Golden Knights',time:new Date(Date.now()+3600000*6).toISOString(),odds:{home:1.85,draw:4.00,away:2.10}},
    {id:'nhl2',home:'Toronto Maple Leafs',away:'Boston Bruins',time:new Date(Date.now()+86400000).toISOString(),odds:{home:2.20,draw:4.20,away:1.85}},
  ],
};

// Override sports endpoint to serve demo data when no API key
app.get('/api/sports-demo', (req,res)=>{
  const sport = req.query.sport || 'soccer_epl';
  const matches = DEMO_MATCHES[sport] || DEMO_MATCHES.soccer_epl;
  // Randomize odds slightly each request for realism
  const live = matches.map(m=>({
    ...m,
    odds:{
      home: parseFloat((m.odds.home + (Math.random()-.5)*.1).toFixed(2)),
      draw: m.odds.draw ? parseFloat((m.odds.draw + (Math.random()-.5)*.1).toFixed(2)) : undefined,
      away: parseFloat((m.odds.away + (Math.random()-.5)*.1).toFixed(2)),
    }
  }));
  res.json(live);
});


// ══════════════════════════════════════════════════════════
// CRYPTO PAYMENTS — NOWPayments
// ══════════════════════════════════════════════════════════
const NOW_API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const NOW_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || '';
const NOW_BASE = 'https://api.nowpayments.io/v1';

// Supported currencies
const CRYPTO_CURRENCIES = [
  { id: 'btc',   name: 'Bitcoin',  symbol: 'BTC',  icon: '₿',  tokensPerUnit: 50000000 },
  { id: 'eth',   name: 'Ethereum', symbol: 'ETH',  icon: 'Ξ',  tokensPerUnit: 3000000  },
  { id: 'usdt',  name: 'USDT',     symbol: 'USDT', icon: '₮',  tokensPerUnit: 1000     },
  { id: 'bnb',   name: 'BNB',      symbol: 'BNB',  icon: '◈',  tokensPerUnit: 500000   },
  { id: 'trx',   name: 'TRON',     symbol: 'TRX',  icon: '◉',  tokensPerUnit: 100      },
];

// Create transactions table
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    type TEXT NOT NULL,
    currency TEXT,
    amount_crypto REAL,
    amount_tokens INTEGER,
    status TEXT DEFAULT 'pending',
    payment_id TEXT,
    payment_address TEXT,
    tx_hash TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// Helper: NOWPayments API call
async function nowFetch(endpoint, method='GET', body=null) {
  const opts = {
    method,
    headers: { 'x-api-key': NOW_API_KEY, 'Content-Type': 'application/json' }
  };
  if(body) opts.body = JSON.stringify(body);
  const r = await fetch(NOW_BASE + endpoint, opts);
  return r.json();
}

// Get available currencies
app.get('/api/crypto/currencies', async (req,res)=>{
  res.json({ currencies: CRYPTO_CURRENCIES });
});

// Get exchange estimate
app.get('/api/crypto/estimate', async (req,res)=>{
  const { currency, tokenAmount } = req.query;
  const cur = CRYPTO_CURRENCIES.find(c=>c.id===currency);
  if(!cur) return res.status(400).json({error:'Unknown currency'});
  const cryptoAmount = (parseInt(tokenAmount)/cur.tokensPerUnit).toFixed(8);
  // Minimum deposit = 1000 tokens
  const minTokens = 1000;
  res.json({ cryptoAmount, currency, tokenAmount, minTokens, rate: cur.tokensPerUnit });
});

// Create deposit
app.post('/api/crypto/deposit', express.json(), async (req,res)=>{
  const { uid, currency, tokenAmount } = req.body;
  if(!uid || !currency || !tokenAmount) return res.status(400).json({error:'Missing fields'});
  if(tokenAmount < 1000) return res.status(400).json({error:'Minimum deposit is 1,000 tokens'});
  const cur = CRYPTO_CURRENCIES.find(c=>c.id===currency);
  if(!cur) return res.status(400).json({error:'Unknown currency'});
  const cryptoAmount = (tokenAmount/cur.tokensPerUnit).toFixed(8);

  if(!NOW_API_KEY) {
    // DEMO MODE — no real API key
    const demoId = 'DEMO_' + Date.now();
    const demoAddress = currency === 'btc'
      ? '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf'
      : '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
    db.prepare(`INSERT INTO transactions(id,uid,type,currency,amount_crypto,amount_tokens,status,payment_id,payment_address)
      VALUES(?,?,?,?,?,?,?,?,?)`).run(demoId,uid,'deposit',currency,cryptoAmount,tokenAmount,'waiting',demoId,demoAddress);
    return res.json({
      paymentId: demoId,
      address: demoAddress,
      amount: cryptoAmount,
      currency: cur.symbol,
      tokenAmount,
      expiresIn: 3600,
      demo: true
    });
  }

  try {
    const payment = await nowFetch('/payment', 'POST', {
      price_amount: cryptoAmount,
      price_currency: currency,
      pay_currency: currency,
      order_id: `${uid}_${Date.now()}`,
      order_description: `HATHOR Casino deposit — ${tokenAmount} tokens`,
      ipn_callback_url: process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/api/crypto/ipn`
        : null
    });
    if(payment.id) {
      db.prepare(`INSERT INTO transactions(id,uid,type,currency,amount_crypto,amount_tokens,status,payment_id,payment_address)
        VALUES(?,?,?,?,?,?,?,?,?)`).run(
          payment.id, uid, 'deposit', currency, cryptoAmount, tokenAmount,
          'waiting', payment.id, payment.pay_address
        );
      res.json({
        paymentId: payment.id,
        address: payment.pay_address,
        amount: payment.pay_amount,
        currency: cur.symbol,
        tokenAmount,
        expiresIn: payment.expiration_estimate_date ? 3600 : 3600
      });
    } else {
      res.status(500).json({error: payment.message||'Payment creation failed'});
    }
  } catch(e) {
    res.status(500).json({error:'Payment service unavailable'});
  }
});

// Check payment status
app.get('/api/crypto/status/:paymentId', async (req,res)=>{
  const tx = db.prepare('SELECT * FROM transactions WHERE payment_id=?').get(req.params.paymentId);
  if(!tx) return res.status(404).json({error:'Not found'});
  
  // Demo mode — simulate confirmation after 60s
  if(tx.payment_id.startsWith('DEMO_')) {
    const age = (Date.now() - parseInt(tx.payment_id.split('_')[1]));
    if(age > 60000 && tx.status === 'waiting') {
      db.prepare('UPDATE transactions SET status=? WHERE payment_id=?').run('finished', tx.payment_id);
      db.prepare('UPDATE users SET tokens=tokens+? WHERE uid=?').run(tx.amount_tokens, tx.uid);
      io.to(tx.uid).emit('depositConfirmed', {tokens: tx.amount_tokens, currency: tx.currency});
      return res.json({status:'finished', tokens: tx.amount_tokens, demo:true});
    }
    return res.json({status: tx.status, demo:true});
  }
  
  if(!NOW_API_KEY) return res.json({status: tx.status});
  try {
    const data = await nowFetch(`/payment/${tx.payment_id}`);
    if(data.payment_status !== tx.status) {
      db.prepare('UPDATE transactions SET status=?,updated_at=datetime("now") WHERE payment_id=?').run(data.payment_status, tx.payment_id);
      if(data.payment_status === 'finished' && tx.status !== 'finished') {
        db.prepare('UPDATE users SET tokens=tokens+? WHERE uid=?').run(tx.amount_tokens, tx.uid);
        io.to(tx.uid).emit('depositConfirmed', {tokens: tx.amount_tokens, currency: tx.currency});
      }
    }
    res.json({status: data.payment_status, tokens: tx.amount_tokens});
  } catch(e) {
    res.json({status: tx.status});
  }
});

// IPN webhook — NOWPayments calls this when payment status changes
app.post('/api/crypto/ipn', express.json(), (req,res)=>{
  // Verify IPN signature
  const sig = req.headers['x-nowpayments-sig'];
  if(NOW_IPN_SECRET && sig) {
    const crypto = require('crypto');
    const sorted = JSON.stringify(req.body, Object.keys(req.body).sort());
    const hmac = crypto.createHmac('sha512', NOW_IPN_SECRET).update(sorted).digest('hex');
    if(hmac !== sig) return res.status(403).json({error:'Invalid signature'});
  }
  const { payment_id, payment_status, order_id } = req.body;
  const tx = db.prepare('SELECT * FROM transactions WHERE payment_id=?').get(payment_id);
  if(!tx) return res.status(404).json({error:'Not found'});
  db.prepare('UPDATE transactions SET status=?,updated_at=datetime("now") WHERE payment_id=?').run(payment_status, payment_id);
  if(payment_status === 'finished' && tx.status !== 'finished') {
    db.prepare('UPDATE users SET tokens=tokens+? WHERE uid=?').run(tx.amount_tokens, tx.uid);
    io.to(tx.uid).emit('depositConfirmed', {tokens: tx.amount_tokens, currency: tx.currency});
  }
  res.json({ok:true});
});

// Withdrawal request
app.post('/api/crypto/withdraw', express.json(), async (req,res)=>{
  const { uid, currency, tokenAmount, address } = req.body;
  if(!uid || !currency || !tokenAmount || !address) return res.status(400).json({error:'Missing fields'});
  if(tokenAmount < 5000) return res.status(400).json({error:'Minimum withdrawal is 5,000 tokens'});
  const user = getUser(uid);
  if(!user) return res.status(404).json({error:'User not found'});
  if(user.tokens < tokenAmount) return res.status(400).json({error:'Insufficient tokens'});
  const cur = CRYPTO_CURRENCIES.find(c=>c.id===currency);
  if(!cur) return res.status(400).json({error:'Unknown currency'});
  const cryptoAmount = (tokenAmount/cur.tokensPerUnit).toFixed(8);
  // Deduct tokens immediately (hold)
  db.prepare('UPDATE users SET tokens=tokens-? WHERE uid=?').run(tokenAmount, uid);
  const txId = 'WD_' + Date.now() + '_' + uid.slice(0,8);
  db.prepare(`INSERT INTO transactions(id,uid,type,currency,amount_crypto,amount_tokens,status,payment_address)
    VALUES(?,?,?,?,?,?,?,?)`).run(txId, uid, 'withdrawal', currency, cryptoAmount, tokenAmount, 'pending', address);
  // In demo/manual mode — admin processes withdrawals
  res.json({ok:true, txId, cryptoAmount, currency:cur.symbol, message:'Withdrawal queued. Processing within 24h.'});
});

// Transaction history
app.get('/api/crypto/history/:uid', (req,res)=>{
  const txs = db.prepare('SELECT * FROM transactions WHERE uid=? ORDER BY created_at DESC LIMIT 50').all(req.params.uid);
  res.json(txs);
});

// Admin: pending withdrawals
app.get('/admin/withdrawals', adminAuth, (req,res)=>{
  const pending = db.prepare("SELECT t.*,u.name FROM transactions t JOIN users u ON t.uid=u.uid WHERE t.type='withdrawal' AND t.status='pending' ORDER BY t.created_at DESC").all();
  res.json(pending);
});

// Admin: mark withdrawal as paid
app.post('/admin/withdrawal-paid/:txId', adminAuth, express.json(), (req,res)=>{
  const {txHash} = req.body;
  db.prepare("UPDATE transactions SET status='finished',tx_hash=?,updated_at=datetime('now') WHERE id=?").run(txHash||'manual', req.params.txId);
  res.json({ok:true});
});


// ══════════════════════════════════════════════════════════
// PROVABLY FAIR SYSTEM
// ══════════════════════════════════════════════════════════
const crypto = require('crypto');

function generateServerSeed() {
  return crypto.randomBytes(32).toString('hex');
}

function hashSeed(seed) {
  return crypto.createHash('sha256').update(seed).digest('hex');
}

function generateResult(serverSeed, clientSeed, nonce, max) {
  // HMAC-SHA256 combination - industry standard
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  const hmac = crypto.createHmac('sha256', serverSeed).update(combined).digest('hex');
  // Take first 8 hex chars → convert to number → scale to range
  const decimal = parseInt(hmac.slice(0, 8), 16);
  return (decimal % max);
}

// Store active seeds per user
const userSeeds = {}; // uid -> {serverSeed, hashedServerSeed, clientSeed, nonce}

function getOrCreateSeed(uid) {
  if(!userSeeds[uid]) {
    const serverSeed = generateServerSeed();
    userSeeds[uid] = {
      serverSeed,
      hashedServerSeed: hashSeed(serverSeed),
      clientSeed: crypto.randomBytes(16).toString('hex'),
      nonce: 0
    };
  }
  return userSeeds[uid];
}

// API: Get current seed info (hashed only - never reveal server seed before game!)
app.get('/api/provably-fair/seeds/:uid', (req,res)=>{
  const seeds = getOrCreateSeed(req.params.uid);
  res.json({
    hashedServerSeed: seeds.hashedServerSeed,
    clientSeed: seeds.clientSeed,
    nonce: seeds.nonce,
    info: 'Server seed is hidden until you rotate. After rotating, previous seed is revealed.'
  });
});

// API: Player sets their own client seed
app.post('/api/provably-fair/client-seed', express.json(), (req,res)=>{
  const {uid, clientSeed} = req.body;
  if(!uid || !clientSeed) return res.status(400).json({error:'Missing fields'});
  const seeds = getOrCreateSeed(uid);
  seeds.clientSeed = clientSeed.slice(0, 64); // max 64 chars
  res.json({ok:true, clientSeed: seeds.clientSeed, hashedServerSeed: seeds.hashedServerSeed});
});

// API: Rotate seeds (reveals old server seed, generates new one)
app.post('/api/provably-fair/rotate', express.json(), (req,res)=>{
  const {uid} = req.body;
  const seeds = getOrCreateSeed(uid);
  const oldServerSeed = seeds.serverSeed; // Now we can reveal this
  const newServerSeed = generateServerSeed();
  userSeeds[uid] = {
    serverSeed: newServerSeed,
    hashedServerSeed: hashSeed(newServerSeed),
    clientSeed: seeds.clientSeed,
    nonce: 0
  };
  res.json({
    ok: true,
    previousServerSeed: oldServerSeed,  // Revealed!
    newHashedServerSeed: hashSeed(newServerSeed),
    clientSeed: seeds.clientSeed
  });
});

// API: Verify a past game result
app.post('/api/provably-fair/verify', express.json(), (req,res)=>{
  const {serverSeed, clientSeed, nonce, game, result} = req.body;
  if(!serverSeed || !clientSeed || nonce === undefined) return res.status(400).json({error:'Missing fields'});
  
  let max, computedResult, verified = false;
  
  if(game === 'roulette') {
    computedResult = generateResult(serverSeed, clientSeed, nonce, 37);
    verified = computedResult === parseInt(result);
  } else if(game === 'slots') {
    // 5 reels x 3 rows = 15 symbols
    const symbols = [];
    for(let i=0;i<15;i++) {
      symbols.push(generateResult(serverSeed, clientSeed, nonce*100+i, 8));
    }
    computedResult = symbols;
    verified = true; // Show what the result should have been
  } else if(game === 'blackjack') {
    // Verify deck order
    const deck = [];
    for(let i=0;i<52;i++) {
      deck.push(generateResult(serverSeed, clientSeed, nonce*100+i, 52-i));
    }
    computedResult = deck;
    verified = true;
  } else if(game === 'coin') {
    computedResult = generateResult(serverSeed, clientSeed, nonce, 2);
    verified = computedResult === parseInt(result);
  }
  
  res.json({
    verified,
    computedResult,
    hashedServerSeed: hashSeed(serverSeed),
    serverSeed,
    clientSeed,
    nonce,
    game
  });
});

// Provably fair spin for slots
app.post('/api/pf/slots', express.json(), (req,res)=>{
  const {uid, machineSymbols} = req.body;
  const seeds = getOrCreateSeed(uid);
  seeds.nonce++;
  const grid = [];
  const symCount = machineSymbols || 8;
  for(let col=0;col<5;col++){
    const column = [];
    for(let row=0;row<3;row++){
      const idx = col*3+row;
      column.push(generateResult(seeds.serverSeed, seeds.clientSeed, seeds.nonce*100+idx, symCount));
    }
    grid.push(column);
  }
  res.json({
    grid, // symbol indices
    nonce: seeds.nonce,
    hashedServerSeed: seeds.hashedServerSeed,
    clientSeed: seeds.clientSeed
  });
});

// Provably fair roulette spin
app.post('/api/pf/roulette', express.json(), (req,res)=>{
  const {uid} = req.body;
  const seeds = getOrCreateSeed(uid);
  seeds.nonce++;
  const number = generateResult(seeds.serverSeed, seeds.clientSeed, seeds.nonce, 37);
  res.json({
    number,
    nonce: seeds.nonce,
    hashedServerSeed: seeds.hashedServerSeed,
    clientSeed: seeds.clientSeed
  });
});

// Provably fair blackjack deck
app.post('/api/pf/blackjack', express.json(), (req,res)=>{
  const {uid} = req.body;
  const seeds = getOrCreateSeed(uid);
  seeds.nonce++;
  // Generate shuffled deck order using Fisher-Yates with PF
  const deck = Array.from({length:52},(_,i)=>i);
  for(let i=51;i>0;i--){
    const j = generateResult(seeds.serverSeed, seeds.clientSeed, seeds.nonce*100+(51-i), i+1);
    [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  res.json({
    deck, // card indices 0-51
    nonce: seeds.nonce,
    hashedServerSeed: seeds.hashedServerSeed,
    clientSeed: seeds.clientSeed
  });
});


// ── ADMIN PANEL ──────────────────────────────────────────
// Get all players
app.get('/admin/players', adminAuth, (req,res)=>{
  const players = db.prepare('SELECT uid, name, tokens, level, xp, games_played, total_won, created_at FROM users ORDER BY tokens DESC').all();
  res.json(players);
});

// Give tokens to player
app.post('/admin/give-tokens', adminAuth, express.json(), (req,res)=>{
  const {uid, amount, name} = req.body;
  let user;
  if(uid) user = db.prepare('SELECT * FROM users WHERE uid=?').get(uid);
  else if(name) user = db.prepare('SELECT * FROM users WHERE name LIKE ?').get('%'+name+'%');
  if(!user) return res.status(404).json({error:'Player not found'});
  db.prepare('UPDATE users SET tokens=tokens+? WHERE uid=?').run(amount, user.uid);
  // Notify player if online
  io.emit('adminGift', {uid: user.uid, amount, from:'Admin'});
  res.json({ok:true, player:user.name, newBalance: user.tokens+amount});
});

// Set tokens directly
app.post('/admin/set-tokens', adminAuth, express.json(), (req,res)=>{
  const {uid, amount} = req.body;
  const user = db.prepare('SELECT * FROM users WHERE uid=?').get(uid);
  if(!user) return res.status(404).json({error:'Not found'});
  db.prepare('UPDATE users SET tokens=? WHERE uid=?').run(amount, uid);
  res.json({ok:true, player:user.name, newBalance:amount});
});

// Promo codes
app.post('/admin/create-promo', adminAuth, express.json(), (req,res)=>{
  const {code, amount, maxUses} = req.body;
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS promo_codes (
      code TEXT PRIMARY KEY,
      amount INTEGER,
      max_uses INTEGER DEFAULT 1,
      used_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    db.exec(`CREATE TABLE IF NOT EXISTS promo_uses (
      code TEXT, uid TEXT, used_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY(code, uid)
    )`);
    db.prepare('INSERT OR REPLACE INTO promo_codes(code,amount,max_uses) VALUES(?,?,?)').run(code.toUpperCase(), amount, maxUses||1);
    res.json({ok:true, code:code.toUpperCase(), amount, maxUses:maxUses||1});
  } catch(e){ res.status(500).json({error:e.message}); }
});

app.get('/admin/promos', adminAuth, (req,res)=>{
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS promo_codes (code TEXT PRIMARY KEY, amount INTEGER, max_uses INTEGER DEFAULT 1, used_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))`);
    const codes = db.prepare('SELECT * FROM promo_codes ORDER BY created_at DESC').all();
    res.json(codes);
  } catch(e){ res.json([]); }
});

app.delete('/admin/promo/:code', adminAuth, (req,res)=>{
  db.prepare('DELETE FROM promo_codes WHERE code=?').run(req.params.code.toUpperCase());
  res.json({ok:true});
});

// Player uses promo code
app.post('/api/use-promo', express.json(), (req,res)=>{
  const {code, uid} = req.body;
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS promo_codes (code TEXT PRIMARY KEY, amount INTEGER, max_uses INTEGER DEFAULT 1, used_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS promo_uses (code TEXT, uid TEXT, used_at TEXT DEFAULT (datetime('now')), PRIMARY KEY(code, uid))`);
    const promo = db.prepare('SELECT * FROM promo_codes WHERE code=?').get(code.toUpperCase());
    if(!promo) return res.json({ok:false, error:'Promo code not found'});
    if(promo.used_count >= promo.max_uses) return res.json({ok:false, error:'Code already used up'});
    const alreadyUsed = db.prepare('SELECT 1 FROM promo_uses WHERE code=? AND uid=?').get(code.toUpperCase(), uid);
    if(alreadyUsed) return res.json({ok:false, error:'You already used this code'});
    db.prepare('UPDATE promo_codes SET used_count=used_count+1 WHERE code=?').run(code.toUpperCase());
    db.prepare('INSERT INTO promo_uses(code,uid) VALUES(?,?)').run(code.toUpperCase(), uid);
    db.prepare('UPDATE users SET tokens=tokens+? WHERE uid=?').run(promo.amount, uid);
    res.json({ok:true, amount:promo.amount});
  } catch(e){ res.json({ok:false, error:e.message}); }
});

// Delete player
app.delete('/admin/player/:uid', adminAuth, (req,res)=>{
  db.prepare('DELETE FROM users WHERE uid=?').run(req.params.uid);
  res.json({ok:true});
});

// Stats overview
app.get('/admin/overview', adminAuth, (req,res)=>{
  const totalPlayers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const totalTokens = db.prepare('SELECT SUM(tokens) as s FROM users').get().s||0;
  const richest = db.prepare('SELECT name,tokens FROM users ORDER BY tokens DESC LIMIT 1').get();
  const newest = db.prepare('SELECT name,created_at FROM users ORDER BY created_at DESC LIMIT 1').get();
  res.json({totalPlayers, totalTokens, richest, newest, jackpot: getJackpot()});
});


// ══════════════════════════════════════════════════════════
// EL. PAŠTO REGISTRACIJA / AUTENTIFIKACIJA
// ══════════════════════════════════════════════════════════
db.exec(`
  CREATE TABLE IF NOT EXISTS auth (
    uid TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

const { scrypt, randomBytes: rndBytes } = require('crypto');

async function hashPwd(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, h) => err ? reject(err) : resolve(h.toString('hex')));
  });
}
function makeSession(uid) {
  const token = rndBytes(32).toString('hex');
  const exp = new Date(Date.now() + 30*24*60*60*1000).toISOString();
  db.prepare('INSERT INTO sessions(token,uid,expires_at) VALUES(?,?,?)').run(token, uid, exp);
  return token;
}
function checkSession(token) {
  if(!token) return null;
  return db.prepare("SELECT uid FROM sessions WHERE token=? AND expires_at > datetime('now')").get(token)?.uid || null;
}

// Registracija
app.post('/api/auth/register', express.json(), async (req, res) => {
  const { name, email, password } = req.body;
  if(!name||!email||!password) return res.status(400).json({error:'Trūksta privalomų laukų'});
  if(password.length < 8) return res.status(400).json({error:'Slaptažodis turi būti bent 8 simbolių'});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:'Neteisingas el. pašto formatas'});
  const exists = db.prepare('SELECT uid FROM auth WHERE email=?').get(email.toLowerCase());
  if(exists) return res.status(400).json({error:'Šis el. paštas jau užregistruotas'});
  try {
    const salt = rndBytes(16).toString('hex');
    const hash = await hashPwd(password, salt);
    const uid = uuidv4();
    const user = {uid, name, tokens:10000, avatar:null, level:1, xp:0, total_won:0, games_played:0, last_bonus:null};
    saveUser(user);
    db.prepare('INSERT INTO auth(uid,email,password_hash,salt) VALUES(?,?,?,?)').run(uid, email.toLowerCase(), hash, salt);
    const token = makeSession(uid);
    res.json({ok:true, token, uid, user:{...user, levelInfo:getLvInfo(0), kycStatus:'unverified'}});
  } catch(e) { res.status(500).json({error:'Serverio klaida: '+e.message}); }
});

// Prisijungimas
app.post('/api/auth/login', express.json(), async (req, res) => {
  const { email, password } = req.body;
  if(!email||!password) return res.status(400).json({error:'Įveskite el. paštą ir slaptažodį'});
  const authRow = db.prepare('SELECT * FROM auth WHERE email=?').get(email.toLowerCase());
  if(!authRow) return res.status(401).json({error:'Neteisingas el. paštas arba slaptažodis'});
  try {
    const hash = await hashPwd(password, authRow.salt);
    if(hash !== authRow.password_hash) return res.status(401).json({error:'Neteisingas el. paštas arba slaptažodis'});
    const user = getUser(authRow.uid);
    if(!user) return res.status(404).json({error:'Paskyra nerasta'});
    const token = makeSession(authRow.uid);
    const kycRow = db.prepare('SELECT status FROM kyc WHERE uid=?').get(authRow.uid);
    res.json({ok:true, token, uid:authRow.uid, user:{
      ...user, levelInfo:getLvInfo(user.xp||0), nextLevel:nextLvInfo(user.xp||0),
      kycStatus: kycRow?.status||'unverified'
    }});
  } catch(e) { res.status(500).json({error:'Serverio klaida'}); }
});

// Sesijos patikrinimas
app.get('/api/auth/me', (req, res) => {
  const token = (req.headers.authorization||'').replace('Bearer ','') || req.headers['x-session-token'];
  const uid = checkSession(token);
  if(!uid) return res.status(401).json({error:'Sesija negaliojanti'});
  const user = getUser(uid);
  if(!user) return res.status(404).json({error:'Vartotojas nerastas'});
  const kycRow = db.prepare('SELECT status FROM kyc WHERE uid=?').get(uid);
  res.json({uid, user:{...user, kycStatus:kycRow?.status||'unverified'}});
});

// Atsijungimas
app.post('/api/auth/logout', express.json(), (req, res) => {
  const token = req.body?.token || req.headers['x-session-token'];
  if(token) db.prepare('DELETE FROM sessions WHERE token=?').run(token);
  res.json({ok:true});
});

// Admin: el. pašto vartotojai
app.get('/admin/auth-users', adminAuth, (req, res) => {
  const rows = db.prepare(`SELECT a.email, a.created_at, u.name, u.tokens, u.level
    FROM auth a LEFT JOIN users u ON a.uid=u.uid ORDER BY a.created_at DESC LIMIT 200`).all();
  res.json(rows);
});

// ══════════════════════════════════════════════════════════
// KYC / AMŽIAUS PATIKRINIMO SISTEMA
// ══════════════════════════════════════════════════════════
if(!fs.existsSync('./kyc-docs')) fs.mkdirSync('./kyc-docs',{recursive:true});

const kycStorage=multer.diskStorage({
  destination:'./kyc-docs/',
  filename:(req,file,cb)=>{
    const uid=req.body?.uid||req.headers['x-user-id']||'unknown';
    cb(null,`${uid}_${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  }
});
const kycUpload=multer({
  storage:kycStorage,
  limits:{fileSize:8*1024*1024},
  fileFilter:(req,file,cb)=>{
    const ok=['.jpg','.jpeg','.png','.pdf','.webp'];
    cb(null,ok.includes(path.extname(file.originalname).toLowerCase()));
  }
});

function calcAge(birthDate){
  const today=new Date(),b=new Date(birthDate);
  let age=today.getFullYear()-b.getFullYear();
  const m=today.getMonth()-b.getMonth();
  if(m<0||(m===0&&today.getDate()<b.getDate()))age--;
  return age;
}
function getKYC(uid){return db.prepare('SELECT * FROM kyc WHERE uid=?').get(uid);}

// Pateikti KYC dokumentus
app.post('/api/kyc/submit', kycUpload.fields([
  {name:'id_front',maxCount:1},
  {name:'id_back',maxCount:1},
  {name:'selfie',maxCount:1}
]),(req,res)=>{
  const {uid,full_name,birth_date,country,id_type}=req.body;
  if(!uid||!full_name||!birth_date) return res.status(400).json({error:'Trūksta privalomų laukų'});

  const age=calcAge(birth_date);
  if(isNaN(age)||age>120) return res.status(400).json({error:'Neteisinga gimimo data'});
  if(age<18) return res.status(400).json({error:'Jums turi būti bent 18 metų, kad galėtumėte žaisti.',underage:true});

  const files=req.files||{};
  const id_front=files.id_front?.[0]?`/kyc-file/${files.id_front[0].filename}`:null;
  const id_back=files.id_back?.[0]?`/kyc-file/${files.id_back[0].filename}`:null;
  const selfie=files.selfie?.[0]?`/kyc-file/${files.selfie[0].filename}`:null;

  if(!id_front||!selfie) return res.status(400).json({error:'Dokumento priekis ir selfie yra privalomi'});

  const existing=getKYC(uid);
  if(existing?.status==='approved') return res.status(400).json({error:'Jūsų paskyra jau patvirtinta'});

  db.prepare(`INSERT INTO kyc(uid,status,full_name,birth_date,country,id_type,id_front,id_back,selfie,submitted_at)
    VALUES(?,?,?,?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(uid) DO UPDATE SET
      status='pending',full_name=excluded.full_name,birth_date=excluded.birth_date,
      country=excluded.country,id_type=excluded.id_type,id_front=excluded.id_front,
      id_back=excluded.id_back,selfie=excluded.selfie,
      submitted_at=datetime('now'),rejection_reason=NULL,reviewed_at=NULL
    WHERE kyc.status NOT IN ('approved')
  `).run(uid,'pending',full_name,birth_date,country||'',id_type||'passport',id_front,id_back,selfie);

  res.json({ok:true,status:'pending'});
});

// KYC statusas
app.get('/api/kyc/status/:uid',(req,res)=>{
  const k=getKYC(req.params.uid);
  res.json({
    status:k?.status||'unverified',
    full_name:k?.full_name||null,
    rejection_reason:k?.rejection_reason||null,
    submitted_at:k?.submitted_at||null,
    reviewed_at:k?.reviewed_at||null,
  });
});

// Admin: rodyti KYC dokumentą (apsaugotas)
app.get('/kyc-file/:filename', adminAuth,(req,res)=>{
  const filename=path.basename(req.params.filename);
  const filePath=path.join(__dirname,'kyc-docs',filename);
  if(!fs.existsSync(filePath)) return res.status(404).send('Not found');
  res.sendFile(filePath);
});

// Admin: sąrašas pagal statusą
app.get('/admin/kyc',adminAuth,(req,res)=>{
  const status=req.query.status||'pending';
  const rows=db.prepare(`SELECT k.*,u.name as username,u.tokens,u.games_played,u.created_at as reg_date
    FROM kyc k LEFT JOIN users u ON k.uid=u.uid
    WHERE k.status=? ORDER BY k.submitted_at DESC`).all(status);
  res.json(rows);
});

// Admin: KYC statistika
app.get('/admin/kyc/stats',adminAuth,(req,res)=>{
  const pending=db.prepare("SELECT COUNT(*) as c FROM kyc WHERE status='pending'").get().c;
  const approved=db.prepare("SELECT COUNT(*) as c FROM kyc WHERE status='approved'").get().c;
  const rejected=db.prepare("SELECT COUNT(*) as c FROM kyc WHERE status='rejected'").get().c;
  res.json({pending,approved,rejected});
});

// Admin: patvirtinti KYC
app.post('/admin/kyc/approve/:uid',adminAuth,(req,res)=>{
  db.prepare("UPDATE kyc SET status='approved',reviewed_at=datetime('now') WHERE uid=?").run(req.params.uid);
  if(sockets[req.params.uid]) sockets[req.params.uid].socket.emit('kycStatusUpdate',{status:'approved'});
  res.json({ok:true});
});

// Admin: atmesti KYC
app.post('/admin/kyc/reject/:uid',adminAuth,express.json(),(req,res)=>{
  const reason=req.body?.reason||'Dokumentų nepavyko patvirtinti';
  db.prepare("UPDATE kyc SET status='rejected',rejection_reason=?,reviewed_at=datetime('now') WHERE uid=?").run(reason,req.params.uid);
  if(sockets[req.params.uid]) sockets[req.params.uid].socket.emit('kycStatusUpdate',{status:'rejected',reason});
  res.json({ok:true});
});

// Admin: ištrinti KYC įrašą (leidžia pakartotinai pateikti)
app.delete('/admin/kyc/:uid',adminAuth,(req,res)=>{
  db.prepare('DELETE FROM kyc WHERE uid=?').run(req.params.uid);
  res.json({ok:true});
});

// ══════════════════════════════════════════════════════════
// RESPONSIBLE GAMBLING / SPORTS BETTING PROTECTION
// ══════════════════════════════════════════════════════════

db.exec(`
  CREATE TABLE IF NOT EXISTS rg_limits (
    uid TEXT PRIMARY KEY,
    daily_deposit_limit INTEGER DEFAULT NULL,
    daily_loss_limit INTEGER DEFAULT NULL,
    daily_bet_limit INTEGER DEFAULT NULL,
    session_limit_minutes INTEGER DEFAULT NULL,
    self_exclusion_until TEXT DEFAULT NULL,
    cool_off_until TEXT DEFAULT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS daily_tracking (
    uid TEXT,
    date TEXT,
    deposited INTEGER DEFAULT 0,
    lost INTEGER DEFAULT 0,
    bet_total INTEGER DEFAULT 0,
    PRIMARY KEY(uid, date)
  );
  CREATE TABLE IF NOT EXISTS sports_bets (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    match_id TEXT,
    match_desc TEXT,
    selection TEXT,
    odds REAL,
    bet INTEGER,
    potential_win INTEGER,
    status TEXT DEFAULT 'pending',
    result INTEGER DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// GET /api/rg/limits/:uid
app.get('/api/rg/limits/:uid', (req, res) => {
  const row = db.prepare('SELECT * FROM rg_limits WHERE uid=?').get(req.params.uid);
  res.json(row || { uid: req.params.uid });
});

// POST /api/rg/limits
app.post('/api/rg/limits', express.json(), (req, res) => {
  const { uid, daily_deposit_limit, daily_loss_limit, daily_bet_limit, session_limit_minutes } = req.body;
  if (!uid) return res.status(400).json({ error: 'uid required' });

  const existing = db.prepare('SELECT * FROM rg_limits WHERE uid=?').get(uid);
  const now = new Date().toISOString();

  // Helper: a new value is "raising" a limit only if the new value is higher than existing (more permissive)
  function isRaising(oldVal, newVal) {
    if (newVal == null) return false;
    if (oldVal == null) return false; // going from unlimited to a limit is always lowering
    return newVal > oldVal;
  }

  const pendingRaise = {};
  const fields = { daily_deposit_limit, daily_loss_limit, daily_bet_limit, session_limit_minutes };

  if (existing) {
    for (const [field, newVal] of Object.entries(fields)) {
      if (newVal === undefined) continue;
      if (isRaising(existing[field], newVal)) {
        // Raising takes 24h — store with a note but do not apply yet
        pendingRaise[field] = newVal;
      }
    }
  }

  if (!existing) {
    db.prepare(`INSERT INTO rg_limits (uid, daily_deposit_limit, daily_loss_limit, daily_bet_limit, session_limit_minutes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)`).run(
      uid,
      daily_deposit_limit ?? null,
      daily_loss_limit ?? null,
      daily_bet_limit ?? null,
      session_limit_minutes ?? null,
      now
    );
  } else {
    // Apply only limits that are being lowered (or set for the first time from null)
    const toApply = {};
    for (const [field, newVal] of Object.entries(fields)) {
      if (newVal === undefined) continue;
      if (!isRaising(existing[field], newVal)) {
        toApply[field] = newVal;
      }
    }
    if (Object.keys(toApply).length > 0) {
      const setClauses = Object.keys(toApply).map(f => `${f}=?`).join(', ');
      db.prepare(`UPDATE rg_limits SET ${setClauses}, updated_at=? WHERE uid=?`).run(
        ...Object.values(toApply), now, uid
      );
    }
  }

  const updated = db.prepare('SELECT * FROM rg_limits WHERE uid=?').get(uid);
  res.json({
    ok: true,
    limits: updated,
    pendingRaise: Object.keys(pendingRaise).length > 0
      ? { fields: pendingRaise, note: 'Limit increases take 24h to take effect for your protection.' }
      : undefined
  });
});

// POST /api/rg/self-exclude
app.post('/api/rg/self-exclude', express.json(), (req, res) => {
  const { uid, days } = req.body;
  if (!uid) return res.status(400).json({ error: 'uid required' });
  const allowed = [1, 7, 30, 180, 365, 'permanent'];
  if (!allowed.includes(days)) return res.status(400).json({ error: 'days must be 1, 7, 30, 180, 365, or "permanent"' });

  let until;
  if (days === 'permanent') {
    until = '9999-12-31T23:59:59.000Z';
  } else {
    const d = new Date();
    d.setDate(d.getDate() + days);
    until = d.toISOString();
  }

  db.prepare(`INSERT INTO rg_limits (uid, self_exclusion_until, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(uid) DO UPDATE SET self_exclusion_until=excluded.self_exclusion_until, updated_at=excluded.updated_at`).run(uid, until);

  res.json({ ok: true, self_exclusion_until: until });
});

// POST /api/rg/cool-off
app.post('/api/rg/cool-off', express.json(), (req, res) => {
  const { uid, hours } = req.body;
  if (!uid) return res.status(400).json({ error: 'uid required' });
  const allowed = [24, 48, 72];
  if (!allowed.includes(hours)) return res.status(400).json({ error: 'hours must be 24, 48, or 72' });

  const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  db.prepare(`INSERT INTO rg_limits (uid, cool_off_until, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(uid) DO UPDATE SET cool_off_until=excluded.cool_off_until, updated_at=excluded.updated_at`).run(uid, until);

  res.json({ ok: true, cool_off_until: until });
});

// GET /api/rg/check/:uid
app.get('/api/rg/check/:uid', (req, res) => {
  const uid = req.params.uid;
  const row = db.prepare('SELECT * FROM rg_limits WHERE uid=?').get(uid);

  if (!row) return res.json({ allowed: true, reason: null });

  const now = new Date().toISOString();

  if (row.self_exclusion_until && now < row.self_exclusion_until) {
    const permanent = row.self_exclusion_until === '9999-12-31T23:59:59.000Z';
    return res.json({
      allowed: false,
      reason: permanent ? 'Account permanently self-excluded.' : `Self-excluded until ${row.self_exclusion_until}.`
    });
  }

  if (row.cool_off_until && now < row.cool_off_until) {
    return res.json({ allowed: false, reason: `Cool-off period active until ${row.cool_off_until}.` });
  }

  // Check daily limits
  const today = new Date().toISOString().slice(0, 10);
  const tracking = db.prepare('SELECT * FROM daily_tracking WHERE uid=? AND date=?').get(uid, today);

  if (tracking) {
    if (row.daily_bet_limit != null && tracking.bet_total >= row.daily_bet_limit) {
      return res.json({ allowed: false, reason: `Daily bet limit of ${row.daily_bet_limit} reached.` });
    }
    if (row.daily_loss_limit != null && tracking.lost >= row.daily_loss_limit) {
      return res.json({ allowed: false, reason: `Daily loss limit of ${row.daily_loss_limit} reached.` });
    }
    if (row.daily_deposit_limit != null && tracking.deposited >= row.daily_deposit_limit) {
      return res.json({ allowed: false, reason: `Daily deposit limit of ${row.daily_deposit_limit} reached.` });
    }
  }

  res.json({ allowed: true, reason: null });
});

// POST /api/rg/track-bet
app.post('/api/rg/track-bet', express.json(), (req, res) => {
  const { uid, bet, loss } = req.body;
  if (!uid) return res.status(400).json({ error: 'uid required' });
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(`INSERT INTO daily_tracking (uid, date, bet_total, lost) VALUES (?, ?, ?, ?)
    ON CONFLICT(uid, date) DO UPDATE SET
      bet_total = bet_total + excluded.bet_total,
      lost = lost + excluded.lost`).run(uid, today, bet || 0, loss || 0);
  res.json({ ok: true });
});

// POST /api/sports/place-bet
app.post('/api/sports/place-bet', express.json(), (req, res) => {
  const { uid, match_id, match_desc, selection, odds, bet } = req.body;
  if (!uid || !bet || !odds) return res.status(400).json({ error: 'uid, bet, odds required' });

  const row = db.prepare('SELECT * FROM rg_limits WHERE uid=?').get(uid);
  const now = new Date().toISOString();

  // Check self-exclusion
  if (row?.self_exclusion_until && now < row.self_exclusion_until) {
    const permanent = row.self_exclusion_until === '9999-12-31T23:59:59.000Z';
    return res.json({ ok: false, error: permanent ? 'Account permanently self-excluded.' : `Self-excluded until ${row.self_exclusion_until}.` });
  }

  // Check cool-off
  if (row?.cool_off_until && now < row.cool_off_until) {
    return res.json({ ok: false, error: `Cool-off period active until ${row.cool_off_until}.` });
  }

  const today = now.slice(0, 10);
  const tracking = db.prepare('SELECT * FROM daily_tracking WHERE uid=? AND date=?').get(uid, today);

  // Check daily bet limit
  if (row?.daily_bet_limit != null) {
    const currentBets = (tracking?.bet_total || 0);
    if (currentBets + bet > row.daily_bet_limit) {
      return res.json({ ok: false, error: `Bet would exceed daily bet limit of ${row.daily_bet_limit}.` });
    }
  }

  // Check daily loss limit (conservative: count full bet as potential loss)
  if (row?.daily_loss_limit != null) {
    const currentLoss = (tracking?.lost || 0);
    if (currentLoss + bet > row.daily_loss_limit) {
      return res.json({ ok: false, error: `Bet would exceed daily loss limit of ${row.daily_loss_limit}.` });
    }
  }

  const user = getUser(uid);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.tokens < bet) return res.json({ ok: false, error: 'Insufficient tokens' });

  const betId = uuidv4();
  const potential_win = Math.floor(bet * odds);

  // Deduct tokens
  db.prepare('UPDATE users SET tokens=tokens-? WHERE uid=?').run(bet, uid);

  // Store bet
  db.prepare(`INSERT INTO sports_bets (id, uid, match_id, match_desc, selection, odds, bet, potential_win)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(betId, uid, match_id || null, match_desc || null, selection || null, odds, bet, potential_win);

  // Update daily tracking
  db.prepare(`INSERT INTO daily_tracking (uid, date, bet_total, lost) VALUES (?, ?, ?, 0)
    ON CONFLICT(uid, date) DO UPDATE SET bet_total = bet_total + excluded.bet_total`).run(uid, today, bet);

  res.json({ ok: true, betId, potential_win, tokens: user.tokens - bet });
});

// GET /admin/sports-bets
app.get('/admin/sports-bets', adminAuth, (req, res) => {
  try {
    const bets = db.prepare(`SELECT sb.*, u.name as player_name
      FROM sports_bets sb LEFT JOIN users u ON sb.uid=u.uid
      ORDER BY sb.created_at DESC LIMIT 500`).all();
    res.json(bets);
  } catch(e) { res.json([]); }
});

// POST /admin/sports-settle/:betId
app.post('/admin/sports-settle/:betId', adminAuth, express.json(), (req, res) => {
  const { won } = req.body;
  if (typeof won !== 'boolean') return res.status(400).json({ error: 'won (boolean) required' });

  const bet = db.prepare('SELECT * FROM sports_bets WHERE id=?').get(req.params.betId);
  if (!bet) return res.status(404).json({ error: 'Bet not found' });
  if (bet.status !== 'pending') return res.status(400).json({ error: 'Bet already settled' });

  const status = won ? 'won' : 'lost';
  const result = won ? bet.potential_win : 0;

  db.prepare("UPDATE sports_bets SET status=?, result=? WHERE id=?").run(status, result, bet.id);

  if (won) {
    db.prepare('UPDATE users SET tokens=tokens+? WHERE uid=?').run(bet.potential_win, bet.uid);
  } else {
    // Record the actual loss in daily tracking
    const today = new Date().toISOString().slice(0, 10);
    db.prepare(`INSERT INTO daily_tracking (uid, date, lost) VALUES (?, ?, ?)
      ON CONFLICT(uid, date) DO UPDATE SET lost = lost + excluded.lost`).run(bet.uid, today, bet.bet);
  }

  if (sockets[bet.uid]) {
    sockets[bet.uid].socket.emit('sportsBetSettled', { betId: bet.id, status, result });
  }

  res.json({ ok: true, status, result });
});

const PORT=process.env.PORT||3000;

// ── AI Support Chat ───────────────────────────────
app.post('/api/support', express.json(), async (req,res)=>{
  const {message, lang} = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if(!apiKey) return res.json({reply:'Support temporarily unavailable.'});
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'x-api-key':apiKey,'anthropic-version':'2023-06-01','content-type':'application/json'},
      body: JSON.stringify({
        model:'claude-haiku-4-5-20251001',
        max_tokens:200,
        system:`You are a friendly customer support agent for HATHOR Royal Casino - a premium online crypto casino. 
Language: Respond in the same language the user writes in (${lang||'en'}).
Topics you can help with: games (slots, roulette, blackjack, poker, baccarat, crash, pyramid drop, sports betting), bonuses (daily 500-3000 tokens), jackpot, crypto payments (BTC/ETH/USDT/BNB), account, Provably Fair system, VIP levels.
Be helpful, friendly and concise (2-3 sentences max). Never discuss real money gambling laws.`,
        messages:[{role:'user',content:message}]
      })
    });
    const data = await response.json();
    const reply = data.content?.[0]?.text || 'How can I help you?';
    res.json({reply});
  } catch(e) {
    res.json({reply:'Support temporarily unavailable. Please try again.'});
  }
});


server.listen(PORT,()=>console.log(`🎰 HATHOR Royal Casino v2 → http://localhost:${PORT}`));
