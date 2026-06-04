import React, { useRef, useCallback } from 'react';
import type { CardInstance, CardRarity } from '../types/game';

interface CardProps {
  card: CardInstance;
  isSelected: boolean;
  isPlayable: boolean;
  isEnemyTurn: boolean;
  onClick: () => void;
  showUpgradePreview?: boolean;
  showRetainToggle?: boolean;
  isRetained?: boolean;
  onToggleRetain?: () => void;
}

const CARD_TYPE_COLORS: Record<string, { border: string; glow: string; bg: string; text: string; badge: string; artBg: string; gradient: string }> = {
  attack: {
    border: 'border-red-500/60',
    glow: 'card-glow-red',
    bg: 'bg-gradient-to-b from-red-950/90 to-[#1a1a3e]',
    text: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400 border-red-500/40',
    artBg: 'bg-gradient-to-br from-red-900/60 via-red-950/40 to-transparent',
    gradient: 'from-red-500/20 via-transparent to-transparent',
  },
  defense: {
    border: 'border-blue-500/60',
    glow: 'card-glow-blue',
    bg: 'bg-gradient-to-b from-blue-950/90 to-[#1a1a3e]',
    text: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    artBg: 'bg-gradient-to-br from-blue-900/60 via-blue-950/40 to-transparent',
    gradient: 'from-blue-500/20 via-transparent to-transparent',
  },
  spell: {
    border: 'border-purple-500/60',
    glow: 'card-glow-purple',
    bg: 'bg-gradient-to-b from-purple-950/90 to-[#1a1a3e]',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    artBg: 'bg-gradient-to-br from-purple-900/60 via-purple-950/40 to-transparent',
    gradient: 'from-purple-500/20 via-transparent to-transparent',
  },
};

const CARD_RARITY_STYLES: Record<CardRarity, { border: string; glow: string; stars: string; bg: string }> = {
  common: { border: '', glow: '', stars: '', bg: '' },
  rare: { border: 'border-emerald-400/70', glow: 'animate-glow-rare', stars: 'text-emerald-400', bg: 'shadow-emerald-500/20' },
  epic: { border: 'border-amber-400/70', glow: 'animate-glow-epic', stars: 'text-amber-400', bg: 'shadow-amber-500/20' },
};

const CARD_RARITY_STARS: Record<CardRarity, string> = {
  common: '',
  rare: '★',
  epic: '★★',
};

const CARD_TYPE_ICONS: Record<string, string> = {
  attack: '⚔️',
  defense: '🛡️',
  spell: '✨',
};

