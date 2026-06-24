/**
 * Design Tokens untuk Sistem Terminal IWKBU
 * Berdasarkan Material Design 3 dan WCAG 2.1
 */

export const colors = {
  // Brand colors Jasa Raharja
  brand: {
    navy: '#003868',    // Primary color (60%)
    sky: '#0089CF',     // Secondary color (30%)
    green: '#8CC63F',   // Accent color (10%)
  },
  
  // Semantic colors
  semantic: {
    primary: 'hsl(var(--primary))',
    'primary-foreground': 'hsl(var(--primary-foreground))',
    secondary: 'hsl(var(--secondary))',
    'secondary-foreground': 'hsl(var(--secondary-foreground))',
    accent: 'hsl(var(--accent))',
    'accent-foreground': 'hsl(var(--accent-foreground))',
    destructive: 'hsl(var(--destructive))',
    'destructive-foreground': 'hsl(var(--destructive-foreground))',
    muted: 'hsl(var(--muted))',
    'muted-foreground': 'hsl(var(--muted-foreground))',
    border: 'hsl(var(--border))',
    input: 'hsl(var(--input))',
    ring: 'hsl(var(--ring))',
    background: 'hsl(var(--background))',
    foreground: 'hsl(var(--foreground))',
    card: 'hsl(var(--card))',
    'card-foreground': 'hsl(var(--card-foreground))',
    popover: 'hsl(var(--popover))',
    'popover-foreground': 'hsl(var(--popover-foreground))',
    sidebar: 'hsl(var(--sidebar))',
    'sidebar-foreground': 'hsl(var(--sidebar-foreground))',
    'sidebar-primary': 'hsl(var(--sidebar-primary))',
    'sidebar-primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
    'sidebar-accent': 'hsl(var(--sidebar-accent))',
    'sidebar-accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
    'sidebar-border': 'hsl(var(--sidebar-border))',
    'sidebar-ring': 'hsl(var(--sidebar-ring))',
  },
  
  // Status colors
  status: {
    success: '#8CC63F',   // Brand green
    warning: '#F59E0B',   // Amber 500
    error: '#EF4444',     // Red 500
    info: '#0089CF',      // Brand sky
  },
  
  // Gray scale (Material Design)
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },
};

/**
 * Typography scale berdasarkan Material Design Type Scale
 * Menggunakan base 16px (1rem = 16px)
 */
export const typography = {
  // Display text
  display: {
    large: {
      fontSize: '3rem',       // 48px
      lineHeight: '3.25rem',  // 52px
      letterSpacing: '-0.015em',
      fontWeight: 700,
    },
    medium: {
      fontSize: '2.25rem',    // 36px
      lineHeight: '2.5rem',   // 40px
      letterSpacing: '-0.01125em',
      fontWeight: 700,
    },
    small: {
      fontSize: '1.875rem',   // 30px
      lineHeight: '2.25rem',  // 36px
      letterSpacing: '-0.00875em',
      fontWeight: 700,
    },
  },
  
  // Headline text
  headline: {
    large: {
      fontSize: '1.5rem',     // 24px
      lineHeight: '2rem',     // 32px
      letterSpacing: '-0.00625em',
      fontWeight: 600,
    },
    medium: {
      fontSize: '1.25rem',    // 20px
      lineHeight: '1.75rem',  // 28px
      letterSpacing: '-0.005em',
      fontWeight: 600,
    },
    small: {
      fontSize: '1.125rem',   // 18px
      lineHeight: '1.75rem',  // 28px
      letterSpacing: '-0.0025em',
      fontWeight: 600,
    },
  },
  
  // Body text
  body: {
    large: {
      fontSize: '1rem',       // 16px
      lineHeight: '1.5rem',   // 24px
      letterSpacing: '0em',
      fontWeight: 400,
    },
    medium: {
      fontSize: '0.875rem',   // 14px
      lineHeight: '1.25rem',  // 20px
      letterSpacing: '0em',
      fontWeight: 400,
    },
    small: {
      fontSize: '0.75rem',    // 12px
      lineHeight: '1rem',     // 16px
      letterSpacing: '0.0025em',
      fontWeight: 400,
    },
  },
  
  // Label text (untuk button, form controls)
  label: {
    large: {
      fontSize: '0.875rem',   // 14px
      lineHeight: '1.25rem',  // 20px
      letterSpacing: '0.005em',
      fontWeight: 600,
    },
    medium: {
      fontSize: '0.75rem',    // 12px
      lineHeight: '1rem',     // 16px
      letterSpacing: '0.0075em',
      fontWeight: 600,
    },
    small: {
      fontSize: '0.625rem',   // 10px
      lineHeight: '0.875rem', // 14px
      letterSpacing: '0.01em',
      fontWeight: 600,
    },
  },
  
  // Title text
  title: {
    large: {
      fontSize: '1.375rem',   // 22px
      lineHeight: '1.75rem',  // 28px
      letterSpacing: '0em',
      fontWeight: 500,
    },
    medium: {
      fontSize: '1rem',       // 16px
      lineHeight: '1.5rem',   // 24px
      letterSpacing: '0.0015em',
      fontWeight: 500,
    },
    small: {
      fontSize: '0.875rem',   // 14px
      lineHeight: '1.25rem',  // 20px
      letterSpacing: '0.001em',
      fontWeight: 500,
    },
  },
};

