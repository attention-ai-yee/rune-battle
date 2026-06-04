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

  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
      {/* Energy orb */}
      <div className="relative">
        {/* Outer glow */}
        {hasEnergy && (
          <div className={`absolute -inset-3 rounded-full ${isOverMax ? 'bg-amber-400/15' : 'bg-amber-500/10'} blur-xl animate-pulse-glow`} />
        )}

        {/* Orb */}
        <div
          className={`
            relative w-16 h-16 sm:w-20 sm:h-20 rounded-full
            border-2 flex items-center justify-center
            overflow-hidden transition-all duration-300
            ${isOverMax
              ? 'border-amber-300 shadow-[0_0_25px_rgba(212,164,76,0.5)] animate-pulse'
              : hasEnergy
                ? 'border-amber-400/70 shadow-[0_0_15px_rgba(212,164,76,0.3)]'
                : 'border-gray-600/50 shadow-none'
            }
          `}
          style={{
            background: hasEnergy
              ? `linear-gradient(180deg, rgba(212,164,76,0.2) 0%, rgba(8,8,24,0.9) 100%)`
              : 'linear-gradient(180deg, rgba(20,20,40,0.8) 0%, rgba(8,8,24,0.95) 100%)',
          }}
        >
          {/* Energy fill */}
          <div
            className="absolute bottom-0 left-0 right-0 transition-all duration-500"
            style={{
              height: `${fillPercent}%`,
              background: 'linear-gradient(180deg, rgba(212,164,76,0.4) 0%, rgba(212,164,76,0.15) 100%)',
            }}
          />

          {/* Inner glow */}
          {hasEnergy && (
            <div className="absolute inset-2 rounded-full bg-amber-400/5 blur-md" />
          )}

          {/* Number */}
          <span
            className={`relative z-10 text-2xl sm:text-3xl font-black transition-all duration-300 ${
              isOverMax ? 'text-amber-200 animate-pulse' : isLow ? 'text-amber-300 animate-pulse' : 'text-amber-400'
            }`}
            style={{ textShadow: '0 0 15px rgba(212,164,76,0.5), 0 2px 4px rgba(0,0,0,0.5)' }}
          >
            {current}
          </span>
        </div>

        {/* Ping ring */}
        {hasEnergy && <div className="absolute inset-0 rounded-full border border-amber-400/20 animate-ping opacity-20" />}
      </div>

      {/* Label */}
      <span className="text-[10px] sm:text-xs text-amber-400/60 font-bold tracking-widest">能量</span>

      {/* Segments */}
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => (
          <div
            key={i}
            className={`
              w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full transition-all duration-300
              ${i < current
                ? 'bg-amber-400 shadow-[0_0_6px_rgba(212,164,76,0.5)]'
                : 'bg-gray-700/50 border border-gray-600/30'
              }
            `}
          />
        ))}
      </div>
    </div>
  );
};

export default EnergyOrb;
