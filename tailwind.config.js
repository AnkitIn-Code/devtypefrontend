/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#18181B',
        surface: '#27272A',
        'surface-2': '#3F3F46',
        'surface-3': '#52525B',
        border: '#3F3F46',
        primary: {
          DEFAULT: '#EAB308',
          50: '#FEF9C3',
          100: '#FEF08A',
          200: '#FDE047',
          300: '#FACC15',
          400: '#EAB308',
          500: '#CA8A04',
          600: '#A16207',
          700: '#854D0E',
          800: '#713F12',
          900: '#422006',
        },
        success: '#22C55E',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        muted: '#71717A',
        'text-primary': '#FAFAFA',
        'text-secondary': '#A1A1AA',
        'text-muted': '#52525B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #EAB308, 0 0 10px #EAB308' },
          '100%': { boxShadow: '0 0 20px #EAB308, 0 0 40px #EAB308' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      boxShadow: {
        glow: '0 0 20px rgba(234, 179, 8, 0.3)',
        'glow-sm': '0 0 10px rgba(234, 179, 8, 0.2)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
    },
  },
  plugins: [],
};
