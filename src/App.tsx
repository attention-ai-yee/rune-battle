import React from 'react';
import type { GameState } from './types/game';
import GameBoard from './components/GameBoard';
import MapScreen from './components/MapScreen';
import CardUpgradeScreen from './components/CardUpgradeScreen';
import { useGameState } from './hooks/useGameState';

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
  } = useGameState();

  // Title Screen
  if (state.screen === 'title') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-rune-pattern overflow-hidden">
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
          <div className="text-7xl mb-6 animate-float">🔮</div>

          {/* Title */}
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rune-red via-rune-purple to-rune-blue mb-2 tracking-widest">
            符文之战
          </h1>
          <p className="text-lg text-gray-400 mb-2 tracking-wider">Rune Battle</p>

          {/* Decorative line */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-rune-purple/50" />
            <span className="text-rune-purple/50 text-sm">✦</span>
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-rune-purple/50" />
          </div>

          {/* Start button */}
          <button
            onClick={startGame}
            className="
              px-12 py-4 rounded-xl text-xl font-bold
              bg-gradient-to-r from-purple-900/50 to-indigo-900/50
              border-2 border-rune-purple/50 text-rune-purple
              hover:from-purple-900/70 hover:to-indigo-900/70
              hover:border-rune-purple hover:scale-110
              hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]
              transition-all duration-300
              active:scale-95
            "
          >
            开始游戏
          </button>

          {/* Instructions */}
          <div className="mt-8 text-center text-xs text-gray-600 max-w-sm leading-relaxed">
            <p className="mb-2">📜 游戏说明</p>
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
    return (
      <div className="h-screen w-screen bg-rune-dark">
        <MapScreen
          mapLayers={state.mapLayers}
          onSelectNode={selectMapNode}
        />
      </div>
    );
  }

  // Battle Screen
  if (state.screen === 'battle' || state.screen === 'battleWin') {
    return (
      <div className="h-screen w-screen bg-rune-dark">
        <GameBoard
          state={state}
          onCardClick={selectCard}
          onEnemyTarget={selectEnemyTarget}
          onEndTurn={endTurn}
          onCancelSelection={cancelSelection}
          onReturnToMap={returnToMap}
          onUsePotion={usePotion}
          onToggleRetain={toggleRetain}
        />
      </div>
    );
  }

  // Card Upgrade Screen
  if (state.screen === 'cardUpgrade') {
    return (
      <div className="h-screen w-screen bg-rune-dark">
        <CardUpgradeScreen
          upgradeChoices={state.upgradeChoices}
          onSelectCard={selectUpgradeCard}
          onSkip={skipUpgrade}
        />
      </div>
    );
  }

  // Game Over Screen
  if (state.screen === 'gameOver') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-rune-pattern animate-fade-in">
        <div className="text-7xl mb-6">💀</div>
        <h2 className="text-4xl font-bold text-rune-red mb-2">战斗失败</h2>
        <p className="text-gray-400 mb-8">冒险者倒下了...</p>

        <div className="flex gap-4">
          <button
            onClick={restartGame}
            className="
              px-8 py-3 rounded-lg font-bold
              bg-rune-red/20 border-2 border-rune-red/50 text-rune-red
              hover:bg-rune-red/30 hover:border-rune-red
              transition-all duration-200 hover:scale-105
            "
          >
            重新开始
          </button>
          <button
            onClick={goToTitle}
            className="
              px-8 py-3 rounded-lg font-bold
              bg-gray-800/40 border-2 border-gray-600/50 text-gray-400
              hover:bg-gray-800/60 hover:border-gray-500
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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-rune-pattern animate-fade-in">
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
          <div className="text-8xl mb-6 animate-float">👑</div>
          <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rune-gold via-yellow-400 to-rune-gold mb-2">
            胜利！
          </h2>
          <p className="text-lg text-rune-gold/70 mb-2">所有敌人已被征服</p>
          <p className="text-sm text-gray-400 mb-8">冒险者成功通关了符文之战！</p>

          <div className="flex gap-4">
            <button
              onClick={restartGame}
              className="
                px-8 py-3 rounded-lg font-bold
                bg-rune-gold/20 border-2 border-rune-gold/50 text-rune-gold
                hover:bg-rune-gold/30 hover:border-rune-gold
                transition-all duration-200 hover:scale-105
              "
            >
              再来一局
            </button>
            <button
              onClick={goToTitle}
              className="
                px-8 py-3 rounded-lg font-bold
                bg-gray-800/40 border-2 border-gray-600/50 text-gray-400
                hover:bg-gray-800/60 hover:border-gray-500
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
    <div className="h-screen w-screen flex items-center justify-center bg-rune-dark">
      <p className="text-gray-500">加载中...</p>
    </div>
  );
};

export default App;
