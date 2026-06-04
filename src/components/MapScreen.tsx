import React from 'react';
import type { MapLayer, MapNode } from '../types/game';
import { getEnemyTemplate } from '../data/enemies';

interface MapScreenProps {
  mapLayers: MapLayer[];
  playerHp: number;
  playerMaxHp: number;
  gold: number;
  onSelectNode: (layerIndex: number, colIndex: number, nodeIndex: number) => void;
  onOpenDeck: () => void;
  deckSize: number;
}

const nodeIcons: Record<string, string> = {
  battle: '⚔️',
  elite: '💀',
  shop: '🏪',
  event: '❓',
  rest: '🏕️',
};

const nodeLabels: Record<string, string> = {
  battle: '战斗',
  elite: '精英',
  shop: '商店',
  event: '事件',
  rest: '休息',
};

const nodeColors: Record<string, { bg: string; border: string; glow: string; text: string }> = {
  battle: {
    bg: 'bg-gradient-to-br from-red-900/40 to-red-950/30',
    border: 'border-red-500/50',
    glow: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]',
    text: 'text-red-400',
  },
  elite: {
    bg: 'bg-gradient-to-br from-orange-900/40 to-orange-950/30',
    border: 'border-orange-500/50',
    glow: 'hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]',
    text: 'text-orange-400',
  },
  shop: {
    bg: 'bg-gradient-to-br from-yellow-900/40 to-yellow-950/30',
    border: 'border-yellow-500/50',
    glow: 'hover:shadow-[0_0_20px_rgba(212,164,76,0.3)]',
    text: 'text-yellow-400',
  },
  event: {
    bg: 'bg-gradient-to-br from-purple-900/40 to-purple-950/30',
    border: 'border-purple-500/50',
    glow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]',
    text: 'text-purple-400',
  },
  rest: {
    bg: 'bg-gradient-to-br from-green-900/40 to-green-950/30',
    border: 'border-green-500/50',
    glow: 'hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]',
    text: 'text-green-400',
  },
};

