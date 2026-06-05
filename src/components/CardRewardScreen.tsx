import React from 'react';
import type { CardTemplate } from '../types/game';
import Card from './Card';
import { createCardInstance } from '../utils/gameLogic';
import { Gem, AlertTriangle } from 'lucide-react';

interface CardRewardScreenProps {
  rewardChoices: CardTemplate[];
  deckSize: number;
  onSelectCard: (template: CardTemplate) => void;
  onSkip: () => void;
}

const CardRewardScreen: React.FC<CardRewardScreenProps> = ({
  rewardChoices,
  deckSize,
  onSelectCard,
  onSkip,
}) => {
  const isDeckFull = deckSize >= 40;

  return (
    <div className="h-full flex flex-col items-center justify-center bg-rune-pattern animate-fade-in px-3 sm:px-4 overflow-y-auto">
      {/* Title */}
      <div className="mb-3 sm:mb-4">
        <Gem size={48} className="text-amber-400/80" />
      </div>
      <h2 className="text-2xl sm:text-3xl font-black text-amber-400 mb-1 sm:mb-2 tracking-wider" style={{ textShadow: '0 0 15px rgba(212,164,76,0.3)' }}>卡牌奖励</h2>
      <p className="text-sm sm:text-base text-gray-400 mb-1 sm:mb-2">选择一张卡牌加入牌组</p>
      <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-8">当前牌组: {deckSize} 张</p>

      {/* Deck full warning */}
      {isDeckFull && (
        <div className="mb-3 sm:mb-4 px-4 py-2 rounded-lg bg-amber-900/30 border border-amber-500/50 text-amber-300 text-xs sm:text-sm flex items-center gap-2">
          <AlertTriangle size={14} /> 牌组已满（{deckSize}/40），但仍可添加
        </div>
      )}

      {/* Card choices */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6 sm:mb-8 flex-wrap justify-center w-full max-w-4xl">
        {rewardChoices.map((template) => {
          const cardInstance = createCardInstance(template);
          return (
            <div
              key={template.id}
              className="flex flex-col items-center gap-2 sm:gap-3 cursor-pointer group touch-target"
              onClick={() => onSelectCard(template)}
            >
              <div className={`text-[9px] sm:text-xs font-bold mb-0.5 sm:mb-1 ${
                template.rarity === 'epic' ? 'text-amber-400' :
                template.rarity === 'rare' ? 'text-emerald-400' :
                'text-gray-400'
              }`}>
                {template.rarity === 'epic' ? '★★ 史诗' : template.rarity === 'rare' ? '★ 稀有' : '普通'}
              </div>
              <Card
                card={cardInstance}
                isSelected={false}
                isPlayable={true}
                isEnemyTurn={false}
                onClick={() => onSelectCard(template)}
              />
              <div className="text-[10px] sm:text-xs text-gray-500 group-hover:text-amber-400 transition-colors">
                点击获取
              </div>
            </div>
          );
        })}
      </div>

      {/* Skip button */}
      <button
        onClick={onSkip}
        className="px-6 py-2.5 rounded-lg font-bold text-sm bg-gray-800/40 border-2 border-gray-600/40 text-gray-400 hover:bg-gray-700/40 hover:border-gray-500/60 hover:scale-105 active:scale-95 transition-all duration-200"
      >
        跳过
      </button>
    </div>
  );
};

export default CardRewardScreen;
