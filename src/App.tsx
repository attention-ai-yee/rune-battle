import React, { useState, useEffect, useCallback } from 'react';
import type { GameState } from './types/game';
import GameBoard from './components/GameBoard';
import MapScreen from './components/MapScreen';
import CardUpgradeScreen from './components/CardUpgradeScreen';
import CardRewardScreen from './components/CardRewardScreen';
import ShopScreen from './components/ShopScreen';
import EventScreen from './components/EventScreen';
import DeckViewer from './components/DeckViewer';
import { useGameState } from './hooks/useGameState';
import { sfxClick, bgmStart, bgmStop, isBgmPlaying } from './utils/sounds';

const App: React.FC = () => {
  const {
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
    usePotion,
    selectUpgradeCard,
    skipUpgrade,
    selectCardReward,
    skipCardReward,
    buyCard,
    removeCard,
    restHeal,
    returnToMapFromShop,
    selectEventChoice,
    returnToMapFromEvent,
  } = useGameState();

  const [bgmOn, setBgmOn] = useState(false);
  const [showDeck, setShowDeck] = useState(false);

  // Start BGM on first user interaction (browser autoplay policy)
  const ensureBgmStarted = useCallback(() => {
    if (!bgmOn) {
      bgmStart();
      setBgmOn(true);
    }
  }, [bgmOn]);

  const toggleBgm = useCallback(() => {
    if (bgmOn) {
      bgmStop();
      setBgmOn(false);
    } else {
      bgmStart();
      setBgmOn(true);
    }
  }, [bgmOn]);

  // Mute button (fixed position, visible on all screens except title)
  const MuteButton = () => (
    <button
      onClick={() => { sfxClick(); toggleBgm(); }}
      className="
        fixed top-2 right-2 sm:top-3 sm:right-3 z-50
        touch-target w-10 h-10 sm:w-11 sm:h-11
        flex items-center justify-center
        rounded-full bg-gray-800/60 border border-gray-700/50
        text-lg sm:text-xl
        hover:bg-gray-700/60 active:bg-gray-600/60
        transition-all duration-200
      "
      title={bgmOn ? '静音' : '开启音乐'}
    >
      {bgmOn ? '🔊' : '🔇'}
    </button>
  );

  // Title Screen
  if (state.screen === 'title') {
    return (
      <div className="h-[100dvh] w-screen flex flex-col items-center justify-center bg-rune-pattern overflow-hidden">
        {/* Background particles effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-rune-purple/30 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>

        {/* Title content */}
        <div className="relative z-10 flex flex-col items-center animate-fade-in">
          {/* Game logo */}
          <div className="text-5xl sm:text-7xl mb-4 sm:mb-6 animate-float">🔮</div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rune-red via-rune-purple to-rune-blue mb-1 sm:mb-2 tracking-widest">
            符文之战
          </h1>
          <p className="text-sm sm:text-lg text-gray-400 mb-1 sm:mb-2 tracking-wider">Rune Battle</p>

          {/* Decorative line */}
          <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            <div className="w-10 sm:w-16 h-px bg-gradient-to-r from-transparent to-rune-purple/50" />
            <span className="text-rune-purple/50 text-xs sm:text-sm">✦</span>
            <div className="w-10 sm:w-16 h-px bg-gradient-to-l from-transparent to-rune-purple/50" />
          </div>

          {/* Start button */}
          <button
            onClick={() => { ensureBgmStarted(); sfxClick(); startGame(); }}
            className="
              touch-target px-8 sm:px-12 py-3 sm:py-4 rounded-xl text-lg sm:text-xl font-bold
              bg-gradient-to-r from-purple-900/50 to-indigo-900/50
              border-2 border-rune-purple/50 text-rune-purple
              hover:from-purple-900/70 hover:to-indigo-900/70
              hover:border-rune-purple hover:scale-110
              hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]
              active:from-purple-900/80 active:to-indigo-900/80 active:scale-95
              transition-all duration-300
              /* Mobile: more prominent glow */
              sm:shadow-none shadow-[0_0_16px_rgba(168,85,247,0.25)]
            "
          >
            开始游戏
          </button>

          {/* Instructions */}
          <div className="mt-6 sm:mt-8 text-center text-[10px] sm:text-xs text-gray-600 max-w-xs sm:max-w-sm leading-relaxed px-4">
            <p className="mb-1.5 sm:mb-2">📜 游戏说明</p>
            <p>每回合获得3点能量，用于打出卡牌</p>
            <p>攻击卡造成伤害 · 防御卡获得护甲 · 法术卡释放魔法</p>
            <p>战斗胜利后可以升级卡牌！</p>
            <p>使用药水恢复能量，击败所有敌人即可获胜！</p>
          </div>
        </div>
      </div>
    );
  }

  // Map Screen
  if (state.screen === 'map') {
    const deckSize = state.drawPile.length + state.hand.length + state.discardPile.length + state.exhaustedPile.length;
    return (
      <div className="h-[100dvh] w-screen bg-rune-dark">
        <MuteButton />
        <MapScreen
          mapLayers={state.mapLayers}
          playerHp={state.player.hp}
          playerMaxHp={state.player.maxHp}
          gold={state.gold}
          onSelectNode={selectMapNode}
          onOpenDeck={() => setShowDeck(true)}
          deckSize={deckSize}
        />
        {showDeck && (
          <DeckViewer
            drawPile={state.drawPile}
            hand={state.hand}
            discardPile={state.discardPile}
            exhaustedPile={state.exhaustedPile}
            onClose={() => setShowDeck(false)}
            screen="map"
          />
        )}
      </div>
    );
  }

  // Battle Screen
  if (state.screen === 'battle' || state.screen === 'battleWin') {
    return (
      <div className="h-[100dvh] w-screen bg-rune-dark">
        <MuteButton />
        <GameBoard
          state={state}
          onCardClick={selectCard}
          onEnemyTarget={selectEnemyTarget}
          onEndTurn={endTurn}
          onCancelSelection={cancelSelection}
          onReturnToMap={returnToMap}
          onUsePotion={usePotion}
          onToggleRetain={toggleRetain}
          onOpenDeck={() => setShowDeck(true)}
        />
        {showDeck && (
          <DeckViewer
            drawPile={state.drawPile}
            hand={state.hand}
            discardPile={state.discardPile}
            exhaustedPile={state.exhaustedPile}
            onClose={() => setShowDeck(false)}
            screen="battle"
          />
        )}
      </div>
    );
  }

  // Card Reward Screen
  if (state.screen === 'cardReward') {
    const deckSize = state.drawPile.length + state.hand.length + state.discardPile.length;
    return (
      <div className="h-[100dvh] w-screen bg-rune-dark">
        <MuteButton />
        <CardRewardScreen
          rewardChoices={state.rewardChoices}
          deckSize={deckSize}
          onSelectCard={selectCardReward}
          onSkip={skipCardReward}
        />
      </div>
    );
  }

  // Card Upgrade Screen
  if (state.screen === 'cardUpgrade') {
    return (
      <div className="h-[100dvh] w-screen bg-rune-dark">
        <MuteButton />
        <CardUpgradeScreen
          upgradeChoices={state.upgradeChoices}
          onSelectCard={selectUpgradeCard}
          onSkip={skipUpgrade}
        />
      </div>
    );
  }

  // Shop Screen
  if (state.screen === 'shop') {
    const fullDeck = [...state.drawPile, ...state.hand, ...state.discardPile];
    return (
      <div className="h-[100dvh] w-screen bg-rune-dark">
        <MuteButton />
        <ShopScreen
          gold={state.gold}
          deck={fullDeck}
          onBuyCard={buyCard}
          onRemoveCard={removeCard}
          onRestHeal={restHeal}
          onLeave={returnToMapFromShop}
        />
      </div>
    );
  }

  // Event Screen
  if (state.screen === 'event') {
    const fullDeck = [...state.drawPile, ...state.hand, ...state.discardPile];
    return (
      <div className="h-[100dvh] w-screen bg-rune-dark">
        <MuteButton />
        {state.eventState && (
          <EventScreen
            eventData={state.eventState}
            deck={fullDeck}
            onChoose={selectEventChoice}
          />
        )}
      </div>
    );
  }

  // Game Over Screen
  if (state.screen === 'gameOver') {
    return (
      <div className="h-[100dvh] w-screen flex flex-col items-center justify-center bg-rune-pattern animate-fade-in">
        <MuteButton />
        <div className="text-5xl sm:text-7xl mb-4 sm:mb-6">💀</div>
        <h2 className="text-3xl sm:text-4xl font-bold text-rune-red mb-1 sm:mb-2">战斗失败</h2>
        <p className="text-sm sm:text-base text-gray-400 mb-6 sm:mb-8">冒险者倒下了...</p>

        <div className="flex gap-3 sm:gap-4">
          <button
            onClick={() => { sfxClick(); restartGame(); }}
            className="
              touch-target px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-bold text-sm sm:text-base
              bg-rune-red/20 border-2 border-rune-red/50 text-rune-red
              hover:bg-rune-red/30 hover:border-rune-red
              active:bg-rune-red/40 active:scale-95
              transition-all duration-200 hover:scale-105
            "
          >
            重新开始
          </button>
          <button
            onClick={() => { sfxClick(); goToTitle(); }}
            className="
              touch-target px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-bold text-sm sm:text-base
              bg-gray-800/40 border-2 border-gray-600/50 text-gray-400
              hover:bg-gray-800/60 hover:border-gray-500
              active:bg-gray-700/60 active:scale-95
              transition-all duration-200 hover:scale-105
            "
          >
            返回标题
          </button>
        </div>
      </div>
    );
  }

  // Victory Screen
  if (state.screen === 'victory') {
    return (
      <div className="h-[100dvh] w-screen flex flex-col items-center justify-center bg-rune-pattern animate-fade-in">
        <MuteButton />
        {/* Victory particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-rune-gold/40 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="text-6xl sm:text-8xl mb-4 sm:mb-6 animate-float">👑</div>
          <h2 className="text-3xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rune-gold via-yellow-400 to-rune-gold mb-1 sm:mb-2">
            胜利！
          </h2>
          <p className="text-base sm:text-lg text-rune-gold/70 mb-1 sm:mb-2">所有敌人已被征服</p>
          <p className="text-xs sm:text-sm text-gray-400 mb-6 sm:mb-8">冒险者成功通关了符文之战！</p>

          <div className="flex gap-3 sm:gap-4">
            <button
              onClick={() => { sfxClick(); restartGame(); }}
              className="
                touch-target px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-bold text-sm sm:text-base
                bg-rune-gold/20 border-2 border-rune-gold/50 text-rune-gold
                hover:bg-rune-gold/30 hover:border-rune-gold
                active:bg-rune-gold/40 active:scale-95
                transition-all duration-200 hover:scale-105
              "
            >
              再来一局
            </button>
            <button
              onClick={() => { sfxClick(); goToTitle(); }}
              className="
                touch-target px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-bold text-sm sm:text-base
                bg-gray-800/40 border-2 border-gray-600/50 text-gray-400
                hover:bg-gray-800/60 hover:border-gray-500
                active:bg-gray-700/60 active:scale-95
                transition-all duration-200 hover:scale-105
              "
            >
              返回标题
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="h-[100dvh] w-screen flex items-center justify-center bg-rune-dark">
      <p className="text-gray-500">加载中...</p>
    </div>
  );
};

export default App;
