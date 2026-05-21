import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyDamageToTarget,
  applyCardEffect,
  processEnemyActions,
  processStatusEffects,
  startNewPlayerTurn,
  drawCards,
  canPlayCard,
  cardNeedsTarget,
  createStartingDeck,
  createEnemyInstance,
  createInitialState,
  isLayerComplete,
  isGameComplete,
  resetIdCounter,
  shuffle,
  rollEnemyIntent,
  getBurnStacks,
  getPoisonStacks,
  addStatusEffect,
} from '../utils/gameLogic';
import { CARD_TEMPLATES, STARTING_DECK_COMPOSITION } from '../data/cards';
import { ENEMY_TEMPLATES } from '../data/enemies';
import type { CardInstance, EnemyInstance, GameState, EnemyMove, StatusEffect } from '../types/game';

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
    ...overrides,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    screen: 'battle',
    player: { hp: 70, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [], potions: 0 },
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
    ...overrides,
  };
}

// ─── applyDamageToTarget ──────────────────────────────────────────────────

describe('applyDamageToTarget', () => {
  it('should reduce HP when no armor', () => {
    const result = applyDamageToTarget(10, 50, 0);
    expect(result.newHp).toBe(40);
    expect(result.newArmor).toBe(0);
    expect(result.actualDamage).toBe(10);
  });

  it('should reduce armor first, then HP', () => {
    const result = applyDamageToTarget(10, 50, 4);
    expect(result.newHp).toBe(44); // 50 - (10 - 4) = 44
    expect(result.newArmor).toBe(0);
    expect(result.actualDamage).toBe(6);
  });

  it('should fully absorb damage by armor', () => {
    const result = applyDamageToTarget(5, 50, 10);
    expect(result.newHp).toBe(50);
    expect(result.newArmor).toBe(5); // 10 - 5 = 5
    expect(result.actualDamage).toBe(0);
  });

  it('should handle damage equal to armor exactly', () => {
    const result = applyDamageToTarget(8, 50, 8);
    expect(result.newHp).toBe(50);
    expect(result.newArmor).toBe(0);
    expect(result.actualDamage).toBe(0);
  });

  it('should handle zero damage', () => {
    const result = applyDamageToTarget(0, 50, 5);
    expect(result.newHp).toBe(50);
    expect(result.newArmor).toBe(5);
    expect(result.actualDamage).toBe(0);
  });

  it('should handle lethal damage with armor', () => {
    const result = applyDamageToTarget(55, 50, 5);
    expect(result.newHp).toBe(0); // 50 - (55 - 5) = 0
    expect(result.newArmor).toBe(0);
    expect(result.actualDamage).toBe(50);
  });

  it('should apply burn bonus: +50% damage (rounded down, min +1)', () => {
    const result = applyDamageToTarget(10, 50, 0, 1);
    // 10 + max(1, floor(10*0.5)) = 10 + 5 = 15
    expect(result.newHp).toBe(35);
    expect(result.actualDamage).toBe(15);
  });

  it('should apply burn bonus with minimum +1 for small damage', () => {
    const result = applyDamageToTarget(1, 50, 0, 1);
    // 1 + max(1, floor(1*0.5)) = 1 + 1 = 2
    expect(result.newHp).toBe(48);
    expect(result.actualDamage).toBe(2);
  });

  it('should not apply burn bonus when burnStacks is 0', () => {
    const result = applyDamageToTarget(10, 50, 0, 0);
    expect(result.newHp).toBe(40);
    expect(result.actualDamage).toBe(10);
  });

  it('should apply burn bonus with armor', () => {
    const result = applyDamageToTarget(10, 50, 5, 1);
    // Total damage = 15, armor absorbs 5, HP loses 10
    expect(result.newHp).toBe(40);
    expect(result.newArmor).toBe(0);
    expect(result.actualDamage).toBe(10);
  });
});

// ─── applyCardEffect ──────────────────────────────────────────────────────

describe('applyCardEffect - attack card', () => {
  beforeEach(() => resetIdCounter());

  it('should deal damage to target enemy', () => {
    const card = makeCard({ effect: { type: 'attack', damage: 6 } });
    const state = makeState({ enemies: [makeEnemy({ hp: 28, armor: 0 })] });
    const result = applyCardEffect(card, state, 0);
    expect(result.enemies[0].hp).toBe(22);
    expect(result.enemies[0].isHit).toBe(true);
  });

  it('should reduce enemy armor first then HP', () => {
    const card = makeCard({ effect: { type: 'attack', damage: 10 } });
    const state = makeState({ enemies: [makeEnemy({ hp: 28, armor: 4 })] });
    const result = applyCardEffect(card, state, 0);
    expect(result.enemies[0].hp).toBe(22); // 28 - (10 - 4) = 22
    expect(result.enemies[0].armor).toBe(0);
  });

  it('should remove enemy when HP reaches 0', () => {
    const card = makeCard({ effect: { type: 'attack', damage: 30 } });
    const state = makeState({ enemies: [makeEnemy({ hp: 28, armor: 0 })] });
    const result = applyCardEffect(card, state, 0);
    expect(result.enemies.length).toBe(0);
  });

  it('should not affect other enemies when one is killed', () => {
    const card = makeCard({ effect: { type: 'attack', damage: 30 } });
    const state = makeState({
      enemies: [
        makeEnemy({ instanceId: 'e1', hp: 28 }),
        makeEnemy({ instanceId: 'e2', hp: 20 }),
      ],
    });
    const result = applyCardEffect(card, state, 0);
    expect(result.enemies.length).toBe(1);
    expect(result.enemies[0].instanceId).toBe('e2');
  });

  it('should not apply attack when no target is specified', () => {
    const card = makeCard({ effect: { type: 'attack', damage: 6 } });
    const state = makeState({ enemies: [makeEnemy({ hp: 28 })] });
    const result = applyCardEffect(card, state);
    expect(result.enemies[0].hp).toBe(28); // unchanged
  });
});

