import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { SheetActions, SHEET_FILL } from './SheetActions';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import ListTree from 'lucide-react-native/icons/list-tree';
import Pencil from 'lucide-react-native/icons/pencil';
import Trash2 from 'lucide-react-native/icons/trash';
import { Button, TextInput } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { TYPE } from '@/constants/typography';
import {
  MAX_OBSERVATION_HEADING_LENGTH,
  MAX_OBSERVATION_NOTE_LENGTH,
  type ObservationItem,
} from '@/features/insights/insights-model';
import { useEditObservation, useForgetObservation } from '@/hooks/mutations/use-observation-mutations';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { SheetHeader } from './SheetHeader';
import { SHEET_GROUP_GAP, SHEET_SECTION_GAP } from '@/features/layout/sheet-safe-area';

type Mode = 'actions' | 'edit' | 'forget';

const TITLES: Record<Mode, string> = {
  actions: 'Note options',
  edit: 'Edit this note',
  forget: 'Forget this note',
};

/**
 * Sources, Edit and Forget for one observation or preference, ported from
 * web `observation-list.tsx` (its menu and both dialogs) as one sheet.
 */
export function ObservationNoteSheet({
  item,
  initialMode = 'actions',
  onOpenSources,
  onClose,
}: {
  item: ObservationItem;
  initialMode?: Mode;
  onOpenSources?: (item: ObservationItem) => void;
  onClose?: () => void;
}) {
  const colors = useThemeColors();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [heading, setHeading] = useState(item.title);
  const [note, setNote] = useState(item.detail);
  const editNote = useEditObservation();
  const forgetNote = useForgetObservation();

  const close = useCallback(() => {
    Haptics.selectionAsync();
    onClose?.();
  }, [onClose]);

  const openSources = useCallback(() => {
    onClose?.();
    onOpenSources?.(item);
  }, [item, onClose, onOpenSources]);

  const save = useCallback(async () => {
    try {
      await editNote.mutateAsync({ id: item.id, heading: heading.trim(), note: note.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast('Note updated', 'success');
      onClose?.();
    } catch {
      toast('Couldn’t save your changes. Please try again.', 'error');
    }
  }, [editNote, heading, item.id, note, onClose]);

  const forget = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await forgetNote.mutateAsync(item.id);
      toast('Note forgotten', 'success');
      onClose?.();
    } catch {
      toast('Couldn’t forget this note. Please try again.', 'error');
    }
  }, [forgetNote, item.id, onClose]);

  const changed = heading.trim() !== item.title.trim() || note.trim() !== item.detail.trim();
  const busy = editNote.isPending || forgetNote.isPending;

  return (
    <View style={{ ...SHEET_FILL, gap: SHEET_GROUP_GAP }}>
      <SheetHeader title={TITLES[mode]} onClose={onClose} />

      {mode === 'actions' ? (
        <Animated.View key="actions" entering={FadeInDown.duration(300)} style={{ gap: SHEET_GROUP_GAP }}>
          <View style={{ gap: 4 }}>
            <Text style={[TYPE.bodyStrong, { color: colors.textStrong }]}>{item.title}</Text>
            <Text style={[TYPE.bodySmall, { color: colors.textBase }]}>{item.detail}</Text>
          </View>
          <View style={{ gap: 12 }}>
            <Button
              variant="secondary"
              size="lg"
              rounded="full"
              className="h-14"
              leftIcon={<ListTree size={20} color={colors.textStrong} />}
              onPress={openSources}
            >
              Sources
            </Button>
            <Button
              variant="secondary"
              size="lg"
              rounded="full"
              className="h-14"
              leftIcon={<Pencil size={20} color={colors.textStrong} />}
              onPress={() => setMode('edit')}
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="lg"
              rounded="full"
              className="h-14"
              leftIcon={<Trash2 size={20} color={colors.textInverse} />}
              onPress={() => setMode('forget')}
            >
              Forget
            </Button>
          </View>
        </Animated.View>
      ) : null}

      {mode === 'edit' ? (
        <Animated.View key="edit" entering={FadeInDown.duration(300)} style={{ ...SHEET_FILL, gap: SHEET_GROUP_GAP }}>
          <View style={{ gap: SHEET_SECTION_GAP }}>
          <Text style={[TYPE.bodySmall, { color: colors.textBase }]}>
            Put this note in your own words. Memento will use this version from now on.
          </Text>
          <TextInput
            InputComponent={BottomSheetTextInput}
            label="Heading"
            value={heading}
            onChangeText={setHeading}
            maxLength={MAX_OBSERVATION_HEADING_LENGTH}
            editable={!busy}
          />
          <TextInput
            InputComponent={BottomSheetTextInput}
            label="Note"
            hint={`${note.length}/${MAX_OBSERVATION_NOTE_LENGTH}`}
            value={note}
            onChangeText={setNote}
            maxLength={MAX_OBSERVATION_NOTE_LENGTH}
            multiline
            textAlignVertical="top"
            inputClassName="min-h-[120px]"
            editable={!busy}
          />
          </View>
          <SheetActions>
          <Button
            size="lg"
            rounded="full"
            className="h-14"
            loading={editNote.isPending}
            disabled={!heading.trim() || !note.trim() || !changed}
            onPress={save}
          >
            Save changes
          </Button>
          </SheetActions>
        </Animated.View>
      ) : null}

      {mode === 'forget' ? (
        <Animated.View key="forget" entering={FadeInDown.duration(300)} style={{ ...SHEET_FILL, gap: SHEET_GROUP_GAP }}>
          <View style={{ gap: SHEET_SECTION_GAP }}>
          <Text style={[TYPE.bodySmall, { color: colors.textBase }]}>
            Memento will stop using this note and won’t add it back. Your memories stay as they are.
          </Text>
          <View style={{ gap: 4 }}>
            <Text style={[TYPE.eyebrow, { color: colors.textWeak }]} className="uppercase tracking-widest">
              Heading
            </Text>
            <Text style={[TYPE.body, { color: colors.textStrong }]}>{item.title}</Text>
          </View>
          <View style={{ gap: 4 }}>
            <Text style={[TYPE.eyebrow, { color: colors.textWeak }]} className="uppercase tracking-widest">
              Note
            </Text>
            <Text style={[TYPE.body, { color: colors.textStrong }]}>{item.detail}</Text>
          </View>
          </View>
          <SheetActions style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              variant="secondary"
              size="lg"
              rounded="full"
              className="h-14 flex-1"
              disabled={forgetNote.isPending}
              onPress={close}
            >
              Keep
            </Button>
            <Button
              variant="destructive"
              size="lg"
              rounded="full"
              className="h-14 flex-1"
              loading={forgetNote.isPending}
              onPress={forget}
            >
              Forget note
            </Button>
          </SheetActions>
        </Animated.View>
      ) : null}
    </View>
  );
}
