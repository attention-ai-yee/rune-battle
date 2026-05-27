/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'rune-dark': '#080818',
        'rune-bg': '#0e0e24',
        'rune-card': '#1a1a3e',
        'rune-card-hover': '#252550',
        'rune-gold': '#d4a44c',
        'rune-red': '#ef4444',
        'rune-blue': '#3b82f6',
        'rune-purple': '#a855f7',
        'rune-green': '#22c55e',
        'rune-rare': '#34d399',
        'rune-epic': '#fbbf24',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'card-play': 'cardPlay 0.4s ease-out forwards',
        'shake': 'shake 0.4s ease-in-out',
        'float': 'float 3s ease-in-out infinite',
        'glow-red': 'glowRed 2s ease-in-out infinite alternate',
        'glow-blue': 'glowBlue 2s ease-in-out infinite alternate',
        'glow-purple': 'glowPurple 2s ease-in-out infinite alternate',
        'glow-gold': 'glowGold 2s ease-in-out infinite alternate',
        'glow-rare': 'glowRare 2s ease-in-out infinite alternate',
        'glow-epic': 'glowEpic 2s ease-in-out infinite alternate',
        'enemy-intent': 'intentBounce 1.5s ease-in-out infinite',
        'damage-flash': 'damageFlash 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'enemy-hit': 'enemyHit 0.4s ease-out',
        'float-up': 'floatUp 0.8s ease-out forwards',
        'float-up-green': 'floatUpGreen 0.8s ease-out forwards',
        'float-up-blue': 'floatUpBlue 0.8s ease-out forwards',
        'float-up-purple': 'floatUpPurple 0.8s ease-out forwards',
        'card-play-anim': 'cardPlay 0.4s ease-out forwards',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'border-epic': 'borderEpic 3s ease-in-out infinite',
      },
      keyframes: {
        cardPlay: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '50%': { transform: 'translateY(-40px) scale(1.05)', opacity: '0.8' },
          '100%': { transform: 'translateY(-100px) scale(0.7)', opacity: '0' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glowRed: {
          '0%': { boxShadow: '0 0 5px #ef4444, 0 0 10px rgba(239,68,68,0.3)' },
          '100%': { boxShadow: '0 0 10px #ef4444, 0 0 20px rgba(239,68,68,0.5), 0 0 30px rgba(239,68,68,0.2)' },
        },
        glowBlue: {
          '0%': { boxShadow: '0 0 5px #3b82f6, 0 0 10px rgba(59,130,246,0.3)' },
          '100%': { boxShadow: '0 0 10px #3b82f6, 0 0 20px rgba(59,130,246,0.5), 0 0 30px rgba(59,130,246,0.2)' },
        },
        glowPurple: {
          '0%': { boxShadow: '0 0 5px #a855f7, 0 0 10px rgba(168,85,247,0.3)' },
          '100%': { boxShadow: '0 0 10px #a855f7, 0 0 20px rgba(168,85,247,0.5), 0 0 30px rgba(168,85,247,0.2)' },
        },
        glowGold: {
          '0%': { boxShadow: '0 0 5px #d4a44c, 0 0 10px rgba(212,164,76,0.3)' },
          '100%': { boxShadow: '0 0 10px #d4a44c, 0 0 20px rgba(212,164,76,0.5), 0 0 30px rgba(212,164,76,0.2)' },
        },
        glowRare: {
          '0%': { boxShadow: '0 0 5px #34d399, 0 0 10px rgba(52,211,153,0.3)' },
          '100%': { boxShadow: '0 0 10px #34d399, 0 0 20px rgba(52,211,153,0.5)' },
        },
        glowEpic: {
          '0%': { boxShadow: '0 0 5px #fbbf24, 0 0 10px rgba(251,191,36,0.3)' },
          '100%': { boxShadow: '0 0 10px #fbbf24, 0 0 20px rgba(251,191,36,0.5), 0 0 30px rgba(251,191,36,0.2)' },
        },
        intentBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        damageFlash: {
          '0%': { backgroundColor: 'rgba(239,68,68,0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        enemyHit: {
          '0%': { transform: 'translateX(0)', filter: 'brightness(1)' },
          '25%': { transform: 'translateX(-5px)', filter: 'brightness(2)' },
          '50%': { transform: 'translateX(5px)', filter: 'brightness(1.5)' },
          '75%': { transform: 'translateX(-3px)', filter: 'brightness(1.2)' },
          '100%': { transform: 'translateX(0)', filter: 'brightness(1)' },
        },
        floatUp: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '50%': { opacity: '1', transform: 'translateY(-15px) scale(1.15)' },
          '100%': { opacity: '0', transform: 'translateY(-40px) scale(0.8)' },
        },
        floatUpGreen: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '50%': { opacity: '1', transform: 'translateY(-12px) scale(1.1)' },
          '100%': { opacity: '0', transform: 'translateY(-35px) scale(0.8)' },
        },
        floatUpBlue: {
          '0%': { opacity: '1', transform: 'translateY(5px) scale(0.9)' },
          '50%': { opacity: '1', transform: 'translateY(-10px) scale(1.1)' },
          '100%': { opacity: '0', transform: 'translateY(-30px) scale(0.8)' },
        },
        floatUpPurple: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '40%': { opacity: '1', transform: 'translateY(-10px) scale(1.1)' },
          '100%': { opacity: '0', transform: 'translateY(-35px) scale(0.7)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(212,164,76,0.3), 0 0 20px rgba(212,164,76,0.1)' },
          '50%': { boxShadow: '0 0 16px rgba(212,164,76,0.6), 0 0 32px rgba(212,164,76,0.3)' },
        },
        borderEpic: {
          '0%, 100%': { borderColor: 'rgba(251,191,36,0.5)', boxShadow: '0 0 8px rgba(251,191,36,0.2), inset 0 0 8px rgba(251,191,36,0.05)' },
          '33%': { borderColor: 'rgba(168,85,247,0.5)', boxShadow: '0 0 8px rgba(168,85,247,0.2), inset 0 0 8px rgba(168,85,247,0.05)' },
          '66%': { borderColor: 'rgba(239,68,68,0.5)', boxShadow: '0 0 8px rgba(239,68,68,0.2), inset 0 0 8px rgba(239,68,68,0.05)' },
        },
      },
    },
  },
  plugins: [],
};
