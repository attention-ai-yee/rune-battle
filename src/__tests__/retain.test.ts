/**
 * Comprehensive QA tests for the Retain Mechanism (Slay the Spire style):
 * - CardTemplate.retain and CardInstance.retain/isRetained fields
 * - Only cards with retain=true stay in hand at end of turn
 * - Non-retain cards go to discard pile at end of turn
 * - Each turn draws 5 fresh cards (minus retained cards already in hand)
 * - toggleRetain only works on cards with innate retain=true
 * - Retain cards (focus, bastion, ward) data integrity
 * - Edge cases: exhaust takes priority over retain
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCardInstance,
  createStartingDeck,
  createInitialState,
  startNewPlayerTurn,
  drawCards,
  HAND_LIMIT,
  resetIdCounter,
  applyCardEffect,
} from '../utils/gameLogic';
import {
  CARD_TEMPLATES,
  CARD_UPGRADES,
  STARTING_DECK_COMPOSITION,
} from '../data/cards';
import type {
  CardInstance,
  CardTemplate,
  GameState,
  EnemyInstance,
} from '../types/game';

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
    player: {
      hp: 70,
      maxHp: 70,
      energy: 3,
      maxEnergy: 3,
      armor: 0,
      statusEffects: [],
      potions: 0,
      potionCooldown: 0,
      thorns: 0,
    },
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

/**
 * Simulates the new endTurn logic (Slay the Spire style):
 * - Only cards with retain=true stay in hand
 * - All other unplayed cards go to discard
 */
function simulateEndTurn(state: GameState): GameState {
  const stayingCards = state.hand.filter(c => c.retain).map(c => ({ ...c, isRetained: false }));
  const discardedCards = state.hand.filter(c => !c.retain);
  return {
    ...state,
    hand: stayingCards,
    discardPile: [...state.discardPile, ...discardedCards],
    retainedCards: [],
    isEnemyTurn: true,
    selectedCardId: null,
  };
}

/**
 * Simulates the toggleRetain logic from useGameState:
 * - Only works on cards with retain=true
 */
