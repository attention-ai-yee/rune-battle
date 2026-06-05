import React from 'react';
import {
  Swords, Shield, Sparkles, Scroll, Skull, Crown, Gem,
  Flame, Snowflake, Target, Zap, Heart, Droplets,
  Coins, FlaskConical, Layers, Trash2, Lightbulb, Clock,
  Map, Pin, Check, Lock, ChevronDown, ChevronRight,
  Volume2, VolumeX, Trophy, AlertTriangle, Star,
  ArrowUp, HeartPulse, ShieldAlert, Brain, Wind,
  Sword, CircleDot, Eye, Footprints, Package,
  type LucideIcon,
} from 'lucide-react';

// ===== Card Type Icons =====
export const AttackIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <Swords size={size} className={className} />
);

export const DefenseIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <Shield size={size} className={className} />
);

export const SpellIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <Sparkles size={size} className={className} />
);

export const GenericIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <Scroll size={size} className={className} />
);

// ===== Status Effect Icons =====
export const PoisonIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <Droplets size={size} className={className} />
);

export const BurnIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <Flame size={size} className={className} />
);

export const FreezeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <Snowflake size={size} className={className} />
);

export const VulnerableIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <Target size={size} className={className} />
);

export const WeakIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <Brain size={size} className={className} />
);

export const StrengthIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <Zap size={size} className={className} />
);

export const ThornsIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <Wind size={size} className={className} />
);

// ===== Player Icons =====
export const PlayerAvatar: React.FC<{ size?: number; className?: string }> = ({ size = 40, className = '' }) => (
  <div className={`relative ${className}`} style={{ width: size, height: size }}>
    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-600/40 to-blue-600/40 border-2 border-purple-400/40" />
    <div className="absolute inset-[3px] rounded-full bg-gradient-to-b from-gray-700 to-gray-900 flex items-center justify-center">
      <Eye size={size * 0.4} className="text-purple-300/80" />
    </div>
  </div>
);

export const HeartIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <Heart size={size} className={className} fill="currentColor" />
);

export const ArmorIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <ShieldAlert size={size} className={className} />
);

// ===== Game UI Icons =====
export const GoldIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <Coins size={size} className={className} />
);

export const PotionIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <FlaskConical size={size} className={className} />
);

export const DeckIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <Layers size={size} className={className} />
);

export const DrawPileIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <Layers size={size} className={className} />
);

export const DiscardIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <Trash2 size={size} className={className} />
);

export const ExhaustIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <Wind size={size} className={className} />
);

export const HintIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <CircleDot size={size} className={className} />
);

export const WaitingIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <Clock size={size} className={className} />
);

export const RetainIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <Pin size={size} className={className} />
);

// ===== Map Icons =====
export const MapBattleIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <Swords size={size} className={className} />
);

export const MapEliteIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <Skull size={size} className={className} />
);

export const MapShopIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <Package size={size} className={className} />
);

export const MapEventIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <Gem size={size} className={className} />
);

export const MapRestIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <HeartPulse size={size} className={className} />
);

export const MapIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <Map size={size} className={className} />
);

export const CompletedIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <Check size={size} className={className} />
);

export const LockedIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <Lock size={size} className={className} />
);

// ===== Layer Icons =====
export const ForestIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <Footprints size={size} className={className} />
);

export const VolcanoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <Flame size={size} className={className} />
);

export const DragonIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <Skull size={size} className={className} />
);

// ===== Screen Decorations =====
export const CrystalOrb: React.FC<{ size?: number; className?: string }> = ({ size = 80, className = '' }) => (
  <div className={`relative ${className}`} style={{ width: size, height: size }}>
    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/30 via-blue-500/20 to-purple-600/30 border-2 border-purple-400/40 animate-pulse-glow" />
    <div className="absolute inset-[6px] rounded-full bg-gradient-to-br from-purple-900/80 to-blue-900/80 border border-purple-500/20" />
    <div className="absolute inset-[12px] rounded-full bg-gradient-to-br from-purple-600/20 to-transparent flex items-center justify-center">
      <Gem size={size * 0.3} className="text-purple-300/60 animate-pulse" />
    </div>
    <div className="absolute top-[15%] left-[20%] w-[20%] h-[20%] rounded-full bg-white/10 blur-sm" />
  </div>
);

export const SkullIcon: React.FC<{ size?: number; className?: string }> = ({ size = 80, className = '' }) => (
  <div className={`relative ${className}`} style={{ width: size, height: size }}>
    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-900/40 to-red-950/60 border-2 border-red-500/30" />
    <div className="absolute inset-[8px] flex items-center justify-center">
      <Skull size={size * 0.5} className="text-red-400/80" />
    </div>
  </div>
);

export const CrownIcon: React.FC<{ size?: number; className?: string }> = ({ size = 80, className = '' }) => (
  <div className={`relative ${className}`} style={{ width: size, height: size }}>
    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-600/20 border-2 border-amber-400/30" />
    <div className="absolute inset-[8px] flex items-center justify-center">
      <Crown size={size * 0.5} className="text-amber-400/80" />
    </div>
  </div>
);

export const BattleWinIcon: React.FC<{ size?: number; className?: string }> = ({ size = 60, className = '' }) => (
  <div className={`relative ${className}`} style={{ width: size, height: size }}>
    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-600/20 border-2 border-amber-400/30" />
    <div className="absolute inset-[6px] flex items-center justify-center">
      <Trophy size={size * 0.5} className="text-amber-400/80" />
    </div>
  </div>
);

export const RewardIcon: React.FC<{ size?: number; className?: string }> = ({ size = 40, className = '' }) => (
  <div className={`relative ${className}`} style={{ width: size, height: size }}>
    <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-600/20 border border-amber-400/30" />
    <div className="absolute inset-[4px] flex items-center justify-center">
      <Gem size={size * 0.5} className="text-amber-400/80" />
    </div>
  </div>
);

export const WarningIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <AlertTriangle size={size} className={className} />
);

export const UpgradeStar: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <Star size={size} className={className} fill="currentColor" />
);

// ===== Mute Button =====
export const SoundOnIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <Volume2 size={size} className={className} />
);

export const SoundOffIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <VolumeX size={size} className={className} />
);

// ===== Intent Icons =====
export const IntentAttackIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <Swords size={size} className={className} />
);

export const IntentDefendIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <Shield size={size} className={className} />
);

export const IntentBuffIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <ArrowUp size={size} className={className} />
);

export const IntentHealIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <HeartPulse size={size} className={className} />
);

export const IntentSummonIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <Skull size={size} className={className} />
);

// ===== Chevron =====
export const ChevronDownIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <ChevronDown size={size} className={className} />
);

export const ChevronRightIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <ChevronRight size={size} className={className} />
);

// ===== Close =====
export const CloseIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <span className={`text-lg font-bold ${className}`}>×</span>
);

// ===== Card type icon resolver =====
export const getCardTypeIcon = (type: string): LucideIcon => {
  switch (type) {
    case 'attack': return Swords;
    case 'defense': return Shield;
    case 'spell': return Sparkles;
    default: return Scroll;
  }
};

// ===== Map node icon resolver =====
export const getMapNodeIcon = (type: string): LucideIcon => {
  switch (type) {
    case 'battle': return Swords;
    case 'elite': return Skull;
    case 'shop': return Package;
    case 'event': return Gem;
    case 'rest': return HeartPulse;
    default: return CircleDot;
  }
};
