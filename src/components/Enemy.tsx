import React, { useState, useEffect, useRef } from 'react';
import type { EnemyInstance, StatusEffect } from '../types/game';

interface EnemyProps {
  enemy: EnemyInstance;
  index: number;
  isTargetable: boolean;
  isSelected: boolean;
  onTarget: (index: number) => void;
}

/** Intent icon mapping with enhanced colors and larger icons */
const INTENT_ICONS: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  attack: { icon: '⚔️', color: 'text-red-400', bg: 'bg-red-900/50', border: 'border-red-500/60' },
  defend: { icon: '🛡️', color: 'text-blue-400', bg: 'bg-blue-900/50', border: 'border-blue-500/60' },
  buff: { icon: '⬆️', color: 'text-yellow-400', bg: 'bg-yellow-900/50', border: 'border-yellow-500/60' },
  heal: { icon: '💚', color: 'text-green-400', bg: 'bg-green-900/50', border: 'border-green-500/60' },
  summon: { icon: '💀', color: 'text-gray-300', bg: 'bg-gray-800/50', border: 'border-gray-600/60' },
};

/** Helper: get total value for a specific status effect type */
function getStatusValue(statusEffects: StatusEffect[], type: string): number {
  return statusEffects
    .filter(s => s.type === type)
    .reduce((sum, s) => sum + s.value, 0);
}

/** Floating number display types */
type FloatType = 'damage' | 'heal' | 'armor' | 'poison' | 'burn';

interface FloatingEntry {
  id: number;
  value: number;
  type: FloatType;
}

