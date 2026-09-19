import React from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Button, Logo } from '@/components/ui';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { cn } from '@/lib/utils';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');

export interface OnboardingAction {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  rounded?: 'full' | 'xl' | 'lg' | '2xl';
  className?: string;
  testID?: string;
}

export interface OnboardingShellProps {
  step?: number;
  totalSteps?: number;
  stepLabel?: string;
  indicatorVariant?: 'bars' | 'dots';
  skipButtonVariant?: 'text' | 'pill';
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
  indicatorVariant = 'bars',
  skipButtonVariant = 'text',
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

  const isDots = indicatorVariant === 'dots';
  const isPillSkip = skipButtonVariant === 'pill' || isDots;

  const content = (
    <Animated.View
      key={`onboarding-content-${step ?? 'static'}`}
      entering={FadeInDown.duration(600).reduceMotion(ReduceMotion.System)}
      className="flex-1 px-6"
    >
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
    </Animated.View>
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
                <Button
                  variant="ghost"
                  onPress={onBack}
                  accessibilityLabel="Go back"
                  leftIcon={<ChevronLeft size={20} color={COLORS.textStrong} />}
                  className="size-11 px-0 gap-0 rounded-full bg-fill-weaker border border-stroke-weaker"
                >
                  {null}
                </Button>
              ) : showLogo ? (
                <Logo size="md" />
              ) : null}
            </View>

            {step !== undefined ? (
              <View className="items-center justify-center gap-1.5">
                {isDots ? (
                  <View className="flex-row items-center gap-2">
                    {Array.from({ length: totalSteps }).map((_, index) => (
                      <Animated.View
                        key={index}
                        layout={LinearTransition}
                        className={`size-2 rounded-full ${
                          index < step ? 'bg-brand' : 'bg-fill-weak'
                        }`}
                      />
                    ))}
                  </View>
                ) : (
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
                )}
                {stepLabel && !isDots ? (
                  <Text
                    className="text-text-weak tracking-widest uppercase"
                    style={TYPE.eyebrow}
                  >
                    {stepLabel}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View className="w-20 items-end justify-center">
              {onSkip ? (
                <Button
                  variant="ghost"
                  onPress={onSkip}
                  disabled={isSkipping}
                  loading={isSkipping}
                  accessibilityLabel={skipLabel}
                  rightIcon={isPillSkip ? undefined : <ChevronRight size={14} color={COLORS.textWeak} />}
                  className={
                    isPillSkip
                      ? 'min-h-[44px] px-3.5 py-1 rounded-full bg-fill-weaker border border-stroke-weaker'
                      : 'min-h-[44px] px-0 gap-1'
                  }
                >
                  {skipLabel}
                </Button>
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
            contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
            className="flex-1"
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}

        {/* Footer */}
        {hasFooter ? (
          <View className="px-6 pt-3 pb-4 bg-background/95 border-t border-stroke-weaker">
            {errorMessage ? (
              <Animated.Text
                entering={FadeInDown.duration(200).reduceMotion(ReduceMotion.System)}
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
                    variant="outline"
                    size="lg"
                    rounded={secondaryAction.rounded ?? 'full'}
                    onPress={secondaryAction.onPress}
                    loading={secondaryAction.loading}
                    disabled={secondaryAction.disabled}
                    accessibilityLabel={secondaryAction.label}
                    className={cn(
                      'flex-1 bg-card border border-stroke-weak',
                      secondaryAction.rounded === 'xl' ? '!h-[52px]' : 'h-14',
                      secondaryAction.className,
                    )}
                  >
                    {secondaryAction.label}
                  </Button>
                ) : null}

                {primaryAction ? (
                  <Button
                    size="lg"
                    rounded={primaryAction.rounded ?? 'full'}
                    onPress={primaryAction.onPress}
                    loading={primaryAction.loading}
                    disabled={primaryAction.disabled}
                    accessibilityLabel={primaryAction.label}
                    className={cn(
                      'flex-1 bg-brand',
                      primaryAction.rounded === 'xl' ? '!h-[52px]' : 'h-14',
                      primaryAction.className,
                    )}
                  >
                    {primaryAction.label}
                  </Button>
                ) : null}
              </View>
            )}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
