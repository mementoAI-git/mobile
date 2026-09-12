import React from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import { Button } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { SENTRY_DSN } from '@/lib/env';
import { logger } from '@/lib/logger';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('Unhandled app render error', error, info.componentStack);
    if (SENTRY_DSN) {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: info.componentStack,
          },
        },
      });
    }
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ImageBackground source={PATTERN} style={StyleSheet.absoluteFill} imageStyle={styles.pattern} resizeMode="repeat" />
        <View style={styles.content}>
          <View style={styles.mark}>
            <Text style={styles.markText}>M</Text>
          </View>
          <Text style={styles.title}>Something went off track</Text>
          <Text style={styles.body}>
            Try reopening this screen. If it keeps happening, we will have the crash report and enough detail to investigate.
          </Text>
          <Button onPress={this.handleReset} size="lg" className="mt-4 px-8">
            Try again
          </Button>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  pattern: {
    opacity: 0.03,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brandSubtle,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    marginBottom: 20,
  },
  markText: {
    color: COLORS.brand,
    ...TYPE.displayTitle,
    lineHeight: 40,
  },
  title: {
    color: COLORS.textStrong,
    ...TYPE.screenTitle,
    lineHeight: 36,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    color: COLORS.textBase,
    ...TYPE.body,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
});
