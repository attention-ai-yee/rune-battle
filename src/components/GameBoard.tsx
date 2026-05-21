import React from 'react';
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
}

const GameBoard: React.FC<GameBoardProps> = ({
  state,
  onCardClick,
  onEnemyTarget,
  onEndTurn,
  onCancelSelection,
  onReturnToMap,
  onUsePotion,
  onToggleRetain,
}) => {
  const { player, enemies, hand, drawPile, discardPile } = state;
  const hasSelectedCard = state.selectedCardId !== null;
  const selectedCard = hasSelectedCard
    ? hand.find(c => c.instanceId === state.selectedCardId)
    : null;

  // Battle Win overlay
  if (state.screen === 'battleWin') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-rune-pattern animate-fade-in">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold text-rune-gold mb-2">战斗胜利！</h2>
        <p className="text-gray-400 mb-2">所有敌人已被击败</p>
        <p className="text-sm text-rune-green mb-6">
          恢复了 {Math.floor((player.maxHp - player.hp) * 0.2)} 点生命
        </p>
        <button
          onClick={onReturnToMap}
          className="px-8 py-3 bg-rune-gold/20 hover:bg-rune-gold/30 border-2 border-rune-gold/50 text-rune-gold font-bold rounded-lg transition-all duration-200 hover:scale-105"
        >
          返回地图
        </button>
      </div>
    );
  }

  const hasPotion = player.potions > 0;

  return (
    <div
      className={`
        h-full flex flex-col bg-rune-pattern
        transition-transform
        ${state.screenShake ? 'animate-shake' : ''}
      `}
    >
      {/* Top: Enemy area */}
      <div className="flex-0 pt-4 px-4">
        <div className="flex items-center justify-center gap-6 flex-wrap">
          {enemies.map((enemy, index) => (
            <Enemy
              key={enemy.instanceId}
              enemy={enemy}
              index={index}
              isTargetable={hasSelectedCard && (selectedCard?.effect.type === 'attack' || selectedCard?.effect.type === 'multiAttack' || selectedCard?.effect.type === 'drain')}
              isSelected={false}
              onTarget={onEnemyTarget}
            />
          ))}

          {enemies.length === 0 && (
            <div className="text-gray-600 text-sm italic py-8">
              没有敌人
            </div>
          )}
        </div>
      </div>

      {/* Middle: Battle info area */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          {state.isEnemyTurn && (
            <div className="animate-pulse">
              <span className="text-rune-red text-lg font-bold">⚡ 敌人回合 ⚡</span>
            </div>
          )}
          {hasSelectedCard && (
            <div className="animate-pulse">
              <span className="text-rune-gold text-sm">
                选择一个敌人作为目标
              </span>
              <button
                onClick={onCancelSelection}
                className="ml-3 text-xs text-gray-400 hover:text-gray-200 underline"
              >
                取消
              </button>
            </div>
          )}
          {!state.isEnemyTurn && !hasSelectedCard && (
            <span className="text-gray-600 text-sm">
              回合 {state.turnNumber} · 打出手中的卡牌
            </span>
          )}
        </div>
      </div>

      {/* Bottom: Player area */}
      <div className="flex-0 pb-2">
        {/* Player info row */}
        <div className="flex items-center gap-4 px-4 mb-2">
          <div className="flex-1">
            <Player
              player={player}
              deckSize={drawPile.length}
              discardSize={discardPile.length}
              playerStrength={state.playerStrength}
              potions={player.potions}
            />
          </div>

          <EnergyOrb current={player.energy} max={player.maxEnergy} />

          {/* Potion button */}
          <button
            onClick={hasPotion && !state.isEnemyTurn ? onUsePotion : undefined}
            className={`
              flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-200
              ${hasPotion && !state.isEnemyTurn
                ? 'bg-emerald-900/30 border-2 border-emerald-400/50 hover:bg-emerald-900/50 hover:border-emerald-400 hover:scale-105 cursor-pointer'
                : 'bg-gray-800/30 border-2 border-gray-600/30 opacity-40 cursor-not-allowed'
              }
            `}
            title={hasPotion ? '使用药水：恢复2点能量' : '无药水'}
          >
            <span className={`text-2xl ${hasPotion ? '' : 'grayscale'}`}>🧪</span>
            <span className={`text-[10px] font-bold ${hasPotion ? 'text-emerald-400' : 'text-gray-600'}`}>
              药水×{player.potions}
            </span>
          </button>

          {/* End Turn button */}
          {!state.isEnemyTurn && (
            <button
              onClick={onEndTurn}
              className="
                px-5 py-3 rounded-lg font-bold text-sm
                bg-gradient-to-r from-amber-900/40 to-amber-800/30
                border-2 border-rune-gold/50 text-rune-gold
                hover:from-amber-900/60 hover:to-amber-800/50
                hover:border-rune-gold hover:scale-105
                transition-all duration-200
                active:scale-95
              "
            >
              结束回合 →
            </button>
          )}

          {state.isEnemyTurn && (
            <div className="px-5 py-3 rounded-lg font-bold text-sm bg-gray-800/40 border border-gray-700 text-gray-500">
              等待中...
            </div>
          )}
        </div>

        {/* Retain hint */}
        {!state.isEnemyTurn && hand.length > 0 && (
          <div className="text-center text-[11px] text-cyan-400/60 mb-1">
            右键/长按保留卡牌 📌
          </div>
        )}

        {/* Hand of cards */}
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
