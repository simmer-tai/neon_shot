export class ImpactEffect {
    constructor(x, y, container, options = {}) {
        this.x = x;
        this.y = y;
        this.container = container;
        this.lifetime = options.lifetime || 450; // ms
        this.elapsed = 0;
        this.color = options.color || '#00ffff';
        this.scale = options.scale || 1.0;

        // ラッパーdiv作成
        this.element = document.createElement('div');
        this.element.className = 'impact-wrapper';
        this.element.style.cssText = 'position:absolute; top:0; left:0; width:0; height:0; pointer-events:none;';
        this.element.style.transform = `translate(${x}px, ${y}px)`;
        this.container.appendChild(this.element);

        // 衝撃波リング × 2
        for (let i = 0; i < 2; i++) {
            const ring = document.createElement('div');
            ring.className = 'impact-shockwave';
            ring.style.setProperty('--impact-color', this.color);
            this.element.appendChild(ring);
        }

        // スパークライン × 8（45度刻み）
        for (let i = 0; i < 8; i++) {
            const spark = document.createElement('div');
            spark.className = 'impact-spark';
            const angle = (i / 8) * 360;
            spark.style.setProperty('--angle', `${angle}deg`);
            spark.style.setProperty('--impact-color', this.color);
            this.element.appendChild(spark);
        }

        // コアフラッシュ × 1
        const core = document.createElement('div');
        core.className = 'impact-core';
        core.style.setProperty('--impact-color', this.color);
        this.element.appendChild(core);
    }

    update(deltaTime) {
        this.elapsed += deltaTime;
        const progress = this.elapsed / this.lifetime; // 0〜1
        const opacity = Math.pow(1 - progress, 0.5);
        this.element.style.opacity = opacity;
        return progress >= 1; // trueで破棄
    }

    destroy() {
        if (this.element.parentNode) {
            this.container.removeChild(this.element);
        }
    }
}