describe('applyCardEffect - attack card with poison', () => {
  beforeEach(() => resetIdCounter());

  it('should apply poison stacks to target enemy', () => {
    const card = makeCard({ effect: { type: 'attack', damage: 4, poison: 3 } });
    const state = makeState({ enemies: [makeEnemy({ hp: 28 })] });
    const result = applyCardEffect(card, state, 0);
    expect(result.enemies[0].hp).toBe(24); // 28 - 4 = 24
    const poisonStacks = getPoisonStacks(result.enemies[0].statusEffects);
    expect(poisonStacks).toBe(3);
  });

  it('should stack poison on existing poison', () => {
    const card = makeCard({ effect: { type: 'attack', damage: 4, poison: 3 } });
    const state = makeState({
      enemies: [makeEnemy({ hp: 28, statusEffects: [{ type: 'poison', value: 2 }] })],
    });
    const result = applyCardEffect(card, state, 0);
    const poisonStacks = getPoisonStacks(result.enemies[0].statusEffects);
    expect(poisonStacks).toBe(5); // 2 + 3 = 5
  });
});

describe('applyCardEffect - attack card with burn', () => {
  beforeEach(() => resetIdCounter());

  it('should apply burn status to target enemy', () => {
    const card = makeCard({ effect: { type: 'attack', damage: 6, burnDuration: 2 } });
    const state = makeState({ enemies: [makeEnemy({ hp: 28 })] });
    const result = applyCardEffect(card, state, 0);
    expect(result.enemies[0].hp).toBe(22); // 28 - 6 = 22
    const burnStacks = getBurnStacks(result.enemies[0].statusEffects);
    expect(burnStacks).toBe(2);
  });

  it('should apply burn bonus damage when enemy already has burn', () => {
    const card = makeCard({ effect: { type: 'attack', damage: 10 } });
    const state = makeState({
      enemies: [makeEnemy({ hp: 28, statusEffects: [{ type: 'burn', value: 2 }] })],
    });
    const result = applyCardEffect(card, state, 0);
    // 10 + max(1, floor(10*0.5)) = 10 + 5 = 15
    expect(result.enemies[0].hp).toBe(13); // 28 - 15 = 13
  });
});

describe('applyCardEffect - attack card with freeze', () => {
  beforeEach(() => resetIdCounter());

  it('should apply freeze status to target enemy', () => {
    const card = makeCard({ effect: { type: 'attack', damage: 6, freezeDuration: 1 } });
    const state = makeState({ enemies: [makeEnemy({ hp: 28, templateId: 'goblin' })] });
    const result = applyCardEffect(card, state, 0);
    expect(result.enemies[0].isFrozen).toBe(true);
    const freezeEffect = result.enemies[0].statusEffects.find(s => s.type === 'freeze');
    expect(freezeEffect?.value).toBe(1);
  });

  it('should not freeze immuneToFreeze enemies (ancient_dragon)', () => {
    const card = makeCard({ effect: { type: 'attack', damage: 6, freezeDuration: 1 } });
    const state = makeState({ enemies: [makeEnemy({ hp: 95, templateId: 'ancient_dragon' })] });
    const result = applyCardEffect(card, state, 0);
    expect(result.enemies[0].isFrozen).toBe(false);
    const freezeEffect = result.enemies[0].statusEffects.find(s => s.type === 'freeze');
    expect(freezeEffect).toBeUndefined();
  });
});

describe('applyCardEffect - attackAll card with status effects', () => {
  beforeEach(() => resetIdCounter());

  it('should apply poison to all enemies', () => {
    const card = makeCard({ effect: { type: 'attackAll', damage: 2, poison: 2 } });
    const state = makeState({
      enemies: [
        makeEnemy({ instanceId: 'e1', hp: 20 }),
        makeEnemy({ instanceId: 'e2', hp: 15 }),
      ],
    });
    const result = applyCardEffect(card, state);
    expect(result.enemies[0].hp).toBe(18);
    expect(result.enemies[1].hp).toBe(13);
    expect(getPoisonStacks(result.enemies[0].statusEffects)).toBe(2);
    expect(getPoisonStacks(result.enemies[1].statusEffects)).toBe(2);
  });

  it('should apply freeze to all non-immune enemies', () => {
    const card = makeCard({ effect: { type: 'attackAll', damage: 3, freezeDuration: 1 } });
    const state = makeState({
      enemies: [
        makeEnemy({ instanceId: 'e1', hp: 20, templateId: 'goblin' }),
        makeEnemy({ instanceId: 'e2', hp: 95, templateId: 'ancient_dragon' }),
      ],
    });
    const result = applyCardEffect(card, state);
    expect(result.enemies[0].isFrozen).toBe(true);
    expect(result.enemies[1].isFrozen).toBe(false); // dragon immune
  });
});

describe('applyCardEffect - multiAttack card', () => {
  beforeEach(() => resetIdCounter());

  it('should hit multiple times against the same target', () => {
    const card = makeCard({ effect: { type: 'multiAttack', damage: 4, hits: 2 } });
    const state = makeState({ enemies: [makeEnemy({ hp: 28, armor: 0 })] });
    const result = applyCardEffect(card, state, 0);
    expect(result.enemies[0].hp).toBe(20); // 28 - 4*2 = 20
  });

  it('should redirect to first enemy when target dies mid-combo', () => {
    const card = makeCard({ effect: { type: 'multiAttack', damage: 30, hits: 2 } });
    const state = makeState({
      enemies: [
        makeEnemy({ instanceId: 'e1', hp: 20, armor: 0 }),
        makeEnemy({ instanceId: 'e2', hp: 40, armor: 0 }),
      ],
    });
    const result = applyCardEffect(card, state, 0);
    // First hit kills e1 (20 hp), second hit goes to e2 (now at index 0)
    expect(result.enemies.length).toBe(1);
    expect(result.enemies[0].instanceId).toBe('e2');
    expect(result.enemies[0].hp).toBe(10); // 40 - 30 = 10
  });

  it('should apply armor reduction per hit', () => {
    const card = makeCard({ effect: { type: 'multiAttack', damage: 4, hits: 2 } });
    const state = makeState({ enemies: [makeEnemy({ hp: 28, armor: 3 })] });
    const result = applyCardEffect(card, state, 0);
    // Hit 1: damage 4, armor 3 → armor absorbs 3, 1 HP damage, armor=0. HP=27
    // Hit 2: damage 4, armor 0 → 4 HP damage. HP=23
    expect(result.enemies[0].hp).toBe(23);
    expect(result.enemies[0].armor).toBe(0);
  });
});

