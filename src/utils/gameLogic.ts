import type {
  CardInstance,
  CardTemplate,
  EnemyInstance,
  EnemyIntent,
  EnemyTemplate,
  GameState,
  PlayerState,
  StatusEffect,
  StatusEffectType,
} from '../types/game';
import { CARD_TEMPLATES, STARTING_DECK_COMPOSITION, CARD_UPGRADES } from '../data/cards';
import { getEnemyTemplate } from '../data/enemies';

/** Auto-incrementing ID counter */
let idCounter = 0;

/** Generate a unique instance ID */
export function generateId(prefix: string = 'id'): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

/** Reset ID counter (for testing) */
export function resetIdCounter(): void {
  idCounter = 0;
}

/** Fisher-Yates shuffle - returns a new shuffled array */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Create a card instance from a template */
export function createCardInstance(template: CardTemplate): CardInstance {
  return {
    instanceId: generateId('card'),
    templateId: template.id,
    name: template.name,
    type: template.type,
    cost: template.cost,
    description: template.description,
    effect: { ...template.effect },
    rarity: template.rarity,
    upgraded: false,
    exhaust: template.exhaust ?? false,
    retain: template.retain ?? false,
    isRetained: false,
  };
}

/** Create the starting deck for the player */
export function createStartingDeck(): CardInstance[] {
  const deck: CardInstance[] = [];
  for (const [templateId, count] of Object.entries(STARTING_DECK_COMPOSITION)) {
    const template = CARD_TEMPLATES.find(t => t.id === templateId);
    if (!template) continue;
    for (let i = 0; i < count; i++) {
      deck.push(createCardInstance(template));
    }
  }
  return deck;
}

/** Create an enemy instance from a template */
export function createEnemyInstance(template: EnemyTemplate): EnemyInstance {
  const intent = rollEnemyIntent(template.moves, 0, template.immuneToFreeze);
  return {
    instanceId: generateId('enemy'),
    templateId: template.id,
    name: template.name,
    hp: template.maxHp,
    maxHp: template.maxHp,
    armor: 0,
    strength: 0,
    intent,
    moves: template.moves.map(m => ({ ...m })),
    emoji: template.emoji,
    isHit: false,
    statusEffects: [],
    isFrozen: false,
  };
}

/** Get total burn stacks from status effects */
export function getBurnStacks(statusEffects: StatusEffect[]): number {
  return statusEffects
    .filter(s => s.type === 'burn')
    .reduce((sum, s) => sum + s.value, 0);
}

/** Get total poison stacks from status effects */
export function getPoisonStacks(statusEffects: StatusEffect[]): number {
  return statusEffects
    .filter(s => s.type === 'poison')
    .reduce((sum, s) => sum + s.value, 0);
}

/** Add a status effect to an entity, merging same-type effects */
export function addStatusEffect(
  statusEffects: StatusEffect[],
  newEffect: StatusEffect
): StatusEffect[] {
  const existing = statusEffects.find(s => s.type === newEffect.type);
  if (existing) {
    // Merge: poison stacks add up; burn/freeze take the larger value
    if (newEffect.type === 'poison') {
      return statusEffects.map(s =>
        s.type === 'poison' ? { ...s, value: s.value + newEffect.value } : s
      );
    } else {
      // burn/freeze: take max duration
      return statusEffects.map(s =>
        s.type === newEffect.type ? { ...s, value: Math.max(s.value, newEffect.value) } : s
      );
    }
  }
  return [...statusEffects, { ...newEffect }];
}