/**
 * Spacing scale berdasarkan 8px grid system
 * 1 unit = 8px (0.5rem)
 */
export const spacing = {
  0: '0',          // 0px
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  7: '1.75rem',    // 28px
  8: '2rem',       // 32px
  9: '2.25rem',    // 36px
  10: '2.5rem',    // 40px
  11: '2.75rem',   // 44px
  12: '3rem',      // 48px
  14: '3.5rem',    // 56px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
  28: '7rem',      // 112px
  32: '8rem',      // 128px
  36: '9rem',      // 144px
  40: '10rem',     // 160px
  44: '11rem',     // 176px
  48: '12rem',     // 192px
  52: '13rem',     // 208px
  56: '14rem',     // 224px
  60: '15rem',     // 240px
  64: '16rem',     // 256px
  72: '18rem',     // 288px
  80: '20rem',     // 320px
  96: '24rem',     // 384px
};

/**
 * Border radius scale
 */
export const borderRadius = {
  none: '0',
  xs: '0.25rem',    // 4px
  sm: '0.375rem',   // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  '3xl': '2rem',    // 32px
  full: '9999px',
};

/**
 * Shadows berdasarkan Material Design elevation
 */
export const shadows = {
  elevation: {
    0: 'none',
    1: '0px 1px 2px rgba(0, 0, 0, 0.08), 0px 1px 3px rgba(0, 0, 0, 0.04)',
    2: '0px 2px 4px rgba(0, 0, 0, 0.08), 0px 3px 6px rgba(0, 0, 0, 0.04)',
    3: '0px 4px 8px rgba(0, 0, 0, 0.1), 0px 6px 12px rgba(0, 0, 0, 0.06)',
    4: '0px 8px 16px rgba(0, 0, 0, 0.12), 0px 12px 24px rgba(0, 0, 0, 0.08)',
    5: '0px 16px 32px rgba(0, 0, 0, 0.14), 0px 24px 48px rgba(0, 0, 0, 0.12)',
  },
  
  // Brand glow shadows
  glow: {
    navy: '0 8px 32px -8px rgba(0, 56, 104, 0.2)',
    sky: '0 8px 32px -8px rgba(0, 137, 207, 0.2)',
    green: '0 8px 32px -8px rgba(140, 198, 63, 0.2)',
    destructive: '0 8px 32px -8px rgba(239, 68, 68, 0.2)',
  },
};

/**
 * Breakpoints untuk responsive design
 */
export const breakpoints = {
  xs: '320px',    // Mobile small
  sm: '640px',    // Mobile large
  md: '768px',    // Tablet
  lg: '1024px',   // Desktop small
  xl: '1280px',   // Desktop large
  '2xl': '1536px', // Desktop extra large
};

/**
 * Grid system
 */
export const grid = {
  columns: 12,
  gutter: '1.5rem', // 24px
  container: {
    padding: '1.5rem',
    maxWidth: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
  },
};

/**
 * Z-index layers
 */
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
};

/**
 * Durasi transition
 */
export const transitions = {
  duration: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
  },
  timing: {
    ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    easeIn: 'cubic-bezier(0.42, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.58, 1)',
    easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
    material: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  breakpoints,
  grid,
  zIndex,
  transitions,
};