import React, { useCallback, useEffect, useRef } from 'react';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useUiStore } from '@/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreateMemorySheet } from './CreateMemorySheet';
import { CreateCapsuleSheet } from './CreateCapsuleSheet';
import { AddBeneficiarySheet } from './AddBeneficiarySheet';
import { MemoryActionsSheet } from './MemoryActionsSheet';
import { CapsuleActionsSheet } from './CapsuleActionsSheet';
import { CreateGroupSheet } from './CreateGroupSheet';
import { ShareMemorySheet } from './ShareMemorySheet';
import { QuickCaptureSheet } from './QuickCaptureSheet';
import { MemoryInsightsSheet } from './MemoryInsightsSheet';
import { SearchMemorySheet } from './SearchMemorySheet';
import { ChatActionsSheet } from './ChatActionsSheet';
import { FeedbackSheet } from './FeedbackSheet';
import { CapsuleDetailSheet } from './CapsuleDetailSheet';
import { UpgradePromptSheet } from './UpgradePromptSheet';
import { SelectSheet } from './SelectSheet';
import { StreakSheet } from './StreakSheet';
import { DraftsSheet } from './DraftsSheet';
import { COLORS } from '@/constants/tokens';

const SHEET_CONFIGS: Record<string, {
  component: React.ComponentType<any>;
  snapPoints?: string[];
  dynamic?: boolean;
  keyboardBehavior?: 'interactive' | 'fillParent' | 'extend';
  keyboardBlurBehavior?: 'restore' | 'dismiss' | 'none';
}> = {
  'create-memory': { component: CreateMemorySheet, snapPoints: ['90%'], keyboardBehavior: 'extend' },
  'create-capsule': { component: CreateCapsuleSheet, snapPoints: ['92%'], keyboardBehavior: 'fillParent' },
  'add-beneficiary': { component: AddBeneficiarySheet, dynamic: true },
  'memory-actions': { component: MemoryActionsSheet, dynamic: true },
  'capsule-actions': { component: CapsuleActionsSheet, dynamic: true },
  'share-memory': { component: ShareMemorySheet, dynamic: true },
  'create-group': { component: CreateGroupSheet, snapPoints: ['90%'], keyboardBehavior: 'extend' },
  'quick-capture': { component: QuickCaptureSheet, dynamic: true, keyboardBlurBehavior: 'none' },
  'memory-insights': { component: MemoryInsightsSheet, snapPoints: ['88%'] },
  'search-memory': { component: SearchMemorySheet, snapPoints: ['90%'], keyboardBehavior: 'fillParent' },
  'chat-actions': { component: ChatActionsSheet, dynamic: true },
  'feedback': { component: FeedbackSheet, snapPoints: ['90%'], dynamic: true, keyboardBehavior: 'fillParent' },
  'capsule-detail': { component: CapsuleDetailSheet, snapPoints: ['92%'] },
  'upgrade-prompt': { component: UpgradePromptSheet, dynamic: true },
  'select': { component: SelectSheet, dynamic: true },
  'streak': { component: StreakSheet, dynamic: true },
  'story-drafts': { component: DraftsSheet, snapPoints: ['75%'], keyboardBehavior: 'interactive' },
};

// Sheets that manage their own BottomSheetView / layout
const SELF_MANAGED = new Set([
  'create-capsule', 'capsule-detail', 'memory-insights',
  'create-memory', 'create-group', 'streak',
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
  const modalRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();

  // Open/close the modal in response to activeSheet state changes
  useEffect(() => {
    if (activeSheet) {
      const t = setTimeout(() => {
        modalRef.current?.present();
      }, 50);
      return () => clearTimeout(t);
    } else {
      modalRef.current?.dismiss();
    }
  }, [activeSheet]);

  const handleDismiss = useCallback(() => {
    // Called by the sheet when the user swipes it down or taps the backdrop
    closeSheet();
  }, [closeSheet]);

  const animateClose = useCallback(() => {
    modalRef.current?.dismiss();
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
      handleIndicatorStyle={{ backgroundColor: COLORS.strokeStrong, opacity: 0.3 }}
      backgroundStyle={{ backgroundColor: COLORS.background }}
    >
      {SheetContent && activeSheet ? (
        SELF_MANAGED.has(activeSheet) ? (
          <SheetContent {...sheetProps} onClose={animateClose} />
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
