export class Bullet {
    constructor(x, y, angle, container, speed = 15) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.angle = angle;
        this.container = container;
        
        this.element = document.createElement('div');
        this.element.className = 'bullet';
        this.container.appendChild(this.element);
    }

    update() {
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
