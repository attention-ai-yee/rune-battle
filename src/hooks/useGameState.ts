import { useState, useEffect, useRef, useCallback } from 'react';
import type { CardInstance, CardTemplate, GameState, EventChoice } from '../types/game';
import {
  createStartingDeck,
  createEnemyInstance,
  createCardInstance,
} from '../utils/gameLogic';
import { getEnemyTemplate, MAP_EVENTS } from '../data/enemies';
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

        // If all enemies died from status effects, go to victory
        if (afterEnemy.screen === 'battleWin') {
          sfxVictory();
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
        enemies: prev.enemies.map(e => ({ ...e, isHit: false, lastDamageDealt: 0, lastArmorGained: 0, lastHealReceived: 0 })),
      }));
    }, 800);

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
        nodes: layer.nodes.map(node => ({ ...node, defeated: false, visited: false })),
        columns: layer.columns.map(col =>
          col.map(node => ({ ...node, defeated: false, visited: false }))
        ),
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
        gold: 0,
        shopState: null,
        eventState: null,
        totalDamageDealt: 0,
        totalCardsPlayed: 0,
      };

      return initialState;
    });
  }, []);

  /** Find the next available column in a layer */
  const getNextAvailableColumn = useCallback((layer: typeof MAP_LAYERS[0], colIndex: number, nodeIndex: number) => {
    // Check if the clicked column is the next available one
    for (let i = 0; i < layer.columns.length; i++) {
      const col = layer.columns[i];
      const anyAvailable = col.some(n => {
        if (n.type === 'battle' || n.type === 'elite') return !n.defeated;
        return !n.visited;
      });
      if (anyAvailable) {
        // Only allow if this is the column clicked
        return i === colIndex;
      }
    }
    return false;
  }, []);

  /** Select a node on the map (new columns-based approach) */
  const selectMapNode = useCallback((layerIndex: number, colIndex: number, nodeIndex: number) => {
    sfxMapSelect();
    setState(prev => {
      if (prev.screen !== 'map') return prev;

      const layer = prev.mapLayers[layerIndex];
      if (!layer || !layer.unlocked) return prev;

      const node = layer.columns[colIndex]?.[nodeIndex];
      if (!node) return prev;

      // Check if this column is the next available
      if (!getNextAvailableColumn(layer, colIndex, nodeIndex)) return prev;

      // Check if already done
      const isDone = node.type === 'battle' || node.type === 'elite'
        ? node.defeated
        : node.visited;
      if (isDone) return prev;

      // Handle different node types
      switch (node.type) {
        case 'battle':
        case 'elite': {
          const template = getEnemyTemplate(node.enemyTemplateId ?? '');
          if (!template) return prev;

          // Create enemy instance - elite gets +50% HP
          const enemy = createEnemyInstance({
            ...template,
            maxHp: node.type === 'elite' ? Math.floor(template.maxHp * 1.5) : template.maxHp,
          });

          // Create fresh deck for battle
          const fullDeck = [...prev.drawPile, ...prev.discardPile, ...prev.hand.filter(() => true)];
          const deck = fullDeck.length > 0 ? shuffle([...fullDeck]) : createStartingDeck();
          const shuffled = shuffle(deck);

          // Draw initial hand of 5 cards
          const { hand, drawPile, discardPile } = drawCards([], shuffled, [], 5);

          return {
            ...prev,
            screen: 'battle',
            player: {
              ...prev.player,
              energy: prev.player.maxEnergy,
              armor: 0,
              statusEffects: [],
              potions: 1,
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
            currentBattleNode: colIndex * 10 + nodeIndex, // encode column+node
            playerStrength: 0,
            upgradeChoices: [],
            rewardChoices: [],
            lastPlayedCard: null,
            exhaustedPile: [],
            cardsPlayedThisTurn: 0,
            pendingStrength: 0,
            gold: 0,
            shopState: null,
            eventState: null,
            totalDamageDealt: 0,
            totalCardsPlayed: 0,
            };
        }

        case 'shop': {
          return {
            ...prev,
            screen: 'shop' as const,
            shopState: null, // ShopScreen will generate its own state
            currentBattleLayer: layerIndex,
            currentBattleNode: colIndex * 10 + nodeIndex,
          };
        }

        case 'event': {
          // Pick random event
          const eventData = MAP_EVENTS[Math.floor(Math.random() * MAP_EVENTS.length)];
          return {
            ...prev,
            screen: 'event' as const,
            eventState: eventData,
            currentBattleLayer: layerIndex,
            currentBattleNode: colIndex * 10 + nodeIndex,
          };
        }

        case 'rest': {
          // Rest heals 25% max HP
          const healAmount = Math.floor(prev.player.maxHp * 0.25);
          const newHp = Math.min(prev.player.hp + healAmount, prev.player.maxHp);

          // Mark rest node as visited
          const updatedLayers = prev.mapLayers.map((l, li) => {
            if (li !== layerIndex) return l;
            const newCols = l.columns.map((col, ci) => {
              if (ci !== colIndex) return col;
              return col.map((n, ni) => {
                if (ni !== nodeIndex) return n;
                return { ...n, visited: true };
              });
            });
            const newNodes = l.nodes.map((n, ni) => {
              // Also update the flat nodes array for backward compat
              return { ...n, visited: n.type === 'rest' && ni === colIndex + nodeIndex ? true : n.visited };
            });
            return { ...l, columns: newCols, nodes: newNodes };
          });

          return {
            ...prev,
            screen: 'map',
            mapLayers: updatedLayers,
            player: { ...prev.player, hp: newHp },
          };
        }

        default:
          return prev;
      }
    });
  }, [getNextAvailableColumn]);

  /** Helper: mark current node as done in both columns and nodes arrays */
  const markCurrentNodeDone = useCallback((prev: GameState, visited?: boolean): GameState['mapLayers'] => {
    const layerIndex = prev.currentBattleLayer;
    // Decode column+node from currentBattleNode
    const colIndex = Math.floor(prev.currentBattleNode / 10);
    const nodeIndex = prev.currentBattleNode % 10;

    return prev.mapLayers.map((layer, li) => {
      if (li !== layerIndex) return layer;

      const newCols = layer.columns.map((col, ci) => {
        if (ci !== colIndex) return col;
        return col.map((n, ni) => {
          if (ni !== nodeIndex) return n;
          // For battle/elite: mark defeated; for others: mark visited
          if (n.type === 'battle' || n.type === 'elite') {
            return { ...n, defeated: true };
          }
          return { ...n, visited: visited ?? true };
        });
      });

      const newNodes = layer.nodes.map((n, ni) => {
        // Also update flat nodes for backward compat
        // Use a heuristic: find matching node by type
        if (ni === colIndex + nodeIndex) {
          if (n.type === 'battle' || n.type === 'elite') {
            if (!n.defeated) return { ...n, defeated: true };
          } else {
            if (!n.visited) return { ...n, visited: visited ?? true };
          }
        }
        return n;
      });

      return { ...layer, columns: newCols, nodes: newNodes };
    });
  }, []);

  /** Return to map from shop (marks shop as visited) */
  const returnToMapFromShop = useCallback(() => {
    setState(prev => {
      if (prev.screen !== 'shop') return prev;

      const mapLayers = markCurrentNodeDone(prev, true);

      // Unlock next layers if current is complete
      for (let i = 0; i < mapLayers.length; i++) {
        if (isLayerComplete(mapLayers[i]) && i + 1 < mapLayers.length) {
          mapLayers[i + 1] = { ...mapLayers[i + 1], unlocked: true };
        }
      }

      if (isGameComplete(mapLayers)) {
        return { ...prev, screen: 'victory' as const, mapLayers };
      }

      return {
        ...prev,
        screen: 'map' as const,
        mapLayers,
        shopState: null,
      };
    });
  }, [markCurrentNodeDone]);

  /** Return to map from event (marks event as visited) */
  const returnToMapFromEvent = useCallback(() => {
    setState(prev => {
      if (prev.screen !== 'event') return prev;

      const mapLayers = markCurrentNodeDone(prev, true);

      for (let i = 0; i < mapLayers.length; i++) {
        if (isLayerComplete(mapLayers[i]) && i + 1 < mapLayers.length) {
          mapLayers[i + 1] = { ...mapLayers[i + 1], unlocked: true };
        }
      }

      if (isGameComplete(mapLayers)) {
        return { ...prev, screen: 'victory' as const, mapLayers };
      }

      return {
        ...prev,
        screen: 'map' as const,
        mapLayers,
        eventState: null,
      };
    });
  }, [markCurrentNodeDone]);

  /** Buy a card from the shop */
  const buyCard = useCallback((template: CardTemplate) => {
    setState(prev => {
      if (prev.screen !== 'shop') return prev;

      const price = template.rarity === 'common' ? 50 : template.rarity === 'rare' ? 80 : 120;
      if (prev.gold < price) return prev;

      const newCard = createCardInstance(template);
      return {
        ...prev,
        gold: prev.gold - price,
        drawPile: [...prev.drawPile, newCard],
      };
    });
  }, []);

  /** Remove a card from the deck (shop service) */
  const removeCard = useCallback((cardInstanceId: string) => {
    setState(prev => {
      if (prev.screen !== 'shop') return prev;

      const price = 60;
      if (prev.gold < price) return prev;

      // Remove from all piles
      const filterFn = (c: CardInstance) => c.instanceId !== cardInstanceId;
      return {
        ...prev,
        gold: prev.gold - price,
        drawPile: prev.drawPile.filter(filterFn),
        hand: prev.hand.filter(filterFn),
        discardPile: prev.discardPile.filter(filterFn),
        exhaustedPile: (prev.exhaustedPile ?? []).filter(filterFn),
      };
    });
  }, []);

  /** Rest and heal at the shop */
  const restHeal = useCallback(() => {
    setState(prev => {
      if (prev.screen !== 'shop') return prev;

      const price = 40;
      if (prev.gold < price) return prev;

      const healAmount = Math.floor(prev.player.maxHp * 0.25);
      return {
        ...prev,
        gold: prev.gold - price,
        player: {
          ...prev.player,
          hp: Math.min(prev.player.hp + healAmount, prev.player.maxHp),
        },
      };
    });
  }, []);

  /** Handle event choice */
  const selectEventChoice = useCallback((choice: EventChoice, randomResult?: Record<string, string | number>) => {
    setState(prev => {
      if (prev.screen !== 'event') return prev;

      let newState = { ...prev };

      if (randomResult) {
        // Complex event outcomes
        if (randomResult.gold !== undefined) {
          newState.gold += Number(randomResult.gold);
        }
        if (randomResult.damage !== undefined) {
          newState.player = {
            ...newState.player,
            hp: Math.max(0, newState.player.hp - Number(randomResult.damage)),
          };
          if (newState.player.hp <= 0) {
            return { ...newState, screen: 'gameOver' as const };
          }
        }
        if (randomResult.addCard !== undefined) {
          // Add a random rare card
          const templates = getRandomCardRewardTemplates(1);
          if (templates.length > 0) {
            const newCard = createCardInstance(templates[0]);
            newState.drawPile = [...newState.drawPile, newCard];
          }
        }
        if (randomResult.removeCardId !== undefined) {
          const id = String(randomResult.removeCardId);
          const filterFn = (c: CardInstance) => c.instanceId !== id;
          newState.drawPile = newState.drawPile.filter(filterFn);
          newState.hand = newState.hand.filter(filterFn);
          newState.discardPile = newState.discardPile.filter(filterFn);
          newState.exhaustedPile = (newState.exhaustedPile ?? []).filter(filterFn);
        }
        if (randomResult.strength !== undefined) {
          // Strength for next battle
          newState.playerStrength = (newState.playerStrength ?? 0) + Number(randomResult.strength);
          newState.player = {
            ...newState.player,
            hp: newState.player.hp - (randomResult.damage ? 5 : 0), // healing spring: lose 5 HP for strength
          };
          if (newState.player.hp <= 0) {
            return { ...newState, screen: 'gameOver' as const };
          }
        }
      } else {
        // Simple event effects
        switch (choice.effect) {
          case 'heal':
            if (choice.value > 0) {
              newState.player = {
                ...newState.player,
                hp: Math.min(newState.player.hp + choice.value, newState.player.maxHp),
              };
            }
            break;
          case 'damage':
            newState.player = {
              ...newState.player,
              hp: Math.max(0, newState.player.hp - choice.value),
            };
            if (newState.player.hp <= 0) {
              return { ...newState, screen: 'gameOver' as const };
            }
            break;
          case 'gold':
            newState.gold += choice.value;
            break;
          case 'maxHp':
            newState.player = {
              ...newState.player,
              maxHp: newState.player.maxHp + choice.value,
              hp: Math.min(newState.player.hp + choice.value, newState.player.maxHp + choice.value),
            };
            break;
        }
      }

      // After handling event, return to map
      return returnToMapFromEventDirect(newState);
    });
  }, []);

  /** Direct return to map from event (no setState wrapper) */
  const returnToMapFromEventDirect = (prev: GameState): GameState => {
    const mapLayers = markCurrentNodeDone(prev, true);

    for (let i = 0; i < mapLayers.length; i++) {
      if (isLayerComplete(mapLayers[i]) && i + 1 < mapLayers.length) {
        mapLayers[i + 1] = { ...mapLayers[i + 1], unlocked: true };
      }
    }

    if (isGameComplete(mapLayers)) {
      return { ...prev, screen: 'victory' as const, mapLayers, eventState: null };
    }

    return { ...prev, screen: 'map' as const, mapLayers, eventState: null };
  };

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

      // Only cards with innate retain stay in hand
      const stayingCards = prev.hand.filter(c => c.retain).map(c => ({ ...c, isRetained: false }));
      // Everything else goes to discard
      const discardedCards = prev.hand.filter(c => !c.retain);

      return {
        ...prev,
        hand: stayingCards,
        discardPile: [...prev.discardPile, ...discardedCards],
        retainedCards: [], // No longer using retainedCards for auto-retain
        isEnemyTurn: true,
        selectedCardId: null,
      };
    });
  }, []);

  /** Toggle retain visual on a card with innate retain (right-click / long press) */
  const toggleRetain = useCallback((cardId: string) => {
    sfxRetain();
    setState(prev => {
      if (prev.isEnemyTurn || prev.screen !== 'battle') return prev;

      const card = prev.hand.find(c => c.instanceId === cardId);
      // Only cards with innate retain can toggle — others auto-discard on endTurn
      if (!card || !card.retain) return prev;

      if (card.isRetained) {
        return {
          ...prev,
          hand: prev.hand.map(c =>
            c.instanceId === cardId ? { ...c, isRetained: false } : c
          ),
        };
      }

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

      // Grant gold for victory
      const colIndex = Math.floor(prev.currentBattleNode / 10);
      const layer = prev.mapLayers[prev.currentBattleLayer];
      let isElite = false;
      if (layer && layer.columns[colIndex]) {
        const node = layer.columns[colIndex][prev.currentBattleNode % 10];
        if (node) {
          isElite = node.type === 'elite';
        }
      }
      const goldReward = isElite
        ? 80 + Math.floor(Math.random() * 21) // 80-100
        : 40 + Math.floor(Math.random() * 21); // 40-60

      // Roll card rewards
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
        gold: prev.gold + goldReward,
      };
    });
  }, []);

  /** Select a card from reward choices to add to the deck */
  const selectCardReward = useCallback((template: CardTemplate) => {
    setState(prev => {
      if (prev.screen !== 'cardReward') return prev;

      const newCard = createCardInstance(template);
      const newDrawPile = [...prev.drawPile, newCard];

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

      return proceedToCardUpgrade({
        ...prev,
        rewardChoices: [],
      });
    });
  }, []);

  /** Internal helper: proceed to card upgrade screen */
  function proceedToCardUpgrade(prev: GameState): GameState {
    const fullDeck = [...prev.drawPile, ...prev.hand, ...prev.discardPile];
    const choices = getRandomUpgradeChoices(fullDeck, 3);

    if (choices.length === 0) {
      return returnToMapFromState(prev);
    }

    return {
      ...prev,
      screen: 'cardUpgrade',
      upgradeChoices: choices,
    };
  }

  /** Proceed from battleWin to card upgrade screen (legacy) */
  const proceedToUpgrade = useCallback(() => {
    proceedToCardReward();
  }, [proceedToCardReward]);

  /** Select a card to upgrade from the upgrade choices */
  const selectUpgradeCard = useCallback((cardInstance: CardInstance) => {
    setState(prev => {
      if (prev.screen !== 'cardUpgrade') return prev;

      const upgradedCard = upgradeCardLogic(cardInstance);

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
    // Mark the current battle/elite node as defeated
    const mapLayers = markCurrentNodeDone(prev);

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

    // Recover exhausted cards
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
      drawPile: [...prev.drawPile, ...exhaustedCards],
      discardPile: prev.discardPile,
      exhaustedPile: [],
      cardsPlayedThisTurn: 0,
      pendingStrength: 0,
      retainedCards: [],
      mapLayers,
      isEnemyTurn: false,
      selectedCardId: null,
      turnNumber: 0,
      currentBattleLayer: -1,
      currentBattleNode: -1,
      playerStrength: 0,
      upgradeChoices: [],
      rewardChoices: [],
      lastPlayedCard: null,
    };
  }

  /** Return to map after winning a battle (public API) */
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
    // Shop
    buyCard,
    removeCard,
    restHeal,
    returnToMapFromShop,
    // Event
    selectEventChoice,
    returnToMapFromEvent,
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

  // Track total damage dealt this battle (HP + armor damage)
  const beforeTotal = state.enemies.reduce((sum, e) => sum + e.hp + e.armor, 0);
  const afterTotal = afterEffect.enemies.reduce((sum, e) => sum + e.hp + e.armor, 0);
  const damageDealtThisCard = Math.max(0, beforeTotal - afterTotal);

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
    sfxVictory();
    return {
      ...afterEffect,
      player: finalPlayer,
      hand: finalHand,
      drawPile: finalDrawPile,
      discardPile: finalDiscardPile,
      exhaustedPile,
      cardsPlayedThisTurn: (afterEffect.cardsPlayedThisTurn ?? 0) + 1,
      totalCardsPlayed: (state.totalCardsPlayed ?? 0) + 1,
      totalDamageDealt: (state.totalDamageDealt ?? 0) + damageDealtThisCard,
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
    totalCardsPlayed: (state.totalCardsPlayed ?? 0) + 1,
    totalDamageDealt: (state.totalDamageDealt ?? 0) + damageDealtThisCard,
    selectedCardId: null,
    lastPlayedCard: card,
  };
}
