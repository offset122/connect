import { useWindowDimensions, Platform } from 'react-native';

export const BREAKPOINTS = {
  xs: 0,
  sm: 375,
  md: 414,
  lg: 768,
  xl: 1024,
  xxl: 1280,
};

export const isWeb = Platform.OS === 'web';

export const DEVICE_TYPES = {
  PHONE: 'phone',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
};

export type DeviceType = typeof DEVICE_TYPES[keyof typeof DEVICE_TYPES];

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  
  const isXs = width < BREAKPOINTS.sm;
  const isSm = width >= BREAKPOINTS.sm && width < BREAKPOINTS.md;
  const isMd = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
  const isLg = width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl;
  const isXl = width >= BREAKPOINTS.xl;
  
  const isPhone = width < BREAKPOINTS.lg;
  const isTablet = width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl;
  const isDesktop = width >= BREAKPOINTS.xl;
  
  const isLandscape = width > height;
  const isPortrait = height >= width;

  const deviceType: DeviceType = isDesktop ? DEVICE_TYPES.DESKTOP : isTablet ? DEVICE_TYPES.TABLET : DEVICE_TYPES.PHONE;

  return {
    width,
    height,
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    isPhone,
    isTablet,
    isDesktop,
    isLandscape,
    isPortrait,
    deviceType,
    breakpoint: isXs ? 'xs' : isSm ? 'sm' : isMd ? 'md' : isLg ? 'lg' : isXl ? 'xl' : 'xl',
  };
}

export function responsive<T>(values: { xs?: T; sm?: T; md?: T; lg?: T; xl?: T }, width: number): T {
  if (width >= BREAKPOINTS.xl && values.xl !== undefined) return values.xl;
  if (width >= BREAKPOINTS.lg && values.lg !== undefined) return values.lg;
  if (width >= BREAKPOINTS.md && values.md !== undefined) return values.md;
  if (width >= BREAKPOINTS.sm && values.sm !== undefined) return values.sm;
  return values.xs as T;
}

export function fontSize(xs: number, sm?: number, md?: number, lg?: number, xl?: number) {
  return (width: number) => {
    if (width >= BREAKPOINTS.xl && xl !== undefined) return xl;
    if (width >= BREAKPOINTS.lg && lg !== undefined) return lg;
    if (width >= BREAKPOINTS.md && md !== undefined) return md;
    if (width >= BREAKPOINTS.sm && sm !== undefined) return sm;
    return xs;
  };
}

export function spacing(xs: number, sm?: number, md?: number, lg?: number, xl?: number) {
  return fontSize(xs, sm, md, lg, xl);
}

export function iconSize(xs: number, sm?: number, md?: number, lg?: number, xl?: number) {
  return fontSize(xs, sm, md, lg, xl);
}

export function borderRadius(xs: number, sm?: number, md?: number, lg?: number, xl?: number) {
  return fontSize(xs, sm, md, lg, xl);
}
