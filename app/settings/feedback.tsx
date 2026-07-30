import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ImagePlus, RotateCcw, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Button, Select, TextInput } from '@/components/ui';
import type { SelectOption } from '@/components/ui/Select';
import { toast } from '@/components/ui/Toast';
import { useFeedbackMutation } from '@/hooks/mutations/use-feedback-mutation';
import { useFileUpload } from '@/hooks/mutations/use-file-upload';
import { isPermissionGranted } from '@/lib/permission-recovery';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';
import { useUserStore } from '@/store';
import { COLORS, FONTS } from '@/constants/tokens';
import { SETTINGS_TYPE } from '@/components/settings/settings-typography';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

const FEEDBACK_OPTIONS: SelectOption[] = [
  { label: 'Report a bug', value: 'Bug' },
  { label: 'Request a feature', value: 'Feature Request' },
  { label: 'UI/UX issue', value: 'UI/UX Issue' },
  { label: 'General feedback', value: 'General Feedback' },
  { label: 'Other', value: 'Other' },
];

type AttachmentStatus = 'uploading' | 'uploaded' | 'failed';

interface FeedbackAttachment {
  clientId: string;
  uri: string;
  name: string;
  mimeType: string;
  progress: number;
  status: AttachmentStatus;
  fileId: string | null;
}

