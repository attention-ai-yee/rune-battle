import React, { useRef, useEffect, useState } from 'react';
import type { MapLayer, MapNode } from '../types/game';
import { getEnemyTemplate } from '../data/enemies';
import { Swords, Skull, Package, Gem, HeartPulse, Map, Check, Lock, Layers, Coins, Footprints, Flame, CircleDot, ChevronRight } from 'lucide-react';

// Game-icons imports
import WolfHead from '@iconify-icons/game-icons/wolf-head';
import FloatingGhost from '@iconify-icons/game-icons/floating-ghost';
import GoblinHead from '@iconify-icons/game-icons/goblin-head';
import Skeleton from '@iconify-icons/game-icons/skeleton';
import Imp from '@iconify-icons/game-icons/imp';
import WizardFace from '@iconify-icons/game-icons/wizard-face';
import BlackKnightHelm from '@iconify-icons/game-icons/black-knight-helm';
import RockGolem from '@iconify-icons/game-icons/rock-golem';
import RaiseSkeleton from '@iconify-icons/game-icons/raise-skeleton';
import DragonHead from '@iconify-icons/game-icons/dragon-head';
import DoubleDragon from '@iconify-icons/game-icons/double-dragon';
import SpikedDragonHead from '@iconify-icons/game-icons/spiked-dragon-head';
import HornedReptile from '@iconify-icons/game-icons/horned-reptile';
import WitchFace from '@iconify-icons/game-icons/witch-face';
import BeastEye from '@iconify-icons/game-icons/beast-eye';
import Campfire from '@iconify-icons/game-icons/campfire';
import TreasureChest from '@iconify-icons/game-icons/treasure-chest';
import CrystalBall from '@iconify-icons/game-icons/crystal-ball';
import CrossedSwords from '@iconify-icons/game-icons/crossed-swords';
import MountedKnight from '@iconify-icons/game-icons/mounted-knight';
import Doorway from '@iconify-icons/game-icons/doorway';

interface MapScreenProps {
  mapLayers: MapLayer[];
  playerHp: number;
  playerMaxHp: number;
  gold: number;
  onSelectNode: (layerIndex: number, colIndex: number, nodeIndex: number) => void;
  onOpenDeck: () => void;
  deckSize: number;
}

// GameIcon renderer
const GameIcon: React.FC<{ icon: any; size?: number; color?: string; className?: string }> = ({ icon, size = 32, color, className = '' }) => (
  <svg viewBox={icon.viewBox || '0 0 512 512'} width={size} height={size} fill={color || 'currentColor'} className={className} dangerouslySetInnerHTML={{ __html: icon.body }} />
);

// Enemy icon mapping
const ENEMY_ICONS: Record<string, { icon: any; color: string }> = {
  wolf: { icon: WolfHead, color: '#9ca3af' },
  forest_spirit: { icon: FloatingGhost, color: '#34d399' },
  goblin: { icon: GoblinHead, color: '#22c55e' },
  skeleton: { icon: Skeleton, color: '#d1d5db' },
  fire_imp: { icon: Imp, color: '#f97316' },
  fire_mage: { icon: WizardFace, color: '#ef4444' },
  shadow_priest: { icon: WitchFace, color: '#a855f7' },
  shadow_knight: { icon: BlackKnightHelm, color: '#6b7280' },
  lava_golem: { icon: RockGolem, color: '#f97316' },
  necromancer: { icon: RaiseSkeleton, color: '#7c3aed' },
  drake: { icon: HornedReptile, color: '#ef4444' },
  dragon_guardian: { icon: DragonHead, color: '#f97316' },
  ancient_dragon: { icon: DoubleDragon, color: '#dc2626' },
  whelp: { icon: SpikedDragonHead, color: '#f97316' },
};

