export class ImpactEffect {
    constructor(x, y, container, options = {}) {
        this.x = x;
        this.y = y;
        this.container = container;
        this.baseAngle = options.angle ?? 0;
        this.particles = [];

        // ラッパーdiv作成
        this.element = document.createElement('div');
        this.element.className = 'impact-wrapper';
        this.element.style.cssText = 'position:absolute; top:0; left:0; width:0; height:0; pointer-events:none;';
        this.element.style.transform = `translate(${x}px, ${y}px)`;
        this.container.appendChild(this.element);

        // パーティクル 8〜12個を生成
        const particleCount = Math.floor(Math.random() * 5) + 8;
        const centerAngle = this.baseAngle + Math.PI; // 反対方向
        const spreadAngle = Math.PI / 3; // ±60度

        for (let i = 0; i < particleCount; i++) {
            const angle = centerAngle + (Math.random() - 0.5) * 2 * spreadAngle;
            const speed = Math.random() * 160 + 120;
            const size = Math.floor(Math.random() * 5) + 5;
            const life = Math.random() * 100 + 150;

            const particle = {
                el: document.createElement('div'),
                x: 0,
                y: 0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size,
                life,
                maxLife: life,
                rotation: Math.random() * 360,
                rotationSpeed: Math.random() * 12 + 6
            };

            particle.el.className = 'impact-particle-sq';
            particle.el.style.width = `${size}px`;
            particle.el.style.height = `${size}px`;

            this.element.appendChild(particle.el);
            this.particles.push(particle);
        }
    }

    update(deltaTime) {
        let allDead = true;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= deltaTime;

            if (p.life <= 0) {
                p.el.remove();
                this.particles.splice(i, 1);
            } else {
                allDead = false;

                // 位置更新
                p.x += p.vx * deltaTime / 1000;
                p.y += p.vy * deltaTime / 1000;

                // 摩擦
                p.vx *= 0.90;
                p.vy *= 0.90;

                // 回転更新
                p.rotation += p.rotationSpeed;

                // opacity
                const opacity = p.life / p.maxLife;

                // transform更新
                p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rotation}deg)`;
                p.el.style.opacity = opacity;
            }
        }

        return allDead;
    }

    destroy() {
        for (const p of this.particles) {
            p.el.remove();
        }
        if (this.element.parentNode) {
            this.container.removeChild(this.element);
        }
    }
}
