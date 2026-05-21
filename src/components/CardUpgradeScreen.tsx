import React from 'react';
import type { CardInstance } from '../types/game';
import { CARD_UPGRADES } from '../data/cards';
import Card from './Card';

interface CardUpgradeScreenProps {
  upgradeChoices: CardInstance[];
  onSelectCard: (card: CardInstance) => void;
  onSkip: () => void;
}

/** Shows a preview of what a card will look like after upgrade */
function getUpgradedPreview(card: CardInstance): { name: string; description: string } | null {
  const upgrade = CARD_UPGRADES[card.templateId];
  if (!upgrade || card.upgraded) return null;
  return { name: upgrade.name, description: upgrade.description };
}

const CardUpgradeScreen: React.FC<CardUpgradeScreenProps> = ({
  upgradeChoices,
  onSelectCard,
  onSkip,
}) => {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-rune-pattern animate-fade-in px-3 sm:px-4 overflow-y-auto">
      {/* Title */}
      <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">⬆️</div>
      <h2 className="text-2xl sm:text-3xl font-bold text-rune-gold mb-1 sm:mb-2">卡牌升级</h2>
      <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-8">选择一张卡牌进行升级</p>

      {/* Card choices - vertical on mobile, horizontal on desktop */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6 sm:mb-8 flex-wrap justify-center w-full max-w-4xl">
        {upgradeChoices.map((card) => {
          const preview = getUpgradedPreview(card);
          return (
            <div
              key={card.instanceId}
              className="flex flex-col items-center gap-2 sm:gap-3 cursor-pointer group touch-target"
              onClick={() => onSelectCard(card)}
            >
              {/* Current card */}
              <div className="text-[9px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">当前</div>
              <Card
                card={card}
                isSelected={false}
                isPlayable={true}
                isEnemyTurn={false}
                onClick={() => onSelectCard(card)}
              />

              {/* Arrow */}
              <div className="text-rune-gold text-base sm:text-lg">↓</div>

              {/* Upgraded preview */}
              <div className="text-[9px] sm:text-xs text-amber-400 mb-0.5 sm:mb-1">升级后</div>
              <div className="relative w-[75px] h-[105px] sm:w-[110px] sm:h-[155px] rounded-lg border-2 border-amber-400/60 bg-gradient-to-b from-amber-950/60 to-rune-card animate-glow-epic flex flex-col p-1.5 sm:p-2 transition-all duration-200 group-hover:scale-105 group-hover:border-amber-400 active:scale-95">
                {/* Cost badge */}
                <div className="absolute -top-1.5 -left-1.5 sm:-top-2 sm:-left-2 w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-rune-dark border-2 border-rune-gold flex items-center justify-center z-10">
                  <span className="text-rune-gold text-[10px] sm:text-sm font-bold">
                    {CARD_UPGRADES[card.templateId]?.cost ?? card.cost}
                  </span>
                </div>

                {/* Upgraded name */}
                <div className="text-center text-[9px] sm:text-sm font-bold mt-1 sm:mt-2 text-amber-300 drop-shadow-md">
                  {preview?.name ?? card.name}
                </div>

                {/* Divider */}
                <div className="mx-auto w-3/4 h-px my-0.5 sm:my-1.5 bg-amber-400/30"></div>

                {/* Upgraded description */}
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-center text-[7px] sm:text-xs text-amber-200 leading-tight px-0.5 sm:px-1">
                    {preview?.description ?? card.description}
                  </p>
                </div>

                {/* Exhaust label */}
                {card.exhaust && (
                  <div className="text-center text-[7px] sm:text-[10px] text-red-400 font-bold mt-0.5">
                    消耗
                  </div>
                )}

                {/* Bottom indicator */}
                <div className="flex items-center justify-between mt-0.5 sm:mt-1">
                  <div className="h-0.5 sm:h-1 flex-1 rounded-full bg-amber-400/30"></div>
                  <span className="text-[7px] sm:text-[10px] ml-1 text-amber-400">★</span>
                </div>
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

export default CardUpgradeScreen;
