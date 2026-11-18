import { useSheetChrome } from '@/components/sheets/use-sheet-chrome';
import { CalendarDateSheet, CalendarStoriesSheet } from './CalendarSheets';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useUiStore } from '@/store';
import { useRootNavigationState, useSegments } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreateMemorySheet } from './CreateMemorySheet';
import { CreateCapsuleSheet } from './CreateCapsuleSheet';
import { AddBeneficiarySheet } from './AddBeneficiarySheet';
import { BeneficiaryActionsSheet } from './BeneficiaryActionsSheet';
import { MemoryActionsSheet } from './MemoryActionsSheet';
import { CapsuleActionsSheet } from './CapsuleActionsSheet';
import { CreateGroupSheet } from './CreateGroupSheet';
import { ShareMemorySheet } from './ShareMemorySheet';
import { QuickCaptureSheet } from './QuickCaptureSheet';
import { RecorderSheet } from './RecorderSheet';
import { MemoryInsightsSheet } from './MemoryInsightsSheet';
import { SearchMemorySheet } from './SearchMemorySheet';
import { FeedbackSheet } from './FeedbackSheet';
import { CapsuleDetailSheet } from './CapsuleDetailSheet';
import { UpgradePromptSheet } from './UpgradePromptSheet';
import { SelectSheet } from './SelectSheet';
import { DeleteAccountReasonSheet } from './DeleteAccountReasonSheet';
import { StreakSheet } from './StreakSheet';
import { DraftsSheet } from './DraftsSheet';
import { EditProfileSheet } from './EditProfileSheet';
import { EditAboutMeSheet } from './EditAboutMeSheet';
import { ChangePasswordSheet } from './ChangePasswordSheet';
import { SetupTwoFactorSheet } from './SetupTwoFactorSheet';
import { SecurityConfirmationSheet } from './SecurityConfirmationSheet';
import { DigitalMindSheet } from './DigitalMindSheet';
import { VoiceCallSettingsSheet } from './VoiceCallSettingsSheet';
import { EndVoiceSessionSheet } from './EndVoiceSessionSheet';
import { UpgradeSuccessSheet } from './UpgradeSuccessSheet';
import { CapsuleSealedSheet } from './CapsuleSealedSheet';
import { FirstStoryMilestoneSheet } from './FirstStoryMilestoneSheet';
import { AddMemberToGroupSheet } from './AddMemberToGroupSheet';
import { CancelSubscriptionConfirmationSheet } from './CancelSubscriptionConfirmationSheet';
import { GuardianLensSheet } from './GuardianLensSheet';
import { ExportArchiveSheet } from './ExportArchiveSheet';
import { AppearanceSheet } from './AppearanceSheet';
import { DailyRitualSheet } from './DailyRitualSheet';
import { ObservationNoteSheet } from './ObservationNoteSheet';
import { EmojiPickerSheet } from '@/components/chat/EmojiPickerSheet';
import { getSheetActionsBottomPadding } from '@/features/layout/sheet-safe-area';

