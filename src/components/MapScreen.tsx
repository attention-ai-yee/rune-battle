import React from 'react';
import type { GameState, MapLayer } from '../types/game';
import { getEnemyTemplate } from '../data/enemies';

interface MapScreenProps {
  mapLayers: MapLayer[];
  onSelectNode: (layerIndex: number, nodeIndex: number) => void;
}

const MapScreen: React.FC<MapScreenProps> = ({ mapLayers, onSelectNode }) => {
  const layerIcons = ['🌲', '🌋', '🐉'];
  const layerColors = [
    'from-green-900/30 to-green-950/10',
    'from-orange-900/30 to-red-950/10',
    'from-purple-900/30 to-indigo-950/10',
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-3 sm:p-6 bg-rune-pattern overflow-y-auto">
      {/* Title */}
      <h2 className="text-xl sm:text-2xl font-bold text-rune-gold mb-1 tracking-wider">🗺️ 地图</h2>
      <p className="text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">选择一个敌人开始战斗</p>

      {/* Layers */}
      <div className="flex flex-col gap-3 sm:gap-6 w-full max-w-lg">
        {mapLayers.map((layer, layerIndex) => {
          const allDefeated = layer.nodes.every(n => n.defeated);
          const isLocked = !layer.unlocked;

          return (
            <div
              key={layerIndex}
              className={`
                rounded-xl border-2 p-3 sm:p-5
                bg-gradient-to-r ${layerColors[layerIndex] || layerColors[0]}
                transition-all duration-300
                ${isLocked
                  ? 'border-gray-700/30 opacity-40 grayscale'
                  : allDefeated
                    ? 'border-rune-green/40 opacity-70'
                    : 'border-gray-600/50 hover:border-rune-gold/50'
                }
              `}
            >
              {/* Layer header */}
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <span className="text-xl sm:text-2xl">{layerIcons[layerIndex] || '📍'}</span>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm sm:text-lg font-bold ${isLocked ? 'text-gray-500' : 'text-gray-200'}`}>
                    {layer.name}
                  </h3>
                  <p className="text-[9px] sm:text-xs text-gray-500">{layer.subtitle}</p>
                </div>
                {allDefeated && (
                  <span className="text-rune-green text-xs sm:text-sm font-bold">✅ 已清除</span>
                )}
                {isLocked && (
                  <span className="text-gray-600 text-xs sm:text-sm">🔒 未解锁</span>
                )}
              </div>

              {/* Enemy nodes - horizontal scroll on mobile */}
              <div className="flex gap-2 sm:gap-3 ml-6 sm:ml-10 overflow-x-auto scroll-snap-x pb-1">
                {layer.nodes.map((node, nodeIndex) => {
                  const template = getEnemyTemplate(node.enemyTemplateId);
                  if (!template) return null;

                  const canClick = !isLocked && !node.defeated;

                  return (
                    <button
                      key={nodeIndex}
                      onClick={canClick ? () => onSelectNode(layerIndex, nodeIndex) : undefined}
                      disabled={!canClick}
                      className={`
                        flex flex-col items-center gap-0.5 sm:gap-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg
                        border-2 transition-all duration-200 touch-target scroll-snap-center flex-shrink-0
                        ${node.defeated
                          ? 'bg-gray-800/40 border-rune-green/30 opacity-50 cursor-default'
                          : canClick
                            ? 'bg-gray-800/60 border-gray-600/50 hover:border-rune-gold hover:bg-gray-700/60 hover:scale-105 active:bg-gray-600/60 active:scale-95 cursor-pointer'
                            : 'bg-gray-900/60 border-gray-700/30 cursor-not-allowed opacity-50'
                        }
                      `}
                    >
                      <span className="text-xl sm:text-2xl">{template.emoji}</span>
                      <span className={`text-[9px] sm:text-xs font-bold ${node.defeated ? 'text-gray-600 line-through' : 'text-gray-300'}`}>
                        {template.name}
                      </span>
                      <span className="text-[8px] sm:text-[10px] text-gray-500">
                        HP {template.maxHp}
                      </span>
                      {node.defeated && (
                        <span className="text-[8px] sm:text-[10px] text-rune-green">✅ 击败</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MapScreen;
