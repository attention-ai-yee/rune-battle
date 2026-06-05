import React from 'react';
import type { PlayerState, StatusEffect } from '../types/game';
import { Heart, ShieldAlert, Zap, Wind, Droplets, Flame, Snowflake, Target, Brain, Layers, Trash2, Eye } from 'lucide-react';

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

const PlayerAvatar: React.FC = () => (
  <div className="relative w-12 h-12 sm:w-14 sm:h-14">
    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-600/40 to-blue-600/40 border-2 border-purple-400/40" />
    <div className="absolute inset-[3px] rounded-full bg-gradient-to-b from-gray-700 to-gray-900 flex items-center justify-center">
      <Eye size={20} className="text-purple-300/70" />
    </div>
  </div>
);

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
      className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl border border-gray-700/30"
      style={{ background: 'linear-gradient(135deg, rgba(14,14,36,0.9), rgba(8,8,24,0.95))' }}
    >
      {/* Avatar */}
      <div className="relative">
        <PlayerAvatar />
        {isCritical && <div className="absolute inset-0 animate-pulse bg-red-500/20 rounded-full blur-md" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-xs sm:text-sm font-black text-amber-400 mb-1 tracking-wider" style={{ textShadow: '0 0 10px rgba(212,164,76,0.3)' }}>
          冒险者
        </div>

        {/* HP Bar */}
        <div className="mb-1.5">
          <div className="h-2.5 sm:h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700/40 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isCritical ? 'hp-bar-low animate-pulse' : isLowHp ? 'hp-bar-low' : 'hp-bar'}`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Heart size={10} className={`${isCritical ? 'text-red-400 animate-pulse' : isLowHp ? 'text-red-400' : 'text-green-400'}`} fill="currentColor" />
            <span className={`text-[10px] sm:text-xs font-bold ${isCritical ? 'text-red-400' : isLowHp ? 'text-red-400' : 'text-green-400'}`}>
              {player.hp}/{player.maxHp}
            </span>
          </div>
        </div>

        {/* Status effects */}
        <div className="flex items-center gap-1 flex-wrap">
          {player.armor > 0 && (
            <span className="status-badge status-freeze text-[9px]"><ShieldAlert size={10} /> {player.armor}</span>
          )}
          {playerStrength > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-900/30 border border-orange-500/30 rounded text-[9px] text-orange-400 font-bold">
              <Zap size={10} /> {playerStrength}
            </span>
          )}
          {player.thorns > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-900/30 border border-green-500/30 rounded text-[9px] text-green-400 font-bold">
              <Wind size={10} /> {player.thorns}
            </span>
          )}
          {poisonStacks > 0 && <span className="status-badge status-poison text-[9px]"><Droplets size={9} /> {poisonStacks}</span>}
          {burnStacks > 0 && <span className="status-badge status-burn text-[9px]"><Flame size={9} /> {burnStacks}</span>}
          {freezeStacks > 0 && <span className="status-badge status-freeze text-[9px]"><Snowflake size={9} /> {freezeStacks}</span>}
          {vulnerableStacks > 0 && <span className="status-badge status-vulnerable text-[9px]"><Target size={9} /> {vulnerableStacks}</span>}
          {weakStacks > 0 && <span className="status-badge status-weak text-[9px]"><Brain size={9} /> {weakStacks}</span>}

          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-800/50 border border-gray-600/30 rounded text-[9px] text-gray-500">
            <Layers size={9} /> {deckSize}
          </span>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-800/50 border border-gray-600/30 rounded text-[9px] text-gray-500">
            <Trash2 size={9} /> {discardSize}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Player;
