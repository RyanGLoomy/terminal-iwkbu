/**
 * Typography Configuration untuk Sistem Terminal IWKBU
 * Berdasarkan Material Design 3 Type Scale dengan font Geist
 */

import { cn } from '@/lib/utils';

/**
 * Font family configuration
 * Menggunakan Geist (variable font) sebagai default
 */
export const fontFamily = {
  sans: 'var(--font-geist-sans)',
  mono: 'var(--font-geist-mono)',
};

/**
 * Font size scale dalam rem units
 * Base: 1rem = 16px
 */
export const fontSize = {
  // Display sizes
  'display-large': '3rem',        // 48px
  'display-medium': '2.25rem',    // 36px
  'display-small': '1.875rem',    // 30px
  
  // Headline sizes
  'headline-large': '1.5rem',     // 24px
  'headline-medium': '1.25rem',   // 20px
  'headline-small': '1.125rem',   // 18px
  
  // Title sizes
  'title-large': '1.375rem',      // 22px
  'title-medium': '1rem',         // 16px
  'title-small': '0.875rem',      // 14px
  
  // Body sizes
  'body-large': '1rem',           // 16px
  'body-medium': '0.875rem',      // 14px
  'body-small': '0.75rem',        // 12px
  
  // Label sizes (untuk buttons, form controls)
  'label-large': '0.875rem',      // 14px
  'label-medium': '0.75rem',      // 12px
  'label-small': '0.625rem',      // 10px
};

/**
 * Line height scale
 */
export const lineHeight = {
  'display-large': '3.25rem',     // 52px
  'display-medium': '2.5rem',     // 40px
  'display-small': '2.25rem',     // 36px
  
  'headline-large': '2rem',       // 32px
  'headline-medium': '1.75rem',   // 28px
  'headline-small': '1.75rem',    // 28px
  
  'title-large': '1.75rem',       // 28px
  'title-medium': '1.5rem',       // 24px
  'title-small': '1.25rem',       // 20px
  
  'body-large': '1.5rem',         // 24px
  'body-medium': '1.25rem',       // 20px
  'body-small': '1rem',           // 16px
  
  'label-large': '1.25rem',       // 20px
  'label-medium': '1rem',         // 16px
  'label-small': '0.875rem',      // 14px
};

/**
 * Letter spacing scale (em units)
 */
export const letterSpacing = {
  'display-large': '-0.015em',
  'display-medium': '-0.01125em',
  'display-small': '-0.00875em',
  
  'headline-large': '-0.00625em',
  'headline-medium': '-0.005em',
  'headline-small': '-0.0025em',
  
  'title-large': '0em',
  'title-medium': '0.0015em',
  'title-small': '0.001em',
  
  'body-large': '0em',
  'body-medium': '0em',
  'body-small': '0.0025em',
  
  'label-large': '0.005em',
  'label-medium': '0.0075em',
  'label-small': '0.01em',
};

/**
 * Font weight scale
 */
export const fontWeight = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
};

/**
 * Typography utility components
 */

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

// Display text components
export function DisplayLarge({ children, className, as: Component = 'h1' }: TypographyProps) {
  return (
    <Component className={cn(
      'text-display-large leading-display-large tracking-display-large font-bold',
      className
    )}>
      {children}
    </Component>
  );
}

export function DisplayMedium({ children, className, as: Component = 'h2' }: TypographyProps) {
  return (
    <Component className={cn(
      'text-display-medium leading-display-medium tracking-display-medium font-bold',
      className
    )}>
      {children}
    </Component>
  );
}

export function DisplaySmall({ children, className, as: Component = 'h3' }: TypographyProps) {
  return (
    <Component className={cn(
      'text-display-small leading-display-small tracking-display-small font-bold',
      className
    )}>
      {children}
    </Component>
  );
}

// Headline components
export function HeadlineLarge({ children, className, as: Component = 'h2' }: TypographyProps) {
  return (
    <Component className={cn(
      'text-headline-large leading-headline-large tracking-headline-large font-semibold',
      className
    )}>
      {children}
    </Component>
  );
}

