import type { EnemyTemplate, MapLayer, EventState } from '../types/game';

/** All enemy templates in the game */
export const ENEMY_TEMPLATES: EnemyTemplate[] = [
  // === Layer 1: Shadow Forest ===
  {
    id: 'goblin',
    name: '哥林',
    maxHp: 28,
    emoji: '👺',
    moves: [
      { type: 'attack', value: 6, description: '挥砍' },
      { type: 'attack', value: 9, description: '猛击' },
      { type: 'defend', value: 4, description: '缩避' },
      { type: 'attack', value: 4, description: '毒镖', statusEffect: { type: 'poison', value: 2 } },
    ],
  },
  {
    id: 'skeleton',
    name: '骷髅兵',
    maxHp: 35,
    emoji: '💀',
    moves: [
      { type: 'attack', value: 8, description: '骨刺' },
      { type: 'attack', value: 5, description: '连刺' },
      { type: 'defend', value: 6, description: '骨盾' },
    ],
  },

  // === Layer 1 Extra ===
  {
    id: 'wolf',
    name: '狼',
    maxHp: 22,
    emoji: '🐺',
    moves: [
      { type: 'attack', value: 7, description: '撕咬' },
      { type: 'buff', value: 2, description: '嚎叫' },
      { type: 'attack', value: 10, description: '猛扑' },
    ],
  },
  {
    id: 'forest_spirit',
    name: '森林精灵',
    maxHp: 18,
    emoji: '🌿',
    moves: [
      { type: 'heal', value: 6, description: '自然治愈' },
      { type: 'defend', value: 4, description: '树皮护盾' },
      { type: 'attack', value: 3, description: '毒触', statusEffect: { type: 'poison', value: 2 } },
    ],
  },

  // === Layer 2: Lava Cavern ===
  {
    id: 'shadow_knight',
    name: '暗影骑士',
    maxHp: 52,
    emoji: '⚔️',
    moves: [
      { type: 'attack', value: 10, description: '暗影斩' },
      { type: 'attack', value: 16, description: '致命一击' },
      { type: 'buff', value: 2, description: '力量强化' },
      { type: 'defend', value: 8, description: '暗影盾' },
      { type: 'heal', value: 8, description: '暗影回复' },
    ],
  },
  {
    id: 'fire_mage',
    name: '火焰法师',
    maxHp: 42,
    emoji: '🔥',
    moves: [
      { type: 'attack', value: 12, description: '火球术' },
      { type: 'attack', value: 8, description: '灼烧' },
      { type: 'defend', value: 6, description: '火焰护盾' },
    ],
  },
  {
    id: 'shadow_priest',
    name: '暗影牧师',
    maxHp: 40,
    emoji: '🧙‍♂️',
    moves: [
      { type: 'attack', value: 6, description: '暗影触手' },
      { type: 'heal', value: 10, description: '黑暗治愈' },
      { type: 'defend', value: 5, description: '暗影屏障' },
    ],
  },
  {
    id: 'necromancer',
    name: '死灵法师',
    maxHp: 48,
    emoji: '💀',
    moves: [
      { type: 'attack', value: 8, description: '灵魂收割' },
      { type: 'summon', value: 1, description: '召唤骷髅', summonId: 'skeleton' },
      { type: 'defend', value: 6, description: '白骨护盾' },
    ],
  },
  {
    id: 'lava_golem',
    name: '熔岩魔像',
    maxHp: 60,
    emoji: '🗿',
    moves: [
      { type: 'attack', value: 14, description: '重击' },
      { type: 'defend', value: 12, description: '熔岩护甲' },
      { type: 'attack', value: 18, description: '爆发' },
    ],
  },
  {
    id: 'fire_imp',
    name: '火焰小鬼',
    maxHp: 25,
    emoji: '😈',
    moves: [
      { type: 'attack', value: 9, description: '火焰弹' },
      { type: 'defend', value: 3, description: '闪避' },
      { type: 'attack', value: 7, description: '召唤同伴' },
    ],
  },

  // === Layer 3: Dragon's Lair ===
  {
    id: 'drake',
    name: '飞龙',
    maxHp: 45,
    emoji: '🦎',
    moves: [
      { type: 'attack', value: 10, description: '撕咬' },
      { type: 'attack', value: 14, description: '烈焰' },
      { type: 'defend', value: 8, description: '防御' },
    ],
  },
  {
    id: 'dragon_guardian',
    name: '龙卫',
    maxHp: 70,
    emoji: '🛡️',
    moves: [
      { type: 'attack', value: 12, description: '盾击' },
      { type: 'defend', value: 15, description: '固守' },
      { type: 'buff', value: 3, description: '战吼' },
    ],
  },
  {
    id: 'ancient_dragon',
    name: '远古巨龙',
    maxHp: 95,
    emoji: '🐉',
    immuneToFreeze: true,
    moves: [
      { type: 'attack', value: 12, description: '龙爪' },
      { type: 'attack', value: 20, description: '龙息' },
      { type: 'buff', value: 3, description: '愤怒咆哮' },
      { type: 'defend', value: 10, description: '龙鳞护体' },
      { type: 'summon', value: 1, description: '召唤幼龙', summonId: 'whelp' },
    ],
  },

  // === Summonable Enemies ===
  {
    id: 'whelp',
    name: '幼龙',
    maxHp: 20,
    emoji: '🐲',
    moves: [
      { type: 'attack', value: 5, description: '撕咬' },
      { type: 'attack', value: 8, description: '火焰吐息' },
    ],
  },
];

