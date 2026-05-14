// EnemyDrone - 直進型の敵

export class EnemyDrone {
    constructor(container, bounds) {
        this.container = container;
        this.radius = 14;
        this.speed = 2;
        this.hp = 10;

        const side = Math.floor(Math.random() * 4);
        const padding = 50;
        if (side === 0) { this.x = Math.random() * bounds.width; this.y = -padding; }
        else if (side === 1) { this.x = bounds.width + padding; this.y = Math.random() * bounds.height; }
        else if (side === 2) { this.x = Math.random() * bounds.width; this.y = bounds.height + padding; }
        else { this.x = -padding; this.y = Math.random() * bounds.height; }

        // 出現した辺に応じて移動方向を4方向に固定
        if (side === 0) { this.vx = 0; this.vy = 1; }       // 上辺 → 下へ
        else if (side === 1) { this.vx = -1; this.vy = 0; } // 右辺 → 左へ
        else if (side === 2) { this.vx = 0; this.vy = -1; } // 下辺 → 上へ
        else { this.vx = 1; this.vy = 0; }                  // 左辺 → 右へ

        // ジグザグ用プロパティ
        this.isZigzag = false;
        this.zigzagPhase = Math.random() * Math.PI * 2;
        this.zigzagAmplitude = 2;
        this.zigzagFrequency = 0.05;

        this.element = document.createElement('div');
        this.element.className = 'enemy';
        this.container.appendChild(this.element);
    }

    update(deltaTime = 16.67) {
        const dt = deltaTime / 16.67;

        if (this.isZigzag) {
            this.zigzagPhase += this.zigzagFrequency * dt;
            const perpX = -this.vy;
            const perpY = this.vx;
            const wave = Math.sin(this.zigzagPhase) * this.zigzagAmplitude;
            this.x += (this.vx * this.speed + perpX * wave) * dt;
            this.y += (this.vy * this.speed + perpY * wave) * dt;
        } else {
            this.x += this.vx * this.speed * dt;
            this.y += this.vy * this.speed * dt;
        }
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
        this.element.style.transform = `translate(${this.x - 14}px, ${this.y - 14}px)`;
    }
}
