export class EnemyShooter {
    constructor(container, bounds, playerX, playerY) {
        this.container = container;
        this.radius = 16;
        this.speed = 0;  // 静止
        this.hp = 20;

        // 出現位置（画面外4辺からランダム）
        const side = Math.floor(Math.random() * 4);
        const padding = 50;
        if (side === 0) { this.x = Math.random() * bounds.width; this.y = -padding; }
        else if (side === 1) { this.x = bounds.width + padding; this.y = Math.random() * bounds.height; }
        else if (side === 2) { this.x = Math.random() * bounds.width; this.y = bounds.height + padding; }
        else { this.x = -padding; this.y = Math.random() * bounds.height; }

        // 出現時にプレイヤー方向を向いて固定
        this.angle = Math.atan2(playerY - this.y, playerX - this.x);

        // 移動関連プロパティ
        this.moveSpeed = 4;
        this.isDecelerating = false;
        this.decelerateTimer = 0;
        this.decelerateDuration = 1000; // 1秒かけて減速
        this.initialMoveSpeed = 4;

        // 発射タイマー（最初の発射は5秒後）
        this.fireTimer = 5000;

        // DOM生成
        this.element = document.createElement('div');
        this.element.className = 'enemy-shooter';
        this.element.style.transform = `rotate(${this.angle}rad)`;
        this.container.appendChild(this.element);
    }

    update(deltaTime) {
        const dt = deltaTime / 16.67;

        if (this.isDecelerating) {
            // 1秒かけて減速
            this.decelerateTimer += deltaTime;
            const progress = Math.min(this.decelerateTimer / this.decelerateDuration, 1);
            this.moveSpeed = this.initialMoveSpeed * (1 - progress);
        } else {
            // 画面内に入ったか判定
            if (
                this.x > 0 && this.x < this.container.offsetWidth &&
                this.y > 0 && this.y < this.container.offsetHeight
            ) {
                this.isDecelerating = true;
            }
        }

        // スポーン時の向き（this.angle）方向へ前進
        this.x += Math.cos(this.angle) * this.moveSpeed * dt;
        this.y += Math.sin(this.angle) * this.moveSpeed * dt;

        // 発射タイマーは停止後のみカウント
        if (this.moveSpeed <= 0) {
            this.fireTimer -= deltaTime;
        }
    }

    // 発射タイミングかどうかを返す
    shouldFire() {
        if (this.fireTimer <= 0) {
            this.fireTimer = 5000;
            return true;
        }
        return false;
    }

    // 弾の発射起点（三角形の先端）
    getMuzzlePosition() {
        const tipOffset = 20;
        return {
            x: this.x + Math.cos(this.angle) * tipOffset,
            y: this.y + Math.sin(this.angle) * tipOffset
        };
    }

    isOffScreen(bounds) {
        const padding = 80;
        return (
            this.x < -padding || this.x > bounds.width + padding ||
            this.y < -padding || this.y > bounds.height + padding
        );
    }

    destroy() {
        if (this.element.parentNode) {
            this.container.removeChild(this.element);
        }
    }

    draw() {
        this.element.style.transform =
            `translate(${this.x - 16}px, ${this.y - 16}px) rotate(${this.angle + Math.PI / 2}rad)`;
    }
}
