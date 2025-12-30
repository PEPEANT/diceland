// server.js - DiceLand lobby WebSocket server (MVP)
// - Assigns playerId
// - Broadcasts presence
// - Broadcasts lobby chat

const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

const server = http.createServer();
const wss = new WebSocketServer({ server });

let nextId = 1;

function broadcast(obj) {
  const data = JSON.stringify(obj);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(data);
    }
  });
}

function updatePresence() {
  const online = wss.clients.size;
  broadcast({ type: 'presence', online });
}

wss.on('connection', (ws) => {
  const playerId = `p${nextId++}`;
  ws._playerId = playerId;
  ws._nickname = 'Guest';

  ws.send(JSON.stringify({ type: 'hello', playerId }));
  updatePresence();

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'hello') {
      if (typeof msg.nickname === 'string' && msg.nickname.trim()) {
        ws._nickname = msg.nickname.trim().slice(0, 12);
      }
      return;
    }

    if (msg.type === 'chat') {
      const text = String(msg.text || '').trim();
      if (!text) return;
      if (typeof msg.nickname === 'string' && msg.nickname.trim()) {
        ws._nickname = msg.nickname.trim().slice(0, 12);
      }
      broadcast({
        type: 'chat',
        room: msg.room || 'lobby',
        playerId: ws._playerId,
        nickname: ws._nickname,
        text,
        ts: Date.now(),
      });
    }
  });

  ws.on('close', () => {
    updatePresence();
  });
});

server.listen(PORT, () => {
  console.log(`[DiceLand] WebSocket server listening on ws://localhost:${PORT}`);
});
