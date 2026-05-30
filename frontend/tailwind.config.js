/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // MeRute Design System Colors
        surface: {
          DEFAULT: '#f8f9ff',
          dim: '#d6d9ed',
          bright: '#faf8ff',
          'container-lowest': '#ffffff',
          'container-low': '#eff4ff',
          container: '#e5eeff',
          'container-high': '#e4e7fb',
          'container-highest': '#dee1f6',
          variant: '#dee1f6',
        },
        'on-surface': {
          DEFAULT: '#171b29',
          variant: '#434654',
        },
        inverse: {
          surface: '#2c303f',
          'on-surface': '#eff0ff',
        },
        outline: {
          DEFAULT: '#737685',
          variant: '#c2c6d8',
        },
        primary: {
          DEFAULT: '#003b9a',
          container: '#0050cb',
          fixed: '#dae1ff',
          'fixed-dim': '#b3c5ff',
        },
        'on-primary': {
          DEFAULT: '#ffffff',
          container: '#c1cfff',
          fixed: '#001849',
          'fixed-variant': '#003fa4',
        },
        'inverse-primary': '#b3c5ff',
        secondary: {
          DEFAULT: '#006c49',
          container: '#9af2c5',
          fixed: '#9df4c8',
          'fixed-dim': '#81d8ad',
        },
        'on-secondary': {
          DEFAULT: '#ffffff',
          container: '#0c714d',
          fixed: '#002113',
          'fixed-variant': '#005236',
        },
        tertiary: {
          DEFAULT: '#5f3a00',
          container: '#7f4f00',
          fixed: '#ffddb8',
          'fixed-dim': '#fcba68',
        },
        'on-tertiary': {
          DEFAULT: '#ffffff',
          container: '#ffc784',
          fixed: '#2a1700',
          'fixed-variant': '#653e00',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        'on-error': {
          DEFAULT: '#ffffff',
          container: '#93000a',
        },
        background: '#faf8ff',
        'on-background': '#171b29',
        'surface-tint': '#1155d0',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'headline-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-lg-mobile': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '500' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-lg': ['14px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '600' }],
        'label-md': ['12px', { lineHeight: '14px', letterSpacing: '0.02em', fontWeight: '600' }],
      },
      spacing: {
        'xs': '4px',
        'base': '8px',
        'sm': '12px',
        'md': '24px',
        'lg': '40px',
        'xl': '64px',
        'gutter': '16px',
        'margin-desktop': '32px',
        'margin-mobile': '16px',
      },
      borderRadius: {
        'sm': '0.25rem',
        DEFAULT: '0.5rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.5rem',
        'full': '9999px',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        DEFAULT: '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.08)',
        'float': '0 4px 16px 0 rgba(0, 0, 0, 0.1)',
        'float-lg': '0 8px 24px 0 rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
}
