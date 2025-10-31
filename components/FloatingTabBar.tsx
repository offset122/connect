import React, { useEffect } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Platform, 
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@react-navigation/native';
import { useRouter, usePathname } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import * as Haptics from 'expo-haptics';

export interface TabBarItem {
  name: string;
  route: string;
  icon: string;
  label: string;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
  containerWidth?: number;
  borderRadius?: number;
  bottomMargin?: number;
}

export default function FloatingTabBar({
  tabs,
  containerWidth = Dimensions.get('window').width - 40,
  borderRadius = 24,
  bottomMargin = 20,
}: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();

  const activeIndex = tabs.findIndex((tab) => pathname.includes(tab.name));
  const scaleValues = tabs.map(() => useSharedValue(1));
  const tabWidth = containerWidth / tabs.length;

  useEffect(() => {
    // Update scale values for active tab
    scaleValues.forEach((scale, index) => {
      const isActive = activeIndex === index;
      scale.value = withSpring(isActive ? 1.1 : 1, {
        damping: 20,
        stiffness: 200,
        mass: 0.6,
      });
    });
  }, [activeIndex, scaleValues]);

  const handleTabPress = (route: string, index: number) => {
    // Enhanced haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Scale animation with spring
    scaleValues[index].value = withTiming(0.9, { duration: 80 }, () => {
      scaleValues[index].value = withSpring(1.1, {
        damping: 15,
        stiffness: 300,
      });
    });

    router.push(route as any);
  };

  return (
    <View style={[styles.safeArea, { bottom: bottomMargin }]}>
      <SafeAreaView edges={['bottom']}>
        <View
          style={[
            styles.container,
            {
              width: containerWidth,
              borderRadius,
              backgroundColor: colors.card,
            },
          ]}
        >
          {/* Tab Buttons */}
          {tabs.map((tab, index) => {
            const isActive = pathname.includes(tab.name);
            
            const animatedStyle = useAnimatedStyle(() => {
              return {
                transform: [{ scale: scaleValues[index].value }],
              };
            });

            return (
              <Animated.View 
                key={tab.name} 
                style={[
                  styles.tabWrapper, 
                  { width: tabWidth }, 
                  animatedStyle
                ]}
              >
                <TouchableOpacity
                  style={styles.tab}
                  onPress={() => handleTabPress(tab.route, index)}
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View style={[
                    styles.iconContainer, 
                    isActive && styles.iconContainerActive
                  ]}>
                    <IconSymbol
                      name={tab.icon as any}
                      size={isActive ? 26 : 22}
                      color={isActive ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: isActive ? colors.primary : colors.textSecondary,
                        fontWeight: isActive ? '700' : '600',
                        opacity: isActive ? 1 : 0.8,
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
    borderWidth: Platform.OS === 'android' ? 1 : 0,
    borderColor: Platform.OS === 'android' ? colors.border + '40' : 'transparent',
  },
  tabWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 56,
    borderRadius: 12,
  },
  iconContainer: {
    marginBottom: 2,
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  iconContainerActive: {
    backgroundColor: colors.primary + '15',
  },
  label: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
});
