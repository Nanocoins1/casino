const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ─── In-memory stores ───────────────────────────────────
const users = {};   // uid -> { uid, name, tokens, socketId }
const rooms = {};   // roomId -> PokerRoom

// ─── Deck utilities ─────────────────────────────────────
const SUITS  = ['♠', '♥', '♦', '♣'];
const RANKS  = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const VALUES = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };
const RED    = new Set(['♥','♦']);

function createDeck() {
  return SUITS.flatMap(s => RANKS.map(r => ({ suit: s, rank: r, value: VALUES[r], red: RED.has(s) })));
}

function shuffle(arr) {
  const d = [...arr];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// ─── Hand evaluator ─────────────────────────────────────
function evaluateHand(cards) {
  if (cards.length < 5) return { score: 0, name: 'N/A' };

  const vals  = cards.map(c => c.value).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const cnts  = {};
  vals.forEach(v => cnts[v] = (cnts[v] || 0) + 1);
  const groups = Object.entries(cnts).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const counts = groups.map(g => g[1]);

  const isFlush    = suits.every(s => s === suits[0]);
  const uniq       = [...new Set(vals)].sort((a, b) => a - b);
  const isStraight = uniq.length === 5 && (uniq[4] - uniq[0] === 4 || uniq.join() === '2,3,4,5,14');
  const high       = isStraight && uniq.join() === '2,3,4,5,14' ? 5 : vals[0];

  const base = vals.reduce((a, v, i) => a + v * Math.pow(15, 4 - i), 0);

  if (isFlush && isStraight && high === 14) return { score: 9e9,          name: '👑 Royal Flush'     };
  if (isFlush && isStraight)               return { score: 8e9 + high,   name: '🃏 Straight Flush'  };
  if (counts[0] === 4)                     return { score: 7e9 + base,   name: '🎲 Four of a Kind'  };
  if (counts[0] === 3 && counts[1] === 2)  return { score: 6e9 + base,   name: '🏠 Full House'      };
  if (isFlush)                             return { score: 5e9 + base,   name: '♠ Flush'            };
  if (isStraight)                          return { score: 4e9 + high,   name: '➡️ Straight'        };
  if (counts[0] === 3)                     return { score: 3e9 + base,   name: '3️⃣ Three of a Kind' };
  if (counts[0] === 2 && counts[1] === 2)  return { score: 2e9 + base,   name: '👬 Two Pair'        };
  if (counts[0] === 2)                     return { score: 1e9 + base,   name: '👥 One Pair'        };
  return                                          { score: base,          name: '🔢 High Card'       };
}

function bestHandFrom7(hole, community) {
  const all = [...hole, ...community];
  let best = null;
  // C(7,5) = 21 combinations
  for (let i = 0; i < all.length - 1; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const five = all.filter((_, k) => k !== i && k !== j);
      const res  = evaluateHand(five);
      if (!best || res.score > best.score) best = res;
    }
  }
  return best;
}

// ─── Poker Room ──────────────────────────────────────────
class PokerRoom {
  constructor(id, hostId, buyIn = 1000) {
    this.id           = id;
    this.hostId       = hostId;
    this.players      = [];   // { id, name, tokens, bet, cards, folded, allIn, connected }
    this.status       = 'waiting';
    this.phase        = 'waiting';
    this.deck         = [];
    this.community    = [];
    this.pot          = 0;
    this.currentBet   = 0;
    this.actionIndex  = 0;
    this.dealerIndex  = 0;
    this.buyIn        = buyIn;
    this.smallBlind   = Math.max(10, Math.floor(buyIn / 20));
    this.bigBlind     = this.smallBlind * 2;
    this.lastRaiser   = -1;
    this.roundStart   = 0;
  }

  addPlayer(id, name, tokens) {
    if (this.players.length >= 6 || this.players.find(p => p.id === id)) return false;
    this.players.push({ id, name, tokens: Math.min(tokens, this.buyIn * 3), bet: 0, cards: [], folded: false, allIn: false, connected: true, bestHand: null });
    return true;
  }

  removePlayer(id) {
    const idx = this.players.findIndex(p => p.id === id);
    if (idx === -1) return;
    if (this.status === 'waiting') {
      this.players.splice(idx, 1);
    } else {
      this.players[idx].connected = false;
      this.players[idx].folded = true;
    }
  }

  startGame() {
    if (this.players.length < 2) return false;
    this.status = 'playing';
    this.dealerIndex = 0;
    this.newHand();
    return true;
  }