describe('applyCardEffect - defend card', () => {
  it('should add armor to player', () => {
    const card = makeCard({
      type: 'defense',
      effect: { type: 'defend', armor: 5 },
    });
    const state = makeState();
    const result = applyCardEffect(card, state);
    expect(result.player.armor).toBe(5);
  });

  it('should stack armor on existing armor', () => {
    const card = makeCard({
      type: 'defense',
      effect: { type: 'defend', armor: 5 },
    });
    const state = makeState({ player: { ...makeState().player, armor: 3 } });
    const result = applyCardEffect(card, state);
    expect(result.player.armor).toBe(8);
  });
});

describe('applyCardEffect - heal card', () => {
  it('should heal player HP', () => {
    const card = makeCard({
      type: 'spell',
      effect: { type: 'heal', amount: 8 },
    });
    const state = makeState({ player: { ...makeState().player, hp: 50 } });
    const result = applyCardEffect(card, state);
    expect(result.player.hp).toBe(58);
  });

  it('should not heal above max HP', () => {
    const card = makeCard({
      type: 'spell',
      effect: { type: 'heal', amount: 30 },
    });
    const state = makeState({ player: { ...makeState().player, hp: 60, maxHp: 70 } });
    const result = applyCardEffect(card, state);
    expect(result.player.hp).toBe(70);
  });
});

describe('applyCardEffect - attackAll card', () => {
  it('should damage all enemies', () => {
    const card = makeCard({
      type: 'spell',
      effect: { type: 'attackAll', damage: 5 },
    });
    const state = makeState({
      enemies: [
        makeEnemy({ instanceId: 'e1', hp: 20, armor: 0 }),
        makeEnemy({ instanceId: 'e2', hp: 15, armor: 0 }),
      ],
    });
    const result = applyCardEffect(card, state);
    expect(result.enemies[0].hp).toBe(15);
    expect(result.enemies[1].hp).toBe(10);
  });

  it('should remove dead enemies after attackAll', () => {
    const card = makeCard({
      type: 'spell',
      effect: { type: 'attackAll', damage: 30 },
    });
    const state = makeState({
      enemies: [
        makeEnemy({ instanceId: 'e1', hp: 20, armor: 0 }),
        makeEnemy({ instanceId: 'e2', hp: 40, armor: 0 }),
      ],
    });
    const result = applyCardEffect(card, state);
    expect(result.enemies.length).toBe(1);
    expect(result.enemies[0].instanceId).toBe('e2');
    expect(result.enemies[0].hp).toBe(10);
  });

  it('should reduce armor per enemy before HP', () => {
    const card = makeCard({
      type: 'spell',
      effect: { type: 'attackAll', damage: 8 },
    });
    const state = makeState({
      enemies: [makeEnemy({ hp: 30, armor: 3 })],
    });
    const result = applyCardEffect(card, state);
    expect(result.enemies[0].hp).toBe(25); // 30 - (8-3)
    expect(result.enemies[0].armor).toBe(0);
  });
});

// ─── processStatusEffects ─────────────────────────────────────────────────

describe('processStatusEffects', () => {
  it('should deal poison damage equal to stacks and decrement by 1', () => {
    const entity = {
      hp: 30,
      armor: 5,
      statusEffects: [{ type: 'poison' as const, value: 3 }],
    };
    const { entity: result, poisonDamage } = processStatusEffects(entity);
    expect(poisonDamage).toBe(3);
    expect(result.hp).toBe(27); // 30 - 3, ignores armor
    expect(result.armor).toBe(5); // armor not affected by poison
    expect(getPoisonStacks(result.statusEffects)).toBe(2); // 3 - 1 = 2
  });

  it('should remove poison when it decrements to 0', () => {
    const entity = {
      hp: 30,
      armor: 0,
      statusEffects: [{ type: 'poison' as const, value: 1 }],
    };
    const { entity: result } = processStatusEffects(entity);
    expect(getPoisonStacks(result.statusEffects)).toBe(0);
    expect(result.statusEffects.filter(s => s.type === 'poison')).toHaveLength(0);
  });

  it('should decrement burn duration by 1', () => {
    const entity = {
      hp: 30,
      armor: 0,
      statusEffects: [{ type: 'burn' as const, value: 2 }],
    };
    const { entity: result } = processStatusEffects(entity);
    expect(getBurnStacks(result.statusEffects)).toBe(1);
  });

  it('should remove burn when duration reaches 0', () => {
    const entity = {
      hp: 30,
      armor: 0,
      statusEffects: [{ type: 'burn' as const, value: 1 }],
    };
    const { entity: result } = processStatusEffects(entity);
    expect(result.statusEffects.filter(s => s.type === 'burn')).toHaveLength(0);
  });

  it('should decrement freeze duration by 1', () => {
    const entity = {
      hp: 30,
      armor: 0,
      statusEffects: [{ type: 'freeze' as const, value: 2 }],
    };
    const { entity: result } = processStatusEffects(entity);
    const freezeStacks = result.statusEffects.filter(s => s.type === 'freeze').reduce((sum, s) => sum + s.value, 0);
    expect(freezeStacks).toBe(1);
  });

  it('should set isFrozen when freeze status is present (value > 1)', () => {
    const entity = {
      hp: 30,
      armor: 0,
      isFrozen: false,
      statusEffects: [{ type: 'freeze' as const, value: 2 }],
    };
    const { entity: result } = processStatusEffects(entity);
    // After processing, freeze decrements to 1, isFrozen should be true
    expect(result.isFrozen).toBe(true);
  });

  it('should clear isFrozen when freeze decrements to 0', () => {
    const entity = {
      hp: 30,
      armor: 0,
      isFrozen: true,
      statusEffects: [{ type: 'freeze' as const, value: 1 }],
    };
    const { entity: result } = processStatusEffects(entity);
    expect(result.isFrozen).toBe(false);
  });

  it('should handle multiple status effects simultaneously', () => {
    const entity = {
      hp: 30,
      armor: 5,
      isFrozen: false,
      statusEffects: [
        { type: 'poison' as const, value: 3 },
        { type: 'burn' as const, value: 2 },
        { type: 'freeze' as const, value: 1 },
      ],
    };
    const { entity: result, poisonDamage } = processStatusEffects(entity);
    expect(poisonDamage).toBe(3);
    expect(result.hp).toBe(27);
    expect(getPoisonStacks(result.statusEffects)).toBe(2);
    expect(getBurnStacks(result.statusEffects)).toBe(1);
    expect(result.isFrozen).toBe(false); // freeze was 1, now 0 → removed
  });
});

