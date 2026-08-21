import React, { useCallback, useEffect, useRef } from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useUiStore } from '@/store';
import { useRootNavigationState } from 'expo-router';
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
import { MemoryInsightsSheet } from './MemoryInsightsSheet';
import { SearchMemorySheet } from './SearchMemorySheet';
import { FeedbackSheet } from './FeedbackSheet';
import { CapsuleDetailSheet } from './CapsuleDetailSheet';
import { UpgradePromptSheet } from './UpgradePromptSheet';
import { SelectSheet } from './SelectSheet';
import { StreakSheet } from './StreakSheet';
import { DraftsSheet } from './DraftsSheet';
import { EditProfileSheet } from './EditProfileSheet';
import { ChangePasswordSheet } from './ChangePasswordSheet';
import { SetupTwoFactorSheet } from './SetupTwoFactorSheet';
import { SecurityConfirmationSheet } from './SecurityConfirmationSheet';
import { VoiceCallSettingsSheet } from './VoiceCallSettingsSheet';
import { EndVoiceSessionSheet } from './EndVoiceSessionSheet';
import { AddMemberToGroupSheet } from './AddMemberToGroupSheet';
import { COLORS } from '@/constants/tokens';

const SHEET_CONFIGS: Record<string, {
  component: React.ComponentType<any>;
  snapPoints?: string[];
  dynamic?: boolean;
  keyboardBehavior?: 'interactive' | 'fillParent' | 'extend';
  keyboardBlurBehavior?: 'restore' | 'dismiss' | 'none';
  androidKeyboardInputMode?: 'adjustPan' | 'adjustResize';
}> = {
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
  'memory-insights': { component: MemoryInsightsSheet, snapPoints: ['88%'] },
  'search-memory': { component: SearchMemorySheet, snapPoints: ['90%'], keyboardBehavior: 'extend', keyboardBlurBehavior: 'none' },
  'feedback': { component: FeedbackSheet, snapPoints: ['90%'], dynamic: true, keyboardBehavior: 'fillParent' },
  'capsule-detail': { component: CapsuleDetailSheet, snapPoints: ['92%'] },
  'upgrade-prompt': { component: UpgradePromptSheet, dynamic: true },
  'select': { component: SelectSheet, dynamic: true },
  'streak': { component: StreakSheet, dynamic: true },
  'story-drafts': { component: DraftsSheet, snapPoints: ['75%'], keyboardBehavior: 'interactive' },
  'edit-profile': { component: EditProfileSheet, snapPoints: ['92%', '100%'], dynamic: false, keyboardBehavior: 'fillParent' },
  'change-password': { component: ChangePasswordSheet, snapPoints: ['100%'], dynamic: true, keyboardBehavior: 'interactive', keyboardBlurBehavior: 'restore', androidKeyboardInputMode: 'adjustResize' },
  'setup-two-factor': { component: SetupTwoFactorSheet, snapPoints: ['88%'], dynamic: false, keyboardBehavior: 'fillParent' },
  'security-confirmation': { component: SecurityConfirmationSheet, dynamic: true },
  'voice-call-settings': { component: VoiceCallSettingsSheet, snapPoints: ['82%'], dynamic: false },
  'end-voice-session': { component: EndVoiceSessionSheet, dynamic: true },
};

// Sheets that manage their own BottomSheetView / layout
const SELF_MANAGED = new Set([
  'create-capsule', 'capsule-detail', 'memory-insights',
  'create-memory', 'create-group', 'add-beneficiary', 'streak',
  'edit-profile', 'add-member-to-group',
  'change-password', 'setup-two-factor',
]);

/**
 * SheetManager uses BottomSheetModal (not BottomSheet) so every sheet renders
 * through the BottomSheetModalProvider portal — always at the very root of the
 * component tree, above the tab bar and any other absolutely-positioned elements.
 */
export function SheetManager() {
  const activeSheet = useUiStore((s) => s.activeSheet);
  const sheetProps = useUiStore((s) => s.sheetProps);
  const closeSheet = useUiStore((s) => s.closeSheet);
  const rootNavigationState = useRootNavigationState();
  const modalRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const navigationReady = Boolean(rootNavigationState?.key);

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
  }, [closeSheet]);

  const animateClose = useCallback(() => {
    modalRef.current?.dismiss();
  }, []);

  const expandSheet = useCallback(() => {
    modalRef.current?.expand();
  }, []);

  const collapseSheet = useCallback(() => {
    modalRef.current?.snapToIndex(0);
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    [],
  );

  const config = activeSheet ? SHEET_CONFIGS[activeSheet] : null;
  const SheetContent = config?.component ?? null;

  if (!navigationReady) return null;

  return (
    <BottomSheetModal
        key={activeSheet ?? 'none'}
        ref={modalRef}
        snapPoints={config?.snapPoints}
        enableDynamicSizing={config?.dynamic ?? true}
        enablePanDownToClose
        onDismiss={handleDismiss}
        backdropComponent={renderBackdrop}
        keyboardBehavior={(config?.keyboardBehavior as any) ?? 'interactive'}
        keyboardBlurBehavior={(config?.keyboardBlurBehavior as any) ?? 'restore'}
        android_keyboardInputMode={config?.androidKeyboardInputMode ?? 'adjustPan'}
        handleIndicatorStyle={{ backgroundColor: COLORS.strokeStrong, opacity: 0.3 }}
        backgroundStyle={{ backgroundColor: COLORS.background }}
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
            <BottomSheetView style={{ paddingHorizontal: 16, paddingBottom: insets.bottom ? insets.bottom + 12 : 32 }}>
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
