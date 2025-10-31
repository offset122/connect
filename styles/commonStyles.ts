
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

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

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
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
