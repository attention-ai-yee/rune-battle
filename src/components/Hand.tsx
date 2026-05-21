import React from 'react';
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

const Hand: React.FC<HandProps> = ({
  cards,
  selectedCardId,
  playerEnergy,
  isEnemyTurn,
  onCardClick,
  onToggleRetain,
}) => {
  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center h-[180px]">
        <p className="text-gray-500 text-sm italic">
          {isEnemyTurn ? '敌人回合...' : '手中无牌'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-end justify-center gap-2 px-4 pb-2 pt-4">
      {cards.map((card, index) => {
        const isSelected = selectedCardId === card.instanceId;
        const isPlayable = card.cost <= playerEnergy;

        // Slight fan rotation based on position
        const totalCards = cards.length;
        const midPoint = (totalCards - 1) / 2;
        const offset = index - midPoint;
        const rotation = offset * 2; // degrees
        const yOffset = Math.abs(offset) * 3; // pixels

        return (
          <div
            key={card.instanceId}
            style={{
              transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
            }}
            className="transition-transform duration-200"
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