  newHand() {
    this.deck      = shuffle(createDeck());
    this.community = [];
    this.pot       = 0;
    this.currentBet= 0;
    this.phase     = 'preflop';
    this.lastRaiser= -1;

    const active = this.players.filter(p => p.connected && p.tokens > 0);
    if (active.length < 2) { this.status = 'waiting'; return false; }

    this.players.forEach(p => { p.bet = 0; p.cards = []; p.folded = (p.tokens <= 0 || !p.connected); p.allIn = false; p.bestHand = null; });

    // Deal 2 cards
    active.forEach(p => { p.cards = [this.deck.pop(), this.deck.pop()]; });

    // Post blinds
    const sbIdx  = this.indexAfter(this.dealerIndex, 1);
    const bbIdx  = this.indexAfter(this.dealerIndex, 2);
    this.forceBet(sbIdx, this.smallBlind);
    this.forceBet(bbIdx, this.bigBlind);
    this.currentBet = this.bigBlind;
    this.actionIndex = this.indexAfter(bbIdx, 1);
    this.roundStart  = this.actionIndex;
    return true;
  }

  indexAfter(from, steps) {
    let idx = from;
    let found = 0;
    for (let i = 0; i < this.players.length * 2; i++) {
      idx = (idx + 1) % this.players.length;
      if (!this.players[idx].folded) {
        found++;
        if (found === steps) return idx;
      }
    }
    return from;
  }

  forceBet(idx, amount) {
    const p   = this.players[idx];
    const act = Math.min(amount, p.tokens);
    p.tokens -= act;
    p.bet    += act;
    this.pot += act;
    if (p.tokens === 0) p.allIn = true;
  }

  currentPlayer() {
    return this.players[this.actionIndex] || null;
  }

  canCheck(pid) {
    const p = this.players.find(x => x.id === pid);
    return p && p.bet >= this.currentBet;
  }

  action(pid, type, raiseBy = 0) {
    const p = this.players.find(x => x.id === pid);
    if (!p || p.folded || p.allIn) return null;
    if (this.players[this.actionIndex].id !== pid) return null;

    if (type === 'fold') {
      p.folded = true;
    } else if (type === 'check') {
      if (p.bet < this.currentBet) return null; // must call
    } else if (type === 'call') {
      const toCall = this.currentBet - p.bet;
      this.forceBet(this.actionIndex, toCall);
    } else if (type === 'raise') {
      const minRaise = Math.max(this.bigBlind, raiseBy);
      const toCall   = this.currentBet - p.bet;
      const total    = toCall + minRaise;
      this.currentBet += minRaise;
      this.forceBet(this.actionIndex, total);
      this.lastRaiser = this.actionIndex;
      this.roundStart = this.actionIndex;
    } else if (type === 'allin') {
      const remaining = p.tokens;
      if (p.bet + remaining > this.currentBet) {
        this.currentBet = p.bet + remaining;
        this.lastRaiser = this.actionIndex;
      }
      this.forceBet(this.actionIndex, remaining);
    }

    return this.advance();
  }

  advance() {
    // Check single winner (all folded)
    const alive = this.players.filter(x => !x.folded);
    if (alive.length === 1) {
      alive[0].tokens += this.pot;
      const winner = alive[0];
      this.pot = 0;
      setTimeout(() => { this.dealerIndex = this.indexAfter(this.dealerIndex, 1); this.newHand(); }, 4000);
      return { event: 'winner', winner };
    }

    // Find next player to act
    const canAct = this.players.filter(x => !x.folded && !x.allIn);
    const allCalled = canAct.every(x => x.bet === this.currentBet);

    // Check if round is over
    let nextIdx = (this.actionIndex + 1) % this.players.length;
    let loops = 0;
    while (loops < this.players.length) {
      const np = this.players[nextIdx];
      if (!np.folded && !np.allIn) {
        // If everyone has acted and all bets are equal, move to next phase
        if (allCalled && nextIdx === this.roundStart) break;
        if (!allCalled || np.bet < this.currentBet) {
          this.actionIndex = nextIdx;
          return { event: 'next' };
        }
      }
      nextIdx = (nextIdx + 1) % this.players.length;
      loops++;
    }

    return this.nextPhase();
  }

  nextPhase() {
    // Reset for new betting round
    this.players.forEach(p => { p.bet = 0; });
    this.currentBet = 0;
    this.lastRaiser = -1;

    // First active player after dealer
    this.actionIndex = this.indexAfter(this.dealerIndex, 1);
    this.roundStart  = this.actionIndex;

    if (this.phase === 'preflop') {
      this.phase = 'flop';
      this.deck.pop(); // burn
      this.community.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
      return { event: 'phase', phase: 'flop' };

    } else if (this.phase === 'flop') {
      this.phase = 'turn';
      this.deck.pop();
      this.community.push(this.deck.pop());
      return { event: 'phase', phase: 'turn' };

    } else if (this.phase === 'turn') {
      this.phase = 'river';
      this.deck.pop();
      this.community.push(this.deck.pop());
      return { event: 'phase', phase: 'river' };

    } else {
      return this.showdown();
    }
  }

