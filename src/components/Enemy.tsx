import React, { useState, useEffect, useRef } from 'react';
import type { EnemyInstance, StatusEffect } from '../types/game';
import { Swords, Shield, ArrowUp, HeartPulse, Skull, Droplets, Flame, Snowflake, Target, Brain, Zap, ShieldAlert } from 'lucide-react';

interface EnemyProps {
  enemy: EnemyInstance;
  index: number;
  isTargetable: boolean;
  isSelected: boolean;
  onTarget: (index: number) => void;
}

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

// CSS-drawn enemy art based on templateId
const EnemyArt: React.FC<{ templateId: string; size?: number }> = ({ templateId, size = 80 }) => {
  // Different visual styles for different enemy types
  const getEnemyStyle = () => {
    if (templateId.includes('wolf') || templateId.includes('drake')) {
      return { shape: 'beast', color1: '#ef4444', color2: '#991b1b', accent: '#fca5a5' };
    }
    if (templateId.includes('spirit') || templateId.includes('priest') || templateId.includes('mage')) {
      return { shape: 'magic', color1: '#a855f7', color2: '#6b21a8', accent: '#d8b4fe' };
    }
    if (templateId.includes('skeleton') || templateId.includes('knight') || templateId.includes('guardian')) {
      return { shape: 'knight', color1: '#6b7280', color2: '#374151', accent: '#d1d5db' };
    }
    if (templateId.includes('goblin') || templateId.includes('imp')) {
      return { shape: 'goblin', color1: '#22c55e', color2: '#14532d', accent: '#86efac' };
    }
    if (templateId.includes('dragon') || templateId.includes('golem')) {
      return { shape: 'dragon', color1: '#f97316', color2: '#7c2d12', accent: '#fdba74' };
    }
    if (templateId.includes('necro') || templateId.includes('shadow')) {
      return { shape: 'undead', color1: '#7c3aed', color2: '#3b0764', accent: '#c4b5fd' };
    }
    return { shape: 'default', color1: '#ef4444', color2: '#991b1b', accent: '#fca5a5' };
  };

  const style = getEnemyStyle();

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Base glow */}
      <div className="absolute inset-0 rounded-full opacity-30 blur-xl" style={{ background: style.color1 }} />

      {/* Body */}
      {style.shape === 'beast' && (
        <>
          <div className="absolute inset-[10%] rounded-full border-2 opacity-60" style={{ borderColor: style.color1, background: `linear-gradient(135deg, ${style.color2}, ${style.color1}40)` }} />
          <div className="absolute top-[20%] left-[25%] w-[15%] h-[15%] rounded-full" style={{ background: style.accent }} />
          <div className="absolute top-[20%] right-[25%] w-[15%] h-[15%] rounded-full" style={{ background: style.accent }} />
          <div className="absolute top-[45%] left-[35%] w-[30%] h-[8%] rounded-full" style={{ background: style.color1, opacity: 0.6 }} />
        </>
      )}
      {style.shape === 'magic' && (
        <>
          <div className="absolute inset-[15%] rotate-45 border-2 opacity-50" style={{ borderColor: style.color1, background: `linear-gradient(135deg, ${style.color2}, ${style.color1}30)` }} />
          <div className="absolute inset-[30%] rounded-full border opacity-40" style={{ borderColor: style.accent }} />
          <div className="absolute inset-[40%] rounded-full opacity-60" style={{ background: `radial-gradient(circle, ${style.accent}, transparent)` }} />
        </>
      )}
      {style.shape === 'knight' && (
        <>
          <div className="absolute inset-[10%] rounded-t-full border-2 opacity-60" style={{ borderColor: style.color1, background: `linear-gradient(180deg, ${style.color2}, ${style.color1}40)` }} />
          <div className="absolute top-[25%] left-[25%] w-[50%] h-[15%] rounded opacity-40" style={{ background: style.accent }} />
          <div className="absolute top-[50%] left-[30%] w-[10%] h-[10%] rounded-full" style={{ background: style.accent }} />
          <div className="absolute top-[50%] right-[30%] w-[10%] h-[10%] rounded-full" style={{ background: style.accent }} />
        </>
      )}
      {style.shape === 'goblin' && (
        <>
          <div className="absolute inset-[15%] rounded-full border-2 opacity-60" style={{ borderColor: style.color1, background: `linear-gradient(135deg, ${style.color2}, ${style.color1}30)` }} />
          <div className="absolute top-[15%] left-[15%] w-[25%] h-[25%] rounded-full border-2 opacity-70" style={{ borderColor: style.color1, background: style.color2 }} />
          <div className="absolute top-[15%] right-[15%] w-[25%] h-[25%] rounded-full border-2 opacity-70" style={{ borderColor: style.color1, background: style.color2 }} />
          <div className="absolute top-[45%] left-[30%] w-[40%] h-[10%] rounded" style={{ background: style.color1, opacity: 0.5 }} />
        </>
      )}
      {style.shape === 'dragon' && (
        <>
          <div className="absolute inset-[5%] rounded-full border-2 opacity-60" style={{ borderColor: style.color1, background: `linear-gradient(135deg, ${style.color2}, ${style.color1}40)` }} />
          <div className="absolute top-[10%] left-[10%] w-[30%] h-[30%] opacity-50" style={{ background: `linear-gradient(135deg, ${style.color1}, transparent)`, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
          <div className="absolute top-[10%] right-[10%] w-[30%] h-[30%] opacity-50" style={{ background: `linear-gradient(225deg, ${style.color1}, transparent)`, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
          <div className="absolute top-[50%] left-[35%] w-[30%] h-[8%] rounded" style={{ background: style.accent, opacity: 0.6 }} />
        </>
      )}
      {style.shape === 'undead' && (
        <>
          <div className="absolute inset-[10%] border-2 opacity-50" style={{ borderColor: style.color1, background: `linear-gradient(180deg, ${style.color2}, ${style.color1}20)` }} />
          <div className="absolute inset-[25%] rounded-full border opacity-30" style={{ borderColor: style.accent }} />
          <div className="absolute top-[35%] left-[25%] w-[12%] h-[12%] rounded-full" style={{ background: style.accent, opacity: 0.7 }} />
          <div className="absolute top-[35%] right-[25%] w-[12%] h-[12%] rounded-full" style={{ background: style.accent, opacity: 0.7 }} />
        </>
      )}
      {style.shape === 'default' && (
        <>
          <div className="absolute inset-[10%] rounded-full border-2 opacity-60" style={{ borderColor: style.color1, background: `linear-gradient(135deg, ${style.color2}, ${style.color1}40)` }} />
          <div className="absolute top-[30%] left-[30%] w-[15%] h-[15%] rounded-full" style={{ background: style.accent }} />
          <div className="absolute top-[30%] right-[30%] w-[15%] h-[15%] rounded-full" style={{ background: style.accent }} />
        </>
      )}
    </div>
  );
};

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
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-3/4 h-6 bg-gradient-to-t from-purple-500/15 to-transparent rounded-full blur-lg" />

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

      {/* Enemy art */}
      <div className={`mb-3 ${enemy.isFrozen ? 'opacity-40' : 'animate-float-slow'} ${isCritical ? 'animate-pulse' : ''}`}
        style={{
          animationDelay: `${index * 0.7}s`,
          filter: `drop-shadow(0 0 ${15 + (100 - hpPercent) * 0.2}px rgba(${isCritical ? '239,68,68' : isLowHp ? '249,115,22' : '168,85,247'},${0.5 + (100 - hpPercent) * 0.005}))`,
        }}
      >
        <EnemyArt templateId={enemy.templateId} size={70} />
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
