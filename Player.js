export class Player {
    constructor() {
        this.element = document.getElementById('player');
        this.x = window.innerWidth / 2;
        this.y = window.innerHeight / 2;
        this.vx = 0;
        this.vy = 0;
        this.acceleration = 0.8;
        this.maxSpeed = 8;
        this.friction = 0.88;
        this.radius = 20;
    }

    update(keys, bounds) {
        let ax = 0;
        let ay = 0;

        if (keys.w) ay -= 1;
        if (keys.s) ay += 1;
        if (keys.a) ax -= 1;
        if (keys.d) ax += 1;

        if (ax !== 0 && ay !== 0) {
            const length = Math.sqrt(ax * ax + ay * ay);
            ax /= length;
            ay /= length;
        }

        this.vx += ax * this.acceleration;
        this.vy += ay * this.acceleration;
        this.vx *= this.friction;
        this.vy *= this.friction;

        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.maxSpeed) {
            this.vx = (this.vx / speed) * this.maxSpeed;
            this.vy = (this.vy / speed) * this.maxSpeed;
        }

        this.x += this.vx;
        this.y += this.vy;

        if (this.x < this.radius) { this.x = this.radius; this.vx = 0; }
        else if (this.x > bounds.width - this.radius) { this.x = bounds.width - this.radius; this.vx = 0; }
        if (this.y < this.radius) { this.y = this.radius; this.vy = 0; }
        else if (this.y > bounds.height - this.radius) { this.y = bounds.height - this.radius; this.vy = 0; }
    }

    onHit() {
        this.element.style.borderColor = '#ff0055';
        this.element.style.boxShadow = '0 0 20px #ff0055';
        setTimeout(() => {
            this.element.style.borderColor = '#00ffff';
            this.element.style.boxShadow = '0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 40px #00ffff, inset 0 0 10px #00ffff';
        }, 100);
    }

    draw() {
        this.element.style.transform = `translate(${this.x - this.radius}px, ${this.y - this.radius}px)`;
    }
}
