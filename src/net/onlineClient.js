// onlineClient.js - multiplayer minimal WebSocket client

function uid() {
  try {
    const a = new Uint32Array(4);
    crypto.getRandomValues(a);
    return Array.from(a).map((n) => n.toString(16).padStart(8, '0')).join('');
  } catch {
    return String(Date.now()) + '_' + Math.random().toString(16).slice(2);
  }
}

export class OnlineClient extends EventTarget {
  constructor() {
    super();
    this.clientId = uid();
    this.connected = false;
    this.playerId = null;
    this.online = 0;
    this.socket = null;

    // remote players snapshot (id -> { id, nickname, x, y, ts })
    this.players = new Map();

    this.maxPlayers = 50;
  }

  getPlayerCount() {
    return this.online || 0;
  }

  getMaxPlayers() {
    return this.maxPlayers;
  }

  isConnected() {
    return this.connected;
  }

  getOnline() {
    return this.online || 0;
  }

  async connect({ url, nickname } = {}) {
    const isLocalHost =
      location.hostname === 'localhost' || location.hostname === '127.0.0.1';

    // ✅ url이 없으면 환경에 맞게 자동 선택
    if (!url) {
      url = isLocalHost ? 'ws://localhost:8080' : 'wss://diceland.onrender.com';
    }

    // ✅ 배포 환경인데 실수로 localhost가 들어오면 Render로 강제 교정
    if (!isLocalHost && typeof url === 'string' && url.includes('localhost:8080')) {
      url = 'wss://diceland.onrender.com';
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.socket = new WebSocket(url);

    this.socket.addEventListener('open', () => {
      this.connected = true;
      this.dispatchEvent(new CustomEvent('connected', { detail: { clientId: this.clientId } }));
      if (nickname) {
        this.socket.send(JSON.stringify({ type: 'hello', nickname }));
      }
    });

    this.socket.addEventListener('message', (ev) => {
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (!data || typeof data.type !== 'string') return;

      if (data.type === 'hello') {
        this.playerId = data.playerId || null;
        return;
      }

      if (data.type === 'presence') {
        this.online = Number(data.online) || 0;
        this.dispatchEvent(new CustomEvent('presence', { detail: { online: this.online } }));
        return;
      }

      if (data.type === 'chat') {
        const msg = {
          room: data.room || 'lobby',
          playerId: data.playerId || 'unknown',
          nickname: data.nickname || 'Guest',
          text: data.text || '',
          ts: data.ts || Date.now(),
        };
        this.upsertRemotePlayer({ id: msg.playerId, nickname: msg.nickname });
        this.dispatchEvent(new CustomEvent('chat', { detail: msg }));
      }
    });

    const handleClose = () => {
      this.connected = false;
      this.socket = null;
      this.dispatchEvent(new CustomEvent('disconnected'));
    };

    this.socket.addEventListener('close', handleClose);
    this.socket.addEventListener('error', handleClose);
  }

  disconnect() {
    this.connected = false;
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        /* ignore */
      }
    }
    this.socket = null;
    this.players.clear();
    this.dispatchEvent(new CustomEvent('disconnected'));
  }

  sendChat(text, room = 'lobby', nickname) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    const payload = { type: 'chat', room, text: trimmed };
    if (nickname) payload.nickname = nickname;
    this.socket.send(JSON.stringify(payload));
  }

  upsertRemotePlayer(patch) {
    if (!patch || !patch.id) return;
    const prev = this.players.get(patch.id) || { id: patch.id };
    const next = { ...prev, ...patch, ts: Date.now() };
    this.players.set(patch.id, next);
    this.dispatchEvent(new CustomEvent('player_update', { detail: next }));
  }

  removeRemotePlayer(id) {
    if (!this.players.has(id)) return;
    this.players.delete(id);
    this.dispatchEvent(new CustomEvent('player_remove', { detail: { id } }));
  }

  listPlayers() {
    return Array.from(this.players.values());
  }
}