export default function FeedbackSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUserStore((state) => state.user);
  const uploadFile = useFileUpload();
  const submitFeedback = useFeedbackMutation();
  const [type, setType] = useState(FEEDBACK_OPTIONS[0].value);
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<FeedbackAttachment[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  }, [router]);

  const uploadAttachment = useCallback(async (attachment: FeedbackAttachment) => {
    if (isMountedRef.current) {
      setAttachments((current) => current.map((item) => (
        item.clientId === attachment.clientId
          ? { ...item, status: 'uploading', progress: 0 }
          : item
      )));
    }

    try {
      const uploaded = await uploadFile.mutateAsync({
        uri: attachment.uri,
        name: attachment.name,
        type: attachment.mimeType,
        onProgress: (progress) => {
          if (!isMountedRef.current) return;
          setAttachments((current) => current.map((item) => (
            item.clientId === attachment.clientId ? { ...item, progress } : item
          )));
        },
      });
      if (!isMountedRef.current) return;
      setAttachments((current) => current.map((item) => (
        item.clientId === attachment.clientId
          ? { ...item, status: 'uploaded', progress: 100, fileId: uploaded._id }
          : item
      )));
    } catch {
      if (!isMountedRef.current) return;
      setAttachments((current) => current.map((item) => (
        item.clientId === attachment.clientId
          ? { ...item, status: 'failed', progress: 0, fileId: null }
          : item
      )));
    }
  }, [uploadFile]);

  const handlePickImages = useCallback(async () => {
    Haptics.selectionAsync();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!isPermissionGranted(permission)) {
      showPermissionRecoveryAlert({
        permission,
        title: 'Screenshots are tucked away',
        description: 'Allow photo access to attach screenshots to your feedback.',
        settingsDescription: 'Photo access is turned off in Settings. Turn it back on to attach screenshots.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets.length) return;

    const picked = result.assets.map((asset, index): FeedbackAttachment => ({
      clientId: `feedback-${Date.now()}-${index}`,
      uri: asset.uri,
      name: asset.fileName ?? `screenshot-${index + 1}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
      progress: 0,
      status: 'uploading',
      fileId: null,
    }));
    if (!isMountedRef.current) return;
    setAttachments((current) => [...current, ...picked]);
    await Promise.allSettled(picked.map(uploadAttachment));
  }, [uploadAttachment]);

  const removeAttachment = useCallback((clientId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAttachments((current) => current.filter((item) => item.clientId !== clientId));
  }, []);

  const retryUpload = useCallback((clientId: string) => {
    const attachment = attachments.find((item) => item.clientId === clientId);
    if (attachment) uploadAttachment(attachment);
  }, [attachments, uploadAttachment]);

  const hasPendingUpload = attachments.some((item) => item.status === 'uploading');
  const hasFailedUpload = attachments.some((item) => item.status === 'failed');
  const canSubmit = Boolean(message.trim()) && !hasPendingUpload && !hasFailedUpload && !submitFeedback.isPending;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await submitFeedback.mutateAsync({
        type,
        message: message.trim(),
        email: user?.email,
        screenshots: attachments.flatMap((item) => item.fileId ? [item.fileId] : []),
      });
      toast('Thanks. Your feedback is on its way.', 'success');
      if (router.canGoBack()) router.back();
      else router.replace('/settings');
    } catch {
      toast('We couldn’t send your feedback. Please try again.', 'error');
    }
  }, [attachments, canSubmit, message, router, submitFeedback, type, user?.email]);

  const attachmentRows = useMemo(() => attachments.map((attachment) => (
    <View key={attachment.clientId} className="min-h-[70px] flex-row items-center">
      <Image source={{ uri: attachment.uri }} className="size-14 rounded-xl bg-fill-weak" resizeMode="cover" />
      <View className="ml-3 flex-1">
        <Text numberOfLines={1} className="text-[15px] text-text-strong" style={{ fontFamily: FONTS.sansMedium }}>
          {attachment.name}
        </Text>
        <Text
          className={`mt-1 text-[13px] ${attachment.status === 'failed' ? 'text-error' : 'text-text-weak'}`}
          style={{ fontFamily: FONTS.sans }}
        >
          {attachment.status === 'failed' ? 'Upload failed' : `${attachment.progress}%`}
        </Text>
      </View>
      {attachment.status === 'failed' && (
        <TouchableOpacity
          onPress={() => retryUpload(attachment.clientId)}
          className="mr-1 size-11 items-center justify-center rounded-full"
        >
          <RotateCcw size={20} color={COLORS.brand} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={() => removeAttachment(attachment.clientId)}
        className="size-11 items-center justify-center rounded-full"
      >
        <Trash2 size={22} color={COLORS.textBase} />
      </TouchableOpacity>
    </View>
  )), [attachments, removeAttachment, retryUpload]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="h-[88px] flex-row items-center justify-between px-6">
          <TouchableOpacity onPress={handleBack} className="size-11 items-center justify-center rounded-full bg-fill-weak">
            <ArrowLeft size={23} color={COLORS.textBase} />
          </TouchableOpacity>
          <Text style={SETTINGS_TYPE.screenTitle}>Send feedback</Text>
          <View className="size-11" />
        </View>

        <View className="flex-1">
          <ImageBackground source={PATTERN} className="absolute inset-0" style={{ opacity: 0.03 }} resizeMode="repeat" />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 26, paddingBottom: 28 }}
          >
            <Select
              label="Feedback type"
              options={FEEDBACK_OPTIONS}
              value={type}
              onValueChange={setType}
              className="h-14 rounded-2xl bg-card"
            />

            <TextInput
              label="Add a comment"
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us what happened or what would make Memento better"
              multiline
              textAlignVertical="top"
              inputClassName="min-h-[280px]"
              containerClassName="mt-7"
            />

            <Text className="mb-3 mt-7" style={SETTINGS_TYPE.fieldLabel}>
              Screenshots (Optional)
            </Text>
            <Button
              variant="secondary"
              size="lg"
              className="h-14"
              leftIcon={<ImagePlus size={22} color={COLORS.textStrong} />}
              onPress={handlePickImages}
            >
              Choose images
            </Button>
            <View className="mt-4 gap-2">{attachmentRows}</View>
          </ScrollView>
        </View>

        <View
          className="border-t border-stroke-weaker bg-background px-6 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <Button
            size="lg"
            className="h-14"
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={submitFeedback.isPending}
          >
            Send feedback
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
