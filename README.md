# 🎰 HATHOR Casino — Multiplayer Poker

Texas Hold'em Poker with virtual tokens. Real-time multiplayer.

## 🚀 Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Start server
npm start

# 3. Open browser
# http://localhost:3000
```

## 📁 Project Structure

```
poker-casino/
├── server.js          # Backend (Express + Socket.io + Poker logic)
├── package.json
└── public/
    └── index.html     # Frontend (React, all-in-one)
```

## ☁️ Deploy to Railway (Free)

1. Create account at railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Upload this folder to GitHub first, or use Railway CLI:

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Done! Railway gives you a public URL.

## ☁️ Deploy to Render (Free)

1. Go to render.com → New Web Service
2. Connect GitHub repo
3. Build command: `npm install`
4. Start command: `node server.js`
5. Free tier = enough for testing

## 🎮 How to Play

1. Open the URL in browser
2. Enter your name → you get 10,000 virtual tokens
3. Create a table or join with a room code
4. Share the 6-letter room code with friends
5. Host clicks "Start Game" when ready

## ♠ Poker Rules (Texas Hold'em)

- Each player gets 2 hole cards
- 3 community cards (Flop) → 1 (Turn) → 1 (River)
- Best 5-card hand from your 2 + 5 community wins
- Actions: Fold, Check, Call, Raise, All In

## 🔧 Configuration

In `server.js` you can change:
- Default starting tokens: `users[id] = { tokens: 10000 }` 
- Max players per table: `this.maxPlayers = 6`
- Blind structure: auto-calculated from buy-in

## 📦 Tech Stack

- **Backend**: Node.js + Express + Socket.io
- **Frontend**: React (CDN) + CSS
- **Real-time**: WebSockets via Socket.io
- **Storage**: In-memory (no database needed for v1)
