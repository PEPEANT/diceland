// rankingSystem.js - 랭킹 시스템 (플레이어 단독)
import { App } from '../../core/appState.js';
import { CONFIG } from '../../core/constants.js';
import { getNickname } from '../../core/profile.js';

const formatRankWon = (n) => {
    const value = Math.max(0, Math.floor(Number(n) || 0));

    if (value < 10000) {
        return `${value.toLocaleString('ko-KR')}원`;
    }

    if (value < 100000000) {
        const man = Math.floor(value / 10000);
        return `${man.toLocaleString('ko-KR')}만원`;
    }

    if (value < 1000000000000) {
        const eok = Math.floor(value / 100000000);
        const rem = value % 100000000;
        if (rem < 10000) return `${eok}억`;
        const remMan = Math.floor(rem / 10000);
        return `${eok}억 ${remMan.toLocaleString('ko-KR')}만원`;
    }

    const jo = Math.floor(value / 1000000000000);
    const remEok = Math.floor((value % 1000000000000) / 100000000);
    if (remEok > 0) return `${jo}조 ${remEok}억`;
    return `${jo}조`;
};

export class RankingSystem {
    constructor() {
        this.el = document.getElementById('ranking-list');
        // 더미 데이터 제거
        this.dummyData = [];
        this.unsub = null;
    }

    init() {
        // App 상태 구독
        this.unsub = App.subscribe(() => this.render());
        // 초기 렌더링
        this.render();
    }

    render() {
        if (!this.el) return;

        const playerCash = App.getState().cash;
        const playerChips = App.getState().chips;
        const totalWon = playerCash + (playerChips * CONFIG.RATE_WON_PER_CHIP);

        // 1. 전체 리스트 생성 (플레이어만)
        const all = [
            { name: `${getNickname()} (Player)`, totalWon: totalWon, isMe: true }
        ];

        // 2. 렌더링
        let html = '';
        all.forEach((item, idx) => {
            html += this._createItemHTML(idx + 1, item);
        });

        this.el.innerHTML = html;
    }

    _createItemHTML(rank, item) {
        const isTop = rank <= 3 ? `top${rank}` : '';
        const highlight = item.isMe ? 'highlight' : '';
        const money = formatRankWon(item.totalWon);

        return `
            <li class="ranking-item ${highlight}">
                <span class="rank-idx ${isTop}">${rank}</span>
                <span class="rank-name">${item.name}</span>
                <span class="rank-val">${money}</span>
            </li>
        `;
    }
}
