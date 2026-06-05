import React, { useState, useEffect, useRef } from 'react';
import type { EnemyInstance, StatusEffect } from '../types/game';
import { Swords, Shield, ArrowUp, HeartPulse, Skull, Droplets, Flame, Snowflake, Target, Brain, Zap, ShieldAlert } from 'lucide-react';

// Game-icons imports
import WolfHead from '@iconify-icons/game-icons/wolf-head';
import Direwolf from '@iconify-icons/game-icons/direwolf';
import FloatingGhost from '@iconify-icons/game-icons/floating-ghost';
import GoblinHead from '@iconify-icons/game-icons/goblin-head';
import Skeleton from '@iconify-icons/game-icons/skeleton';
import Imp from '@iconify-icons/game-icons/imp';
import WizardFace from '@iconify-icons/game-icons/wizard-face';
import BlackKnightHelm from '@iconify-icons/game-icons/black-knight-helm';
import RockGolem from '@iconify-icons/game-icons/rock-golem';
import Necromancer from '@iconify-icons/game-icons/raise-skeleton';
import DragonHead from '@iconify-icons/game-icons/dragon-head';
import DoubleDragon from '@iconify-icons/game-icons/double-dragon';
import SpikedDragonHead from '@iconify-icons/game-icons/spiked-dragon-head';
import HornedReptile from '@iconify-icons/game-icons/horned-reptile';
import Ogre from '@iconify-icons/game-icons/ogre';
import Troll from '@iconify-icons/game-icons/troll';
import OrcHead from '@iconify-icons/game-icons/orc-head';
import WitchFace from '@iconify-icons/game-icons/witch-face';
import FemaleVampire from '@iconify-icons/game-icons/female-vampire';
import BeastEye from '@iconify-icons/game-icons/beast-eye';

interface EnemyProps {
  enemy: EnemyInstance;
  index: number;
  isTargetable: boolean;
  isSelected: boolean;
  onTarget: (index: number) => void;
}