/** Roll a random intent for an enemy based on its moves and strength */
export function rollEnemyIntent(
  moves: EnemyInstance['moves'],
  strength: number,
  immuneToFreeze?: boolean
): EnemyIntent {
  if (moves.length === 0) {
    return { type: 'attack', value: 1, description: '挣扎' };
  }

  const move = moves[Math.floor(Math.random() * moves.length)];

  if (move.type === 'attack') {
    return {
      type: 'attack',
      value: move.value + strength,
      description: move.description,
    };
  } else if (move.type === 'defend') {
    return {
      type: 'defend',
      value: move.value,
      description: move.description,
    };
  } else if (move.type === 'buff') {
    return {
      type: 'buff',
      value: move.value,
      description: move.description,
    };
  } else if (move.type === 'heal') {
    return {
      type: 'heal',
      value: move.value,
      description: move.description,
    };
  } else if (move.type === 'summon') {
    return {
      type: 'summon',
      value: move.value,
      description: move.description,
    };
  }

  return {
    type: 'attack',
    value: move.value + strength,
    description: move.description,
  };
}

/** Draw cards from draw pile into hand */
export function drawCards(
  hand: CardInstance[],
  drawPile: CardInstance[],
  discardPile: CardInstance[],
  count: number
): { hand: CardInstance[]; drawPile: CardInstance[]; discardPile: CardInstance[] } {
  let currentDraw = [...drawPile];
  let currentDiscard = [...discardPile];
  let currentHand = [...hand];

  for (let i = 0; i < count; i++) {
    // If draw pile is empty, shuffle discard into draw
    if (currentDraw.length === 0) {
      if (currentDiscard.length === 0) break; // No cards left at all
      currentDraw = shuffle(currentDiscard);
      currentDiscard = [];
    }

    const drawnCard = currentDraw.pop();
    if (drawnCard) {
      currentHand.push(drawnCard);
    }
  }

  return { hand: currentHand, drawPile: currentDraw, discardPile: currentDiscard };
}

/** Apply damage to a target with armor reduction and optional burn bonus */
export function applyDamageToTarget(
  damage: number,
  currentHp: number,
  currentArmor: number,
  burnStacks: number = 0
): { newHp: number; newArmor: number; actualDamage: number } {
  // Burn bonus: +50% damage (rounded down, minimum +1)
  let totalDamage = damage;
  if (burnStacks > 0 && damage > 0) {
    const bonus = Math.max(1, Math.floor(damage * 0.5));
    totalDamage = damage + bonus;
  }

  if (totalDamage <= currentArmor) {
    return { newHp: currentHp, newArmor: currentArmor - totalDamage, actualDamage: 0 };
  }

  const remainingDamage = totalDamage - currentArmor;
  return { newHp: currentHp - remainingDamage, newArmor: 0, actualDamage: remainingDamage };
}

/** Process status effects at the start of an entity's turn */
export function processStatusEffects<T extends { hp: number; armor: number; statusEffects: StatusEffect[] }>(
  entity: T
): { entity: T; poisonDamage: number } {
  let statusEffects = [...entity.statusEffects];
  let poisonDamage = 0;

  // Poison: deal damage equal to total stacks (ignores armor)
  const poisonStacks = statusEffects
    .filter(s => s.type === 'poison')
    .reduce((sum, s) => sum + s.value, 0);
  if (poisonStacks > 0) {
    poisonDamage = poisonStacks;
    // Decrement each poison stack by 1
    statusEffects = statusEffects
      .map(s => (s.type === 'poison' ? { ...s, value: Math.max(0, s.value - 1) } : s))
      .filter(s => s.value > 0);
  }

  // Burn: decrement duration by 1
  statusEffects = statusEffects
    .map(s => (s.type === 'burn' ? { ...s, value: s.value - 1 } : s))
    .filter(s => s.value > 0);

  // Freeze: decrement duration by 1
  statusEffects = statusEffects
    .map(s => (s.type === 'freeze' ? { ...s, value: s.value - 1 } : s))
    .filter(s => s.value > 0);

  const newHp = entity.hp - poisonDamage;
  const isFrozen = statusEffects.some(s => s.type === 'freeze');

  return {
    entity: { ...entity, hp: Math.max(0, newHp), statusEffects, isFrozen },
    poisonDamage,
  };
}

/** Use an energy potion to restore 2 energy */
export function usePotion(state: GameState): GameState {
  if (state.player.potions <= 0) return state;
  return {
    ...state,
    player: {
      ...state.player,
      energy: Math.min(state.player.energy + 2, state.player.maxEnergy + 2), // 允许超过上限
      potions: state.player.potions - 1,
    },
  };
}

