import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import { Button } from '@/components/ui';
import { TYPE } from '@/constants/typography';
import { SENTRY_DSN } from '@/lib/env';
import { logger } from '@/lib/logger';
import { useThemeColors } from '@/hooks/use-theme-colors';

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
    return <AppErrorFallback onReset={this.handleReset} />;
  }
}

const APP_ICON = require('../../../assets/icon.png');

function AppErrorFallback({ onReset }: { onReset: () => void }) {
  const colors = useThemeColors();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Image source={APP_ICON} style={styles.logo} resizeMode="contain" accessibilityLabel="Memento" />
        <Text style={[TYPE.screenTitle, styles.centered, { color: colors.textStrong }]}>
          Something went off track
        </Text>
        <Text style={[TYPE.body, styles.centered, styles.body, { color: colors.textBase }]}>
          Try again. If it keeps happening, we have the crash report and will look into it.
        </Text>
        <Button onPress={onReset} size="lg" rounded="full" className="mt-8 px-10">
          Try again
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 24,
  },
  centered: {
    textAlign: 'center',
  },
  body: {
    marginTop: 8,
    maxWidth: 320,
  },
});
