import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Alert, Modal,
  ScrollView, Platform, StyleSheet,
} from 'react-native';
import { Button, TextInput, Spinner } from '@/components/ui';
import {
  Image as ImageIcon, FolderOpen, Check, X, Lock, Globe, Users,
} from 'lucide-react-native';
import { useCreateMemory, useUpdateMemory } from '@/hooks/mutations/use-memory-mutations';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { useGroups } from '@/hooks/queries/use-groups';
import { COLORS, FONTS } from '@/constants/tokens';
import { BottomSheetTextInput, BottomSheetScrollView, BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SelectFromMediaModal } from './SelectFromMediaModal';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useUiStore } from '@/store';
import type { IMemory, IBeneficiary, IGroup } from '@/types';

// ─── Privacy model ────────────────────────────────────────────────────────────

type PrivacyMode = 'private' | 'all' | 'specific';

interface PrivacyOption {
  id: PrivacyMode;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
}

const PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    id: 'private',
    icon: <Lock size={18} color={COLORS.textStrong} strokeWidth={1.8} />,
    label: 'Only me',
    sublabel: 'Private — only you can see this memory',
  },
  {
    id: 'all',
    icon: <Globe size={18} color={COLORS.textStrong} strokeWidth={1.8} />,
    label: 'All beneficiaries',
    sublabel: 'Visible to all your trusted contacts',
  },
  {
    id: 'specific',
    icon: <Users size={18} color={COLORS.textStrong} strokeWidth={1.8} />,
    label: 'Specific people & groups',
    sublabel: 'Choose exactly who can see this',
  },
];

// ─── Privacy modal ────────────────────────────────────────────────────────────

interface PrivacyModalProps {
  visible: boolean;
  onClose: () => void;
  privacyMode: PrivacyMode;
  onPrivacyChange: (mode: PrivacyMode) => void;
  selectedBeneficiaries: string[];
  onToggleBeneficiary: (id: string) => void;
  selectedGroups: string[];
  onToggleGroup: (id: string) => void;
  beneficiariesList: IBeneficiary[];
  groupsList: IGroup[];
}

