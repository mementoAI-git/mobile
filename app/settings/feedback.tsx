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
import ImagePlus from 'lucide-react-native/icons/image-plus';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import Trash2 from 'lucide-react-native/icons/trash';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Button, ResponsiveScreen, Select, TextInput } from '@/components/ui';
import type { SelectOption } from '@/components/ui/Select';
import { toast } from '@/components/ui/Toast';
import { SettingsSubpageHeader } from '@/components/settings/SettingsSubpageHeader';
import { useFeedbackMutation, type FeedbackType } from '@/hooks/mutations/use-feedback-mutation';
import { useFileUpload } from '@/hooks/mutations/use-file-upload';
import { isPermissionGranted } from '@/lib/permission-recovery';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';
import { useUserStore } from '@/store';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

const FEEDBACK_OPTIONS: (SelectOption & { value: FeedbackType })[] = [
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
  const [type, setType] = useState<FeedbackType>(FEEDBACK_OPTIONS[0].value);
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
        email: user?.email ?? '',
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
    <View key={attachment.clientId} className="min-h-[56px] flex-row items-center py-2">
      <Image source={{ uri: attachment.uri }} className="size-12 rounded-xl bg-fill-weak" resizeMode="cover" />
      <View className="ml-3 flex-1">
        <Text numberOfLines={1} style={{ ...TYPE.body, color: COLORS.textStrong }}>
          {attachment.name}
        </Text>
        <Text
          style={{
            ...TYPE.bodySmall,
            color: attachment.status === 'failed' ? COLORS.error : COLORS.textWeak,
            marginTop: 2,
          }}
        >
          {attachment.status === 'failed' ? 'Upload failed' : `${attachment.progress}%`}
        </Text>
      </View>
      {attachment.status === 'failed' && (
        <TouchableOpacity
          onPress={() => retryUpload(attachment.clientId)}
          className="mr-1 size-10 items-center justify-center rounded-full bg-fill-weaker"
        >
          <RotateCcw size={18} color={COLORS.brand} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={() => removeAttachment(attachment.clientId)}
        className="size-10 items-center justify-center rounded-full bg-fill-weaker"
      >
        <Trash2 size={18} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  )), [attachments, removeAttachment, retryUpload]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <SettingsSubpageHeader title="Send feedback" onBack={handleBack} />

      <View className="flex-1">
        <ImageBackground source={PATTERN} className="absolute inset-0" style={{ opacity: 0.03 }} resizeMode="repeat" />
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <ResponsiveScreen maxWidth={720}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 16, paddingBottom: 28 }}
            >
            {/* Main feedback form inside journal card */}
            <View className="rounded-[24px] bg-card p-5 gap-5">
              <Select
                label="Feedback type"
                options={FEEDBACK_OPTIONS}
                value={type}
                onValueChange={(value) => setType(value as FeedbackType)}
                className="h-14 rounded-full"
              />

              <TextInput
                label="Add a comment"
                value={message}
                onChangeText={setMessage}
                placeholder="Tell us what happened or what would make Memento better"
                multiline
                textAlignVertical="top"
                inputClassName="min-h-[160px]"
              />
            </View>

            {/* Screenshots section inside journal card */}
            <View className="mt-4 rounded-[24px] bg-card p-5">
              <View className="flex-row items-center justify-between mb-1">
                <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>
                  Screenshots
                </Text>
                <Text style={{ ...TYPE.metadata, color: COLORS.textMuted }}>
                  OPTIONAL
                </Text>
              </View>
              <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak, marginBottom: 14 }}>
                Attach images to help us diagnose the issue.
              </Text>

              <Button
                variant="secondary"
                size="md"
                className="h-11 rounded-full px-5 self-start"
                leftIcon={<ImagePlus size={18} color={COLORS.textStrong} />}
                onPress={handlePickImages}
              >
                Choose images
              </Button>

              {attachments.length > 0 && (
                <View className="mt-4 gap-1">
                  {attachmentRows}
                </View>
              )}
            </View>
          </ScrollView>
          </ResponsiveScreen>

          <View
            className="px-5 pt-3 bg-background"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <Button
              size="lg"
              className="h-14 w-full"
              onPress={handleSubmit}
              disabled={!canSubmit}
              loading={submitFeedback.isPending}
            >
              Send feedback
            </Button>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}