// ─── addStatusEffect ──────────────────────────────────────────────────────

describe('addStatusEffect', () => {
  it('should add a new status effect', () => {
    const effects: StatusEffect[] = [];
    const result = addStatusEffect(effects, { type: 'poison', value: 3 });
    expect(result).toEqual([{ type: 'poison', value: 3 }]);
  });

  it('should stack poison values', () => {
    const effects: StatusEffect[] = [{ type: 'poison', value: 2 }];
    const result = addStatusEffect(effects, { type: 'poison', value: 3 });
    expect(result).toEqual([{ type: 'poison', value: 5 }]);
  });

  it('should take max for burn duration', () => {
    const effects: StatusEffect[] = [{ type: 'burn', value: 1 }];
    const result = addStatusEffect(effects, { type: 'burn', value: 3 });
    expect(result).toEqual([{ type: 'burn', value: 3 }]);
  });

  it('should take max for freeze duration', () => {
    const effects: StatusEffect[] = [{ type: 'freeze', value: 2 }];
    const result = addStatusEffect(effects, { type: 'freeze', value: 1 });
    expect(result).toEqual([{ type: 'freeze', value: 2 }]);
  });

  it('should add different types independently', () => {
    const effects: StatusEffect[] = [{ type: 'poison', value: 2 }];
    const result = addStatusEffect(effects, { type: 'burn', value: 2 });
    expect(result).toHaveLength(2);
    expect(result.find(s => s.type === 'poison')?.value).toBe(2);
    expect(result.find(s => s.type === 'burn')?.value).toBe(2);
  });
});

// ─── processEnemyActions ──────────────────────────────────────────────────

describe('processEnemyActions', () => {
  it('should clear enemy armor at start of enemy turn', () => {
    const enemy = makeEnemy({ armor: 10, intent: { type: 'defend', value: 5, description: '缩避' } });
    const state = makeState({ enemies: [enemy] });
    const result = processEnemyActions(state);
    // Armor was cleared (10→0), then defend intent adds 5
    expect(result.enemies[0].armor).toBe(5);
  });

  it('should deal damage to player from enemy attack intent', () => {
    const enemy = makeEnemy({
      intent: { type: 'attack', value: 8, description: '骨刺' },
    });
    const state = makeState({ player: { hp: 50, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [], potions: 0 }, enemies: [enemy] });
    const result = processEnemyActions(state);
    expect(result.player.hp).toBe(42);
  });

  it('should reduce player armor before HP when enemy attacks', () => {
    const enemy = makeEnemy({
      intent: { type: 'attack', value: 10, description: '猛击' },
    });
    const state = makeState({
      player: { hp: 50, maxHp: 70, energy: 3, maxEnergy: 3, armor: 4, statusEffects: [], potions: 0 },
      enemies: [enemy],
    });
    const result = processEnemyActions(state);
    expect(result.player.hp).toBe(44); // 50 - (10 - 4) = 44
    expect(result.player.armor).toBe(0);
  });

  it('should trigger game over when player HP reaches 0', () => {
    const enemy = makeEnemy({
      intent: { type: 'attack', value: 100, description: '致命一击' },
    });
    const state = makeState({
      player: { hp: 30, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [], potions: 0 },
      enemies: [enemy],
    });
    const result = processEnemyActions(state);
    expect(result.screen).toBe('gameOver');
    expect(result.player.hp).toBe(0);
  });

  it('should apply enemy defend intent as armor', () => {
    const enemy = makeEnemy({
      intent: { type: 'defend', value: 6, description: '骨盾' },
    });
    const state = makeState({ enemies: [enemy] });
    const result = processEnemyActions(state);
    expect(result.enemies[0].armor).toBe(6);
  });

  it('should apply enemy buff intent as strength', () => {
    const enemy = makeEnemy({
      moves: [{ type: 'buff', value: 2, description: '力量强化' }],
      intent: { type: 'buff', value: 2, description: '力量强化' },
    });
    const state = makeState({ enemies: [enemy] });
    const result = processEnemyActions(state);
    expect(result.enemies[0].strength).toBe(2);
  });

  it('should apply enemy heal intent', () => {
    const enemy = makeEnemy({
      hp: 20,
      maxHp: 50,
      moves: [{ type: 'heal', value: 10, description: '黑暗治愈' }],
      intent: { type: 'heal', value: 10, description: '黑暗治愈' },
    });
    const state = makeState({ enemies: [enemy] });
    const result = processEnemyActions(state);
    expect(result.enemies[0].hp).toBe(30);
  });

  it('should not heal above max HP', () => {
    const enemy = makeEnemy({
      hp: 45,
      maxHp: 50,
      moves: [{ type: 'heal', value: 10, description: '黑暗治愈' }],
      intent: { type: 'heal', value: 10, description: '黑暗治愈' },
    });
    const state = makeState({ enemies: [enemy] });
    const result = processEnemyActions(state);
    expect(result.enemies[0].hp).toBe(50);
  });

  it('should skip frozen enemy action', () => {
    const enemy = makeEnemy({
      hp: 28,
      isFrozen: true,
      statusEffects: [{ type: 'freeze', value: 1 }],
      intent: { type: 'attack', value: 8, description: '挥砍' },
    });
    const state = makeState({
      player: { hp: 70, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [], potions: 0 },
      enemies: [enemy],
    });
    const result = processEnemyActions(state);
    expect(result.player.hp).toBe(70); // No damage taken
  });

  it('should process poison on enemies at start of enemy turn', () => {
    const enemy = makeEnemy({
      hp: 28,
      statusEffects: [{ type: 'poison', value: 3 }],
      intent: { type: 'defend', value: 5, description: '缩避' },
    });
    const state = makeState({ enemies: [enemy] });
    const result = processEnemyActions(state);
    // Poison deals 3 damage (ignores armor), then poison decrements to 2
    expect(result.enemies[0].hp).toBe(25);
    expect(getPoisonStacks(result.enemies[0].statusEffects)).toBe(2);
  });

  it('should apply enemy attack with statusEffect to player', () => {
    const enemy = makeEnemy({
      intent: { type: 'attack', value: 4, description: '毒镖' },
      moves: [{ type: 'attack', value: 4, description: '毒镖', statusEffect: { type: 'poison', value: 2 } }],
    });
    const state = makeState({
      player: { hp: 70, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [], potions: 0 },
      enemies: [enemy],
    });
    const result = processEnemyActions(state);
    expect(result.player.hp).toBe(66);
    expect(getPoisonStacks(result.player.statusEffects)).toBe(2);
  });

  it('should roll new intents after enemy turn', () => {
    const enemy = makeEnemy({
      intent: { type: 'defend', value: 5, description: '缩避' },
    });
    const state = makeState({ enemies: [enemy] });
    const result = processEnemyActions(state);
    // New intent should be rolled (may differ from the original)
    expect(result.enemies[0].intent).toBeDefined();
  });

  it('should set isEnemyTurn to false after processing', () => {
    const state = makeState({ isEnemyTurn: true, enemies: [makeEnemy()] });
    const result = processEnemyActions(state);
    expect(result.isEnemyTurn).toBe(false);
  });

  it('should clear enemy isHit flags at start of turn', () => {
    const enemy = makeEnemy({ isHit: true, intent: { type: 'defend', value: 4, description: '缩避' } });
    const state = makeState({ enemies: [enemy] });
    const result = processEnemyActions(state);
    expect(result.enemies[0].isHit).toBe(false);
  });

  it('should handle multiple enemies acting in sequence', () => {
    const enemies = [
      makeEnemy({ instanceId: 'e1', intent: { type: 'attack', value: 6, description: '挥砍' } }),
      makeEnemy({ instanceId: 'e2', intent: { type: 'attack', value: 8, description: '骨刺' } }),
    ];
    const state = makeState({
      player: { hp: 70, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [], potions: 0 },
      enemies,
    });
    const result = processEnemyActions(state);
    expect(result.player.hp).toBe(56); // 70 - 6 - 8 = 56
  });
});

