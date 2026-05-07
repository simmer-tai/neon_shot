import { Player } from './Player.js';
import { Bullet } from './Bullet.js';
import { Enemy } from './Enemy.js';
import { CardSystem, CARDS } from './CardSystem.js';

export class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.hpUI = document.getElementById('hp-ui');
        this.phaseNameUI = document.getElementById('phase-name');
        this.phaseTimerUI = document.getElementById('phase-timer');
        this.flashOverlay = document.getElementById('flash-overlay');
        this.gameOverUI = document.getElementById('game-over-ui');
        this.finalStatsUI = document.getElementById('final-stats');

        // カード関連UI
        this.cardSelectionUI = document.getElementById('card-selection-ui');
        this.cardCandidatesContainer = document.getElementById('card-candidates');
        this.buildUI = document.getElementById('build-ui');
        this.slotContainer = document.getElementById('slot-container');
        this.inventoryContainer = document.getElementById('inventory-container');
        this.finishBuildBtn = document.getElementById('finish-build-btn');

        this.player = new Player();
        this.bullets = [];
        this.enemies = [];
        this.bounds = { width: window.innerWidth, height: window.innerHeight };
        this.keys = { w: false, a: false, s: false, d: false };

        // ゲーム状態
        this.isGameOver = false;
        this.killCount = 0;
        this.startTime = Date.now();
        this.survivalTime = 0;
        this.lastFireTime = 0;

        // フェーズ管理
        this.phase = 'BATTLE'; // 'BATTLE' or 'SAFE'
        this.phaseTimeLeft = 60; // 秒
        this.difficultyLevel = 0;
        this.lastSpawnTime = 0;

        // カード管理
        this.inventory = [];
        this.equippedSlots = [null, null, null, null];
        this.isBuildMode = false;

        // 難易度パラメータ
        this.baseSpawnInterval = 1000;
        this.baseEnemySpeed = 2;

        this.init();
    }

    init() {
        // イベント登録
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) this.keys[key] = true;

            // デバッグ機能: 0キーでタイマーを1秒にする
            if (key === '0') {
                this.phaseTimeLeft = 1;
            }
        });
        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) this.keys[key] = false;
        });
        window.addEventListener('resize', () => {
            this.bounds.width = window.innerWidth;
            this.bounds.height = window.innerHeight;
        });
        window.addEventListener('mousedown', (e) => {
            if (this.isGameOver) {
                this.restart();
            } else if (!this.isBuildMode && this.phase === 'BATTLE') {
                this.shoot(e.clientX, e.clientY);
            }
        });

        this.finishBuildBtn.addEventListener('click', () => {
            this.closeBuildUI();
        });

        // ループ開始
        this.update();
    }

    shoot(tx, ty) {
        const now = Date.now();
        if (now - this.lastFireTime < this.player.fireRate) return;
        this.lastFireTime = now;

        const angle = Math.atan2(ty - this.player.y, tx - this.player.x);
        
        // 通常射撃
        this.bullets.push(new Bullet(this.player.x, this.player.y, angle, this.container, this.player.bulletSpeed));

        // マルチショット判定
        if (Math.random() < this.player.multiShotChance) {
            const spread = 0.2; // 角度の広がり
            this.bullets.push(new Bullet(this.player.x, this.player.y, angle + spread, this.container, this.player.bulletSpeed));
        }
    }

    // フェーズの切り替え
    switchPhase() {
        // フラッシュ演出
        this.flashOverlay.classList.remove('flash-active');
        void this.flashOverlay.offsetWidth; // reflowを強制して再アニメーション
        this.flashOverlay.classList.add('flash-active');

        if (this.phase === 'BATTLE') {
            this.phase = 'SAFE';
            this.phaseTimeLeft = 15;
            document.body.classList.add('safe-zone');
            // 既存の敵を全て消去
            this.enemies.forEach(e => e.destroy());
            this.enemies = [];

            // カード選択開始
            this.showCardSelection();
        } else {
            this.phase = 'BATTLE';
            this.phaseTimeLeft = 60;
            this.difficultyLevel++;
            document.body.classList.remove('safe-zone');
        }
    }

    // --- カードシステム関連 ---

    showCardSelection() {
        this.isBuildMode = true;
        this.cardCandidatesContainer.innerHTML = '';
        const candidates = CardSystem.getRandomCandidates(4);

        candidates.forEach((card, index) => {
            const cardEl = this.createCardElement(card, false); // 選択画面では水色統一
            cardEl.addEventListener('click', () => {
                // 選択アニメーション開始
                this.inventory.push(card);
                
                // 選ばれたカードを拡大
                cardEl.classList.add('selected');
                
                // 他のカードを逆再生で消す
                candidates.forEach((_, i) => {
                    const otherCardEl = this.cardCandidatesContainer.children[i];
                    if (otherCardEl !== cardEl) {
                        otherCardEl.classList.add('exit');
                    }
                });

                // 他のカードが消え終わる頃（0.6秒後）に選ばれたカードも消す
                setTimeout(() => {
                    cardEl.classList.remove('selected');
                    cardEl.classList.add('exit');
                }, 600);

                // 全て消え終わったらビルド画面を開く
                setTimeout(() => {
                    this.cardSelectionUI.classList.add('hidden');
                    this.openBuildUI();
                }, 1200);
            });
            this.cardCandidatesContainer.appendChild(cardEl);
        });

        this.cardSelectionUI.classList.remove('hidden');
    }

    createCardElement(card, useColor = true) {
        const div = document.createElement('div');
        div.className = 'card';
        
        // アニメーション用の枠線SVG
        const svg = `
            <svg class="card-border" viewBox="0 0 200 300">
                <path class="path-a" d="M0,0 H184 L200,16 V300" />
                <path class="path-b" d="M200,300 H16 L0,284 V0" />
                <!-- 二重枠用の内側パス (6pxオフセット) -->
                <path class="path-a-inner" d="M6,6 H178 L194,22 V294" />
                <path class="path-b-inner" d="M194,294 H22 L6,278 V6" />
            </svg>
        `;
        
        // 塗りつぶしエフェクト用
        const fill = '<div class="card-fill"></div>';

        if (useColor) {
            div.style.borderColor = card.color;
            div.style.boxShadow = `0 0 10px ${card.color}44`;
        }

        div.innerHTML = `
            ${svg}
            ${fill}
            <div class="card-content">
                <div class="card-name" ${useColor ? `style="color: ${card.color}"` : ''}>${card.name}</div>
                <div class="card-desc">${card.description}</div>
            </div>
        `;
        return div;
    }

    openBuildUI() {
        this.buildUI.classList.remove('hidden');
        this.refreshBuildUI();
    }

    refreshBuildUI() {
        // スロット更新
        this.slotContainer.innerHTML = '';
        this.equippedSlots.forEach((card, index) => {
            const slot = document.createElement('div');
            slot.className = 'slot';
            if (card) {
                const cardEl = this.createCardElement(card);
                cardEl.addEventListener('click', () => this.unequipCard(index));
                slot.appendChild(cardEl);
            }
            this.slotContainer.appendChild(slot);
        });

        // インベントリ更新
        this.inventoryContainer.innerHTML = '';
        this.inventory.forEach((card, index) => {
            const cardEl = this.createCardElement(card);
            cardEl.addEventListener('click', () => this.equipCard(index));
            this.inventoryContainer.appendChild(cardEl);
        });
    }

    equipCard(inventoryIndex) {
        const emptySlotIndex = this.equippedSlots.indexOf(null);
        if (emptySlotIndex !== -1) {
            const card = this.inventory.splice(inventoryIndex, 1)[0];
            this.equippedSlots[emptySlotIndex] = card;
            this.refreshBuildUI();
        }
    }

    unequipCard(slotIndex) {
        const card = this.equippedSlots[slotIndex];
        if (card) {
            this.inventory.push(card);
            this.equippedSlots[slotIndex] = null;
            this.refreshBuildUI();
        }
    }

    closeBuildUI() {
        this.buildUI.classList.add('hidden');
        this.isBuildMode = false;
        // ステータス反映
        this.player.applyBuild(this.equippedSlots);
    }

    // --- メインループ ---

    update() {
        if (this.isGameOver) return;
        if (this.isBuildMode) {
            // ビルド中はゲーム内更新を停止するが、アニメーションループは維持
            requestAnimationFrame(() => this.update());
            return;
        }

        const deltaTime = 16.67; // 約60fps想定
        this.survivalTime = Math.floor((Date.now() - this.startTime) / 1000);

        // フェーズタイマーの更新
        this.phaseTimeLeft -= deltaTime / 1000;
        if (this.phaseTimeLeft <= 0) {
            this.switchPhase();
        }

        // プレイヤー更新
        this.player.update(this.keys, this.bounds);

        // 敵の生成 (戦闘フェーズのみ)
        if (this.phase === 'BATTLE') {
            const currentInterval = Math.max(300, this.baseSpawnInterval - (this.difficultyLevel * 100));
            const now = Date.now();
            if (now - this.lastSpawnTime > currentInterval) {
                const enemy = new Enemy(this.container, this.bounds);
                enemy.speed = this.baseEnemySpeed + (this.difficultyLevel * 0.3);
                this.enemies.push(enemy);
                this.lastSpawnTime = now;
            }
        }

        // 弾の更新
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.update();
            if (b.isOffScreen(this.bounds)) {
                b.destroy();
                this.bullets.splice(i, 1);
            }
        }

        // 敵の更新と衝突判定
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(this.player);

            let hit = false;
            // 弾 vs 敵
            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const b = this.bullets[j];
                const dx = b.x - e.x;
                const dy = b.y - e.y;
                const distSq = dx * dx + dy * dy;
                const hitRadius = e.radius + 10;
                if (distSq < hitRadius * hitRadius) {
                    e.destroy();
                    this.enemies.splice(i, 1);
                    b.destroy();
                    this.bullets.splice(j, 1);
                    this.killCount++;
                    hit = true;
                    break;
                }
            }

            if (hit) continue;

            // プレイヤー vs 敵
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const distSq = dx * dx + dy * dy;
            const hitRadius = e.radius + this.player.radius;
            if (distSq < hitRadius * hitRadius) {
                if (this.player.takeDamage()) {
                    if (this.player.hp <= 0) {
                        this.gameOver();
                    }
                }
                e.destroy();
                this.enemies.splice(i, 1);
            }
        }

        this.updateUI();
        this.draw();
        requestAnimationFrame(() => this.update());
    }

    updateUI() {
        this.hpUI.textContent = `HP: ${this.player.hp}`;
        this.phaseNameUI.textContent = this.phase === 'BATTLE' ? 'BATTLE PHASE' : 'SAFE ZONE';
        this.phaseTimerUI.textContent = `${Math.ceil(this.phaseTimeLeft)}s`;
    }

    gameOver() {
        this.isGameOver = true;
        this.gameOverUI.classList.remove('hidden');
        this.finalStatsUI.textContent = `Survival: ${this.survivalTime}s | Kills: ${this.killCount}`;
    }

    restart() {
        // 全状態リセット
        this.player.reset(this.bounds);
        
        // 残っている弾と敵を消去
        this.bullets.forEach(b => b.destroy());
        this.enemies.forEach(e => e.destroy());
        this.bullets = [];
        this.enemies = [];
        
        this.killCount = 0;
        this.startTime = Date.now();
        this.survivalTime = 0;
        this.phase = 'BATTLE';
        this.phaseTimeLeft = 60;
        this.difficultyLevel = 0;
        this.isGameOver = false;

        // カード初期化
        this.inventory = [];
        this.equippedSlots = [null, null, null, null];
        this.isBuildMode = false;
        this.cardSelectionUI.classList.add('hidden');
        this.buildUI.classList.add('hidden');
        this.player.applyBuild(this.equippedSlots);
        
        document.body.classList.remove('safe-zone');
        this.gameOverUI.classList.add('hidden');
        
        // 再描画ループの再開
        requestAnimationFrame(() => this.update());
    }

    draw() {
        this.player.draw();
        this.bullets.forEach(b => b.draw());
        this.enemies.forEach(e => e.draw());
    }
}
