/**
 * CardSystem.js
 * カードの種類とランダム生成ロジックを管理します。
 */

export const CARDS = {
    move_speed: {
        id: 'move_speed',
        name: '移動速度UP',
        description: '移動速度 +5%',
        effectValue: 0.05,
        color: '#00ffff'
    },
    bullet_speed: {
        id: 'bullet_speed',
        name: '弾速UP',
        description: '弾速 +5%',
        effectValue: 0.05,
        color: '#ffff00'
    },
    fire_rate: {
        id: 'fire_rate',
        name: '連射速度UP',
        description: '連射速度 +3%',
        effectValue: 0.03,
        color: '#ff00ff'
    },
    multi_shot: {
        id: 'multi_shot',
        name: 'マルチショット',
        description: '20%の確率で2発同時発射',
        effectValue: 0.20,
        color: '#00ff00'
    }
};

export class CardSystem {
    /**
     * ランダムなカード候補（4枚）を取得する
     */
    static getRandomCandidates(count = 4) {
        const keys = Object.keys(CARDS);
        const candidates = [];
        for (let i = 0; i < count; i++) {
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            candidates.push({ ...CARDS[randomKey] });
        }
        return candidates;
    }
}
