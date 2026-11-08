import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Check from 'lucide-react-native/icons/check';
import Paperclip from 'lucide-react-native/icons/paperclip';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import X from 'lucide-react-native/icons/x';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Button, ResponsiveScreen, Select, Spinner, TextInput } from '@/components/ui';
import type { SelectOption } from '@/components/ui/Select';
import { toast } from '@/components/ui/Toast';
import { SettingsSubpageHeader } from '@/components/settings/SettingsSubpageHeader';
import { useFeedbackMutation, type FeedbackType } from '@/hooks/mutations/use-feedback-mutation';
import { useFileUpload } from '@/hooks/mutations/use-file-upload';
import { isPermissionGranted } from '@/lib/permission-recovery';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';
import { useUserStore } from '@/store';
import { TYPE } from '@/constants/typography';


// Same choices as web; values are the API's feedback types.
const FEEDBACK_OPTIONS: (SelectOption & { value: FeedbackType })[] = [
  { label: 'Bugs', value: 'Bug' },
  { label: 'Feature requests', value: 'Feature Request' },
  { label: 'General feedback', value: 'General Feedback' },
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
  const COLORS = useThemeColors();
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <SettingsSubpageHeader title="Send" accent="feedback" onBack={handleBack} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ResponsiveScreen maxWidth={720}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: Math.max(insets.bottom, 16) + 32, gap: 40 }}
          >
            {/* Web feedback page: description, then the form. */}
            <Text style={{ ...TYPE.bodyLarge, color: COLORS.textWeak }}>
              Share a bug, an idea, or something we could improve.
            </Text>

            <Select
              label="Feedback type"
              options={FEEDBACK_OPTIONS}
              value={type}
              onValueChange={(value) => setType(value as FeedbackType)}
              className="h-12 rounded-[12px] border border-stroke-weak bg-fill-weak"
            />

            <TextInput
              label="Message"
              value={message}
              onChangeText={setMessage}
              placeholder="What happened, or what would you like to see?"
              variant="filled"
              multiline
              textAlignVertical="top"
              inputClassName="min-h-[128px]"
            />

            <View style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={handlePickImages}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel="Add screenshots"
                accessibilityHint="Choose images from your photos."
                style={{
                  minHeight: 76,
                  paddingHorizontal: 24,
                  paddingVertical: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: COLORS.strokeWeak,
                  backgroundColor: COLORS.fillWeaker,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Paperclip size={16} color={COLORS.textStrong} />
                  <Text style={{ ...TYPE.button, color: COLORS.textStrong }}>Add screenshots</Text>
                </View>
                <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak }}>
                  Choose images from your photos.
                </Text>
              </TouchableOpacity>

              {attachments.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {attachments.map((attachment) => (
                    <View key={attachment.clientId} style={{ width: '47%', flexGrow: 1, maxWidth: '50%', gap: 6 }}>
                      <View
                        style={{
                          aspectRatio: 16 / 9,
                          borderRadius: 8,
                          overflow: 'hidden',
                          borderWidth: 1,
                          borderColor: COLORS.strokeWeak,
                          backgroundColor: COLORS.fillWeak,
                        }}
                      >
                        <Image source={{ uri: attachment.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        {attachment.status === 'uploading' ? (
                          <View
                            accessibilityRole="progressbar"
                            accessibilityLabel={`Uploading ${attachment.name}`}
                            style={{
                              position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
                              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                              backgroundColor: COLORS.mediaSurface,
                            }}
                          >
                            <Spinner size="small" color={COLORS.mediaText} />
                            <Text style={{ ...TYPE.metadata, color: COLORS.mediaText }}>{attachment.progress}%</Text>
                          </View>
                        ) : null}
                        {attachment.status === 'failed' ? (
                          <TouchableOpacity
                            onPress={() => retryUpload(attachment.clientId)}
                            accessibilityRole="button"
                            accessibilityLabel={`Retry uploading ${attachment.name}`}
                            style={{
                              position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
                              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                              backgroundColor: COLORS.mediaSurface,
                            }}
                          >
                            <RotateCcw size={16} color={COLORS.mediaText} />
                            <Text style={{ ...TYPE.metadata, color: COLORS.mediaText }}>Retry</Text>
                          </TouchableOpacity>
                        ) : null}
                        {attachment.status === 'uploaded' ? (
                          <View
                            accessibilityLabel="Uploaded"
                            style={{ position: 'absolute', left: 6, bottom: 6, padding: 4, borderRadius: 999, backgroundColor: COLORS.success }}
                          >
                            <Check size={12} color={COLORS.textInverse} strokeWidth={3} />
                          </View>
                        ) : null}
                        <TouchableOpacity
                          onPress={() => removeAttachment(attachment.clientId)}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${attachment.name}`}
                          style={{
                            position: 'absolute', top: 6, right: 6,
                            width: 28, height: 28, borderRadius: 14,
                            alignItems: 'center', justifyContent: 'center',
                            backgroundColor: COLORS.background,
                          }}
                        >
                          <X size={16} color={COLORS.textStrong} />
                        </TouchableOpacity>
                      </View>
                      <Text
                        numberOfLines={1}
                        style={{ ...TYPE.metadata, color: attachment.status === 'failed' ? COLORS.error : COLORS.textWeak }}
                      >
                        {attachment.status === 'failed' ? 'Upload failed' : attachment.name}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <Button
              size="lg"
              rounded="full"
              className="h-14 w-full"
              onPress={handleSubmit}
              disabled={!canSubmit}
              loading={submitFeedback.isPending}
            >
              {submitFeedback.isPending ? 'Sending…' : 'Send feedback'}
            </Button>
          </ScrollView>
        </ResponsiveScreen>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
