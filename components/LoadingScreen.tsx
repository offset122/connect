
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, commonStyles, spacing } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface LoadingScreenProps {
  message?: string;
  showIcon?: boolean;
}

export default function LoadingScreen({ 
  message = 'Loading...', 
  showIcon = true 
}: LoadingScreenProps) {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 2000,
        easing: Easing.linear,
      }),
      -1
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {showIcon && (
          <Animated.View style={animatedStyle}>
            <IconSymbol name="heart.fill" size={64} color={colors.secondary} />
          </Animated.View>
        )}
        <ActivityIndicator 
          size="large" 
          color={colors.primary} 
          style={styles.spinner}
        />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  spinner: {
    marginTop: spacing.md,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