export function HeadlineMedium({ children, className, as: Component = 'h3' }: TypographyProps) {
  return (
    <Component className={cn(
      'text-headline-medium leading-headline-medium tracking-headline-medium font-semibold',
      className
    )}>
      {children}
    </Component>
  );
}

export function HeadlineSmall({ children, className, as: Component = 'h4' }: TypographyProps) {
  return (
    <Component className={cn(
      'text-headline-small leading-headline-small tracking-headline-small font-semibold',
      className
    )}>
      {children}
    </Component>
  );
}

// Title components
export function TitleLarge({ children, className, as: Component = 'h5' }: TypographyProps) {
  return (
    <Component className={cn(
      'text-title-large leading-title-large tracking-title-large font-medium',
      className
    )}>
      {children}
    </Component>
  );
}

export function TitleMedium({ children, className, as: Component = 'h6' }: TypographyProps) {
  return (
    <Component className={cn(
      'text-title-medium leading-title-medium tracking-title-medium font-medium',
      className
    )}>
      {children}
    </Component>
  );
}

export function TitleSmall({ children, className, as: Component = 'h6' }: TypographyProps) {
  return (
    <Component className={cn(
      'text-title-small leading-title-small tracking-title-small font-medium',
      className
    )}>
      {children}
    </Component>
  );
}

// Body text components
export function BodyLarge({ children, className, as: Component = 'p' }: TypographyProps) {
  return (
    <Component className={cn(
      'text-body-large leading-body-large tracking-body-large font-normal',
      className
    )}>
      {children}
    </Component>
  );
}

export function BodyMedium({ children, className, as: Component = 'p' }: TypographyProps) {
  return (
    <Component className={cn(
      'text-body-medium leading-body-medium tracking-body-medium font-normal',
      className
    )}>
      {children}
    </Component>
  );
}

export function BodySmall({ children, className, as: Component = 'p' }: TypographyProps) {
  return (
    <Component className={cn(
      'text-body-small leading-body-small tracking-body-small font-normal',
      className
    )}>
      {children}
    </Component>
  );
}

// Label components (untuk buttons, form controls)
export function LabelLarge({ children, className, as: Component = 'span' }: TypographyProps) {
  return (
    <Component className={cn(
      'text-label-large leading-label-large tracking-label-large font-semibold uppercase',
      className
    )}>
      {children}
    </Component>
  );
}

export function LabelMedium({ children, className, as: Component = 'span' }: TypographyProps) {
  return (
    <Component className={cn(
      'text-label-medium leading-label-medium tracking-label-medium font-semibold uppercase',
      className
    )}>
      {children}
    </Component>
  );
}

export function LabelSmall({ children, className, as: Component = 'span' }: TypographyProps) {
  return (
    <Component className={cn(
      'text-label-small leading-label-small tracking-label-small font-semibold uppercase',
      className
    )}>
      {children}
    </Component>
  );
}

/**
 * Text color utilities
 */
export const textColor = {
  primary: 'text-foreground',
  secondary: 'text-muted-foreground',
  brand: {
    navy: 'text-brand-navy',
    sky: 'text-brand-sky',
    green: 'text-brand-green',
  },
  status: {
    success: 'text-brand-green',
    warning: 'text-accent',
    error: 'text-destructive',
    info: 'text-brand-sky',
  },
};

/**
 * Text alignment utilities
 */
export const textAlign = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
};

/**
 * Text transform utilities
 */
export const textTransform = {
  uppercase: 'uppercase',
  lowercase: 'lowercase',
  capitalize: 'capitalize',
  normal: 'normal-case',
};

/**
 * Text decoration utilities
 */
export const textDecoration = {
  underline: 'underline',
  'line-through': 'line-through',
  'no-underline': 'no-underline',
};

/**
 * Text overflow utilities
 */
export const textOverflow = {
  truncate: 'truncate',
  'overflow-ellipsis': 'overflow-ellipsis',
  'overflow-clip': 'overflow-clip',
};

export default {
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
  fontWeight,
  textColor,
  textAlign,
  textTransform,
  textDecoration,
  textOverflow,
};