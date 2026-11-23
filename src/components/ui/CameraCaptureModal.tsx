import { useThemeColors, useThemedStyles } from '@/hooks/use-theme-colors';
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
  View,
  Text,
  Modal,
  StyleSheet,
  Image,
  ActivityIndicator,
  AppState,
  Linking,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { CameraView, Camera as ExpoCamera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { requestLibraryPickerAccess } from '@/features/media/library-picker-access';
import * as Haptics from 'expo-haptics';
import { PermissionRecoveryState } from '@/components/ui/PermissionRecoveryState';
import X from 'lucide-react-native/icons/x';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import Camera from 'lucide-react-native/icons/camera';
import Video from 'lucide-react-native/icons/video';
import Zap from 'lucide-react-native/icons/zap';
import ZapOff from 'lucide-react-native/icons/zap-off';
import ImageIcon from 'lucide-react-native/icons/image';
import Mic from 'lucide-react-native/icons/mic';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, radius, minTouchTarget } from '@/constants/responsive';
import {
  getPermissionRecoveryAction,
  isPermissionGranted,
  type PermissionLike,
} from '@/lib/permission-recovery';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';

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
  const COLORS = useThemeColors();
  const styles = useThemedStyles(stylesBase);
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
  const [cameraPermission, setCameraPermission] = useState<PermissionLike | null>(null);
  const [microphonePermission, setMicrophonePermission] = useState<PermissionLike | null>(null);
  const [permissionLoading, setPermissionLoading] = useState(false);

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

  // Request camera when the modal first opens. Microphone is requested only
  // when the user chooses video, so denied mic access never blocks photos.
  useEffect(() => {
    if (!visible) return;
    setIsCameraReady(false);
    setIsRecording(false);
    setIsCapturing(false);
    setRecordSeconds(0);
    setCameraPermission(null);
    setPermissionLoading(true);

    (async () => {
      try {
        const camResult = await ExpoCamera.requestCameraPermissionsAsync();
        if (!isMountedRef.current) return;
        setCameraPermission(camResult);
      } finally {
        if (isMountedRef.current) {
          setPermissionLoading(false);
        }
      }
    })();
  }, [visible]);

  const requestMicrophonePermission = useCallback(async () => {
    const micResult = await ExpoCamera.requestMicrophonePermissionsAsync();
    if (isMountedRef.current) {
      setMicrophonePermission(micResult);
    }
    return micResult;
  }, []);

  const refreshPermissions = useCallback(async () => {
    const camResult = await ExpoCamera.getCameraPermissionsAsync();
    if (!isMountedRef.current) return;
    setCameraPermission(camResult);

    if (captureMode === 'video') {
      const micResult = await ExpoCamera.getMicrophonePermissionsAsync();
      if (isMountedRef.current) {
        setMicrophonePermission(micResult);
      }
    }
  }, [captureMode]);

  const cameraGranted = isPermissionGranted(cameraPermission);
  const microphoneGranted = isPermissionGranted(microphonePermission);
  const cameraIssue = cameraPermission && !cameraGranted ? cameraPermission : null;
  const microphoneIssue =
    captureMode === 'video' && microphonePermission && !microphoneGranted
      ? microphonePermission
      : null;
  const activePermissionIssue = cameraIssue ?? microphoneIssue;
  const activePermissionKind = cameraIssue ? 'camera' : microphoneIssue ? 'microphone' : null;
  const activePermissionAction = getPermissionRecoveryAction(activePermissionIssue);

  const handlePermissionAction = useCallback(async () => {
    if (activePermissionAction === 'settings') {
      Linking.openSettings();
      return;
    }

    if (activePermissionKind === 'camera') {
      setPermissionLoading(true);
      try {
        const result = await ExpoCamera.requestCameraPermissionsAsync();
        if (isMountedRef.current) setCameraPermission(result);
      } finally {
        if (isMountedRef.current) setPermissionLoading(false);
      }
      return;
    }

    if (activePermissionKind === 'microphone') {
      await requestMicrophonePermission();
    }
  }, [activePermissionAction, activePermissionKind, requestMicrophonePermission]);

  const handlePermissionSecondary = useCallback(() => {
    if (activePermissionKind === 'microphone') {
      setCaptureMode('photo');
      return;
    }
    onClose();
  }, [activePermissionKind, onClose]);

  const permissionRecoveryCopy = {
    icon: activePermissionKind === 'microphone' ? Mic : Camera,
    title: activePermissionKind === 'microphone' ? 'Microphone is off' : 'Camera is tucked away',
    description:
      activePermissionKind === 'microphone'
        ? activePermissionAction === 'settings'
          ? 'Video memories need microphone access for sound. Turn it back on in Settings, or keep capturing photos.'
          : 'Allow microphone access to record sound with your videos. Photo capture still works without it.'
        : activePermissionAction === 'settings'
        ? 'Memento cannot open the camera because access is turned off in Settings. Turn it back on to capture a memory here.'
        : 'Allow camera access to capture photos and videos directly into your memories.',
    secondaryLabel: activePermissionKind === 'microphone' ? 'Use Photo' : 'Dismiss',
  };

  useEffect(() => {
    if (!visible || !activePermissionIssue) return undefined;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshPermissions();
      }
    });

    return () => subscription.remove();
  }, [activePermissionIssue, refreshPermissions, visible]);

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
    if (!microphoneGranted) {
      const micResult = await requestMicrophonePermission();
      if (!isPermissionGranted(micResult)) return;
    }
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
  }, [isCameraReady, isRecording, microphoneGranted, requestMicrophonePermission, startTimer, clearTimer, onCapture, onClose]);

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
    const permission = await requestLibraryPickerAccess();
    if (!isPermissionGranted(permission)) {
      showPermissionRecoveryAlert({
        permission,
        title: 'Media is tucked away',
        description: 'Allow photo and video access to choose media from your library.',
        settingsDescription: 'Photo and video access is turned off in Settings. Turn it back on to choose media from your library.',
      });
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

  const handleSetMode = useCallback(async (m: CaptureMode) => {
    if (isRecording) return;
    Haptics.selectionAsync();
    setCaptureMode(m);
    if (m === 'video' && !microphoneGranted) {
      await requestMicrophonePermission();
    }
  }, [isRecording, microphoneGranted, requestMicrophonePermission]);

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
        {permissionLoading && !activePermissionIssue && (
          <View style={styles.centred}>
            <ActivityIndicator color={COLORS.textInverse} size="large" />
          </View>
        )}

        {activePermissionIssue && (
          <View style={styles.centred}>
            <PermissionRecoveryState
              icon={permissionRecoveryCopy.icon}
              title={permissionRecoveryCopy.title}
              description={permissionRecoveryCopy.description}
              actionLabel={activePermissionAction === 'settings' ? 'Open Settings' : 'Allow access'}
              onAction={handlePermissionAction}
              secondaryLabel={permissionRecoveryCopy.secondaryLabel}
              onSecondary={handlePermissionSecondary}
              tone="dark"
            />
          </View>
        )}

        {/* ── Camera live view ── */}
        {cameraGranted && !activePermissionIssue && (
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

const stylesBase = StyleSheet.create({
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
    ...TYPE.bodySmall,
    color: COLORS.textInverse,
  },

  // ── Icon buttons ─────────────────────────────────────────────────────────
  iconBtn: {
    width: minTouchTarget(44),
    height: minTouchTarget(44),
    borderRadius: radius(22),
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
    ...TYPE.bodySmall,
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
    width: minTouchTarget(76),
    height: minTouchTarget(76),
    borderRadius: radius(38),
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
    width: minTouchTarget(60),
    height: minTouchTarget(60),
    borderRadius: radius(30),
    backgroundColor: COLORS.textInverse,
  },
  // Video idle: red circle
  shutterInnerRecord: {
    width: 30,
    height: 30,
    borderRadius: radius(15),
    backgroundColor: COLORS.error,
  },
  // Video recording: red rounded square (stop)
  shutterInnerStop: {
    width: 24,
    height: 24,
    borderRadius: radius(5),
    backgroundColor: COLORS.error,
  },
});
