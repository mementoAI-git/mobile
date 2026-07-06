import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button, TextInput } from '@/components/ui';
import { Image as ImageIcon } from 'lucide-react-native';
import { BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useUiStore, useUserStore } from '@/store';
import { useFileUpload } from '@/hooks/mutations/use-file-upload';
import * as ImagePicker from 'expo-image-picker';
import client from '@/api/client';
import endpoint from '@/api/endpoint';
import { useToast } from '@/components/ui/Toast';
import { COLORS, FONTS } from '@/constants/tokens';
import { logger } from '@/lib/logger';

const FEEDBACK_OPTIONS = ['Bug', 'Feature Request', 'UI/UX Issue', 'General Feedback', 'Other'];

export function FeedbackSheet() {
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
          logger.error('Upload failed', err);
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
        screenshots: attachments
      });
      
      if (isMountedRef.current) {
        toast('Feedback sent successfully!', 'success');
        closeSheet();
      }
    } catch (error) {
      if (isMountedRef.current) {
        logger.error('Failed to send feedback:', error);
        toast('Failed to send feedback. Please try again.', 'error');
      }
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  };

  return (
    <BottomSheetScrollView showsVerticalScrollIndicator={false} className="gap-4">
      <Text
        className="text-2xl text-text-strong mb-2"
        style={{ fontFamily: FONTS.serif }}
      >
        Send Feedback
      </Text>

      <View className="mb-2">
        <Text className="text-sm font-medium text-text-strong mb-1.5" style={{ fontFamily: FONTS.sansMedium }}>Type</Text>
        <TouchableOpacity 
          onPress={() => setShowTypeSelect(!showTypeSelect)}
          className="border border-stroke-weaker bg-white rounded-xl px-3 py-3"
        >
          <Text className="text-sm text-text-strong" style={{ fontFamily: FONTS.sans }}>{type}</Text>
        </TouchableOpacity>
        
        {showTypeSelect && (
          <View className="mt-2 bg-fill-weak rounded-xl border border-stroke-weaker overflow-hidden">
            {FEEDBACK_OPTIONS.map((opt) => (
              <TouchableOpacity 
                key={opt}
                onPress={() => {
                  setType(opt);
                  setShowTypeSelect(false);
                }}
                className={`px-3 py-3 border-b border-stroke-weaker last:border-b-0 ${type === opt ? 'bg-fill-weaker' : ''}`}
              >
                <Text className={`text-sm ${type === opt ? 'font-medium text-brand' : 'text-text-strong'}`} style={{ fontFamily: type === opt ? FONTS.sansMedium : FONTS.sans }}>{opt}</Text>
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

      <View className="mt-2">
        <Text className="text-sm font-medium text-text-strong mb-1.5" style={{ fontFamily: FONTS.sansMedium }}>Screenshots (optional)</Text>
        <TouchableOpacity 
          onPress={handlePickImage}
          disabled={isUploading}
          className={`self-start flex-row items-center justify-center py-2 px-4 rounded-full border ${attachments.length > 0 ? 'bg-brand-tint border-brand-weak' : 'bg-fill-weaker border-stroke-weaker'}`}
        >
          {isUploading ? (
             <ActivityIndicator size="small" color={COLORS.brand} />
          ) : (
            <>
              <ImageIcon size={16} color={attachments.length > 0 ? COLORS.brand : COLORS.textBase} />
              <Text className={`text-xs ml-2 ${attachments.length > 0 ? 'text-brand' : 'text-text-strong'}`} style={{ fontFamily: FONTS.sansMedium }}>
                {attachments.length > 0 ? `${attachments.length} Attached` : 'Choose images'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View className="flex-row gap-3 mt-4">
        <Button variant="outline" onPress={closeSheet} className="flex-1">
          Cancel
        </Button>
        <Button
          onPress={handleSend}
          loading={isSubmitting}
          disabled={!message.trim() || isUploading || isSubmitting}
          className="flex-1"
        >
          Send Feedback
        </Button>
      </View>
    </BottomSheetScrollView>
  );
}