// Node type icons (game-icons style)
const NODE_TYPE_ICONS: Record<string, { icon: any; color: string; glow: string }> = {
  battle: { icon: CrossedSwords, color: '#ef4444', glow: 'rgba(239,68,68,0.4)' },
  elite: { icon: MountedKnight, color: '#f97316', glow: 'rgba(249,115,22,0.5)' },
  shop: { icon: TreasureChest, color: '#d4a44c', glow: 'rgba(212,164,76,0.4)' },
  event: { icon: CrystalBall, color: '#a855f7', glow: 'rgba(168,85,247,0.4)' },
  rest: { icon: Campfire, color: '#22c55e', glow: 'rgba(34,197,94,0.4)' },
};

const NODE_LABELS: Record<string, string> = {
  battle: '战斗',
  elite: '精英',
  shop: '商店',
  event: '事件',
  rest: '休息',
};

const LAYER_CONFIGS = [
  { Icon: Footprints, color: '#34d399', gradient: 'from-emerald-900/20 via-green-900/10 to-transparent', name: '暗影森林' },
  { Icon: Flame, color: '#f97316', gradient: 'from-orange-900/20 via-red-900/10 to-transparent', name: '熔岩洞穴' },
  { Icon: Skull, color: '#a855f7', gradient: 'from-purple-900/20 via-indigo-900/10 to-transparent', name: '龙之巢穴' },
];

