import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Volume2, VolumeX, Gem, Swords, FlaskConical, Trophy, Skull, Crown, Swords as SwordsIcon, Coins, Layers, RotateCcw, HeartPulse } from 'lucide-react';

// Generate stable particles once
const titleParticles = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  size: 2 + Math.random() * 5,
  delay: Math.random() * 8,
  duration: 4 + Math.random() * 6,
  opacity: 0.2 + Math.random() * 0.5,
  color: ['#a855f7', '#3b82f6', '#d4a44c', '#ef4444', '#22c55e'][i % 5],
}));

const victoryParticles = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  delay: Math.random() * 3,
  duration: 2 + Math.random() * 3,
  color: ['#d4a44c', '#fbbf24', '#a855f7', '#ef4444', '#22c55e', '#3b82f6'][i % 6],
  size: 6 + Math.random() * 10,
  rotate: Math.random() * 360,
}));

const gameOverParticles = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  left: `${20 + Math.random() * 60}%`,
  top: `${20 + Math.random() * 60}%`,
  size: 4 + Math.random() * 12,
  opacity: 0.3 + Math.random() * 0.5,
}));

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

  const MuteButton = () => (
    <button
      onClick={() => { sfxClick(); toggleBgm(); }}
      className="
        fixed top-3 right-3 z-50
        w-10 h-10 sm:w-12 sm:h-12
        flex items-center justify-center
        rounded-full bg-gray-900/80 border border-gray-600/40
        backdrop-blur-sm
        hover:bg-gray-800/80 hover:border-gray-500/60
        active:scale-90
        transition-all duration-200
      "
      title={bgmOn ? '静音' : '开启音乐'}
    >
      {bgmOn ? <Volume2 size={18} className="text-gray-300" /> : <VolumeX size={18} className="text-gray-500" />}
    </button>
  );

  // ===== Title Screen =====
  if (state.screen === 'title') {
    return (
      <div className="h-[100dvh] w-screen flex flex-col items-center justify-center overflow-hidden relative bg-[#050510]">
        {/* Deep space background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0520] via-[#050510] to-[#0a0515]" />

        {/* Animated nebula clouds */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[60%] bg-purple-900/20 rounded-full blur-[100px] animate-pulse-slow" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[50%] bg-blue-900/15 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[30%] left-[50%] w-[40%] h-[40%] bg-red-900/10 rounded-full blur-[80px] animate-pulse-slow" style={{ animationDelay: '4s' }} />
        </div>

        {/* Rotating magic circles */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Outer circle */}
          <div className="absolute w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] animate-rune-rotate opacity-20">
            <div className="absolute inset-0 rounded-full border-2 border-purple-500/30" />
            <div className="absolute inset-[15px] rounded-full border border-purple-500/20" />
            <div className="absolute inset-[30px] rounded-full border border-dashed border-purple-500/15" />
            {/* Rune marks on circle */}
            {[0, 60, 120, 180, 240, 300].map(deg => (
              <div key={deg} className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-500/40 rounded-full" style={{ transform: `rotate(${deg}deg) translateY(-250px)`, transformOrigin: '50% 250px' }} />
            ))}
          </div>

          {/* Middle circle */}
          <div className="absolute w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] animate-rune-rotate-reverse opacity-15">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/25" />
            <div className="absolute inset-[10px] rounded-full border border-blue-500/15" />
          </div>

          {/* Inner circle */}
          <div className="absolute w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] animate-rune-pulse opacity-25">
            <div className="absolute inset-0 rounded-full border-2 border-gold/30" style={{ borderColor: 'rgba(212,164,76,0.3)' }} />
          </div>
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {titleParticles.map(p => (
            <div
              key={p.id}
              className="absolute rounded-full animate-particle-float"
              style={{
                left: p.left,
                top: p.top,
                width: `${p.size}px`,
                height: `${p.size}px`,
                background: p.color,
                opacity: p.opacity,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                filter: `blur(${p.size > 4 ? 1 : 0}px)`,
              }}
            />
          ))}
        </div>

        {/* Title content */}
        <div className="relative z-10 flex flex-col items-center animate-fade-in-slow">
          {/* Crystal orb */}
          <div className="relative mb-8 sm:mb-10">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 animate-float z-10">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/30 via-blue-500/20 to-purple-600/30 border-2 border-purple-400/40 animate-pulse-glow" />
              <div className="absolute inset-[6px] rounded-full bg-gradient-to-br from-purple-900/80 to-blue-900/80 border border-purple-500/20" />
              <div className="absolute inset-[12px] rounded-full bg-gradient-to-br from-purple-600/20 to-transparent flex items-center justify-center">
                <Gem size={32} className="text-purple-300/60 animate-pulse" />
              </div>
              <div className="absolute top-[15%] left-[20%] w-[20%] h-[20%] rounded-full bg-white/10 blur-sm" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-purple-500/20 blur-2xl animate-pulse-slow" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-purple-400 to-blue-400 mb-3 tracking-[0.2em] animate-title-glow drop-shadow-2xl">
            符文之战
          </h1>
          <p className="text-lg sm:text-2xl text-gray-300/80 mb-2 tracking-[0.3em] font-light">RUNE BATTLE</p>

          {/* Decorative divider */}
          <div className="flex items-center gap-4 mb-10 sm:mb-12">
            <div className="w-20 sm:w-32 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500/60" />
              <Swords size={16} className="text-purple-400/60" />
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500/60" />
            </div>
            <div className="w-20 sm:w-32 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
          </div>

          {/* Start button */}
          <button
            onClick={() => { ensureBgmStarted(); sfxClick(); startGame(); }}
            className="
              relative px-14 sm:px-20 py-4 sm:py-5 rounded-2xl text-xl sm:text-2xl font-black
              bg-gradient-to-r from-purple-900/80 via-indigo-900/80 to-purple-900/80
              border-2 border-purple-400/60 text-purple-200
              hover:from-purple-800/90 hover:via-indigo-800/90 hover:to-purple-800/90
              hover:border-purple-300 hover:text-white hover:scale-110
              hover:shadow-[0_0_50px_rgba(168,85,247,0.5),0_0_100px_rgba(168,85,247,0.2)]
              active:scale-95
              transition-all duration-300
              shadow-[0_0_30px_rgba(168,85,247,0.3)]
              tracking-wider
            "
          >
            <span className="relative z-10">开 始 冒 险</span>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/10 via-transparent to-purple-500/10 animate-shimmer" />
          </button>

          {/* Instructions card */}
          <div className="mt-10 sm:mt-12 max-w-sm sm:max-w-md w-full px-6">
            <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-gray-700/40 p-5 sm:p-6 shadow-2xl">
              <div className="text-center text-sm text-gray-300 font-bold mb-4 tracking-wider">
                📜 冒险指南
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
                <div className="flex items-start gap-2 p-2 bg-gray-800/40 rounded-lg">
                  <Gem size={16} className="text-amber-400/60 mt-0.5" />
                  <div>
                    <div className="text-gray-300 font-bold mb-0.5">能量系统</div>
                    <div>每回合3点能量打出卡牌</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-800/40 rounded-lg">
                  <Swords size={16} className="text-red-400/60 mt-0.5" />
                  <div>
                    <div className="text-gray-300 font-bold mb-0.5">卡牌类型</div>
                    <div>攻击·防御·法术三种</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-800/40 rounded-lg">
                  <FlaskConical size={16} className="text-emerald-400/60 mt-0.5" />
                  <div>
                    <div className="text-gray-300 font-bold mb-0.5">药水</div>
                    <div>每3回合可用一次</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-800/40 rounded-lg">
                  <Trophy size={16} className="text-amber-400/60 mt-0.5" />
                  <div>
                    <div className="text-gray-300 font-bold mb-0.5">目标</div>
                    <div>击败所有敌人通关</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom version */}
        <div className="absolute bottom-4 text-center text-[10px] text-gray-700/60 z-10">
          v1.0 · A Roguelike Card Game
        </div>
      </div>
    );
  }

  // ===== Map Screen =====
  if (state.screen === 'map') {
    return (
      <div className="h-[100dvh] w-screen animate-screen-fade-in">
        <MuteButton />
        <MapScreen
          mapLayers={state.mapLayers}
          playerHp={state.player.hp}
          playerMaxHp={state.player.maxHp}
          gold={state.gold}
          onSelectNode={selectMapNode}
          onOpenDeck={() => setShowDeck(true)}
          deckSize={state.drawPile.length + state.discardPile.length + state.hand.length}
        />
        {showDeck && (
          <DeckViewer
            drawPile={state.drawPile}
            hand={state.hand}
            discardPile={state.discardPile}
            exhaustedPile={state.exhaustedPile}
            onClose={() => setShowDeck(false)}
          />
        )}
      </div>
    );
  }

  // ===== Battle Screen =====
  if (state.screen === 'battle' || state.screen === 'battleWin') {
    return (
      <div className="h-[100dvh] w-screen animate-screen-fade-in">
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
          />
        )}
      </div>
    );
  }

  // ===== Card Reward =====
  if (state.screen === 'cardReward') {
    return (
      <div className="h-[100dvh] w-screen animate-screen-fade-in">
        <MuteButton />
        <CardRewardScreen
          rewardChoices={state.rewardChoices}
          onSelectCard={selectCardReward}
          onSkip={skipCardReward}
          deckSize={state.drawPile.length + state.discardPile.length + state.hand.length}
        />
      </div>
    );
  }

  // ===== Card Upgrade =====
  if (state.screen === 'cardUpgrade') {
    return (
      <div className="h-[100dvh] w-screen animate-screen-fade-in">
        <MuteButton />
        <CardUpgradeScreen
          upgradeChoices={state.upgradeChoices}
          onSelectCard={selectUpgradeCard}
          onSkip={skipUpgrade}
        />
      </div>
    );
  }

  // ===== Shop =====
  if (state.screen === 'shop') {
    return (
      <div className="h-[100dvh] w-screen animate-screen-fade-in">
        <MuteButton />
        <ShopScreen
          shopState={state.shopState}
          gold={state.gold}
          deckSize={state.drawPile.length + state.discardPile.length + state.hand.length}
          onBuyCard={buyCard}
          onRemoveCard={removeCard}
          onRestHeal={restHeal}
          onLeave={returnToMapFromShop}
        />
      </div>
    );
  }

  // ===== Event =====
  if (state.screen === 'event') {
    const fullDeck = [...state.drawPile, ...state.discardPile, ...state.hand];
    return (
      <div className="h-[100dvh] w-screen animate-screen-fade-in">
        <MuteButton />
        <EventScreen
          eventData={state.eventState!}
          deck={fullDeck}
          onChoose={selectEventChoice}
        />
      </div>
    );
  }

  // ===== Game Over =====
  if (state.screen === 'gameOver') {
    return (
      <div className="h-[100dvh] w-screen flex flex-col items-center justify-center overflow-hidden relative bg-[#0a0008] animate-screen-fade-in">
        <MuteButton />

        {/* Dark blood background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#150008] via-[#0a0008] to-[#050005]" />

        {/* Blood particles */}
        <div className="absolute inset-0 pointer-events-none">
          {gameOverParticles.map(p => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: p.left,
                top: p.top,
                width: `${p.size}px`,
                height: `${p.size}px`,
                background: `rgba(239, 68, 68, ${p.opacity})`,
                filter: 'blur(2px)',
              }}
            />
          ))}
        </div>

        {/* Red vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_30%,rgba(100,0,0,0.3)_100%)]" />

        <div className="relative z-10 flex flex-col items-center animate-fade-in">
          {/* Death skull */}
          <div className="relative mb-8">
            <div className="animate-bounce-in drop-shadow-2xl">
              <Skull size={100} className="text-red-400/80" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-40 rounded-full bg-red-500/10 blur-3xl animate-pulse-slow" />
            </div>
          </div>

          <h2 className="text-5xl sm:text-6xl font-black text-red-500 mb-3 tracking-wider animate-title-glow" style={{ textShadow: '0 0 30px rgba(239,68,68,0.5)' }}>
            战斗失败
          </h2>
          <p className="text-lg text-gray-400 mb-2">冒险者倒下了...</p>

          {/* Stats */}
          <div className="flex flex-col gap-2.5 mb-10 px-8 py-5 bg-black/40 rounded-2xl border border-red-900/30 min-w-[280px] backdrop-blur-sm">
            <div className="text-center text-sm text-red-400 font-bold mb-2 tracking-wider flex items-center justify-center gap-2">
              <Swords size={14} /> 战斗统计
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="text-sm text-gray-500">造成伤害</span>
              <span className="text-sm text-red-400 font-bold">{state.totalDamageDealt ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="text-sm text-gray-500">使用卡牌</span>
              <span className="text-sm text-blue-400 font-bold">{state.totalCardsPlayed ?? 0} 张</span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="text-sm text-gray-500">存活回合</span>
              <span className="text-sm text-purple-400 font-bold">{state.turnNumber ?? 0}</span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => { sfxClick(); restartGame(); }}
              className="
                px-10 py-3.5 rounded-xl font-bold text-base
                bg-red-900/40 border-2 border-red-500/50 text-red-400
                hover:bg-red-900/60 hover:border-red-400 hover:scale-110
                hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]
                active:scale-95 transition-all duration-200
              "
            >
              再来一局
            </button>
            <button
              onClick={() => { sfxClick(); goToTitle(); }}
              className="
                px-8 py-3.5 rounded-xl font-bold text-base
                bg-gray-900/60 border-2 border-gray-600/40 text-gray-400
                hover:bg-gray-800/60 hover:border-gray-500 hover:scale-110
                active:scale-95 transition-all duration-200
              "
            >
              返回标题
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Victory =====
  if (state.screen === 'victory') {
    return (
      <div className="h-[100dvh] w-screen flex flex-col items-center justify-center overflow-hidden relative bg-[#0a0810] animate-screen-fade-in">
        <MuteButton />

        {/* Golden background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#15100a] via-[#0a0810] to-[#080510]" />

        {/* Golden glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-yellow-500/5 blur-3xl animate-pulse-slow" />
        </div>

        {/* Confetti */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {victoryParticles.map(p => (
            <div
              key={p.id}
              className="confetti-piece"
              style={{
                left: p.left,
                top: '-5%',
                width: `${p.size}px`,
                height: `${p.size}px`,
                background: p.color,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                borderRadius: p.id % 3 === 0 ? '50%' : '2px',
                transform: `rotate(${p.rotate}deg)`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center animate-fade-in">
          {/* Crown */}
          <div className="relative mb-8">
            <div className="animate-bounce-in drop-shadow-2xl">
              <Crown size={100} className="text-amber-400/80" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-40 rounded-full bg-yellow-500/15 blur-3xl animate-pulse-slow" />
            </div>
          </div>

          <h2 className="text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 mb-3 tracking-wider animate-title-glow">
            胜利！
          </h2>
          <p className="text-xl text-amber-400/80 mb-1">所有敌人已被征服</p>
          <p className="text-sm text-gray-500 mb-8">恭喜你通关了符文之战！</p>

          {/* Victory stats */}
          <div className="flex flex-col gap-3 mb-10 px-10 py-6 bg-black/30 rounded-2xl border border-amber-500/20 min-w-[320px] backdrop-blur-sm">
            <div className="text-center text-base text-amber-400 font-bold mb-2 tracking-wider flex items-center justify-center gap-2">
              <Trophy size={16} /> 通关统计
            </div>
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-gray-400 flex items-center gap-2"><Swords size={12} className="text-red-400/50" /> 总伤害</span>
              <span className="text-sm text-red-400 font-bold">{state.totalDamageDealt ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-gray-400 flex items-center gap-2"><Layers size={12} className="text-blue-400/50" /> 总卡牌</span>
              <span className="text-sm text-blue-400 font-bold">{state.totalCardsPlayed ?? 0} 张</span>
            </div>
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-gray-400 flex items-center gap-2"><RotateCcw size={12} className="text-purple-400/50" /> 总回合</span>
              <span className="text-sm text-purple-400 font-bold">{state.turnNumber ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-gray-400 flex items-center gap-2"><Coins size={12} className="text-amber-400/50" /> 获得金币</span>
              <span className="text-sm text-amber-400 font-bold">{state.gold ?? 0}</span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => { sfxClick(); restartGame(); }}
              className="
                px-10 py-3.5 rounded-xl font-bold text-base
                bg-amber-900/40 border-2 border-amber-500/50 text-amber-400
                hover:bg-amber-900/60 hover:border-amber-400 hover:scale-110
                hover:shadow-[0_0_30px_rgba(212,164,76,0.4)]
                active:scale-95 transition-all duration-200
              "
            >
              再来一局
            </button>
            <button
              onClick={() => { sfxClick(); goToTitle(); }}
              className="
                px-8 py-3.5 rounded-xl font-bold text-base
                bg-gray-900/60 border-2 border-gray-600/40 text-gray-400
                hover:bg-gray-800/60 hover:border-gray-500 hover:scale-110
                active:scale-95 transition-all duration-200
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
      <p className="text-gray-500 animate-pulse">加载中...</p>
    </div>
  );
};

export default App;
