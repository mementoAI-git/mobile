import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ImageBackground,
  Modal,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { X, RotateCcw } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

const EMPTY_MEMORIES_IMG = require('../../../assets/images/illustrations/empty_memories.webp');
const WELCOME_BG = require('../../../assets/images/backgrounds/welcome_bg.png');

export interface OnboardingCelebrationOverlayProps {
  visible: boolean;
  preferredName?: string;
  stage?: number | null;
  interactiveLabMode?: boolean;
  onComplete?: () => void;
  onClose?: () => void;
}

const VAULT_ITEMS = [
  {
    id: 1,
    title: 'Personal encryption keys',
    subtitle: 'Zero-knowledge private storage initialized',
    statusLabel: 'Secured',
  },
  {
    id: 2,
    title: 'Life dimensions calibrated',
    subtitle: 'Values, motivations & horizons mapped',
    statusLabel: 'Calibrated',
  },
  {
    id: 3,
    title: 'AI memory companion',
    subtitle: 'Tuned to listen, connect & preserve with warmth',
    statusLabel: 'Ready',
  },
];

export function OnboardingCelebrationOverlay({
  visible,
  preferredName,
  stage: externalStage,
  interactiveLabMode = false,
  onComplete,
  onClose,
}: OnboardingCelebrationOverlayProps) {
  const [internalStage, setInternalStage] = useState<number>(1);

  // If controlled externally (like during live onboarding flow), use externalStage
  const currentStage = externalStage !== undefined && externalStage !== null
    ? externalStage
    : internalStage;

  useEffect(() => {
    if (!visible) {
      setInternalStage(1);
      return;
    }

    // If not in manual lab mode and external stage isn't provided, run auto timer
    if (!interactiveLabMode && externalStage === undefined) {
      setInternalStage(1);
      const t1 = setTimeout(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setInternalStage(2);
      }, 700);

      const t2 = setTimeout(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setInternalStage(3);
      }, 1400);

      const t3 = setTimeout(() => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onComplete?.();
      }, 2200);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [visible, interactiveLabMode, externalStage, onComplete]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <ImageBackground
          source={WELCOME_BG}
          style={StyleSheet.absoluteFill}
          resizeMode="repeat"
          imageStyle={{ opacity: 0.03 }}
        />

        {/* Lab Close Button */}
        {interactiveLabMode && (
          <TouchableOpacity
            onPress={() => {
              void Haptics.selectionAsync();
              onClose?.();
            }}
            style={styles.closeBtn}
            accessibilityLabel="Close overlay"
          >
            <X size={18} color={COLORS.textStrong} />
          </TouchableOpacity>
        )}

        <View style={styles.centerContainer}>
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.contentWrapper}
          >
            {/* Vault Graphic */}
            <View style={styles.graphicWrapper}>
              <Image
                source={EMPTY_MEMORIES_IMG}
                style={styles.graphic}
                resizeMode="contain"
              />
            </View>

            {/* Editorial Title */}
            <Text style={[TYPE.screenTitle, styles.titleText]}>
              Forging Your Personal Vault
            </Text>
            <Text style={[TYPE.body, styles.subtitleText]}>
              Preparing your private archive, {preferredName || 'friend'}...
            </Text>

            {/* Plain Smooth Card */}
            <View style={styles.cardContainer}>
              {VAULT_ITEMS.map((item, index) => {
                const isDone = currentStage >= item.id;
                const isCurrent = currentStage === item.id;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.row,
                      index > 0 && styles.rowBorder,
                    ]}
                  >
                    {/* Concentric Status Indicator (Zero Checkmarks) */}
                    {/* <View
                      style={[
                        styles.indicatorRing,
                        isDone && styles.indicatorRingActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.indicatorDot,
                          isDone && styles.indicatorDotActive,
                        ]}
                      />
                    </View> */}

                    {/* Content */}
                    <View style={styles.rowContent}>
                      <View style={styles.rowHeader}>
                        <Text
                          style={[
                            TYPE.buttonSmall,
                            {
                              color: isDone
                                ? COLORS.textStrong
                                : COLORS.textWeak,
                            },
                          ]}
                        >
                          {item.title}
                        </Text>

                        {/* {isDone && (
                          <View style={styles.statusPill}>
                            <Text
                              style={[
                                TYPE.eyebrow,
                                {
                                  color: COLORS.brand,
                                  textTransform: 'uppercase',
                                  letterSpacing: 1,
                                },
                              ]}
                            >
                              {item.statusLabel}
                            </Text>
                          </View>
                        )} */}
                      </View>

                      <Text
                        style={[
                          TYPE.bodySmall,
                          {
                            color: isDone
                              ? COLORS.textBase
                              : COLORS.textMuted,
                            marginTop: 2,
                          },
                        ]}
                      >
                        {item.subtitle}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </View>

        {/* Interactive Lab Controls */}
        {interactiveLabMode && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.labToolbar}>
            <Text style={[TYPE.eyebrow, { color: COLORS.brand, marginBottom: 8 }]}>
              Ceremonial Lab Inspector
            </Text>
            <View style={styles.labBtnRow}>
              {[1, 2, 3].map((step) => (
                <TouchableOpacity
                  key={step}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setInternalStage(step);
                  }}
                  style={[
                    styles.labPill,
                    currentStage === step && styles.labPillActive,
                  ]}
                >
                  <Text
                    style={[
                      TYPE.buttonSmall,
                      {
                        color: currentStage === step ? '#ffffff' : COLORS.textStrong,
                      },
                    ]}
                  >
                    Stage {step}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setInternalStage(1);
                  setTimeout(() => setInternalStage(2), 600);
                  setTimeout(() => setInternalStage(3), 1200);
                }}
                style={[styles.labPill, { backgroundColor: COLORS.brandTint }]}
              >
                <RotateCcw size={14} color={COLORS.brand} />
                <Text style={[TYPE.buttonSmall, { color: COLORS.brand, marginLeft: 4 }]}>
                  Replay
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(254, 251, 248, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  centerContainer: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 54,
    right: 24,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphicWrapper: {
    width: 100,
    height: 100,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphic: {
    width: 90,
    height: 90,
  },
  titleText: {
    textAlign: 'center',
    color: COLORS.textStrong,
    marginBottom: 6,
  },
  subtitleText: {
    textAlign: 'center',
    color: COLORS.textWeak,
    marginBottom: 24,
  },
  // Plain smooth card matching Memento card language
  cardContainer: {
    width: '100%',
    // backgroundColor: '#ffffff',
    // borderRadius: 24,
    // borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    gap: 14,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.strokeWeaker,
  },
  // Concentric ring indicator (signature Memento style)
  indicatorRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.fillWeak,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  indicatorRingActive: {
    backgroundColor: 'rgba(233, 130, 70, 0.15)',
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.strokeWeak,
  },
  indicatorDotActive: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.brand,
  },
  rowContent: {
    flex: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(233, 130, 70, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(233, 130, 70, 0.2)',
  },
  labToolbar: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    padding: 16,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  labBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  labPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    flexDirection: 'row',
    alignItems: 'center',
  },
  labPillActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
});
