
import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles } from "@/styles/commonStyles";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get('window');

interface OnboardingStep {
  icon: string;
  title: string;
  description: string;
  color: string;
}

const steps: OnboardingStep[] = [
  {
    icon: "person.fill",
    title: "Create Your Profile",
    description: "Complete your detailed profile with information about yourself, your preferences, and what you're looking for in a partner.",
    color: colors.primary,
  },
  {
    icon: "magnifyingglass",
    title: "Discover Matches",
    description: "Browse through potential matches based on your preferences. Your profile photo remains private until you both connect.",
    color: colors.secondary,
  },
  {
    icon: "heart.fill",
    title: "Connect & Chat",
    description: "Send connection requests to people you're interested in. Once accepted, you can view each other's photos and start chatting.",
    color: colors.accent,
  },
  {
    icon: "shield.checkmark.fill",
    title: "Stay Safe",
    description: "Report inappropriate behavior, control your online status, and enjoy a respectful dating environment.",
    color: colors.success,
  },
];

export default function HowItWorksScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      scrollViewRef.current?.scrollTo({ x: width * nextStep, animated: true });
    } else {
      router.push('/terms-and-conditions');
    }
  };

  const handleSkip = () => {
    router.push('/terms-and-conditions');
  };

  const handleBack = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      scrollViewRef.current?.scrollTo({ x: width * prevStep, animated: true });
    } else {
      router.back();
    }
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const step = Math.round(offsetX / width);
    setCurrentStep(step);
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>How It Works</Text>
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        {/* Progress Indicators */}
        <View style={styles.progressContainer}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === currentStep && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        {/* Content ScrollView */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
        >
          {steps.map((step, index) => (
            <View key={index} style={styles.stepContainer}>
              <View style={styles.stepContent}>
                <View style={[styles.iconContainer, { backgroundColor: step.color + '20' }]}>
                  <IconSymbol name={step.icon} size={80} color={step.color} />
                </View>
                
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>

                {/* Feature List */}
                {index === 0 && (
                  <View style={styles.featureList}>
                    <FeatureItem icon="checkmark.circle.fill" text="Detailed profile questions" />
                    <FeatureItem icon="checkmark.circle.fill" text="Privacy-first approach" />
                    <FeatureItem icon="checkmark.circle.fill" text="Optional photo uploads" />
                  </View>
                )}

                {index === 1 && (
                  <View style={styles.featureList}>
                    <FeatureItem icon="checkmark.circle.fill" text="Smart matching algorithm" />
                    <FeatureItem icon="checkmark.circle.fill" text="Filter by preferences" />
                    <FeatureItem icon="checkmark.circle.fill" text="Photos hidden until match" />
                  </View>
                )}

                {index === 2 && (
                  <View style={styles.featureList}>
                    <FeatureItem icon="checkmark.circle.fill" text="Send connection requests" />
                    <FeatureItem icon="checkmark.circle.fill" text="Real-time messaging" />
                    <FeatureItem icon="checkmark.circle.fill" text="Photo reveal on acceptance" />
                  </View>
                )}

                {index === 3 && (
                  <View style={styles.featureList}>
                    <FeatureItem icon="checkmark.circle.fill" text="Report & block users" />
                    <FeatureItem icon="checkmark.circle.fill" text="Control online status" />
                    <FeatureItem icon="checkmark.circle.fill" text="24/7 support available" />
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.nextButton}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === steps.length - 1 ? 'Continue' : 'Next'}
            </Text>
            <IconSymbol name="arrow.right" size={20} color={colors.card} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <IconSymbol name={icon} size={20} color={colors.success} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  progressDot: {
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    width: width,
    paddingHorizontal: 20,
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
    elevation: 8,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  featureList: {
    width: '100%',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  featureText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0px 4px 12px rgba(63, 81, 181, 0.3)',
    elevation: 4,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.card,
  },
});
