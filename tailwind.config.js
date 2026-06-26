/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#141925',
        surface: '#1d2433',
        'surface-raised': '#252d3f',
        'surface-sunken': '#10141d',
        border: {
          DEFAULT: '#323b4d',
          light: '#3e4a60',
        },
        ink: {
          DEFAULT: '#f0f2f6',
          muted: '#aab2c4',
          faint: '#7c869c',
        },
        signal: {
          teal: '#6cc4b3',
          'teal-dim': '#45897d',
          amber: '#d4ad72',
          'amber-dim': '#977b51',
          rose: '#cf837a',
          'rose-dim': '#955952',
          sage: '#8bb890',
          'sage-dim': '#5f7e63',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