/** Upgrade a card instance using its upgrade definition */
export function upgradeCard(card: CardInstance): CardInstance {
  const upgrade = CARD_UPGRADES[card.templateId];
  if (!upgrade || card.upgraded) return card;

  return {
    ...card,
    name: upgrade.name,
    description: upgrade.description,
    effect: { ...card.effect, ...upgrade.effect },
    upgraded: true,
    cost: upgrade.cost ?? card.cost,
  };
}

/** Get random upgrade choices from a deck */
export function getRandomUpgradeChoices(deck: CardInstance[], count: number = 3): CardInstance[] {
  const upgradeable = deck.filter(c => !c.upgraded);
  if (upgradeable.length === 0) return [];
  const shuffled = shuffle([...upgradeable]);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** Apply a card's effect to the game state */
export function applyCardEffect(
  card: CardInstance,
  state: GameState,
  targetEnemyIndex?: number
): GameState {
  const newState = { ...state };
  const effect = card.effect;
  const playerStrength = state.playerStrength ?? 0;

  switch (effect.type) {
    case 'attack': {
      if (targetEnemyIndex === undefined) break;
      const enemy = { ...newState.enemies[targetEnemyIndex] };
      const burnStacks = getBurnStacks(enemy.statusEffects);
      const totalDamage = (effect.damage ?? 0) + playerStrength;
      const result = applyDamageToTarget(totalDamage, enemy.hp, enemy.armor, burnStacks);
      enemy.hp = Math.max(0, result.newHp);
      enemy.armor = result.newArmor;
      enemy.isHit = true;

      // Apply status effects from card
      if (effect.poison) {
        enemy.statusEffects = addStatusEffect(enemy.statusEffects, { type: 'poison', value: effect.poison });
      }
      if (effect.burnDuration) {
        enemy.statusEffects = addStatusEffect(enemy.statusEffects, { type: 'burn', value: effect.burnDuration });
      }
      if (effect.freezeDuration) {
        // Check immuneToFreeze from original enemy template
        const template = getEnemyTemplate(newState.enemies[targetEnemyIndex].templateId);
        if (!template?.immuneToFreeze) {
          enemy.statusEffects = addStatusEffect(enemy.statusEffects, { type: 'freeze', value: effect.freezeDuration });
          enemy.isFrozen = true;
        }
      }

      newState.enemies = [...newState.enemies];
      newState.enemies[targetEnemyIndex] = enemy;

      // Check if enemy is dead
      if (enemy.hp <= 0) {
        newState.enemies = newState.enemies.filter(
          (_, idx) => idx !== targetEnemyIndex
        );
      }
      break;
    }

    case 'multiAttack': {
      if (targetEnemyIndex === undefined) break;
      const hits = effect.hits ?? 1;
      const damagePerHit = (effect.damage ?? 0) + playerStrength;
      let enemies = [...newState.enemies];
      let targetIdx = targetEnemyIndex;

      for (let h = 0; h < hits; h++) {
        if (targetIdx >= enemies.length) {
          // Target died, redirect to first enemy if available
          if (enemies.length > 0) {
            targetIdx = 0;
          } else {
            break;
          }
        }

        let enemy = { ...enemies[targetIdx] };
        const burnStacks = getBurnStacks(enemy.statusEffects);
        const result = applyDamageToTarget(damagePerHit, enemy.hp, enemy.armor, burnStacks);
        enemy.hp = Math.max(0, result.newHp);
        enemy.armor = result.newArmor;
        enemy.isHit = true;

        // Apply status effects from card on first hit only
        if (h === 0) {
          if (effect.poison) {
            enemy.statusEffects = addStatusEffect(enemy.statusEffects, { type: 'poison', value: effect.poison });
          }
          if (effect.burnDuration) {
            enemy.statusEffects = addStatusEffect(enemy.statusEffects, { type: 'burn', value: effect.burnDuration });
          }
          if (effect.freezeDuration) {
            const template = getEnemyTemplate(enemies[targetIdx].templateId);
            if (!template?.immuneToFreeze) {
              enemy.statusEffects = addStatusEffect(enemy.statusEffects, { type: 'freeze', value: effect.freezeDuration });
              enemy.isFrozen = true;
            }
          }
        }

        enemies[targetIdx] = enemy;

        if (enemy.hp <= 0) {
          enemies = enemies.filter((_, idx) => idx !== targetIdx);
          // Don't increment targetIdx since we removed one
          if (targetIdx >= enemies.length && enemies.length > 0) {
            targetIdx = 0;
          }
        }
      }
      newState.enemies = enemies;
      break;
    }

    case 'defend': {
      const armorGain = effect.armor ?? 0;
      newState.player = {
        ...newState.player,
        armor: newState.player.armor + armorGain,
      };
      break;
    }

    case 'heal': {
      const healAmount = effect.amount ?? 0;
      const newHp = Math.min(
        newState.player.hp + healAmount,
        newState.player.maxHp
      );
      newState.player = { ...newState.player, hp: newHp };
      break;
    }

    case 'attackAll': {
      const damage = (effect.damage ?? 0) + playerStrength;
      let enemies = [...newState.enemies];

      for (let i = 0; i < enemies.length; i++) {
        let enemy = { ...enemies[i] };
        const burnStacks = getBurnStacks(enemy.statusEffects);
        const result = applyDamageToTarget(damage, enemy.hp, enemy.armor, burnStacks);
        enemy.hp = Math.max(0, result.newHp);
        enemy.armor = result.newArmor;
        enemy.isHit = true;

        // Apply status effects from card
        if (effect.poison) {
          enemy.statusEffects = addStatusEffect(enemy.statusEffects, { type: 'poison', value: effect.poison });
        }
        if (effect.burnDuration) {
          enemy.statusEffects = addStatusEffect(enemy.statusEffects, { type: 'burn', value: effect.burnDuration });
        }
        if (effect.freezeDuration) {
          const template = getEnemyTemplate(enemies[i].templateId);
          if (!template?.immuneToFreeze) {
            enemy.statusEffects = addStatusEffect(enemy.statusEffects, { type: 'freeze', value: effect.freezeDuration });
            enemy.isFrozen = true;
          }
        }

        enemies[i] = enemy;
      }

      // Remove dead enemies
      newState.enemies = enemies.filter(e => e.hp > 0);
      break;
    }

    case 'energyGain': {
      const energyGain = effect.energyGain ?? 0;
      const hpCost = effect.hpCost ?? 0;
      newState.player = {
        ...newState.player,
        energy: newState.player.energy + energyGain,
        hp: Math.max(1, newState.player.hp - hpCost), // 不会自杀，最低留1HP
      };
      break;
    }

    case 'strength': {
      newState.playerStrength = (newState.playerStrength ?? 0) + (effect.strengthGain ?? 0);
      break;
    }

    case 'drain': {
      if (targetEnemyIndex === undefined) break;
      const enemy = { ...newState.enemies[targetEnemyIndex] };
      const burnStacks = getBurnStacks(enemy.statusEffects);
      const totalDamage = (effect.damage ?? 0) + playerStrength;
      const result = applyDamageToTarget(totalDamage, enemy.hp, enemy.armor, burnStacks);
      enemy.hp = Math.max(0, result.newHp);
      enemy.armor = result.newArmor;
      enemy.isHit = true;
      newState.enemies = [...newState.enemies];
      newState.enemies[targetEnemyIndex] = enemy;
      if (enemy.hp <= 0) {
        newState.enemies = newState.enemies.filter((_, idx) => idx !== targetEnemyIndex);
      }
      // 恢复等于实际伤害的生命
      const healFromDrain = result.actualDamage;
      newState.player = {
        ...newState.player,
        hp: Math.min(newState.player.hp + healFromDrain, newState.player.maxHp),
      };
      break;
    }

    case 'draw': {
      // Draw effect is handled in playCardOnState via drawCount field
      // Mark drawCount on the effect for playCardOnState to process
      break;
    }

    case 'weaken': {
      // 对所有敌人减少力量
      newState.enemies = newState.enemies.map(e => ({
        ...e,
        strength: Math.max(0, e.strength - (effect.weakenAmount ?? 0)),
      }));
      break;
    }

    // poison, burn, freeze are card effect types that attach to attack/attackAll
    // They are handled above within the attack/attackAll cases
    case 'poison':
    case 'burn':
    case 'freeze':
      // These types are not standalone - they are applied through attack/attackAll effects
      // If a card has only a status effect type without attack, it's a no-op here
      break;
  }

  return newState;
}

/** Maximum number of enemies allowed on the field */
const MAX_ENEMIES = 4;

/** Process all enemy actions for the enemy turn */
export function processEnemyActions(state: GameState): GameState {
  const newState = { ...state };
  let player = { ...newState.player };
  let shouldShake = false;

  // Clear enemy armor at the start of their turn
  let enemies = newState.enemies.map(e => ({ ...e, armor: 0, isHit: false }));

  // Process each enemy
  for (let i = 0; i < enemies.length; i++) {
    // Check if enemy was frozen BEFORE processing status effects
    const wasFrozen = enemies[i].isFrozen || enemies[i].statusEffects.some(s => s.type === 'freeze');

    // Process status effects on this enemy
    const { entity: processedEnemy, poisonDamage: enemyPoisonDamage } = processStatusEffects(enemies[i]);
    enemies[i] = processedEnemy as EnemyInstance;

    // Check if enemy died from poison
    if (enemies[i].hp <= 0) {
      continue; // Will be filtered out later
    }

    // If was frozen (before processing), skip this enemy's action
    if (wasFrozen) {
      continue;
    }

    const enemy = { ...enemies[i] };
    const intent = enemy.intent;

    if (intent.type === 'attack') {
      const totalDamage = intent.value;
      const result = applyDamageToTarget(totalDamage, player.hp, player.armor);
      player.hp = Math.max(0, result.newHp);
      player.armor = result.newArmor;
      shouldShake = true;

      // Check if the move that generated this intent has a status effect
      const matchingMove = enemy.moves.find(m => m.description === intent.description && m.type === 'attack');
      if (matchingMove?.statusEffect) {
        player.statusEffects = addStatusEffect(player.statusEffects, {
          type: matchingMove.statusEffect.type,
          value: matchingMove.statusEffect.value,
        });
      }
    } else if (intent.type === 'defend') {
      enemy.armor += intent.value;
    } else if (intent.type === 'buff') {
      enemy.strength += intent.value;
    } else if (intent.type === 'heal') {
      const healAmount = intent.value;
      enemy.hp = Math.min(enemy.hp + healAmount, enemy.maxHp);
    } else if (intent.type === 'summon') {
      // Find the matching move to get summonId
      const matchingMove = enemy.moves.find(m => m.description === intent.description && m.type === 'summon');
      if (matchingMove?.summonId && enemies.length < MAX_ENEMIES) {
        const summonTemplate = getEnemyTemplate(matchingMove.summonId);
        if (summonTemplate) {
          const summonedEnemy = createEnemyInstance(summonTemplate);
          enemies.push(summonedEnemy);
        }
      }
    }

    enemies[i] = enemy;
  }

  // Remove dead enemies
  enemies = enemies.filter(e => e.hp > 0);

  // Check for game over
  if (player.hp <= 0) {
    return {
      ...newState,
      player,
      enemies,
      isEnemyTurn: false,
      screen: 'gameOver',
      screenShake: shouldShake,
    };
  }

  // Roll new intents for next turn
  enemies = enemies.map(e => {
    const template = getEnemyTemplate(e.templateId);
    return {
      ...e,
      intent: rollEnemyIntent(e.moves, e.strength, template?.immuneToFreeze),
    };
  });

  return {
    ...newState,
    player,
    enemies,
    isEnemyTurn: false,
    screenShake: shouldShake,
  };
}

/** Maximum number of cards that can be retained per turn */
export const MAX_RETAIN = 2;

/** Get hand limit based on retained cards (5 + retained, max 7) */
export function getHandLimit(retainedCount: number): number {
  return Math.min(7, 5 + Math.min(retainedCount, MAX_RETAIN));
}

/** Start a new player turn */
export function startNewPlayerTurn(state: GameState): GameState {
  // Process player status effects at the start of their turn
  const { entity: processedPlayer } = processStatusEffects(state.player);

  // Clear player armor from last turn
  const player: PlayerState = {
    ...processedPlayer,
    armor: 0,
    energy: state.player.maxEnergy,
  };

  // Check if player died from status effects (e.g. poison)
  if (player.hp <= 0) {
    return {
      ...state,
      player,
      screen: 'gameOver',
      isEnemyTurn: false,
      selectedCardId: null,
      animatingCardIds: [],
      turnNumber: state.turnNumber + 1,
    };
  }

  // Restore retained cards from the retainedCards field
  const retainedHand = state.retainedCards.map(c => ({ ...c, isRetained: false }));
  const handLimit = getHandLimit(retainedHand.length);
  const cardsToDraw = handLimit - retainedHand.length;

  // Draw cards, filling hand up to handLimit
  const { hand, drawPile, discardPile } = drawCards(
    retainedHand,
    state.drawPile,
    state.discardPile,
    cardsToDraw
  );

  return {
    ...state,
    player,
    hand,
    drawPile,
    discardPile,
    retainedCards: [],
    isEnemyTurn: false,
    selectedCardId: null,
    animatingCardIds: [],
    turnNumber: state.turnNumber + 1,
  };
}

/** Create the initial game state */
export function createInitialState(): GameState {
  return {
    screen: 'title',
    player: {
      hp: 70,
      maxHp: 70,
      energy: 3,
      maxEnergy: 3,
      armor: 0,
      statusEffects: [],
      potions: 0,
    },
    enemies: [],
    drawPile: [],
    hand: [],
    discardPile: [],
    retainedCards: [],
    mapLayers: [],
    isEnemyTurn: false,
    selectedCardId: null,
    screenShake: false,
    animatingCardIds: [],
    turnNumber: 0,
    currentBattleLayer: -1,
    currentBattleNode: -1,
    playerStrength: 0,
    upgradeChoices: [],
  };
}

/** Check if a card can be played */
export function canPlayCard(card: CardInstance, state: GameState): boolean {
  if (state.isEnemyTurn) return false;
  if (card.cost > state.player.energy) return false;
  if (state.animatingCardIds.includes(card.instanceId)) return false;

  // Attack cards need at least one enemy
  if (
    (card.effect.type === 'attack' || card.effect.type === 'multiAttack' || card.effect.type === 'drain') &&
    state.enemies.length === 0
  ) {
    return false;
  }

  if (card.effect.type === 'attackAll' && state.enemies.length === 0) {
    return false;
  }

  // Poison/burn/freeze standalone cards need enemies
  if (
    (card.effect.type === 'poison' || card.effect.type === 'burn' || card.effect.type === 'freeze') &&
    state.enemies.length === 0
  ) {
    return false;
  }

  // Weaken needs enemies
  if (card.effect.type === 'weaken' && state.enemies.length === 0) {
    return false;
  }

  return true;
}

/** Check if a card needs a target */
export function cardNeedsTarget(card: CardInstance): boolean {
  return card.effect.type === 'attack' || card.effect.type === 'multiAttack' ||
    card.effect.type === 'poison' || card.effect.type === 'burn' || card.effect.type === 'freeze' ||
    card.effect.type === 'drain';
}

/** Check if all enemies in a layer are defeated */
export function isLayerComplete(layer: { nodes: { defeated: boolean }[] }): boolean {
  return layer.nodes.every(n => n.defeated);
}

/** Check if the player has won the game (all layers complete) */
export function isGameComplete(mapLayers: GameState['mapLayers']): boolean {
  return mapLayers.every(layer => isLayerComplete(layer));
}
