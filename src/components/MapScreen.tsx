import React from 'react';
import type { MapLayer, MapNode } from '../types/game';
import { getEnemyTemplate } from '../data/enemies';

interface MapScreenProps {
  mapLayers: MapLayer[];
  playerHp: number;
  playerMaxHp: number;
  gold: number;
  onSelectNode: (layerIndex: number, colIndex: number, nodeIndex: number) => void;
}

const nodeIcons: Record<string, string> = {
  battle: '⚔️',
  elite: '⚡',
  shop: '🏪',
  event: '❓',
  rest: '🔥',
};

const nodeLabels: Record<string, string> = {
  battle: '战斗',
  elite: '精英',
  shop: '商店',
  event: '事件',
  rest: '休息',
};

const MapScreen: React.FC<MapScreenProps> = ({
  mapLayers,
  playerHp,
  playerMaxHp,
  gold,
  onSelectNode,
}) => {
  const layerIcons = ['🌲', '🌋', '🐉'];
  const layerColors = [
    'from-green-900/30 to-green-950/10',
    'from-orange-900/30 to-red-950/10',
    'from-purple-900/30 to-indigo-950/10',
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
    return -1; // all columns cleared
  };

  /** Check if a column is available to click */
  const isColumnAvailable = (layer: MapLayer, colIndex: number, nextCol: number): boolean => {
    if (!layer.unlocked) return false;
    // Only the next available column can be clicked
    return colIndex === nextCol;
  };

  const getNodeStyle = (node: MapNode, available: boolean) => {
    const isDone = node.type === 'battle' || node.type === 'elite'
      ? node.defeated
      : node.visited;

    if (isDone) {
      return 'bg-gray-800/40 border-rune-green/30 opacity-50 cursor-default';
    }
    if (!available) {
      return 'bg-gray-900/60 border-gray-700/30 cursor-not-allowed opacity-40';
    }
    // Elite gets a redder border
    if (node.type === 'elite') {
      return 'bg-gray-800/60 border-rune-red/50 hover:border-rune-red hover:bg-gray-700/60 hover:scale-105 active:bg-gray-600/60 active:scale-95 cursor-pointer';
    }
    return 'bg-gray-800/60 border-gray-600/50 hover:border-rune-gold hover:bg-gray-700/60 hover:scale-105 active:bg-gray-600/60 active:scale-95 cursor-pointer';
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
      displayName = `${template.name} (精英)`;
    }
    return { emoji: template.emoji, name: displayName, hp };
  };

  return (
    <div className="h-full flex flex-col bg-rune-pattern overflow-y-auto">
      {/* Player status bar */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 p-2 sm:p-3 bg-gray-900/60 border-b border-gray-700/50 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-rune-red font-bold text-xs sm:text-sm">
            ❤️ {playerHp}/{playerMaxHp}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-rune-gold font-bold text-xs sm:text-sm">
            🪙 {gold}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center p-3 sm:p-4">
        {/* Title */}
        <h2 className="text-lg sm:text-xl font-bold text-rune-gold mb-1 tracking-wider fantasy-text">🗺️ 地图</h2>
        <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">选择路径前进</p>

        {/* Layers */}
        <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-xl">
          {mapLayers.map((layer, layerIndex) => {
            const allDone = layer.columns.every(col =>
              col.every(n => {
                if (n.type === 'battle' || n.type === 'elite') return n.defeated;
                return n.visited;
              })
            );
            const isLocked = !layer.unlocked;
            const nextCol = getNextColumn(layer);

            return (
              <div
                key={layerIndex}
                className={`
                  rounded-xl border-2 p-3 sm:p-4
                  bg-gradient-to-r ${layerColors[layerIndex] || layerColors[0]}
                  transition-all duration-300
                  ${isLocked
                    ? 'border-gray-700/30 opacity-40 grayscale'
                    : allDone
                      ? 'border-rune-green/40'
                      : 'border-gray-600/50'
                  }
                `}
                style={{
                  opacity: isLocked ? 0.4 : allDone ? 0.7 : 0.92 + layerIndex * 0.04,
                  transform: `scale(${isLocked ? 0.97 : allDone ? 0.98 : 1})`,
                  transition: 'opacity 0.5s, transform 0.5s',
                }}
              >
                {/* Layer header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl sm:text-2xl">{layerIcons[layerIndex] || '📍'}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm sm:text-lg font-bold fantasy-text ${isLocked ? 'text-gray-500' : 'text-gray-200'}`}>
                      {layer.name}
                    </h3>
                    {/* Gradient underline */}
                    <div className={`h-0.5 mt-0.5 rounded-full bg-gradient-to-r from-rune-purple/60 via-rune-gold/40 to-transparent ${isLocked ? 'opacity-30' : ''}`} />
                    <p className="text-[9px] sm:text-xs text-gray-500 mt-0.5">{layer.subtitle}</p>
                  </div>
                  {allDone && (
                    <span className="text-rune-green text-xs sm:text-sm font-bold">✅ 已清除</span>
                  )}
                  {isLocked && (
                    <span className="text-gray-600 text-xs sm:text-sm">🔒 未解锁</span>
                  )}
                </div>

                {/* Columns / branching nodes */}
                <div className="flex gap-2 sm:gap-4 items-start overflow-x-auto pb-1 scroll-snap-x relative">
                  {layer.columns.map((col, colIdx) => {
                    const available = isColumnAvailable(layer, colIdx, nextCol);

                    return (
                      <div key={colIdx} className="flex flex-col gap-1.5 sm:gap-2 flex-shrink-0 scroll-snap-center relative">
                        {/* Column connector line using SVG */}
                        {colIdx > 0 && (
                          <div className="absolute top-0 -left-2 sm:-left-4 pointer-events-none" style={{ width: '8px', height: '100%' }}>
                            <svg width="8" height="100%" className="sm:w-4">
                              <line x1="0" y1="30%" x2="8" y2="30%" stroke="rgba(168,85,247,0.2)" strokeWidth="1.5" strokeDasharray="3,3" />
                            </svg>
                          </div>
                        )}

                        {/* Current position indicator */}
                        {available && (
                          <div className="absolute -top-1.5 -left-0.5 sm:-top-2 sm:-left-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-rune-gold rounded-full animate-pulse shadow-[0_0_8px_rgba(212,164,76,0.6)] z-20" />
                        )}

                        {col.map((node, nodeIdx) => {
                          const enemyInfo = getEnemyInfo(node);
                          const isDone = node.type === 'battle' || node.type === 'elite'
                            ? node.defeated
                            : node.visited;

                          return (
                            <button
                              key={nodeIdx}
                              onClick={() => {
                                if (getNodeStyle(node, available).includes('cursor-pointer')) {
                                  onSelectNode(layerIndex, colIdx, nodeIdx);
                                }
                              }}
                              className={`
                                flex flex-col items-center gap-0.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg
                                border-2 transition-all duration-200 touch-target min-w-[72px] sm:min-w-[80px]
                                ${getNodeStyle(node, available)}
                              `}
                            >
                              {/* Node icon */}
                              <span className="text-xl sm:text-2xl">
                                {enemyInfo ? enemyInfo.emoji : (nodeIcons[node.type] || '📍')}
                              </span>

                              {/* Node type indicator */}
                              {node.type === 'elite' && (
                                <span className="absolute -top-1 -right-1 text-xs">⚡</span>
                              )}

                              {/* Node label */}
                              <span className={`text-[9px] sm:text-[10px] font-bold fantasy-text ${
                                isDone ? 'text-gray-600 line-through' : 'text-gray-300'
                              }`}>
                                {enemyInfo ? enemyInfo.name : nodeLabels[node.type] || '???'}
                              </span>

                              {/* HP for enemies */}
                              {enemyInfo && (
                                <span className="text-[8px] text-gray-500">
                                  HP {enemyInfo.hp}
                                </span>
                              )}

                              {/* Status indicator */}
                              {isDone && (
                                <span className="text-[8px] sm:text-[10px] text-rune-green">✅</span>
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
