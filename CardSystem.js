export const MAIN_NODES = {
  shotgun: {
    id: 'shotgun',
    name: 'SHOTGUN',
    description: '5発扇状発射\n弾速低下・連射低下',
    type: 'main',
    tier: 0,
    color: '#ffff00'
  },
  sniper: {
    id: 'sniper',
    name: 'SNIPER',
    description: '超高速貫通弾\n連射大幅低下',
    type: 'main',
    tier: 0,
    color: '#ffff00'
  },
  homing: {
    id: 'homing',
    name: 'HOMING',
    description: '最近敵へ追尾\nやや連射低下',
    type: 'main',
    tier: 0,
    color: '#ffff00'
  }
};

export const SUB_NODE_POOL = {
  // tier 1
  move_speed_1: {
    id: 'move_speed_1',
    name: '移動速度強化',
    description: '移動速度 +8%',
    effectType: 'move_speed',
    effectValue: 0.08,
    tier: 1,
    type: 'sub',
    isMutated: false,
    color: '#00ffff'
  },
  bullet_speed_1: {
    id: 'bullet_speed_1',
    name: '弾速強化',
    description: '弾速 +8%',
    effectType: 'bullet_speed',
    effectValue: 0.08,
    tier: 1,
    type: 'sub',
    isMutated: false,
    color: '#ffff00'
  },
  fire_rate_1: {
    id: 'fire_rate_1',
    name: '連射速度強化',
    description: '連射速度 +5%',
    effectType: 'fire_rate',
    effectValue: 0.05,
    tier: 1,
    type: 'sub',
    isMutated: false,
    color: '#ff00ff'
  },
  multi_shot_1: {
    id: 'multi_shot_1',
    name: 'マルチショット',
    description: 'マルチショット確率 +15%',
    effectType: 'multi_shot',
    effectValue: 0.15,
    tier: 1,
    type: 'sub',
    isMutated: false,
    color: '#00ff00'
  },

  // tier 2
  move_speed_2: {
    id: 'move_speed_2',
    name: '移動速度強化 II',
    description: '移動速度 +12%',
    effectType: 'move_speed',
    effectValue: 0.12,
    tier: 2,
    type: 'sub',
    isMutated: false,
    color: '#00ffff'
  },
  bullet_speed_2: {
    id: 'bullet_speed_2',
    name: '弾速強化 II',
    description: '弾速 +12%',
    effectType: 'bullet_speed',
    effectValue: 0.12,
    tier: 2,
    type: 'sub',
    isMutated: false,
    color: '#ffff00'
  },
  fire_rate_2: {
    id: 'fire_rate_2',
    name: '連射速度強化 II',
    description: '連射速度 +8%',
    effectType: 'fire_rate',
    effectValue: 0.08,
    tier: 2,
    type: 'sub',
    isMutated: false,
    color: '#ff00ff'
  },
  multi_shot_2: {
    id: 'multi_shot_2',
    name: 'マルチショット II',
    description: 'マルチショット確率 +20%',
    effectType: 'multi_shot',
    effectValue: 0.20,
    tier: 2,
    type: 'sub',
    isMutated: false,
    color: '#00ff00'
  },
  reflect_1: {
    id: 'reflect_1',
    name: '反射',
    description: '弾が画面端を1回バウンド',
    effectType: 'reflect',
    effectValue: 1,
    tier: 2,
    type: 'sub',
    isMutated: false,
    color: '#00ffff'
  },
  piercing_1: {
    id: 'piercing_1',
    name: '貫通',
    description: '弾が敵を貫通',
    effectType: 'piercing',
    effectValue: 1,
    tier: 2,
    type: 'sub',
    isMutated: false,
    color: '#00ffff'
  },

  // tier 3
  move_speed_3: {
    id: 'move_speed_3',
    name: '移動速度強化 III',
    description: '移動速度 +20%',
    effectType: 'move_speed',
    effectValue: 0.20,
    tier: 3,
    type: 'sub',
    isMutated: false,
    color: '#00ffff'
  },
  bullet_speed_3: {
    id: 'bullet_speed_3',
    name: '弾速強化 III',
    description: '弾速 +20%',
    effectType: 'bullet_speed',
    effectValue: 0.20,
    tier: 3,
    type: 'sub',
    isMutated: false,
    color: '#ffff00'
  },
  fire_rate_3: {
    id: 'fire_rate_3',
    name: '連射速度強化 III',
    description: '連射速度 +12%',
    effectType: 'fire_rate',
    effectValue: 0.12,
    tier: 3,
    type: 'sub',
    isMutated: false,
    color: '#ff00ff'
  },
  multi_shot_3: {
    id: 'multi_shot_3',
    name: 'マルチショット III',
    description: 'マルチショット確率 +30%',
    effectType: 'multi_shot',
    effectValue: 0.30,
    tier: 3,
    type: 'sub',
    isMutated: false,
    color: '#00ff00'
  },
  reflect_2: {
    id: 'reflect_2',
    name: '反射 II',
    description: 'バウンド回数 +1',
    effectType: 'reflect',
    effectValue: 1,
    tier: 3,
    type: 'sub',
    isMutated: false,
    color: '#00ffff'
  },
  piercing_2: {
    id: 'piercing_2',
    name: '貫通 II',
    description: '貫通数 +1',
    effectType: 'piercing',
    effectValue: 1,
    tier: 3,
    type: 'sub',
    isMutated: false,
    color: '#00ffff'
  },

  // tier 4
  move_speed_max: {
    id: 'move_speed_max',
    name: '移動速度強化 MAX',
    description: '移動速度 +35%',
    effectType: 'move_speed',
    effectValue: 0.35,
    tier: 4,
    type: 'sub',
    isMutated: false,
    color: '#00ffff'
  },
  bullet_speed_max: {
    id: 'bullet_speed_max',
    name: '弾速強化 MAX',
    description: '弾速 +35%',
    effectType: 'bullet_speed',
    effectValue: 0.35,
    tier: 4,
    type: 'sub',
    isMutated: false,
    color: '#ffff00'
  },
  fire_rate_max: {
    id: 'fire_rate_max',
    name: '連射速度強化 MAX',
    description: '連射速度 +20%',
    effectType: 'fire_rate',
    effectValue: 0.20,
    tier: 4,
    type: 'sub',
    isMutated: false,
    color: '#ff00ff'
  },
  multi_shot_max: {
    id: 'multi_shot_max',
    name: 'マルチショット MAX',
    description: 'マルチショット確率 +50%',
    effectType: 'multi_shot',
    effectValue: 0.50,
    tier: 4,
    type: 'sub',
    isMutated: false,
    color: '#00ff00'
  }
};

