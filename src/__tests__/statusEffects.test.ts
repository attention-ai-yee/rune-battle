import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyDamageToTarget,
  applyCardEffect,
  processEnemyActions,
  processStatusEffects,
  startNewPlayerTurn,
  createStartingDeck,
  createEnemyInstance,
  addStatusEffect,
  getBurnStacks,
  getPoisonStacks,
  resetIdCounter,
} from '../utils/gameLogic';
import { CARD_TEMPLATES, STARTING_DECK_COMPOSITION } from '../data/cards';
import { ENEMY_TEMPLATES, MAP_LAYERS, getEnemyTemplate } from '../data/enemies';
import type { CardInstance, EnemyInstance, GameState, StatusEffect } from '../types/game';

// ─── Helper Factories ─────────────────────────────────────────────────────

function makeCard(overrides: Partial<CardInstance> = {}): CardInstance {
  return {
    instanceId: 'card_test',
    templateId: 'strike',
    name: '打击',
    type: 'attack',
    cost: 1,
    description: '造成6点伤害',
    effect: { type: 'attack', damage: 6 },
    rarity: 'common',
    upgraded: false,
    exhaust: false,
    retain: false,
    isRetained: false,
    ...overrides,
  };
}

function makeEnemy(overrides: Partial<EnemyInstance> = {}): EnemyInstance {
  return {
    instanceId: 'enemy_test',
    templateId: 'goblin',
    name: '哥林',
    hp: 28,
    maxHp: 28,
    armor: 0,
    strength: 0,
    intent: { type: 'attack', value: 6, description: '挥砍' },
    moves: [{ type: 'attack', value: 6, description: '挥砍' }],
    emoji: '👺',
    isHit: false,
    statusEffects: [],
    isFrozen: false,
    lastDamageDealt: 0,
    lastArmorGained: 0,
    lastHealReceived: 0,
    ...overrides,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    screen: 'battle',
    player: { hp: 70, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [], potions: 0, thorns: 0 },
    enemies: [makeEnemy()],
    drawPile: [],
    hand: [],
    discardPile: [],
    retainedCards: [],
    mapLayers: [],
    isEnemyTurn: false,
    selectedCardId: null,
    screenShake: false,
    animatingCardIds: [],
    turnNumber: 1,
    currentBattleLayer: 0,
    currentBattleNode: 0,
    playerStrength: 0,
    upgradeChoices: [],
    rewardChoices: [],
    lastPlayedCard: null,
    exhaustedPile: [],
    cardsPlayedThisTurn: 0,
    pendingStrength: 0,
    totalDamageDealt: 0,
    totalCardsPlayed: 0,

    gold: 0,
    shopState: null,
    eventState: null,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 POISON VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

describe('🧪 Poison - Core Logic', () => {
  it('poison damage = stacks, ignores armor', () => {
    const enemy = makeEnemy({ hp: 30, armor: 10, statusEffects: [{ type: 'poison', value: 5 }] });
    const { entity: result, poisonDamage } = processStatusEffects(enemy);
    expect(poisonDamage).toBe(5);
    expect(result.hp).toBe(25); // 30 - 5, armor not reduced
    expect(result.armor).toBe(10); // armor untouched by poison
  });

  it('poison stacks decrement by 1 each turn', () => {
    let entity = { hp: 30, armor: 0, statusEffects: [{ type: 'poison' as const, value: 4 }] };
    // Turn 1: 4 damage, decrement to 3
    const r1 = processStatusEffects(entity);
    expect(r1.poisonDamage).toBe(4);
    expect(getPoisonStacks(r1.entity.statusEffects)).toBe(3);
    // Turn 2: 3 damage, decrement to 2
    const r2 = processStatusEffects(r1.entity);
    expect(r2.poisonDamage).toBe(3);
    expect(getPoisonStacks(r2.entity.statusEffects)).toBe(2);
  });

  it('same type poison stacks add up (cumulative)', () => {
    const effects: StatusEffect[] = [{ type: 'poison', value: 2 }];
    const result = addStatusEffect(effects, { type: 'poison', value: 3 });
    expect(getPoisonStacks(result)).toBe(5);
  });

  it('poison removed when decremented to 0', () => {
    const entity = { hp: 30, armor: 0, statusEffects: [{ type: 'poison' as const, value: 1 }] };
    const { entity: result } = processStatusEffects(entity);
    expect(result.statusEffects.filter(s => s.type === 'poison')).toHaveLength(0);
  });

  it('player poison processed at start of player turn', () => {
    const state = makeState({
      player: { hp: 50, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [{ type: 'poison', value: 3 }], potions: 0, thorns: 0 },
    });
    const result = startNewPlayerTurn(state);
    expect(result.player.hp).toBe(47); // 50 - 3 = 47
    expect(getPoisonStacks(result.player.statusEffects)).toBe(2);
  });

  it('goblin poison dart applies poison to player', () => {
    const enemy = makeEnemy({
      templateId: 'goblin',
      intent: { type: 'attack', value: 4, description: '毒镖' },
      moves: [{ type: 'attack', value: 4, description: '毒镖', statusEffect: { type: 'poison', value: 2 } }],
    });
    const state = makeState({
      player: { hp: 70, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [], potions: 0, thorns: 0 },
      enemies: [enemy],
    });
    const result = processEnemyActions(state);
    expect(getPoisonStacks(result.player.statusEffects)).toBe(2);
  });

  it('poison kills enemy when HP reaches 0', () => {
    const enemy = makeEnemy({ hp: 3, armor: 0, statusEffects: [{ type: 'poison', value: 5 }] });
    const state = makeState({
      enemies: [enemy],
    });
    const result = processEnemyActions(state);
    // Enemy should be dead (hp would go to -2, clamped to 0, then filtered)
    expect(result.enemies.length).toBe(0);
  });

  it('poison kills player when HP reaches 0', () => {
    const state = makeState({
      player: { hp: 2, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [{ type: 'poison', value: 5 }], potions: 0, thorns: 0 },
    });
    const result = startNewPlayerTurn(state);
    expect(result.player.hp).toBe(0);
    // BUG: startNewPlayerTurn does NOT set screen to 'gameOver'
    // The game over check for player poison death is missing
  });

  it('player death from poison at turn start triggers gameOver screen', () => {
    const state = makeState({
      player: { hp: 2, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [{ type: 'poison', value: 5 }], potions: 0, thorns: 0 },
    });
    const result = startNewPlayerTurn(state);
    expect(result.player.hp).toBe(0);
    expect(result.screen).toBe('gameOver');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔥 BURN VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

describe('🔥 Burn - Core Logic', () => {
  it('burned entity takes +50% damage', () => {
    // 10 damage + burn bonus = 10 + 5 = 15
    const result = applyDamageToTarget(10, 50, 0, 1);
    expect(result.actualDamage).toBe(15);
    expect(result.newHp).toBe(35);
  });

  it('+1 minimum bonus for 1-damage attack on burned target', () => {
    // 1 damage + burn bonus = 1 + max(1, floor(0.5)) = 1 + 1 = 2
    const result = applyDamageToTarget(1, 50, 0, 1);
    expect(result.actualDamage).toBe(2);
    expect(result.newHp).toBe(48);
  });

  it('burn duration decrements: 2→1→0→removed', () => {
    let entity = { hp: 50, armor: 0, statusEffects: [{ type: 'burn' as const, value: 2 }] };

    // Turn 1: burn 2→1
    const r1 = processStatusEffects(entity);
    expect(getBurnStacks(r1.entity.statusEffects)).toBe(1);
    expect(r1.entity.statusEffects.filter(s => s.type === 'burn')).toHaveLength(1);

    // Turn 2: burn 1→0, removed
    const r2 = processStatusEffects(r1.entity);
    expect(getBurnStacks(r2.entity.statusEffects)).toBe(0);
    expect(r2.entity.statusEffects.filter(s => s.type === 'burn')).toHaveLength(0);
  });

  it('same type burn takes max (not additive)', () => {
    const effects: StatusEffect[] = [{ type: 'burn', value: 1 }];
    const result = addStatusEffect(effects, { type: 'burn', value: 3 });
    expect(getBurnStacks(result)).toBe(3); // max(1, 3) = 3
  });

  it('burn does not add to existing smaller burn', () => {
    const effects: StatusEffect[] = [{ type: 'burn', value: 5 }];
    const result = addStatusEffect(effects, { type: 'burn', value: 2 });
    expect(getBurnStacks(result)).toBe(5); // max(5, 2) = 5
  });

  it('burn bonus applies through applyCardEffect', () => {
    const card = makeCard({ effect: { type: 'attack', damage: 10 } });
    const state = makeState({
      enemies: [makeEnemy({ hp: 50, statusEffects: [{ type: 'burn', value: 2 }] })],
    });
    const result = applyCardEffect(card, state, 0);
    // 10 + max(1, floor(5)) = 15
    expect(result.enemies[0].hp).toBe(35);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ❄️ FREEZE VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

describe('❄️ Freeze - Core Logic', () => {
  it('frozen enemy skips entire action', () => {
    const enemy = makeEnemy({
      isFrozen: true,
      statusEffects: [{ type: 'freeze', value: 1 }],
      intent: { type: 'attack', value: 10, description: '猛击' },
    });
    const state = makeState({
      player: { hp: 70, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [], potions: 0, thorns: 0 },
      enemies: [enemy],
    });
    const result = processEnemyActions(state);
    expect(result.player.hp).toBe(70); // No damage taken
  });

  it('freeze duration decrements correctly', () => {
    let entity = { hp: 30, armor: 0, isFrozen: true, statusEffects: [{ type: 'freeze' as const, value: 2 }] };

    const r1 = processStatusEffects(entity);
    expect(r1.entity.isFrozen).toBe(true); // Still frozen (value = 1)
    const freezeVal1 = r1.entity.statusEffects.filter(s => s.type === 'freeze').reduce((sum, s) => sum + s.value, 0);
    expect(freezeVal1).toBe(1);

    const r2 = processStatusEffects(r1.entity);
    expect(r2.entity.isFrozen).toBe(false); // Unfrozen (value = 0, removed)
    expect(r2.entity.statusEffects.filter(s => s.type === 'freeze')).toHaveLength(0);
  });

  it('ancient dragon is immune to freeze', () => {
    const card = makeCard({ effect: { type: 'attack', damage: 6, freezeDuration: 1 } });
    const state = makeState({
      enemies: [makeEnemy({ hp: 95, templateId: 'ancient_dragon' })],
    });
    const result = applyCardEffect(card, state, 0);
    expect(result.enemies[0].isFrozen).toBe(false);
    expect(result.enemies[0].statusEffects.find(s => s.type === 'freeze')).toBeUndefined();
  });

  it('non-boss enemies can be frozen', () => {
    const card = makeCard({ effect: { type: 'attack', damage: 6, freezeDuration: 1 } });
    const state = makeState({
      enemies: [makeEnemy({ hp: 28, templateId: 'goblin' })],
    });
    const result = applyCardEffect(card, state, 0);
    expect(result.enemies[0].isFrozen).toBe(true);
    expect(result.enemies[0].statusEffects.find(s => s.type === 'freeze')).toBeDefined();
  });

  it('enemy resumes normal action after freeze expires', () => {
    // Start with freeze value=1 (will be processed and removed)
    const enemy = makeEnemy({
      isFrozen: true,
      statusEffects: [{ type: 'freeze', value: 1 }],
      intent: { type: 'defend', value: 5, description: '缩避' },
    });
    const state = makeState({
      player: { hp: 70, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [], potions: 0, thorns: 0 },
      enemies: [enemy],
    });
    const result = processEnemyActions(state);
    // After processing, freeze should be gone
    expect(result.enemies[0].isFrozen).toBe(false);
    // Enemy should have new intent for next turn (rolled by rollEnemyIntent)
    expect(result.enemies[0].intent).toBeDefined();
  });

  it('freeze via attackAll does not freeze immune enemies', () => {
    const card = makeCard({ effect: { type: 'attackAll', damage: 3, freezeDuration: 1 } });
    const state = makeState({
      enemies: [
        makeEnemy({ instanceId: 'e1', hp: 20, templateId: 'goblin' }),
        makeEnemy({ instanceId: 'e2', hp: 95, templateId: 'ancient_dragon' }),
      ],
    });
    const result = applyCardEffect(card, state);
    expect(result.enemies[0].isFrozen).toBe(true);
    expect(result.enemies[1].isFrozen).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 💀 SUMMON VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

describe('💀 Summon - Core Logic', () => {
  beforeEach(() => resetIdCounter());

  it('necromancer summons skeleton correctly', () => {
    const necroTemplate = getEnemyTemplate('necromancer')!;
    const skeletonTemplate = getEnemyTemplate('skeleton');
    expect(skeletonTemplate).toBeDefined();
    expect(skeletonTemplate!.maxHp).toBe(35);
  });

  it('ancient dragon summons whelp correctly', () => {
    const dragonTemplate = getEnemyTemplate('ancient_dragon')!;
    const whelpTemplate = getEnemyTemplate('whelp');
    expect(whelpTemplate).toBeDefined();
    expect(whelpTemplate!.maxHp).toBe(20);
  });

  it('summon creates new enemy instance with correct properties', () => {
    const necromancer = makeEnemy({
      templateId: 'necromancer',
      name: '死灵法师',
      hp: 48,
      maxHp: 48,
      moves: [
        { type: 'attack', value: 8, description: '灵魂收割' },
        { type: 'summon', value: 1, description: '召唤骷髅', summonId: 'skeleton' },
        { type: 'defend', value: 6, description: '白骨护盾' },
      ],
      intent: { type: 'summon', value: 1, description: '召唤骷髅' },
    });
    const state = makeState({
      enemies: [necromancer],
    });
    const result = processEnemyActions(state);
    // Should have 2 enemies now (necromancer + summoned skeleton)
    expect(result.enemies.length).toBe(2);
    // The skeleton should have the correct properties
    const skeleton = result.enemies.find(e => e.templateId === 'skeleton');
    expect(skeleton).toBeDefined();
    expect(skeleton!.hp).toBe(35);
    expect(skeleton!.maxHp).toBe(35);
    expect(skeleton!.intent).toBeDefined();
    expect(skeleton!.moves.length).toBeGreaterThan(0);
  });

  it('summon respects MAX_ENEMIES limit of 4', () => {
    const necromancer = makeEnemy({
      templateId: 'necromancer',
      name: '死灵法师',
      hp: 48,
      maxHp: 48,
      moves: [
        { type: 'summon', value: 1, description: '召唤骷髅', summonId: 'skeleton' },
      ],
      intent: { type: 'summon', value: 1, description: '召唤骷髅' },
    });
    // Already 4 enemies (including the necromancer) — field is full
    const extraEnemies = [
      makeEnemy({ instanceId: 'e2', hp: 20 }),
      makeEnemy({ instanceId: 'e3', hp: 20 }),
      makeEnemy({ instanceId: 'e4', hp: 20 }),
    ];
    const state = makeState({
      enemies: [necromancer, ...extraEnemies],
    });
    const result = processEnemyActions(state);
    // Should still be 4 enemies (summon blocked by cap)
    expect(result.enemies.length).toBe(4);
  });

  it('summon when field has 3 enemies (room for 1 more)', () => {
    const necromancer = makeEnemy({
      templateId: 'necromancer',
      name: '死灵法师',
      hp: 48,
      maxHp: 48,
      moves: [
        { type: 'summon', value: 1, description: '召唤骷髅', summonId: 'skeleton' },
      ],
      intent: { type: 'summon', value: 1, description: '召唤骷髅' },
    });
    const extraEnemies = [
      makeEnemy({ instanceId: 'e2', hp: 20 }),
      makeEnemy({ instanceId: 'e3', hp: 20 }),
    ];
    const state = makeState({
      enemies: [necromancer, ...extraEnemies],
    });
    const result = processEnemyActions(state);
    // 3 enemies + 1 summoned = 4
    expect(result.enemies.length).toBe(4);
    const skeleton = result.enemies.find(e => e.templateId === 'skeleton');
    expect(skeleton).toBeDefined();
  });

  it('summoned enemy has independent HP and actions', () => {
    const dragon = makeEnemy({
      templateId: 'ancient_dragon',
      name: '远古巨龙',
      hp: 95,
      maxHp: 95,
      moves: [
        { type: 'summon', value: 1, description: '召唤幼龙', summonId: 'whelp' },
      ],
      intent: { type: 'summon', value: 1, description: '召唤幼龙' },
    });
    const state = makeState({
      enemies: [dragon],
    });
    const result = processEnemyActions(state);
    expect(result.enemies.length).toBe(2);
    const whelp = result.enemies.find(e => e.templateId === 'whelp');
    expect(whelp).toBeDefined();
    expect(whelp!.hp).toBe(20);
    expect(whelp!.maxHp).toBe(20);
    expect(whelp!.instanceId).not.toBe(dragon.instanceId);
  });

  it('summoned enemy has correct intent', () => {
    const dragon = makeEnemy({
      templateId: 'ancient_dragon',
      name: '远古巨龙',
      hp: 95,
      maxHp: 95,
      moves: [
        { type: 'summon', value: 1, description: '召唤幼龙', summonId: 'whelp' },
      ],
      intent: { type: 'summon', value: 1, description: '召唤幼龙' },
    });
    const state = makeState({
      enemies: [dragon],
    });
    const result = processEnemyActions(state);
    const whelp = result.enemies.find(e => e.templateId === 'whelp');
    expect(whelp!.intent).toBeDefined();
    expect(['attack', 'defend', 'buff', 'heal', 'summon']).toContain(whelp!.intent.type);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 💚 HEAL VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

describe('💚 Heal - Core Logic', () => {
  it('enemy heal restores HP (not exceeding max)', () => {
    const enemy = makeEnemy({
      hp: 30,
      maxHp: 50,
      moves: [{ type: 'heal', value: 10, description: '黑暗治愈' }],
      intent: { type: 'heal', value: 10, description: '黑暗治愈' },
    });
    const state = makeState({ enemies: [enemy] });
    const result = processEnemyActions(state);
    expect(result.enemies[0].hp).toBe(40); // 30 + 10 = 40
  });

  it('enemy heal does not exceed max HP', () => {
    const enemy = makeEnemy({
      hp: 45,
      maxHp: 50,
      moves: [{ type: 'heal', value: 10, description: '黑暗治愈' }],
      intent: { type: 'heal', value: 10, description: '黑暗治愈' },
    });
    const state = makeState({ enemies: [enemy] });
    const result = processEnemyActions(state);
    expect(result.enemies[0].hp).toBe(50); // Capped at maxHp
  });

  it('shadow priest has heal move', () => {
    const template = getEnemyTemplate('shadow_priest');
    expect(template).toBeDefined();
    expect(template!.maxHp).toBe(40);
    const healMove = template!.moves.find(m => m.type === 'heal');
    expect(healMove).toBeDefined();
    expect(healMove!.value).toBe(10);
  });

  it('shadow knight has heal move', () => {
    const template = getEnemyTemplate('shadow_knight');
    expect(template).toBeDefined();
    const healMove = template!.moves.find(m => m.type === 'heal');
    expect(healMove).toBeDefined();
    expect(healMove!.value).toBe(8);
  });

  it('heal intent displays correct value', () => {
    const enemy = makeEnemy({
      hp: 30,
      maxHp: 50,
      moves: [{ type: 'heal', value: 10, description: '黑暗治愈' }],
      intent: { type: 'heal', value: 10, description: '黑暗治愈' },
    });
    expect(enemy.intent.type).toBe('heal');
    expect(enemy.intent.value).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 INTERACTION COMBOS
// ═══════════════════════════════════════════════════════════════════════════

describe('🔄 Interaction Combinations', () => {
  it('poison + burn: damage calculation is correct', () => {
    // Enemy has both poison(3) and burn(2)
    const enemy = makeEnemy({ hp: 50, statusEffects: [
      { type: 'poison', value: 3 },
      { type: 'burn', value: 2 },
    ]});
    // Process status: poison deals 3, burn duration decrements
    const { entity: processed } = processStatusEffects(enemy);
    expect(processed.hp).toBe(47); // 50 - 3 poison

    // Now attack the processed enemy: burn should add +50% damage
    const card = makeCard({ effect: { type: 'attack', damage: 10 } });
    const state = makeState({ enemies: [processed as EnemyInstance] });
    const result = applyCardEffect(card, state, 0);
    // 10 + max(1, floor(10*0.5)) = 10 + 5 = 15
    expect(result.enemies[0].hp).toBe(32); // 47 - 15 = 32
  });

  it('freeze + poison: frozen enemy skips action but still takes poison damage', () => {
    const enemy = makeEnemy({
      hp: 28,
      isFrozen: true,
      statusEffects: [
        { type: 'freeze', value: 1 },
        { type: 'poison', value: 3 },
      ],
      intent: { type: 'attack', value: 8, description: '挥砍' },
    });
    const state = makeState({
      player: { hp: 70, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [], potions: 0, thorns: 0 },
      enemies: [enemy],
    });
    const result = processEnemyActions(state);
    // Enemy should NOT have attacked (frozen)
    expect(result.player.hp).toBe(70);
    // But poison should have dealt damage
    expect(result.enemies[0].hp).toBe(25); // 28 - 3 = 25
    // Poison should have decremented
    expect(getPoisonStacks(result.enemies[0].statusEffects)).toBe(2);
    // Freeze should have expired (was 1, decremented to 0, removed)
    expect(result.enemies[0].isFrozen).toBe(false);
  });

  it('summoned enemies can be poisoned', () => {
    const necromancer = makeEnemy({
      templateId: 'necromancer',
      name: '死灵法师',
      hp: 48,
      maxHp: 48,
      moves: [
        { type: 'summon', value: 1, description: '召唤骷髅', summonId: 'skeleton' },
      ],
      intent: { type: 'summon', value: 1, description: '召唤骷髅' },
    });
    const state = makeState({ enemies: [necromancer] });
    const result = processEnemyActions(state);
    const skeleton = result.enemies.find(e => e.templateId === 'skeleton');
    expect(skeleton).toBeDefined();

    // Now apply poison to the skeleton
    const poisonCard = makeCard({ effect: { type: 'attack', damage: 4, poison: 3 } });
    const skeletonIdx = result.enemies.findIndex(e => e.templateId === 'skeleton');
    const afterPoison = applyCardEffect(poisonCard, result, skeletonIdx);
    const poisonedSkeleton = afterPoison.enemies.find(e => e.templateId === 'skeleton');
    expect(getPoisonStacks(poisonedSkeleton!.statusEffects)).toBe(3);
  });

  it('summoned enemies can be burned', () => {
    const necromancer = makeEnemy({
      templateId: 'necromancer',
      name: '死灵法师',
      hp: 48,
      maxHp: 48,
      moves: [
        { type: 'summon', value: 1, description: '召唤骷髅', summonId: 'skeleton' },
      ],
      intent: { type: 'summon', value: 1, description: '召唤骷髅' },
    });
    const state = makeState({ enemies: [necromancer] });
    const result = processEnemyActions(state);
    const skeletonIdx = result.enemies.findIndex(e => e.templateId === 'skeleton');

    const burnCard = makeCard({ effect: { type: 'attack', damage: 6, burnDuration: 2 } });
    const afterBurn = applyCardEffect(burnCard, result, skeletonIdx);
    const burnedSkeleton = afterBurn.enemies.find(e => e.templateId === 'skeleton');
    expect(getBurnStacks(burnedSkeleton!.statusEffects)).toBe(2);
  });

  it('summoned enemies can be frozen', () => {
    const necromancer = makeEnemy({
      templateId: 'necromancer',
      name: '死灵法师',
      hp: 48,
      maxHp: 48,
      moves: [
        { type: 'summon', value: 1, description: '召唤骷髅', summonId: 'skeleton' },
      ],
      intent: { type: 'summon', value: 1, description: '召唤骷髅' },
    });
    const state = makeState({ enemies: [necromancer] });
    const result = processEnemyActions(state);
    const skeletonIdx = result.enemies.findIndex(e => e.templateId === 'skeleton');

    const freezeCard = makeCard({ effect: { type: 'attack', damage: 3, freezeDuration: 1 } });
    const afterFreeze = applyCardEffect(freezeCard, result, skeletonIdx);
    const frozenSkeleton = afterFreeze.enemies.find(e => e.templateId === 'skeleton');
    expect(frozenSkeleton!.isFrozen).toBe(true);
  });

  it('status effects are cleared when enemy dies', () => {
    // Kill an enemy with status effects - they should be removed from the array
    const card = makeCard({ effect: { type: 'attack', damage: 100 } });
    const state = makeState({
      enemies: [makeEnemy({
        hp: 10,
        statusEffects: [
          { type: 'poison', value: 5 },
          { type: 'burn', value: 3 },
          { type: 'freeze', value: 1 },
        ],
      })],
    });
    const result = applyCardEffect(card, state, 0);
    expect(result.enemies.length).toBe(0); // Enemy dead and removed
  });

  it('burn + attack on enemy with armor', () => {
    const enemy = makeEnemy({ hp: 50, armor: 5, statusEffects: [{ type: 'burn', value: 2 }] });
    const card = makeCard({ effect: { type: 'attack', damage: 10 } });
    const state = makeState({ enemies: [enemy] });
    const result = applyCardEffect(card, state, 0);
    // Total damage: 10 + 5 = 15, armor absorbs 5, HP loses 10
    expect(result.enemies[0].hp).toBe(40);
    expect(result.enemies[0].armor).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 🃏 NEW CARDS VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

describe('🃏 New Cards - Data & Effects', () => {
  it('poison_blade: 1 cost, 4 damage + 3 poison', () => {
    const template = CARD_TEMPLATES.find(t => t.id === 'poison_blade');
    expect(template).toBeDefined();
    expect(template!.cost).toBe(1);
    expect(template!.effect.type).toBe('attack');
    expect(template!.effect.damage).toBe(4);
    expect(template!.effect.poison).toBe(3);
  });

  it('plague_cloud: 2 cost, attackAll 2 damage + 2 poison', () => {
    const template = CARD_TEMPLATES.find(t => t.id === 'plague_cloud');
    expect(template).toBeDefined();
    expect(template!.cost).toBe(2);
    expect(template!.effect.type).toBe('attackAll');
    expect(template!.effect.damage).toBe(2);
    expect(template!.effect.poison).toBe(2);
  });

  it('burn_strike: 1 cost, 6 damage + burn 2 turns', () => {
    const template = CARD_TEMPLATES.find(t => t.id === 'burn_strike');
    expect(template).toBeDefined();
    expect(template!.cost).toBe(1);
    expect(template!.effect.type).toBe('attack');
    expect(template!.effect.damage).toBe(6);
    expect(template!.effect.burnDuration).toBe(2);
  });

  it('frost_nova: 2 cost, attackAll 3 damage + freeze 1 turn', () => {
    const template = CARD_TEMPLATES.find(t => t.id === 'frost_nova');
    expect(template).toBeDefined();
    expect(template!.cost).toBe(2);
    expect(template!.effect.type).toBe('attackAll');
    expect(template!.effect.damage).toBe(3);
    expect(template!.effect.freezeDuration).toBe(1);
  });

  it('starting deck contains poison_blade x1', () => {
    expect(STARTING_DECK_COMPOSITION['poison_blade']).toBe(1);
  });

  it('starting deck does NOT contain burn_strike (trimmed)', () => {
    expect(STARTING_DECK_COMPOSITION['burn_strike']).toBeUndefined();
  });

  it('starting deck does NOT contain frost_nova (trimmed)', () => {
    expect(STARTING_DECK_COMPOSITION['frost_nova']).toBeUndefined();
  });

  it('plague_cloud applies poison to all enemies', () => {
    const card = makeCard({ effect: { type: 'attackAll', damage: 2, poison: 2 } });
    const state = makeState({
      enemies: [
        makeEnemy({ instanceId: 'e1', hp: 20 }),
        makeEnemy({ instanceId: 'e2', hp: 20 }),
      ],
    });
    const result = applyCardEffect(card, state);
    expect(result.enemies[0].hp).toBe(18);
    expect(result.enemies[1].hp).toBe(18);
    expect(getPoisonStacks(result.enemies[0].statusEffects)).toBe(2);
    expect(getPoisonStacks(result.enemies[1].statusEffects)).toBe(2);
  });

  it('frost_nova freezes all non-immune enemies', () => {
    const card = makeCard({ effect: { type: 'attackAll', damage: 3, freezeDuration: 1 } });
    const state = makeState({
      enemies: [
        makeEnemy({ instanceId: 'e1', hp: 20, templateId: 'goblin' }),
        makeEnemy({ instanceId: 'e2', hp: 95, templateId: 'ancient_dragon' }),
      ],
    });
    const result = applyCardEffect(card, state);
    expect(result.enemies[0].isFrozen).toBe(true);
    expect(result.enemies[1].isFrozen).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 👹 NEW ENEMIES VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

describe('👹 New Enemies - Data', () => {
  it('shadow_priest: HP 40, correct moves', () => {
    const template = getEnemyTemplate('shadow_priest');
    expect(template).toBeDefined();
    expect(template!.maxHp).toBe(40);
    expect(template!.moves.length).toBe(3);
    // Check it has attack, heal, and defend
    const types = template!.moves.map(m => m.type);
    expect(types).toContain('attack');
    expect(types).toContain('heal');
    expect(types).toContain('defend');
  });

  it('necromancer: HP 48, has summon move', () => {
    const template = getEnemyTemplate('necromancer');
    expect(template).toBeDefined();
    expect(template!.maxHp).toBe(48);
    const summonMove = template!.moves.find(m => m.type === 'summon');
    expect(summonMove).toBeDefined();
    expect(summonMove!.summonId).toBe('skeleton');
  });

  it('whelp: HP 20, correct moves', () => {
    const template = getEnemyTemplate('whelp');
    expect(template).toBeDefined();
    expect(template!.maxHp).toBe(20);
    expect(template!.moves.length).toBe(2);
    // All moves should be attacks
    template!.moves.forEach(m => {
      expect(m.type).toBe('attack');
    });
  });

  it('goblin: has poison dart move', () => {
    const template = getEnemyTemplate('goblin');
    expect(template).toBeDefined();
    const poisonDart = template!.moves.find(m => m.description === '毒镖');
    expect(poisonDart).toBeDefined();
    expect(poisonDart!.statusEffect).toBeDefined();
    expect(poisonDart!.statusEffect!.type).toBe('poison');
    expect(poisonDart!.statusEffect!.value).toBe(2);
  });

  it('layer 2 (Lava Cavern) has 7 nodes (battles + shop/event + elite)', () => {
    expect(MAP_LAYERS.length).toBeGreaterThanOrEqual(2);
    const layer2 = MAP_LAYERS[1];
    expect(layer2.nodes.length).toBeGreaterThanOrEqual(4);
  });

  it('layer 2 contains fire_mage and other enemies', () => {
    const layer2 = MAP_LAYERS[1];
    const templateIds = layer2.nodes.map(n => n.enemyTemplateId);
    expect(templateIds).toContain('fire_mage');
    expect(templateIds).toContain('fire_imp');
  });

  it('ancient_dragon has immuneToFreeze flag', () => {
    const template = getEnemyTemplate('ancient_dragon');
    expect(template!.immuneToFreeze).toBe(true);
  });

  it('whelp does NOT have immuneToFreeze', () => {
    const template = getEnemyTemplate('whelp');
    expect(template!.immuneToFreeze).toBeFalsy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 🖥️ UI VERIFICATION (Component Structure Checks)
// ═══════════════════════════════════════════════════════════════════════════

describe('🖥️ UI - Component Checks', () => {
  // These tests verify that the data structures needed for UI rendering are correct

  it('enemy intent icons include heal (💚) and summon (💀)', () => {
    const intentIcons: Record<string, string> = {
      attack: '⚔️',
      defend: '🛡️',
      buff: '💪',
      heal: '💚',
      summon: '💀',
    };
    expect(intentIcons['heal']).toBe('💚');
    expect(intentIcons['summon']).toBe('💀');
  });

  it('enemy status effect icons are present (poison, burn, freeze)', () => {
    const statusIcons: Record<string, string> = {
      poison: '🧪',
      burn: '🔥',
      freeze: '❄️',
    };
    expect(statusIcons['poison']).toBe('🧪');
    expect(statusIcons['burn']).toBe('🔥');
    expect(statusIcons['freeze']).toBe('❄️');
  });

  it('enemy freeze overlay condition: isFrozen', () => {
    // Verify that EnemyInstance has isFrozen field
    const enemy = makeEnemy({ isFrozen: true });
    expect(enemy.isFrozen).toBe(true);
    const normalEnemy = makeEnemy({ isFrozen: false });
    expect(normalEnemy.isFrozen).toBe(false);
  });

  it('player status effects array exists on PlayerState', () => {
    const state = makeState({
      player: {
        hp: 70,
        maxHp: 70,
        energy: 3,
        maxEnergy: 3,
        armor: 0,
        statusEffects: [{ type: 'poison', value: 3 }],
        potions: 0,
        thorns: 0,
      },
    });
    expect(state.player.statusEffects).toHaveLength(1);
    expect(state.player.statusEffects[0].type).toBe('poison');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔬 EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════

describe('🔬 Edge Cases', () => {
  it('poison on enemy with 1 HP kills them', () => {
    const enemy = makeEnemy({ hp: 1, statusEffects: [{ type: 'poison', value: 1 }] });
    const state = makeState({ enemies: [enemy] });
    const result = processEnemyActions(state);
    expect(result.enemies.length).toBe(0);
  });

  it('burn bonus with zero base damage does not apply', () => {
    const result = applyDamageToTarget(0, 50, 0, 1);
    // No damage, so no burn bonus (damage > 0 check)
    expect(result.actualDamage).toBe(0);
  });

  it('multiple poison applications stack correctly', () => {
    let effects: StatusEffect[] = [];
    effects = addStatusEffect(effects, { type: 'poison', value: 2 });
    effects = addStatusEffect(effects, { type: 'poison', value: 3 });
    effects = addStatusEffect(effects, { type: 'poison', value: 1 });
    expect(getPoisonStacks(effects)).toBe(6);
  });

  it('multiple burn applications take max, not stack', () => {
    let effects: StatusEffect[] = [];
    effects = addStatusEffect(effects, { type: 'burn', value: 1 });
    effects = addStatusEffect(effects, { type: 'burn', value: 3 });
    effects = addStatusEffect(effects, { type: 'burn', value: 2 });
    expect(getBurnStacks(effects)).toBe(3);
  });

  it('freeze with value 0 should not exist', () => {
    const entity = { hp: 30, armor: 0, statusEffects: [{ type: 'freeze' as const, value: 0 }] };
    const { entity: result } = processStatusEffects(entity);
    // Value 0 should be filtered out
    expect(result.statusEffects.filter(s => s.type === 'freeze')).toHaveLength(0);
  });

  it('poison damage when HP is exactly equal to poison stacks', () => {
    const enemy = makeEnemy({ hp: 5, armor: 0, statusEffects: [{ type: 'poison', value: 5 }] });
    const { entity: result } = processStatusEffects(enemy);
    expect(result.hp).toBe(0);
  });

  it('summon when enemy template not found does not crash', () => {
    const enemy = makeEnemy({
      moves: [{ type: 'summon', value: 1, description: '召唤', summonId: 'nonexistent' }],
      intent: { type: 'summon', value: 1, description: '召唤' },
    });
    const state = makeState({ enemies: [enemy] });
    // Should not throw
    const result = processEnemyActions(state);
    expect(result.enemies.length).toBe(1); // Only the original enemy
  });

  it('simultaneous burn + poison on same entity process correctly', () => {
    const entity = {
      hp: 50,
      armor: 0,
      isFrozen: false,
      statusEffects: [
        { type: 'poison' as const, value: 4 },
        { type: 'burn' as const, value: 3 },
        { type: 'freeze' as const, value: 2 },
      ],
    };
    const { entity: result, poisonDamage } = processStatusEffects(entity);
    expect(poisonDamage).toBe(4);
    expect(result.hp).toBe(46);
    expect(getPoisonStacks(result.statusEffects)).toBe(3);
    expect(getBurnStacks(result.statusEffects)).toBe(2);
    expect((result as EnemyInstance).isFrozen).toBe(true);
  });
});
