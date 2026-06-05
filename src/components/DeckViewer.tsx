import React from 'react';
import type { CardInstance, CardType } from '../types/game';
import { Swords, Shield, Sparkles, Scroll, Layers, HandMetal, Trash2, Wind, ChevronDown, ChevronRight, X } from 'lucide-react';

interface DeckViewerProps {
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  exhaustedPile: CardInstance[];
  onClose: () => void;
  screen: 'map' | 'battle';
}

const TYPE_COLORS: Record<CardType, string> = {
  attack: 'text-red-400',
  defense: 'text-blue-400',
  spell: 'text-purple-400',
};

const TYPE_ICONS: Record<CardType, React.FC<{size?:number;className?:string}>> = {
  attack: Swords,
  defense: Shield,
  spell: Sparkles,
};

function getRarityStars(card: CardInstance): string {
  if (card.rarity === 'epic') return '★★';
  if (card.rarity === 'rare') return '★';
  return '';
}

const CardRow: React.FC<{ card: CardInstance }> = ({ card }) => {
  const TypeIcon = TYPE_ICONS[card.type] || Scroll;
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/40 rounded-lg border border-gray-700/30 hover:bg-gray-700/40 transition-colors">
      <div className="w-6 h-6 rounded-full bg-gray-900 border border-amber-400/60 flex items-center justify-center flex-shrink-0">
        <span className="text-amber-400 text-[10px] font-black">{card.cost}</span>
      </div>
      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${card.type === 'attack' ? 'bg-red-900/40' : card.type === 'defense' ? 'bg-blue-900/40' : 'bg-purple-900/40'}`}>
        <TypeIcon size={12} className={TYPE_COLORS[card.type]} />
      </div>
      <span className={`text-xs font-bold ${TYPE_COLORS[card.type]} flex-shrink-0`}>
        {card.name}{card.upgraded && <span className="text-amber-400">+</span>}
      </span>
      <span className="text-[10px] text-gray-400 flex-1 truncate">{card.description}</span>
      {card.exhaust && <span className="text-[9px] text-red-400/60 flex-shrink-0">消耗</span>}
      {getRarityStars(card) && <span className={`text-[9px] ${card.rarity === 'epic' ? 'text-amber-400' : 'text-emerald-400'} flex-shrink-0`}>{getRarityStars(card)}</span>}
    </div>
  );
};

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  cards: CardInstance[];
  defaultOpen?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, icon, count, cards, defaultOpen = false }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800/60 rounded-lg border border-gray-700/30 hover:bg-gray-700/60 transition-colors"
      >
        {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        {icon}
        <span className="text-sm font-bold text-gray-200">{title}</span>
        <span className="text-xs text-gray-500 ml-auto">{count}</span>
      </button>
      {open && cards.length > 0 && (
        <div className="mt-1 flex flex-col gap-1 max-h-[200px] overflow-y-auto">
          {cards.map(card => <CardRow key={card.instanceId} card={card} />)}
        </div>
      )}
    </div>
  );
};

const DeckViewer: React.FC<DeckViewerProps> = ({ drawPile, hand, discardPile, exhaustedPile, onClose, screen }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900/95 border-2 border-purple-500/30 rounded-2xl p-4 sm:p-5 max-w-md w-full max-h-[80vh] flex flex-col shadow-2xl shadow-purple-500/10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-gray-100 flex items-center gap-2">
            <Layers size={20} className="text-purple-400" />
            牌库
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-800/60 border border-gray-600/40 flex items-center justify-center hover:bg-gray-700/60 transition-colors"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto">
          <Section title="抽牌堆" icon={<Layers size={14} className="text-blue-400" />} count={drawPile.length} cards={drawPile} defaultOpen={screen === 'map'} />
          <Section title="手牌" icon={<HandMetal size={14} className="text-green-400" />} count={hand.length} cards={hand} defaultOpen={screen === 'battle'} />
          <Section title="弃牌堆" icon={<Trash2 size={14} className="text-orange-400" />} count={discardPile.length} cards={discardPile} />
          {exhaustedPile.length > 0 && (
            <Section title="消耗区" icon={<Wind size={14} className="text-gray-400" />} count={exhaustedPile.length} cards={exhaustedPile} />
          )}
        </div>
      </div>
    </div>
  );
};

export default DeckViewer;