  showdown() {
    this.phase = 'showdown';
    const alive = this.players.filter(p => !p.folded);

    let winner = null;
    let best = -Infinity;
    alive.forEach(p => {
      p.bestHand = bestHandFrom7(p.cards, this.community);
      if (p.bestHand.score > best) { best = p.bestHand.score; winner = p; }
    });

    if (winner) {
      winner.tokens += this.pot;
      this.pot = 0;
    }

    setTimeout(() => {
      this.dealerIndex = this.indexAfter(this.dealerIndex, 1);
      this.newHand();
      this.broadcast();
    }, 5000);

    return { event: 'showdown', winner: winner?.name, hand: winner?.bestHand?.name, players: alive.map(p => ({ name: p.name, cards: p.cards, bestHand: p.bestHand })) };
  }

  broadcast() {
    this.players.forEach(p => {
      const s = getSocket(p.id);
      if (s) s.emit('gameState', this.getState(p.id));
    });
  }

  getState(forId) {
    return {
      roomId:       this.id,
      status:       this.status,
      phase:        this.phase,
      pot:          this.pot,
      currentBet:   this.currentBet,
      community:    this.community,
      actionIndex:  this.actionIndex,
      dealerIndex:  this.dealerIndex,
      smallBlind:   this.smallBlind,
      bigBlind:     this.bigBlind,
      players: this.players.map((p, i) => ({
        id:        p.id,
        name:      p.name,
        tokens:    p.tokens,
        bet:       p.bet,
        folded:    p.folded,
        allIn:     p.allIn,
        connected: p.connected,
        bestHand:  p.bestHand,
        isDealer:  i === this.dealerIndex,
        cards: p.id === forId || this.phase === 'showdown'
          ? p.cards
          : p.cards.map(() => null)
      }))
    };
  }
}

// ─── Helpers ────────────────────────────────────────────
function getSocket(uid) {
  const sid = users[uid]?.socketId;
  return sid ? io.sockets.sockets.get(sid) : null;
}

// ─── Socket.io handlers ──────────────────────────────────
io.on('connection', socket => {

  // Register / Login (no password for demo — just name + stored tokens)
  socket.on('register', ({ name, uid }) => {
    const id = uid || uuidv4();
    if (!users[id]) users[id] = { uid: id, name, tokens: 10000 };
    users[id].socketId = socket.id;
    socket.uid = id;
    socket.emit('registered', { uid: id, name: users[id].name, tokens: users[id].tokens });
  });

  socket.on('createRoom', ({ buyIn }) => {
    const user = users[socket.uid];
    if (!user) return;
    const roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    const room = new PokerRoom(roomId, socket.uid, buyIn || 500);
    room.broadcast = () => room.players.forEach(p => { const s = getSocket(p.id); if (s) s.emit('gameState', room.getState(p.id)); });
    rooms[roomId] = room;
    room.addPlayer(socket.uid, user.name, user.tokens);
    socket.join(roomId);
    socket.roomId = roomId;
    socket.emit('roomCreated', { roomId });
    socket.emit('gameState', room.getState(socket.uid));
  });

  socket.on('joinRoom', ({ roomId }) => {
    const user = users[socket.uid];
    const room = rooms[roomId?.toUpperCase()];
    if (!user) return socket.emit('error', 'Not registered');
    if (!room)  return socket.emit('error', 'Room not found');
    if (room.status !== 'waiting') return socket.emit('error', 'Game already started');
    if (!room.addPlayer(socket.uid, user.name, user.tokens)) return socket.emit('error', 'Table is full');
    socket.join(roomId);
    socket.roomId = roomId.toUpperCase();
    room.broadcast();
  });

  socket.on('startGame', () => {
    const room = rooms[socket.roomId];
    if (!room || room.hostId !== socket.uid) return;
    if (room.startGame()) room.broadcast();
  });

  socket.on('action', ({ type, amount }) => {
    const room = rooms[socket.roomId];
    if (!room || room.status !== 'playing') return;
    const result = room.action(socket.uid, type, amount || 0);
    if (result) {
      room.broadcast();
      if (result.event !== 'next') io.to(socket.roomId).emit('actionResult', result);
    }
  });

  socket.on('disconnect', () => {
    const room = rooms[socket.roomId];
    if (room) {
      room.removePlayer(socket.uid);
      room.broadcast();
    }
  });

  // List open rooms
  socket.on('getRooms', () => {
    const list = Object.values(rooms)
      .filter(r => r.status === 'waiting')
      .map(r => ({ id: r.id, host: users[r.hostId]?.name, players: r.players.length, buyIn: r.buyIn }));
    socket.emit('roomList', list);
  });
});

// ─── Start ───────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🎰 HATHOR Casino running → http://localhost:${PORT}`));
