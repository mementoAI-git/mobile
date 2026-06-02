import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useUiStore } from '@/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreateMemorySheet } from './CreateMemorySheet';
import { CreateCapsuleSheet } from './CreateCapsuleSheet';
import { AddBeneficiarySheet } from './AddBeneficiarySheet';
import { MemoryActionsSheet } from './MemoryActionsSheet';
import { CapsuleActionsSheet } from './CapsuleActionsSheet';
import { CreateGroupSheet } from './CreateGroupSheet';
import { GroupActionsSheet } from './GroupActionsSheet';
import { ShareMemorySheet } from './ShareMemorySheet';

import { QuickCaptureSheet } from './QuickCaptureSheet';
import { MemoryInsightsSheet } from './MemoryInsightsSheet';
import { SearchMemorySheet } from './SearchMemorySheet';
import { MemoryDetailSheet } from './MemoryDetailSheet';
import { ChatActionsSheet } from './ChatActionsSheet';
import { FeedbackSheet } from './FeedbackSheet';
import { CapsuleDetailSheet } from './CapsuleDetailSheet';
import { UpgradePromptSheet } from './UpgradePromptSheet';
import { SelectSheet } from './SelectSheet';
import { COLORS } from '@/constants/tokens';

const SHEET_CONFIGS: Record<string, { component: React.ComponentType<any>; snapPoints?: string[]; dynamic?: boolean; keyboardBehavior?: 'interactive' | 'fillParent' | 'extend'; keyboardBlurBehavior?: 'restore' | 'dismiss' | 'none' }> = {
  'create-memory': { component: CreateMemorySheet, snapPoints: ['90%'], keyboardBehavior: 'extend' },
  'create-capsule': { component: CreateCapsuleSheet, snapPoints: ['92%'], keyboardBehavior: 'fillParent' },
  'add-beneficiary': { component: AddBeneficiarySheet, dynamic: true },
  'memory-actions': { component: MemoryActionsSheet, dynamic: true },
  'capsule-actions': { component: CapsuleActionsSheet, dynamic: true },
  'share-memory': { component: ShareMemorySheet, dynamic: true },
  'create-group': { component: CreateGroupSheet, snapPoints: ['90%'], keyboardBehavior: 'extend' },
  'group-actions': { component: GroupActionsSheet, dynamic: true },
  'quick-capture': { component: QuickCaptureSheet, dynamic: true, keyboardBlurBehavior: 'none' },
  'memory-insights': { component: MemoryInsightsSheet, snapPoints: ['88%'] },
  'search-memory': { component: SearchMemorySheet, snapPoints: ['90%'], keyboardBehavior: 'fillParent' },
  'memory-detail': { component: MemoryDetailSheet, snapPoints: ['90%'], keyboardBehavior: 'fillParent' },
  'chat-actions': { component: ChatActionsSheet, dynamic: true },
  'feedback': { component: FeedbackSheet, snapPoints: ['90%'], dynamic: true, keyboardBehavior: 'fillParent' },
  'capsule-detail': { component: CapsuleDetailSheet, snapPoints: ['92%'] },
  'upgrade-prompt': { component: UpgradePromptSheet, dynamic: true },
  'select': { component: SelectSheet, dynamic: true },
};

export function SheetManager() {
  const { activeSheet, sheetProps, closeSheet } = useUiStore();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();

  const handleClose = useCallback(() => {
    closeSheet();
  }, [closeSheet]);

  const animateClose = useCallback(() => {
    bottomSheetRef.current?.close();
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

  if (!activeSheet) return null;

  const config = SHEET_CONFIGS[activeSheet];
  if (!config) return null;
  const SheetContent = config.component;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={config.snapPoints}
      enableDynamicSizing={config.dynamic}
      enablePanDownToClose
      onClose={handleClose}
      backdropComponent={renderBackdrop}
      keyboardBehavior={config.keyboardBehavior as any || "interactive"}
      keyboardBlurBehavior={config.keyboardBlurBehavior as any || "restore"}
      handleIndicatorStyle={{ backgroundColor: COLORS.strokeStrong, opacity: 0.3 }}
      backgroundStyle={{ backgroundColor: COLORS.background }}
    >
      {/* create-capsule, capsule-detail, memory-insights, create-memory, create-group manage their own layout */}
      {['create-capsule', 'capsule-detail', 'memory-insights', 'create-memory', 'create-group'].includes(activeSheet) ? (
        <SheetContent {...sheetProps} onClose={animateClose} />
      ) : (
        <BottomSheetView style={{ paddingHorizontal: 16, paddingBottom: insets.bottom ? insets.bottom + 12 : 32 }}>
          <SheetContent {...sheetProps} onClose={animateClose} />
        </BottomSheetView>
      )}
    </BottomSheet>
  );
}
