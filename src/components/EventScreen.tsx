import React, { useState } from 'react';
import type { EventState, EventChoice, CardInstance } from '../types/game';

interface EventScreenProps {
  eventData: EventState;
  deck: CardInstance[];
  onChoose: (choice: EventChoice, randomResult?: Record<string, string | number>) => void;
}

const EventScreen: React.FC<EventScreenProps> = ({ eventData, deck, onChoose }) => {
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<EventChoice | null>(null);

  const handleChoice = (choice: EventChoice) => {
    // 50% random chance for "古代宝箱" gold event
    if (choice.effect === 'gold' && choice.value > 0 && eventData.title === '古代宝箱') {
      const roll = Math.random();
      if (roll < 0.5) {
        onChoose(choice, { gold: choice.value });
      } else {
        onChoose(choice, { damage: 10 });
      }
      return;
    }

    // "神秘商人" damage + addCard
    if (choice.effect === 'damage' && eventData.title === '神秘商人') {
      onChoose(choice, { damage: 5, addCard: 1 });
      return;
    }

    // "治愈之泉" strength + damage
    if (choice.effect === 'strength' && eventData.title === '治愈之泉') {
      onChoose(choice, { strength: 2, damage: 5 });
      return;
    }

    // "诅咒祭坛" removeCard
    if (choice.effect === 'removeCard') {
      setPendingChoice(choice);
      setShowRemoveModal(true);
      return;
    }

    // Simple effects: heal, leave (heal=0)
    onChoose(choice);
  };

  const handleRemoveCard = (cardInstanceId: string) => {
    if (!pendingChoice) return;
    setShowRemoveModal(false);
    onChoose(pendingChoice, { removeCardId: cardInstanceId });
  };

  const choiceButtonStyle = (effect: string) => {
    switch (effect) {
      case 'heal': return 'border-rune-green/30 text-rune-green hover:border-rune-green';
      case 'damage': return 'border-rune-red/30 text-rune-red hover:border-rune-red';
      case 'gold': return 'border-rune-gold/30 text-rune-gold hover:border-rune-gold';
      case 'removeCard': return 'border-rune-purple/30 text-rune-purple hover:border-rune-purple';
      case 'addCard': return 'border-rune-blue/30 text-rune-blue hover:border-rune-blue';
      case 'maxHp': return 'border-rune-red/30 text-rune-red hover:border-rune-red';
      case 'strength': return 'border-orange-400/30 text-orange-400 hover:border-orange-400';
      default: return 'border-gray-500/50 text-gray-300 hover:border-gray-400';
    }
  };

  const rarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-300';
      case 'rare': return 'text-rune-blue';
      case 'epic': return 'text-rune-purple';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-3 sm:p-6 bg-rune-pattern overflow-y-auto animate-fade-in">
      {/* Event emoji */}
      <div className="text-5xl sm:text-7xl mb-3 sm:mb-4 animate-float">
        {eventData.emoji}
      </div>

      {/* Event title */}
      <h2 className="text-xl sm:text-2xl font-bold text-rune-gold mb-2 tracking-wider text-center">
        {eventData.title}
      </h2>

      {/* Event description */}
      <p className="text-sm sm:text-base text-gray-300 mb-6 sm:mb-8 text-center max-w-sm leading-relaxed">
        {eventData.description}
      </p>

      {/* Choice buttons */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {eventData.choices.map((choice, idx) => (
          <button
            key={idx}
            onClick={() => handleChoice(choice)}
            disabled={
              (choice.effect === 'removeCard' && deck.length === 0)
            }
            className={`
              touch-target px-4 sm:px-6 py-3 sm:py-4 rounded-lg border-2
              bg-gray-800/60 ${choiceButtonStyle(choice.effect)}
              transition-all duration-200
              hover:bg-gray-700/60 hover:scale-[1.02] active:scale-95
              font-bold text-sm sm:text-base text-left
              ${(choice.effect === 'removeCard' && deck.length === 0) ? 'opacity-40 cursor-not-allowed' : ''}
            `}
          >
            {choice.text}
          </button>
        ))}
      </div>

      {/* Remove card modal for curse altar */}
      {showRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border-2 border-rune-purple/50 rounded-xl p-4 max-w-sm w-full max-h-[70vh] flex flex-col">
            <h3 className="text-lg font-bold text-rune-purple mb-2 text-center">
              选择要献祭的卡牌
            </h3>
            <p className="text-xs text-gray-400 mb-3 text-center">
              选择一张卡牌从牌组中永久移除
            </p>

            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 mb-3">
              {deck.map(card => (
                <button
                  key={card.instanceId}
                  onClick={() => handleRemoveCard(card.instanceId)}
                  className="
                    w-full text-left px-3 py-2 rounded-lg border-2
                    border-gray-700/50 bg-gray-800/60
                    hover:border-rune-gold/50 hover:bg-gray-700/60
                    transition-all
                  "
                >
                  <div className={`text-sm font-bold ${rarityColor(card.rarity)}`}>
                    {card.name} {card.upgraded && '⭐'}
                  </div>
                  <div className="text-[10px] text-gray-400">💰 {card.cost} ⚡</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setShowRemoveModal(false);
                setPendingChoice(null);
              }}
              className="
                py-2 rounded-lg font-bold text-sm
                bg-gray-800/40 border-2 border-gray-600/50 text-gray-400
                hover:bg-gray-800/60 active:scale-95
                transition-all duration-200
              "
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventScreen;
