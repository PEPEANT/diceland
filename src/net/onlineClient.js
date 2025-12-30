// onlineClient.js - multiplayer minimal WebSocket client
// - chat + presence + roster + state sync (very small MVP)

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

    // remote players snapshot (id -> { id, nickname, x, y, room, ts })
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
    if (!url) return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.socket = new WebSocket(url);

    this.socket.addEventListener('open', () => {
      this.connected = true;
      this.dispatchEvent(new CustomEvent('connected', { detail: { clientId: this.clientId } }));
      this.socket.send(JSON.stringify({ type: 'hello', nickname: nickname || 'Guest' }));
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
        this.playerId = data.playerId || this.playerId || null;
        return;
      }

      if (data.type === 'presence') {
        this.online = Number(data.online) || 0;
        this.dispatchEvent(new CustomEvent('presence', { detail: { online: this.online } }));
        return;
      }

      if (data.type === 'roster') {
        const list = Array.isArray(data.players) ? data.players : [];
        for (const p of list) {
          if (!p || !p.id) continue;
          if (this.playerId && String(p.id) === String(this.playerId)) continue;
          this.upsertRemotePlayer({
            id: String(p.id),
            nickname: p.nickname || 'Guest',
            x: typeof p.x === 'number' ? p.x : undefined,
            y: typeof p.y === 'number' ? p.y : undefined,
            room: p.room || 'lobby',
          });
        }
        this.online = Number(data.online) || this.online || list.length;
        this.dispatchEvent(new CustomEvent('roster', { detail: { players: this.listPlayers() } }));
        return;
      }

      if (data.type === 'player_join' || data.type === 'player_update') {
        const p = data.player || null;
        if (!p || !p.id) return;
        if (this.playerId && String(p.id) === String(this.playerId)) return;
        this.upsertRemotePlayer({
          id: String(p.id),
          nickname: p.nickname || 'Guest',
          x: typeof p.x === 'number' ? p.x : undefined,
          y: typeof p.y === 'number' ? p.y : undefined,
          room: p.room || 'lobby',
        });
        return;
      }

      if (data.type === 'player_leave') {
        const id = data.playerId;
        if (!id) return;
        this.removeRemotePlayer(String(id));
        return;
      }

      if (data.type === 'state') {
        const id = data.playerId;
        if (!id) return;
        if (this.playerId && String(id) === String(this.playerId)) return;
        this.upsertRemotePlayer({
          id: String(id),
          nickname: data.nickname || 'Guest',
          x: typeof data.x === 'number' ? data.x : undefined,
          y: typeof data.y === 'number' ? data.y : undefined,
          room: data.room || 'lobby',
        });
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
        if (msg.playerId && this.playerId && String(msg.playerId) !== String(this.playerId)) {
          this.upsertRemotePlayer({ id: String(msg.playerId), nickname: msg.nickname });
        }
        this.dispatchEvent(new CustomEvent('chat', { detail: msg }));
      }
    });

    const handleClose = () => {
      this.connected = false;
      this.socket = null;
      this.players.clear();
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
      } catch {}
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

  // ✅ position sync
  sendState({ room = 'lobby', x, y } = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    this.socket.send(JSON.stringify({ type: 'state', room, x, y }));
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
