import React, { useState } from 'react';
import type { CardTemplate, CardInstance, ShopState } from '../types/game';
import { getRandomCardRewardTemplates } from '../utils/gameLogic';

interface ShopScreenProps {
  gold: number;
  deck: CardInstance[];
  onBuyCard: (template: CardTemplate) => void;
  onRemoveCard: (cardInstanceId: string) => void;
  onRestHeal: () => void;
  onLeave: () => void;
}

/** Generate shop state with random card offers */
export function generateShopState(gold: number): ShopState {
  const templates = getRandomCardRewardTemplates(3);
  const cardOffers = templates.map(t => {
    const price = t.rarity === 'common' ? 50 : t.rarity === 'rare' ? 80 : 120;
    return { template: t, price };
  });

  return {
    cardOffers,
    removeCardPrice: 60,
    healPrice: 40,
    healAmount: Math.floor(70 * 0.25), // 25% of max HP
    gold,
  };
}

const ShopScreen: React.FC<ShopScreenProps> = ({
  gold,
  deck,
  onBuyCard,
  onRemoveCard,
  onRestHeal,
  onLeave,
}) => {
  const [shopState] = useState<ShopState>(() => generateShopState(gold));
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removedCardId, setRemovedCardId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleBuy = (template: CardTemplate, price: number) => {
    if (gold < price) {
      setMessage('金币不足！');
      return;
    }
    onBuyCard(template);
    setMessage(`购买了 ${template.name}！`);
  };

  const handleRemove = (cardInstanceId: string) => {
    if (gold < shopState.removeCardPrice) {
      setMessage('金币不足！');
      return;
    }
    onRemoveCard(cardInstanceId);
    setShowRemoveModal(false);
    setMessage('移除了卡牌');
  };

  const handleRest = () => {
    if (gold < shopState.healPrice) {
      setMessage('金币不足！');
      return;
    }
    onRestHeal();
    setMessage(`恢复了 ${shopState.healAmount} 点生命值`);
  };

  const rarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-300';
      case 'rare': return 'text-rune-blue';
      case 'epic': return 'text-rune-purple';
      default: return 'text-gray-300';
    }
  };

  const rarityBorder = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-500/50';
      case 'rare': return 'border-rune-blue/50';
      case 'epic': return 'border-rune-purple/50';
      default: return 'border-gray-500/50';
    }
  };

  return (
    <div className="h-full flex flex-col items-center p-3 sm:p-6 bg-rune-pattern overflow-y-auto">
      {/* Title */}
      <h2 className="text-xl sm:text-2xl font-bold text-rune-gold mb-1 tracking-wider">🏪 商店</h2>

      {/* Gold display */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4 bg-gray-800/60 border border-rune-gold/30 rounded-lg px-4 py-2">
        <span className="text-lg">🪙</span>
        <span className="text-rune-gold font-bold text-lg">{gold}</span>
      </div>

      {/* Message */}
      {message && (
        <div className="mb-3 px-4 py-2 bg-gray-800/80 border border-rune-gold/30 rounded-lg text-sm text-gray-200 text-center animate-fade-in">
          {message}
        </div>
      )}

      {/* Card offers */}
      <div className="w-full max-w-md mb-4">
        <h3 className="text-sm text-gray-400 mb-2 text-center">—— 卡牌 ——</h3>
        <div className="flex flex-col gap-2">
          {shopState.cardOffers.map((offer, idx) => (
            <button
              key={idx}
              onClick={() => handleBuy(offer.template, offer.price)}
              disabled={gold < offer.price}
              className={`
                flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border-2
                bg-gray-800/60 ${rarityBorder(offer.template.rarity)}
                transition-all duration-200
                ${gold >= offer.price
                  ? 'hover:border-rune-gold hover:bg-gray-700/60 hover:scale-[1.02] active:scale-95'
                  : 'opacity-40 cursor-not-allowed'
                }
              `}
            >
              {/* Card info */}
              <div className="flex-1 text-left min-w-0">
                <div className={`text-sm sm:text-base font-bold ${rarityColor(offer.template.rarity)}`}>
                  {offer.template.name}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-400 truncate">
                  {offer.template.description}
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs">🪙</span>
                <span className={`text-sm font-bold ${gold >= offer.price ? 'text-rune-gold' : 'text-gray-500'}`}>
                  {offer.price}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Services */}
      <div className="w-full max-w-md mb-4 flex flex-col gap-2">
        <h3 className="text-sm text-gray-400 mb-1 text-center">—— 服务 ——</h3>

        {/* Remove card */}
        <button
          onClick={() => {
            if (gold < shopState.removeCardPrice) {
              setMessage('金币不足！');
              return;
            }
            setShowRemoveModal(true);
          }}
          disabled={gold < shopState.removeCardPrice || deck.length === 0}
          className={`
            touch-target px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2
            bg-gray-800/60 border-rune-red/30
            transition-all duration-200 flex items-center justify-between
            ${gold >= shopState.removeCardPrice && deck.length > 0
              ? 'hover:border-rune-red hover:bg-gray-700/60 hover:scale-[1.02] active:scale-95'
              : 'opacity-40 cursor-not-allowed'
            }
          `}
        >
          <span className="text-sm sm:text-base text-rune-red">🗑️ 移除一张卡牌</span>
          <span className="text-sm text-rune-gold">🪙 {shopState.removeCardPrice}</span>
        </button>

        {/* Rest & heal */}
        <button
          onClick={handleRest}
          disabled={gold < shopState.healPrice}
          className={`
            touch-target px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2
            bg-gray-800/60 border-rune-green/30
            transition-all duration-200 flex items-center justify-between
            ${gold >= shopState.healPrice
              ? 'hover:border-rune-green hover:bg-gray-700/60 hover:scale-[1.02] active:scale-95'
              : 'opacity-40 cursor-not-allowed'
            }
          `}
        >
          <span className="text-sm sm:text-base text-rune-green">💚 休息恢复 ({shopState.healAmount}HP)</span>
          <span className="text-sm text-rune-gold">🪙 {shopState.healPrice}</span>
        </button>
      </div>

      {/* Leave button */}
      <button
        onClick={onLeave}
        className="
          touch-target px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-bold text-sm sm:text-base
          bg-gray-800/40 border-2 border-gray-600/50 text-gray-400
          hover:bg-gray-800/60 hover:border-gray-500 hover:scale-105
          active:bg-gray-700/60 active:scale-95
          transition-all duration-200 mt-2
        "
      >
        离开商店
      </button>

      {/* Remove card modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border-2 border-rune-red/50 rounded-xl p-4 max-w-sm w-full max-h-[70vh] flex flex-col">
            <h3 className="text-lg font-bold text-rune-red mb-2 text-center">选择要移除的卡牌</h3>
            <p className="text-xs text-gray-400 mb-3 text-center">
              花费 {shopState.removeCardPrice} 金币移除一张卡牌
            </p>

            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 mb-3">
              {deck.map(card => (
                <button
                  key={card.instanceId}
                  onClick={() => setRemovedCardId(card.instanceId)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg border-2 transition-all
                    ${removedCardId === card.instanceId
                      ? 'border-rune-red bg-rune-red/20'
                      : 'border-gray-700/50 bg-gray-800/60 hover:border-rune-gold/50'
                    }
                  `}
                >
                  <div className={`text-sm font-bold ${rarityColor(card.rarity)}`}>
                    {card.name} {card.upgraded && '⭐'}
                  </div>
                  <div className="text-[10px] text-gray-400">💰 {card.cost} ⚡</div>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (removedCardId) handleRemove(removedCardId);
                }}
                disabled={!removedCardId}
                className={`
                  flex-1 py-2 rounded-lg font-bold text-sm
                  ${removedCardId
                    ? 'bg-rune-red/20 border-2 border-rune-red text-rune-red hover:bg-rune-red/30 active:scale-95'
                    : 'bg-gray-800/40 border-2 border-gray-700/30 text-gray-600 cursor-not-allowed'
                  }
                  transition-all duration-200
                `}
              >
                确认移除
              </button>
              <button
                onClick={() => {
                  setShowRemoveModal(false);
                  setRemovedCardId(null);
                }}
                className="
                  flex-1 py-2 rounded-lg font-bold text-sm
                  bg-gray-800/40 border-2 border-gray-600/50 text-gray-400
                  hover:bg-gray-800/60 active:scale-95
                  transition-all duration-200
                "
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopScreen;