const SHEET_CONFIGS: Record<string, {
  component: React.ComponentType<any>;
  snapPoints?: string[];
  horizontalPadding?: number;
  dynamic?: boolean;
  keyboardBehavior?: 'interactive' | 'fillParent' | 'extend';
  keyboardBlurBehavior?: 'restore' | 'dismiss' | 'none';
  androidKeyboardInputMode?: 'adjustPan' | 'adjustResize';
  /** Short confirmation: skips the minimum sheet height, like web alert dialogs. */
  compact?: boolean;
  /** Fixed height as a share of the screen, like web's `h-[80dvh]` search sheet. */
  screenHeightRatio?: number;
}> = {
  'calendar-date': { component: CalendarDateSheet, dynamic: true },
  'calendar-stories': { component: CalendarStoriesSheet, dynamic: false, snapPoints: ['65%'] },
  'create-memory': { component: CreateMemorySheet, snapPoints: ['90%'], keyboardBehavior: 'extend' },
  'create-capsule': { component: CreateCapsuleSheet, snapPoints: ['92%'], keyboardBehavior: 'fillParent' },
  'add-beneficiary': { component: AddBeneficiarySheet, snapPoints: ['92%'], dynamic: false, keyboardBehavior: 'fillParent', androidKeyboardInputMode: 'adjustResize' },
  'beneficiary-actions': { component: BeneficiaryActionsSheet, dynamic: true },
  'memory-actions': { component: MemoryActionsSheet, dynamic: true },
  'capsule-actions': { component: CapsuleActionsSheet, dynamic: true },
  'share-memory': { component: ShareMemorySheet, dynamic: true },
  'add-member-to-group': { component: AddMemberToGroupSheet, snapPoints: ['88%'], dynamic: false, keyboardBehavior: 'fillParent', androidKeyboardInputMode: 'adjustResize' },
  'create-group': { component: CreateGroupSheet, snapPoints: ['78%'], dynamic: false, keyboardBehavior: 'fillParent', androidKeyboardInputMode: 'adjustResize' },
  'quick-capture': { component: QuickCaptureSheet, dynamic: true, keyboardBlurBehavior: 'none' },
  // Overview record button: a short recorder that saves straight to Stories.
  'recorder': { component: RecorderSheet, dynamic: true, compact: true },
  'memory-insights': { component: MemoryInsightsSheet, snapPoints: ['88%'] },
  'search-memory': { component: SearchMemorySheet, horizontalPadding: 0, screenHeightRatio: 0.8, dynamic: false, keyboardBehavior: 'extend', keyboardBlurBehavior: 'none' },
  'feedback': { component: FeedbackSheet, snapPoints: ['90%'], dynamic: true, keyboardBehavior: 'fillParent' },
  'capsule-detail': { component: CapsuleDetailSheet, snapPoints: ['92%'] },
  'upgrade-prompt': { component: UpgradePromptSheet, dynamic: true },
  'upgrade-success': { component: UpgradeSuccessSheet, dynamic: true },
  'capsule-sealed': { component: CapsuleSealedSheet, dynamic: true },
  'first-story-milestone': { component: FirstStoryMilestoneSheet, dynamic: true },
  'select': { component: SelectSheet, dynamic: true },
  'delete-account-reason': { component: DeleteAccountReasonSheet, snapPoints: ['92%'], dynamic: false, keyboardBehavior: 'fillParent', androidKeyboardInputMode: 'adjustResize' },
  'streak': { component: StreakSheet, dynamic: true },
  'story-drafts': { component: DraftsSheet, dynamic: false, snapPoints: ['75%'], keyboardBehavior: 'interactive' },
  'edit-about-me': { component: EditAboutMeSheet, dynamic: true, keyboardBehavior: 'interactive', androidKeyboardInputMode: 'adjustResize' },
  'edit-profile': { component: EditProfileSheet, snapPoints: ['100%'], dynamic: false, keyboardBehavior: 'fillParent' },
  'cancel-subscription-confirmation': { component: CancelSubscriptionConfirmationSheet, horizontalPadding: 0, dynamic: true, compact: true },
  'change-password': { component: ChangePasswordSheet, snapPoints: ['100%'], dynamic: true, keyboardBehavior: 'interactive', keyboardBlurBehavior: 'restore', androidKeyboardInputMode: 'adjustResize' },
  'setup-two-factor': { component: SetupTwoFactorSheet, snapPoints: ['92%'], dynamic: false, keyboardBehavior: 'fillParent' },
  'security-confirmation': { component: SecurityConfirmationSheet, horizontalPadding: 0, dynamic: true, compact: true },
  'digital-mind': { component: DigitalMindSheet, dynamic: true },
  // Taller than one screen with every voice listed: it scrolls inside a full-height sheet.
  'voice-call-settings': { component: VoiceCallSettingsSheet, snapPoints: ['92%'], dynamic: false },
  'end-voice-session': { component: EndVoiceSessionSheet, dynamic: true, compact: true },
  'guardian-lens': { component: GuardianLensSheet, dynamic: true },
  'export-archive': { component: ExportArchiveSheet, dynamic: true },
  'appearance': { component: AppearanceSheet, dynamic: true },
  'daily-ritual': { component: DailyRitualSheet, dynamic: true },
  'observation-note': { component: ObservationNoteSheet, dynamic: true, keyboardBehavior: 'interactive', androidKeyboardInputMode: 'adjustResize' },
  'emoji-picker': { component: EmojiPickerSheet, dynamic: false, snapPoints: ['42%', '65%'] },
};

// Sheets that manage their own BottomSheetView / layout
const SELF_MANAGED = new Set([
  'calendar-stories',
  'create-capsule', 'capsule-detail', 'memory-insights',
  'create-memory', 'create-group', 'add-beneficiary', 'streak',
  'edit-profile', 'add-member-to-group',
  'change-password', 'setup-two-factor',
  'emoji-picker', 'story-drafts', 'delete-account-reason',
  'voice-call-settings',
]);

const MODAL_SEGMENTS = new Set([
  'coming-soon',
  'voice-call',
  'share',
  'editor',
  'create',
  'article',
]);

/**
 * SheetManager uses BottomSheetModal (not BottomSheet) so every sheet renders
 * through the BottomSheetModalProvider portal — always at the very root of the
 * component tree, above the tab bar and any other absolutely-positioned elements.
 */
