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

        // 停止目標座標
        const margin = 100; // 画面端からの余白
        this.targetX = margin + Math.random() * (bounds.width - margin * 2);
        this.targetY = margin + Math.random() * (bounds.height - margin * 2);
        this.isMoving = true; // 移動中フラグ
        this.moveSpeed = 3;   // 移動速度

        // 発射タイマー（最初の発射は5秒後）
        this.fireTimer = 5000;

        // DOM生成
        this.element = document.createElement('div');
        this.element.className = 'enemy-shooter';
        this.element.style.transform = `rotate(${this.angle}rad)`;
        this.container.appendChild(this.element);
    }

    update(deltaTime) {
        if (this.isMoving) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 4) {
                this.x = this.targetX;
                this.y = this.targetY;
                this.isMoving = false;
            } else {
                const dt = deltaTime / 16.67;
                this.x += (dx / dist) * this.moveSpeed * dt;
                this.y += (dy / dist) * this.moveSpeed * dt;
            }
        }
        if (!this.isMoving) {
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