const Card: React.FC<CardProps> = ({
  card,
  isSelected,
  isPlayable,
  isEnemyTurn,
  onClick,
  showUpgradePreview,
  showRetainToggle,
  isRetained,
  onToggleRetain,
}) => {
  const colors = CARD_TYPE_COLORS[card.type] || CARD_TYPE_COLORS.attack;
  const icon = CARD_TYPE_ICONS[card.type] || '📜';
  const rarityStyle = CARD_RARITY_STYLES[card.rarity] || CARD_RARITY_STYLES.common;
  const rarityStars = CARD_RARITY_STARS[card.rarity] || '';

  const canClick = isPlayable && !isEnemyTurn;

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (showRetainToggle && onToggleRetain) {
      e.preventDefault();
      onToggleRetain();
    }
  }, [showRetainToggle, onToggleRetain]);

  const handleTouchStart = useCallback(() => {
    longPressTriggered.current = false;
    if (showRetainToggle && onToggleRetain) {
      longPressTimer.current = setTimeout(() => {
        longPressTriggered.current = true;
        onToggleRetain();
      }, 300);
    }
  }, [showRetainToggle, onToggleRetain]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    if (canClick) onClick();
  }, [canClick, onClick]);

  const borderClass = rarityStyle.border || colors.border;
  const glowClass = rarityStyle.glow || colors.glow;
  const upgradeGlow = card.upgraded ? 'ring-2 ring-amber-400/50' : '';
  const retainGlow = isRetained ? 'ring-2 ring-cyan-400/50' : '';
  const isEpic = card.rarity === 'epic';
  const epicBorder = isEpic ? 'animate-border-epic' : '';

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`
        relative rounded-xl border-2
        ${borderClass} ${colors.bg} ${glowClass} ${epicBorder}
        transition-all duration-200 ease-out
        flex flex-col p-2 sm:p-2.5 cursor-pointer
        w-[80px] h-[112px] sm:w-[130px] sm:h-[182px]
        ${canClick ? 'hover:scale-115 hover:-translate-y-6 hover:z-20 active:scale-95' : 'opacity-50 cursor-not-allowed'}
        ${isSelected ? 'scale-115 -translate-y-6 z-20 ring-2 ring-amber-400' : ''}
        ${!canClick && !isSelected ? 'opacity-50' : ''}
        ${upgradeGlow} ${retainGlow}
        ${showUpgradePreview ? 'scale-110 ring-2 ring-amber-400/60' : ''}
      `}
      style={{
        boxShadow: canClick ? `0 4px 20px rgba(0,0,0,0.4), 0 0 15px ${card.type === 'attack' ? 'rgba(239,68,68,0.15)' : card.type === 'defense' ? 'rgba(59,130,246,0.15)' : 'rgba(168,85,247,0.15)'}` : '0 2px 10px rgba(0,0,0,0.3)',
      }}
    >
      {/* Top gradient overlay */}
      <div className={`absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b ${colors.gradient} rounded-t-xl pointer-events-none`} />

      {/* Card texture */}
      <div className="absolute inset-0 rounded-xl opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
        backgroundSize: '12px 12px',
      }} />

      {/* Cost badge */}
      <div className="absolute -top-2 -left-2 sm:-top-2.5 sm:-left-2.5 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gray-900 border-2 border-amber-400/80 flex items-center justify-center z-10 shadow-lg shadow-amber-500/20">
        <span className="text-amber-400 text-sm sm:text-base font-black">{card.cost}</span>
      </div>

      {/* Type badge */}
      <div className={`absolute -top-2 -right-2 sm:-top-2.5 sm:-right-2.5 px-1.5 sm:px-2 py-0.5 rounded-lg text-xs sm:text-sm font-bold ${colors.badge} border z-10 shadow-lg`}>
        {icon}
      </div>

      {/* Retain pin */}
      {isRetained && (
        <div className="absolute -top-2 right-4 sm:-top-2.5 sm:right-5 text-sm sm:text-base z-10 animate-pulse">📌</div>
      )}

      {/* Card name */}
      <div className={`text-center text-xs sm:text-sm font-black mt-2 sm:mt-3 ${colors.text} tracking-wider`} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
        {card.name}
        {card.upgraded && <span className="text-amber-400 text-[10px] sm:text-xs ml-0.5">+</span>}
      </div>

      {/* Divider */}
      <div className={`mx-auto w-4/5 h-px my-1 sm:my-1.5 ${colors.border.replace('border-', 'bg-')}`} />

      {/* Card art area */}
      <div className={`relative h-[30px] sm:h-[44px] mx-1 rounded-lg overflow-hidden ${colors.artBg}`}>
        <div className={`absolute inset-0 ${
          card.type === 'attack' ? 'card-art-attack' :
          card.type === 'defense' ? 'card-art-defense' : 'card-art-spell'
        }`} />
        <div className="absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl opacity-60 drop-shadow-lg relative z-10">
          {icon}
        </div>
        {card.rarity !== 'common' && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent animate-shimmer" />
        )}
      </div>

      {/* Description */}
      <div className="flex-1 flex items-center justify-center px-0.5">
        <p className="text-center text-[9px] sm:text-[11px] text-gray-300 leading-tight">
          {card.description}
        </p>
      </div>

      {/* Keywords */}
      {card.exhaust && !card.ethereal && (
        <div className="text-center text-[9px] sm:text-[10px] text-red-400 font-bold">消耗</div>
      )}
      {card.ethereal && (
        <div className="text-center text-[9px] sm:text-[10px] text-orange-400 font-bold">虚无</div>
      )}
      {card.retain && !card.exhaust && (
        <div className="text-center text-[9px] sm:text-[10px] text-cyan-400 font-bold">保留</div>
      )}
      {card.innate && (
        <div className="text-center text-[9px] sm:text-[10px] text-yellow-400 font-bold">固有</div>
      )}

      {/* Bottom rarity */}
      <div className="flex items-center justify-between mt-0.5 sm:mt-1">
        <div className={`h-0.5 sm:h-1 flex-1 rounded-full ${colors.text.replace('text-', 'bg-')}/20`} />
        {rarityStars && (
          <span className={`text-[8px] sm:text-[10px] ml-1 ${rarityStyle.stars} drop-shadow-lg`}>
            {rarityStars}
          </span>
        )}
      </div>
    </div>
  );
};

export default Card;
