/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bento Social Dark palette
        'bg-page': '#0A0A0B',
        'bg-surface': '#141416',
        'bg-card': '#1C1C1E',
        'bg-elevated': '#252528',
        'bg-subtle': '#2C2C2E',
        
        // Accent
        accent: {
          orange: '#FF6B35',
          pink: '#FF1F8E',
          purple: '#A855F7',
          coral: '#FF7A6E',
        },
        
        // Text
        'text-primary': '#FFFFFF',
        'text-secondary': '#A1A1A6',
        'text-tertiary': '#636366',
        'text-muted': '#48484A',
        
        // Borders
        'border-default': '#3A3A3C',
        'border-subtle': '#2C2C2E',
        
        // Semantic
        success: '#34C759',
        warning: '#FF9F0A',
        error: '#FF453A',
        info: '#5AC8FA',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      borderRadius: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
      },
      boxShadow: {
        'subtle': '0 1px 2px rgba(0,0,0,0.3)',
        'card': '0 2px 8px rgba(0,0,0,0.4)',
        'dropdown': '0 4px 16px rgba(0,0,0,0.5)',
        'modal': '0 8px 32px rgba(0,0,0,0.6)',
        'glow-accent': '0 0 20px rgba(255,107,53,0.3)',
        'glow-accent-lg': '0 8px 24px rgba(255,107,53,0.4)',
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #FF6B35 0%, #FF1F8E 100%)',
        'gradient-card': 'linear-gradient(180deg, #1C1C1E 0%, #141416 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top, 0)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0)',
      },
    },
  },
  plugins: [],
}
