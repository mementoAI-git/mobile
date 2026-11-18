import React from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { Button, Logo } from '@/components/ui';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { TYPE } from '@/constants/typography';
import { cn } from '@/lib/utils';
import { OnboardingIcon } from './OnboardingIcon';


/** Onboarding action buttons are 48px pills (Figma onboarding, node 19761:10606). */
export const ONBOARDING_BUTTON_STYLE = { minHeight: 48, height: 48 } as const;

export interface OnboardingAction {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  testID?: string;
}

export interface OnboardingShellProps {
  step?: number;
  totalSteps?: number;
  stepLabel?: string;
  indicatorVariant?: 'bars' | 'dots';
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
  const colors = useThemeColors();
  const hasHeader = showLogo || onBack || onSkip || step !== undefined;
  const hasFooter = Boolean(primaryAction || secondaryAction || footer || errorMessage);

  const isDots = indicatorVariant === 'dots';

  const content = (
    <Animated.View
      key={`onboarding-content-${step ?? 'static'}`}
      entering={FadeInDown.duration(600).reduceMotion(ReduceMotion.System)}
      className="flex-1 px-4"
    >
      {title ? (
        <View className="mb-6">
          <Text className="text-text-strong mb-2" style={TYPE.onboardingTitle}>
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
      {/* Header (Figma onboarding "Page header": 72px, centred step dots, Skip pill) */}
      {hasHeader ? (
        <View className="flex-row items-center justify-between px-4" style={{ height: 72 }}>
          <View style={{ width: 92 }} className="items-start justify-center">
            {onBack ? (
              <Button
                variant="ghost"
                onPress={onBack}
                accessibilityLabel="Go back"
                leftIcon={<ChevronLeft size={20} color={colors.textStrong} />}
                className="size-11 px-0 gap-0 rounded-full bg-fill-weak"
              >
                {null}
              </Button>
            ) : showLogo ? (
              <Logo size="md" />
            ) : null}
          </View>

          {step !== undefined ? (
            isDots ? (
              <StepDots step={step} total={totalSteps} />
            ) : (
              <View className="items-center justify-center gap-1.5">
                <View className="flex-row items-center gap-1.5">
                  {Array.from({ length: totalSteps }).map((_, index) => (
                    <Animated.View
                      key={index}
                      layout={LinearTransition}
                      className={`rounded-full ${index < step ? 'bg-brand' : 'bg-brand/15'}`}
                      style={{ width: index === step - 1 ? 20 : 6, height: 6 }}
                    />
                  ))}
                </View>
                {stepLabel ? (
                  <Text className="text-text-weak tracking-widest uppercase" style={TYPE.eyebrow}>
                    {stepLabel}
                  </Text>
                ) : null}
              </View>
            )
          ) : null}

          <View style={{ width: 92 }} className="items-end justify-center">
            {onSkip ? (
              // 40px Figma pill inside a 44px tap row.
              <View className="min-h-[44px] justify-center">
              <Button
                variant="secondary"
                rounded="full"
                onPress={onSkip}
                disabled={isSkipping}
                loading={isSkipping}
                accessibilityLabel={skipLabel}
                hitSlop={{ top: 2, bottom: 2, left: 0, right: 0 }}
                rightIcon={<OnboardingIcon name="arrowRight" color={colors.textStrong} />}
                textClassName="text-text-strong"
                style={{ height: 40, minHeight: 40, paddingHorizontal: 13, gap: 4 }}
              >
                {skipLabel}
              </Button>
              </View>
            ) : null}
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
          <View className="px-4 pt-3 pb-2">
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
                    rounded="full"
                    style={ONBOARDING_BUTTON_STYLE}
                    onPress={secondaryAction.onPress}
                    loading={secondaryAction.loading}
                    disabled={secondaryAction.disabled}
                    accessibilityLabel={secondaryAction.label}
                    className={cn(
                      'flex-1 bg-card border border-stroke-weak',
                      secondaryAction.className,
                    )}
                  >
                    {secondaryAction.label}
                  </Button>
                ) : null}

                {primaryAction ? (
                  <Button
                    size="lg"
                    rounded="full"
                    style={ONBOARDING_BUTTON_STYLE}
                    onPress={primaryAction.onPress}
                    loading={primaryAction.loading}
                    disabled={primaryAction.disabled}
                    accessibilityLabel={primaryAction.label}
                    className={cn(
                      'flex-1 bg-brand',
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

/** Figma step indicator: 12px dots joined by 8px lines (84px wide for four steps). */
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <View
      className="flex-row items-center"
      style={{ gap: 2 }}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step} of ${total}`}
    >
      {Array.from({ length: total }).map((_, index) => (
        <React.Fragment key={index}>
          {index > 0 ? <View className="bg-stroke-weak" style={{ width: 8, height: 1 }} /> : null}
          <Animated.View
            layout={LinearTransition}
            className={index < step ? 'bg-brand' : 'bg-stroke-weak'}
            style={{ width: 12, height: 12, borderRadius: 6 }}
          />
        </React.Fragment>
      ))}
    </View>
  );
}
