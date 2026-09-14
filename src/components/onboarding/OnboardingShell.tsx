import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Button, Logo } from '@/components/ui';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');

export interface OnboardingAction {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

export interface OnboardingShellProps {
  step?: number;
  totalSteps?: number;
  stepLabel?: string;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onSkip?: () => void;
  isSkipping?: boolean;
  skipLabel?: string;
  showLogo?: boolean;
  primaryAction?: OnboardingAction;
  secondaryAction?: OnboardingAction;
  footer?: React.ReactNode;
  errorMessage?: string | null;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function OnboardingShell({
  step,
  totalSteps = 4,
  stepLabel,
  title,
  subtitle,
  onBack,
  onSkip,
  isSkipping = false,
  skipLabel = 'Skip',
  showLogo = false,
  primaryAction,
  secondaryAction,
  footer,
  errorMessage,
  scrollable = true,
  contentContainerStyle,
  children,
}: OnboardingShellProps) {
  const hasHeader = showLogo || onBack || onSkip || step !== undefined;
  const hasFooter = Boolean(primaryAction || secondaryAction || footer || errorMessage);

  const content = (
    <View className="flex-1 px-6">
      {title ? (
        <View className="mb-6">
          <Text className="text-text-strong mb-2" style={TYPE.displayTitle}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-text-base leading-relaxed" style={TYPE.body}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={['top', 'bottom']}
    >
      <ImageBackground
        source={PATTERN}
        className="absolute inset-0"
        style={{ opacity: 0.03 }}
        resizeMode="repeat"
      />

      {/* Header */}
      {hasHeader ? (
        <View className="px-6 pt-2 pb-3">
          <View className="flex-row items-center justify-between min-h-[44px]">
            <View className="w-16 items-start justify-center">
              {onBack ? (
                <TouchableOpacity
                  onPress={onBack}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  className="w-10 h-10 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center"
                >
                  <ChevronLeft size={20} color={COLORS.textStrong} />
                </TouchableOpacity>
              ) : showLogo ? (
                <Logo size="md" />
              ) : null}
            </View>

            {step !== undefined ? (
              <View className="items-center justify-center gap-1.5">
                <View className="flex-row items-center gap-1.5">
                  {Array.from({ length: totalSteps }).map((_, index) => (
                    <Animated.View
                      key={index}
                      layout={LinearTransition}
                      className={`rounded-full ${
                        index < step ? 'bg-brand' : 'bg-brand/15'
                      }`}
                      style={{
                        width: index === step - 1 ? 20 : 6,
                        height: 6,
                      }}
                    />
                  ))}
                </View>
                {stepLabel ? (
                  <Text
                    className="text-text-weak tracking-widest uppercase"
                    style={TYPE.eyebrow}
                  >
                    {stepLabel}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View className="w-16 items-end justify-center">
              {onSkip ? (
                <TouchableOpacity
                  onPress={onSkip}
                  disabled={isSkipping}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={skipLabel}
                  className="flex-row items-center gap-1 py-1"
                >
                  <Text className="text-text-base" style={TYPE.label}>
                    {skipLabel}
                  </Text>
                  <ChevronRight size={14} color={COLORS.textWeak} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {/* Main Body */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {scrollable ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={contentContainerStyle}
            className="flex-1"
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>

      {/* Footer */}
      {hasFooter ? (
        <View className="px-6 pt-3 pb-4 bg-background/95 border-t border-stroke-weaker">
          {errorMessage ? (
            <Animated.Text
              entering={FadeInDown.duration(200)}
              className="text-center text-error mb-3"
              style={TYPE.metadata}
            >
              {errorMessage}
            </Animated.Text>
          ) : null}

          {footer ? (
            footer
          ) : (
            <View className="flex-row items-center gap-3">
              {secondaryAction ? (
                <Button
                  variant="secondary"
                  size="lg"
                  onPress={secondaryAction.onPress}
                  disabled={secondaryAction.disabled}
                  className="flex-1 h-14 rounded-full"
                >
                  <Text className="text-text-strong" style={TYPE.button}>
                    {secondaryAction.label}
                  </Text>
                </Button>
              ) : null}

              {primaryAction ? (
                <Button
                  size="lg"
                  onPress={primaryAction.onPress}
                  loading={primaryAction.loading}
                  disabled={primaryAction.disabled}
                  className="flex-1 h-14 bg-brand rounded-full"
                >
                  <Text className="text-white" style={TYPE.button}>
                    {primaryAction.label}
                  </Text>
                </Button>
              ) : null}
            </View>
          )}
        </View>
      ) : null}
    </SafeAreaView>
  );
}
