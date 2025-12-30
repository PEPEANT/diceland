// main.js - single entry (index.html)

import { App } from './core/appState.js';
import { SceneManager } from './core/sceneManager.js';
import { InputManager } from './core/input.js';
import { SCENES } from './core/constants.js';
import { CasinoScene } from './scenes/casino/casinoScene.js';
import { CasinoLobbyScene } from './scenes/lobby/casinoLobbyScene.js';
import { MainMenuScene } from './scenes/main/mainMenuScene.js';
import { RankingSystem } from './features/ranking/rankingSystem.js';
import { ChatSystem } from './features/chat/chatSystem.js';
import { initServerPresence } from './core/serverPresence.js';
import { initMenuSystem } from './features/menu/menuSystem.js';
import { OnlineClient } from './net/onlineClient.js';
import { initPlayerListOverlay } from './features/players/playerListOverlay.js';

class GameApp {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        App.init({
            moneyEl: document.getElementById('money-display'),
            chipEl: document.getElementById('chip-display'),
        });

        this.onlineClient = new OnlineClient();
        initServerPresence({ onlineClient: this.onlineClient });

        this.ranking = new RankingSystem();
        this.ranking.init();

        this.input = new InputManager();
        this.input.bind();

        this.sceneManager = new SceneManager();

        this.chatSystem = new ChatSystem();
        this.chatSystem.init({
            sceneManager: this.sceneManager,
            input: this.input,
            app: App,
            onlineClient: this.onlineClient,
        });

        this._registerScenes();

        this.sceneManager.goto(SCENES.MAIN);

        this.lastTime = 0;
        this.running = true;
    }

    _registerScenes() {
        const main = new MainMenuScene(this.ctx);
        this.sceneManager.register(SCENES.MAIN, main);

        const casino = new CasinoScene(this.ctx, App, this.input);
        casino.sceneManager = this.sceneManager;
        this.sceneManager.register(SCENES.CASINO, casino);

        const lobby = new CasinoLobbyScene(this.ctx, App, this.input);
        lobby.sceneManager = this.sceneManager;
        this.sceneManager.register(SCENES.LOBBY, lobby);
    }

    start() {
        requestAnimationFrame((time) => this._loop(time));
    }

    _loop(time) {
        if (!this.running) return;

        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        this.sceneManager.update(dt);
        this.sceneManager.render(this.ctx);

        requestAnimationFrame((t) => this._loop(t));
    }

    stop() {
        this.running = false;
        this.input.unbind();
    }
}

const game = new GameApp();
game.start();

// ✅ 로컬(개발) / 배포(GitHub Pages) 자동 분기
const CONNECT_URL =
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'ws://localhost:8080'
    : 'wss://diceland.onrender.com';

initMenuSystem({
    sceneManager: game.sceneManager,
    app: App,
    onlineClient: game.onlineClient,
    connectUrl: CONNECT_URL,
});

initPlayerListOverlay({ app: App, onlineClient: game.onlineClient });

const btnCtl = document.getElementById('controls-toggle');
btnCtl?.addEventListener('click', () => {
    document.body.classList.toggle('mobile-controls-hidden');
    const hidden = document.body.classList.contains('mobile-controls-hidden');
    btnCtl.setAttribute('aria-pressed', String(hidden));
});

window.__GAME__ = game;
window.__APP__ = App;
window.__ONLINE__ = game.onlineClient;