export function SheetManager({ isModal = false }: { isModal?: boolean }) {
  const activeSheet = useUiStore((s) => s.activeSheet);
  const sheetProps = useUiStore((s) => s.sheetProps);
  const closeSheet = useUiStore((s) => s.closeSheet);
  const rootNavigationState = useRootNavigationState();
  const segments = useSegments();
  const modalRef = useRef<BottomSheetModal>(null);
  const afterDismissRef = useRef<(() => void) | null>(null);
  const insets = useSafeAreaInsets();
  const navigationReady = Boolean(rootNavigationState?.key);

  const currentSegment = segments[0] as string | undefined;
  const isCurrentSegmentModal = currentSegment ? MODAL_SEGMENTS.has(currentSegment) : false;

  // Prevent global sheets from mounting before Expo Router has created the
  // navigation container. This avoids the classic ``Couldn't find a navigation context``
  // render crash when a sheet opens during app boot or redirect timing.
  useEffect(() => {
    if (!navigationReady) {
      if (activeSheet) closeSheet();
      return;
    }

    if (activeSheet) {
      const t = setTimeout(() => {
        modalRef.current?.present();
      }, 50);
      return () => clearTimeout(t);
    } else {
      modalRef.current?.dismiss();
    }
  }, [activeSheet, closeSheet, navigationReady]);

  const handleDismiss = useCallback(() => {
    // Called by the sheet when the user swipes it down or taps the backdrop
    closeSheet();
    const afterDismiss = afterDismissRef.current;
    afterDismissRef.current = null;
    afterDismiss?.();
  }, [closeSheet]);

  const animateClose = useCallback((afterDismiss?: () => void) => {
    // Open a follow-up sheet only after this modal finishes dismissing.
    // Ignore native press events passed by existing onPress={onClose} consumers.
    afterDismissRef.current = typeof afterDismiss === 'function' ? afterDismiss : null;
    modalRef.current?.dismiss();
  }, []);

  const expandSheet = useCallback(() => {
    modalRef.current?.expand();
  }, []);

  const collapseSheet = useCallback(() => {
    modalRef.current?.snapToIndex(0);
  }, []);


  const config = activeSheet ? SHEET_CONFIGS[activeSheet] : null;
  const SheetContent = config?.component ?? null;
  const chrome = useSheetChrome({ compact: config?.compact });
  const { height: windowHeight } = useWindowDimensions();
  const snapPoints = useMemo(() => {
    if (config?.screenHeightRatio) return chrome.snapPoints([Math.round(windowHeight * config.screenHeightRatio)]);
    return config?.snapPoints ? chrome.snapPoints(config.snapPoints) : undefined;
  }, [chrome, config?.snapPoints, config?.screenHeightRatio, windowHeight]);

  if (!navigationReady) return null;

  // Render logic to prevent duplicate sheets in root vs local native modals
  if (!isModal && isCurrentSegmentModal) return null;
  if (isModal && !isCurrentSegmentModal) return null;

  return (
    <BottomSheetModal
      key={activeSheet ?? 'none'}
      ref={modalRef}
      {...chrome.props}
      snapPoints={snapPoints}
      enableDynamicSizing={config?.dynamic ?? true}
      enableContentPanningGesture={activeSheet !== 'calendar-date'}
      enablePanDownToClose
      onDismiss={handleDismiss}
      keyboardBehavior={(config?.keyboardBehavior as any) ?? 'interactive'}
      keyboardBlurBehavior={(config?.keyboardBlurBehavior as any) ?? 'restore'}
      android_keyboardInputMode={config?.androidKeyboardInputMode ?? 'adjustPan'}
    >
      {SheetContent && activeSheet ? (
        SELF_MANAGED.has(activeSheet) ? (
          <SheetContent
            {...sheetProps}
            onClose={animateClose}
            expandSheet={expandSheet}
            collapseSheet={collapseSheet}
          />
        ) : (
          // Fills at least the minimum sheet height. Sheets with buttons put them in
          // <SheetActions> on a SHEET_FILL root, so the CTA always sits 8px above the
          // home indicator, never floating mid-sheet under short content.
          <BottomSheetView style={{ ...(config?.screenHeightRatio ? { flex: 1 } : { minHeight: chrome.minContentHeight }), paddingHorizontal: config?.horizontalPadding ?? 20, paddingBottom: getSheetActionsBottomPadding(insets.bottom) }}>
            <SheetContent {...sheetProps} onClose={animateClose} />
          </BottomSheetView>
        )
      ) : (
        // BottomSheetModal requires at least one child when mounted
        <BottomSheetView style={{ height: 1 }}>{null}</BottomSheetView>
      )}
    </BottomSheetModal>
  );
}
