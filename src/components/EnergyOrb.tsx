import React from 'react';

interface EnergyOrbProps {
  current: number;
  max: number;
}

const EnergyOrb: React.FC<EnergyOrbProps> = ({ current, max }) => {
  const isOverMax = current > max;

  const segments = [];
  for (let i = 0; i < max; i++) {
    const isFilled = i < current;
    segments.push(
      <div
        key={i}
        className={`
          w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 transition-all duration-300
          ${isFilled
            ? 'bg-rune-gold border-rune-gold shadow-[0_0_8px_rgba(212,164,76,0.6)]'
            : 'bg-gray-800 border-gray-600'
          }
        `}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-1 sm:gap-1.5">
      {/* Energy number */}
      <div className="relative">
        <div className={`
          w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-amber-900/60 to-rune-dark border-2 border-rune-gold/50 flex items-center justify-center
          ${isOverMax ? 'animate-pulse' : 'animate-glow-gold'}
        `}>
          <span className={`text-lg sm:text-xl font-bold drop-shadow-lg ${
            isOverMax ? 'text-amber-300 animate-pulse' : 'text-rune-gold'
          }`}>
            {current}
          </span>
        </div>
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-full border border-rune-gold/20 animate-ping opacity-30" />
      </div>

      {/* Label */}
      <span className="text-[9px] sm:text-[10px] text-rune-gold/70 font-bold tracking-wider">能量</span>

      {/* Segments */}
      <div className="flex gap-0.5 sm:gap-1">
        {segments}
      </div>
    </div>
  );
};

export default EnergyOrb;
