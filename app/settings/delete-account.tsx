import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Info from 'lucide-react-native/icons/info';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { Button, Checkbox, ResponsiveScreen, TextInput } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { SheetHeader } from '@/components/sheets/SheetHeader';
import { TYPE } from '@/constants/typography';
import { useDeleteAccount } from '@/hooks/mutations/use-auth-mutations';
import { useSubscription } from '@/hooks/queries/use-subscription';
import { useUiStore, useUserStore } from '@/store';
import {
  buildDeleteAccountPayload,
  DELETE_CONFIRMATION_WORD,
  deletionReasonLabel,
  isDeletionConfirmed,
  maskEmail,
  type DeletionReason,
} from '@/features/account-deletion/deletion';

type Step = 'overview' | 'confirm';

/** Delete my account: what happens and why you're leaving, then type DELETE to confirm. */
export default function DeleteAccountScreen() {
  const COLORS = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const openSheet = useUiStore((s) => s.openSheet);
  const email = useUserStore((s) => s.user?.email);
  const { isProOrAbove } = useSubscription();
  const deleteAccount = useDeleteAccount();

  const [step, setStep] = useState<Step>('overview');
  const [reason, setReason] = useState<DeletionReason | null>(null);
  const [details, setDetails] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [exportData, setExportData] = useState(false);
  const busy = deleteAccount.isPending;

  const leave = useCallback(() => {
    if (busy) return;
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/settings/privacy');
  }, [busy, router]);

  const chooseReason = useCallback(() => {
    Haptics.selectionAsync();
    openSheet('delete-account-reason', {
      reason,
      details,
      onSave: (nextReason: DeletionReason | null, nextDetails: string) => {
        setReason(nextReason);
        setDetails(nextDetails);
      },
    });
  }, [details, openSheet, reason]);

  const startDeletion = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep('confirm');
  }, []);

  const confirmed = isDeletionConfirmed(confirmation);

  const deleteNow = useCallback(async () => {
    if (!confirmed || busy) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      // On success the session ends and the app returns to sign-in.
      await deleteAccount.mutateAsync(buildDeleteAccountPayload({ reason, details, exportData }));
    } catch {
      toast('We couldn’t delete your account. Please try again.', 'error');
    }
  }, [busy, confirmed, deleteAccount, details, exportData, reason]);

  const bold = { ...TYPE.bodyStrong, color: COLORS.textStrong };
  const bullet = (content: React.ReactNode) => (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 9, backgroundColor: COLORS.textWeak }} />
      <Text style={{ ...TYPE.body, color: COLORS.textBase, flex: 1 }}>{content}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ResponsiveScreen maxWidth={720}>
          <SheetHeader
            title={step === 'overview' ? 'Delete my account' : 'One final step'}
            onClose={leave}
            closeLabel="Close and keep my account"
            style={{ paddingTop: 12 }}
          />

          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 32, paddingBottom: 24, gap: 16 }}
          >
            {step === 'overview' ? (
              <>
                {isProOrAbove ? (
                  <View style={{ padding: 20, borderRadius: 20, backgroundColor: COLORS.brandSubtle, gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Info size={20} color={COLORS.brand} />
                      <Text style={{ ...TYPE.bodyStrong, color: COLORS.brand }}>Your Pro plan is active</Text>
                    </View>
                    <Text style={{ ...TYPE.body, color: COLORS.textBase }}>
                      Your Memento Pro plan is still active. You’ll immediately lose access to your Pro plan benefits if you deactivate your account.
                    </Text>
                  </View>
                ) : null}

                <View style={{ padding: 20, borderRadius: 20, borderWidth: 1, borderColor: COLORS.strokeWeak, backgroundColor: COLORS.settingsCard, gap: 16 }}>
                  <Text style={{ ...TYPE.bodyLarge, color: COLORS.textStrong }}>What is going to happen:</Text>
                  {bullet(<>You will be logged out of your account as it enters <Text style={bold}>deactivation mode</Text> immediately.</>)}
                  {bullet(<>You can <Text style={bold}>reactivate</Text> your account if you log in <Text style={bold}>within</Text> a <Text style={bold}>14-day</Text> cooldown period.</>)}
                  {bullet(<>After this period, your data will be <Text style={bold}>permanently deleted</Text> from our platform.</>)}
                </View>

                <TouchableOpacity
                  onPress={chooseReason}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose a reason, ${deletionReasonLabel(reason)}`}
                  style={{ minHeight: 72, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 20, borderWidth: 1, borderColor: COLORS.strokeWeak, backgroundColor: COLORS.settingsCard, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak }}>Choose a reason</Text>
                    <Text numberOfLines={1} style={{ ...TYPE.bodyStrong, color: COLORS.textStrong, marginTop: 2 }}>
                      {deletionReasonLabel(reason)}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={COLORS.textWeak} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  bordered
                  label={`Type “${DELETE_CONFIRMATION_WORD}” to confirm this action`}
                  value={confirmation}
                  onChangeText={setConfirmation}
                  placeholder={DELETE_CONFIRMATION_WORD}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoComplete="off"
                  editable={!busy}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
                  <Checkbox checked={exportData} onCheckedChange={setExportData} disabled={busy} size={22} />
                  <Text
                    onPress={() => !busy && setExportData((value) => !value)}
                    style={{ ...TYPE.body, color: COLORS.textStrong, flex: 1 }}
                  >
                    Export my data to my email{email ? ` (${maskEmail(email)})` : ''}
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          <View style={{ gap: 12, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) }}>
            {step === 'overview' ? (
              <Button variant="destructive" size="lg" rounded="full" className="h-14 w-full" onPress={startDeletion}>
                Start deletion process
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="lg"
                rounded="full"
                className="h-14 w-full"
                disabled={!confirmed || busy}
                loading={busy}
                onPress={() => void deleteNow()}
              >
                {busy ? 'Deactivating account' : 'Log out and delete account'}
              </Button>
            )}
            <Button variant="secondary" size="lg" rounded="full" className="h-14 w-full" disabled={busy} onPress={leave}>
              I changed my mind
            </Button>
          </View>
        </ResponsiveScreen>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
