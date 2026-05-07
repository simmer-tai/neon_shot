import { Player } from './Player.js';
import { Bullet } from './Bullet.js';
import { Enemy } from './Enemy.js';

export class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.player = new Player();
        this.bullets = [];
        this.enemies = [];
        this.bounds = { width: window.innerWidth, height: window.innerHeight };
        this.keys = { w: false, a: false, s: false, d: false };
        this.lastSpawnTime = 0;
        this.spawnInterval = 1000;

        this.init();
    }

    init() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) this.keys[key] = true;
        });
        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) this.keys[key] = false;
        });
        window.addEventListener('resize', () => {
            this.bounds.width = window.innerWidth;
            this.bounds.height = window.innerHeight;
        });
        window.addEventListener('mousedown', (e) => {
            this.shoot(e.clientX, e.clientY);
        });

        this.update();
    }

    shoot(tx, ty) {
        const angle = Math.atan2(ty - this.player.y, tx - this.player.x);
        this.bullets.push(new Bullet(this.player.x, this.player.y, angle, this.container));
    }

    update() {
        this.player.update(this.keys, this.bounds);

        const now = Date.now();
        if (now - this.lastSpawnTime > this.spawnInterval) {
            this.enemies.push(new Enemy(this.container, this.bounds));
            this.lastSpawnTime = now;
        }

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.update();
            if (b.isOffScreen(this.bounds)) {
                b.destroy();
                this.bullets.splice(i, 1);
            }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(this.player);

            let hit = false;
            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const b = this.bullets[j];
                const dx = b.x - e.x;
                const dy = b.y - e.y;
                const distSq = dx * dx + dy * dy;
                const hitRadius = e.radius + 10;
                if (distSq < hitRadius * hitRadius) {
                    e.destroy();
                    this.enemies.splice(i, 1);
                    b.destroy();
                    this.bullets.splice(j, 1);
                    hit = true;
                    break;
                }
            }

            if (hit) continue;

            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const distSq = dx * dx + dy * dy;
            const hitRadius = e.radius + this.player.radius;
            if (distSq < hitRadius * hitRadius) {
                this.player.onHit();
                e.destroy();
                this.enemies.splice(i, 1);
            }
        }

        this.draw();
        requestAnimationFrame(() => this.update());
    }

    draw() {
        this.player.draw();
        this.bullets.forEach(b => b.draw());
        this.enemies.forEach(e => e.draw());
    }
}
