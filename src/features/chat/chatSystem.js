// chatSystem.js - global chat panel (left-bottom), persistent across scenes

import { getNickname } from '../profile/profileStore.js';
import { bubbleSay } from '../../core/bubbles.js';
import { getIpLikeFromId } from '../../core/netIdentity.js';

export class ChatSystem {
    constructor() {
        this.sceneManager = null;
        this.input = null;
        this.app = null;
        this.onlineClient = null;

        this.panel = null;
        this.logEl = null;
        this.inputEl = null;
        this.sendBtn = null;
        this.clearBtn = null;

        this.messages = [];
        this.maxMessages = 80;

        this._boundSend = () => this._handleSend();
        this._boundKey = (e) => this._handleKey(e);
    }

    init({ sceneManager, input, app, onlineClient } = {}) {
        this.sceneManager = sceneManager;
        this.input = input;
        this.app = app;
        this.onlineClient = onlineClient;

        this.panel = document.getElementById('global-chat');
        this.logEl = document.getElementById('global-chat-log');
        this.inputEl = document.getElementById('global-chat-input');
        this.sendBtn = document.getElementById('global-chat-send');
        this.clearBtn = document.getElementById('global-chat-clear');

        this._bindEvents();

        // incoming chat from server
        if (this.onlineClient) {
            this.onlineClient.addEventListener('chat', (ev) => {
                const msg = ev?.detail;
                if (!msg) return;

                // ✅ 내가 보낸 메시지가 서버에서 다시 브로드캐스트되면 중복 표시되므로 무시
                if (this.onlineClient?.playerId && msg.playerId === this.onlineClient.playerId) return;

                this.receiveMessage({
                    sender: msg.nickname,
                    senderId: msg.playerId,
                    text: msg.text,
                    room: msg.room || 'lobby',
                    ts: msg.ts || Date.now(),
                });
            });
        }

        return this;
    }

    _bindEvents() {
        this.sendBtn?.addEventListener('click', this._boundSend);
        this.clearBtn?.addEventListener('click', () => this._clear());
        this.inputEl?.addEventListener('keydown', this._boundKey);
    }

    _handleKey(e) {
        if (!e) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            this._handleSend();
        }
    }

    _handleSend() {
        if (!this.inputEl) return;
        const trimmed = String(this.inputEl.value || '').trim();
        if (!trimmed) return;

        // ✅ 로컬 UI에는 즉시 출력하고, (연결되어 있으면) sendLocal 내부에서 서버로도 전송
        this.sendLocal(trimmed);

        this.inputEl.value = '';
        this.inputEl.focus();
    }

    _clear() {
        this.messages = [];
        this._render();
    }

    receiveMessage({ sender, senderId, text, room = 'lobby', ts = Date.now() } = {}) {
        const senderLabel = senderId ? `${sender || 'Guest'} (${getIpLikeFromId(senderId)})` : (sender || 'Guest');
        const msg = {
            sender: sender || 'Guest',
            senderId: senderId || null,
            senderLabel,
            text: String(text || ''),
            room,
            ts,
        };
        this._pushMessage(msg);
        this._render();
    }

    sendLocal(text) {
        const trimmed = String(text || '').trim();
        if (!trimmed) return;

        const message = {
            sender: getNickname() || 'Guest',
            senderId: this.onlineClient?.playerId || null,
            senderLabel: this.onlineClient?.playerId
                ? `${getNickname() || 'Guest'} (${getIpLikeFromId(this.onlineClient.playerId)})`
                : (getNickname() || 'Guest'),
            text: trimmed,
            room: 'lobby',
            ts: Date.now(),
        };

        // commands
        if (trimmed === '@초기화') {
            this._pushMessage({
                ...message,
                text: '[시스템] 채팅 로그 초기화',
            });
            this._render();
            return;
        }

        this._pushMessage(message);
        this._render();

        // bubble say (current player)
        this._sayCurrentPlayer(trimmed);

        // ✅ 온라인 연결되어 있으면 서버로도 전송 (다른 유저에게 표시)
        try {
            this.onlineClient?.sendChat?.(trimmed, message.room, getNickname());
        } catch {
            /* ignore */
        }
    }

    _sayCurrentPlayer(text) {
        const scene = this.sceneManager?.currentScene;
        const player = scene?.player;
        if (!player) return;
        bubbleSay(player, text);
    }

    _pushMessage(msg) {
        this.messages.push(msg);
        if (this.messages.length > this.maxMessages) {
            this.messages.splice(0, this.messages.length - this.maxMessages);
        }
    }

    _render() {
        if (!this.logEl) return;
        this.logEl.innerHTML = '';

        for (const m of this.messages) {
            const row = document.createElement('div');
            row.className = 'chat-row';

            const head = document.createElement('div');
            head.className = 'chat-head';

            const who = document.createElement('span');
            who.className = 'chat-who';
            who.textContent = m.senderLabel;

            const when = document.createElement('span');
            when.className = 'chat-when';
            when.textContent = new Date(m.ts).toLocaleTimeString();

            head.appendChild(who);
            head.appendChild(when);

            const body = document.createElement('div');
            body.className = 'chat-body';
            body.textContent = m.text;

            row.appendChild(head);
            row.appendChild(body);

            this.logEl.appendChild(row);
        }

        // auto scroll
        this.logEl.scrollTop = this.logEl.scrollHeight;
    }
}