/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Nurse Pro Academy Brand Colors
        'nurse-red': {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#E31C25', // Primary brand red
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        'nurse-silver': {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8', // Secondary silver/grey
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Dark theme backgrounds
        'dark': {
          DEFAULT: '#020617', // slate-950
          50: '#0f172a',
          100: '#1e293b',
          200: '#334155',
        },
        // Legacy primary colors (keeping for backward compatibility)
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#E31C25',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      boxShadow: {
        'glow-red': '0 0 20px rgba(227, 28, 37, 0.3)',
        'glow-red-lg': '0 0 40px rgba(227, 28, 37, 0.4)',
        'glow-red-xl': '0 0 60px rgba(227, 28, 37, 0.5)',
        'dark-lg': '0 10px 40px rgba(0, 0, 0, 0.5)',
        'dark-xl': '0 20px 60px rgba(0, 0, 0, 0.6)',
      },
      backgroundImage: {
        'gradient-dark-red': 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%)',
        'gradient-red-glow': 'radial-gradient(ellipse at top right, rgba(227, 28, 37, 0.15), transparent)',
        'gradient-red-spotlight': 'radial-gradient(ellipse at center, rgba(227, 28, 37, 0.2), transparent 70%)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(227, 28, 37, 0.3)',
            transform: 'scale(1)',
          },
          '50%': { 
            boxShadow: '0 0 40px rgba(227, 28, 37, 0.6)',
            transform: 'scale(1.02)',
          },
        },
        'heartbeat': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '14%': { transform: 'scale(1.1)', opacity: '1' },
          '28%': { transform: 'scale(1)', opacity: '1' },
          '42%': { transform: 'scale(1.1)', opacity: '1' },
          '70%': { transform: 'scale(1)', opacity: '0.8' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
