/**
 * CameraCaptureModal
 *
 * Full-screen camera overlay that supports:
 *  - Taking photos (JPEG, 0.85 quality)
 *  - Recording video (up to 120 s, MP4)
 *  - Switching Photo ↔ Video via a pill toggle
 *  - Flipping front / back camera
 *  - Flash toggle (photo mode only)
 *
 * Used by app/editor.tsx for the "camera" action bar button.
 * On capture, calls `onCapture(uri, mimeType, fileName)` then closes itself.
 *
 * expo-camera v17 API notes:
 *  - CameraView is a class component; we hold a ref to its instance.
 *  - `mode` prop must be 'picture' or 'video' — set before recording starts.
 *  - `recordAsync({ maxDuration })` resolves when stopRecording() is called
 *    or maxDuration is reached.
 *  - `stopRecording()` is synchronous on the class instance.
 */

import React, {
  useRef, useState, useCallback, useEffect,
} from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { CameraView, Camera as ExpoCamera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  X, RotateCcw, Camera, Video, Zap, ZapOff, ImageIcon,
} from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/tokens';

// ─── Types ─────────────────────────────────────────────────────────────────

type CaptureMode = 'photo' | 'video';

export interface CameraCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called with the local URI, mime type and a suggested file name. */
  onCapture: (uri: string, mimeType: string, fileName: string) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDuration(secs: number): string {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function CameraCaptureModal({
  visible,
  onClose,
  onCapture,
}: CameraCaptureModalProps) {
  const insets = useSafeAreaInsets();

  // expo-camera v17: ref to the class component instance
  const cameraRef = useRef<CameraView>(null);

  const [captureMode, setCaptureMode] = useState<CaptureMode>('photo');
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);   // photo shutter busy
  const [isRecording, setIsRecording] = useState(false);   // video recording active
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Request both camera + mic when the modal first opens
  useEffect(() => {
    if (!visible) return;
    setIsCameraReady(false);
    setIsRecording(false);
    setIsCapturing(false);
    setRecordSeconds(0);

    (async () => {
      const [camResult, micResult] = await Promise.all([
        ExpoCamera.requestCameraPermissionsAsync(),
        ExpoCamera.requestMicrophonePermissionsAsync(),
      ]);
      if (!isMountedRef.current) return;
      const granted = camResult.status === 'granted' && micResult.status === 'granted';
      setHasPermission(granted);
      if (!granted) {
        Alert.alert(
          'Camera access required',
          'Memento needs access to your camera and microphone to capture memories.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Cancel', style: 'cancel', onPress: onClose },
          ],
        );
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Recording timer ───────────────────────────────────────────────────────

  const startTimer = useCallback(() => {
    setRecordSeconds(0);
    timerRef.current = setInterval(() => {
      if (isMountedRef.current) setRecordSeconds(s => s + 1);
    }, 1000);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // ── Safe close — stops any in-flight recording first ─────────────────────

  const handleClose = useCallback(() => {
    if (isRecording) cameraRef.current?.stopRecording();
    clearTimer();
    onClose();
  }, [isRecording, clearTimer, onClose]);

  // ── Photo capture ─────────────────────────────────────────────────────────

  const handleTakePhoto = useCallback(async () => {
    if (!isCameraReady || isCapturing || !cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (!isMountedRef.current) return;
      onCapture(photo.uri, 'image/jpeg', `photo_${Date.now()}.jpg`);
      onClose();
    } catch {
      // silently swallow — user may have cancelled
    } finally {
      if (isMountedRef.current) setIsCapturing(false);
    }
  }, [isCameraReady, isCapturing, onCapture, onClose]);

  // ── Video recording ───────────────────────────────────────────────────────

  const handleStartRecording = useCallback(async () => {
    if (!isCameraReady || isRecording || !cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsRecording(true);
    startTimer();
    try {
      // recordAsync resolves only when stopRecording() is invoked or
      // maxDuration / maxFileSize is reached.
      const result = await cameraRef.current.recordAsync({ maxDuration: 120 });
      if (!isMountedRef.current) return;
      if (result?.uri) {
        onCapture(result.uri, 'video/mp4', `video_${Date.now()}.mp4`);
        onClose();
      }
    } catch {
      // cancelled or camera unmounted
    } finally {
      if (isMountedRef.current) {
        setIsRecording(false);
        clearTimer();
        setRecordSeconds(0);
      }
    }
  }, [isCameraReady, isRecording, startTimer, clearTimer, onCapture, onClose]);

  const handleStopRecording = useCallback(() => {
    if (!isRecording || !cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // synchronous — resolves the recordAsync Promise above
    cameraRef.current.stopRecording();
    clearTimer();
  }, [isRecording, clearTimer]);

  // ── Unified shutter press ─────────────────────────────────────────────────

  const handleShutterPress = useCallback(() => {
    if (captureMode === 'photo') {
      handleTakePhoto();
    } else {
      if (isRecording) handleStopRecording();
      else handleStartRecording();
    }
  }, [captureMode, isRecording, handleTakePhoto, handleStartRecording, handleStopRecording]);

  // ── Gallery picker — open device library for images or videos ────────────

  const handleGallery = useCallback(async () => {
    if (isRecording) return;
    Haptics.selectionAsync();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow Memento to access your photos and videos.', [
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: false,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      const isVideo = a.mimeType?.startsWith('video/');
      onCapture(
        a.uri,
        a.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
        a.fileName || `${isVideo ? 'video' : 'photo'}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
      );
      onClose();
    }
  }, [isRecording, onCapture, onClose]);

  // ── Mode switch (only allowed while not recording) ────────────────────────

  const handleSetMode = useCallback((m: CaptureMode) => {
    if (isRecording) return;
    Haptics.selectionAsync();
    setCaptureMode(m);
  }, [isRecording]);

  // ── Early-exit: Modal not visible ─────────────────────────────────────────

  if (!visible) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* SafeAreaProvider scoped to this Modal window — fixes useSafeAreaInsets()
          returning zero insets on first open on iOS (separate UIWindow) */}
      <SafeAreaProvider>
      <View style={styles.root}>

        {/* ── Loading / denied ── */}
        {hasPermission === null && (
          <View style={styles.centred}>
            <ActivityIndicator color={COLORS.textInverse} size="large" />
          </View>
        )}

        {hasPermission === false && (
          <View style={styles.centred}>
            <Text style={styles.permText}>Camera permission required</Text>
            <TouchableOpacity
              onPress={() => Linking.openSettings()}
              style={styles.permBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.permBtnText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Camera live view ── */}
        {hasPermission === true && (
          <>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              flash={flash}
              // mode MUST be 'video' for recordAsync to produce a video file
              mode={captureMode === 'photo' ? 'picture' : 'video'}
              onCameraReady={() => setIsCameraReady(true)}
              onMountError={() => setIsCameraReady(false)}
            />

            {/* ── Top bar ── */}
            <View
              style={[
                styles.topBar,
                { top: insets.top + 12 },
              ]}
            >
              {/* Close */}
              <TouchableOpacity
                onPress={handleClose}
                activeOpacity={0.8}
                style={styles.iconBtn}
              >
                <X size={20} color={COLORS.textInverse} strokeWidth={2} />
              </TouchableOpacity>

              {/* Recording timer */}
              {isRecording ? (
                <View style={styles.recTimer}>
                  <View style={styles.recDot} />
                  <Text style={styles.recTimerText}>
                    {formatDuration(recordSeconds)}
                  </Text>
                </View>
              ) : <View style={{ width: 44 }} />}

              {/* Flash (photo only) */}
              {captureMode === 'photo' ? (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFlash(f => f === 'off' ? 'on' : 'off');
                  }}
                  activeOpacity={0.8}
                  style={styles.iconBtn}
                >
                  {flash === 'off'
                    ? <ZapOff size={20} color={COLORS.textInverse} strokeWidth={2} />
                    : <Zap size={20} color="#FFD700" strokeWidth={2} />}
                </TouchableOpacity>
              ) : (
                <View style={{ width: 44 }} />
              )}
            </View>

            {/* ── Bottom controls ── */}
            <View style={[styles.bottomBar, { bottom: insets.bottom + 32 }]}>

              {/* Photo / Video mode pills — hidden while recording */}
              {!isRecording && (
                <View style={styles.modePillRow}>
                  <TouchableOpacity
                    onPress={() => handleSetMode('photo')}
                    style={[
                      styles.modePill,
                      captureMode === 'photo' && styles.modePillActive,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Camera
                      size={14}
                      color={captureMode === 'photo' ? COLORS.textStrong : COLORS.textInverse}
                      strokeWidth={2}
                    />
                    <Text style={[
                      styles.modePillText,
                      captureMode === 'photo' && styles.modePillTextActive,
                    ]}>
                      Photo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleSetMode('video')}
                    style={[
                      styles.modePill,
                      captureMode === 'video' && styles.modePillActive,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Video
                      size={14}
                      color={captureMode === 'video' ? COLORS.textStrong : COLORS.textInverse}
                      strokeWidth={2}
                    />
                    <Text style={[
                      styles.modePillText,
                      captureMode === 'video' && styles.modePillTextActive,
                    ]}>
                      Video
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Shutter row */}
              <View style={styles.shutterRow}>
                {/* Flip camera — disabled during recording */}
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFacing(f => f === 'back' ? 'front' : 'back');
                  }}
                  activeOpacity={0.8}
                  disabled={isRecording}
                  style={[styles.iconBtn, isRecording && styles.iconBtnDisabled]}
                >
                  <RotateCcw
                    size={22}
                    color={isRecording ? 'rgba(255,255,255,0.3)' : COLORS.textInverse}
                    strokeWidth={2}
                  />
                </TouchableOpacity>

                {/* Main shutter button */}
                <TouchableOpacity
                  onPress={handleShutterPress}
                  activeOpacity={0.85}
                  disabled={!isCameraReady || isCapturing}
                  style={[
                    styles.shutter,
                    captureMode === 'video' && isRecording && styles.shutterRecording,
                    (!isCameraReady || isCapturing) && styles.shutterDisabled,
                  ]}
                >
                  {isCapturing ? (
                    <ActivityIndicator color={COLORS.textInverse} />
                  ) : captureMode === 'photo' ? (
                    <View style={styles.shutterInnerPhoto} />
                  ) : isRecording ? (
                    // Stop square
                    <View style={styles.shutterInnerStop} />
                  ) : (
                    // Record dot
                    <View style={styles.shutterInnerRecord} />
                  )}
                </TouchableOpacity>

                {/* Gallery picker — opens device library for images + videos */}
                <TouchableOpacity
                  onPress={handleGallery}
                  activeOpacity={0.8}
                  disabled={isRecording}
                  style={[styles.iconBtn, isRecording && styles.iconBtnDisabled]}
                >
                  <ImageIcon
                    size={22}
                    color={isRecording ? 'rgba(255,255,255,0.3)' : COLORS.textInverse}
                    strokeWidth={2}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>
      </SafeAreaProvider>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  permText: {
    fontFamily: FONTS.sansBold,
    fontSize: 16,
    color: COLORS.textInverse,
    textAlign: 'center',
  },
  permBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
  },
  permBtnText: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    color: COLORS.textInverse,
  },

  // ── Top bar ──────────────────────────────────────────────────────────────
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  recTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  recDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.error,
  },
  recTimerText: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
    color: COLORS.textInverse,
  },

  // ── Icon buttons ─────────────────────────────────────────────────────────
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDisabled: {
    opacity: 0.35,
  },

  // ── Bottom area ──────────────────────────────────────────────────────────
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 28,
  },

  // ── Mode pill toggle ─────────────────────────────────────────────────────
  modePillRow: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    padding: 4,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  modePillActive: {
    backgroundColor: COLORS.textInverse,
  },
  modePillText: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
    color: COLORS.textInverse,
  },
  modePillTextActive: {
    color: COLORS.textStrong,
  },

  // ── Shutter ──────────────────────────────────────────────────────────────
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 48,
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: COLORS.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  shutterRecording: {
    borderColor: COLORS.error,
  },
  shutterDisabled: {
    opacity: 0.45,
  },
  // Photo: big white filled circle inside the ring
  shutterInnerPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.textInverse,
  },
  // Video idle: red circle
  shutterInnerRecord: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.error,
  },
  // Video recording: red rounded square (stop)
  shutterInnerStop: {
    width: 24,
    height: 24,
    borderRadius: 5,
    backgroundColor: COLORS.error,
  },
});
