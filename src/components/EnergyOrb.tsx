import React from 'react';

interface EnergyOrbProps {
  current: number;
  max: number;
}

const EnergyOrb: React.FC<EnergyOrbProps> = ({ current, max }) => {
  const isOverMax = current > max;
  const hasEnergy = current > 0;
  const fillPercent = Math.min(100, (current / max) * 100);
  const isLow = current <= 1 && hasEnergy;

  const segments = [];
  for (let i = 0; i < max; i++) {
    const isFilled = i < current;
    segments.push(
      <div
        key={i}
        className={`
          w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border-2 transition-all duration-300
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
      {/* Energy number with enhanced orb */}
      <div className="relative">
        {/* Outer glow ring */}
        {hasEnergy && (
          <div className={`absolute -inset-2 rounded-full ${isOverMax ? 'animate-pulse-glow' : 'animate-pulse-glow'} opacity-70`} />
        )}

        {/* Orb container with rotation */}
        <div className={`
          relative w-16 h-16 sm:w-18 sm:h-18 rounded-full
          bg-gradient-to-br from-amber-900/60 to-rune-dark
          border-2 border-rune-gold/50
          flex items-center justify-center
          overflow-hidden
          ${hasEnergy && !isOverMax ? 'animate-spin-slow' : ''}
          ${isOverMax ? 'animate-pulse' : hasEnergy ? '' : ''}
        `}>
          {/* Energy fill gradient */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-rune-gold/30 to-amber-400/10 transition-all duration-500"
            style={{ height: `${fillPercent}%` }}
          />

          {/* Number */}
          <span className={`relative z-10 text-2xl sm:text-3xl font-bold drop-shadow-lg ${
            isOverMax ? 'text-amber-300 animate-pulse' : isLow ? 'text-amber-200 animate-pulse' : 'text-rune-gold'
          }`}>
            {current}
          </span>
        </div>

        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-full border border-rune-gold/20 animate-ping opacity-30" />
      </div>

      {/* Label */}
      <span className="text-[10px] sm:text-xs text-rune-gold/70 font-bold tracking-wider fantasy-text">能量</span>

      {/* Segments */}
      <div className="flex gap-1 sm:gap-1">
        {segments}
      </div>
    </div>
  );
};

export default EnergyOrb;