function PrivacyModal({
  visible,
  onClose,
  privacyMode,
  onPrivacyChange,
  selectedBeneficiaries,
  onToggleBeneficiary,
  selectedGroups,
  onToggleGroup,
  beneficiariesList,
  groupsList,
}: PrivacyModalProps) {
  const insets = useSafeAreaInsets();
  const hasSpecific = selectedBeneficiaries.length > 0 || selectedGroups.length > 0;

  const handleSelectMode = useCallback((mode: PrivacyMode) => {
    Haptics.selectionAsync();
    onPrivacyChange(mode);
  }, [onPrivacyChange]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Backdrop — tapping outside closes */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => { Haptics.selectionAsync(); onClose(); }}
      />

      {/* Panel */}
      <View style={[styles.panel, { paddingBottom: insets.bottom ? insets.bottom + 12 : 24 }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Who can see this?</Text>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); onClose(); }}
            style={styles.closeBtn}
          >
            <X size={16} color={COLORS.textBase} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: 520 }}
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          {/* Privacy options */}
          <View style={styles.optionsContainer}>
            {PRIVACY_OPTIONS.map((opt) => {
              const isSelected = privacyMode === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => handleSelectMode(opt.id)}
                  activeOpacity={0.75}
                  style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                >
                  <View style={[styles.optionIcon, isSelected && styles.optionIconSelected]}>
                    {opt.icon}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.optionSublabel}>{opt.sublabel}</Text>
                  </View>
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Specific people & groups section */}
          {privacyMode === 'specific' && (
            <Animated.View entering={FadeInDown.duration(300)} style={{ marginTop: 16 }}>
              {/* Beneficiaries */}
              {beneficiariesList.length > 0 && (
                <View style={styles.selectSection}>
                  <Text style={styles.sectionLabel}>BENEFICIARIES</Text>
                  {beneficiariesList.map((b: IBeneficiary) => {
                    if (!b._id) return null;
                    const on = selectedBeneficiaries.includes(b._id);
                    return (
                      <TouchableOpacity
                        key={b._id}
                        onPress={() => { Haptics.selectionAsync(); onToggleBeneficiary(b._id!); }}
                        activeOpacity={0.75}
                        style={styles.selectRow}
                      >
                        <View style={styles.selectAvatar}>
                          <Text style={{ fontSize: 14 }}>👤</Text>
                        </View>
                        <Text style={styles.selectName} numberOfLines={1}>
                          {b.name || b.email}
                        </Text>
                        <View style={[styles.checkbox, on && styles.checkboxSelected]}>
                          {on && <Check size={11} color="white" strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Groups */}
              {groupsList.length > 0 && (
                <View style={[styles.selectSection, { marginTop: beneficiariesList.length > 0 ? 12 : 0 }]}>
                  <Text style={styles.sectionLabel}>GROUPS</Text>
                  {groupsList.map((g: IGroup) => {
                    const on = selectedGroups.includes(g._id);
                    const memberCount = Array.isArray(g.members) ? g.members.length : 0;
                    return (
                      <TouchableOpacity
                        key={g._id}
                        onPress={() => { Haptics.selectionAsync(); onToggleGroup(g._id); }}
                        activeOpacity={0.75}
                        style={styles.selectRow}
                      >
                        <View style={styles.selectAvatar}>
                          <Users size={14} color={COLORS.brand} strokeWidth={1.8} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.selectName} numberOfLines={1}>{g.name}</Text>
                          {memberCount > 0 && (
                            <Text style={styles.selectMeta}>{memberCount} member{memberCount !== 1 ? 's' : ''}</Text>
                          )}
                        </View>
                        <View style={[styles.checkbox, on && styles.checkboxSelected]}>
                          {on && <Check size={11} color="white" strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {beneficiariesList.length === 0 && groupsList.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textWeak, textAlign: 'center' }}>
                    No beneficiaries or groups yet.{'\n'}Add them in Settings.
                  </Text>
                </View>
              )}
            </Animated.View>
          )}
        </ScrollView>

        {/* Done button */}
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}
          activeOpacity={0.85}
          style={styles.doneBtn}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  editData?: IMemory;
}

export function CreateMemorySheet({ onClose, editData }: Props) {
  const openSheet = useUiStore((s) => s.openSheet);
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState(editData?.title || '');
  const [body, setBody] = useState(editData?.body || '');
  const initialStatus = editData?.status === 'saved' ? 'save' : (editData?.status || 'save');
  const [status, setStatus] = useState<string>(initialStatus);
  const [attachments, setAttachments] = useState<string[]>(editData?.attachments?.map(a => a._id) || []);
  const [tags, setTags] = useState<string[]>(editData?.tags || []);
  const [tagInput, setTagInput] = useState('');

  // ── Privacy state ────────────────────────────────────────────────────────────
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>('private');
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<string[]>(
    editData?.beneficiaries?.map(b => b._id).filter((id): id is string => !!id) || []
  );
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    editData?.groups?.map(g => g._id).filter((id): id is string => !!id) || []
  );
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const mediaModalRef = React.useRef<BottomSheetModal>(null);

  const { data: beneficiariesData } = useBeneficiaries();
  const { data: groupsData } = useGroups();
  const { mutate: createMemory, isPending: isCreating } = useCreateMemory();
  const { mutate: updateMemory, isPending: isUpdatingMemory } = useUpdateMemory(editData?._id || '');
  const { pickAndUpload, isUploading } = useFileUpload();

  const beneficiariesList: IBeneficiary[] = useMemo(() => {
    if (Array.isArray(beneficiariesData)) return beneficiariesData;
    if ((beneficiariesData as any)?.docs) return (beneficiariesData as any).docs;
    return [];
  }, [beneficiariesData]);

  const groupsList: IGroup[] = useMemo(() => {
    if (Array.isArray(groupsData)) return groupsData;
    if ((groupsData as any)?.docs) return (groupsData as any).docs;
    return [];
  }, [groupsData]);

  // ── Privacy button label ──────────────────────────────────────────────────────
  const privacyLabel = useMemo(() => {
    if (privacyMode === 'private') return 'Private · Only me';
    if (privacyMode === 'all') return 'All beneficiaries';
    const total = selectedBeneficiaries.length + selectedGroups.length;
    if (total === 0) return 'Choose who can see this';
    const parts: string[] = [];
    if (selectedBeneficiaries.length > 0) parts.push(`${selectedBeneficiaries.length} person${selectedBeneficiaries.length > 1 ? 's' : ''}`);
    if (selectedGroups.length > 0) parts.push(`${selectedGroups.length} group${selectedGroups.length > 1 ? 's' : ''}`);
    return parts.join(', ');
  }, [privacyMode, selectedBeneficiaries.length, selectedGroups.length]);

  const PrivacyIcon = privacyMode === 'private' ? Lock : privacyMode === 'all' ? Globe : Users;
  const privacyIsActive = privacyMode !== 'private';

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handlePickFile = async () => {
    Haptics.selectionAsync();
    const uploadedFile = await pickAndUpload();
    if (uploadedFile && uploadedFile.data?._id) {
      setAttachments(prev => [...prev, uploadedFile.data._id]);
    } else if (uploadedFile && uploadedFile._id) {
      setAttachments(prev => [...prev, uploadedFile._id]);
    }
  };

  const handleTagSubmit = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const handleTagInputChange = (text: string) => {
    if (text.endsWith(' ')) {
      const t = text.trim().toLowerCase();
      if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
      setTagInput('');
    } else {
      setTagInput(text);
    }
  };

  const removeTag = (t: string) => setTags(prev => prev.filter(tag => tag !== t));

  const handleToggleBeneficiary = useCallback((id: string) => {
    setSelectedBeneficiaries(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  }, []);

  const handleToggleGroup = useCallback((id: string) => {
    setSelectedGroups(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  }, []);

  const handleSave = () => {
    if (!title.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const finalStatus = status === 'saved' ? 'save' : status;

    // Build sharing payload based on privacy mode
    let beneficiariesPayload: string[] | undefined;
    let groupsPayload: string[] | undefined;

    if (privacyMode === 'private') {
      // Explicitly empty — only the creator sees this
      beneficiariesPayload = [];
      groupsPayload = [];
    } else if (privacyMode === 'all') {
      // Undefined = share with all beneficiaries (server default)
      beneficiariesPayload = undefined;
      groupsPayload = undefined;
    } else {
      // Specific — send selected IDs (empty array if none chosen)
      beneficiariesPayload = selectedBeneficiaries;
      groupsPayload = selectedGroups;
    }

    const payload: any = {
      title: title.trim(),
      body: body.trim(),
      status: finalStatus,
      attachments,
      tags,
      ...(beneficiariesPayload !== undefined ? { beneficiaries: beneficiariesPayload } : {}),
      ...(groupsPayload !== undefined ? { groups: groupsPayload } : {}),
    };

    const mutationOptions = {
      onSuccess: (res: any) => {
        onClose();
        if (!editData && finalStatus === 'save') {
          const newId = res?.data?._id || res?._id || res?.data?.data?._id;
          if (newId) {
            setTimeout(() => { openSheet('share-memory', { id: newId }); }, 300);
          }
        }
      },
      onError: (err: any) => {
        const detailedErrors = err?.errors ? `\n\nDetails: ${JSON.stringify(err.errors)}` : '';
        Alert.alert('Save Failed', `${err?.message || 'Could not save'}${detailedErrors}`);
      }
    };

    if (editData) {
      updateMemory(payload, mutationOptions);
    } else {
      createMemory(payload, mutationOptions);
    }
  };

  return (
    <>
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: insets.bottom ? insets.bottom + 24 : 48,
          gap: 24
        }}
      >
        {/* ── Header ── */}
        <View className="flex-row items-center justify-between">
          <Text className="text-[28px] text-text-strong" style={{ fontFamily: FONTS.serif }}>
            {editData ? 'Edit Memory' : 'New Memory'}
          </Text>
          <TouchableOpacity onPress={onClose} className="size-8 rounded-full bg-fill-weaker items-center justify-center">
            <X size={18} color={COLORS.textWeak} />
          </TouchableOpacity>
        </View>

        <View className="gap-5">
          {/* Title */}
          <View className="gap-2">
            <Text className="text-sm font-bold text-text-muted uppercase tracking-widest ml-1" style={{ fontFamily: FONTS.sansBold }}>
              Title
            </Text>
            <BottomSheetTextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What's this memory about?"
              placeholderTextColor={COLORS.textMuted}
              className="h-14 bg-fill-weaker border border-stroke-weaker rounded-2xl px-4 text-base text-text-strong"
              style={{ fontFamily: FONTS.sansMedium }}
            />
          </View>

          {/* Body */}
          <View className="gap-2">
            <Text className="text-sm font-bold text-text-muted uppercase tracking-widest ml-1" style={{ fontFamily: FONTS.sansBold }}>
              The Story
            </Text>
            <BottomSheetTextInput
              value={body}
              onChangeText={setBody}
              placeholder="Write about your cherished moment..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={6}
              className="min-h-[160px] bg-fill-weaker border border-stroke-weaker rounded-2xl px-4 py-4 text-base text-text-strong"
              style={{ fontFamily: FONTS.sans, textAlignVertical: 'top' }}
            />
          </View>

          {/* Tags */}
          <View className="gap-2">
            <Text className="text-sm font-bold text-text-muted uppercase tracking-widest ml-1" style={{ fontFamily: FONTS.sansBold }}>
              Tags
            </Text>
            <View className="bg-fill-weaker border border-stroke-weaker rounded-2xl px-2 py-2 min-h-14 flex-row flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <View key={tag} className="flex-row items-center bg-white border border-stroke-weaker rounded-full pl-3 pr-1 py-1 h-8 gap-1 shadow-sm">
                  <Text className="text-sm text-text-strong" style={{ fontFamily: FONTS.sansMedium }}>#{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(tag)} className="p-1">
                    <X size={14} color={COLORS.textWeak} />
                  </TouchableOpacity>
                </View>
              ))}
              <BottomSheetTextInput
                value={tagInput}
                onChangeText={handleTagInputChange}
                onSubmitEditing={handleTagSubmit}
                blurOnSubmit={false}
                placeholder={tags.length === 0 ? "Add tags (press enter or space)" : "Add more..."}
                placeholderTextColor={COLORS.textMuted}
                className="flex-1 min-w-[100px] text-sm text-text-strong h-8 px-2"
                style={{ fontFamily: FONTS.sans }}
              />
            </View>
          </View>

          {/* Media buttons */}
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={handlePickFile}
              disabled={isUploading}
              activeOpacity={0.8}
              className={`flex-1 flex-row items-center justify-center gap-2 h-12 rounded-full border ${attachments.length > 0 ? 'bg-brand/5 border-brand' : 'bg-fill-weaker border-stroke-weaker'}`}
            >
              {isUploading ? (
                <Spinner size="small" />
              ) : (
                <>
                  <ImageIcon size={16} color={attachments.length > 0 ? COLORS.brand : COLORS.textBase} strokeWidth={1.5} />
                  <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 13, color: attachments.length > 0 ? COLORS.brand : COLORS.textStrong }}>
                    {attachments.length > 0 ? `${attachments.length} file${attachments.length > 1 ? 's' : ''}` : 'Add media'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => mediaModalRef.current?.present()}
              activeOpacity={0.8}
              className="flex-1 flex-row items-center justify-center gap-2 h-12 rounded-full border bg-fill-weaker border-stroke-weaker"
            >
              <FolderOpen size={16} color={COLORS.textBase} strokeWidth={1.5} />
              <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.textStrong }}>
                Library
              </Text>
            </TouchableOpacity>
          </View>

          {/* Privacy / Sharing button */}
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setShowPrivacyModal(true); }}
            activeOpacity={0.8}
            className={`flex-row items-center justify-center gap-2 h-12 rounded-full border ${privacyIsActive ? 'bg-brand/5 border-brand' : 'bg-fill-weaker border-stroke-weaker'}`}
          >
            <PrivacyIcon
              size={16}
              color={privacyIsActive ? COLORS.brand : COLORS.textBase}
              strokeWidth={1.5}
            />
            <Text
              style={{ fontFamily: FONTS.sansMedium, fontSize: 13, color: privacyIsActive ? COLORS.brand : COLORS.textStrong }}
              numberOfLines={1}
            >
              {privacyLabel}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <View className="mt-4 gap-4">
          <Button
            onPress={handleSave}
            loading={isCreating || isUpdatingMemory}
            disabled={!title.trim() || isUploading || isCreating || isUpdatingMemory}
            size="lg"
            className="h-14 bg-brand rounded-full"
          >
            <Text className="text-white font-bold" style={{ fontFamily: FONTS.sansBold }}>
              {editData ? 'Save Changes' : 'Save Memory'}
            </Text>
          </Button>
        </View>

        <SelectFromMediaModal
          ref={mediaModalRef}
          selectedIds={attachments}
          onConfirm={setAttachments}
        />
      </BottomSheetScrollView>

      {/* Privacy modal — rendered outside BottomSheetScrollView so the backdrop covers the sheet */}
      <PrivacyModal
        visible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        privacyMode={privacyMode}
        onPrivacyChange={setPrivacyMode}
        selectedBeneficiaries={selectedBeneficiaries}
        onToggleBeneficiary={handleToggleBeneficiary}
        selectedGroups={selectedGroups}
        onToggleGroup={handleToggleGroup}
        beneficiariesList={beneficiariesList}
        groupsList={groupsList}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Backdrop
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  // Panel
  panel: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: { shadowColor: '#170B00', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 20 },
      android: { elevation: 16 },
    }),
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.strokeStrong,
    opacity: 0.3,
    marginBottom: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  panelTitle: {
    fontFamily: FONTS.serif,
    fontSize: 22,
    color: COLORS.textStrong,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.fillWeak,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Privacy option rows
  optionsContainer: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    backgroundColor: COLORS.fillWeaker,
  },
  optionRowSelected: {
    backgroundColor: `${COLORS.brand}08`,
    borderColor: `${COLORS.brand}25`,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.fillWeak,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSelected: {
    backgroundColor: `${COLORS.brand}12`,
  },
  optionLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 15,
    color: COLORS.textStrong,
    marginBottom: 2,
  },
  optionLabelSelected: {
    fontFamily: FONTS.sansSemi,
    color: COLORS.brand,
  },
  optionSublabel: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: COLORS.textWeak,
    lineHeight: 16,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.strokeWeak,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  radioOuterSelected: {
    borderColor: COLORS.brand,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.brand,
  },

  // Specific section
  selectSection: {
    backgroundColor: COLORS.fillWeaker,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionLabel: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.strokeWeaker,
    minHeight: 44,
  },
  selectAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
  },
  selectName: {
    flex: 1,
    fontFamily: FONTS.sansMedium,
    fontSize: 15,
    color: COLORS.textStrong,
  },
  selectMeta: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: COLORS.textWeak,
    marginTop: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.strokeWeak,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  checkboxSelected: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },

  // Done button
  doneBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  doneBtnText: {
    fontFamily: FONTS.sansSemi,
    fontSize: 16,
    color: COLORS.textInverse,
  },
});
