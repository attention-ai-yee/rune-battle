import React, { useMemo } from 'react';
import type { GameState } from '../types/game';
import Hand from './Hand';
import Enemy from './Enemy';
import Player from './Player';
import EnergyOrb from './EnergyOrb';

interface GameBoardProps {
  state: GameState;
  onCardClick: (cardId: string) => void;
  onEnemyTarget: (enemyIndex: number) => void;
  onEndTurn: () => void;
  onCancelSelection: () => void;
  onReturnToMap: () => void;
  onUsePotion: () => void;
  onToggleRetain?: (cardId: string) => void;
  onOpenDeck: () => void;
}

// Stable particles for battle scene
const battleParticles = Array.from({ length: 25 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  top: `${10 + Math.random() * 80}%`,
  size: 2 + Math.random() * 3,
  delay: Math.random() * 6,
  duration: 5 + Math.random() * 5,
  color: i % 3 === 0 ? 'rgba(168,85,247,0.4)' : i % 3 === 1 ? 'rgba(59,130,246,0.3)' : 'rgba(239,68,68,0.2)',
}));

const GameBoard: React.FC<GameBoardProps> = ({
  state,
  onCardClick,
  onEnemyTarget,
  onEndTurn,
  onCancelSelection,
  onReturnToMap,
  onUsePotion,
  onToggleRetain,
  onOpenDeck,
}) => {
  const { player, enemies, hand, drawPile, discardPile } = state;
  const hasSelectedCard = state.selectedCardId !== null;
  const selectedCard = hasSelectedCard
    ? hand.find(c => c.instanceId === state.selectedCardId)
    : null;

  // Battle Win overlay
  if (state.screen === 'battleWin') {
    const goldEarned = (() => {
      const colIndex = Math.floor(state.currentBattleNode / 10);
      const layer = state.mapLayers[state.currentBattleLayer];
      let isElite = false;
      if (layer && layer.columns[colIndex]) {
        const node = layer.columns[colIndex][state.currentBattleNode % 10];
        if (node) {
          isElite = node.type === 'elite';
        }
      }
      return isElite ? '60-80' : '30-50';
    })();

    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#050510] animate-screen-fade-in relative overflow-hidden">
        {/* Victory glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-3xl animate-pulse-slow" />
        </div>

        <div className="relative z-10 flex flex-col items-center animate-bounce-in">
          <div className="text-7xl sm:text-8xl mb-6 drop-shadow-2xl">🎉</div>
          <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400 mb-3 tracking-wider">
            战斗胜利！
          </h2>
          <p className="text-base text-gray-400 mb-6">所有敌人已被击败</p>

          {/* Stats */}
          <div className="flex flex-col gap-3 mb-8 px-8 py-5 bg-black/30 rounded-2xl border border-amber-500/20 min-w-[300px] backdrop-blur-sm">
            <div className="flex items-center justify-between gap-8">
              <span className="text-sm text-gray-400">🪙 获得金币</span>
              <span className="text-sm text-amber-400 font-bold">{goldEarned}</span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="text-sm text-gray-400">🃏 使用卡牌</span>
              <span className="text-sm text-blue-400 font-bold">{state.totalCardsPlayed ?? 0} 张</span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="text-sm text-gray-400">⚔️ 造成伤害</span>
              <span className="text-sm text-red-400 font-bold">{state.totalDamageDealt ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="text-sm text-gray-400">🔄 回合数</span>
              <span className="text-sm text-purple-400 font-bold">{state.turnNumber ?? 0}</span>
            </div>
          </div>

          <p className="text-sm text-green-400/80 mb-8">
            💚 恢复了 {Math.floor((player.maxHp - player.hp) * 0.2)} 点生命
          </p>

          <button
            onClick={onReturnToMap}
            className="
              px-10 py-4 rounded-xl font-bold text-lg
              bg-amber-900/40 border-2 border-amber-500/50 text-amber-400
              hover:bg-amber-900/60 hover:border-amber-400 hover:scale-110
              hover:shadow-[0_0_30px_rgba(212,164,76,0.4)]
              active:scale-95 transition-all duration-200
              tracking-wider
            "
          >
            返回地图 →
          </button>
        </div>
      </div>
    );
  }

  const hasPotion = player.potions > 0 && player.potionCooldown <= 0;

  return (
    <div
      className={`
        h-full flex flex-col overflow-hidden relative
        transition-transform
        ${state.screenShake ? 'animate-shake-hard' : ''}
      `}
      style={{ background: 'linear-gradient(180deg, #080818 0%, #0c0c28 30%, #10102a 60%, #080818 100%)' }}
    >
      {/* ===== Multi-layer Battle Background ===== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Sky gradient */}
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-purple-900/15 to-transparent" />

        {/* Ground glow */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-purple-900/10 to-transparent" />

        {/* Ground line */}
        <div className="absolute bottom-[28%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
        <div className="absolute bottom-[27%] left-0 right-0 h-8 bg-gradient-to-t from-purple-500/5 to-transparent" />

        {/* Floating particles */}
        {battleParticles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full animate-particle-float"
            style={{
              left: p.left,
              top: p.top,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}

        {/* Side lights */}
        <div className="absolute top-1/4 -left-32 w-64 h-96 bg-purple-600/8 blur-[80px]" />
        <div className="absolute top-1/3 -right-32 w-64 h-96 bg-red-600/6 blur-[80px]" />

        {/* Center magical glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-900/6 rounded-full blur-[100px] animate-pulse-slow" />
      </div>

      {/* ===== Turn Banner ===== */}
      {state.isEnemyTurn && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="turn-banner-text">
            ⚡ 敌人回合 ⚡
          </div>
        </div>
      )}

      {/* ===== Enemy Area ===== */}
      <div className="flex-0 pt-8 sm:pt-10 px-3 sm:px-6 relative z-10">
        <div className="flex items-end justify-center gap-5 sm:gap-12 flex-wrap">
          {enemies.map((enemy, index) => (
            <Enemy
              key={enemy.instanceId}
              enemy={enemy}
              index={index}
              isTargetable={hasSelectedCard && (selectedCard?.effect.type === 'attack' || selectedCard?.effect.type === 'multiAttack' || selectedCard?.effect.type === 'drain' || selectedCard?.effect.type === 'multiHit' || selectedCard?.effect.type === 'handCountDamage')}
              isSelected={false}
              onTarget={onEnemyTarget}
            />
          ))}

          {enemies.length === 0 && (
            <div className="text-gray-500 text-sm italic py-16 animate-fade-in">
              <span className="text-4xl block mb-3">⚔️</span>
              等待敌人出现...
            </div>
          )}
        </div>
      </div>

      {/* ===== Battle Info ===== */}
      <div className="flex-0 flex items-center justify-center min-h-[50px] sm:min-h-[60px] relative z-10">
        {hasSelectedCard && (
          <div className="animate-pulse flex items-center gap-3">
            <span className="text-amber-400 text-base sm:text-lg font-bold" style={{ textShadow: '0 0 15px rgba(212,164,76,0.5)' }}>
              🎯 选择目标
            </span>
            <button
              onClick={onCancelSelection}
              className="text-sm text-gray-400 hover:text-gray-200 underline underline-offset-2 decoration-dotted"
            >
              取消
            </button>
          </div>
        )}
        {!state.isEnemyTurn && !hasSelectedCard && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-px bg-gradient-to-r from-transparent to-purple-500/30" />
            <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-900/50 rounded-full border border-gray-700/30">
              <span className="text-purple-400/60 text-xs">回合</span>
              <span className="text-amber-400 text-base font-black" style={{ textShadow: '0 0 10px rgba(212,164,76,0.4)' }}>{state.turnNumber}</span>
            </div>
            <div className="w-10 h-px bg-gradient-to-l from-transparent to-purple-500/30" />
          </div>
        )}
      </div>

      {/* ===== Player Area ===== */}
      <div className="flex-1 flex flex-col justify-end pb-16 sm:pb-10 min-h-0 relative z-10">
        {/* Player info row */}
        <div className="flex items-center gap-3 sm:gap-6 px-3 sm:px-6 mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <Player
              player={player}
              deckSize={drawPile.length}
              discardSize={discardPile.length}
              playerStrength={state.playerStrength}
              potions={player.potions}
              potionCooldown={player.potionCooldown}
            />
          </div>

          <EnergyOrb current={player.energy} max={player.maxEnergy} />

          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Potion */}
            <button
              onClick={hasPotion && !state.isEnemyTurn ? onUsePotion : undefined}
              className={`
                flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200
                ${hasPotion && !state.isEnemyTurn
                  ? 'bg-emerald-900/40 border-2 border-emerald-400/60 hover:bg-emerald-900/60 hover:border-emerald-300 hover:scale-110 active:scale-95 cursor-pointer hover:shadow-[0_0_25px_rgba(52,211,153,0.4)]'
                  : 'bg-gray-800/20 border-2 border-gray-700/20 opacity-25 cursor-not-allowed'
                }
              `}
            >
              <span className={`text-2xl ${hasPotion ? 'drop-shadow-lg' : 'grayscale'}`}>🧪</span>
              <span className={`text-[10px] font-bold ${hasPotion ? 'text-emerald-400' : 'text-gray-600'}`}>
                {player.potionCooldown > 0 ? `⏳${player.potionCooldown}` : `×${player.potions}`}
              </span>
            </button>

            {/* Deck */}
            <button
              onClick={onOpenDeck}
              className="
                flex flex-col items-center gap-1 px-3 py-2 rounded-xl
                bg-gray-800/40 border border-gray-600/30
                hover:bg-gray-700/50 hover:border-purple-500/40 hover:scale-110
                active:scale-95 transition-all duration-200
              "
            >
              <span className="text-2xl drop-shadow-lg">📜</span>
              <span className="text-[10px] text-gray-400 font-bold">牌库</span>
            </button>
          </div>

          {/* End Turn */}
          {!state.isEnemyTurn && (
            <button
              onClick={onEndTurn}
              className="
                px-7 sm:px-8 py-3.5 rounded-xl font-bold text-base
                bg-gradient-to-r from-amber-800/60 to-amber-700/50
                border-2 border-amber-400/70 text-amber-300
                hover:from-amber-700/80 hover:to-amber-600/70
                hover:border-amber-300 hover:scale-110
                hover:shadow-[0_0_35px_rgba(212,164,76,0.5)]
                active:scale-95 transition-all duration-200
                shadow-[0_0_20px_rgba(212,164,76,0.3)]
                tracking-wider
              "
            >
              结束回合 →
            </button>
          )}

          {state.isEnemyTurn && (
            <div className="px-6 py-3.5 rounded-xl font-bold text-base bg-gray-800/30 border border-gray-700/30 text-gray-500 animate-pulse">
              ⏳ 等待中...
            </div>
          )}
        </div>

        {/* Retain hint */}
        {!state.isEnemyTurn && hand.length > 0 && (
          <div className="text-center text-[10px] text-cyan-400/30 mb-2">
            💡 长按卡牌可保留到下一回合
          </div>
        )}

        {/* Hand */}
        <Hand
          cards={hand}
          selectedCardId={state.selectedCardId}
          playerEnergy={player.energy}
          isEnemyTurn={state.isEnemyTurn}
          onCardClick={onCardClick}
          onToggleRetain={onToggleRetain}
        />
      </div>
    </div>
  );
};

export default GameBoard;
