// CEDOI Design System Tokens

export const brandTokens = {
  name: 'CEDOI',
  tagline: 'BUILDING OUTSTANDING ENTREPRENEURS',
  colors: {
    primary: {
      50: '#eef7fc',
      100: '#d5ebf7',
      200: '#add7ee',
      300: '#73bce3',
      400: '#349ed2',
      500: '#08537B', // Primary Brand Anchor
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
      500: '#EE8518', // Accent Brand Anchor
      600: '#d26b0f',
      700: '#ab4e10',
      800: '#893d14',
      900: '#703314',
      950: '#3d1708',
    },
    neutral: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },
    status: {
      success: {
        50: '#f0fdf4',
        500: '#16a34a',
        600: '#15803d',
        700: '#166534',
      },
      warning: {
        50: '#fffbeb',
        500: '#f59e0b',
        600: '#d97706',
        700: '#b45309',
      },
      danger: {
        50: '#fef2f2',
        500: '#dc2626',
        600: '#b91c1c',
        700: '#991b1b',
      },
      info: {
        50: '#eff6ff',
        500: '#2563eb',
        600: '#1d4ed8',
        700: '#1e40af',
      },
    },
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    },
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
  },
  radii: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '18px',
    '2xl': '24px',
    full: '9999px',
  },
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  },
  motion: {
    duration: '200ms',
    timing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

export type BrandTokens = typeof brandTokens;
