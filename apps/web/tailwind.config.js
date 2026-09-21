/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#08537B',
          orange: '#EE8518',
        },
        surface: {
          canvas: '#F7F7F7',
          card: '#FFFFFF',
          sub: '#F9FAFB',
          hover: '#F3F4F6',
        },
        content: {
          charcoal: '#222222',
          sub: '#484848',
          muted: '#717171',
          subtle: '#9CA3AF',
        },
        border: {
          subtle: '#EBEBEB',
          default: '#E5E7EB',
          focus: '#08537B',
        },
        primary: {
          50: '#eef7fc',
          100: '#d5ebf7',
          200: '#add7ee',
          300: '#73bce3',
          400: '#349ed2',
          500: '#08537B', // Primary CEDOI blue anchor
          600: '#064364',
          700: '#053752',
          800: '#042a3e',
          900: '#031e2d',
          950: '#02131d',
        },
        accent: {
          50: '#fef7ee',
          100: '#fdecd6',
          200: '#fbd7aa',
          300: '#f7b973',
          400: '#f2963b',
          500: '#EE8518', // Accent CEDOI orange anchor
          600: '#d26b0f',
          700: '#ab4e10',
          800: '#893d14',
          900: '#703314',
          950: '#3d1708',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '24px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
