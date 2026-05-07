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
        this.isPiercing = options.isPiercing || false;
        this.isHoming = options.isHoming || false;

        this.element = document.createElement('div');
        this.element.className = 'bullet';
        this.container.appendChild(this.element);
    }

    update(enemies = []) {
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
                const steeringForce = 0.08;
                const turnAmount = Math.max(-steeringForce, Math.min(steeringForce, angleDiff));

                // 新しい角度を計算
                const newAngle = currentAngle + turnAmount;
                this.angle = newAngle;
                this.vx = Math.cos(newAngle) * this.speed;
                this.vy = Math.sin(newAngle) * this.speed;
            }
        }

        this.x += this.vx;
        this.y += this.vy;
    }

    isOffScreen(bounds) {
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
