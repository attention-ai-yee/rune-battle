import { useState, useEffect, useRef, useCallback } from 'react';
import type { CardInstance, CardTemplate, GameState } from '../types/game';
import {
  createStartingDeck,
  createEnemyInstance,
  createCardInstance,
} from '../utils/gameLogic';
import { getEnemyTemplate } from '../data/enemies';
import {
  createInitialState,
  startNewPlayerTurn,
  applyCardEffect,
  processEnemyActions,
  drawCards,
  canPlayCard,
  cardNeedsTarget,
  shuffle,
  isLayerComplete,
  isGameComplete,
  usePotion as usePotionLogic,
  upgradeCard as upgradeCardLogic,
  getRandomUpgradeChoices,
  getRandomCardRewardTemplates,
} from '../utils/gameLogic';
import { MAP_LAYERS } from '../data/enemies';
import {
  sfxCardPlay, sfxHit, sfxHeavyHit, sfxDefend, sfxSpell, sfxEnemyAttack,
  sfxPlayerHit, sfxEndTurn, sfxEnemyTurn, sfxVictory, sfxDefeat,
  sfxDraw, sfxPotion, sfxRetain, sfxStatusEffect, sfxMapSelect,
} from '../utils/sounds';

/** Custom hook for managing all game state */
export function useGameState() {
  const [state, setState] = useState<GameState>(createInitialState);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  // Handle enemy turn processing
  useEffect(() => {
    if (!state.isEnemyTurn) return;
    if (state.screen !== 'battle') return;

    const timer = setTimeout(() => {
      sfxEnemyTurn();
      setState(prev => {
        if (!prev.isEnemyTurn || prev.screen !== 'battle') return prev;

        const afterEnemy = processEnemyActions(prev);

        // Play player hit sound if player took damage
        if (afterEnemy.player.hp < prev.player.hp) {
          sfxPlayerHit();
        }

        // If game over, stop
        if (afterEnemy.screen === 'gameOver') {
          sfxDefeat();
          return afterEnemy;
        }

        // Start new player turn
        const afterTurn = startNewPlayerTurn(afterEnemy);
        sfxDraw();
        return afterTurn;
      });
    }, 800);

    timersRef.current.push(timer);
    return () => clearTimeout(timer);
  }, [state.isEnemyTurn, state.screen]);

  // Handle screen shake cleanup
  useEffect(() => {
    if (!state.screenShake) return;

    const timer = setTimeout(() => {
      setState(prev => ({ ...prev, screenShake: false }));
    }, 500);

    timersRef.current.push(timer);
    return () => clearTimeout(timer);
  }, [state.screenShake]);

  // Handle enemy hit flash cleanup
  useEffect(() => {
    const hasHitEnemy = state.enemies.some(e => e.isHit);
    if (!hasHitEnemy) return;

    const timer = setTimeout(() => {
      setState(prev => ({
        ...prev,
        enemies: prev.enemies.map(e => ({ ...e, isHit: false })),
      }));
    }, 300);

    timersRef.current.push(timer);
    return () => clearTimeout(timer);
  }, [state.enemies]);

  /** Start a new game */
  const startGame = useCallback(() => {
    setState(() => {
      const deck = createStartingDeck();
      const shuffled = shuffle(deck);
      const mapLayers = MAP_LAYERS.map(layer => ({
        ...layer,
        nodes: layer.nodes.map(node => ({ ...node, defeated: false })),
        unlocked: layer.unlocked,
      }));

      const initialState: GameState = {
        screen: 'map',
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
        enemies: [],
        drawPile: shuffled,
        hand: [],
        discardPile: [],
        retainedCards: [],
        mapLayers,
        isEnemyTurn: false,
        selectedCardId: null,
        screenShake: false,
        animatingCardIds: [],
        turnNumber: 0,
        currentBattleLayer: -1,
        currentBattleNode: -1,
        playerStrength: 0,
        upgradeChoices: [],
        rewardChoices: [],
        lastPlayedCard: null,
        exhaustedPile: [],
        cardsPlayedThisTurn: 0,
        pendingStrength: 0,
      };

      return initialState;
    });
  }, []);

  /** Select an enemy on the map to start a battle */
  const selectMapNode = useCallback((layerIndex: number, nodeIndex: number) => {
    sfxMapSelect();
    setState(prev => {
      if (prev.screen !== 'map') return prev;

      const layer = prev.mapLayers[layerIndex];
      if (!layer || !layer.unlocked) return prev;

      const node = layer.nodes[nodeIndex];
      if (!node || node.defeated) return prev;

      const template = getEnemyTemplate(node.enemyTemplateId);
      if (!template) return prev;

      // Create enemy instance
      const enemy = createEnemyInstance(template);

      // Create fresh deck for battle (from current drawPile to preserve earned cards)
      const fullDeck = [...prev.drawPile, ...prev.discardPile, ...prev.hand.filter(c => true)];
      // If no cards exist (first battle), create starting deck
      const deck = fullDeck.length > 0 ? shuffle([...fullDeck]) : createStartingDeck();
      const shuffled = shuffle(deck);

      // Draw initial hand of 4 cards
      const { hand, drawPile, discardPile } = drawCards([], shuffled, [], 4);

      const battleState: GameState = {
        ...prev,
        screen: 'battle',
        player: {
          ...prev.player,
          energy: prev.player.maxEnergy,
          armor: 0,
          statusEffects: [],
          potions: 1, // 每场战斗1瓶药水
          thorns: 0,
        },
        enemies: [enemy],
        drawPile,
        hand,
        discardPile,
        retainedCards: [],
        isEnemyTurn: false,
        selectedCardId: null,
        screenShake: false,
        animatingCardIds: [],
        turnNumber: 1,
        currentBattleLayer: layerIndex,
        currentBattleNode: nodeIndex,
        playerStrength: 0, // 战斗开始力量重置
        upgradeChoices: [],
        rewardChoices: [],
        lastPlayedCard: null,
        exhaustedPile: [], // 战斗开始时清空消耗牌堆
        cardsPlayedThisTurn: 0,
        pendingStrength: 0,
      };

      return battleState;
    });
  }, []);

  /** Select a card from hand */
  const selectCard = useCallback((cardId: string) => {
    setState(prev => {
      if (prev.isEnemyTurn || prev.screen !== 'battle') return prev;

      const card = prev.hand.find(c => c.instanceId === cardId);
      if (!card || !canPlayCard(card, prev)) return prev;

      // If card needs a target and there are multiple enemies
      if (cardNeedsTarget(card) && prev.enemies.length > 1) {
        sfxCardPlay();
        return { ...prev, selectedCardId: cardId };
      }

      // If card needs a target but only one enemy, auto-target
      if (cardNeedsTarget(card) && prev.enemies.length === 1) {
        // Sound will be played in playCardOnState based on card type
        return playCardOnState(prev, card, 0);
      }

      // No target needed (defend, heal, attackAll, strength, draw, etc.)
      return playCardOnState(prev, card);
    });
  }, []);

  /** Select an enemy as a target for the selected card */
  const selectEnemyTarget = useCallback((enemyIndex: number) => {
    setState(prev => {
      if (!prev.selectedCardId) return prev;

      const card = prev.hand.find(c => c.instanceId === prev.selectedCardId);
      if (!card) return { ...prev, selectedCardId: null };

      return playCardOnState(prev, card, enemyIndex);
    });
  }, []);

  /** Cancel card selection */
  const cancelSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedCardId: null }));
  }, []);

  /** End the player's turn */
  const endTurn = useCallback(() => {
    sfxEndTurn();
    setState(prev => {
      if (prev.isEnemyTurn || prev.screen !== 'battle') return prev;

      // Unplayed cards are retained for next turn (enables combo planning)
      // Reset isRetained flag since they'll be automatically kept
      const retainedCards = prev.hand.map(c => ({ ...c, isRetained: false }));

      return {
        ...prev,
        hand: [],
        discardPile: prev.discardPile,
        retainedCards,
        isEnemyTurn: true,
        selectedCardId: null,
      };
    });
  }, []);

  /** Toggle retain on a card (right-click / long press) */
  const toggleRetain = useCallback((cardId: string) => {
    sfxRetain();
    setState(prev => {
      if (prev.isEnemyTurn || prev.screen !== 'battle') return prev;

      const card = prev.hand.find(c => c.instanceId === cardId);
      if (!card) return prev;

      // If already retained, unretain it
      if (card.isRetained) {
        return {
          ...prev,
          hand: prev.hand.map(c =>
            c.instanceId === cardId ? { ...c, isRetained: false } : c
          ),
        };
      }

      // Mark as retained (no limit — all unplayed cards are retained anyway,
      // this just adds a visual indicator for the player)
      return {
        ...prev,
        hand: prev.hand.map(c =>
          c.instanceId === cardId ? { ...c, isRetained: true } : c
        ),
      };
    });
  }, []);

  /** Use an energy potion */
  const usePotionAction = useCallback(() => {
    sfxPotion();
    setState(prev => {
      if (prev.screen !== 'battle' || prev.isEnemyTurn) return prev;
      return usePotionLogic(prev);
    });
  }, []);

  /** Proceed from battleWin to card reward screen */
  const proceedToCardReward = useCallback(() => {
    setState(prev => {
      if (prev.screen !== 'battleWin') return prev;

      // Roll card rewards (3 cards weighted by rarity + chain affinity)
      const deckTemplateIds = new Set([
        ...prev.drawPile.map(c => c.templateId),
        ...prev.discardPile.map(c => c.templateId),
        ...prev.hand.map(c => c.templateId),
        ...(prev.exhaustedPile ?? []).map(c => c.templateId),
      ]);
      const rewardTemplates = getRandomCardRewardTemplates(3, deckTemplateIds);

      return {
        ...prev,
        screen: 'cardReward',
        rewardChoices: rewardTemplates,
      };
    });
  }, []);

  /** Select a card from reward choices to add to the deck */
  const selectCardReward = useCallback((template: CardTemplate) => {
    setState(prev => {
      if (prev.screen !== 'cardReward') return prev;

      // Create a new card instance from the template and add to draw pile
      const newCard = createCardInstance(template);
      const newDrawPile = [...prev.drawPile, newCard];

      // Proceed directly to card upgrade (no relic step)
      return proceedToCardUpgrade({
        ...prev,
        drawPile: newDrawPile,
        rewardChoices: [],
      });
    });
  }, []);

  /** Skip card reward */
  const skipCardReward = useCallback(() => {
    setState(prev => {
      if (prev.screen !== 'cardReward') return prev;

      // Proceed directly to card upgrade (no relic step)
      return proceedToCardUpgrade({
        ...prev,
        rewardChoices: [],
      });
    });
  }, []);

  /** Internal helper: proceed to card upgrade screen */
  function proceedToCardUpgrade(prev: GameState): GameState {
    // Collect all cards from draw pile + hand + discard pile as the full deck
    const fullDeck = [...prev.drawPile, ...prev.hand, ...prev.discardPile];
    const choices = getRandomUpgradeChoices(fullDeck, 3);

    // If no upgradeable cards, go directly to map
    if (choices.length === 0) {
      return returnToMapFromState(prev);
    }

    return {
      ...prev,
      screen: 'cardUpgrade',
      upgradeChoices: choices,
    };
  }

  /** Proceed from battleWin to card upgrade screen (legacy - now goes to card reward first) */
  const proceedToUpgrade = useCallback(() => {
    proceedToCardReward();
  }, [proceedToCardReward]);

  /** Select a card to upgrade from the upgrade choices */
  const selectUpgradeCard = useCallback((cardInstance: CardInstance) => {
    setState(prev => {
      if (prev.screen !== 'cardUpgrade') return prev;

      // Find the card in the full deck and upgrade it
      const upgradedCard = upgradeCardLogic(cardInstance);

      // Replace the card in all piles
      const replaceCard = (pile: CardInstance[]): CardInstance[] =>
        pile.map(c => c.instanceId === cardInstance.instanceId ? upgradedCard : c);

      return returnToMapFromState({
        ...prev,
        drawPile: replaceCard(prev.drawPile),
        hand: replaceCard(prev.hand),
        discardPile: replaceCard(prev.discardPile),
        upgradeChoices: [],
      });
    });
  }, []);

  /** Skip the upgrade screen */
  const skipUpgrade = useCallback(() => {
    setState(prev => {
      if (prev.screen !== 'cardUpgrade') return prev;
      return returnToMapFromState({ ...prev, upgradeChoices: [] });
    });
  }, []);

  /** Return to map after winning a battle (internal helper) */
  function returnToMapFromState(prev: GameState): GameState {
    // Mark the specific enemy node as defeated
    const mapLayers = prev.mapLayers.map((layer, li) => {
      if (li !== prev.currentBattleLayer) return layer;

      const newNodes = layer.nodes.map((node, ni) => {
        if (ni !== prev.currentBattleNode) return node;
        return { ...node, defeated: true };
      });

      return { ...layer, nodes: newNodes };
    });

    // Unlock next layers if current layer is complete
    for (let i = 0; i < mapLayers.length; i++) {
      if (isLayerComplete(mapLayers[i]) && i + 1 < mapLayers.length) {
        mapLayers[i + 1] = { ...mapLayers[i + 1], unlocked: true };
      }
    }

    // Check for game victory
    if (isGameComplete(mapLayers)) {
      return {
        ...prev,
        screen: 'victory',
        mapLayers,
      };
    }

    // Heal player between battles (20% of missing HP)
    const missingHp = prev.player.maxHp - prev.player.hp;
    const healAmount = Math.floor(missingHp * 0.2);

    // Recover exhausted cards back into the deck for next battle
    const exhaustedCards = prev.exhaustedPile ?? [];

    return {
      ...prev,
      screen: 'map',
      player: {
        ...prev.player,
        hp: Math.min(prev.player.hp + healAmount, prev.player.maxHp),
        armor: 0,
        energy: prev.player.maxEnergy,
        statusEffects: [],
        potions: 0,
        thorns: 0,
      },
      enemies: [],
      hand: [],
      drawPile: [...prev.drawPile, ...exhaustedCards], // Recover exhausted cards
      discardPile: prev.discardPile,
      exhaustedPile: [], // Clear exhausted pile
      cardsPlayedThisTurn: 0,
      pendingStrength: 0,
      retainedCards: [],
      mapLayers,
      isEnemyTurn: false,
      selectedCardId: null,
      turnNumber: 0,
      currentBattleLayer: -1,
      currentBattleNode: -1,
      playerStrength: 0, // 战斗结束重置力量
      upgradeChoices: [],
      rewardChoices: [],
      lastPlayedCard: null,
    };
  }

  /** Return to map after winning a battle (public API, now goes to upgrade first) */
  const returnToMap = useCallback(() => {
    proceedToUpgrade();
  }, [proceedToUpgrade]);

  /** Restart the game */
  const restartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  /** Go back to title screen */
  const goToTitle = useCallback(() => {
    setState(createInitialState());
  }, []);

  return {
    state,
    startGame,
    selectMapNode,
    selectCard,
    selectEnemyTarget,
    cancelSelection,
    endTurn,
    toggleRetain,
    returnToMap,
    restartGame,
    goToTitle,
    usePotion: usePotionAction,
    selectUpgradeCard,
    skipUpgrade,
    selectCardReward,
    skipCardReward,
  };
}

