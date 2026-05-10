export class ParticleSystem {
    constructor(container) {
        this.container = container;
        this.particles = [];
    }

    spawnEnemyDeathParticles(x, y, hitAngle, container) {
        const particleCount = Math.floor(Math.random() * 5) + 6; // 6〜10個
        const baseAngle = hitAngle;

        for (let i = 0; i < particleCount; i++) {
            // ±60度のランダムなばらつき
            const spread = (Math.random() - 0.5) * (Math.PI / 3);
            const angle = baseAngle + spread;
            const speed = Math.random() * 6 + 4; // 4〜10 px/frame
            const size = Math.floor(Math.random() * 7) + 6; // 6〜12px
            const initialRotation = Math.random() * 360;
            const rotationSpeed = Math.random() * 10 + 5; // 5〜15deg per frame

            const el = document.createElement('div');
            el.className = 'particle-square';
            el.style.width = `${size}px`;
            el.style.height = `${size}px`;
            el.style.border = `3px solid #ff0055`;
            el.style.backgroundColor = 'transparent';
            el.style.boxShadow = `0 0 6px #ff0055, 0 0 12px #ff0055, 0 0 24px #ff0055`;
            el.style.filter = 'blur(0.5px)';
            el.style.transform = `translate(${x}px, ${y}px) rotate(${initialRotation}deg) scale(1)`;
            container.appendChild(el);

            this.particles.push({
                el,
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size,
                rotation: initialRotation,
                rotationSpeed,
                scale: 1.0
            });
        }
    }

    update(deltaTime) {
        const dt = deltaTime / 16.67; // 60fps基準での係数

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.scale -= dt * 0.03;

            if (p.scale <= 0) {
                p.el.remove();
                this.particles.splice(i, 1);
            } else {
                // 位置更新
                p.vx *= 0.92; // 減衰
                p.vy *= 0.92;
                p.x += p.vx * dt;
                p.y += p.vy * dt;

                // 回転更新
                p.rotation += p.rotationSpeed * dt;

                // DOM更新
                p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rotation}deg) scale(${p.scale})`;
            }
        }
    }

    clear() {
        for (const p of this.particles) {
            p.el.remove();
        }
        this.particles = [];
    }
}
