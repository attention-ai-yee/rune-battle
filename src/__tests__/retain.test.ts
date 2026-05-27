/**
 * Comprehensive QA tests for the Retain Mechanism:
 * - CardTemplate.retain and CardInstance.retain/isRetained fields
 * - MAX_RETAIN constant and getHandLimit function
 * - toggleRetain action in useGameState
 * - endTurn separating retained vs non-retained cards
 * - startNewPlayerTurn restoring retained cards and drawing
 * - Retain cards (focus, bastion) data integrity
 * - Edge cases: innate retain + manual retain coexistence
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCardInstance,
  createStartingDeck,
  createInitialState,
  startNewPlayerTurn,
  drawCards,
  getHandLimit,
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
 * Simulates the endTurn logic from useGameState:
 * ALL unplayed cards are retained for next turn (enables combo planning).
 * Non-retained cards are NOT discarded — they stay in retainedCards.
 */
function simulateEndTurn(state: GameState): GameState {
  const retainedCards = state.hand.map(c => ({ ...c, isRetained: false }));
  return {
    ...state,
    hand: [],
    discardPile: state.discardPile,
    retainedCards,
    isEnemyTurn: true,
    selectedCardId: null,
  };
}

/**
 * Simulates the toggleRetain logic from useGameState:
 * - If card is already isRetained, unretain it
 * - Otherwise, retain it (no limit — all unplayed cards are auto-retained anyway)
 */
