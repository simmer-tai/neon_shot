import { Player } from './Player.js';
import { Bullet } from './Bullet.js';
import { EnemyDrone } from './EnemyDrone.js';
import { EnemyShooter } from './EnemyShooter.js';
import { SkillTreeSystem, MAIN_NODES, SUB_NODE_POOL } from './CardSystem.js';
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

        // スキルツリーシステム
        this.skillTree = new SkillTreeSystem();
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
            this.closeSkillTreeUI();
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

        if (this.skillTree.equippedMainCard === null) {
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
        } else if (this.skillTree.equippedMainCard.id === 'shotgun') {
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
        } else if (this.skillTree.equippedMainCard.id === 'sniper') {
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
        } else if (this.skillTree.equippedMainCard.id === 'homing') {
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
        if (this.phase === 'BATTLE') {
            this.phase = 'SAFE';
            this.phaseTimeLeft = 15;
            document.body.classList.add('safe-zone');
            // 既存の敵を全て消去
            this.enemies.forEach(e => e.destroy());
            this.enemies = [];

            // スキルツリーUI開始
            this.skillTree.addSP(2);
            this.skillTree.refreshAvailableNodes();
            this.openSkillTreeUI();
        } else {
            this.phase = 'BATTLE';
            this.phaseTimeLeft = 60;
            this.difficultyLevel++;
            document.body.classList.remove('safe-zone');
        }
    }

    // --- スキルツリーUI ---

    openSkillTreeUI() {
        this.isBuildMode = true;
        this.buildUI.style.opacity = '0';
        this.buildUI.classList.remove('hidden');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.buildUI.style.opacity = '1';
            });
        });
        this.startBuildGridAnimation();
        this.renderSkillTree();
    }

    closeSkillTreeUI() {
        this.buildUI.style.opacity = '0';
        this.stopBuildGridAnimation();
        this.finishBuildBtn.classList.add('clicked');
        setTimeout(() => {
            this.buildUI.classList.add('hidden');
            this.buildUI.style.opacity = '';
            this.finishBuildBtn.classList.remove('clicked');
            this.isBuildMode = false;
            this.player.applyBuild(
                this.skillTree.getBuildData(),
                this.skillTree.equippedMainCard
            );
        }, 300);
    }

    renderSkillTree() {
        const container = document.getElementById('skill-tree-nodes');
        const spDisplay = document.getElementById('skill-tree-sp');
        if (!container || !spDisplay) return;

        spDisplay.textContent = `SP: ${this.skillTree.sp}`;

        const hasExisting = container.children.length > 0;

        const doRender = () => {
            container.innerHTML = '';
            this._renderSkillTreeContent(container);
        };

        if (!hasExisting) {
            doRender();
            return;
        }

        // 既存要素を消滅アニメーションで退場させてから再描画
        Array.from(container.children).forEach(child => {
            child.style.animation = 'node-disappear 0.18s ease-in forwards';
            child.style.pointerEvents = 'none';
            child.style.opacity = '1';
        });

        setTimeout(doRender, 200);
    }

    _renderSkillTreeContent(container) {
        // 取得済みノードを tier 別にグループ化
        const tierMap = new Map();
        for (const node of this.skillTree.acquiredNodes) {
            if (!tierMap.has(node.tier)) tierMap.set(node.tier, []);
            tierMap.get(node.tier).push(node);
        }

        const tiers = Array.from(tierMap.keys()).sort((a, b) => a - b);

        // 取得済み tier の行を生成
        for (let i = 0; i < tiers.length; i++) {
            const tier = tiers[i];
            const nodes = tierMap.get(tier);

            // スペーサーを先に追加
            const spacer = document.createElement('div');
            spacer.style.cssText = 'width:1px; height:48px; flex-shrink:0;';
            container.appendChild(spacer);

            const row = document.createElement('div');
            row.className = 'skill-tier-row';

            for (const node of nodes) {
                const el = this._createNodeElement(node, true);
                // 取得済みノードに即時表示クラスを付与
                el.classList.add('instant-appear');
                // data 属性を付与
                el.dataset.tier = node.tier;
                el.dataset.nodeId = node.id;
                row.appendChild(el);
            }
            container.appendChild(row);
        }

        // 候補ノード行（最上段に表示）
        const available = this.skillTree.availableNodes;
        if (available.length > 0) {
            // スペーサーを候補行の前に追加
            const spacer2 = document.createElement('div');
            spacer2.style.cssText = 'width:1px; height:48px; flex-shrink:0;';
            container.appendChild(spacer2);

            const row = document.createElement('div');
            row.className = 'skill-tier-row';

            for (const node of available) {
                const wrapper = this._createNodeElement(node, false);
                // data 属性を付与
                wrapper.dataset.tier = node.tier;
                wrapper.dataset.nodeId = node.id;
                const skillNode = wrapper.querySelector('.skill-node');
                if (this.skillTree.sp < 1) skillNode.classList.add('disabled');
                wrapper.addEventListener('click', () => {
                    const success = this.skillTree.acquireNode(node.id);
                    if (success) {
                        // ノード取得後にステータスを即時反映
                        this.player.applyBuild(
                            this.skillTree.getBuildData(),
                            this.skillTree.equippedMainCard
                        );
                        // 候補ノード（instant-appear を持たないもの）を灰色化してから再描画
                        const candidateWrappers = Array.from(container.querySelectorAll(
                            '.skill-node-wrapper:not(.instant-appear)'
                        ));
                        candidateWrappers.forEach(w => w.classList.add('node-rejected'));

                        setTimeout(() => {
                            this.renderSkillTree();
                            const scrollArea = document.getElementById('skill-tree-scroll-area');
                            if (scrollArea) scrollArea.scrollTop = 0;
                        }, 350);
                    }
                });
                row.appendChild(wrapper);
            }
            container.appendChild(row);
        }

        this.updateStatusPanel();
        // DOM描画完了後にコネクターを描く（レイアウト確定を待つ）
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this._drawConnectors();
            });
        });
    }

    _createNodeElement(node, isAcquired) {
        const isMain = node.type === 'main';
        const nodeColor = node.color || '#00ffff';

        // wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'card-wrapper skill-node-wrapper';
        if (isAcquired) wrapper.classList.add('instant-appear');

        // glow layer（SVG）
        const W = isMain ? 170 : 150;
        const H = isMain ? 88 : 76;
        const pathD = isMain
            ? `M 14,0 L ${W-14},0 L ${W},14 L ${W},${H} L ${W-14},${H} L 14,${H} L 0,${H-14} L 0,0 Z`
            : `M 12,0 L ${W-12},0 L ${W},12 L ${W},${H} L ${W-12},${H} L 12,${H} L 0,${H-12} L 0,0 Z`;

        const glowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        glowSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        glowSvg.setAttribute('preserveAspectRatio', 'none');
        glowSvg.style.cssText = `position:absolute;top:0;left:0;width:${W}px;height:${H}px;overflow:visible;pointer-events:none;z-index:0;`;

        const glowPathA = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        glowPathA.setAttribute('d', pathD);
        glowPathA.setAttribute('fill', 'none');
        glowPathA.setAttribute('stroke', nodeColor);
        glowPathA.setAttribute('stroke-width', '2');
        glowPathA.style.filter = `drop-shadow(0 0 6px ${nodeColor}) drop-shadow(0 0 14px ${nodeColor})`;
        glowPathA.style.opacity = '0.7';

        glowSvg.appendChild(glowPathA);

        // card 本体
        const card = document.createElement('div');
        card.className = isMain ? 'card card--md main-card' : 'card card--md';
        card.style.width = `${W}px`;
        card.style.height = `${H}px`;
        card.style.padding = '0';
        card.style.color = nodeColor;
        card.style.setProperty('--node-color', nodeColor);

        // clip-path をパスDと一致させる
        const cp = isMain
            ? `polygon(14px 0%, calc(100% - 14px) 0%, 100% 14px, 100% 100%, calc(100% - 14px) 100%, 14px 100%, 0% calc(100% - 14px), 0% 0%)`
            : `polygon(12px 0%, calc(100% - 12px) 0%, 100% 12px, 100% 100%, calc(100% - 12px) 100%, 12px 100%, 0% calc(100% - 12px), 0% 0%)`;
        card.style.clipPath = cp;

        // SVG ボーダー（パスが clip-path と完全一致）
        const borderSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        borderSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        borderSvg.setAttribute('preserveAspectRatio', 'none');
        borderSvg.style.cssText = `position:absolute;top:0;left:0;width:${W}px;height:${H}px;overflow:visible;pointer-events:none;z-index:2;`;

        const totalLen = 9999;

        const pathA = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathA.setAttribute('d', pathD);
        pathA.setAttribute('fill', 'none');
        pathA.setAttribute('stroke', nodeColor);
        pathA.setAttribute('stroke-width', '2');
        pathA.style.strokeDasharray = totalLen;
        pathA.style.strokeDashoffset = totalLen;
        pathA.style.animation = 'draw-path 0.3s ease-out forwards';

        borderSvg.appendChild(pathA);

        // card-fill
        const fillDiv = document.createElement('div');
        fillDiv.className = 'card-fill';
        if (isMain) {
            fillDiv.style.backgroundColor = '#ffff00';
        } else if (node.isMutated) {
            fillDiv.style.backgroundColor = '#ff00ff';
        } else {
            fillDiv.style.backgroundColor = nodeColor;
        }
        fillDiv.style.clipPath = cp;

        // card-content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'card-content skill-node-content';
        contentDiv.style.padding = '10px';

        const nameEl = document.createElement('div');
        nameEl.className = 'skill-node-name';
        nameEl.textContent = node.name;
        nameEl.style.color = nodeColor;

        const descEl = document.createElement('div');
        descEl.className = 'skill-node-desc';
        descEl.textContent = node.description;
        descEl.style.color = nodeColor;

        contentDiv.appendChild(nameEl);
        contentDiv.appendChild(descEl);

        if (node.isMutated) {
            const badge = document.createElement('div');
            badge.className = 'skill-node-badge';
            badge.textContent = '★';
            contentDiv.appendChild(badge);
        }

        card.appendChild(borderSvg);
        card.appendChild(fillDiv);
        card.appendChild(contentDiv);

        wrapper.appendChild(glowSvg);
        wrapper.appendChild(card);

        // 取得済みの場合はアニメーションをスキップして acquired 表示
        if (isAcquired) {
            pathA.style.animation = 'none';
            pathA.style.strokeDashoffset = '0';
            fillDiv.style.animation = 'none';
            fillDiv.style.transform = 'scaleY(0)';
            contentDiv.style.animation = 'none';
            contentDiv.style.opacity = '1';
            contentDiv.style.transform = 'translateY(0)';
            card.style.opacity = '0.6';
            card.style.filter = 'brightness(0.7)';
            // 取得済みチェックマーク
            const check = document.createElement('div');
            check.textContent = '✓';
            check.style.cssText = 'position:absolute;top:4px;right:8px;font-size:10px;z-index:3;color:' + nodeColor + ';opacity:0.7;';
            card.appendChild(check);
        }

        return wrapper;
    }

    _drawConnectors() {
        const container = document.getElementById('skill-tree-nodes');
        if (!container) return;

        // 既存コネクターSVGを削除
        const old = container.querySelector('.connector-svg');
        if (old) old.remove();

        const wrappers = Array.from(container.querySelectorAll('.skill-node-wrapper[data-tier]'));
        if (wrappers.length < 2) return;

        // tier別にグループ化
        const tierMap = new Map();
        for (const w of wrappers) {
            const tier = parseInt(w.dataset.tier);
            if (!tierMap.has(tier)) tierMap.set(tier, []);
            tierMap.get(tier).push(w);
        }

        const tiers = Array.from(tierMap.keys()).sort((a, b) => a - b);
        if (tiers.length < 2) return;

        // SVGを container に追加
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('connector-svg');
        svg.style.cssText = `
            position:absolute;
            top:0;left:0;
            width:100%;
            height:100%;
            pointer-events:none;
            z-index:0;
            overflow:visible;
        `;
        container.appendChild(svg);

        // container の左上を基準にした座標を取得するヘルパー
        const containerRect = container.getBoundingClientRect();

        const getTopCenter = (el) => {
            const r = el.getBoundingClientRect();
            return {
                x: r.left + r.width / 2 - containerRect.left,
                y: r.top - containerRect.top
            };
        };

        const getBottomCenter = (el) => {
            const r = el.getBoundingClientRect();
            return {
                x: r.left + r.width / 2 - containerRect.left,
                y: r.bottom - containerRect.top
            };
        };

        for (let i = 0; i < tiers.length - 1; i++) {
            const fromNodes = tierMap.get(tiers[i]);
            const toNodes   = tierMap.get(tiers[i + 1]);

            for (const fromEl of fromNodes) {
                for (const toEl of toNodes) {
                    // column-reverseのため fromEl(低tier)は画面下、toEl(高tier)は画面上に位置する
                    // 接続: fromElの上辺中心 → toElの下辺中心（どちらも互いに向き合う辺）
                    const p1 = getTopCenter(fromEl);
                    const p2 = getBottomCenter(toEl);

                    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    pathEl.setAttribute('d', `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`);
                    pathEl.setAttribute('fill', 'none');

                    const fromAcquired = fromEl.classList.contains('instant-appear');
                    const toAcquired   = toEl.classList.contains('instant-appear');

                    if (fromAcquired && toAcquired) {
                        pathEl.setAttribute('stroke', '#00ffff99');
                        pathEl.setAttribute('stroke-width', '1.5');
                    } else {
                        pathEl.setAttribute('stroke', '#00ffff33');
                        pathEl.setAttribute('stroke-width', '1');
                    }

                    svg.appendChild(pathEl);
                }
            }
        }
    }

    updateStatusPanel() {
        const statusPanel = document.getElementById('status-panel');
        if (!statusPanel) return;

        const mc = this.skillTree.equippedMainCard;
        const damage = mc?.id === 'shotgun' ? 4 : mc?.id === 'sniper' ? 40 : mc?.id === 'homing' ? 8 : 10;
        const pierce = mc?.id === 'sniper' ? 5 : 1;
        const multiShot = mc?.id === 'shotgun' ? '5発' : Math.round(this.player.multiShotChance * 100) + '%';

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
                <span class="status-value">${multiShot}</span>
            </div>
            <div class="status-item">
                <span class="status-label">貫通</span>
                <span class="status-value">${pierce}</span>
            </div>
        `;
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

                        // 20%の確率でSP+1
                        if (Math.random() < 0.2) {
                            this.skillTree.addSP(1);
                            // TODO: SPゲット演出（後で実装）
                        }

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

        // スキルツリーリセット
        this.skillTree.reset();
        this.isBuildMode = false;
        this.buildUI.classList.add('hidden');

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
