import React, { useRef, useCallback } from 'react';
import type { CardInstance, CardRarity } from '../types/game';

interface CardProps {
  card: CardInstance;
  isSelected: boolean;
  isPlayable: boolean;
  isEnemyTurn: boolean;
  onClick: () => void;
  /** If true, show upgrade comparison mode */
  showUpgradePreview?: boolean;
  /** If true, show retain toggle UI */
  showRetainToggle?: boolean;
  /** If true, this card is retained for next turn */
  isRetained?: boolean;
  /** Callback when retain is toggled (right-click or long press) */
  onToggleRetain?: () => void;
}

/** Card type to color mapping */
const CARD_TYPE_COLORS: Record<string, { border: string; glow: string; bg: string; text: string; badge: string }> = {
  attack: {
    border: 'border-rune-red/60',
    glow: 'card-glow-red',
    bg: 'bg-gradient-to-b from-red-950/80 to-rune-card',
    text: 'text-rune-red',
    badge: 'bg-rune-red/20 text-rune-red',
  },
  defense: {
    border: 'border-rune-blue/60',
    glow: 'card-glow-blue',
    bg: 'bg-gradient-to-b from-blue-950/80 to-rune-card',
    text: 'text-rune-blue',
    badge: 'bg-rune-blue/20 text-rune-blue',
  },
  spell: {
    border: 'border-rune-purple/60',
    glow: 'card-glow-purple',
    bg: 'bg-gradient-to-b from-purple-950/80 to-rune-card',
    text: 'text-rune-purple',
    badge: 'bg-rune-purple/20 text-rune-purple',
  },
};

/** Card rarity to visual style mapping */
const CARD_RARITY_STYLES: Record<CardRarity, { border: string; glow: string; stars: string }> = {
  common: {
    border: '',
    glow: '',
    stars: '',
  },
  rare: {
    border: 'border-emerald-400/70',
    glow: 'animate-glow-rare',
    stars: 'text-emerald-400',
  },
  epic: {
    border: 'border-amber-400/70',
    glow: 'animate-glow-epic',
    stars: 'text-amber-400',
  },
};

/** Card rarity star labels */
const CARD_RARITY_STARS: Record<CardRarity, string> = {
  common: '',
  rare: '★',
  epic: '★★',
};

/** Card type emoji icons */
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

  // Long press support for mobile retain toggle
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (showRetainToggle && onToggleRetain) {
      e.preventDefault();
      onToggleRetain();
    }
  }, [showRetainToggle, onToggleRetain]);

  const handleTouchStart = useCallback(() => {
    if (showRetainToggle && onToggleRetain) {
      longPressTimer.current = setTimeout(() => {
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

  // Determine border classes: rarity overrides type border for rare/epic
  const borderClass = rarityStyle.border || colors.border;

  // Determine glow classes: combine type glow with rarity glow
  const glowClass = rarityStyle.glow || colors.glow;

  // Upgrade visual: subtle gold halo
  const upgradeGlow = card.upgraded ? 'ring-1 ring-amber-400/40' : '';

  // Retain visual: cyan glow for retained cards
  const retainGlow = isRetained ? 'ring-1 ring-cyan-400/50' : '';

  return (
    <div
      onClick={canClick ? onClick : undefined}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`
        relative w-[110px] h-[155px] rounded-lg border-2
        ${borderClass} ${colors.bg} ${glowClass}
        transition-all duration-200 ease-out
        flex flex-col p-2 cursor-pointer
        ${canClick ? 'hover:scale-110 hover:-translate-y-5 hover:z-20' : 'opacity-60 cursor-not-allowed'}
        ${isSelected ? 'scale-110 -translate-y-5 z-20 ring-2 ring-rune-gold' : ''}
        ${!canClick && !isSelected ? 'opacity-60' : ''}
        ${upgradeGlow}
        ${retainGlow}
        ${showUpgradePreview ? 'scale-105 ring-2 ring-amber-400/60' : ''}
      `}
    >
      {/* Cost badge */}
      <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-rune-dark border-2 border-rune-gold flex items-center justify-center z-10">
        <span className="text-rune-gold text-sm font-bold">{card.cost}</span>
      </div>

      {/* Type badge */}
      <div className={`absolute -top-2 -right-2 px-1.5 py-0.5 rounded text-xs font-bold ${colors.badge} z-10`}>
        {icon}
      </div>

      {/* Retain pin indicator */}
      {isRetained && (
        <div className="absolute -top-2 right-4 text-sm z-10 animate-pulse">📌</div>
      )}

      {/* Card name with upgrade indicator */}
      <div className={`text-center text-sm font-bold mt-2 ${colors.text} drop-shadow-md`}>
        {card.name}
        {card.upgraded && <span className="text-amber-400 text-xs ml-0.5">+</span>}
      </div>

      {/* Divider */}
      <div className={`mx-auto w-3/4 h-px my-1.5 ${colors.border.replace('border-', 'bg-')}`}></div>

      {/* Description */}
      <div className="flex-1 flex items-center justify-center">
        <p className="text-center text-xs text-gray-300 leading-tight px-1">
          {card.description}
        </p>
      </div>

      {/* Exhaust label */}
      {card.exhaust && (
        <div className="text-center text-[10px] text-red-400 font-bold mt-0.5">
          消耗
        </div>
      )}

      {/* Retain label for cards with innate retain */}
      {card.retain && !card.exhaust && (
        <div className="text-center text-[10px] text-cyan-400 font-bold mt-0.5">
          保留
        </div>
      )}

      {/* Bottom type indicator + rarity stars */}
      <div className="flex items-center justify-between mt-1">
        <div className={`h-1 flex-1 rounded-full ${colors.text.replace('text-', 'bg-')}/30`}></div>
        {rarityStars && (
          <span className={`text-[10px] ml-1 ${rarityStyle.stars}`}>
            {rarityStars}
          </span>
        )}
      </div>
    </div>
  );
};

export default Card;