export class SkillTreeSystem {
  constructor() {
    this.acquiredNodes = [];
    this.availableNodes = [];
    this.sp = 0;
    this.mainNodeSelected = false;
    this.equippedMainCard = null;
    this.currentTier = 0;
  }

  addSP(amount) {
    this.sp += amount;
  }

  refreshAvailableNodes() {
    this.availableNodes = [];

    if (!this.mainNodeSelected) {
      // メインノード選択フェーズ
      this.availableNodes = Object.values(MAIN_NODES).map(node => ({ ...node }));
    } else {
      // サブノード選択フェーズ：currentTier+1のノードを3〜4個抽選
      const nextTier = this.currentTier + 1;
      const candidateNodes = Object.values(SUB_NODE_POOL).filter(
        node => node.tier === nextTier
      );

      if (candidateNodes.length === 0) return;

      // 3〜4個を抽選
      const selectCount = Math.random() < 0.5 ? 3 : 4;
      const shuffled = [...candidateNodes].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(selectCount, shuffled.length));

      // 25%確率で変異版に変換
      for (const node of selected) {
        if (Math.random() < 0.25) {
          const mutationMultiplier = Math.random() * 0.5 + 1.5;
          const mutatedValue = parseFloat((node.effectValue * mutationMultiplier).toFixed(2));
          this.availableNodes.push({
            ...node,
            isMutated: true,
            name: node.name + ' ★',
            effectValue: mutatedValue,
            color: '#ff00ff'
          });
        } else {
          this.availableNodes.push({ ...node });
        }
      }
    }
  }

  acquireNode(nodeId) {
    if (this.sp < 1) {
      return false;
    }

    // ノードを取得（availableNodesから検索）
    const selectedNode = this.availableNodes.find(n => n.id === nodeId);
    if (!selectedNode) {
      return false;
    }

    // SP消費
    this.sp -= 1;

    // ノードを acquiredNodes に追加
    this.acquiredNodes.push({ ...selectedNode });

    // メインノード取得時の処理
    if (MAIN_NODES[nodeId]) {
      this.mainNodeSelected = true;
      this.equippedMainCard = MAIN_NODES[nodeId];
    }

    // currentTier を更新
    this.currentTier = Math.max(
      ...this.acquiredNodes
        .filter(n => n.type === 'sub')
        .map(n => n.tier),
      0
    );

    this.refreshAvailableNodes();
    return true;
  }

  getBuildData() {
    return this.acquiredNodes
      .filter(n => n.type === 'sub')
      .map(n => ({
        id: n.effectType,
        effectValue: n.effectValue
      }));
  }

  reset() {
    this.acquiredNodes = [];
    this.availableNodes = [];
    this.sp = 0;
    this.mainNodeSelected = false;
    this.equippedMainCard = null;
    this.currentTier = 0;
  }
}
