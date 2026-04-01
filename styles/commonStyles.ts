
import { StyleSheet, ViewStyle, TextStyle, useWindowDimensions } from 'react-native';

// Hanna's Connect Color Palette - 3 Primary Colors Design
export const colors = {
  background: '#F8F9FA',        // Light gray, clean base
  text: '#1A1A1A',              // Almost black, high readability
  textSecondary: '#6B7280',     // Medium gray, less important text
  primary: '#4F46E5',           // Indigo, calming and trustworthy
  primaryLight: '#818CF8',      // Light indigo
  primaryDark: '#3730A3',       // Dark indigo
  secondary: '#EC4899',         // Pink, highlights and calls to action
  secondaryLight: '#F9A8D4',    // Light pink
  accent: '#06B6D4',            // Cyan, interactive elements
  accentLight: '#67E8F9',       // Light cyan
  card: '#FFFFFF',              // White, content containers
  highlight: '#FBBF24',         // Amber, important notifications
  success: '#10B981',           // Green for success states
  successLight: '#6EE7B7',      // Light green
  error: '#EF4444',             // Red for errors
  errorLight: '#FCA5A5',        // Light red
  warning: '#F59E0B',           // Orange for warnings
  border: '#E5E7EB',            // Light border color
  borderDark: '#D1D5DB',        // Darker border
  disabled: '#9CA3AF',          // Disabled state
  overlay: 'rgba(0, 0, 0, 0.5)', // Overlay for modals
};

export const BREAKPOINTS = {
  xs: 0,
  sm: 375,
  md: 414,
  lg: 768,
  xl: 1024,
};

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isPhone: width < BREAKPOINTS.lg,
    isTablet: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
    isDesktop: width >= BREAKPOINTS.xl,
    isLandscape: width > height,
    isPortrait: height >= width,
    isLargeScreen: width >= BREAKPOINTS.lg,
    isSmallScreen: width < BREAKPOINTS.md,
  };
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const responsiveSpacing = {
  horizontal: { xs: 16, lg: 40 },
  vertical: { xs: 16, lg: 24 },
  inputGap: { xs: 12, lg: 16 },
  cardPadding: { xs: 16, lg: 24 },
  sectionGap: { xs: 20, lg: 32 },
};

export const responsiveFontSize = {
  title: { xs: 28, sm: 30, lg: 36, xl: 40 },
  subtitle: { xs: 18, sm: 20, lg: 24 },
  heading: { xs: 18, lg: 22 },
  body: { xs: 14, lg: 16 },
  caption: { xs: 12, lg: 14 },
  button: { xs: 16, lg: 18 },
  icon: { xs: 20, lg: 24 },
};

export const responsivePadding = {
  screen: { xs: 16, lg: 32 },
  button: { xs: 14, lg: 18 },
  input: { xs: 14, lg: 16 },
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const shadows = {
  sm: {
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  md: {
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  lg: {
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)',
    elevation: 8,
  },
  xl: {
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)',
    elevation: 12,
  },
};

export const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  secondary: {
    backgroundColor: colors.secondary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  disabled: {
    backgroundColor: colors.disabled,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: {
    backgroundColor: colors.background,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
});

export const fontFamilies = {
  thin: 'Montserrat-VariableFont_wght',
  extralight: 'Montserrat-VariableFont_wght',
  light: 'Montserrat-VariableFont_wght',
  regular: 'Montserrat-VariableFont_wght',
  medium: 'Montserrat-VariableFont_wght',
  semibold: 'Montserrat-VariableFont_wght',
  bold: 'Montserrat-VariableFont_wght',
  extrabold: 'Montserrat-VariableFont_wght',
  black: 'Montserrat-VariableFont_wght',
  italic: 'Montserrat-Italic-VariableFont_wght',
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
    fontFamily: fontFamilies.bold,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
    fontFamily: fontFamilies.semibold,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    fontFamily: fontFamilies.bold,
  },
  text: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    fontFamily: fontFamilies.regular,
  },
  textSecondary: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    fontFamily: fontFamilies.regular,
  },
  textSmall: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    fontFamily: fontFamilies.light,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  cardCompact: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
    fontFamily: fontFamilies.regular,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.card,
    fontFamily: fontFamilies.semibold,
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamilies.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shadow: shadows.md,
  shadowLg: shadows.lg,
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.card,
    fontFamily: fontFamilies.bold,
  },
});

export const responsiveStyles = {
  screenPadding: (isLarge: boolean) => ({
    paddingHorizontal: isLarge ? 40 : 20,
    paddingVertical: isLarge ? 24 : 16,
  }),
  
  contentMaxWidth: (isLarge: boolean) => ({
    maxWidth: isLarge ? 500 : '100%',
    alignSelf: isLarge ? 'center' : 'stretch',
  }),
  
  logoSize: (isLarge: boolean) => ({
    width: isLarge ? 150 : 120,
    height: isLarge ? 150 : 120,
    borderRadius: isLarge ? 75 : 60,
  }),
  
  inputContainer: (isLarge: boolean) => ({
    paddingHorizontal: isLarge ? 20 : 16,
    paddingVertical: isLarge ? 18 : 16,
    marginBottom: isLarge ? 20 : 16,
  }),
  
  button: (isLarge: boolean) => ({
    paddingVertical: isLarge ? 18 : 16,
    paddingHorizontal: isLarge ? 32 : 24,
  }),
  
  title: (isLarge: boolean) => ({
    fontSize: isLarge ? 38 : 32,
  }),
  
  subtitle: (isLarge: boolean) => ({
    fontSize: isLarge ? 20 : 16,
  }),
  
  heading: (isLarge: boolean) => ({
    fontSize: isLarge ? 24 : 20,
  }),
  
  body: (isLarge: boolean) => ({
    fontSize: isLarge ? 17 : 15,
    lineHeight: isLarge ? 28 : 24,
  }),
  
  caption: (isLarge: boolean) => ({
    fontSize: isLarge ? 14 : 12,
  }),
  
  icon: (isLarge: boolean) => ({
    size: isLarge ? 24 : 20,
  }),
  
  gridColumns: (isLarge: boolean, isLandscape: boolean) => {
    if (isLarge) return isLandscape ? 4 : 3;
    return 2;
  },
  
  cardWidth: (isLarge: boolean, width: number) => ({
    width: isLarge ? (width - 80) / 3 : '100%',
  }),
  
  avatar: (isLarge: boolean) => ({
    size: isLarge ? 80 : 60,
  }),
  
  gap: (isLarge: boolean) => ({
    sm: isLarge ? 12 : 8,
    md: isLarge ? 16 : 12,
    lg: isLarge ? 24 : 16,
    xl: isLarge ? 32 : 20,
  }),
};
