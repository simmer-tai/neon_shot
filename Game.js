import { Player } from './Player.js';
import { Bullet } from './Bullet.js';
import { EnemyDrone } from './EnemyDrone.js';
import { EnemyShooter } from './EnemyShooter.js';
import { CardSystem, CARDS, MAIN_CARDS } from './CardSystem.js';
import { ParticleSystem } from './ParticleSystem.js';
import { ImpactEffect } from './ImpactEffect.js';

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

        // オブジェクトプール（DOM生成の削減）
        this.bulletPool = [];
        this.activeBullets = [];
        this.particles = [];
        this.impactEffects = [];
        this.bounds = { width: window.innerWidth, height: window.innerHeight };
        this.keys = { w: false, a: false, s: false, d: false };

        // パーティクルシステムの初期化
        this.particleSystem = new ParticleSystem(this.container);

        // ゲーム状態
        this.isGameOver = false;
        this.killCount = 0;
        this.totalDamage = 0;
        this.startTime = Date.now();
        this.survivalTime = 0;
        this.lastFireTime = 0;

        // フェーズ管理
        this.phase = 'BATTLE'; // 'BATTLE' or 'SAFE'
        this.phaseTimeLeft = 60; // 秒
        this.difficultyLevel = 0;
        this.lastSpawnTime = 0;
        this.lastShooterSpawnTime = 0;
        this.lastWaveSpawnTime = 0;
        this.lastVSpawnTime = 0;
        this.waveInterval = 20000;  // 20秒ごと
        this.vInterval = 30000;     // 30秒ごと

        // カード管理
        this.inventory = [];
        this.equippedSlots = [null, null, null, null];
        this.equippedMainCard = null;
        this.isBuildMode = false;
        this.isMouseDown = false;

        // 難易度パラメータ
        this.baseSpawnInterval = 1000;
        this.baseEnemySpeed = 2;

        // フレームレート独立化
        this.lastTimestamp = null;

        // マウス位置追跡（rAF同期用）
        this.mouseX = window.innerWidth / 2;
        this.mouseY = window.innerHeight / 2;

        // UI更新の最適化用
        this._lastHp = 3;
        this._lastPhase = 'BATTLE';
        this._lastTimeLeft = 60;

        // トレイル描画用Canvas
        this.trailCanvas = document.createElement('canvas');
        this.trailCanvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:1;';
        this.trailCanvas.width = window.innerWidth;
        this.trailCanvas.height = window.innerHeight;
        this.container.appendChild(this.trailCanvas);
        this.trailCtx = this.trailCanvas.getContext('2d');

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
            this.trailCanvas.width = window.innerWidth;
            this.trailCanvas.height = window.innerHeight;
        });
        // マウス座標を常に追跡（射撃はrAFループ内で処理）
        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        window.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            if (this.isGameOver) {
                this.restart();
            }
        });
        window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        this.finishBuildBtn.addEventListener('click', () => {
            this.closeBuildUI();
        });

        // ループ開始
        requestAnimationFrame((ts) => this.update(ts));
    }

    spawnDeathParticles(x, y) {
        const particleCount = Math.floor(Math.random() * 5) + 8; // 8〜12個
        const colors = ['#ff0055', '#ff3377', '#ff6600', '#ff1144', '#ff4488'];

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.random() * Math.PI * 2);
            const speed = Math.random() * 150 + 100; // 100〜250 px/s
            const life = Math.random() * 200 + 400; // 400〜600ms
            const color = colors[Math.floor(Math.random() * colors.length)];

            const el = document.createElement('div');
            el.className = 'death-particle';
            el.style.backgroundColor = color;
            el.style.boxShadow = `0 0 4px ${color}, 0 0 10px ${color}, 0 0 20px ${color}`;
            this.container.appendChild(el);

            this.particles.push({
                el,
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life,
                maxLife: life,
                color
            });
        }
    }

    getBullet(x, y, angle, speed, options = {}) {
        let bullet;
        if (this.bulletPool.length > 0) {
            bullet = this.bulletPool.pop();
            bullet.reset(x, y, angle, speed, options);
            bullet.activate(this.container);
        } else {
            bullet = new Bullet(x, y, angle, this.container, speed, options);
            bullet.activate(this.container);
        }
        return bullet;
    }

    returnBullet(bullet) {
        if (bullet.element.parentNode) {
            this.container.removeChild(bullet.element);
        }
        this.bulletPool.push(bullet);
    }

    shoot(tx, ty) {
        const x = this.player.x;
        const y = this.player.y;
        const angle = Math.atan2(ty - y, tx - x);

        if (this.equippedMainCard === null) {
            // 通常射撃
            const now = Date.now();
            if (now - this.lastFireTime < this.player.fireRate) return;
            this.lastFireTime = now;

            this.bullets.push(this.getBullet(x, y, angle, this.player.bulletSpeed, {
                isPiercing: this.player.piercingCount > 0,
                reflectCount: this.player.reflectCount,
                damage: 10
            }));

            // マルチショット判定
            if (Math.random() < this.player.multiShotChance) {
                const spread = 0.2;
                this.bullets.push(this.getBullet(x, y, angle + spread, this.player.bulletSpeed, {
                    isPiercing: this.player.piercingCount > 0,
                    reflectCount: this.player.reflectCount,
                    damage: 10
                }));
            }
        } else if (this.equippedMainCard.id === 'shotgun') {
            // ショットガン: 5発扇状
            const now = Date.now();
            if (now - this.lastFireTime < this.player.fireRate * 2) return;
            this.lastFireTime = now;

            const spread = Math.PI / 9; // 20度ずつ（-40度〜+40度）
            for (let i = -2; i <= 2; i++) {
                const bulletAngle = angle + (i * spread);
                const speed = this.player.bulletSpeed * 0.7;
                this.bullets.push(this.getBullet(x, y, bulletAngle, speed, {
                    isPiercing: this.player.piercingCount > 0,
                    reflectCount: this.player.reflectCount,
                    damage: 4
                }));
            }
        } else if (this.equippedMainCard.id === 'sniper') {
            // スナイパー: 貫通弾
            const now = Date.now();
            if (now - this.lastFireTime < this.player.fireRate * 4) return;
            this.lastFireTime = now;

            const speed = this.player.bulletSpeed * 3;
            this.bullets.push(this.getBullet(x, y, angle, speed, {
                isPiercing: true,
                reflectCount: this.player.reflectCount,
                damage: 40
            }));
        } else if (this.equippedMainCard.id === 'homing') {
            // ホーミング: 追尾弾
            const now = Date.now();
            if (now - this.lastFireTime < this.player.fireRate * 1.5) return;
            this.lastFireTime = now;

            const speed = this.player.bulletSpeed * 1.2;
            this.bullets.push(this.getBullet(x, y, angle, speed, {
                isHoming: true,
                isPiercing: this.player.piercingCount > 0,
                reflectCount: this.player.reflectCount,
                damage: 8
            }));
        }
    }

    spawnWaveFormation() {
        const count = 5;
        const side = Math.floor(Math.random() * 4);
        const padding = 50;
        const gap = 40; // 体間の間隔(px)

        // 出現位置と進行方向を辺に応じて決定
        let baseX, baseY, dirX, dirY;
        if (side === 0) {
            baseX = this.bounds.width / 2; baseY = -padding;
            dirX = 0; dirY = 1;
        } else if (side === 1) {
            baseX = this.bounds.width + padding; baseY = this.bounds.height / 2;
            dirX = -1; dirY = 0;
        } else if (side === 2) {
            baseX = this.bounds.width / 2; baseY = this.bounds.height + padding;
            dirX = 0; dirY = -1;
        } else {
            baseX = -padding; baseY = this.bounds.height / 2;
            dirX = 1; dirY = 0;
        }

        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                if (this.phase !== 'BATTLE' || this.isGameOver) return;
                const drone = new EnemyDrone(this.container, this.bounds);
                drone.speed = this.baseEnemySpeed + (this.difficultyLevel * 0.3);

                // 先頭を基点に、進行方向と逆側へgapずつずらして配置
                drone.x = baseX - dirX * i * gap;
                drone.y = baseY - dirY * i * gap;

                // 進行方向を固定（4方向）
                drone.vx = dirX;
                drone.vy = dirY;

                this.enemies.push(drone);
            }, i * 150);
        }
    }

    spawnVFormation() {
        const side = Math.floor(Math.random() * 4);
        const padding = 50;
        const count = 7; // 先頭1 + 左右各3
        const spread = 35;

        // V字のオフセット定義（先頭を0として後ろに広がる）
        // index 0: 先頭, 1-3: 右翼, 4-6: 左翼
        const offsets = [
            { perp: 0, depth: 0 },
            { perp: 1, depth: 1 },
            { perp: 2, depth: 2 },
            { perp: 3, depth: 3 },
            { perp: -1, depth: 1 },
            { perp: -2, depth: 2 },
            { perp: -3, depth: 3 },
        ];

        // 進行方向ベクトルを決定
        let dirX, dirY, baseX, baseY;
        if (side === 0) {
            baseX = this.bounds.width / 2; baseY = -padding;
            dirX = 0; dirY = 1;
        } else if (side === 1) {
            baseX = this.bounds.width + padding; baseY = this.bounds.height / 2;
            dirX = -1; dirY = 0;
        } else if (side === 2) {
            baseX = this.bounds.width / 2; baseY = this.bounds.height + padding;
            dirX = 0; dirY = -1;
        } else {
            baseX = -padding; baseY = this.bounds.height / 2;
            dirX = 1; dirY = 0;
        }

        // 進行方向に垂直なベクトル
        const perpX = -dirY;
        const perpY = dirX;

        offsets.forEach((offset) => {
            if (this.phase !== 'BATTLE' || this.isGameOver) return;
            const drone = new EnemyDrone(this.container, this.bounds);
            drone.speed = this.baseEnemySpeed + (this.difficultyLevel * 0.3);

            // 位置: 垂直方向にperp*spread、後方にdepth*spreadずらす
            drone.x = baseX + perpX * offset.perp * spread - dirX * offset.depth * spread;
            drone.y = baseY + perpY * offset.perp * spread - dirY * offset.depth * spread;

            // 進行方向を固定（全員同じ方向）
            drone.vx = dirX;
            drone.vy = dirY;

            this.enemies.push(drone);
        });
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

    resetAnimations(wrapper) {
        requestAnimationFrame(() => {
            const paths = wrapper.querySelectorAll('.path-a, .path-b, .path-a-inner, .path-b-inner, .card-fill, .card-content, .glow-path-a, .glow-path-b');
            paths.forEach(p => {
                p.style.animationName = 'none';
                requestAnimationFrame(() => {
                    p.style.animationName = '';
                });
            });
        });
    }

    showCardSelection() {
        // メインカード未選択の場合、メインカード選択フェーズを実行
        if (this.equippedMainCard === null) {
            this.showMainCardSelection();
        } else {
            // メインカード既選択の場合、サブカード選択のみ
            this.showSubCardSelection();
        }
    }

    showMainCardSelection() {
        this.isBuildMode = true;
        this.cardCandidatesContainer.innerHTML = '';

        // h2要素を "CHOOSE YOUR PLAYSTYLE" に変更
        const h2 = document.querySelector('h2');
        if (h2) h2.textContent = 'CHOOSE YOUR PLAYSTYLE';

        const candidates = CardSystem.getMainCardCandidates();

        candidates.forEach((card) => {
            const wrapper = this.createCardElement(card, { isMain: true, size: 'lg' });
            const cardEl = wrapper.querySelector('.card');
            wrapper.addEventListener('click', () => {
                // すべてのカードのクリックを即座に無効化
                this.cardCandidatesContainer.querySelectorAll('.card-wrapper').forEach(w => {
                    w.style.pointerEvents = 'none';
                });

                // メインカード選択
                this.equippedMainCard = card;

                // 選ばれたカードを拡大
                cardEl.classList.add('selected');

                // 他のカードを逆再生で消す
                candidates.forEach((_, i) => {
                    const otherWrapper = this.cardCandidatesContainer.children[i];
                    const otherCardEl = otherWrapper.querySelector('.card');
                    if (otherCardEl !== cardEl) {
                        otherWrapper.classList.add('exit');
                        otherCardEl.classList.add('exit');
                    }
                });

                // 400ms後、選ばれたカードも消す
                setTimeout(() => {
                    cardEl.classList.add('exit');
                }, 400);

                // 全て消え終わったらサブカード選択へ
                setTimeout(() => {
                    this.cardCandidatesContainer.innerHTML = '';
                    const h2 = document.querySelector('h2');
                    if (h2) h2.textContent = 'CHOOSE A CARD';
                    this.showSubCardSelection();
                }, 1000);
            });
            this.cardCandidatesContainer.appendChild(wrapper);
            this.resetAnimations(wrapper);
        });

        this.cardSelectionUI.classList.remove('hidden');
    }

    showSubCardSelection() {
        this.isBuildMode = true;
        this.cardCandidatesContainer.innerHTML = '';
        const candidates = CardSystem.getRandomCandidates(4);

        candidates.forEach((card, index) => {
            const wrapper = this.createCardElement(card, { size: 'lg' });
            const cardEl = wrapper.querySelector('.card');
            wrapper.addEventListener('click', () => {
                // すべてのカードのクリックを即座に無効化
                this.cardCandidatesContainer.querySelectorAll('.card-wrapper').forEach(w => {
                    w.style.pointerEvents = 'none';
                });

                // 選択アニメーション開始
                this.inventory.push(card);

                // 選ばれたカードを拡大
                cardEl.classList.add('selected');

                // 他のカードを逆再生で消す
                candidates.forEach((_, i) => {
                    const otherWrapper = this.cardCandidatesContainer.children[i];
                    const otherCardEl = otherWrapper.querySelector('.card');
                    if (otherCardEl !== cardEl) {
                        otherWrapper.classList.add('exit');
                        otherCardEl.classList.add('exit');
                    }
                });

                // 400ms後、選ばれたカードも消す
                setTimeout(() => {
                    cardEl.classList.add('exit');
                }, 400);

                // 全て消え終わったらビルド画面を開く
                setTimeout(() => {
                    this.cardSelectionUI.classList.add('hidden');
                    this.openBuildUI();
                }, 1000);
            });
            this.cardCandidatesContainer.appendChild(wrapper);
            this.resetAnimations(wrapper);
        });

        this.cardSelectionUI.classList.remove('hidden');
    }

    createCardElement(card, options = {}) {
        const { isMain = false, size = 'lg' } = options;

        // サイズ設定
        const SIZE_CONFIG = {
            lg: {
                viewBox: '0 0 200 300',
                pathA: 'M0,0 H184 L200,16 V300',
                pathB: 'M200,300 H16 L0,284 V0',
                pathAInner: 'M6,6 H178 L194,22 V294',
                pathBInner: 'M194,294 H22 L6,278 V6'
            },
            md: {
                viewBox: '0 0 160 210',
                pathA: 'M1,1 H149 L159,11 V209',
                pathB: 'M159,209 H11 L1,199 V1',
                pathAInner: 'M7,7 H143 L153,17 V203',
                pathBInner: 'M153,203 H17 L7,193 V7'
            },
            sm: {
                viewBox: '0 0 100 140',
                pathA: 'M1,1 H89 L99,11 V139',
                pathB: 'M99,139 H11 L1,129 V1',
                pathAInner: 'M7,7 H83 L93,17 V133',
                pathBInner: 'M93,133 H17 L7,123 V7'
            }
        };

        const config = SIZE_CONFIG[size] || SIZE_CONFIG.lg;
        const { viewBox, pathA, pathB, pathAInner, pathBInner } = config;

        // ラッパーを作成
        const wrapper = document.createElement('div');
        wrapper.className = 'card-wrapper';

        // カード本体
        const div = document.createElement('div');
        div.className = `card card--${size}`;

        // アニメーション用の枠線SVG（カード内部用）
        const svg = `
            <svg class="card-border" viewBox="${viewBox}" overflow="visible">
                <path class="path-a" d="${pathA}" />
                <path class="path-b" d="${pathB}" />
                <path class="path-a-inner" d="${pathAInner}" />
                <path class="path-b-inner" d="${pathBInner}" />
            </svg>
        `;

        // グロー専用SVGレイヤー（card の外側に配置）
        const glowLayer = document.createElement('div');
        glowLayer.className = 'card-glow-layer';
        glowLayer.innerHTML = `
            <svg class="card-glow-svg" viewBox="${viewBox}" overflow="visible">
                <path class="glow-path-a" d="${pathA}" />
                <path class="glow-path-b" d="${pathB}" />
            </svg>
        `;

        const fill = '<div class="card-fill"></div>';

        let displayColor = '#00ffff';
        if (isMain) {
            div.classList.add('main-card');
            displayColor = '#ffff00';
            div.style.borderColor = displayColor;
            div.style.boxShadow = `0 0 10px ${displayColor}44`;
            div.style.color = displayColor;
        }
        glowLayer.style.color = displayColor;

        div.innerHTML = `
            ${svg}
            ${fill}
            <div class="card-content">
                <div class="card-name">${card.name}</div>
                <div class="card-desc">${card.description}</div>
            </div>
        `;

        wrapper.appendChild(glowLayer);
        wrapper.appendChild(div);
        return wrapper;
    }

    openBuildUI() {
        this.buildUI.classList.remove('hidden');
        this.refreshBuildUI();
        this.startBuildGridAnimation();
    }

    refreshBuildUI() {
        // ── ステータスパネル更新 ──
        const statusPanel = document.getElementById('status-panel');
        if (statusPanel) {
            const damage     = this.equippedMainCard?.id === 'shotgun' ? 4
                             : this.equippedMainCard?.id === 'sniper'  ? 40
                             : this.equippedMainCard?.id === 'homing'  ? 8
                             : 10;
            const isSniper   = this.equippedMainCard?.id === 'sniper';
            const isShotgun  = this.equippedMainCard?.id === 'shotgun';

            const pierce     = isSniper  ? 5 : 1;
            const multiShot  = isShotgun ? 1 : Math.round(this.player.multiShotChance * 100);
            const multiUnit  = isShotgun ? '' : '%';

            statusPanel.innerHTML = `
                <div class="status-item">
                    <span class="status-label">ダメージ</span>
                    <span class="status-value">${damage}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">弾速</span>
                    <span class="status-value">${this.player.bulletSpeed.toFixed(1)}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">発射間隔</span>
                    <span class="status-value">${this.player.fireRate.toFixed(0)}<span class="status-unit">ms</span></span>
                </div>
                <div class="status-item">
                    <span class="status-label">マルチショット</span>
                    <span class="status-value">${multiShot}<span class="status-unit">${multiUnit}</span></span>
                </div>
                <div class="status-item">
                    <span class="status-label">貫通</span>
                    <span class="status-value">${pierce}</span>
                </div>
            `;
        }

        // ── 以下、既存コード ──
        if (!this.inventoryTitle) this.inventoryTitle = document.getElementById('inventory-title');

        const totalCards = this.inventory.length + this.equippedSlots.filter(s => s).length;
        this.inventoryTitle.textContent = `INVENTORY (${this.inventory.length}/${totalCards})`;

        // スロット更新
        this.slotContainer.innerHTML = '';
        this.equippedSlots.forEach((card, index) => {
            const slot = document.createElement('div');
            slot.className = 'slot';
            if (card) {
                const wrapper = this.createCardElement(card, { size: 'md' });
                const cardEl = wrapper.querySelector('.card');

                // オーバーレイ追加
                const overlay = document.createElement('div');
                overlay.className = 'card-overlay';
                overlay.innerHTML = '<span class="overlay-text overlay-unequip">UNEQUIP</span>';
                cardEl.appendChild(overlay);

                wrapper.addEventListener('click', () => this.unequipCard(index));
                slot.appendChild(wrapper);
            }
            this.slotContainer.appendChild(slot);
        });

        // インベントリ更新
        this.inventoryContainer.innerHTML = '';
        this.inventory.forEach((card, index) => {
            const wrapper = this.createCardElement(card, { size: 'sm' });
            const cardEl = wrapper.querySelector('.card');

            // オーバーレイ追加
            const overlay = document.createElement('div');
            overlay.className = 'card-overlay';
            overlay.innerHTML = '<span class="overlay-text overlay-equip">EQUIP</span>';
            cardEl.appendChild(overlay);

            wrapper.addEventListener('click', () => this.equipCard(index));
            this.inventoryContainer.appendChild(wrapper);
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
        this.finishBuildBtn.classList.add('clicked');
        this.stopBuildGridAnimation();
        setTimeout(() => {
            this.buildUI.classList.add('hidden');
            this.finishBuildBtn.classList.remove('clicked');
            this.isBuildMode = false;
            // ステータス反映
            this.player.applyBuild(this.equippedSlots);
        }, 200);
    }

    startBuildGridAnimation() {
        const canvas = document.getElementById('build-grid-canvas');
        const ctx = canvas.getContext('2d');
        const GRID = 40;
        const RADIUS = 180;
        let mouseX = -9999;
        let mouseY = -9999;
        let animFrameId = null;

        const resize = () => {
            canvas.width = this.buildUI.offsetWidth;
            canvas.height = this.buildUI.offsetHeight;
        };
        resize();

        const onMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const cols = Math.ceil(canvas.width / GRID) + 1;
            const rows = Math.ceil(canvas.height / GRID) + 1;

            // 縦線
            for (let i = 0; i <= cols; i++) {
                const x = i * GRID;
                const dx = Math.abs(x - mouseX);
                if (dx >= RADIUS) continue;

                const half = Math.sqrt(RADIUS * RADIUS - dx * dx);
                const y0 = mouseY - half;
                const y1 = mouseY + half;
                const factor = Math.pow(1 - dx / RADIUS, 1.5);

                ctx.save();
                ctx.strokeStyle = `rgba(0, 255, 255, ${factor * 0.9})`;
                ctx.lineWidth = 0.8;
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.moveTo(x, y0);
                ctx.lineTo(x, y1);
                ctx.stroke();
                ctx.restore();
            }

            // 横線
            for (let j = 0; j <= rows; j++) {
                const y = j * GRID;
                const dy = Math.abs(y - mouseY);
                if (dy >= RADIUS) continue;

                const half = Math.sqrt(RADIUS * RADIUS - dy * dy);
                const x0 = mouseX - half;
                const x1 = mouseX + half;
                const factor = Math.pow(1 - dy / RADIUS, 1.5);

                ctx.save();
                ctx.strokeStyle = `rgba(0, 255, 255, ${factor * 0.9})`;
                ctx.lineWidth = 0.8;
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.moveTo(x0, y);
                ctx.lineTo(x1, y);
                ctx.stroke();
                ctx.restore();
            }

            animFrameId = requestAnimationFrame(draw);
        };

        this.buildUI.addEventListener('mousemove', onMouseMove);
        this._buildGridCleanup = () => {
            cancelAnimationFrame(animFrameId);
            this.buildUI.removeEventListener('mousemove', onMouseMove);
        };
        draw();
    }

    stopBuildGridAnimation() {
        if (this._buildGridCleanup) {
            this._buildGridCleanup();
            this._buildGridCleanup = null;
        }
    }

    // --- メインループ ---

    update(timestamp = 0) {
        if (this.isGameOver) return;
        if (this.isBuildMode) {
            // ビルド中はゲーム内更新を停止するが、アニメーションループは維持
            this.lastTimestamp = timestamp;
            requestAnimationFrame((ts) => this.update(ts));
            return;
        }

        if (this.lastTimestamp === null) this.lastTimestamp = timestamp;
        const rawDelta = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;
        // 最大値を100msにクランプ（タブ非アクティブ時の爆発防止）
        const deltaTime = Math.min(rawDelta, 100);
        this.survivalTime = Math.floor((Date.now() - this.startTime) / 1000);

        // フェーズタイマーの更新
        this.phaseTimeLeft -= deltaTime / 1000;
        if (this.phaseTimeLeft <= 0) {
            this.switchPhase();
        }

        // プレイヤー更新
        this.player.update(this.keys, this.bounds, deltaTime);

        // マウスボタンが押されている場合、rAFループ内で射撃（レイアウトスラッシング削減）
        if (this.isMouseDown && !this.isBuildMode && this.phase === 'BATTLE') {
            this.shoot(this.mouseX, this.mouseY);
        }

        // 敵の生成 (戦闘フェーズのみ)
        if (this.phase === 'BATTLE') {
            const currentInterval = Math.max(300, this.baseSpawnInterval - (this.difficultyLevel * 100));
            const now = Date.now();

            // SHOOTER: 8秒ごとにスポーン
            if (now - this.lastShooterSpawnTime > 8000) {
                const shooter = new EnemyShooter(
                    this.container, this.bounds,
                    this.player.x, this.player.y
                );
                this.enemies.push(shooter);
                this.lastShooterSpawnTime = now;
            }

            // ウェーブ編隊
            if (now - this.lastWaveSpawnTime > this.waveInterval) {
                this.spawnWaveFormation();
                this.lastWaveSpawnTime = now;
            }

            // V字編隊
            if (now - this.lastVSpawnTime > this.vInterval) {
                this.spawnVFormation();
                this.lastVSpawnTime = now;
            }

            // ジグザグ（30%の確率で通常スポーンをジグザグに置換）
            if (now - this.lastSpawnTime > currentInterval) {
                const drone = new EnemyDrone(this.container, this.bounds);
                drone.speed = this.baseEnemySpeed + (this.difficultyLevel * 0.3);
                if (Math.random() < 0.3) {
                    drone.isZigzag = true;
                }
                this.enemies.push(drone);
                this.lastSpawnTime = now;
            }
        }

        // パーティクルシステムの更新
        this.particleSystem.update(deltaTime);

        // 既存パーティクルの更新（レガシー）
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= deltaTime;

            if (p.life <= 0) {
                p.el.remove();
                this.particles.splice(i, 1);
            } else {
                p.x += p.vx * deltaTime / 1000;
                p.y += p.vy * deltaTime / 1000;
                p.vy += 100 * deltaTime / 1000; // 重力効果

                const alpha = p.life / p.maxLife;
                p.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
                p.el.style.opacity = alpha;
            }
        }

        // 弾の更新
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.update(this.enemies, deltaTime, this.bounds);
            if (b.isOffScreen(this.bounds)) {
                this.returnBullet(b);
                this.bullets.splice(i, 1);
            }
        }

        // 敵の更新と衝突判定
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];

            if (e instanceof EnemyShooter) {
                e.update(deltaTime);
                if (e.shouldFire()) {
                    const muzzle = e.getMuzzlePosition();
                    this.bullets.push(this.getBullet(
                        muzzle.x, muzzle.y, e.angle,
                        this.player.bulletSpeed * 0.4,
                        { damage: 15, isEnemyBullet: true }
                    ));
                }
            } else {
                e.update(deltaTime);
            }

            let hit = false;
            // 弾 vs 敵
            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const b = this.bullets[j];
                if (b.isEnemyBullet) continue;
                const dx = b.x - e.x;
                const dy = b.y - e.y;
                const distSq = dx * dx + dy * dy;
                const hitRadius = e.radius + 10;
                if (distSq < hitRadius * hitRadius) {
                    e.hp -= b.damage;
                    this.totalDamage += b.damage;

                    if (e.hp <= 0) {
                        const hitAngle = Math.atan2(b.vy, b.vx);
                        this.particleSystem.spawnEnemyDeathParticles(e.x, e.y, hitAngle, this.container);

                        // 敵撃破時は逆方向の着弾エフェクト
                        this.impactEffects.push(new ImpactEffect(b.x, b.y, this.container, {
                            angle: Math.atan2(b.vy, b.vx) + Math.PI
                        }));

                        e.destroy();
                        this.enemies.splice(i, 1);
                        this.killCount++;
                        hit = true;
                    } else {
                        // 敵が生き残った場合は通常方向の着弾エフェクト
                        this.impactEffects.push(new ImpactEffect(b.x, b.y, this.container, {
                            angle: Math.atan2(b.vy, b.vx)
                        }));
                    }

                    if (!b.isPiercing) {
                        this.returnBullet(b);
                        this.bullets.splice(j, 1);
                    }

                    if (e.hp <= 0) {
                        break;
                    }
                }
            }

            if (hit) continue;

            // プレイヤー vs 敵
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const distSq = dx * dx + dy * dy;
            const hitRadius = e.radius + this.player.radius;
            if (distSq < hitRadius * hitRadius) {
                // 敵がプレイヤーから遠ざかる方向にパーティクルを飛ばす
                const hitAngle = Math.atan2(dy, dx);
                this.particleSystem.spawnEnemyDeathParticles(e.x, e.y, hitAngle, this.container);
                if (this.player.takeDamage()) {
                    if (this.player.hp <= 0) {
                        this.gameOver();
                    }
                }
                e.destroy();
                this.enemies.splice(i, 1);
                continue;
            }

            // 画面外デスポーン判定
            if (e.isOffScreen(this.bounds)) {
                e.destroy();
                this.enemies.splice(i, 1);
            }
        }

        // 敵弾 vs プレイヤーの衝突判定
        for (let j = this.bullets.length - 1; j >= 0; j--) {
            const b = this.bullets[j];
            if (!b.isEnemyBullet) continue;
            const dx = b.x - this.player.x;
            const dy = b.y - this.player.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < this.player.radius * this.player.radius) {
                this.returnBullet(b);
                this.bullets.splice(j, 1);
                if (this.player.takeDamage()) {
                    if (this.player.hp <= 0) {
                        this.gameOver();
                    }
                }
            }
        }

        // 着弾エフェクトの更新
        for (let i = this.impactEffects.length - 1; i >= 0; i--) {
            const done = this.impactEffects[i].update(deltaTime);
            if (done) {
                this.impactEffects[i].destroy();
                this.impactEffects.splice(i, 1);
            }
        }

        this.updateUI();
        this.draw();
        requestAnimationFrame((ts) => this.update(ts));
    }

    updateUI() {
        if (this.player.hp !== this._lastHp) {
            this.hpUI.textContent = `HP: ${this.player.hp}`;
            this._lastHp = this.player.hp;
        }
        const newPhase = this.phase === 'BATTLE' ? 'BATTLE PHASE' : 'SAFE ZONE';
        if (newPhase !== this._lastPhase) {
            this.phaseNameUI.textContent = newPhase;
            this._lastPhase = newPhase;
        }
        const newTime = Math.ceil(this.phaseTimeLeft);
        if (newTime !== this._lastTimeLeft) {
            this.phaseTimerUI.textContent = `${newTime}s`;
            this._lastTimeLeft = newTime;
        }
    }

    gameOver() {
        this.isGameOver = true;
        this.gameOverUI.classList.remove('hidden');
        this.finalStatsUI.textContent = `Survival: ${this.survivalTime}s | Kills: ${this.killCount} | Damage: ${this.totalDamage}`;
    }

    restart() {
        // 全状態リセット
        this.player.reset(this.bounds);

        // 残っている弾と敵を消去
        this.bullets.forEach(b => this.returnBullet(b));
        this.enemies.forEach(e => e.destroy());
        this.particles.forEach(p => p.el.remove());
        this.particleSystem.clear();
        this.impactEffects.forEach(e => e.destroy());
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.impactEffects = [];
        this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);

        this.killCount = 0;
        this.totalDamage = 0;
        this.startTime = Date.now();
        this.survivalTime = 0;
        this.phase = 'BATTLE';
        this.phaseTimeLeft = 60;
        this.difficultyLevel = 0;
        this.lastSpawnTime = 0;
        this.lastShooterSpawnTime = 0;
        this.isGameOver = false;

        // カード初期化
        this.inventory = [];
        this.equippedSlots = [null, null, null, null];
        this.equippedMainCard = null;
        this.isBuildMode = false;
        this.cardSelectionUI.classList.add('hidden');
        this.buildUI.classList.add('hidden');
        this.player.applyBuild(this.equippedSlots);

        document.body.classList.remove('safe-zone');
        this.gameOverUI.classList.add('hidden');

        // 再描画ループの再開
        this.lastTimestamp = null;
        requestAnimationFrame((ts) => this.update(ts));
    }

    draw() {
        this.player.draw();
        this.bullets.forEach(b => {
            b.spawnAfterimage(this.container); // enemy-bullet のみ内部で判定
            b.draw();
        });
        this.enemies.forEach(e => e.draw());
        this.drawTrails();
    }

    drawTrails() {
        const ctx = this.trailCtx;
        ctx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const b of this.bullets) {
            if (b.isEnemyBullet) continue;
            const trail = b.trail;
            if (!trail || trail.length < 2) continue;

            const head = trail[trail.length - 1];
            const tail = trail[0];

            // トレイル全体にグラデーションをかける
            const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
            grad.addColorStop(0, 'rgba(0, 255, 255, 0)');      // 尾: 透明
            grad.addColorStop(0.5, 'rgba(0, 255, 255, 0.15)'); // 中間
            grad.addColorStop(1, 'rgba(0, 255, 255, 0.9)');    // 弾頭直後: 高輝度

            // 共通パスを1回だけ構築
            const path = new Path2D();
            path.moveTo(trail[0].x, trail[0].y);
            for (let i = 1; i < trail.length; i++) {
                path.lineTo(trail[i].x, trail[i].y);
            }

            // 層1: 一番外側の広がったグロー
            ctx.strokeStyle = grad;
            ctx.lineWidth = 10;
            ctx.globalAlpha = 0.18;
            ctx.stroke(path);

            // 層2: 中間グロー
            ctx.lineWidth = 5;
            ctx.globalAlpha = 0.4;
            ctx.stroke(path);

            // 層3: コア（細くて明るい）
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 1.0;
            ctx.stroke(path);
        }

        // 敵弾トレイル（#ff0055 グラデーション）
        for (const b of this.bullets) {
            if (!b.isEnemyBullet) continue;
            const trail = b.trail;
            if (!trail || trail.length < 2) continue;

            const head = trail[trail.length - 1];
            const tail = trail[0];

            const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
            grad.addColorStop(0, 'rgba(255, 0, 85, 0)');
            grad.addColorStop(0.5, 'rgba(255, 0, 85, 0.2)');
            grad.addColorStop(1, 'rgba(255, 0, 85, 0.95)');

            const path = new Path2D();
            path.moveTo(trail[0].x, trail[0].y);
            for (let i = 1; i < trail.length; i++) {
                path.lineTo(trail[i].x, trail[i].y);
            }

            // 層1: 外側グロー
            ctx.strokeStyle = grad;
            ctx.lineWidth = 12;
            ctx.globalAlpha = 0.12;
            ctx.stroke(path);

            // 層2: 中間グロー
            ctx.lineWidth = 6;
            ctx.globalAlpha = 0.35;
            ctx.stroke(path);

            // 層3: コア
            ctx.lineWidth = 2;
            ctx.globalAlpha = 1.0;
            ctx.stroke(path);
        }

        ctx.globalAlpha = 1.0;
    }
}