const MapScreen: React.FC<MapScreenProps> = ({
  mapLayers,
  playerHp,
  playerMaxHp,
  gold,
  onSelectNode,
  onOpenDeck,
  deckSize,
}) => {
  const layerIcons = ['🌲', '🌋', '🐉'];
  const layerThemes = [
    { gradient: 'from-green-900/20 via-emerald-900/10 to-transparent', accent: 'emerald' },
    { gradient: 'from-orange-900/20 via-red-900/10 to-transparent', accent: 'orange' },
    { gradient: 'from-purple-900/20 via-indigo-900/10 to-transparent', accent: 'purple' },
  ];

  /** Find the next available column index in a layer */
  const getNextColumn = (layer: MapLayer): number => {
    for (let i = 0; i < layer.columns.length; i++) {
      const col = layer.columns[i];
      const anyAvailable = col.some(n => {
        if (n.type === 'battle' || n.type === 'elite') return !n.defeated;
        return !n.visited;
      });
      if (anyAvailable) return i;
    }
    return -1;
  };

  /** Check if a column is available to click */
  const isColumnAvailable = (layer: MapLayer, colIndex: number, nextCol: number): boolean => {
    if (!layer.unlocked) return false;
    return colIndex === nextCol;
  };

  const getNodeStyle = (node: MapNode, available: boolean) => {
    const isDone = node.type === 'battle' || node.type === 'elite'
      ? node.defeated
      : node.visited;
    const colors = nodeColors[node.type] || nodeColors.battle;

    if (isDone) {
      return 'bg-gray-800/30 border-gray-600/20 opacity-40 cursor-default';
    }
    if (!available) {
      return 'bg-gray-900/40 border-gray-700/20 cursor-not-allowed opacity-30';
    }
    return `${colors.bg} ${colors.border} ${colors.glow} hover:scale-110 active:scale-95 cursor-pointer`;
  };

  const getEnemyInfo = (node: MapNode) => {
    const templateId = node.enemyTemplateId;
    if (!templateId) return null;
    const template = getEnemyTemplate(templateId);
    if (!template) return null;

    let hp = template.maxHp;
    let displayName = template.name;
    if (node.type === 'elite') {
      hp = Math.floor(hp * 1.5);
      displayName = `${template.name}`;
    }
    return { emoji: template.emoji, name: displayName, hp, isElite: node.type === 'elite' };
  };

  const hpPercent = Math.max(0, (playerHp / playerMaxHp) * 100);

  return (
    <div className="h-full flex flex-col bg-rune-pattern overflow-y-auto">
      {/* ===== Player Status Bar ===== */}
      <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-gray-900/80 border-b border-gray-700/40 flex-shrink-0 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {/* HP */}
          <div className="flex items-center gap-2">
            <span className="text-lg">🧙</span>
            <div className="flex flex-col gap-0.5">
              <div className="w-24 sm:w-32 h-2.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700/50">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${hpPercent > 30 ? 'hp-bar' : 'hp-bar-low'}`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
              <span className={`text-[10px] font-bold ${hpPercent > 30 ? 'text-green-400' : 'text-red-400'}`}>
                {playerHp}/{playerMaxHp}
              </span>
            </div>
          </div>

          {/* Gold */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-900/30 rounded-lg border border-yellow-500/30">
            <span className="text-base">🪙</span>
            <span className="text-sm text-yellow-400 font-bold">{gold}</span>
          </div>
        </div>

        {/* Deck viewer button */}
        <button
          onClick={onOpenDeck}
          className="
            touch-target flex items-center gap-1.5 px-3 py-1.5 rounded-lg
            bg-gray-800/60 border border-gray-600/40
            text-gray-300 text-xs font-bold
            hover:text-gray-100 hover:bg-gray-700/60 hover:border-rune-purple/50 hover:scale-105
            active:bg-gray-600/60 active:scale-95
            transition-all duration-200
          "
        >
          <span className="text-base">📜</span>
          <span>牌库 ({deckSize})</span>
        </button>
      </div>

      {/* ===== Map Content ===== */}
      <div className="flex-1 flex flex-col items-center p-4 sm:p-6">
        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-rune-gold tracking-wider fantasy-text mb-1">
            🗺️ 冒险地图
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">选择你的道路，击败所有敌人</p>
        </div>

        {/* Layers */}
        <div className="flex flex-col gap-6 sm:gap-8 w-full max-w-2xl">
          {mapLayers.map((layer, layerIndex) => {
            const allDone = layer.columns.every(col =>
              col.every(n => {
                if (n.type === 'battle' || n.type === 'elite') return n.defeated;
                return n.visited;
              })
            );
            const isLocked = !layer.unlocked;
            const nextCol = getNextColumn(layer);
            const theme = layerThemes[layerIndex] || layerThemes[0];

            return (
              <div
                key={layerIndex}
                className={`
                  relative rounded-2xl border-2 p-4 sm:p-5
                  transition-all duration-500
                  ${isLocked
                    ? 'border-gray-700/20 opacity-30 grayscale'
                    : allDone
                      ? 'border-green-500/30 opacity-70'
                      : 'border-gray-600/40'
                  }
                `}
                style={{
                  background: isLocked
                    ? 'linear-gradient(135deg, rgba(8,8,24,0.8), rgba(8,8,24,0.9))'
                    : `linear-gradient(135deg, rgba(14,14,36,0.6), rgba(8,8,24,0.8))`,
                }}
              >
                {/* Layer background glow */}
                {!isLocked && (
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${theme.gradient} pointer-events-none`} />
                )}

                {/* Layer header */}
                <div className="relative flex items-center gap-3 mb-4">
                  <div className="text-3xl sm:text-4xl">{layerIcons[layerIndex] || '📍'}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-lg sm:text-xl font-bold fantasy-text ${isLocked ? 'text-gray-500' : 'text-gray-100'}`}>
                      {layer.name}
                    </h3>
                    <div className={`h-1 mt-1 rounded-full bg-gradient-to-r from-rune-purple/50 via-rune-gold/30 to-transparent ${isLocked ? 'opacity-20' : ''}`} />
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{layer.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {allDone && (
                      <span className="px-2 py-1 bg-green-900/40 border border-green-500/40 rounded-lg text-green-400 text-xs font-bold">
                        ✅ 已通关
                      </span>
                    )}
                    {isLocked && (
                      <span className="px-2 py-1 bg-gray-800/40 border border-gray-600/30 rounded-lg text-gray-500 text-xs">
                        🔒 未解锁
                      </span>
                    )}
                  </div>
                </div>

                {/* Columns / branching nodes */}
                <div className="relative flex gap-3 sm:gap-5 items-start overflow-x-auto pb-2 scroll-snap-x">
                  {layer.columns.map((col, colIdx) => {
                    const available = isColumnAvailable(layer, colIdx, nextCol);

                    return (
                      <div key={colIdx} className="flex flex-col gap-2 sm:gap-3 flex-shrink-0 scroll-snap-center relative">
                        {/* Connector line */}
                        {colIdx > 0 && (
                          <div className="absolute top-1/2 -left-3 sm:-left-5 w-3 sm:w-5 h-0.5 pointer-events-none">
                            <div className={`h-full ${available ? 'bg-gradient-to-r from-rune-purple/40 to-rune-purple/20' : 'bg-gray-700/20'}`} />
                          </div>
                        )}

                        {/* Current position indicator */}
                        {available && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-rune-gold rounded-full animate-pulse shadow-[0_0_12px_rgba(212,164,76,0.8)] z-20" />
                        )}

                        {col.map((node, nodeIdx) => {
                          const enemyInfo = getEnemyInfo(node);
                          const isDone = node.type === 'battle' || node.type === 'elite'
                            ? node.defeated
                            : node.visited;
                          const colors = nodeColors[node.type] || nodeColors.battle;

                          return (
                            <button
                              key={nodeIdx}
                              onClick={() => {
                                if (getNodeStyle(node, available).includes('cursor-pointer')) {
                                  onSelectNode(layerIndex, colIdx, nodeIdx);
                                }
                              }}
                              className={`
                                relative flex flex-col items-center gap-1 px-4 sm:px-5 py-3 sm:py-4 rounded-xl
                                border-2 transition-all duration-300 touch-target min-w-[80px] sm:min-w-[90px]
                                ${getNodeStyle(node, available)}
                              `}
                            >
                              {/* Node glow effect */}
                              {available && !isDone && (
                                <div className={`absolute inset-0 rounded-xl ${colors.bg} opacity-50 blur-sm -z-10`} />
                              )}

                              {/* Elite indicator */}
                              {node.type === 'elite' && !isDone && (
                                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-[10px] shadow-lg border border-orange-400">
                                  ⚡
                                </div>
                              )}

                              {/* Node icon */}
                              <span className="text-2xl sm:text-3xl drop-shadow-lg">
                                {enemyInfo ? enemyInfo.emoji : (nodeIcons[node.type] || '📍')}
                              </span>

                              {/* Node label */}
                              <span className={`text-[10px] sm:text-xs font-bold ${
                                isDone ? 'text-gray-600 line-through' : colors.text
                              }`}>
                                {enemyInfo ? enemyInfo.name : nodeLabels[node.type] || '???'}
                              </span>

                              {/* HP for enemies */}
                              {enemyInfo && !isDone && (
                                <span className="text-[9px] text-gray-500 font-medium">
                                  HP {enemyInfo.hp}
                                </span>
                              )}

                              {/* Done indicator */}
                              {isDone && (
                                <span className="text-sm text-green-500">✓</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
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
