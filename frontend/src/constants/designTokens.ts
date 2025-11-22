/**
 * Design Tokens - Centralized styling constants for consistent UI
 */

// Colors
export const colors = {
  // Primary
  primary: {
    main: '#1B7700',
    hover: '#176300',
    light: '#E8F5E3',
    lighter: '#DBFFC0',
    dark: '#0F6B38',
  },
  // Text
  text: {
    primary: '#1C1C1C',
    secondary: '#1C1C1CBF',
    tertiary: '#1C1C1C80',
    disabled: '#1C1C1C40',
    inverse: '#F8F8F8',
  },
  // Background
  background: {
    white: '#FFFFFF',
    gray: '#F8F8F8',
    lightGray: '#F5F5F5',
    fade: '#F0F0F0',
  },
  // Border
  border: {
    default: '#1C1C1C1A',
    fade: '#E0E0E0',
    light: '#DFE4EA',
    button: '#1B7700',
  },
  // Status Colors
  status: {
    success: {
      bg: '#EAF4E2',
      text: '#1B7700',
      border: '#1B7700',
    },
    warning: {
      bg: '#FFF5E0',
      text: '#8A6A05',
      border: '#8A6A05',
    },
    error: {
      bg: '#FEE2E2',
      text: '#DC2626',
      border: '#DC2626',
    },
    info: {
      bg: '#E9F1FF',
      text: '#1B5F77',
      border: '#1B5F77',
    },
  },
  // Match Badge Colors
  match: {
    great: {
      bg: '#ECFDF3',
      text: '#0F6B38',
      dot: '#22C55E',
    },
    strong: {
      bg: '#E0F2FE',
      text: '#0C4A6E',
      dot: '#38BDF8',
    },
    good: {
      bg: '#FEF3C7',
      text: '#92400E',
      dot: '#FBBF24',
    },
    fair: {
      bg: '#F3F4F6',
      text: '#1F2937',
      dot: '#9CA3AF',
    },
  },
} as const;

// Typography
export const typography = {
  fontFamily: {
    primary: 'Inter, sans-serif',
    secondary: 'SF Pro Display, sans-serif',
  },
  fontSize: {
    xs: '11px',
    sm: '12px',
    base: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '22px',
    '3xl': '24px',
    '4xl': '28px',
    '5xl': '32px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// Spacing
export const spacing = {
  0: '0',
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
} as const;

// Border Radius
export const borderRadius = {
  none: '0',
  sm: '8px',
  md: '10px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px',
} as const;

// Shadows
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 18px 40px -24px rgba(47, 81, 43, 0.12)',
  '2xl': '0 24px 48px -24px rgba(47, 81, 43, 0.18)',
  button: '0 4px 6px -1px rgba(27, 119, 0, 0.1)',
} as const;

// Transitions
export const transitions = {
  fast: '150ms',
  base: '200ms',
  slow: '300ms',
  easing: {
    default: 'ease-in-out',
    easeOut: 'ease-out',
    easeIn: 'ease-in',
  },
} as const;

// Z-Index
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// Breakpoints (for reference, use Tailwind classes in practice)
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Component-specific tokens
export const components = {
  card: {
    padding: spacing[6],
    borderRadius: borderRadius['2xl'],
    gap: spacing[5],
    hoverShadow: shadows['2xl'],
  },
  button: {
    height: {
      sm: '36px',
      md: '44px',
      lg: '48px',
      xl: '55px',
    },
    padding: {
      sm: '8px 16px',
      md: '12px 20px',
      lg: '15px 24px',
    },
    borderRadius: borderRadius.lg,
  },
  input: {
    height: {
      sm: '40px',
      md: '44px',
      lg: '48px',
    },
    padding: spacing[4],
    borderRadius: borderRadius.md,
  },
  modal: {
    maxWidth: {
      sm: '400px',
      md: '600px',
      lg: '800px',
      xl: '1000px',
      full: '95vw',
    },
    padding: spacing[8],
    borderRadius: borderRadius['2xl'],
  },
  badge: {
    height: {
      sm: '22px',
      md: '28px',
      lg: '32px',
    },
    padding: {
      sm: '4px 8px',
      md: '5px 12px',
      lg: '8px 16px',
    },
    borderRadius: borderRadius.full,
  },
} as const;

// Export type helpers
export type ColorKey = keyof typeof colors;
export type SpacingKey = keyof typeof spacing;
export type BorderRadiusKey = keyof typeof borderRadius;