/** Map layer definitions */
export const MAP_LAYERS: MapLayer[] = [
  {
    name: '暗影森林',
    subtitle: 'Shadow Forest',
    nodes: [
      { type: 'battle', enemyTemplateId: 'wolf', defeated: false },
      { type: 'battle', enemyTemplateId: 'forest_spirit', defeated: false },
      { type: 'battle', enemyTemplateId: 'goblin', defeated: false },
      { type: 'event', defeated: false },
      { type: 'elite', enemyTemplateId: 'skeleton', defeated: false },
      { type: 'battle', enemyTemplateId: 'shadow_knight', defeated: false },
    ],
    columns: [
      [
        { type: 'battle', enemyTemplateId: 'wolf', defeated: false },
        { type: 'battle', enemyTemplateId: 'forest_spirit', defeated: false },
      ],
      [
        { type: 'battle', enemyTemplateId: 'goblin', defeated: false },
        { type: 'event', defeated: false },
      ],
      [
        { type: 'elite', enemyTemplateId: 'skeleton', defeated: false },
      ],
      [
        { type: 'battle', enemyTemplateId: 'shadow_knight', defeated: false },
      ],
    ],
    unlocked: true,
  },
  {
    name: '熔岩洞窟',
    subtitle: 'Lava Cavern',
    nodes: [
      { type: 'battle', enemyTemplateId: 'fire_imp', defeated: false },
      { type: 'battle', enemyTemplateId: 'fire_mage', defeated: false },
      { type: 'shop', defeated: false },
      { type: 'event', defeated: false },
      { type: 'battle', enemyTemplateId: 'shadow_priest', defeated: false },
      { type: 'battle', enemyTemplateId: 'lava_golem', defeated: false },
      { type: 'elite', enemyTemplateId: 'necromancer', defeated: false },
    ],
    columns: [
      [
        { type: 'battle', enemyTemplateId: 'fire_imp', defeated: false },
        { type: 'battle', enemyTemplateId: 'fire_mage', defeated: false },
      ],
      [
        { type: 'shop', defeated: false },
        { type: 'event', defeated: false },
      ],
      [
        { type: 'battle', enemyTemplateId: 'shadow_priest', defeated: false },
        { type: 'battle', enemyTemplateId: 'lava_golem', defeated: false },
      ],
      [
        { type: 'elite', enemyTemplateId: 'necromancer', defeated: false },
      ],
    ],
    unlocked: false,
  },
  {
    name: '龙之巢穴',
    subtitle: "Dragon's Lair",
    nodes: [
      { type: 'rest', defeated: false },
      { type: 'battle', enemyTemplateId: 'drake', defeated: false },
      { type: 'elite', enemyTemplateId: 'dragon_guardian', defeated: false },
      { type: 'battle', enemyTemplateId: 'ancient_dragon', defeated: false },
    ],
    columns: [
      [
        { type: 'rest', defeated: false },
        { type: 'battle', enemyTemplateId: 'drake', defeated: false },
      ],
      [
        { type: 'elite', enemyTemplateId: 'dragon_guardian', defeated: false },
      ],
      [
        { type: 'battle', enemyTemplateId: 'ancient_dragon', defeated: false },
      ],
    ],
    unlocked: false,
  },
];

/** Predefined events for event nodes */
export const MAP_EVENTS: EventState[] = [
  {
    title: '神秘商人',
    description: '一个戴面具的商人从阴影中走出。',
    emoji: '🎩',
    choices: [
      { text: '交易 (失去5HP, 获得稀有卡)', effect: 'damage', value: 5 },
      { text: '离开', effect: 'heal', value: 0 },
    ],
  },
  {
    title: '诅咒祭坛',
    description: '一座散发暗光的祭坛，上面刻着古老符文。',
    emoji: '⚗️',
    choices: [
      { text: '献祭 (移除1张牌)', effect: 'removeCard', value: 1 },
      { text: '祈祷 (恢复10HP)', effect: 'heal', value: 10 },
      { text: '离开', effect: 'heal', value: 0 },
    ],
  },
  {
    title: '古代宝箱',
    description: '你发现了一个落满灰尘的宝箱。',
    emoji: '📦',
    choices: [
      { text: '打开 (50%获得80金, 50%失去10HP)', effect: 'gold', value: 80 },
      { text: '离开', effect: 'heal', value: 0 },
    ],
  },
  {
    title: '治愈之泉',
    description: '清澈的泉水散发着柔和的光芒。',
    emoji: '💧',
    choices: [
      { text: '饮用 (恢复15HP)', effect: 'heal', value: 15 },
      { text: '浸泡武器 (获得2点力量, 失去5HP)', effect: 'strength', value: 2 },
    ],
  },
];

/** Get an enemy template by ID */
export function getEnemyTemplate(templateId: string): EnemyTemplate | undefined {
  return ENEMY_TEMPLATES.find(t => t.id === templateId);
}