// ─── startNewPlayerTurn ────────────────────────────────────────────────────

describe('startNewPlayerTurn', () => {
  it('should clear player armor', () => {
    const state = makeState({
      player: { hp: 50, maxHp: 70, energy: 0, maxEnergy: 3, armor: 10, statusEffects: [], potions: 0 },
    });
    const result = startNewPlayerTurn(state);
    expect(result.player.armor).toBe(0);
  });

  it('should restore energy to max', () => {
    const state = makeState({
      player: { hp: 50, maxHp: 70, energy: 0, maxEnergy: 3, armor: 0, statusEffects: [], potions: 0 },
    });
    const result = startNewPlayerTurn(state);
    expect(result.player.energy).toBe(3);
  });

  it('should draw 5 cards', () => {
    const deck = createStartingDeck();
    const state = makeState({
      drawPile: deck,
      hand: [],
      discardPile: [],
    });
    const result = startNewPlayerTurn(state);
    expect(result.hand.length).toBe(5);
  });

  it('should increment turn number', () => {
    const state = makeState({ turnNumber: 3 });
    const result = startNewPlayerTurn(state);
    expect(result.turnNumber).toBe(4);
  });

  it('should clear selected card', () => {
    const state = makeState({ selectedCardId: 'some_card' });
    const result = startNewPlayerTurn(state);
    expect(result.selectedCardId).toBeNull();
  });

  it('should process player poison at start of turn', () => {
    const state = makeState({
      player: { hp: 50, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [{ type: 'poison', value: 3 }], potions: 0 },
    });
    const result = startNewPlayerTurn(state);
    expect(result.player.hp).toBe(47); // 50 - 3 = 47
    expect(getPoisonStacks(result.player.statusEffects)).toBe(2);
  });
});

// ─── drawCards ────────────────────────────────────────────────────────────

describe('drawCards', () => {
  it('should draw the specified number of cards', () => {
    const cards = createStartingDeck();
    const result = drawCards([], cards, [], 5);
    expect(result.hand.length).toBe(5);
    expect(result.drawPile.length).toBe(cards.length - 5);
  });

  it('should reshuffle discard pile when draw pile is empty', () => {
    const cards = createStartingDeck();
    // Move most cards to discard, keep few in draw
    const discard = cards.slice(0, 14);
    const draw = cards.slice(14); // 2 cards in draw
    const result = drawCards([], draw, discard, 5);
    expect(result.hand.length).toBe(5);
  });

  it('should handle drawing when total cards are less than requested', () => {
    const fewCards = createStartingDeck().slice(0, 3);
    const result = drawCards([], fewCards, [], 5);
    expect(result.hand.length).toBe(3); // Only 3 available
  });

  it('should handle drawing when both piles are empty', () => {
    const result = drawCards([], [], [], 5);
    expect(result.hand.length).toBe(0);
  });

  it('should add drawn cards to existing hand', () => {
    const existingCard = makeCard({ instanceId: 'existing' });
    const deck = createStartingDeck();
    const result = drawCards([existingCard], deck, [], 3);
    expect(result.hand.length).toBe(4); // 1 existing + 3 drawn
  });
});

// ─── canPlayCard ──────────────────────────────────────────────────────────