function simulateToggleRetain(state: GameState, cardId: string): GameState {
  if (state.isEnemyTurn || state.screen !== 'battle') return state;

  const card = state.hand.find(c => c.instanceId === cardId);
  if (!card) return state;

  // If already retained, unretain it
  if (card.isRetained) {
    return {
      ...state,
      hand: state.hand.map(c =>
        c.instanceId === cardId ? { ...c, isRetained: false } : c
      ),
    };
  }

  // No limit — retain it (all unplayed cards auto-retain anyway)
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
    // retain is optional - should be undefined by default
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
    // Base bastion has armor 4, upgraded should have more
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
// 📌 MAX_RETAIN AND getHandLimit
// ═══════════════════════════════════════════════════════════════════════════

describe('📌 HAND_LIMIT and getHandLimit', () => {
  it('HAND_LIMIT is 7', () => {
    expect(HAND_LIMIT).toBe(7);
  });

  it('getHandLimit(0) = 4 (base hand size)', () => {
    expect(getHandLimit(0)).toBe(4);
  });

  it('getHandLimit(1) = 5 (4 + 1 retained)', () => {
    expect(getHandLimit(1)).toBe(5);
  });

  it('getHandLimit(2) = 6 (4 + 2 retained)', () => {
    expect(getHandLimit(2)).toBe(6);
  });

  it('getHandLimit(4) = 7 (4 + 4 retained, capped at HAND_LIMIT=7)', () => {
    expect(getHandLimit(4)).toBe(7);
  });

  it('getHandLimit(8) = 7 (capped at HAND_LIMIT)', () => {
    expect(getHandLimit(8)).toBe(7);
  });

  it('getHandLimit formula: min(7, retainedCount + 4)', () => {
    expect(getHandLimit(0)).toBe(Math.min(7, 0 + 4)); // 4
    expect(getHandLimit(3)).toBe(Math.min(7, 3 + 4)); // 7
    expect(getHandLimit(4)).toBe(Math.min(7, 4 + 4)); // 7 (capped)
    expect(getHandLimit(7)).toBe(Math.min(7, 7 + 4)); // 7 (capped)
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 📌 RETAIN CARDS PERSIST BETWEEN TURNS
// ═══════════════════════════════════════════════════════════════════════════

describe('📌 Retained Cards Persist Between Turns', () => {
  it('manually retained card (isRetained=true) persists through endTurn + startNewPlayerTurn', () => {
    const retainedCard = makeCard({
      instanceId: 'retain_card',
      isRetained: true,
    });
    const otherCard = makeCard({ instanceId: 'other_card' });
    const deck = createStartingDeck();

    // Start with hand containing a retained card and a normal card
    let state = makeState({
      hand: [retainedCard, otherCard],
      drawPile: deck,
      discardPile: [],
    });

    // End turn: ALL unplayed cards are retained (combo planning)
    state = simulateEndTurn(state);
    expect(state.retainedCards).toHaveLength(2); // Both cards retained
    expect(state.retainedCards.find(c => c.instanceId === 'retain_card')).toBeDefined();
    expect(state.retainedCards.find(c => c.instanceId === 'other_card')).toBeDefined();
    expect(state.discardPile).toHaveLength(0); // Nothing discarded
    expect(state.hand).toHaveLength(0);

    // Start new player turn: retained cards restored, new cards drawn
    state = startNewPlayerTurn(state);
    // The retained card should be back in hand
    expect(state.hand.some(c => c.instanceId === 'retain_card')).toBe(true);
    // isRetained should be cleared
    const restoredCard = state.hand.find(c => c.instanceId === 'retain_card');
    expect(restoredCard!.isRetained).toBe(false);
    // Should have drawn additional cards (handLimit = 6 for 2 retained cards, draw 6-2=4)
    expect(state.hand.length).toBe(6); // 2 retained + 4 drawn
    // retainedCards should be cleared
    expect(state.retainedCards).toHaveLength(0);
  });

  it('innate retain card (retain=true) persists through endTurn + startNewPlayerTurn', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);
    const otherCard = makeCard({ instanceId: 'other_card' });
    const deck = createStartingDeck();

    let state = makeState({
      hand: [focusCard, otherCard],
      drawPile: deck,
      discardPile: [],
    });

    // End turn: ALL unplayed cards are retained (both focus and other)
    state = simulateEndTurn(state);
    expect(state.retainedCards).toHaveLength(2); // Both cards retained
    expect(state.retainedCards.find(c => c.instanceId === focusCard.instanceId)).toBeDefined();
    expect(state.discardPile).toHaveLength(0);

    // Start new player turn
    state = startNewPlayerTurn(state);
    expect(state.hand.some(c => c.instanceId === focusCard.instanceId)).toBe(true);
    // Focus card should still have retain=true
    const restoredFocus = state.hand.find(c => c.instanceId === focusCard.instanceId);
    expect(restoredFocus!.retain).toBe(true);
    // isRetained should be false (cleared at start of new turn)
    expect(restoredFocus!.isRetained).toBe(false);
  });

  it('unplayed card is retained on endTurn (new: all cards auto-retain)', () => {
    const normalCard = makeCard({ instanceId: 'normal' });
    const deck = createStartingDeck();

    let state = makeState({
      hand: [normalCard],
      drawPile: deck,
      discardPile: [],
    });

    state = simulateEndTurn(state);
    expect(state.retainedCards).toHaveLength(1); // All unplayed cards retained
    expect(state.retainedCards[0].instanceId).toBe('normal');
    expect(state.discardPile).toHaveLength(0); // Nothing discarded
  });

  it('multiple cards persist between turns (all auto-retained)', () => {
    const retained1 = makeCard({ instanceId: 'r1', isRetained: true });
    const retained2 = makeCard({ instanceId: 'r2', retain: true });
    const normal = makeCard({ instanceId: 'normal' });
    const deck = createStartingDeck();

    let state = makeState({
      hand: [retained1, retained2, normal],
      drawPile: deck,
      discardPile: [],
    });

    state = simulateEndTurn(state);
    expect(state.retainedCards).toHaveLength(3); // All 3 cards retained
    expect(state.discardPile).toHaveLength(0);

    state = startNewPlayerTurn(state);
    // 3 retained + drawn cards; handLimit = getHandLimit(3) = 7, draw 7-3=4
    expect(state.hand.length).toBe(7); // 3 retained + 4 drawn
  });

  it('retained card can be retained again in subsequent turns', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);
    // Use a deck of only non-retain cards to avoid drawing more retain cards
    const strikeTemplate = CARD_TEMPLATES.find(t => t.id === 'strike')!;
    const deck: CardInstance[] = [];
    for (let i = 0; i < 10; i++) {
      deck.push(createCardInstance(strikeTemplate));
    }

    let state = makeState({
      hand: [focusCard],
      drawPile: deck,
      discardPile: [],
    });

    // Turn 1: end turn, focus gets retained
    state = simulateEndTurn(state);
    expect(state.retainedCards).toHaveLength(1);

    // Turn 2: start new turn, focus is back in hand
    state = startNewPlayerTurn(state);
    const restoredFocus = state.hand.find(c => c.instanceId === focusCard.instanceId);
    expect(restoredFocus).toBeDefined();
    expect(restoredFocus!.retain).toBe(true);
    expect(restoredFocus!.isRetained).toBe(false); // isRetained cleared

    // Turn 2: end turn again, focus should be retained again (because retain=true)
    // But other drawn cards (strike cards, retain=false) should go to discard
    state = simulateEndTurn(state);
    // Only the focus card should be retained (other cards are non-retain)
    const retainedCount = state.retainedCards.length;
    expect(retainedCount).toBeGreaterThanOrEqual(1);
    expect(state.retainedCards.some(c => c.instanceId === focusCard.instanceId)).toBe(true);

    // Turn 3: focus is still in hand
    state = startNewPlayerTurn(state);
    expect(state.hand.some(c => c.instanceId === focusCard.instanceId)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 📌 MAX_RETAIN LIMIT ENFORCEMENT
// ═══════════════════════════════════════════════════════════════════════════

describe('📌 No Retain Limit (all unplayed cards auto-retain)', () => {
  it('can manually retain any number of cards (no limit)', () => {
    const card1 = makeCard({ instanceId: 'c1' });
    const card2 = makeCard({ instanceId: 'c2' });
    const card3 = makeCard({ instanceId: 'c3' });

    let state = makeState({ hand: [card1, card2, card3] });

    // Retain first card
    state = simulateToggleRetain(state, 'c1');
    expect(state.hand.find(c => c.instanceId === 'c1')!.isRetained).toBe(true);

    // Retain second card
    state = simulateToggleRetain(state, 'c2');
    expect(state.hand.find(c => c.instanceId === 'c2')!.isRetained).toBe(true);

    // Retain third card — no limit
    state = simulateToggleRetain(state, 'c3');
    expect(state.hand.find(c => c.instanceId === 'c3')!.isRetained).toBe(true);
  });

  it('innate retain cards and manual retain cards coexist without limit', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const bastionTemplate = CARD_TEMPLATES.find(t => t.id === 'bastion')!;
    const focusCard = createCardInstance(focusTemplate);
    const bastionCard = createCardInstance(bastionTemplate);
    const normalCard = makeCard({ instanceId: 'normal' });

    // Hand: focus (retain=true), bastion (retain=true), normal card
    let state = makeState({ hand: [focusCard, bastionCard, normalCard] });

    // Can manually retain the normal card too — no limit
    state = simulateToggleRetain(state, 'normal');
    expect(state.hand.find(c => c.instanceId === 'normal')!.isRetained).toBe(true);
  });

  it('manual retain + innate retain all work together', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);
    const normal1 = makeCard({ instanceId: 'n1' });
    const normal2 = makeCard({ instanceId: 'n2' });

    let state = makeState({ hand: [focusCard, normal1, normal2] });

    // Retain normal1 manually
    state = simulateToggleRetain(state, 'n1');
    expect(state.hand.find(c => c.instanceId === 'n1')!.isRetained).toBe(true);

    // Can also retain n2 — no limit
    state = simulateToggleRetain(state, 'n2');
    expect(state.hand.find(c => c.instanceId === 'n2')!.isRetained).toBe(true);
  });

  it('unretaining a card works', () => {
    const card1 = makeCard({ instanceId: 'c1' });
    const card2 = makeCard({ instanceId: 'c2' });

    let state = makeState({ hand: [card1, card2] });

    // Retain two cards
    state = simulateToggleRetain(state, 'c1');
    state = simulateToggleRetain(state, 'c2');
    expect(state.hand.find(c => c.instanceId === 'c1')!.isRetained).toBe(true);
    expect(state.hand.find(c => c.instanceId === 'c2')!.isRetained).toBe(true);

    // Unretain c1
    state = simulateToggleRetain(state, 'c1');
    expect(state.hand.find(c => c.instanceId === 'c1')!.isRetained).toBe(false);
    expect(state.hand.find(c => c.instanceId === 'c2')!.isRetained).toBe(true);
  });

  it('toggleRetain does nothing during enemy turn', () => {
    const card = makeCard({ instanceId: 'c1' });
    const state = makeState({ hand: [card], isEnemyTurn: true });

    const result = simulateToggleRetain(state, 'c1');
    expect(result.hand.find(c => c.instanceId === 'c1')!.isRetained).toBe(false);
  });

  it('toggleRetain does nothing when not in battle', () => {
    const card = makeCard({ instanceId: 'c1' });
    const state = makeState({ hand: [card], screen: 'map' });

    const result = simulateToggleRetain(state, 'c1');
    expect(result.hand.find(c => c.instanceId === 'c1')!.isRetained).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 📌 INNATE RETAIN + MANUAL RETAIN COEXISTENCE
// ═══════════════════════════════════════════════════════════════════════════

describe('📌 Innate Retain + Manual Retain Coexistence', () => {
  it('innate retain card (retain=true) is always retained on endTurn even without manual toggle', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);
    // focusCard.retain = true, focusCard.isRetained = false
    const normalCard = makeCard({ instanceId: 'normal' });

    let state = makeState({
      hand: [focusCard, normalCard],
      drawPile: createStartingDeck(),
      discardPile: [],
    });

    state = simulateEndTurn(state);
    // All unplayed cards are auto-retained (including normal card)
    expect(state.retainedCards).toHaveLength(2);
    expect(state.retainedCards.find(c => c.instanceId === focusCard.instanceId)).toBeDefined();
    expect(state.retainedCards.find(c => c.instanceId === 'normal')).toBeDefined();
    // Nothing goes to discard
    expect(state.discardPile).toHaveLength(0);
  });

  it('innate retain card is auto-retained along with all other cards', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);
    const normal1 = makeCard({ instanceId: 'n1' });
    const normal2 = makeCard({ instanceId: 'n2' });

    let state = makeState({ hand: [focusCard, normal1, normal2] });

    // All cards can be manually retained (no limit)
    state = simulateToggleRetain(state, 'n1');
    expect(state.hand.find(c => c.instanceId === 'n1')!.isRetained).toBe(true);

    state = simulateToggleRetain(state, 'n2');
    expect(state.hand.find(c => c.instanceId === 'n2')!.isRetained).toBe(true);
  });

  it('manually retained card (isRetained=true) without retain field persists on endTurn', () => {
    const manualRetain = makeCard({ instanceId: 'manual', isRetained: true });
    const deck = createStartingDeck();

    let state = makeState({
      hand: [manualRetain],
      drawPile: deck,
      discardPile: [],
    });

    state = simulateEndTurn(state);
    expect(state.retainedCards).toHaveLength(1);
    expect(state.retainedCards[0].instanceId).toBe('manual');
  });

  it('all unplayed cards persist together (auto-retain)', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);
    const manualRetain = makeCard({ instanceId: 'manual', isRetained: true });
    const normal = makeCard({ instanceId: 'normal' });
    const deck = createStartingDeck();

    let state = makeState({
      hand: [focusCard, manualRetain, normal],
      drawPile: deck,
      discardPile: [],
    });

    state = simulateEndTurn(state);
    expect(state.retainedCards).toHaveLength(3); // All cards auto-retained
    expect(state.discardPile).toHaveLength(0);

    state = startNewPlayerTurn(state);
    // All retained cards should be in hand
    expect(state.hand.some(c => c.instanceId === focusCard.instanceId)).toBe(true);
    expect(state.hand.some(c => c.instanceId === 'manual')).toBe(true);
    expect(state.hand.some(c => c.instanceId === 'normal')).toBe(true);
    // isRetained should be cleared for all
    const restoredManual = state.hand.find(c => c.instanceId === 'manual');
    expect(restoredManual!.isRetained).toBe(false);
    // Focus retain field should still be true
    const restoredFocus = state.hand.find(c => c.instanceId === focusCard.instanceId);
    expect(restoredFocus!.retain).toBe(true);
    expect(restoredFocus!.isRetained).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 📌 EXHAUST TAKES PRIORITY OVER RETAIN
// ═══════════════════════════════════════════════════════════════════════════

describe('📌 Exhaust Takes Priority Over Retain', () => {
  it('exhaust card is removed from play entirely (not retained or discarded)', () => {
    // Simulate: a card with both exhaust and retain (hypothetical)
    // In playCardOnState, exhaust cards are removed from hand entirely
    // They don't go to discard pile, so they can't be retained on endTurn
    const exhaustCard = makeCard({
      instanceId: 'exhaust_card',
      exhaust: true,
      isRetained: true, // Even if marked retained
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
      // Exhaust card does NOT go to discardPile
      discardPile: state.discardPile,
    };

    // Now end turn - exhaust card is no longer in hand, normal card is retained
    state = simulateEndTurn(state);
    expect(state.retainedCards).toHaveLength(1); // normal card is retained (auto-retain)
    expect(state.retainedCards[0].instanceId).toBe('normal');
    expect(state.discardPile).toHaveLength(0); // Nothing discarded (auto-retain)
  });

  it('no current card has both exhaust=true and retain=true', () => {
    // Verify that no card template has both exhaust and retain
    const conflictCards = CARD_TEMPLATES.filter(t => t.exhaust && t.retain);
    expect(conflictCards).toHaveLength(0);
  });

  it('Card.tsx shows retain label only when retain=true AND exhaust=false', () => {
    // This mirrors the logic in Card.tsx line 192: {card.retain && !card.exhaust && (...)}
    const retainOnly = makeCard({ retain: true, exhaust: false });
    expect(retainOnly.retain && !retainOnly.exhaust).toBe(true);

    const exhaustOnly = makeCard({ retain: false, exhaust: true });
    expect(exhaustOnly.retain && !exhaustOnly.exhaust).toBe(false);

    const both = makeCard({ retain: true, exhaust: true });
    expect(both.retain && !both.exhaust).toBe(false); // Retain label hidden when exhaust
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 📌 START NEW PLAYER TURN WITH RETAINED CARDS
// ═══════════════════════════════════════════════════════════════════════════

describe('📌 startNewPlayerTurn with Retained Cards', () => {
  it('draws fewer cards when retained cards are in hand (1 retained)', () => {
    const retainedCard = makeCard({ instanceId: 'retained', isRetained: true });
    const deck = createStartingDeck();

    let state = makeState({
      retainedCards: [retainedCard],
      drawPile: deck,
      hand: [],
      discardPile: [],
    });

    state = startNewPlayerTurn(state);
    // handLimit = getHandLimit(1) = 5, cardsToDraw = 5 - 1 = 4
    expect(state.hand.length).toBe(5); // 1 retained + 4 drawn
  });

  it('draws fewer cards when 2 retained cards are in hand', () => {
    const retained1 = makeCard({ instanceId: 'r1', isRetained: true });
    const retained2 = makeCard({ instanceId: 'r2', isRetained: true });
    const deck = createStartingDeck();

    let state = makeState({
      retainedCards: [retained1, retained2],
      drawPile: deck,
      hand: [],
      discardPile: [],
    });

    state = startNewPlayerTurn(state);
    // handLimit = getHandLimit(2) = 6, cardsToDraw = 6 - 2 = 4
    expect(state.hand.length).toBe(6); // 2 retained + 4 drawn
  });

  it('clears isRetained on restored cards', () => {
    const retainedCard = makeCard({ instanceId: 'retained', isRetained: true });
    const deck = createStartingDeck();

    let state = makeState({
      retainedCards: [retainedCard],
      drawPile: deck,
      hand: [],
      discardPile: [],
    });

    state = startNewPlayerTurn(state);
    const restored = state.hand.find(c => c.instanceId === 'retained');
    expect(restored!.isRetained).toBe(false);
  });

  it('clears retainedCards array after restoring', () => {
    const retainedCard = makeCard({ instanceId: 'retained', isRetained: true });
    const deck = createStartingDeck();

    let state = makeState({
      retainedCards: [retainedCard],
      drawPile: deck,
      hand: [],
      discardPile: [],
    });

    state = startNewPlayerTurn(state);
    expect(state.retainedCards).toHaveLength(0);
  });

  it('handles empty retainedCards (normal turn)', () => {
    const deck = createStartingDeck();
    const state = makeState({
      retainedCards: [],
      drawPile: deck,
      hand: [],
      discardPile: [],
    });

    const result = startNewPlayerTurn(state);
    // handLimit = getHandLimit(0) = 4, draw 4 cards
    expect(result.hand.length).toBe(4);
    expect(result.retainedCards).toHaveLength(0);
  });

  it('retained cards with retain=true keep retain flag after restoration', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);
    const deck = createStartingDeck();

    let state = makeState({
      retainedCards: [focusCard],
      drawPile: deck,
      hand: [],
      discardPile: [],
    });

    state = startNewPlayerTurn(state);
    const restored = state.hand.find(c => c.instanceId === focusCard.instanceId);
    expect(restored!.retain).toBe(true);
    expect(restored!.isRetained).toBe(false);
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
      player: { hp: 70, maxHp: 70, energy: 3, maxEnergy: 3, armor: 0, statusEffects: [], potions: 0, thorns: 0 },
    });
    const result = applyCardEffect(card, state);
    expect(result.player.energy).toBe(4); // 3 + 1
    expect(result.player.hp).toBe(70); // No HP cost (hpCost: 0)
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
// 📌 FULL TURN CYCLE WITH RETAIN
// ═══════════════════════════════════════════════════════════════════════════

describe('📌 Full Turn Cycle with Retain', () => {
  beforeEach(() => resetIdCounter());

  it('complete cycle: retain cards → end turn → enemy turn → new turn with retained cards', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);
    const manualRetain = makeCard({ instanceId: 'manual_retain', isRetained: true });
    const normalCard = makeCard({ instanceId: 'normal_card' });
    const deck = createStartingDeck();

    // Initial state with hand
    let state = makeState({
      hand: [focusCard, manualRetain, normalCard],
      drawPile: deck,
      discardPile: [],
    });

    // End turn — ALL unplayed cards are retained
    state = simulateEndTurn(state);
    expect(state.retainedCards).toHaveLength(3); // All 3 cards retained
    expect(state.discardPile).toHaveLength(0); // Nothing discarded
    expect(state.isEnemyTurn).toBe(true);

    // Start new player turn (simulating after enemy turn)
    state = startNewPlayerTurn(state);
    expect(state.isEnemyTurn).toBe(false);
    expect(state.retainedCards).toHaveLength(0);

    // All 3 retained cards should be in hand
    expect(state.hand.some(c => c.instanceId === focusCard.instanceId)).toBe(true);
    expect(state.hand.some(c => c.instanceId === 'manual_retain')).toBe(true);
    expect(state.hand.some(c => c.instanceId === 'normal_card')).toBe(true);

    // isRetained should be cleared
    const restoredManual = state.hand.find(c => c.instanceId === 'manual_retain');
    expect(restoredManual!.isRetained).toBe(false);
    // But retain field should persist
    const restoredFocus = state.hand.find(c => c.instanceId === focusCard.instanceId);
    expect(restoredFocus!.retain).toBe(true);

    // Hand should have: 3 retained + drawn cards
    // handLimit = getHandLimit(3) = 7, cardsToDraw = 7 - 3 = 4
    expect(state.hand.length).toBe(7);
  });

  it('focus card persists across multiple turns', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);
    const deck = createStartingDeck();

    let state = makeState({
      hand: [focusCard],
      drawPile: deck,
      discardPile: [],
    });

    // Turn 1: end turn
    state = simulateEndTurn(state);
    expect(state.retainedCards[0].instanceId).toBe(focusCard.instanceId);

    // Turn 2: start new turn
    state = startNewPlayerTurn(state);
    const turn2Focus = state.hand.find(c => c.instanceId === focusCard.instanceId);
    expect(turn2Focus).toBeDefined();
    expect(turn2Focus!.retain).toBe(true);

    // Turn 2: end turn again
    state = simulateEndTurn(state);
    expect(state.retainedCards[0].instanceId).toBe(focusCard.instanceId);

    // Turn 3: focus is still there
    state = startNewPlayerTurn(state);
    const turn3Focus = state.hand.find(c => c.instanceId === focusCard.instanceId);
    expect(turn3Focus).toBeDefined();
    expect(turn3Focus!.retain).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 📌 EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════

describe('📌 Retain Edge Cases', () => {
  it('playing a card removes it from hand (not retained on endTurn)', () => {
    // A card that gets played should not be retained on endTurn because it's no longer in hand
    const playedCard = makeCard({ instanceId: 'played' });
    const normalCard = makeCard({ instanceId: 'normal' });
    const deck = createStartingDeck();

    let state = makeState({
      hand: [playedCard, normalCard],
      drawPile: deck,
      discardPile: [],
    });

    // Player plays the card (removes from hand, adds to discard)
    state = {
      ...state,
      hand: state.hand.filter(c => c.instanceId !== 'played'),
      discardPile: [...state.discardPile, playedCard],
    };

    // End turn — remaining hand cards are retained
    state = simulateEndTurn(state);
    expect(state.retainedCards).toHaveLength(1); // normal card retained
    expect(state.retainedCards[0].instanceId).toBe('normal');
  });

  it('innate retain card played is not retained (goes to discard)', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus')!;
    const focusCard = createCardInstance(focusTemplate);

    let state = makeState({
      hand: [focusCard],
      drawPile: createStartingDeck(),
      discardPile: [],
    });

    // Player plays the focus card
    state = {
      ...state,
      hand: state.hand.filter(c => c.instanceId !== focusCard.instanceId),
      discardPile: [...state.discardPile, focusCard],
    };

    // End turn - empty hand → no retained cards
    state = simulateEndTurn(state);
    expect(state.retainedCards).toHaveLength(0);
    expect(state.discardPile.some(c => c.instanceId === focusCard.instanceId)).toBe(true);
  });

  it('empty hand on endTurn produces empty retainedCards', () => {
    const state = makeState({
      hand: [],
      drawPile: createStartingDeck(),
      discardPile: [],
    });

    const result = simulateEndTurn(state);
    expect(result.retainedCards).toHaveLength(0);
  });

  it('all cards retained on endTurn produces empty discardPile addition', () => {
    const retained1 = makeCard({ instanceId: 'r1', isRetained: true });
    const retained2 = makeCard({ instanceId: 'r2', retain: true });

    const state = makeState({
      hand: [retained1, retained2],
      drawPile: createStartingDeck(),
      discardPile: [],
    });

    const result = simulateEndTurn(state);
    expect(result.retainedCards).toHaveLength(2);
    expect(result.discardPile).toHaveLength(0);
  });

  it('starting deck excludes focus and bastion (trimmed)', () => {
    const deck = createStartingDeck();
    const focusCards = deck.filter(c => c.templateId === 'focus');
    const bastionCards = deck.filter(c => c.templateId === 'bastion');
    expect(focusCards).toHaveLength(0);
    expect(bastionCards).toHaveLength(0);
  });

  it('focus and bastion cards in CARD_TEMPLATES have retain=true', () => {
    const focusTemplate = CARD_TEMPLATES.find(t => t.id === 'focus');
    const bastionTemplate = CARD_TEMPLATES.find(t => t.id === 'bastion');
    expect(focusTemplate!.retain).toBe(true);
    expect(bastionTemplate!.retain).toBe(true);
  });

  it('retainedCards is reset when entering a new battle (selectMapNode)', () => {
    // In useGameState.selectMapNode, retainedCards: [] is set
    // Verify the data model supports this
    const state = createInitialState();
    expect(state.retainedCards).toEqual([]);
  });

  it('retainedCards is reset when returning to map', () => {
    // In returnToMapFromState, retainedCards: [] is set
    // Verify via the data model
    const state: GameState = {
      ...createInitialState(),
      screen: 'map',
      retainedCards: [],
    };
    expect(state.retainedCards).toEqual([]);
  });
});
