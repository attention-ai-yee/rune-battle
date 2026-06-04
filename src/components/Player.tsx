import React from 'react';
import type { PlayerState, StatusEffect } from '../types/game';

interface PlayerProps {
  player: PlayerState;
  deckSize: number;
  discardSize: number;
  playerStrength: number;
  potions: number;
  potionCooldown: number;
}

function getStatusValue(statusEffects: StatusEffect[], type: string): number {
  return statusEffects.filter(s => s.type === type).reduce((sum, s) => sum + s.value, 0);
}

const Player: React.FC<PlayerProps> = ({ player, deckSize, discardSize, playerStrength, potions, potionCooldown }) => {
  const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
  const isLowHp = hpPercent <= 30;
  const isCritical = hpPercent <= 15;

  const poisonStacks = getStatusValue(player.statusEffects, 'poison');
  const burnStacks = getStatusValue(player.statusEffects, 'burn');
  const freezeStacks = getStatusValue(player.statusEffects, 'freeze');
  const vulnerableStacks = getStatusValue(player.statusEffects, 'vulnerable');
  const weakStacks = getStatusValue(player.statusEffects, 'weak');

  return (
    <div
      className="flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-2 sm:py-3 rounded-2xl border border-gray-700/30"
      style={{ background: 'linear-gradient(135deg, rgba(14,14,36,0.9), rgba(8,8,24,0.95))' }}
    >
      {/* Player avatar */}
      <div className="relative">
        <div className="text-4xl sm:text-5xl drop-shadow-2xl">🧙</div>
        {isCritical && <div className="absolute inset-0 animate-pulse bg-red-500/20 rounded-full blur-md" />}
      </div>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        {/* Name */}
        <div className="text-xs sm:text-sm font-black text-amber-400 mb-1 tracking-wider" style={{ textShadow: '0 0 10px rgba(212,164,76,0.3)' }}>
          冒险者
        </div>

        {/* HP Bar */}
        <div className="mb-1.5">
          <div className="h-3 sm:h-3.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700/40 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isCritical ? 'hp-bar-low animate-pulse' : isLowHp ? 'hp-bar-low' : 'hp-bar'}`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className={`text-[10px] sm:text-xs font-bold ${isCritical ? 'text-red-400 animate-pulse' : isLowHp ? 'text-red-400' : 'text-green-400'}`}>
              ❤️ {player.hp}/{player.maxHp}
            </span>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {player.armor > 0 && (
            <span className="status-badge status-freeze text-[10px]">🛡️ {player.armor}</span>
          )}
          {playerStrength > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-900/30 border border-orange-500/30 rounded text-[10px] text-orange-400 font-bold">
              💪 {playerStrength}
            </span>
          )}
          {player.thorns > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-900/30 border border-green-500/30 rounded text-[10px] text-green-400 font-bold">
              🌿 {player.thorns}
            </span>
          )}
          {poisonStacks > 0 && <span className="status-badge status-poison text-[9px]">🧪 {poisonStacks}</span>}
          {burnStacks > 0 && <span className="status-badge status-burn text-[9px]">🔥 {burnStacks}</span>}
          {freezeStacks > 0 && <span className="status-badge status-freeze text-[9px]">❄️ {freezeStacks}</span>}
          {vulnerableStacks > 0 && <span className="status-badge status-vulnerable text-[9px]">🎯 {vulnerableStacks}</span>}
          {weakStacks > 0 && <span className="status-badge status-weak text-[9px]">😵 {weakStacks}</span>}

          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-800/50 border border-gray-600/30 rounded text-[10px] text-gray-500">
            📚 {deckSize}
          </span>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-800/50 border border-gray-600/30 rounded text-[10px] text-gray-500">
            🗑️ {discardSize}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Player;