/** Internal helper: play a card and update state */
function playCardOnState(
  state: GameState,
  card: CardInstance,
  targetEnemyIndex?: number
): GameState {
  // Deduct energy (combo: free if armor above threshold)
  const effectiveCost = (card.effect.freeIfArmorAbove && state.player.armor >= card.effect.freeIfArmorAbove)
    ? 0
    : card.cost;
  const player = { ...state.player, energy: state.player.energy - effectiveCost };

  // Play sound based on card type
  const effectType = card.effect.type;
  if (['attack', 'multiAttack', 'drain', 'multiHit', 'handCountDamage', 'selfDamage', 'aoeAttack'].includes(effectType)) {
    if (['multiAttack', 'multiHit', 'aoeAttack'].includes(effectType)) {
      sfxHeavyHit();
    } else {
      sfxHit();
    }
  } else if (['defend', 'armor', 'doubleArmor'].includes(effectType)) {
    sfxDefend();
  } else {
    sfxSpell();
  }

  // Apply card effect
  const afterEffect = applyCardEffect(card, { ...state, player }, targetEnemyIndex);

  // Move card from hand; exhaust cards go to exhaustedPile (recovered after battle)
  const hand = afterEffect.hand.filter(c => c.instanceId !== card.instanceId);
  const discardPile = card.exhaust ? afterEffect.discardPile : [...afterEffect.discardPile, card];
  const exhaustedPile = card.exhaust ? [...(afterEffect.exhaustedPile ?? []), card] : (afterEffect.exhaustedPile ?? []);

  // Handle generic drawCards from card effects
  let finalHand = hand;
  let finalDrawPile = afterEffect.drawPile;
  let finalDiscardPile = discardPile;

  // Draw cards from drawCards field (fortify, second_wind, etc.)
  const drawCountFromEffect = card.effect.drawCards ?? 0;
  if (drawCountFromEffect > 0) {
    const drawn = drawCards(finalHand, finalDrawPile, finalDiscardPile, drawCountFromEffect);
    finalHand = drawn.hand;
    finalDrawPile = drawn.drawPile;
    finalDiscardPile = drawn.discardPile;
  }

  // Draw cards from drawCount field (adrenaline, etc.)
  const drawCountFromType = card.effect.drawCount ?? 0;
  if (drawCountFromType > 0) {
    // discard_draw: discard oldest card(s) in hand first (not the card just played)
    if (card.effect.discardOldest && finalHand.length > 0) {
      const discardCount = card.effect.discardCount ?? 1;
      const toDiscard = finalHand.slice(0, discardCount);
      finalHand = finalHand.slice(discardCount);
      finalDiscardPile = [...finalDiscardPile, ...toDiscard];
    }
    const drawn = drawCards(finalHand, finalDrawPile, finalDiscardPile, drawCountFromType);
    finalHand = drawn.hand;
    finalDrawPile = drawn.drawPile;
    finalDiscardPile = drawn.discardPile;
  }

  // Combo: bonus draw if hand size above threshold (mind_surge)
  if (card.effect.bonusDrawIfHandAbove && finalHand.length > card.effect.bonusDrawIfHandAbove) {
    const bonusDrawn = drawCards(finalHand, finalDrawPile, finalDiscardPile, 1);
    finalHand = bonusDrawn.hand;
    finalDrawPile = bonusDrawn.drawPile;
    finalDiscardPile = bonusDrawn.discardPile;
  }

  // Handle doubleArmor (壕沟)
  let finalPlayer = afterEffect.player;
  if (card.effect.doubleArmor) {
    finalPlayer = { ...finalPlayer, armor: finalPlayer.armor * 2 };
  }

  // Check if all enemies are dead
  const livingEnemies = afterEffect.enemies.filter(e => e.hp > 0);

  if (livingEnemies.length === 0 && state.screen === 'battle') {
    // Player wins the battle
    sfxVictory();
    return {
      ...afterEffect,
      player: finalPlayer,
      hand: finalHand,
      drawPile: finalDrawPile,
      discardPile: finalDiscardPile,
      exhaustedPile,
      cardsPlayedThisTurn: (afterEffect.cardsPlayedThisTurn ?? 0) + 1,
      enemies: [],
      selectedCardId: null,
      screen: 'battleWin',
      lastPlayedCard: card,
    };
  }

  return {
    ...afterEffect,
    player: finalPlayer,
    enemies: livingEnemies,
    hand: finalHand,
    drawPile: finalDrawPile,
    discardPile: finalDiscardPile,
    exhaustedPile,
    cardsPlayedThisTurn: (afterEffect.cardsPlayedThisTurn ?? 0) + 1,
    selectedCardId: null,
    lastPlayedCard: card,
  };
}
