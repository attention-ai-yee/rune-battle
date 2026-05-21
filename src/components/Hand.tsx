import React, { useState, useEffect } from 'react';
import type { CardInstance } from '../types/game';
import Card from './Card';

interface HandProps {
  cards: CardInstance[];
  selectedCardId: string | null;
  playerEnergy: number;
  isEnemyTurn: boolean;
  onCardClick: (cardId: string) => void;
  onToggleRetain?: (cardId: string) => void;
}

/** Hook to detect if viewport is at least sm breakpoint (640px) */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 640px)').matches : true
  );
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

const Hand: React.FC<HandProps> = ({
  cards,
  selectedCardId,
  playerEnergy,
  isEnemyTurn,
  onCardClick,
  onToggleRetain,
}) => {
  const isDesktop = useIsDesktop();

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center h-[120px] sm:h-[180px]">
        <p className="text-gray-500 text-sm italic">
          {isEnemyTurn ? '敌人回合...' : '手中无牌'}
        </p>
      </div>
    );
  }

  return (
    <div
      className="
        flex items-end justify-center
        px-2 sm:px-4 pb-2 pt-2 sm:pt-4
        overflow-x-auto scroll-snap-x
        sm:overflow-visible
        gap-0 sm:gap-2
      "
      style={{
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {cards.map((card, index) => {
        const isSelected = selectedCardId === card.instanceId;
        const isPlayable = card.cost <= playerEnergy;

        // Fan rotation: desktop 2°/3px, mobile 1°/2px
        const totalCards = cards.length;
        const midPoint = (totalCards - 1) / 2;
        const offset = index - midPoint;
        const rotation = offset * (isDesktop ? 2 : 1);
        const yOffset = Math.abs(offset) * (isDesktop ? 3 : 2);

        return (
          <div
            key={card.instanceId}
            style={{
              transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
              zIndex: isSelected ? 20 : index,
              scrollSnapAlign: 'center',
            }}
            className={`
              transition-transform duration-200 flex-shrink-0
              ${index > 0 && !isDesktop ? '-ml-5' : ''}
            `}
          >
            <Card
              card={card}
              isSelected={isSelected}
              isPlayable={isPlayable}
              isEnemyTurn={isEnemyTurn}
              onClick={() => onCardClick(card.instanceId)}
              showRetainToggle={!isEnemyTurn}
              isRetained={card.isRetained || card.retain}
              onToggleRetain={onToggleRetain ? () => onToggleRetain(card.instanceId) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
};

export default Hand;
