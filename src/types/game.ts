/** Card type classification */
export type CardType = 'attack' | 'defense' | 'spell';

/** Card rarity levels */
export type CardRarity = 'common' | 'rare' | 'epic';

/** Card effect types */
export type CardEffectType = 'attack' | 'multiAttack' | 'defend' | 'heal' | 'attackAll' | 'aoeAttack' | 'poison' | 'burn' | 'freeze' | 'energyGain' | 'strength' | 'drain' | 'draw' | 'weaken' | 'thorns' | 'echo' | 'multiHit' | 'selfDamage' | 'handCountDamage';

/** Card effect definition */
export interface CardEffect {
  type: CardEffectType;
  damage?: number;
  armor?: number;
  hits?: number;
  amount?: number;
  poison?: number;
  burnDuration?: number;
  freezeDuration?: number;
  doubleArmor?: boolean;
  drawCards?: number;
  energyGain?: number;
  hpCost?: number;
  strengthGain?: number;
  weakenAmount?: number;
  drawCount?: number;
  /** Thorns value to apply to player (for thorns card effect) */
  thornsValue?: number;
  /** Multiply damage by hand count (for mind_blast card effect) */
  handScaleMultiplier?: number;
  /** Use player armor as damage (for shield_bash card effect) */
  armorAsDamage?: boolean;
  /** Ignore enemy armor completely (piercing attack) */
  piercing?: boolean;
  /** Heal player by this amount on defend (for regenerate) */
  healAmount?: number;
  /** Scale armor gain by current energy (for bulwark) */
  energyScaleArmor?: boolean;
  /** Scale damage by target's poison stacks × this multiplier (for toxic_burst) */
  poisonScaleDamage?: boolean;
  /** Multiplier for poison-scaled damage (default 3) */
  poisonMultiplier?: number;
  /** Strength gain is temporary (cleared at end of turn) */
  temporary?: boolean;
  /** Discard the oldest card in hand before drawing (for discard_draw) */
  discardOldest?: boolean;
  /** Number of oldest cards to discard (for discard_draw+, default 1 when discardOldest is true) */
  discardCount?: number;
  /** Scale damage by target's burn stacks × this multiplier (for burn_detonate combo) */
  burnScaleDamage?: boolean;
  /** Multiplier for burn-scaled damage (default 4) */
  burnMultiplier?: number;
  /** Bonus damage per poison stack on target (for corrode combo) */
  poisonBonusPerStack?: number;
  /** Double damage if player strength >= this threshold (for skull_crusher combo) */
  strengthThreshold?: number;
  /** Multiply damage by cards played this turn × this value (for combo_strike combo) */
  cardsPlayedScaleMultiplier?: number;
  /** This card costs 0 if player armor >= this value (for armor_engine combo) */
  freeIfArmorAbove?: number;
  /** Bonus damage if target has burn status (for ember_dance combo) */
  burnBonusIfBurning?: number;
  /** Bonus draw if hand size is above this threshold (for mind_surge combo) */
  bonusDrawIfHandAbove?: number;
  /** Bonus strength per attack card played this turn (for war_frenzy combo).
   *  Uses cardsPlayedThisTurn as approximation */
  bonusStrengthPerAttack?: number;
  /** Gain this much strength at the start of next turn (for iron_focus combo) */
  nextTurnStrength?: number;
  /** Apply status effects (poison/burn/freeze) on every hit instead of just the first (for venom_blade_dance) */
  applyStatusPerHit?: boolean;
}

/** Card template - defines a card blueprint */
export interface CardTemplate {
  id: string;
  name: string;
  type: CardType;
  cost: number;
  description: string;
  effect: CardEffect;
  rarity: CardRarity;
  exhaust?: boolean;
  retain?: boolean;
}

/** Card instance - a specific card in the player's deck */
export interface CardInstance {
  instanceId: string;
  templateId: string;
  name: string;
  type: CardType;
  cost: number;
  description: string;
  effect: CardEffect;
  rarity: CardRarity;
  upgraded: boolean;
  exhaust: boolean;
  retain: boolean;
  isRetained: boolean;
}

/** Status effect types */
export type StatusEffectType = 'poison' | 'burn' | 'freeze';

/** Status effect on an entity */
export interface StatusEffect {
  type: StatusEffectType;
  value: number; // poison: stacks (decrement by 1 each turn), burn: remaining turns, freeze: remaining turns
}

/** Enemy intent types */
export type EnemyIntentType = 'attack' | 'defend' | 'buff' | 'heal' | 'summon';

/** Enemy intent - shows what the enemy plans to do */
export interface EnemyIntent {
  type: EnemyIntentType;
  value: number;
  description: string;
}

/** Enemy move template */
export interface EnemyMove {
  type: 'attack' | 'defend' | 'buff' | 'heal' | 'summon';
  value: number;
  description: string;
  summonId?: string;
  statusEffect?: { type: StatusEffectType; value: number };
}

/** Enemy template - defines an enemy blueprint */
export interface EnemyTemplate {
  id: string;
  name: string;
  maxHp: number;
  moves: EnemyMove[];
  emoji: string;
  immuneToFreeze?: boolean;
}

/** Enemy instance - a specific enemy in battle */
export interface EnemyInstance {
  instanceId: string;
  templateId: string;
  name: string;
  hp: number;
  maxHp: number;
  armor: number;
  strength: number;
  intent: EnemyIntent;
  moves: EnemyMove[];
  emoji: string;
  isHit: boolean;
  statusEffects: StatusEffect[];
  isFrozen: boolean;
}

/** Player state */
export interface PlayerState {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  armor: number;
  statusEffects: StatusEffect[];
  potions: number;
  /** Thorns: reflects damage to enemies when attacked, cleared at start of player turn */
  thorns: number;
}

/** Screen types */
export type ScreenType = 'title' | 'map' | 'battle' | 'battleWin' | 'cardReward' | 'cardUpgrade' | 'gameOver' | 'victory';

/** Map node - represents an enemy encounter */
export interface MapNode {
  enemyTemplateId: string;
  defeated: boolean;
}

/** Map layer - a level of the map */
export interface MapLayer {
  name: string;
  subtitle: string;
  nodes: MapNode[];
  unlocked: boolean;
}

/** Main game state */
export interface GameState {
  screen: ScreenType;
  player: PlayerState;
  enemies: EnemyInstance[];
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  retainedCards: CardInstance[];
  mapLayers: MapLayer[];
  isEnemyTurn: boolean;
  selectedCardId: string | null;
  screenShake: boolean;
  animatingCardIds: string[];
  turnNumber: number;
  /** Track which map node is being fought */
  currentBattleLayer: number;
  currentBattleNode: number;
  /** Player strength bonus for current battle (resets between battles) */
  playerStrength: number;
  /** Cards available for upgrade selection */
  upgradeChoices: CardInstance[];
  /** Card templates available as reward choices after battle */
  rewardChoices: CardTemplate[];
  /** Last card played this turn (for echo card) */
  lastPlayedCard: CardInstance | null;
  /** Cards exhausted during current battle (recovered when battle ends) */
  exhaustedPile: CardInstance[];
  /** Number of cards played this turn (resets each turn) */
  cardsPlayedThisTurn: number;
  /** Strength to gain at the start of next turn (for iron_focus combo) */
  pendingStrength: number;
}

/** Floating damage number for visual feedback */
export interface DamageNumber {
  id: string;
  value: number;
  type: 'damage' | 'heal' | 'armor' | 'buff' | 'poison';
  targetId: string;
}
