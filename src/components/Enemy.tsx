import React from 'react';
import type { EnemyInstance, StatusEffect } from '../types/game';

interface EnemyProps {
  enemy: EnemyInstance;
  index: number;
  isTargetable: boolean;
  isSelected: boolean;
  onTarget: (index: number) => void;
}

/** Intent icon mapping */
const INTENT_ICONS: Record<string, { icon: string; color: string }> = {
  attack: { icon: '⚔️', color: 'text-rune-red' },
  defend: { icon: '🛡️', color: 'text-rune-blue' },
  buff: { icon: '💪', color: 'text-rune-purple' },
  heal: { icon: '💚', color: 'text-green-400' },
  summon: { icon: '💀', color: 'text-gray-300' },
};

/** Helper: get total value for a specific status effect type */
function getStatusValue(statusEffects: StatusEffect[], type: string): number {
  return statusEffects
    .filter(s => s.type === type)
    .reduce((sum, s) => sum + s.value, 0);
}

const Enemy: React.FC<EnemyProps> = ({ enemy, index, isTargetable, isSelected, onTarget }) => {
  const hpPercent = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
  const intentInfo = INTENT_ICONS[enemy.intent.type] || INTENT_ICONS.attack;

  const poisonStacks = getStatusValue(enemy.statusEffects, 'poison');
  const burnStacks = getStatusValue(enemy.statusEffects, 'burn');
  const freezeStacks = getStatusValue(enemy.statusEffects, 'freeze');

  return (
    <div
      onClick={isTargetable ? () => onTarget(index) : undefined}
      className={`
        relative flex flex-col items-center p-2 sm:p-4 rounded-xl
        bg-gradient-to-b from-gray-800/60 to-gray-900/80
        border-2 transition-all duration-300 touch-target
        ${enemy.isHit ? 'animate-enemy-hit border-rune-red' : 'border-gray-700/50'}
        ${isTargetable ? 'cursor-pointer hover:border-rune-gold hover:bg-gray-800/80 active:bg-gray-700/80 active:scale-95' : ''}
        ${isSelected ? 'border-rune-gold ring-2 ring-rune-gold/50 bg-gray-800/80' : ''}
        ${!isTargetable ? 'cursor-default' : ''}
      `}
    >
      {/* Freeze overlay */}
      {enemy.isFrozen && (
        <div className="absolute inset-0 rounded-xl bg-cyan-400/20 border-2 border-cyan-400/40 pointer-events-none z-10">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl sm:text-2xl animate-pulse">❄️</span>
          </div>
        </div>
      )}

      {/* Intent indicator */}
      <div className="absolute -top-7 sm:-top-8 left-1/2 -translate-x-1/2 flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-rune-dark/90 border border-gray-700/50 animate-enemy-intent whitespace-nowrap">
        <span className="text-[11px] sm:text-xs">{intentInfo.icon}</span>
        <span className={`text-[11px] sm:text-xs font-bold ${intentInfo.color}`}>
          {enemy.intent.type === 'buff' ? `+${enemy.intent.value}` : enemy.intent.value}
        </span>
        <span className="text-[8px] sm:text-[10px] text-gray-400 hidden sm:inline">{enemy.intent.description}</span>
      </div>

      {/* Enemy emoji/avatar */}
      <div className={`text-5xl sm:text-5xl mb-0.5 sm:mb-2 ${enemy.isFrozen ? 'opacity-60' : 'animate-float'}`} style={{ animationDelay: `${index * 0.5}s` }}>
        {enemy.emoji}
      </div>

      {/* Enemy name */}
      <h3 className="text-[12px] sm:text-sm font-bold text-gray-200 mb-0.5 sm:mb-1">{enemy.name}</h3>

      {/* Status effects */}
      {enemy.statusEffects.length > 0 && (
        <div className="flex items-center gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
          {poisonStacks > 0 && (
            <span className="text-[9px] sm:text-xs bg-green-900/40 px-1 sm:px-1.5 py-0 sm:py-0.5 rounded">🧪 {poisonStacks}</span>
          )}
          {burnStacks > 0 && (
            <span className="text-[9px] sm:text-xs bg-orange-900/40 px-1 sm:px-1.5 py-0 sm:py-0.5 rounded">🔥 {burnStacks}</span>
          )}
          {freezeStacks > 0 && (
            <span className="text-[9px] sm:text-xs bg-cyan-900/40 px-1 sm:px-1.5 py-0 sm:py-0.5 rounded">❄️ {freezeStacks}</span>
          )}
        </div>
      )}

      {/* Strength indicator */}
      {enemy.strength > 0 && (
        <div className="flex items-center gap-0.5 mb-0.5 sm:mb-1">
            <span className="text-[9px] sm:text-xs">💪</span>
            <span className="text-[9px] sm:text-xs text-rune-purple font-bold">+{enemy.strength}</span>
        </div>
      )}

      {/* HP Bar */}
      <div className="w-full max-w-[90px] sm:max-w-[120px] mb-0.5 sm:mb-1">
        <div className="h-2 sm:h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              hpPercent > 30 ? 'enemy-hp-bar' : 'hp-bar-low'
            }`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
        <div className="text-center mt-0">
          <span className="text-[9px] sm:text-xs text-gray-400">
            {enemy.hp}/{enemy.maxHp}
          </span>
        </div>
      </div>

      {/* Armor indicator */}
      {enemy.armor > 0 && (
        <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5 sm:mt-1">
          <span className="text-[9px] sm:text-xs">🛡️</span>
          <span className="text-[9px] sm:text-xs text-rune-blue font-bold">{enemy.armor}</span>
        </div>
      )}

      {/* Target indicator */}
      {isTargetable && (
        <div className="absolute inset-0 rounded-xl border-2 border-rune-gold/30 animate-pulse pointer-events-none" />
      )}
    </div>
  );
};

export default Enemy;