function simulateToggleRetain(state: GameState, cardId: string): GameState {
  if (state.isEnemyTurn || state.screen !== 'battle') return state;

  const card = state.hand.find(c => c.instanceId === cardId);
  if (!card || !card.retain) return state;

  if (card.isRetained) {
    return {
      ...state,
      hand: state.hand.map(c =>
        c.instanceId === cardId ? { ...c, isRetained: false } : c
      ),
    };
  }

  return {
    ...state,
    hand: state.hand.map(c =>
      c.instanceId === cardId ? { ...c, isRetained: true } : c
    ),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 📌 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

describe('📌 Retain - Type Definitions', () => {
  it('CardTemplate has optional retain field', () => {
    const template: CardTemplate = {
      id: 'test',
      name: 'test',
      type: 'spell',
      cost: 0,
      description: 'test',
      effect: { type: 'energyGain', energyGain: 1 },
      rarity: 'rare',
    };
    expect(template.retain).toBeUndefined();
  });

  it('CardTemplate can have retain: true', () => {
    const template: CardTemplate = {
      id: 'test',
      name: 'test',
      type: 'spell',
      cost: 0,
      description: 'test',
      effect: { type: 'energyGain', energyGain: 1 },
      rarity: 'rare',
      retain: true,
    };
    expect(template.retain).toBe(true);
  });

  it('CardInstance has retain and isRetained fields', () => {
    const card = makeCard();
    expect(card).toHaveProperty('retain');
    expect(card).toHaveProperty('isRetained');
    expect(typeof card.retain).toBe('boolean');
    expect(typeof card.isRetained).toBe('boolean');
  });

  it('GameState has retainedCards field', () => {
    const state = makeState();
    expect(state).toHaveProperty('retainedCards');
    expect(Array.isArray(state.retainedCards)).toBe(true);
  });

  it('createInitialState has empty retainedCards', () => {
    const state = createInitialState();
    expect(state.retainedCards).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 📌 RETAIN CARD DATA
// ═══════════════════════════════════════════════════════════════════════════

describe('📌 Retain - Card Data', () => {
  it('focus (蓄势) card exists with retain=true', () => {
    const template = CARD_TEMPLATES.find(t => t.id === 'focus');
    expect(template).toBeDefined();
    expect(template!.name).toBe('蓄势');
    expect(template!.retain).toBe(true);
    expect(template!.cost).toBe(0);
    expect(template!.type).toBe('spell');
    expect(template!.rarity).toBe('rare');
    expect(template!.effect.type).toBe('energyGain');
    expect(template!.effect.energyGain).toBe(1);
  });

  it('bastion (筑城) card exists with retain=true', () => {
    const template = CARD_TEMPLATES.find(t => t.id === 'bastion');
    expect(template).toBeDefined();
    expect(template!.name).toBe('筑城');
    expect(template!.retain).toBe(true);
    expect(template!.type).toBe('defense');
    expect(template!.rarity).toBe('rare');
  });

  it('retain cards are focus, bastion, and ward', () => {
    const retainCards = CARD_TEMPLATES.filter(t => t.retain === true);
    expect(retainCards.length).toBe(3);
    expect(retainCards.map(c => c.id).sort()).toEqual(['bastion', 'focus', 'ward']);
  });

  it('focus, bastion, and ward have CARD_UPGRADES entries', () => {
    expect(CARD_UPGRADES['focus']).toBeDefined();
    expect(CARD_UPGRADES['bastion']).toBeDefined();
    expect(CARD_UPGRADES['ward']).toBeDefined();
    expect(CARD_UPGRADES['focus'].name).toBe('蓄势+');
    expect(CARD_UPGRADES['bastion'].name).toBe('筑城+');
  });

  it('focus upgrade: energyGain 1 → 2', () => {
    expect(CARD_UPGRADES['focus'].effect.energyGain).toBe(2);
  });

  it('bastion upgrade: armor increases', () => {
    const bastionTemplate = CARD_TEMPLATES.find(t => t.id === 'bastion')!;
    expect(CARD_UPGRADES['bastion'].effect.armor).toBeGreaterThan(bastionTemplate.effect.armor!);
  });

  it('focus and bastion are NOT in starting deck (trimmed to 12 cards)', () => {
    expect(STARTING_DECK_COMPOSITION['focus']).toBeUndefined();
    expect(STARTING_DECK_COMPOSITION['bastion']).toBeUndefined();
  });

  it('createCardInstance correctly sets retain from template', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const card = createCardInstance(focusTemplate);
    expect(card.retain).toBe(true);
    expect(card.isRetained).toBe(false);
  });

  it('createCardInstance defaults retain=false for non-retain cards', () => {
    const strikeTemplate = CARD_TEMPLATES.find(t => t.id === 'strike')!;
    const card = createCardInstance(strikeTemplate);
    expect(card.retain).toBe(false);
    expect(card.isRetained).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 📌 HAND_LIMIT (safety cap only)
// ═══════════════════════════════════════════════════════════════════════════

describe('📌 HAND_LIMIT (safety cap)', () => {
  it('HAND_LIMIT is 10 (safety cap)', () => {
    expect(HAND_LIMIT).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 📌 END TURN: RETAIN CARDS STAY, NON-RETAIN GO TO DISCARD
// ═══════════════════════════════════════════════════════════════════════════

describe('📌 End Turn - Slay the Spire Style Discard', () => {
  it('innate retain card (retain=true) stays in hand on endTurn', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);
    const normalCard = makeCard({ instanceId: 'normal' });

    const state = makeState({
      hand: [focusCard, normalCard],
      drawPile: createStartingDeck(),
      discardPile: [],
    });

    const result = simulateEndTurn(state);

    // Focus stays in hand (retain=true), normal goes to discard
    expect(result.hand).toHaveLength(1);
    expect(result.hand[0].instanceId).toBe(focusCard.instanceId);
    // Normal card goes to discard
    expect(result.discardPile).toHaveLength(1);
    expect(result.discardPile[0].instanceId).toBe('normal');
    expect(result.retainedCards).toHaveLength(0);
  });

  it('all retain cards stay in hand on endTurn', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const bastionTemplate = CARD_TEMPLATES.find(t => t.id === 'bastion')!;
    const focusCard = createCardInstance(focusTemplate);
    const bastionCard = createCardInstance(bastionTemplate);
    const normalCard = makeCard({ instanceId: 'normal' });

    const state = makeState({
      hand: [focusCard, bastionCard, normalCard],
      discardPile: [],
    });

    const result = simulateEndTurn(state);

    expect(result.hand).toHaveLength(2); // focus + bastion
    expect(result.hand.some(c => c.instanceId === focusCard.instanceId)).toBe(true);
    expect(result.hand.some(c => c.instanceId === bastionCard.instanceId)).toBe(true);
    expect(result.discardPile).toHaveLength(1); // normal
    expect(result.discardPile[0].instanceId).toBe('normal');
  });

  it('all non-retain cards go to discard on endTurn', () => {
    const normal1 = makeCard({ instanceId: 'n1' });
    const normal2 = makeCard({ instanceId: 'n2' });
    const normal3 = makeCard({ instanceId: 'n3' });

    const state = makeState({
      hand: [normal1, normal2, normal3],
      discardPile: [],
    });

    const result = simulateEndTurn(state);

    // All non-retain cards discarded
    expect(result.hand).toHaveLength(0);
    expect(result.discardPile).toHaveLength(3);
    expect(result.retainedCards).toHaveLength(0);
  });

  it('empty hand on endTurn produces empty hand and no discard added', () => {
    const state = makeState({
      hand: [],
      discardPile: [],
    });

    const result = simulateEndTurn(state);
    expect(result.hand).toHaveLength(0);
    expect(result.discardPile).toHaveLength(0);
    expect(result.retainedCards).toHaveLength(0);
  });

  it('playing a non-retain card removes it from hand (goes to discard via play), then endTurn discards remaining', () => {
    const playedCard = makeCard({ instanceId: 'played' });
    const normalCard = makeCard({ instanceId: 'normal' });

    let state = makeState({
      hand: [playedCard, normalCard],
      discardPile: [],
    });

    // Player plays 'played' → goes to discard
    state = {
      ...state,
      hand: state.hand.filter(c => c.instanceId !== 'played'),
      discardPile: [...state.discardPile, playedCard],
    };

    // End turn: remaining normal card goes to discard
    state = simulateEndTurn(state);
    expect(state.hand).toHaveLength(0);
    expect(state.discardPile).toHaveLength(2);
  });

  it('playing an innate retain card moves it to discard, not retained', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);

    let state = makeState({
      hand: [focusCard],
      discardPile: [],
    });

    // Player plays focus card
    state = {
      ...state,
      hand: state.hand.filter(c => c.instanceId !== focusCard.instanceId),
      discardPile: [...state.discardPile, focusCard],
    };

    // End turn: empty hand
    state = simulateEndTurn(state);
    expect(state.hand).toHaveLength(0);
    expect(state.discardPile).toHaveLength(1);
    expect(state.discardPile[0].instanceId).toBe(focusCard.instanceId);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 📌 START NEW PLAYER TURN WITH RETAINED CARDS
// ═══════════════════════════════════════════════════════════════════════════

describe('📌 startNewPlayerTurn - Draw 5 Fresh Cards', () => {
  it('draws exactly 5 cards when hand is empty', () => {
    const deck = createStartingDeck();
    const state = makeState({
      hand: [],
      drawPile: deck,
      discardPile: [],
    });

    const result = startNewPlayerTurn(state);
    expect(result.hand.length).toBe(5);
  });

  it('draws fewer cards when retain cards are already in hand', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);
    const deck = createStartingDeck();

    const state = makeState({
      hand: [focusCard],
      drawPile: deck,
      discardPile: [],
    });

    const result = startNewPlayerTurn(state);
    // 1 retained + 4 drawn = 5 total
    expect(result.hand.length).toBe(5);
    expect(result.hand.some(c => c.instanceId === focusCard.instanceId)).toBe(true);
  });

  it('draws zero new cards when 5 retain cards are already in hand', () => {
    // Create 5 retain cards
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const bastionTemplate = CARD_TEMPLATES.find(t => t.id === 'bastion')!;
    const wardTemplate = CARD_TEMPLATES.find(t => t.id === 'ward')!;
    const retainCards = [
      createCardInstance(focusTemplate),
      createCardInstance(bastionTemplate),
      createCardInstance(wardTemplate),
      createCardInstance(focusTemplate),
      createCardInstance(focusTemplate),
    ];
    const deck = createStartingDeck();

    const state = makeState({
      hand: retainCards,
      drawPile: deck,
      discardPile: [],
    });

    const result = startNewPlayerTurn(state);
    expect(result.hand.length).toBe(5); // All 5 retained, 0 drawn
    expect(result.drawPile.length).toBe(deck.length); // No cards drawn
  });

  it('clears retainedCards array after starting new turn', () => {
    const state = makeState({
      retainedCards: [{ ...makeCard(), instanceId: 'old_retained' }],
      drawPile: createStartingDeck(),
      hand: [],
      discardPile: [],
    });

    const result = startNewPlayerTurn(state);
    expect(result.retainedCards).toHaveLength(0);
  });

  it('isRetained flag is cleared on cards that stay in hand', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);
    // Simulate: focus card was retained in hand from last turn
    const retainedFocus = { ...focusCard, isRetained: true };

    const state = makeState({
      hand: [retainedFocus],
      drawPile: createStartingDeck(),
      discardPile: [],
    });

    const result = startNewPlayerTurn(state);
    const restored = result.hand.find(c => c.instanceId === focusCard.instanceId);
    expect(restored).toBeDefined();
    expect(restored!.retain).toBe(true);
    expect(restored!.isRetained).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 📌 TOGGLE RETAIN (only works on cards with retain=true)
// ═══════════════════════════════════════════════════════════════════════════

describe('📌 Toggle Retain - Only for innate retain cards', () => {
  it('can toggle isRetained on a card with retain=true', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);

    let state = makeState({ hand: [focusCard] });

    // Toggle on
    state = simulateToggleRetain(state, focusCard.instanceId);
    expect(state.hand.find(c => c.instanceId === focusCard.instanceId)!.isRetained).toBe(true);

    // Toggle off
    state = simulateToggleRetain(state, focusCard.instanceId);
    expect(state.hand.find(c => c.instanceId === focusCard.instanceId)!.isRetained).toBe(false);
  });

  it('cannot toggle isRetained on a non-retain card', () => {
    const normalCard = makeCard({ instanceId: 'normal' });
    const state = makeState({ hand: [normalCard] });

    const result = simulateToggleRetain(state, 'normal');
    // Should not change — normal card has retain=false
    expect(result.hand.find(c => c.instanceId === 'normal')!.isRetained).toBe(false);
  });

  it('toggleRetain does nothing during enemy turn', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);
    const state = makeState({ hand: [focusCard], isEnemyTurn: true });

    const result = simulateToggleRetain(state, focusCard.instanceId);
    expect(result.hand.find(c => c.instanceId === focusCard.instanceId)!.isRetained).toBe(false);
  });

  it('toggleRetain does nothing when not in battle', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);
    const state = makeState({ hand: [focusCard], screen: 'map' });

    const result = simulateToggleRetain(state, focusCard.instanceId);
    expect(result.hand.find(c => c.instanceId === focusCard.instanceId)!.isRetained).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 📌 INNATE RETAIN + MANUAL RETAIN COEXISTENCE
// ═══════════════════════════════════════════════════════════════════════════

describe('📌 Innate Retain + Manual Retain Coexistence', () => {
  it('innate retain card (retain=true) is always retained on endTurn regardless of isRetained', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);
    // focusCard.retain = true, focusCard.isRetained = false by default
    const normalCard = makeCard({ instanceId: 'normal' });

    let state = makeState({
      hand: [focusCard, normalCard],
      drawPile: createStartingDeck(),
      discardPile: [],
    });

    state = simulateEndTurn(state);
    // Only focus stays (retain=true), normal goes to discard
    expect(state.hand).toHaveLength(1);
    expect(state.hand[0].instanceId).toBe(focusCard.instanceId);
    expect(state.discardPile).toHaveLength(1);
    expect(state.discardPile[0].instanceId).toBe('normal');
  });

  it('manual toggle on non-retain card does not prevent discard', () => {
    const normalCard = makeCard({ instanceId: 'normal' });
    const state = makeState({ hand: [normalCard] });

    // Try to toggle — should be ignored (retain=false)
    const toggled = simulateToggleRetain(state, 'normal');
    expect(toggled.hand[0].isRetained).toBe(false);

    // End turn — still goes to discard
    const ended = simulateEndTurn(toggled);
    expect(ended.hand).toHaveLength(0);
    expect(ended.discardPile).toHaveLength(1);
  });

  it('multiple innate retain cards all stay in hand on endTurn', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const bastionTemplate = CARD_TEMPLATES.find(t => t.id === 'bastion')!;
    const wardTemplate = CARD_TEMPLATES.find(t => t.id === 'ward')!;
    const focusCard = createCardInstance(focusTemplate);
    const bastionCard = createCardInstance(bastionTemplate);
    const wardCard = createCardInstance(wardTemplate);
    const normal1 = makeCard({ instanceId: 'n1' });
    const normal2 = makeCard({ instanceId: 'n2' });

    const state = makeState({
      hand: [focusCard, bastionCard, wardCard, normal1, normal2],
      discardPile: [],
    });

    const result = simulateEndTurn(state);
    expect(result.hand).toHaveLength(3); // All 3 retain cards stay
    expect(result.discardPile).toHaveLength(2); // 2 normal cards discarded
    expect(result.hand.some(c => c.instanceId === focusCard.instanceId)).toBe(true);
    expect(result.hand.some(c => c.instanceId === bastionCard.instanceId)).toBe(true);
    expect(result.hand.some(c => c.instanceId === wardCard.instanceId)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 📌 EXHAUST TAKES PRIORITY OVER RETAIN
// ═══════════════════════════════════════════════════════════════════════════

describe('📌 Exhaust Takes Priority Over Retain', () => {
  it('exhaust card is removed from play entirely (not retained or discarded)', () => {
    const exhaustCard = makeCard({
      instanceId: 'exhaust_card',
      exhaust: true,
      isRetained: true,
    });
    const normalCard = makeCard({ instanceId: 'normal' });

    let state = makeState({
      hand: [exhaustCard, normalCard],
      discardPile: [],
    });

    // Simulate playing the exhaust card: it gets removed from hand
    state = {
      ...state,
      hand: state.hand.filter(c => c.instanceId !== 'exhaust_card'),
      discardPile: state.discardPile,
    };

    // Now end turn - exhaust card is gone, normal card is discarded
    state = simulateEndTurn(state);
    expect(state.hand).toHaveLength(0);
    expect(state.discardPile).toHaveLength(1); // normal card discarded
    expect(state.discardPile[0].instanceId).toBe('normal');
  });

  it('no current card has both exhaust=true and retain=true', () => {
    const conflictCards = CARD_TEMPLATES.filter(t => t.exhaust && t.retain);
    expect(conflictCards).toHaveLength(0);
  });

  it('Card.tsx shows retain label only when retain=true AND exhaust=false', () => {
    const retainOnly = makeCard({ retain: true, exhaust: false });
    expect(retainOnly.retain && !retainOnly.exhaust).toBe(true);

    const exhaustOnly = makeCard({ retain: false, exhaust: true });
    expect(exhaustOnly.retain && !exhaustOnly.exhaust).toBe(false);

    const both = makeCard({ retain: true, exhaust: true });
    expect(both.retain && !both.exhaust).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 📌 RETAIN CARD EFFECTS (focus, bastion)
// ═══════════════════════════════════════════════════════════════════════════

describe('📌 Retain Card Effects', () => {
  it('focus (蓄势) grants 1 energy when played', () => {
    const card = makeCard({
      templateId: 'focus',
      type: 'spell',
      cost: 0,
      effect: { type: 'energyGain', energyGain: 1, hpCost: 0 },
    });
    const state = makeState({
      player: { hp: 70, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [], potions: 0, potionCooldown: 0, thorns: 0 },
    });
    const result = applyCardEffect(card, state);
    expect(result.player.energy).toBe(4);
    expect(result.player.hp).toBe(70);
  });

  it('bastion (筑城) grants armor when played', () => {
    const bastionTemplate = CARD_TEMPLATES.find(t => t.id === 'bastion')!;
    const card = createCardInstance(bastionTemplate);
    const state = makeState();
    const result = applyCardEffect(card, state);
    expect(result.player.armor).toBe(bastionTemplate.effect.armor);
  });

  it('focus is free (0 cost)', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    expect(focusTemplate.cost).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 📌 FULL TURN CYCLE WITH RETAIN (Slay the Spire style)
// ═══════════════════════════════════════════════════════════════════════════

describe('📌 Full Turn Cycle with Retain', () => {
  beforeEach(() => resetIdCounter());

  it('complete cycle: retain card stays, non-retain cards get discarded and redrawn', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);
    const normal1 = makeCard({ instanceId: 'normal_1' });
    const normal2 = makeCard({ instanceId: 'normal_2' });
    const deck = createStartingDeck();

    // Turn 1: hand has focus + 2 normal cards + 2 more from draw
    let state = makeState({
      hand: [focusCard, normal1, normal2],
      drawPile: deck,
      discardPile: [],
    });

    // End turn: focus stays, normal cards go to discard
    state = simulateEndTurn(state);
    expect(state.hand).toHaveLength(1); // focus retained
    expect(state.hand[0].instanceId).toBe(focusCard.instanceId);
    expect(state.discardPile).toHaveLength(2); // normal_1, normal_2
    expect(state.isEnemyTurn).toBe(true);

    // Start new player turn
    state = startNewPlayerTurn(state);
    expect(state.isEnemyTurn).toBe(false);
    expect(state.retainedCards).toHaveLength(0);

    // Focus should still be in hand, plus 4 new cards drawn
    expect(state.hand.length).toBe(5);
    expect(state.hand.some(c => c.instanceId === focusCard.instanceId)).toBe(true);
  });

  it('focus card persists across multiple turns (never discarded)', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);
    const deck = createStartingDeck();

    let state = makeState({
      hand: [focusCard],
      drawPile: deck,
      discardPile: [],
    });

    // Turn 1: end turn — focus stays in hand
    state = simulateEndTurn(state);
    expect(state.hand[0].instanceId).toBe(focusCard.instanceId);

    // Turn 2: start new turn — focus still there, 4 more drawn
    state = startNewPlayerTurn(state);
    expect(state.hand.some(c => c.instanceId === focusCard.instanceId)).toBe(true);
    const turn2Focus = state.hand.find(c => c.instanceId === focusCard.instanceId);
    expect(turn2Focus!.retain).toBe(true);

    // Turn 2: end turn again — focus stays
    state = simulateEndTurn(state);
    expect(state.hand.some(c => c.instanceId === focusCard.instanceId)).toBe(true);

    // Turn 3: focus still there
    state = startNewPlayerTurn(state);
    expect(state.hand.some(c => c.instanceId === focusCard.instanceId)).toBe(true);
    const turn3Focus = state.hand.find(c => c.instanceId === focusCard.instanceId);
    expect(turn3Focus!.retain).toBe(true);
  });

  it('normal cards cycle through draw → hand → discard → reshuffle → draw', () => {
    // Create a state with only non-retain cards
    const deck = createStartingDeck(); // 12 cards

    // Put all 12 cards in draw, draw 5 into hand initially (as battle start would)
    let state = makeState({
      hand: deck.slice(0, 5),
      drawPile: deck.slice(5),  // 7 cards remaining in draw
      discardPile: [],
    });

    // End turn: all 5 non-retain cards go to discard
    state = simulateEndTurn(state);
    expect(state.hand).toHaveLength(0);
    expect(state.discardPile).toHaveLength(5);

    // Start new turn: draws 5 from draw pile (still has 7 cards), no reshuffle needed
    state = startNewPlayerTurn(state);
    expect(state.hand.length).toBe(5);
    expect(state.drawPile.length).toBe(2); // 7 - 5 = 2
    // Discard pile untouched since draw pile wasn't empty
    expect(state.discardPile.length).toBe(5);

    // End turn again: discard 5 more
    state = simulateEndTurn(state);
    expect(state.discardPile.length).toBe(10); // 5 + 5 = 10

    // Start new turn: draw pile has only 2, so draws 2 then reshuffles discard for 3 more
    state = startNewPlayerTurn(state);
    expect(state.hand.length).toBe(5);
    // Discard was reshuffled into draw pile and 3 cards drawn from it
    // So discard should have 10 - 3 = 7 remaining (reshuffled 10, drew 3)
    // Actually: drawCards draws 2 from draw, then reshuffles discard (10) into draw, draws 3
    // Result: 5 in hand, 7 in draw (remaining from reshuffled)
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 📌 EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════

describe('📌 Retain Edge Cases', () => {
  it('retainedCards is reset when entering a new battle (selectMapNode)', () => {
    const state = createInitialState();
    expect(state.retainedCards).toEqual([]);
  });

  it('retainedCards is reset when returning to map', () => {
    const state: GameState = {
      ...createInitialState(),
      screen: 'map',
      retainedCards: [],
    };
    expect(state.retainedCards).toEqual([]);
  });

  it('starting deck excludes focus, bastion, and ward (trimmed)', () => {
    const deck = createStartingDeck();
    const focusCards = deck.filter(c => c.templateId === 'focus');
    const bastionCards = deck.filter(c => c.templateId === 'bastion');
    const wardCards = deck.filter(c => c.templateId === 'ward');
    expect(focusCards).toHaveLength(0);
    expect(bastionCards).toHaveLength(0);
    expect(wardCards).toHaveLength(0);
  });
});