const MapScreen: React.FC<MapScreenProps> = ({ mapLayers, playerHp, playerMaxHp, gold, onSelectNode, onOpenDeck, deckSize }) => {
  const getNextColumn = (layer: MapLayer): number => {
    for (let i = 0; i < layer.columns.length; i++) {
      const col = layer.columns[i];
      const anyAvailable = col.some(n => n.type === 'battle' || n.type === 'elite' ? !n.defeated : !n.visited);
      if (anyAvailable) return i;
    }
    return -1;
  };

  const isColumnAvailable = (layer: MapLayer, colIndex: number, nextCol: number): boolean => {
    if (!layer.unlocked) return false;
    return colIndex === nextCol;
  };

  const getEnemyInfo = (node: MapNode) => {
    const templateId = node.enemyTemplateId;
    if (!templateId) return null;
    const template = getEnemyTemplate(templateId);
    if (!template) return null;
    let hp = template.maxHp;
    if (node.type === 'elite') hp = Math.floor(hp * 1.5);
    return { name: template.name, hp, templateId };
  };

  const hpPercent = Math.max(0, (playerHp / playerMaxHp) * 100);

  return (
    <div className="h-full flex flex-col overflow-y-auto" style={{ background: 'linear-gradient(180deg, #080818 0%, #0c0c28 50%, #080818 100%)' }}>
      {/* Background atmospheric effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-900/8 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-900/5 rounded-full blur-[150px]" />
      </div>

      {/* Status Bar */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-4 py-3 bg-gray-900/90 border-b border-gray-700/40 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600/40 to-blue-600/40 border border-purple-400/40 flex items-center justify-center shadow-lg shadow-purple-500/10">
              <CircleDot size={16} className="text-purple-300" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="w-28 sm:w-36 h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700/50 shadow-inner">
                <div className={`h-full rounded-full transition-all duration-500 ${hpPercent > 30 ? 'hp-bar' : 'hp-bar-low'}`} style={{ width: `${hpPercent}%` }} />
              </div>
              <span className={`text-[11px] font-bold ${hpPercent > 30 ? 'text-green-400' : 'text-red-400'}`}>
                {playerHp} / {playerMaxHp}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/30 rounded-lg border border-amber-500/30 shadow-lg shadow-amber-500/5">
            <Coins size={16} className="text-amber-400" />
            <span className="text-base text-amber-400 font-black">{gold}</span>
          </div>
        </div>

        <button
          onClick={onOpenDeck}
          className="touch-target flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/60 border border-gray-600/40 text-gray-300 text-sm font-bold hover:text-gray-100 hover:bg-gray-700/60 hover:border-purple-500/50 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg"
        >
          <Layers size={16} />
          <span>牌库 ({deckSize})</span>
        </button>
      </div>

      {/* Map Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center p-4 sm:p-6">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-black tracking-wider mb-2 flex items-center justify-center gap-3" style={{ color: '#d4a44c', textShadow: '0 0 30px rgba(212,164,76,0.4)' }}>
            <Map size={28} /> 冒险地图
          </h2>
          <p className="text-sm text-gray-500">选择你的道路，击败所有敌人</p>
        </div>

        {/* Layers */}
        <div className="flex flex-col gap-8 sm:gap-10 w-full max-w-3xl">
          {mapLayers.map((layer, layerIndex) => {
            const allDone = layer.columns.every(col => col.every(n => n.type === 'battle' || n.type === 'elite' ? n.defeated : n.visited));
            const isLocked = !layer.unlocked;
            const nextCol = getNextColumn(layer);
            const config = LAYER_CONFIGS[layerIndex] || LAYER_CONFIGS[0];

            return (
              <div key={layerIndex} className="relative">
                {/* Layer card */}
                <div
                  className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-500 ${isLocked ? 'border-gray-700/20 opacity-25 grayscale' : allDone ? 'border-green-500/30' : 'border-gray-600/40'}`}
                  style={{ background: 'linear-gradient(135deg, rgba(14,14,36,0.7), rgba(8,8,24,0.9))' }}
                >
                  {/* Layer gradient overlay */}
                  {!isLocked && <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} pointer-events-none`} />}

                  {/* Layer header */}
                  <div className="relative px-5 py-4 border-b border-gray-700/30">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLocked ? 'bg-gray-800/50' : 'bg-gray-800/80 border border-gray-600/40'} shadow-lg`}>
                        <config.Icon size={24} style={{ color: isLocked ? '#4b5563' : config.color }} />
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-xl sm:text-2xl font-black ${isLocked ? 'text-gray-500' : 'text-gray-100'} tracking-wider`}>{layer.name}</h3>
                        <div className={`h-1 mt-1.5 rounded-full w-32 ${isLocked ? 'bg-gray-700/30' : `bg-gradient-to-r`} `} style={!isLocked ? { background: `linear-gradient(to right, ${config.color}60, transparent)` } : undefined} />
                        <p className="text-xs text-gray-500 mt-1">{layer.subtitle}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {allDone && (
                          <span className="px-3 py-1.5 bg-green-900/40 border border-green-500/40 rounded-lg text-green-400 text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-green-500/10">
                            <Check size={14} /> 已通关
                          </span>
                        )}
                        {isLocked && (
                          <span className="px-3 py-1.5 bg-gray-800/40 border border-gray-600/30 rounded-lg text-gray-500 text-sm flex items-center gap-1.5">
                            <Lock size={14} /> 未解锁
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Nodes area */}
                  <div className="relative p-4 sm:p-5">
                    {/* Path connector line */}
                    <div className="absolute top-1/2 left-6 right-6 h-0.5 -translate-y-1/2 pointer-events-none">
                      <div className={`h-full rounded-full ${isLocked ? 'bg-gray-700/20' : 'bg-gradient-to-r'}`} style={!isLocked ? { background: `linear-gradient(to right, ${config.color}30, ${config.color}10, ${config.color}30)` } : undefined} />
                      {/* Animated dots on path */}
                      {!isLocked && !allDone && (
                        <div className="absolute inset-0 overflow-hidden">
                          <div className="absolute top-0 left-0 w-16 h-full animate-path-flow" style={{ background: `linear-gradient(to right, transparent, ${config.color}40, transparent)` }} />
                        </div>
                      )}
                    </div>

                    {/* Nodes */}
                    <div className="relative flex gap-4 sm:gap-6 items-start overflow-x-auto pb-2 scroll-snap-x">
                      {layer.columns.map((col, colIdx) => {
                        const available = isColumnAvailable(layer, colIdx, nextCol);
                        return (
                          <div key={colIdx} className="flex flex-col gap-3 flex-shrink-0 scroll-snap-center relative">
                            {/* Column connector */}
                            {colIdx > 0 && (
                              <div className="absolute top-1/2 -left-4 sm:-left-6 w-4 sm:w-6 pointer-events-none flex items-center">
                                <ChevronRight size={16} style={{ color: available ? config.color : '#374151' }} className={available ? 'animate-pulse' : 'opacity-30'} />
                              </div>
                            )}

                            {/* Current position indicator */}
                            {available && (
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                                <div className="w-4 h-4 rounded-full animate-pulse" style={{ background: config.color, boxShadow: `0 0 20px ${config.glow}` }} />
                              </div>
                            )}

                            {col.map((node, nodeIdx) => {
                              const enemyInfo = getEnemyInfo(node);
                              const isDone = node.type === 'battle' || node.type === 'elite' ? node.defeated : node.visited;
                              const nodeConfig = NODE_TYPE_ICONS[node.type] || NODE_TYPE_ICONS.battle;
                              const enemyIcon = enemyInfo ? ENEMY_ICONS[enemyInfo.templateId] : null;
                              const isClickable = available && !isDone;

                              return (
                                <button
                                  key={nodeIdx}
                                  onClick={() => isClickable && onSelectNode(layerIndex, colIdx, nodeIdx)}
                                  className={`
                                    relative flex flex-col items-center gap-2 px-5 py-4 rounded-xl border-2 transition-all duration-300 touch-target min-w-[100px] sm:min-w-[110px]
                                    ${isDone
                                      ? 'bg-gray-800/30 border-gray-600/20 opacity-40 cursor-default'
                                      : isClickable
                                        ? `border-gray-600/40 hover:scale-110 active:scale-95 cursor-pointer`
                                        : 'bg-gray-900/40 border-gray-700/20 cursor-not-allowed opacity-30'
                                    }
                                  `}
                                  style={isClickable ? {
                                    background: `linear-gradient(135deg, ${nodeConfig.color}15, ${nodeConfig.color}05)`,
                                    borderColor: `${nodeConfig.color}50`,
                                    boxShadow: `0 0 20px ${nodeConfig.glow}`,
                                  } : undefined}
                                >
                                  {/* Glow effect for available nodes */}
                                  {isClickable && (
                                    <div className="absolute inset-0 rounded-xl opacity-30 blur-md -z-10" style={{ background: nodeConfig.color }} />
                                  )}

                                  {/* Elite indicator */}
                                  {node.type === 'elite' && !isDone && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-orange-400 z-10">
                                      <Skull size={12} className="text-white" />
                                    </div>
                                  )}

                                  {/* Node icon */}
                                  <div className="relative">
                                    {enemyIcon ? (
                                      <GameIcon icon={enemyIcon.icon} size={40} color={isDone ? '#4b5563' : enemyIcon.color} />
                                    ) : (
                                      <GameIcon icon={nodeConfig.icon} size={36} color={isDone ? '#4b5563' : nodeConfig.color} />
                                    )}
                                  </div>

                                  {/* Node label */}
                                  <span className={`text-xs sm:text-sm font-bold tracking-wider ${isDone ? 'text-gray-600 line-through' : ''}`} style={!isDone ? { color: nodeConfig.color } : undefined}>
                                    {enemyInfo ? enemyInfo.name : NODE_LABELS[node.type]}
                                  </span>

                                  {/* HP for enemies */}
                                  {enemyInfo && !isDone && (
                                    <span className="text-[10px] text-gray-500 font-medium px-2 py-0.5 bg-gray-800/50 rounded-full">
                                      HP {enemyInfo.hp}
                                    </span>
                                  )}

                                  {/* Done checkmark */}
                                  {isDone && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <Check size={24} className="text-green-500/60" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MapScreen;
