export class Player {
    constructor() {
        this.element = document.getElementById('player');
        this.x = window.innerWidth / 2;
        this.y = window.innerHeight / 2;
        this.vx = 0;
        this.vy = 0;
        
        // 基礎ステータス
        this.baseAcceleration = 0.8;
        this.baseMaxSpeed = 8;
        this.baseBulletSpeed = 15;
        this.baseFireRate = 200; // 発射間隔(ms)
        
        // 現在のステータス（カード補正後）
        this.acceleration = this.baseAcceleration;
        this.maxSpeed = this.baseMaxSpeed;
        this.bulletSpeed = this.baseBulletSpeed;
        this.fireRate = this.baseFireRate;
        this.multiShotChance = 0;

        this.friction = 0.88;    // 摩擦
        this.radius = 20;        // 半径
        
        this.hp = 3;             // HP
        this.isInvincible = false;
        this.invincibleDuration = 1500; // 1.5秒
        this.invincibleTimer = 0;
    }

    /**
     * 装備カードに基づいてステータスを再計算する
     * 式：最終値 = 基礎値 × (1 + 各カードの強化率の合計)
     */
    applyBuild(equippedCards) {
        let speedMod = 0;
        let bulletSpeedMod = 0;
        let fireRateMod = 0;
        let multiShotMod = 0;

        equippedCards.forEach(card => {
            if (!card) return;
            switch (card.id) {
                case 'move_speed': speedMod += card.effectValue; break;
                case 'bullet_speed': bulletSpeedMod += card.effectValue; break;
                case 'fire_rate': fireRateMod += card.effectValue; break;
                case 'multi_shot': multiShotMod += card.effectValue; break;
            }
        });

        this.maxSpeed = this.baseMaxSpeed * (1 + speedMod);
        this.acceleration = this.baseAcceleration * (1 + speedMod); // 加速度も同等に強化
        this.bulletSpeed = this.baseBulletSpeed * (1 + bulletSpeedMod);
        this.fireRate = this.baseFireRate / (1 + fireRateMod); // 間隔なので割り算で短縮
        this.multiShotChance = multiShotMod; // 確率はそのまま加算
    }

    update(keys, bounds, deltaTime) {
        const dt = deltaTime / 16.67; // 60fps基準での係数

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

        this.vx += ax * this.acceleration * dt;
        this.vy += ay * this.acceleration * dt;
        this.vx *= Math.pow(this.friction, dt);
        this.vy *= Math.pow(this.friction, dt);

        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.maxSpeed) {
            this.vx = (this.vx / speed) * this.maxSpeed;
            this.vy = (this.vy / speed) * this.maxSpeed;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        if (this.x < this.radius) { this.x = this.radius; this.vx = 0; }
        else if (this.x > bounds.width - this.radius) { this.x = bounds.width - this.radius; this.vx = 0; }
        if (this.y < this.radius) { this.y = this.radius; this.vy = 0; }
        else if (this.y > bounds.height - this.radius) { this.y = bounds.height - this.radius; this.vy = 0; }

        // 無敵時間の更新
        if (this.isInvincible) {
            this.invincibleTimer -= deltaTime;
            if (this.invincibleTimer <= 0) {
                this.isInvincible = false;
                this.element.classList.remove('invincible');
            }
        }
    }

    // ダメージ処理
    takeDamage() {
        if (this.isInvincible) return false;

        this.hp--;
        this.isInvincible = true;
        this.invincibleTimer = this.invincibleDuration;
        this.element.classList.add('invincible');

        // ダメージ時の赤フラッシュ
        this.element.style.borderColor = '#ff0055';
        this.element.style.boxShadow = '0 0 20px #ff0055';
        setTimeout(() => {
            if (!this.isInvincible) {
                this.element.style.borderColor = '#00ffff';
                this.element.style.boxShadow = '0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 40px #00ffff, inset 0 0 10px #00ffff';
            }
        }, 100);

        return true;
    }

    // リセット用
    reset(bounds) {
        this.hp = 3;
        this.x = bounds.width / 2;
        this.y = bounds.height / 2;
        this.vx = 0;
        this.vy = 0;
        this.isInvincible = false;
        this.invincibleTimer = 0;
        this.element.classList.remove('invincible');
        this.element.style.borderColor = '#00ffff';
        this.element.style.boxShadow = '0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 40px #00ffff, inset 0 0 10px #00ffff';
    }

    draw() {
        this.element.style.transform = `translate(${this.x - this.radius}px, ${this.y - this.radius}px)`;
    }
}