const Enemy: React.FC<EnemyProps> = ({ enemy, index, isTargetable, isSelected, onTarget }) => {
  const hpPercent = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
  const intentInfo = INTENT_ICONS[enemy.intent.type] || INTENT_ICONS.attack;

  const poisonStacks = getStatusValue(enemy.statusEffects, 'poison');
  const burnStacks = getStatusValue(enemy.statusEffects, 'burn');
  const freezeStacks = getStatusValue(enemy.statusEffects, 'freeze');

  // Floating numbers state
  const [floats, setFloats] = useState<FloatingEntry[]>([]);
  const prevPoisonRef = useRef(poisonStacks);

  // When enemy takes damage or gains armor/heal, show floating numbers
  useEffect(() => {
    const newFloats: FloatingEntry[] = [];

    if (enemy.lastDamageDealt > 0) {
      newFloats.push({ id: Date.now(), value: enemy.lastDamageDealt, type: 'damage' });
    }
    if (enemy.lastArmorGained > 0) {
      newFloats.push({ id: Date.now() + 1, value: enemy.lastArmorGained, type: 'armor' });
    }
    if (enemy.lastHealReceived > 0) {
      newFloats.push({ id: Date.now() + 2, value: enemy.lastHealReceived, type: 'heal' });
    }

    if (newFloats.length > 0) {
      setFloats(prev => [...prev, ...newFloats]);
      // Clean up after animation
      const timer = setTimeout(() => {
        setFloats(prev => prev.filter(f => !newFloats.find(nf => nf.id === f.id)));
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [enemy.lastDamageDealt, enemy.lastArmorGained, enemy.lastHealReceived]);

  // Show floating numbers for poison ticks (only when stacks decrease from being applied)
  useEffect(() => {
    if (poisonStacks > 0 && poisonStacks !== prevPoisonRef.current) {
      prevPoisonRef.current = poisonStacks;
      const entry: FloatingEntry = { id: Date.now(), value: poisonStacks, type: 'poison' };
      setFloats(prev => [...prev, entry]);
      const timer = setTimeout(() => {
        setFloats(prev => prev.filter(f => f.id !== entry.id));
      }, 900);
      return () => clearTimeout(timer);
    }
    prevPoisonRef.current = poisonStacks;
  }, [poisonStacks]);

  const getFloatStyle = (type: FloatType) => {
    switch (type) {
      case 'damage': return 'text-red-400 animate-float-up font-bold';
      case 'heal': return 'text-green-400 animate-float-up-green font-bold';
      case 'armor': return 'text-blue-400 animate-float-up-blue font-bold';
      case 'poison': return 'text-purple-400 animate-float-up-purple font-bold';
      case 'burn': return 'text-orange-400 animate-float-up font-bold';
    }
  };

  const getFloatPrefix = (type: FloatType) => {
    switch (type) {
      case 'damage': return '-';
      case 'heal': return '+';
      case 'armor': return '🛡️ +';
      case 'poison': return '🧪 ';
      case 'burn': return '🔥 ';
    }
  };

  return (
    <div
      onClick={isTargetable ? () => onTarget(index) : undefined}
      className={`
        relative flex flex-col items-center p-3 sm:p-4 rounded-xl
        bg-gradient-to-b from-gray-800/60 to-gray-900/80
        border-2 transition-all duration-300 touch-target overflow-hidden
        ${enemy.isHit ? 'animate-enemy-hit border-rune-red brightness-125' : 'border-gray-700/50'}
        ${isTargetable ? 'cursor-pointer hover:border-rune-gold hover:bg-gray-800/80 active:bg-gray-700/80 active:scale-95' : ''}
        ${isSelected ? 'border-rune-gold ring-2 ring-rune-gold/50 bg-gray-800/80' : ''}
        ${!isTargetable ? 'cursor-default' : ''}
      `}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 30% 40%, rgba(255,255,255,0.8) 1px, transparent 1px),
          radial-gradient(circle at 70% 60%, rgba(255,255,255,0.6) 1px, transparent 1px),
          radial-gradient(circle at 50% 20%, rgba(255,255,255,0.4) 1px, transparent 1px)`,
        backgroundSize: '24px 24px, 32px 32px, 20px 20px',
      }} />
      {/* Floating damage/heal/armor/status numbers */}
      {floats.map(f => (
        <div
          key={f.id}
          className={`
            absolute -top-2 left-1/2 -translate-x-1/2
            text-lg sm:text-xl font-bold pointer-events-none z-20 drop-shadow-lg
            ${getFloatStyle(f.type)}
          `}
        >
          {getFloatPrefix(f.type)}{f.value}
        </div>
      ))}

      {/* Hit flash overlay */}
      {enemy.isHit && (
        <div className="absolute inset-0 rounded-xl bg-red-500/20 pointer-events-none z-5 animate-damage-flash" />
      )}

      {/* Freeze overlay */}
      {enemy.isFrozen && (
        <div className="absolute inset-0 rounded-xl bg-cyan-400/20 border-2 border-cyan-400/40 pointer-events-none z-10">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl sm:text-2xl animate-pulse">❄️</span>
          </div>
        </div>
      )}

      {/* Intent indicator - enhanced with color-coded backgrounds */}
      <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1 rounded-lg border ${intentInfo.bg} ${intentInfo.border} animate-enemy-intent whitespace-nowrap mb-0.5 sm:mb-1`}>
        <span className="text-sm sm:text-base">{intentInfo.icon}</span>
        <span className={`text-[12px] sm:text-sm font-bold ${intentInfo.color}`}>
          {enemy.intent.type === 'buff' ? `+${enemy.intent.value}` : enemy.intent.value}
        </span>
      </div>

      {/* Enemy emoji/avatar with dynamic glow based on HP */}
      <div
        className={`text-6xl sm:text-7xl mb-1 sm:mb-2 ${enemy.isFrozen ? 'opacity-60' : 'animate-float'}`}
        style={{
          animationDelay: `${index * 0.5}s`,
          filter: `drop-shadow(0 0 ${8 + (100 - hpPercent) * 0.12}px rgba(${hpPercent > 30 ? '255,100,100' : '255,50,50'},${0.3 + (100 - hpPercent) * 0.005}))`,
        }}
      >
        {enemy.emoji}
      </div>

      {/* Enemy name */}
      <h3 className="text-[12px] sm:text-sm font-bold text-gray-200 mb-0.5 sm:mb-1 fantasy-text">{enemy.name}</h3>

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
      <div className="w-full max-w-[100px] sm:max-w-[130px] mb-0.5 sm:mb-1">
        <div className="h-2 sm:h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              hpPercent > 30 ? 'enemy-hp-bar' : 'hp-bar-low'
            }`}
            style={{ width: `${hpPercent}%`, transition: 'width 0.5s ease-out' }}
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
