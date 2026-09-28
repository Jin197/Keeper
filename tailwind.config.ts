import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        keeper: {
          50: '#E6F2FF',
          100: '#CCE5FF',
          200: '#99CCFF',
          300: '#66B2FF',
          400: '#3399FF',
          500: '#007AFF',
          600: '#0066D6',
          700: '#0052AD',
          800: '#003D80',
          900: '#002952',
          DEFAULT: '#007AFF',
        },
        eco: {
          50: '#E8F8EF',
          100: '#D1F1DE',
          200: '#A3E3BD',
          300: '#75D69B',
          400: '#47C87A',
          500: '#2ECC71',
          600: '#25A35A',
          700: '#1C7A44',
          800: '#13522D',
          900: '#0A2917',
          DEFAULT: '#2ECC71',
        },
        anthra: {
          50: '#1A1A1A',
          100: '#161616',
          200: '#141414',
          300: '#131313',
          400: '#121212',
          500: '#121212',
          600: '#0F0F0F',
          700: '#0C0C0C',
          800: '#0A0A0A',
          900: '#070707',
          DEFAULT: '#121212',
        },
        pure: '#FFFFFF',
        // Semantic tokens (CSS variables driven by .dark / :root)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
      },
      fontFamily: {
        display: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        btn: '12px',
        card: '16px',
        pill: '9999px',
        lg: '12px',
        md: '10px',
        sm: '8px',
      },
      boxShadow: {
        'glow-keeper': '0 0 0 1px rgba(0,122,255,0.20), 0 8px 32px -8px rgba(0,122,255,0.35)',
        'glow-eco': '0 0 0 1px rgba(46,204,113,0.20), 0 8px 32px -8px rgba(46,204,113,0.35)',
        soft: '0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
        elevated: '0 8px 32px -8px rgba(0,0,0,0.40)',
      },
      backgroundImage: {
        'gradient-glass':
          'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        'gradient-keeper': 'linear-gradient(135deg, #007AFF 0%, #0052AD 100%)',
        'gradient-eco': 'linear-gradient(135deg, #2ECC71 0%, #1C7A44 100%)',
      },
      keyframes: {
        'laser-sweep': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'laser-sweep': 'laser-sweep 1.6s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