describe('canPlayCard', () => {
  it('should allow playing a card with sufficient energy', () => {
    const card = makeCard({ cost: 1 });
    const state = makeState({ player: { hp: 70, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [], potions: 0 } });
    expect(canPlayCard(card, state)).toBe(true);
  });

  it('should not allow playing a card with insufficient energy', () => {
    const card = makeCard({ cost: 2 });
    const state = makeState({ player: { hp: 70, maxHp: 70, energy: 1, maxEnergy: 3, armor: 0, statusEffects: [], potions: 0 } });
    expect(canPlayCard(card, state)).toBe(false);
  });

  it('should not allow playing cards during enemy turn', () => {
    const card = makeCard({ cost: 1 });
    const state = makeState({ isEnemyTurn: true });
    expect(canPlayCard(card, state)).toBe(false);
  });

  it('should not allow attack cards when no enemies', () => {
    const card = makeCard({ effect: { type: 'attack', damage: 6 } });
    const state = makeState({ enemies: [] });
    expect(canPlayCard(card, state)).toBe(false);
  });

  it('should allow defend cards when no enemies', () => {
    const card = makeCard({ type: 'defense', effect: { type: 'defend', armor: 5 } });
    const state = makeState({ enemies: [] });
    expect(canPlayCard(card, state)).toBe(true);
  });

  it('should not allow attackAll when no enemies', () => {
    const card = makeCard({ effect: { type: 'attackAll', damage: 5 } });
    const state = makeState({ enemies: [] });
    expect(canPlayCard(card, state)).toBe(false);
  });

  it('should not allow playing an animating card', () => {
    const card = makeCard({ instanceId: 'anim_card' });
    const state = makeState({ animatingCardIds: ['anim_card'] });
    expect(canPlayCard(card, state)).toBe(false);
  });

  it('should allow playing card with exactly enough energy', () => {
    const card = makeCard({ cost: 3 });
    const state = makeState({ player: { hp: 70, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [], potions: 0 } });
    expect(canPlayCard(card, state)).toBe(true);
  });
});

// ─── cardNeedsTarget ──────────────────────────────────────────────────────

describe('cardNeedsTarget', () => {
  it('should return true for attack cards', () => {
    const card = makeCard({ effect: { type: 'attack', damage: 6 } });
    expect(cardNeedsTarget(card)).toBe(true);
  });

  it('should return true for multiAttack cards', () => {
    const card = makeCard({ effect: { type: 'multiAttack', damage: 4, hits: 2 } });
    expect(cardNeedsTarget(card)).toBe(true);
  });

  it('should return false for defend cards', () => {
    const card = makeCard({ effect: { type: 'defend', armor: 5 } });
    expect(cardNeedsTarget(card)).toBe(false);
  });

  it('should return false for heal cards', () => {
    const card = makeCard({ effect: { type: 'heal', amount: 8 } });
    expect(cardNeedsTarget(card)).toBe(false);
  });

  it('should return false for attackAll cards', () => {
    const card = makeCard({ effect: { type: 'attackAll', damage: 5 } });
    expect(cardNeedsTarget(card)).toBe(false);
  });
});

// ─── rollEnemyIntent ──────────────────────────────────────────────────────

describe('rollEnemyIntent', () => {
  it('should return fallback intent when moves are empty', () => {
    const intent = rollEnemyIntent([], 0);
    expect(intent.type).toBe('attack');
    expect(intent.value).toBe(1);
  });

  it('should add strength to attack value', () => {
    const moves: EnemyMove[] = [{ type: 'attack', value: 6, description: '挥砍' }];
    // Force attack intent by providing only attack moves
    const intent = rollEnemyIntent(moves, 3);
    expect(intent.type).toBe('attack');
    expect(intent.value).toBe(9); // 6 + 3 strength
  });

  it('should not add strength to defend value', () => {
    const moves: EnemyMove[] = [{ type: 'defend', value: 6, description: '骨盾' }];
    const intent = rollEnemyIntent(moves, 5);
    expect(intent.type).toBe('defend');
    expect(intent.value).toBe(6); // No strength added for defend
  });

  it('should not add strength to buff value', () => {
    const moves: EnemyMove[] = [{ type: 'buff', value: 2, description: '力量强化' }];
    const intent = rollEnemyIntent(moves, 5);
    expect(intent.type).toBe('buff');
    expect(intent.value).toBe(2); // No strength added for buff
  });

  it('should handle heal intent type', () => {
    const moves: EnemyMove[] = [{ type: 'heal', value: 10, description: '黑暗治愈' }];
    const intent = rollEnemyIntent(moves, 0);
    expect(intent.type).toBe('heal');
    expect(intent.value).toBe(10);
  });

  it('should handle summon intent type', () => {
    const moves: EnemyMove[] = [{ type: 'summon', value: 1, description: '召唤骷髅', summonId: 'skeleton' }];
    const intent = rollEnemyIntent(moves, 0);
    expect(intent.type).toBe('summon');
    expect(intent.value).toBe(1);
  });
});

// ─── createStartingDeck ───────────────────────────────────────────────────

