export class Bullet {
    constructor(x, y, angle, container, speed = 15, options = {}) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.angle = angle;
        this.container = container;

        // DOM要素を最初に生成
        this.element = document.createElement('div');

        // オプションから特殊フラグを取得
        this.isEnemyBullet = options.isEnemyBullet || false;
        this.element.className = this.isEnemyBullet ? 'enemy-bullet' : 'bullet';

        this.isPiercing = options.isPiercing || false;
        this.isHoming = options.isHoming || false;
        this.reflectCount = options.reflectCount || 0; // 残りバウンド回数
        this.piercingCount = options.piercingCount || 0;
        this.damage = options.damage || 10;

        // isPiercing の場合のサイズ上書きは bullet クラスのみに適用
        if (this.isPiercing && !this.isEnemyBullet) {
            this.element.style.width = '60px';
            this.element.style.height = '10px';
        } else if (!this.isEnemyBullet) {
            this.element.style.width = '20px';
            this.element.style.height = '4px';
        }
        // enemy-bullet のサイズは CSS で固定するので JS では触らない

        // トレイル用の過去座標履歴（最大10フレーム分）
        this.trail = [];
        this.trailMaxDuration = 167; // ms換算（60Hzの10フレーム相当）
        this._trailTick = 0;
    }

    // DOMにappendしてアクティブ化（プール利用時）
    activate(container) {
        if (!this.element.parentNode) {
            container.appendChild(this.element);
        }
    }

    // 状態をリセットしてプールに戻す準備
    reset(x, y, angle, speed, options = {}) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        // フラグを必ずリセット
        this.isEnemyBullet = options.isEnemyBullet || false;
        this.element.className = this.isEnemyBullet ? 'enemy-bullet' : 'bullet';

        this.isPiercing = options.isPiercing || false;
        this.isHoming = options.isHoming || false;
        this.reflectCount = options.reflectCount || 0;
        this.piercingCount = options.piercingCount || 0;
        this.damage = options.damage || 10;
        this.trail = [];
        this._trailTick = 0;

        // サイズをクラスに応じてリセット
        if (this.isEnemyBullet) {
            // enemy-bullet のサイズは CSS 固定、JS では触らない
            this.element.style.width = '';
            this.element.style.height = '';
        } else if (this.isPiercing) {
            this.element.style.width = '60px';
            this.element.style.height = '10px';
        } else {
            this.element.style.width = '20px';
            this.element.style.height = '4px';
        }
    }

    update(enemies = [], deltaTime = 16.67, bounds = { width: 9999, height: 9999 }) {
        const dt = deltaTime / 16.67; // 60fps基準での係数

        // ホーミング処理
        if (this.isHoming && enemies.length > 0) {
            // 最近傍の敵を探す
            let closestEnemy = null;
            let closestDist = Infinity;
            for (const enemy of enemies) {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestEnemy = enemy;
                }
            }

            if (closestEnemy) {
                // ステアリング計算
                const targetAngle = Math.atan2(closestEnemy.y - this.y, closestEnemy.x - this.x);
                const currentAngle = Math.atan2(this.vy, this.vx);

                // 角度差を -π 〜 π の範囲に正規化
                let angleDiff = targetAngle - currentAngle;
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                // 旋回量制限（0.08rad/frame）
                const steeringForce = 0.08 * dt;
                const turnAmount = Math.max(-steeringForce, Math.min(steeringForce, angleDiff));

                // 新しい角度を計算
                const newAngle = currentAngle + turnAmount;
                this.angle = newAngle;
                this.vx = Math.cos(newAngle) * this.speed;
                this.vy = Math.sin(newAngle) * this.speed;
            }
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // バウンド処理（反射カード）
        if (this.reflectCount > 0) {
            if (this.x < 0 || this.x > bounds.width) {
                this.vx *= -1;
                this.reflectCount--;
            }
            if (this.y < 0 || this.y > bounds.height) {
                this.vy *= -1;
                this.reflectCount--;
            }
        }

        // 1フレームおきにトレイル履歴を更新
        this.trail.push({ x: this.x, y: this.y, t: performance.now() });
        const cutoff = performance.now() - this.trailMaxDuration;
        while (this.trail.length > 0 && this.trail[0].t < cutoff) {
            this.trail.shift();
        }
    }

    isOffScreen(bounds) {
        if (this.reflectCount > 0) return false;
        return (this.x < -100 || this.x > bounds.width + 100 || this.y < -100 || this.y > bounds.height + 100);
    }

    spawnAfterimage(container) {
        if (!this.isEnemyBullet) return;
        const ghost = document.createElement('div');
        ghost.className = 'enemy-bullet-ghost';
        ghost.style.transform = this.element.style.transform;
        container.appendChild(ghost);
        // 100ms後に自動削除
        setTimeout(() => {
            if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
        }, 100);
    }

    destroy() {
        if (this.element.parentNode) {
            this.container.removeChild(this.element);
        }
    }

    draw() {
        if (this.isPiercing && !this.isEnemyBullet) {
            this.element.style.transform = `translate(${this.x - 30}px, ${this.y - 5}px) rotate(${this.angle}rad)`;
        } else if (this.isEnemyBullet) {
            this.element.style.transform = `translate(${this.x - 5}px, ${this.y - 5}px) rotate(${this.angle}rad)`;
        } else {
            this.element.style.transform = `translate(${this.x - 10}px, ${this.y - 2}px) rotate(${this.angle}rad)`;
        }
    }
}
