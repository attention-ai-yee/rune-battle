import React from 'react';
import type { PlayerState, StatusEffect } from '../types/game';

interface PlayerProps {
  player: PlayerState;
  deckSize: number;
  discardSize: number;
  playerStrength: number;
  potions: number;
}

/** Helper: get total value for a specific status effect type */
function getStatusValue(statusEffects: StatusEffect[], type: string): number {
  return statusEffects
    .filter(s => s.type === type)
    .reduce((sum, s) => sum + s.value, 0);
}

const Player: React.FC<PlayerProps> = ({ player, deckSize, discardSize, playerStrength, potions }) => {
  const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
  const isLowHp = hpPercent <= 30;

  const poisonStacks = getStatusValue(player.statusEffects, 'poison');
  const burnStacks = getStatusValue(player.statusEffects, 'burn');
  const freezeStacks = getStatusValue(player.statusEffects, 'freeze');

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-gradient-to-r from-gray-900/80 via-gray-800/60 to-gray-900/80 rounded-xl border border-gray-700/40">
      {/* Player avatar */}
      <div className="text-3xl">🧙</div>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        {/* Name */}
        <div className="text-sm font-bold text-rune-gold mb-1">冒险者</div>

        {/* HP Bar */}
        <div className="mb-1">
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isLowHp ? 'hp-bar-low' : 'hp-bar'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className={`text-xs font-bold ${isLowHp ? 'text-rune-red' : 'text-rune-green'}`}>
              ❤️ {player.hp}/{player.maxHp}
            </span>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-3 text-xs">
          {player.armor > 0 && (
            <span className="text-rune-blue font-bold">
              🛡️ {player.armor}
            </span>
          )}
          {playerStrength > 0 && (
            <span className="text-orange-300 font-bold">
              💪 {playerStrength}
            </span>
          )}
          {/* Player status effects */}
          {poisonStacks > 0 && (
            <span className="text-green-400 font-bold">
              🧪 {poisonStacks}
            </span>
          )}
          {burnStacks > 0 && (
            <span className="text-orange-400 font-bold">
              🔥 {burnStacks}
            </span>
          )}
          {freezeStacks > 0 && (
            <span className="text-cyan-400 font-bold">
              ❄️ {freezeStacks}
            </span>
          )}
          <span className="text-gray-500">
            📚 牌库 {deckSize}
          </span>
          <span className="text-gray-500">
            🗑️ 弃牌 {discardSize}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Player;
