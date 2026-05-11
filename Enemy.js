export class Enemy {
    constructor(container, bounds) {
        this.container = container;
        this.radius = 14;
        this.speed = 2;
        
        const side = Math.floor(Math.random() * 4);
        const padding = 50;
        if (side === 0) { this.x = Math.random() * bounds.width; this.y = -padding; }
        else if (side === 1) { this.x = bounds.width + padding; this.y = Math.random() * bounds.height; }
        else if (side === 2) { this.x = Math.random() * bounds.width; this.y = bounds.height + padding; }
        else { this.x = -padding; this.y = Math.random() * bounds.height; }

        this.element = document.createElement('div');
        this.element.className = 'enemy';
        this.container.appendChild(this.element);
    }

    update(player, deltaTime = 16.67) {
        const dt = deltaTime / 16.67; // 60fps基準での係数
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
        }
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