// Icon component that renders game-icons SVG
const GameIcon: React.FC<{ icon: any; size?: number; className?: string; color?: string }> = ({ icon, size = 64, className = '', color }) => {
  const svg = icon.body;
  return (
    <svg
      viewBox={icon.viewBox || '0 0 512 512'}
      width={size}
      height={size}
      className={className}
      fill={color || 'currentColor'}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

// Map enemy templateId to game-icons
const ENEMY_ICON_MAP: Record<string, { icon: any; color: string; glow: string }> = {
  // Layer 1 - Forest
  wolf: { icon: WolfHead, color: '#9ca3af', glow: 'rgba(156,163,175,0.4)' },
  forest_spirit: { icon: FloatingGhost, color: '#34d399', glow: 'rgba(52,211,153,0.4)' },
  goblin: { icon: GoblinHead, color: '#22c55e', glow: 'rgba(34,197,94,0.4)' },
  skeleton: { icon: Skeleton, color: '#d1d5db', glow: 'rgba(209,213,219,0.3)' },

  // Layer 2 - Volcano
  fire_imp: { icon: Imp, color: '#f97316', glow: 'rgba(249,115,22,0.4)' },
  fire_mage: { icon: WizardFace, color: '#ef4444', glow: 'rgba(239,68,68,0.4)' },
  shadow_priest: { icon: WitchFace, color: '#a855f7', glow: 'rgba(168,85,247,0.4)' },
  shadow_knight: { icon: BlackKnightHelm, color: '#6b7280', glow: 'rgba(107,114,128,0.4)' },
  lava_golem: { icon: RockGolem, color: '#f97316', glow: 'rgba(249,115,22,0.5)' },
  necromancer: { icon: Necromancer, color: '#7c3aed', glow: 'rgba(124,58,237,0.4)' },

  // Layer 3 - Dragon
  drake: { icon: HornedReptile, color: '#ef4444', glow: 'rgba(239,68,68,0.4)' },
  dragon_guardian: { icon: DragonHead, color: '#f97316', glow: 'rgba(249,115,22,0.5)' },
  ancient_dragon: { icon: DoubleDragon, color: '#dc2626', glow: 'rgba(220,38,38,0.5)' },
  whelp: { icon: SpikedDragonHead, color: '#f97316', glow: 'rgba(249,115,22,0.3)' },

  // Fallback
  default: { icon: BeastEye, color: '#ef4444', glow: 'rgba(239,68,68,0.4)' },
};

const INTENT_CONFIG: Record<string, { Icon: React.FC<{size?:number;className?:string}>; color: string; bg: string; border: string }> = {
  attack: { Icon: Swords, color: 'text-red-400', bg: 'bg-red-900/50', border: 'border-red-500/60' },
  defend: { Icon: Shield, color: 'text-blue-400', bg: 'bg-blue-900/50', border: 'border-blue-500/60' },
  buff: { Icon: ArrowUp, color: 'text-yellow-400', bg: 'bg-yellow-900/50', border: 'border-yellow-500/60' },
  heal: { Icon: HeartPulse, color: 'text-green-400', bg: 'bg-green-900/50', border: 'border-green-500/60' },
  summon: { Icon: Skull, color: 'text-gray-300', bg: 'bg-gray-800/50', border: 'border-gray-600/60' },
};

function getStatusValue(statusEffects: StatusEffect[], type: string): number {
  return statusEffects.filter(s => s.type === type).reduce((sum, s) => sum + s.value, 0);
}

type FloatType = 'damage' | 'heal' | 'armor' | 'poison' | 'burn';

interface FloatingEntry {
  id: number;
  value: number;
  type: FloatType;
}

const Enemy: React.FC<EnemyProps> = ({ enemy, index, isTargetable, isSelected, onTarget }) => {
  const hpPercent = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
  const isLowHp = hpPercent <= 30;
  const isCritical = hpPercent <= 15;
  const intentConfig = INTENT_CONFIG[enemy.intent.type] || INTENT_CONFIG.attack;
  const IntentIcon = intentConfig.Icon;

  const poisonStacks = getStatusValue(enemy.statusEffects, 'poison');
  const burnStacks = getStatusValue(enemy.statusEffects, 'burn');
  const freezeStacks = getStatusValue(enemy.statusEffects, 'freeze');
  const vulnerableStacks = getStatusValue(enemy.statusEffects, 'vulnerable');
  const weakStacks = getStatusValue(enemy.statusEffects, 'weak');

  const [floats, setFloats] = useState<FloatingEntry[]>([]);
  const prevPoisonRef = useRef(poisonStacks);

  useEffect(() => {
    const newFloats: FloatingEntry[] = [];
    if (enemy.lastDamageDealt > 0) newFloats.push({ id: Date.now(), value: enemy.lastDamageDealt, type: 'damage' });
    if (enemy.lastArmorGained > 0) newFloats.push({ id: Date.now() + 1, value: enemy.lastArmorGained, type: 'armor' });
    if (enemy.lastHealReceived > 0) newFloats.push({ id: Date.now() + 2, value: enemy.lastHealReceived, type: 'heal' });
    if (newFloats.length > 0) {
      setFloats(prev => [...prev, ...newFloats]);
      const timer = setTimeout(() => setFloats(prev => prev.filter(f => !newFloats.find(nf => nf.id === f.id))), 1000);
      return () => clearTimeout(timer);
    }
  }, [enemy.lastDamageDealt, enemy.lastArmorGained, enemy.lastHealReceived]);

  useEffect(() => {
    if (poisonStacks > 0 && poisonStacks !== prevPoisonRef.current) {
      prevPoisonRef.current = poisonStacks;
      const entry: FloatingEntry = { id: Date.now(), value: poisonStacks, type: 'poison' };
      setFloats(prev => [...prev, entry]);
      const timer = setTimeout(() => setFloats(prev => prev.filter(f => f.id !== entry.id)), 1000);
      return () => clearTimeout(timer);
    }
    prevPoisonRef.current = poisonStacks;
  }, [poisonStacks]);

  const getFloatStyle = (type: FloatType) => {
    switch (type) {
      case 'damage': return 'text-red-400 animate-float-up text-3xl';
      case 'heal': return 'text-green-400 animate-float-up-green text-2xl';
      case 'armor': return 'text-blue-400 animate-float-up-blue text-2xl';
      case 'poison': return 'text-purple-400 animate-float-up-purple text-xl';
      case 'burn': return 'text-orange-400 animate-float-up text-xl';
    }
  };

  const getFloatPrefix = (type: FloatType) => {
    switch (type) {
      case 'damage': return '-';
      case 'heal': return '+';
      case 'armor': return '+';
      case 'poison': return '';
      case 'burn': return '';
    }
  };

  // Get enemy icon config
  const iconConfig = ENEMY_ICON_MAP[enemy.templateId] || ENEMY_ICON_MAP.default;

  return (
    <div
      onClick={isTargetable ? () => onTarget(index) : undefined}
      className={`
        relative flex flex-col items-center p-4 sm:p-6 rounded-2xl
        border-2 transition-all duration-300 overflow-hidden
        ${enemy.isHit ? 'animate-enemy-hit border-red-500' : 'border-gray-700/30'}
        ${isTargetable ? 'cursor-pointer hover:border-amber-400/60 hover:scale-105 active:scale-95' : ''}
        ${isSelected ? 'border-amber-400 ring-2 ring-amber-400/40' : ''}
        ${!isTargetable && !isSelected ? 'cursor-default' : ''}
        ${isCritical ? 'border-red-500/50' : isLowHp ? 'border-orange-500/30' : ''}
        enemy-enter
      `}
      style={{
        animationDelay: `${index * 200}ms`,
        background: 'linear-gradient(180deg, rgba(20,20,40,0.8) 0%, rgba(12,12,30,0.9) 100%)',
      }}
    >
      {/* Enemy platform glow */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-3/4 h-6 rounded-full blur-lg" style={{ background: `linear-gradient(to top, ${iconConfig.glow}, transparent)` }} />

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, rgba(168,85,247,0.8) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }} />

      {/* Floating numbers */}
      {floats.map(f => (
        <div
          key={f.id}
          className={`absolute -top-4 left-1/2 -translate-x-1/2 pointer-events-none z-20 font-black ${getFloatStyle(f.type)}`}
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 15px currentColor' }}
        >
          {getFloatPrefix(f.type)}{f.value}
        </div>
      ))}

      {/* Hit flash */}
      {enemy.isHit && (
        <div className="absolute inset-0 rounded-2xl bg-red-500/30 pointer-events-none z-5 animate-damage-flash" />
      )}

      {/* Freeze overlay */}
      {enemy.isFrozen && (
        <div className="absolute inset-0 rounded-2xl bg-cyan-400/10 border-2 border-cyan-400/30 pointer-events-none z-10 backdrop-blur-[2px]">
          <div className="absolute inset-0 flex items-center justify-center">
            <Snowflake size={40} className="text-cyan-300/60 animate-pulse" />
          </div>
        </div>
      )}

      {/* Vulnerable glow */}
      {vulnerableStacks > 0 && (
        <div className="absolute inset-0 rounded-2xl border-2 border-yellow-400/25 pointer-events-none z-5 animate-glow-pulse" />
      )}

      {/* Intent */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${intentConfig.bg} ${intentConfig.border} animate-enemy-intent mb-3 shadow-lg`}>
        <IntentIcon size={16} className={intentConfig.color} />
        <span className={`text-sm font-black ${intentConfig.color}`}>
          {enemy.intent.type === 'buff' ? `+${enemy.intent.value}` : enemy.intent.value}
        </span>
      </div>

      {/* Enemy art - professional game-icons */}
      <div
        className={`mb-3 ${enemy.isFrozen ? 'opacity-40' : 'animate-float-slow'} ${isCritical ? 'animate-pulse' : ''}`}
        style={{
          animationDelay: `${index * 0.7}s`,
          filter: `drop-shadow(0 0 ${15 + (100 - hpPercent) * 0.2}px ${iconConfig.glow})`,
          color: iconConfig.color,
        }}
      >
        <GameIcon icon={iconConfig.icon} size={70} />
      </div>

      {/* Name */}
      <h3 className="text-sm sm:text-base font-black text-gray-100 mb-2 tracking-wider" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
        {enemy.name}
      </h3>

      {/* Status effects */}
      {enemy.statusEffects.length > 0 && (
        <div className="flex items-center gap-1 mb-2 flex-wrap justify-center max-w-[160px]">
          {poisonStacks > 0 && <span className="status-badge status-poison"><Droplets size={10} /> {poisonStacks}</span>}
          {burnStacks > 0 && <span className="status-badge status-burn"><Flame size={10} /> {burnStacks}</span>}
          {freezeStacks > 0 && <span className="status-badge status-freeze"><Snowflake size={10} /> {freezeStacks}</span>}
          {vulnerableStacks > 0 && <span className="status-badge status-vulnerable"><Target size={10} /> {vulnerableStacks}</span>}
          {weakStacks > 0 && <span className="status-badge status-weak"><Brain size={10} /> {weakStacks}</span>}
        </div>
      )}

      {/* Strength */}
      {enemy.strength > 0 && (
        <div className="flex items-center gap-1 mb-2 px-2 py-0.5 bg-orange-900/30 rounded-full border border-orange-500/30">
          <Zap size={12} className="text-orange-400" />
          <span className="text-xs text-orange-400 font-bold">+{enemy.strength}</span>
        </div>
      )}

      {/* HP Bar */}
      <div className="w-full max-w-[140px] sm:max-w-[160px] mb-2">
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700/40 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isLowHp ? 'hp-bar-low' : 'enemy-hp-bar'}`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
        <div className="text-center mt-0.5">
          <span className={`text-[10px] font-bold ${isCritical ? 'text-red-400 animate-pulse' : isLowHp ? 'text-orange-400' : 'text-gray-400'}`}>
            {enemy.hp} / {enemy.maxHp}
          </span>
        </div>
      </div>

      {/* Armor */}
      {enemy.armor > 0 && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-900/30 rounded-full border border-blue-500/30">
          <ShieldAlert size={12} className="text-blue-400" />
          <span className="text-xs text-blue-400 font-bold">{enemy.armor}</span>
        </div>
      )}

      {/* Target indicator */}
      {isTargetable && (
        <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/40 animate-glow-pulse pointer-events-none" />
      )}
    </div>
  );
};

export default Enemy;
