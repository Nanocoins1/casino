const express = require('express');
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
const db = new Database('./casino.db');
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
`);
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
    socket.emit('registered',{uid:id,name:u.name,tokens:u.tokens,avatar:u.avatar,level:u.level,xp:u.xp,levelInfo:lvInfo,nextLevel:nextLv});
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
    const u=getUser(socket.uid);if(!u)return;u.tokens=Math.max(0,tokens);saveUser(u);
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

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`🎰 HATHOR Royal Casino v2 → http://localhost:${PORT}`));
