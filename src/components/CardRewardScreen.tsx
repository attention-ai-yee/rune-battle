import React from 'react';
import type { CardTemplate } from '../types/game';
import Card from './Card';
import { createCardInstance } from '../utils/gameLogic';

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
      <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🃏</div>
      <h2 className="text-2xl sm:text-3xl font-bold text-rune-gold mb-1 sm:mb-2">卡牌奖励</h2>
      <p className="text-sm sm:text-base text-gray-400 mb-1 sm:mb-2">选择一张卡牌加入牌组</p>
      <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-8">当前牌组: {deckSize} 张</p>

      {/* Deck full warning */}
      {isDeckFull && (
        <div className="mb-3 sm:mb-4 px-4 py-2 rounded-lg bg-amber-900/30 border border-amber-500/50 text-amber-300 text-xs sm:text-sm">
          ⚠️ 牌组已满（{deckSize}/40），但仍可添加
        </div>
      )}

      {/* Card choices - vertical on mobile, horizontal on desktop */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6 sm:mb-8 flex-wrap justify-center w-full max-w-4xl">
        {rewardChoices.map((template) => {
          const cardInstance = createCardInstance(template);
          return (
            <div
              key={template.id}
              className="flex flex-col items-center gap-2 sm:gap-3 cursor-pointer group touch-target"
              onClick={() => onSelectCard(template)}
            >
              {/* Rarity label */}
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

              <div className="text-[9px] sm:text-xs text-rune-gold/60 group-hover:text-rune-gold transition-colors">
                点击获取
              </div>
            </div>
          );
        })}
      </div>

      {/* Skip button */}
      <button
        onClick={onSkip}
        className="
          touch-target px-5 sm:px-6 py-2.5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm
          bg-gray-800/40 border-2 border-gray-600/50 text-gray-400
          hover:bg-gray-800/60 hover:border-gray-500
          active:bg-gray-700/60 active:scale-95
          transition-all duration-200 hover:scale-105
        "
      >
        跳过
      </button>
    </div>
  );
};

export default CardRewardScreen;
