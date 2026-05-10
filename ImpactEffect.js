export class ImpactEffect {
    constructor(x, y, container, options = {}) {
        this.x = x;
        this.y = y;
        this.container = container;
        this.lifetime = options.lifetime || 300; // ms
        this.elapsed = 0;
        this.color = options.color || '#00ffff';
        this.scale = options.scale || 1.0;

        this.element = document.createElement('div');
        this.element.className = 'impact-effect';
        this.element.style.setProperty('--impact-color', this.color);
        this.container.appendChild(this.element);

        // パーティクル（放射状の小さな線）を4〜6本生成
        const particleCount = options.particleCount || 5;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'impact-particle';
            const angle = (i / particleCount) * 360;
            particle.style.setProperty('--angle', `${angle}deg`);
            particle.style.setProperty('--impact-color', this.color);
            this.element.appendChild(particle);
        }

        this.element.style.transform = `translate(${x}px, ${y}px) scale(${this.scale})`;
    }

    update(deltaTime) {
        this.elapsed += deltaTime;
        const progress = this.elapsed / this.lifetime; // 0〜1
        const opacity = 1 - progress;
        this.element.style.opacity = opacity;
        return progress >= 1; // trueで破棄
    }

    destroy() {
        if (this.element.parentNode) {
            this.container.removeChild(this.element);
        }
    }
}
