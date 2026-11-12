import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { Text, View } from 'react-native';
import Pencil from 'lucide-react-native/icons/pencil';
import Trash2 from 'lucide-react-native/icons/trash';
import { Button } from '@/components/ui';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { PersonCard } from '@/components/beneficiaries/PersonCard';
import { TYPE } from '@/constants/typography';
import { SheetActions, SHEET_FILL } from './SheetActions';
import { SheetHeader } from './SheetHeader';
import { SHEET_GROUP_GAP } from '@/features/layout/sheet-safe-area';
import { isInvitePending, personCardDetails } from '@/features/beneficiaries/people-cards';
import { useUiStore } from '@/store';
import type { IBeneficiary } from '@/types';

/** A person's sheet: their profile card, then Edit and Remove (web person-card menu). */
export function BeneficiaryActionsSheet({
  beneficiary,
  onResend,
  onRemove,
  onClose,
}: {
  beneficiary: IBeneficiary;
  onResend: (email: string) => void;
  onRemove: (id: string, name: string) => void;
  /** SheetManager's close; the callback runs once this sheet has fully dismissed. */
  onClose?: (afterDismiss?: () => void) => void;
}) {
  const COLORS = useThemeColors();
  const label = beneficiary.name || beneficiary.email;
  const pending = isInvitePending(beneficiary) && Boolean(beneficiary.email);

  // Open the next sheet only after this one has dismissed; opening it straight
  // away let this sheet's dismissal close the new one immediately.
  const thenOpen = (open: () => void) => {
    if (onClose) onClose(open);
    else open();
  };

  return (
    // flexGrow fills the sheet's minimum height so the buttons sit at the bottom.
    <View style={{ ...SHEET_FILL, gap: SHEET_GROUP_GAP }}>
      <SheetHeader title="Person" onClose={() => onClose?.()} />

      <View style={{ gap: 12 }}>
        <PersonCard
          name={label}
          email={beneficiary.email}
          user={beneficiary.user}
          details={personCardDetails(beneficiary)}
        />
        {pending ? (
          <TouchableOpacity
            onPress={() => {
              onResend(beneficiary.email);
              onClose?.();
            }}
            accessibilityRole="button"
            style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ ...TYPE.buttonSmall, color: COLORS.brand }}>Resend invite</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <SheetActions style={{ flexDirection: 'row', gap: 12 }}>
        <Button
          variant="secondary"
          size="lg"
          rounded="full"
          className="h-14 flex-1"
          leftIcon={<Pencil size={20} color={COLORS.textStrong} />}
          onPress={() => thenOpen(() => useUiStore.getState().openSheet('add-beneficiary', { editData: beneficiary }))}
        >
          Edit
        </Button>
        <Button
          variant="destructive"
          size="lg"
          rounded="full"
          className="h-14 flex-1"
          leftIcon={<Trash2 size={20} color={COLORS.textInverse} />}
          onPress={() => thenOpen(() => onRemove(beneficiary._id ?? '', label))}
        >
          Remove
        </Button>
      </SheetActions>
    </View>
  );
}
