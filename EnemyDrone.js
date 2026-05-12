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

        // 移動方向を生成時に固定
        const centerX = bounds.width / 2;
        const centerY = bounds.height / 2;
        const baseAngle = Math.atan2(centerY - this.y, centerX - this.x);
        const spread = (Math.random() - 0.5) * (Math.PI / 3); // ±30度
        const angle = baseAngle + spread;
        this.vx = Math.cos(angle);
        this.vy = Math.sin(angle);

        this.element = document.createElement('div');
        this.element.className = 'enemy';
        this.container.appendChild(this.element);
    }

    update(deltaTime = 16.67) {
        const dt = deltaTime / 16.67;
        this.x += this.vx * this.speed * dt;
        this.y += this.vy * this.speed * dt;
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
