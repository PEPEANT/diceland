// chatSystem.js - Global chat panel and message store

import { getNickname } from '../../core/profile.js';
import { getClientIpLike, getIpLikeFromId } from '../../net/netIdentity.js';

const MAX_MESSAGES = 80;

export class ChatSystem {
    constructor() {
        this.initialized = false;
        this.messages = [];
        this.sceneManager = null;
        this.input = null;
        this.app = null;

        this.panel = null;
        this.logEl = null;
        this.inputEl = null;
        this.sendEl = null;

        this._userAtBottom = true;
        this._boundGlobalKeydown = null;
        this._boundScroll = null;
        this._boundSend = null;
        this._boundInputKeydown = null;
        this._boundInputFocus = null;
    }

    init({ sceneManager, input, app, onlineClient } = {}) {
        if (this.initialized) return;
        this.initialized = true;
        this.sceneManager = sceneManager || null;
        this.input = input || null;
        this.app = app || null;
        this.onlineClient = onlineClient || null;

        this.panel = document.getElementById('chat-panel');
        this.logEl = document.getElementById('chat-log');
        this.inputEl = document.getElementById('chat-input');
        this.sendEl = document.getElementById('chat-send');

        if (!this.panel || !this.logEl || !this.inputEl || !this.sendEl) {
            console.warn('ChatSystem: required DOM elements not found.');
            return;
        }

        this._bindEvents();

        if (this.onlineClient?.addEventListener) {
            this.onlineClient.addEventListener('chat', (ev) => {
                const msg = ev?.detail;
                if (!msg) return;
                this.receiveMessage({
                    id: `${msg.playerId}_${msg.ts}`,
                    ts: msg.ts,
                    room: msg.room,
                    senderId: msg.playerId,
                    senderLabel: getIpLikeFromId(msg.playerId),
                    senderName: msg.nickname,
                    text: msg.text,
                });
            });
        }
    }

    sendLocal(text) {
        const trimmed = String(text || '').trim();
        if (!trimmed) return;

        const message = {
            id: this._createId(),
            ts: Date.now(),
            room: this._getRoom(),
            senderId: 'local',
            senderName: getNickname(),
            senderLabel: getClientIpLike(),
            text: trimmed,
        };

        this._addMessage(message);

        if (trimmed === '@초기화') {
            const ok = this.app?.reset?.();
            const reply = ok ? '초기화되었습니다.' : '이미 사용했습니다.';
            this._sayCurrentPlayer(reply);
        } else {
            this._sayCurrentPlayer(trimmed);
        }
    }

    receiveMessage(messageObj) {
        if (!messageObj || typeof messageObj !== 'object') return;
        const text = String(messageObj.text ?? '').trim();
        if (!text) return;

        const message = {
            id: messageObj.id || this._createId(),
            ts: Number.isFinite(messageObj.ts) ? messageObj.ts : Date.now(),
            room: messageObj.room || this._getRoom(),
            senderId: messageObj.senderId || 'unknown',
            senderName: messageObj.senderName || messageObj.nickname || '알 수 없음',
            senderLabel: messageObj.senderLabel || (messageObj.playerId ? getIpLikeFromId(messageObj.playerId) : messageObj.senderId) || 'unknown',
            text,
        };

        this._addMessage(message);
    }

    // ---- Internal helpers ----

    _bindEvents() {
        this._boundSend = () => this._handleSend();
        this._boundInputKeydown = (e) => this._handleInputKeydown(e);
        this._boundInputFocus = () => this._handleInputFocus();
        this._boundScroll = () => this._handleScroll();
        this._boundGlobalKeydown = (e) => this._handleGlobalKeydown(e);

        this.sendEl.addEventListener('click', this._boundSend);
        this.inputEl.addEventListener('keydown', this._boundInputKeydown);
        this.inputEl.addEventListener('focus', this._boundInputFocus);
        this.logEl.addEventListener('scroll', this._boundScroll);
        window.addEventListener('keydown', this._boundGlobalKeydown, true);
    }

    _handleGlobalKeydown(e) {
        const input = this.inputEl;
        const isFocused = document.activeElement === input;

        if (this._isModalOpen()) return;
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

        if (!isFocused && e.code === 'KeyT' && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            this.openChat();
            return;
        }

        if (!isFocused && e.code === 'KeyN' && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            const scene = this.sceneManager?.getCurrentScene?.() || this.sceneManager?.currentScene;
            const player = scene?.player;
            if (player && Number.isFinite(player.x) && Number.isFinite(player.y)) {
                const x = Math.round(player.x);
                const y = Math.round(player.y);
                this.sendLocal(`현재 위치: ${x}, ${y}`);
            } else {
                this.sendLocal('현재 위치: 알 수 없음');
            }
            return;
        }

        if (e.key === 'Enter') {
            if (!isFocused) {
                e.preventDefault();
                e.stopPropagation();
                this.openChat();
                return;
            }
        }

        if (e.key === 'Escape' && isFocused) {
            e.preventDefault();
            e.stopPropagation();
            input.blur();
        }
    }

    openChat() {
        if (this.input && typeof this.input.clear === 'function') {
            this.input.clear();
        }
        this.inputEl.focus();
    }

    _handleInputKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (this._isModalOpen()) {
                this.inputEl.blur();
                return;
            }
            this._handleSend();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.inputEl.blur();
        }
    }

    _handleInputFocus() {
        if (this.input) {
            this.input.clear();
        }
    }

    _handleSend() {
        if (this._isModalOpen()) {
            this.inputEl.blur();
            return;
        }
        const text = this.inputEl.value;
        const trimmed = String(text || '').trim();
        if (!trimmed) return;
        if (this.onlineClient?.isConnected?.()) {
            this.onlineClient.sendChat(trimmed, 'lobby', getNickname());
        } else {
            this.sendLocal(trimmed);
        }
        this.inputEl.value = '';
        this.inputEl.blur();
    }

    _handleScroll() {
        this._userAtBottom = this._isAtBottom();
    }

    _addMessage(message) {
        this.messages.push(message);
        if (this.messages.length > MAX_MESSAGES) {
            this.messages.shift();
            if (this.logEl.firstChild) {
                this.logEl.removeChild(this.logEl.firstChild);
            }
        }

        const line = document.createElement('div');
        line.className = 'chat-line';
        line.textContent = this._formatMessage(message);
        const shouldScroll = this._userAtBottom || this._isAtBottom();
        this.logEl.appendChild(line);

        if (shouldScroll) {
            this.logEl.scrollTop = this.logEl.scrollHeight;
        }
    }

    _formatMessage(message) {
        const ip = message.senderLabel || message.senderId || 'unknown';
        const name = message.senderName ? `(${message.senderName})` : '';
        return `${ip}${name}: ${message.text}`;
    }

    _getRoom() {
        return this.sceneManager?.getCurrentSceneId?.() || 'lobby';
    }

    _sayCurrentPlayer(text) {
        const scene = this.sceneManager?.getCurrentScene?.() || this.sceneManager?.currentScene;
        if (scene?.player?.say) {
            scene.player.say(text);
        }
    }

    _createId() {
        return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    _isAtBottom() {
        const { scrollTop, clientHeight, scrollHeight } = this.logEl;
        return scrollTop + clientHeight >= scrollHeight - 4;
    }

    _isModalOpen() {
        return !!document.querySelector('.modal:not(.hidden)');
    }
}
