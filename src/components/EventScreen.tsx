import React, { useState } from 'react';
import type { EventState, EventChoice, CardInstance } from '../types/game';
import { Gem, HeartPulse, Swords, Coins, Trash2, Star, Zap, ArrowUp } from 'lucide-react';

interface EventScreenProps {
  eventData: EventState;
  deck: CardInstance[];
  onChoose: (choice: EventChoice, randomResult?: Record<string, string | number>) => void;
}

const CHOICE_ICONS: Record<string, React.FC<{size?:number;className?:string}>> = {
  heal: HeartPulse,
  damage: Swords,
  gold: Coins,
  removeCard: Trash2,
  addCard: Gem,
  maxHp: HeartPulse,
  strength: Zap,
};

const CHOICE_COLORS: Record<string, string> = {
  heal: 'border-green-500/30 text-green-400 hover:border-green-400',
  damage: 'border-red-500/30 text-red-400 hover:border-red-400',
  gold: 'border-amber-500/30 text-amber-400 hover:border-amber-400',
  removeCard: 'border-purple-500/30 text-purple-400 hover:border-purple-400',
  addCard: 'border-blue-500/30 text-blue-400 hover:border-blue-400',
  maxHp: 'border-red-500/30 text-red-400 hover:border-red-400',
  strength: 'border-orange-500/30 text-orange-400 hover:border-orange-400',
};

const EventScreen: React.FC<EventScreenProps> = ({ eventData, deck, onChoose }) => {
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<EventChoice | null>(null);

  const handleChoice = (choice: EventChoice) => {
    if (choice.effect === 'gold' && choice.value > 0 && eventData.title === '古代宝箱') {
      const roll = Math.random();
      if (roll < 0.5) onChoose(choice, { gold: choice.value });
      else onChoose(choice, { damage: 10 });
      return;
    }
    if (choice.effect === 'damage' && eventData.title === '神秘商人') {
      onChoose(choice, { damage: 5, addCard: 1 });
      return;
    }
    if (choice.effect === 'strength' && eventData.title === '治愈之泉') {
      onChoose(choice, { strength: 2, damage: 5 });
      return;
    }
    if (choice.effect === 'removeCard') {
      setPendingChoice(choice);
      setShowRemoveModal(true);
      return;
    }
    onChoose(choice);
  };

  const handleRemoveCard = (cardInstanceId: string) => {
    if (!pendingChoice) return;
    setShowRemoveModal(false);
    onChoose(pendingChoice, { removeCardId: cardInstanceId });
  };

  const rarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-300';
      case 'rare': return 'text-blue-400';
      case 'epic': return 'text-purple-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-3 sm:p-6 bg-rune-pattern overflow-y-auto animate-fade-in">
      {/* Event art */}
      <div className="mb-4">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-2 border-purple-500/30 flex items-center justify-center">
          <Gem size={40} className="text-purple-400/80" />
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-black text-amber-400 mb-2 tracking-wider text-center" style={{ textShadow: '0 0 15px rgba(212,164,76,0.3)' }}>
        {eventData.title}
      </h2>

      <p className="text-sm sm:text-base text-gray-300 mb-6 sm:mb-8 text-center max-w-sm leading-relaxed">
        {eventData.description}
      </p>

      {/* Choice buttons */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {eventData.choices.map((choice, idx) => {
          const ChoiceIcon = CHOICE_ICONS[choice.effect] || Gem;
          const colorClass = CHOICE_COLORS[choice.effect] || 'border-gray-500/50 text-gray-300 hover:border-gray-400';
          return (
            <button
              key={idx}
              onClick={() => handleChoice(choice)}
              disabled={choice.effect === 'removeCard' && deck.length === 0}
              className={`touch-target px-4 sm:px-6 py-3 sm:py-4 rounded-lg border-2 bg-gray-800/60 ${colorClass} transition-all duration-200 hover:bg-gray-700/60 hover:scale-[1.02] active:scale-95 font-bold text-sm sm:text-base text-left flex items-center gap-3 ${choice.effect === 'removeCard' && deck.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <ChoiceIcon size={18} />
              <span>{choice.text}</span>
            </button>
          );
        })}
      </div>

      {/* Remove card modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border-2 border-purple-500/50 rounded-xl p-4 max-w-sm w-full max-h-[70vh] flex flex-col">
            <h3 className="text-lg font-bold text-purple-400 mb-2 text-center">选择要献祭的卡牌</h3>
            <p className="text-xs text-gray-400 mb-3 text-center">选择一张卡牌从牌组中永久移除</p>
            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 mb-3">
              {deck.map(card => (
                <button
                  key={card.instanceId}
                  onClick={() => handleRemoveCard(card.instanceId)}
                  className="w-full text-left px-3 py-2 rounded-lg border-2 border-gray-700/50 bg-gray-800/60 hover:border-amber-400/50 hover:bg-gray-700/60 transition-all"
                >
                  <div className={`text-sm font-bold ${rarityColor(card.rarity)}`}>
                    {card.name} {card.upgraded && <Star size={10} className="inline text-amber-400" />}
                  </div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1"><Coins size={10} /> {card.cost}</div>
                </button>
              ))}
            </div>
            <button onClick={() => { setShowRemoveModal(false); setPendingChoice(null); }} className="py-2 rounded-lg font-bold text-sm bg-gray-800/40 border-2 border-gray-600/50 text-gray-400 hover:bg-gray-800/60 active:scale-95 transition-all duration-200">取消</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventScreen;