describe('createStartingDeck', () => {
  it('should create the correct number of cards', () => {
    const deck = createStartingDeck();
    const expectedCount = Object.values(STARTING_DECK_COMPOSITION).reduce((sum, c) => sum + c, 0);
    expect(deck.length).toBe(expectedCount);
  });

  it('should create cards matching template definitions', () => {
    const deck = createStartingDeck();
    for (const card of deck) {
      const template = CARD_TEMPLATES.find(t => t.id === card.templateId);
      expect(template).toBeDefined();
      expect(card.name).toBe(template!.name);
      expect(card.cost).toBe(template!.cost);
    }
  });

  it('should give each card a unique instanceId', () => {
    resetIdCounter();
    const deck = createStartingDeck();
    const ids = deck.map(c => c.instanceId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

// ─── createEnemyInstance ──────────────────────────────────────────────────

describe('createEnemyInstance', () => {
  it('should create an enemy from a template', () => {
    const template = ENEMY_TEMPLATES[0]; // goblin
    const enemy = createEnemyInstance(template);
    expect(enemy.templateId).toBe('goblin');
    expect(enemy.hp).toBe(template.maxHp);
    expect(enemy.maxHp).toBe(template.maxHp);
    expect(enemy.armor).toBe(0);
    expect(enemy.strength).toBe(0);
    expect(enemy.isHit).toBe(false);
    expect(enemy.statusEffects).toEqual([]);
    expect(enemy.isFrozen).toBe(false);
  });

  it('should roll an initial intent', () => {
    const template = ENEMY_TEMPLATES[0];
    const enemy = createEnemyInstance(template);
    expect(enemy.intent).toBeDefined();
    expect(['attack', 'defend', 'buff', 'heal', 'summon']).toContain(enemy.intent.type);
  });
});

// ─── shuffle ──────────────────────────────────────────────────────────────

describe('shuffle', () => {
  it('should return an array of the same length', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);
    expect(result.length).toBe(arr.length);
  });

  it('should not modify the original array', () => {
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    shuffle(arr);
    expect(arr).toEqual(copy);
  });

  it('should contain the same elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);
    expect(result.sort()).toEqual(arr.sort());
  });
});

// ─── isLayerComplete / isGameComplete ──────────────────────────────────────

describe('isLayerComplete', () => {
  it('should return true when all nodes are defeated', () => {
    const layer = { nodes: [{ defeated: true }, { defeated: true }] };
    expect(isLayerComplete(layer)).toBe(true);
  });

  it('should return false when some nodes are not defeated', () => {
    const layer = { nodes: [{ defeated: true }, { defeated: false }] };
    expect(isLayerComplete(layer)).toBe(false);
  });

  it('should return true for empty layer', () => {
    const layer = { nodes: [] };
    expect(isLayerComplete(layer)).toBe(true);
  });
});

describe('isGameComplete', () => {
  it('should return true when all layers are complete', () => {
    const mapLayers = [
      { name: 'Layer 1', subtitle: 'L1', nodes: [{ enemyTemplateId: 'goblin', defeated: true }, { enemyTemplateId: 'skeleton', defeated: true }], unlocked: true },
      { name: 'Layer 2', subtitle: 'L2', nodes: [{ enemyTemplateId: 'shadow_knight', defeated: true }], unlocked: true },
    ];
    expect(isGameComplete(mapLayers)).toBe(true);
  });

  it('should return false when some layers are incomplete', () => {
    const mapLayers = [
      { name: 'Layer 1', subtitle: 'L1', nodes: [{ enemyTemplateId: 'goblin', defeated: true }, { enemyTemplateId: 'skeleton', defeated: false }], unlocked: true },
      { name: 'Layer 2', subtitle: 'L2', nodes: [{ enemyTemplateId: 'shadow_knight', defeated: true }], unlocked: false },
    ];
    expect(isGameComplete(mapLayers)).toBe(false);
  });
});

// ─── createInitialState ────────────────────────────────────────────────────

describe('createInitialState', () => {
  it('should start on title screen', () => {
    const state = createInitialState();
    expect(state.screen).toBe('title');
  });

  it('should have 70 HP', () => {
    const state = createInitialState();
    expect(state.player.hp).toBe(70);
    expect(state.player.maxHp).toBe(70);
  });

  it('should have 3 max energy', () => {
    const state = createInitialState();
    expect(state.player.maxEnergy).toBe(3);
  });

  it('should have zero armor initially', () => {
    const state = createInitialState();
    expect(state.player.armor).toBe(0);
  });

  it('should have empty status effects', () => {
    const state = createInitialState();
    expect(state.player.statusEffects).toEqual([]);
  });
});

// ─── Armor Clearing Timing Integration Tests ─────────────────────────────

describe('Armor clearing timing (integration)', () => {
  it('player armor should persist through enemy turn and be cleared at new player turn', () => {
    // Player has 5 armor from defend card
    const enemy = makeEnemy({
      intent: { type: 'attack', value: 8, description: '猛击' },
    });
    const state = makeState({
      player: { hp: 70, maxHp: 70, energy: 3, maxEnergy: 3, armor: 5, statusEffects: [], potions: 0 },
      enemies: [enemy],
    });

    // Enemy attacks during enemy turn
    const afterEnemy = processEnemyActions(state);
    // Player should take 8 - 5 = 3 damage (armor absorbed 5)
    expect(afterEnemy.player.hp).toBe(67);
    expect(afterEnemy.player.armor).toBe(0);

    // New player turn - armor should be 0 (it was already consumed)
    const afterNewTurn = startNewPlayerTurn(afterEnemy);
    expect(afterNewTurn.player.armor).toBe(0);
  });

  it('enemy armor should be cleared at start of enemy turn', () => {
    // Enemy has 10 armor from previous defend intent
    const enemy = makeEnemy({
      armor: 10,
      intent: { type: 'attack', value: 6, description: '挥砍' },
    });
    const state = makeState({ enemies: [enemy] });

    // Process enemy turn - armor should be cleared first
    const result = processEnemyActions(state);
    // Enemy armor was 10, cleared to 0, then no defend intent so stays 0
    expect(result.enemies[0].armor).toBe(0);
  });
});

// ─── Full Turn Cycle Integration Test ──────────────────────────────────────

describe('Full turn cycle (integration)', () => {
  it('should correctly process: player attacks → enemy attacks → new turn', () => {
    const enemy = makeEnemy({ hp: 28, maxHp: 28, armor: 0, intent: { type: 'attack', value: 6, description: '挥砍' } });
    const strikeCard = makeCard({
      instanceId: 'strike_1',
      templateId: 'strike',
      cost: 1,
      effect: { type: 'attack', damage: 6 },
    });
    const deck = createStartingDeck();
    let state = makeState({
      drawPile: deck,
      hand: [strikeCard], // Ensure strike is in hand
      discardPile: [],
      enemies: [enemy],
      player: { hp: 70, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [], potions: 0 },
    });

    // Player plays a strike card (6 damage, 1 cost)
    state = applyCardEffect(strikeCard, state, 0);
    state = {
      ...state,
      player: { ...state.player, energy: state.player.energy - strikeCard.cost },
      hand: state.hand.filter(c => c.instanceId !== strikeCard.instanceId),
      discardPile: [...state.discardPile, strikeCard],
    };
    expect(state.enemies[0].hp).toBe(22); // 28 - 6 = 22
    expect(state.player.energy).toBe(2);

    // End turn: discard hand
    state = {
      ...state,
      discardPile: [...state.discardPile, ...state.hand],
      hand: [],
      isEnemyTurn: true,
    };

    // Enemy turn
    state = processEnemyActions(state);
    expect(state.isEnemyTurn).toBe(false);
    expect(state.player.hp).toBe(64); // 70 - 6 = 64

    // New player turn
    state = startNewPlayerTurn(state);
    expect(state.player.armor).toBe(0);
    expect(state.player.energy).toBe(3);
    expect(state.hand.length).toBe(5);
  });
});

// ─── Status Effect Integration Tests ──────────────────────────────────────

describe('Status effect integration', () => {
  it('should deal poison damage each turn and decrement', () => {
    let enemy = makeEnemy({ hp: 28, statusEffects: [{ type: 'poison', value: 3 }] });

    // Turn 1: 3 poison damage, decrement to 2
    const { entity: e1 } = processStatusEffects(enemy);
    enemy = e1 as EnemyInstance;
    expect(enemy.hp).toBe(25);
    expect(getPoisonStacks(enemy.statusEffects)).toBe(2);

    // Turn 2: 2 poison damage, decrement to 1
    const { entity: e2 } = processStatusEffects(enemy);
    enemy = e2 as EnemyInstance;
    expect(enemy.hp).toBe(23);
    expect(getPoisonStacks(enemy.statusEffects)).toBe(1);

    // Turn 3: 1 poison damage, removed
    const { entity: e3 } = processStatusEffects(enemy);
    enemy = e3 as EnemyInstance;
    expect(enemy.hp).toBe(22);
    expect(getPoisonStacks(enemy.statusEffects)).toBe(0);
  });

  it('burn should increase damage taken and expire', () => {
    const enemy = makeEnemy({ hp: 50, statusEffects: [{ type: 'burn', value: 2 }] });

    // Attack with burn active: 10 + 5 = 15 damage
    const card = makeCard({ effect: { type: 'attack', damage: 10 } });
    const state = makeState({ enemies: [enemy] });
    const result = applyCardEffect(card, state, 0);
    expect(result.enemies[0].hp).toBe(35); // 50 - 15 = 35

    // Process status effects: burn decrements to 1
    const { entity: afterProcess } = processStatusEffects(result.enemies[0]);
    expect(getBurnStacks((afterProcess as EnemyInstance).statusEffects)).toBe(1);

    // Process again: burn decrements to 0, removed
    const { entity: afterProcess2 } = processStatusEffects(afterProcess as EnemyInstance);
    expect(getBurnStacks((afterProcess2 as EnemyInstance).statusEffects)).toBe(0);
  });

  it('freeze should skip enemy action for 1 turn', () => {
    const enemy = makeEnemy({
      hp: 28,
      isFrozen: true,
      statusEffects: [{ type: 'freeze', value: 1 }],
      intent: { type: 'attack', value: 8, description: '挥砍' },
    });
    const state = makeState({
      player: { hp: 70, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [], potions: 0 },
      enemies: [enemy],
    });

    const result = processEnemyActions(state);
    // Enemy was frozen, should not attack
    expect(result.player.hp).toBe(70);
    // Freeze should have been processed and decremented to 0, so isFrozen is false
    expect(result.enemies[0].isFrozen).toBe(false);
  });

  it('poison should ignore armor', () => {
    const enemy = makeEnemy({ hp: 28, armor: 10, statusEffects: [{ type: 'poison', value: 5 }] });
    const { entity: result } = processStatusEffects(enemy);
    expect(result.hp).toBe(23); // 28 - 5, armor untouched
    expect(result.armor).toBe(10);
  });
});

// ─── Card Data Integrity ──────────────────────────────────────────────────

describe('Card data integrity', () => {
  it('all card templates should have valid effects', () => {
    for (const template of CARD_TEMPLATES) {
      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.cost).toBeGreaterThanOrEqual(0);
      expect(template.description).toBeTruthy();
      expect(template.effect.type).toBeTruthy();

      if (template.effect.type === 'attack' || template.effect.type === 'multiAttack' || template.effect.type === 'attackAll') {
        expect(template.effect.damage).toBeGreaterThan(0);
      }
      if (template.effect.type === 'defend') {
        const hasArmorOrDouble = (template.effect.armor ?? 0) > 0 || template.effect.doubleArmor;
        expect(hasArmorOrDouble).toBe(true);
      }
      if (template.effect.type === 'heal') {
        expect(template.effect.amount).toBeGreaterThan(0);
      }
      if (template.effect.type === 'multiAttack') {
        expect(template.effect.hits).toBeGreaterThan(1);
      }
    }
  });

  it('starting deck composition should reference valid templates', () => {
    for (const templateId of Object.keys(STARTING_DECK_COMPOSITION)) {
      const template = CARD_TEMPLATES.find(t => t.id === templateId);
      expect(template).toBeDefined();
    }
  });

  it('all card template IDs should be unique', () => {
    const ids = CARD_TEMPLATES.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

// ─── Enemy Data Integrity ─────────────────────────────────────────────────

describe('Enemy data integrity', () => {
  it('all enemy templates should have valid moves', () => {
    for (const template of ENEMY_TEMPLATES) {
      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.maxHp).toBeGreaterThan(0);
      expect(template.moves.length).toBeGreaterThan(0);

      for (const move of template.moves) {
        expect(['attack', 'defend', 'buff', 'heal', 'summon']).toContain(move.type);
        expect(move.value).toBeGreaterThan(0);
        expect(move.description).toBeTruthy();
      }
    }
  });

  it('all enemy template IDs should be unique', () => {
    const ids = ENEMY_TEMPLATES.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
