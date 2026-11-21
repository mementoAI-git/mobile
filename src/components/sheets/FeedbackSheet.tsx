import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { SheetActions, SHEET_FILL } from './SheetActions';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { Button, TextInput, Spinner } from '@/components/ui';
import ImageIcon from 'lucide-react-native/icons/image';
import { BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useUiStore, useUserStore } from '@/store';
import { useFileUpload } from '@/hooks/mutations/use-file-upload';
import * as ImagePicker from 'expo-image-picker';
import { requestLibraryPickerAccess } from '@/features/media/library-picker-access';
import client from '@/api/client';
import endpoint from '@/api/endpoint';
import { useToast } from '@/components/ui/Toast';
import { SheetHeader } from './SheetHeader';
import { SHEET_GROUP_GAP, SHEET_SECTION_GAP } from '@/features/layout/sheet-safe-area';
import { TYPE } from '@/constants/typography';
import { logger } from '@/lib/logger';
import { isPermissionGranted } from '@/lib/permission-recovery';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';

const FEEDBACK_OPTIONS = ['Bug', 'Feature Request', 'UI/UX Issue', 'General Feedback', 'Other'];

export function FeedbackSheet() {
  const COLORS = useThemeColors();
  const user = useUserStore(s => s.user);
  const closeSheet = useUiStore((s) => s.closeSheet);
  const { toast } = useToast();

  const [type, setType] = useState(FEEDBACK_OPTIONS[0]);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTypeSelect, setShowTypeSelect] = useState(false);

  // Guard: don't setState after the sheet closes
  const isMountedRef = React.useRef(true);
  React.useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  const { mutateAsync: uploadFile, isPending: isUploading } = useFileUpload();

  const handlePickImage = async () => {
    const permission = await requestLibraryPickerAccess();
    if (!isPermissionGranted(permission)) {
      showPermissionRecoveryAlert({
        permission,
        title: 'Screenshots are tucked away',
        description: 'Allow photo access to attach a screenshot to your feedback.',
        settingsDescription: 'Photo access is turned off in Settings. Turn it back on to attach a screenshot to your feedback.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      try {
        const fileUri = asset.uri;
        const fileName = fileUri.split('/').pop() || 'screenshot.jpg';
        const fileType = asset.mimeType || 'image/jpeg';

        const uploaded = await uploadFile({
          uri: fileUri,
          name: fileName,
          type: fileType,
        });

        if (isMountedRef.current && uploaded && uploaded._id) {
          setAttachments(prev => [...prev, uploaded._id]);
        }
      } catch (err) {
        if (isMountedRef.current) {
          logger.handledError('Upload failed', err);
          toast('There was an error uploading your screenshot.', 'error');
        }
      }
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setIsSubmitting(true);

    try {
      await client.post(endpoint.feedback, {
        type,
        message: message.trim(),
        email: email || user?.email,
        screenshot: attachments[0] || undefined,
        screenshots: attachments,
      });

      if (isMountedRef.current) {
        toast('Feedback sent.', 'success');
        closeSheet();
      }
    } catch (error) {
      if (isMountedRef.current) {
        logger.handledError('Failed to send feedback:', error);
        toast('Couldn’t send feedback. Try again.', 'error');
      }
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  };

  return (
    <BottomSheetScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ ...SHEET_FILL, gap: SHEET_GROUP_GAP }}
    >
      <SheetHeader title="Send feedback" onClose={closeSheet} closeLabel="Close feedback" />

      <View style={{ gap: SHEET_SECTION_GAP }}>
      <View>
        <Text className="text-text-strong mb-1.5" style={TYPE.label}>Type</Text>
        <TouchableOpacity
          onPress={() => setShowTypeSelect(!showTypeSelect)}
          accessibilityRole="button"
          className="min-h-[52px] justify-center rounded-[8px] bg-fill-weaker px-4"
        >
          <Text className="text-text-strong" style={TYPE.label}>{type}</Text>
        </TouchableOpacity>

        {showTypeSelect && (
          <View className="mt-2 overflow-hidden rounded-[8px] bg-fill-weak">
            {FEEDBACK_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => {
                  setType(opt);
                  setShowTypeSelect(false);
                }}
                className={`px-3 py-3 border-b border-stroke-weaker last:border-b-0 ${type === opt ? 'bg-fill-weaker' : ''}`}
              >
                <Text className={type === opt ? 'text-brand' : 'text-text-strong'} style={type === opt ? TYPE.label : TYPE.body}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <TextInput
        label="Message"
        value={message}
        onChangeText={setMessage}
        placeholder="What's on your mind?"
        multiline
        numberOfLines={4}
        inputClassName="min-h-[100px]"
        textAlignVertical="top"
        InputComponent={BottomSheetTextInput}
      />

      {!user && (
        <TextInput
          label="Email (optional)"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          InputComponent={BottomSheetTextInput}
        />
      )}

      <View>
        <Text className="text-text-strong mb-1.5" style={TYPE.label}>Screenshots (optional)</Text>
        <TouchableOpacity
          onPress={handlePickImage}
          disabled={isUploading}
          className={`min-h-[44px] self-start flex-row items-center justify-center py-2 px-4 rounded-full border ${attachments.length > 0 ? 'bg-brand-tint border-brand-weak' : 'bg-fill-weaker border-stroke-weaker'}`}
        >
          {isUploading ? (
             <Spinner size="small" />
          ) : (
            <>
              <ImageIcon size={16} color={attachments.length > 0 ? COLORS.brand : COLORS.textBase} />
              <Text className={`ml-2 ${attachments.length > 0 ? 'text-brand' : 'text-text-strong'}`} style={TYPE.metadata}>
                {attachments.length > 0 ? `${attachments.length} Attached` : 'Choose images'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      </View>

      <SheetActions className="flex-row gap-3">
        <Button variant="secondary" size="lg" rounded="full" onPress={closeSheet} className="h-14 flex-1">
          Cancel
        </Button>
        <Button
          onPress={handleSend}
          loading={isSubmitting}
          disabled={!message.trim() || isUploading || isSubmitting}
          size="lg"
          rounded="full"
          className="h-14 flex-1"
        >
          Send feedback
        </Button>
      </SheetActions>
    </BottomSheetScrollView>
  );
}
