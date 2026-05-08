export class Bullet {
    constructor(x, y, angle, container, speed = 15, options = {}) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.angle = angle;
        this.container = container;

        // オプションから特殊フラグを取得
        this.isPiercing = options.isPiercing || (options.piercingCount > 0) || false;
        this.isHoming = options.isHoming || false;
        this.reflectCount = options.reflectCount || 0; // 残りバウンド回数
        this.piercingCount = options.piercingCount || 0;

        // トレイル用の過去座標履歴（最大10フレーム分）
        this.trail = [];
        this.trailMaxLength = 10;
        this._trailTick = 0;

        this.element = document.createElement('div');
        this.element.className = 'bullet';
        this.container.appendChild(this.element);
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
        this._trailTick++;
        if (this._trailTick % 2 === 0) {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > this.trailMaxLength) {
                this.trail.shift();
            }
        }
    }

    isOffScreen(bounds) {
        if (this.reflectCount > 0) return false;
        return (this.x < -100 || this.x > bounds.width + 100 || this.y < -100 || this.y > bounds.height + 100);
    }

    destroy() {
        if (this.element.parentNode) {
            this.container.removeChild(this.element);
        }
    }

    draw() {
        this.element.style.transform = `translate(${this.x - 10}px, ${this.y - 2}px) rotate(${this.angle}rad)`;
    }
}
