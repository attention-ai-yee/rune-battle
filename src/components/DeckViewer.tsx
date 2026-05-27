import React from 'react';
import type { CardInstance, CardType } from '../types/game';

interface DeckViewerProps {
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  exhaustedPile: CardInstance[];
  onClose: () => void;
  screen: 'map' | 'battle';
}

/** Card type colors for text */
const TYPE_COLORS: Record<CardType, string> = {
  attack: 'text-rune-red',
  defense: 'text-rune-blue',
  spell: 'text-rune-purple',
};

/** Card type icons */
const TYPE_ICONS: Record<CardType, string> = {
  attack: '⚔️',
  defense: '🛡️',
  spell: '✨',
};

/** Rarity stars */
function getRarityStars(card: CardInstance): string {
  if (card.rarity === 'epic') return '★★';
  if (card.rarity === 'rare') return '★';
  return '';
}

/** Rarity star color */
function getRarityColor(card: CardInstance): string {
  if (card.rarity === 'epic') return 'text-amber-400';
  if (card.rarity === 'rare') return 'text-emerald-400';
  return '';
}

/** A single card row in the list */
const CardRow: React.FC<{ card: CardInstance }> = ({ card }) => {
  const typeColor = TYPE_COLORS[card.type] || 'text-gray-300';
  const typeIcon = TYPE_ICONS[card.type] || '📜';
  const rarityStars = getRarityStars(card);
  const rarityColor = getRarityColor(card);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg bg-gray-800/40 border border-gray-700/30 hover:bg-gray-800/60 transition-colors min-w-0">
      {/* Cost badge */}
      <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-rune-dark border border-rune-gold/60 flex items-center justify-center">
        <span className="text-rune-gold text-[10px] sm:text-xs font-bold">{card.cost}</span>
      </div>

      {/* Card name + upgrade indicator */}
      <span className={`text-xs sm:text-sm font-bold truncate min-w-0 ${typeColor}`}>
        {card.name}
        {card.upgraded && <span className="text-amber-400 text-[10px] sm:text-xs ml-0.5">+</span>}
      </span>

      {/* Type icon */}
      <span className="flex-shrink-0 text-xs sm:text-sm">{typeIcon}</span>

      {/* Description - truncated */}
      <span className="flex-1 text-[10px] sm:text-xs text-gray-400 truncate min-w-0 hidden xs:inline">
        — {card.description}
      </span>

      {/* Exhaust badge */}
      {card.exhaust && (
        <span className="flex-shrink-0 text-[9px] sm:text-[10px] text-red-400 font-bold">消耗</span>
      )}

      {/* Rarity stars */}
      {rarityStars && (
        <span className={`flex-shrink-0 text-[10px] sm:text-xs ${rarityColor}`}>
          {rarityStars}
        </span>
      )}
    </div>
  );
};

/** Section header + card list */
const PileSection: React.FC<{
  title: string;
  icon: string;
  cards: CardInstance[];
  totalCount: number;
  defaultOpen?: boolean;
}> = ({ title, icon, cards, totalCount, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  // If no cards in this section, still show but collapsed with count 0
  if (cards.length === 0) {
    return (
      <div className="mb-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/30 border border-gray-700/20 cursor-pointer hover:bg-gray-800/50 transition-colors"
        >
          <span className="text-sm">{icon}</span>
          <span className="text-xs sm:text-sm text-gray-400 font-bold">{title}</span>
          <span className="text-[10px] sm:text-xs text-gray-600">(0张)</span>
          <span className="ml-auto text-[10px] text-gray-600">{isOpen ? '▼' : '▶'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/30 border border-gray-700/20 cursor-pointer hover:bg-gray-800/50 transition-colors sticky top-0 z-10"
      >
        <span className="text-sm">{icon}</span>
        <span className="text-xs sm:text-sm text-gray-200 font-bold">{title}</span>
        <span className="text-[10px] sm:text-xs text-gray-500">
          ({cards.length}张 / 共{totalCount}张)
        </span>
        <span className="ml-auto text-[10px] text-gray-500">{isOpen ? '▼' : '▶'}</span>
      </button>

      {isOpen && (
        <div className="mt-0.5 space-y-0.5 ml-1">
          {cards.map(card => (
            <CardRow key={card.instanceId} card={card} />
          ))}
        </div>
      )}
    </div>
  );
};

/** Full-screen deck viewer overlay */
const DeckViewer: React.FC<DeckViewerProps> = ({
  drawPile,
  hand,
  discardPile,
  exhaustedPile,
  onClose,
  screen,
}) => {
  const totalCards = drawPile.length + hand.length + discardPile.length + exhaustedPile.length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border-2 border-rune-purple/40 bg-gray-900 shadow-[0_0_40px_rgba(168,85,247,0.15)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-800/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl">📜</span>
            <h2 className="text-base sm:text-lg font-bold text-rune-gold fantasy-text">
              牌库
            </h2>
            <span className="text-xs sm:text-sm text-gray-400">
              ({totalCards}张)
            </span>
          </div>
          <button
            onClick={onClose}
            className="touch-target w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 active:bg-gray-600/50 transition-all"
            title="关闭"
          >
            ✕
          </button>
        </div>

        {/* Card sections - scrollable */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 sm:py-4 space-y-1">
          {/* Draw pile */}
          <PileSection
            title="抽牌堆"
            icon="📚"
            cards={drawPile}
            totalCount={totalCards}
            defaultOpen={true}
          />

          {/* Hand (only in battle) */}
          {screen === 'battle' && (
            <PileSection
              title="手牌"
              icon="🃏"
              cards={hand}
              totalCount={totalCards}
              defaultOpen={true}
            />
          )}

          {/* Discard pile */}
          <PileSection
            title="弃牌堆"
            icon="🗑️"
            cards={discardPile}
            totalCount={totalCards}
            defaultOpen={false}
          />

          {/* Exhausted pile (only if > 0) */}
          {exhaustedPile.length > 0 && (
            <PileSection
              title="消耗"
              icon="💨"
              cards={exhaustedPile}
              totalCount={totalCards}
              defaultOpen={false}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center px-4 py-2 border-t border-gray-700/50 bg-gray-800/40 flex-shrink-0">
          <span className="text-[10px] sm:text-xs text-gray-600">
            点击外部或 ✕ 关闭
          </span>
        </div>
      </div>
    </div>
  );
};

export default DeckViewer;
