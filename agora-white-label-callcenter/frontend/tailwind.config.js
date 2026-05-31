/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Google Blue
        gblue: {
          50:  '#E8F0FE',
          100: '#D2E3FC',
          200: '#AECBFA',
          400: '#4285F4',
          500: '#1a73e8',
          600: '#1557B0',
          700: '#0D3880',
        },
        // Google Red
        gred: {
          50:  '#FCE8E6',
          100: '#F5C6C2',
          400: '#EA4335',
          500: '#D93025',
          600: '#B31412',
        },
        // Google Green
        ggreen: {
          50:  '#E6F4EA',
          100: '#CEEAD6',
          400: '#34A853',
          500: '#188038',
          600: '#0D652D',
        },
        // Google Yellow / Amber
        gyellow: {
          50:  '#FEF7E0',
          100: '#FDE293',
          400: '#FBBC04',
          500: '#F9AB00',
          600: '#E37400',
        },
        // Google Purple
        gpurple: {
          50:  '#F3E8FD',
          100: '#E4C7FA',
          400: '#AB47BC',
          500: '#8430CE',
          600: '#6A1B9A',
        },
        // Google Teal
        gteal: {
          50:  '#E0F7FA',
          400: '#00ACC1',
          500: '#007B83',
        },
        // Surfaces
        surface: {
          DEFAULT: '#F1F3F4',
          card:    '#FFFFFF',
          hover:   '#F8F9FA',
          pressed: '#F1F3F4',
        },
        // Text
        ink: {
          DEFAULT:   '#202124',
          secondary: '#5F6368',
          tertiary:  '#80868B',
          disabled:  '#BDC1C6',
        },
        // Borders
        border: {
          DEFAULT: '#DADCE0',
          light:   '#E8EAED',
          focus:   '#1a73e8',
        },
      },
      fontFamily: {
        sans: ['Roboto', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Noto Sans KR', 'sans-serif'],
        mono: ['Roboto Mono', 'Consolas', 'Monaco', 'monospace'],
      },
      boxShadow: {
        // Google's signature double-layer shadow
        card:   '0 1px 2px 0 rgba(60,64,67,.30), 0 1px 3px 1px rgba(60,64,67,.15)',
        'card-hover': '0 1px 3px 0 rgba(60,64,67,.30), 0 4px 8px 3px rgba(60,64,67,.15)',
        menu:   '0 2px 6px 2px rgba(60,64,67,.15), 0 1px 2px 0 rgba(60,64,67,.30)',
        fab:    '0 1px 2px 0 rgba(60,64,67,.30), 0 2px 6px 2px rgba(60,64,67,.15)',
      },
      borderRadius: {
        'google': '8px',
      },
    },
  },
  plugins: [],
}
