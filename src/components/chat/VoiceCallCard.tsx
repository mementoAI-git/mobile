import { useThemeColors, useThemedStyles } from '@/hooks/use-theme-colors';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import Copy from 'lucide-react-native/icons/copy';
import CornerDownRight from 'lucide-react-native/icons/corner-down-right';
import PhoneCall from 'lucide-react-native/icons/phone-call';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import dayjs from 'dayjs';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, ms, radius, responsiveSpace } from '@/constants/responsive';
import { parseVoiceCallMessage } from '@/features/chat/voice-transcript-parser';
import { toast } from '@/components/ui/Toast';
import { VOICE_SUMMARY_ERROR_TEXT } from '@/features/chat/voice-call-records';
import { useVoiceCallSummary } from '@/hooks/queries/use-voice-call-summary';

export interface VoiceCallCardProps {
  message: {
    _id?: string;
    text?: string;
    content?: string;
    created_at?: string;
    createdAt?: string;
    is_voice?: boolean;
    role?: string;
    /** Present for calls saved turn by turn; enables the Summary row. */
    voice_session_id?: string | null;
  };
  onReply?: () => void;
  highlighted?: boolean;
}

export const VoiceCallCard = React.memo(function VoiceCallCard({
  message,
  onReply,
  highlighted = false,
}: VoiceCallCardProps) {
  const COLORS = useThemeColors();
  const styles = useThemedStyles(stylesBase);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const sessionId = message.voice_session_id ?? null;
  const summary = useVoiceCallSummary(sessionId, isSummaryOpen);
  const rawText = message.text || message.content || '';
  const parsed = useMemo(() => parseVoiceCallMessage(rawText), [rawText]);

  const timestamp = message.created_at || message.createdAt;
  const timeLabel = timestamp && dayjs(timestamp).isValid()
    ? dayjs(timestamp).format('h:mma')
    : null;

  const toggleExpand = useCallback(() => {
    void Haptics.selectionAsync();
    setIsExpanded((prev) => !prev);
  }, []);

  const toggleSummary = useCallback(() => {
    void Haptics.selectionAsync();
    setIsSummaryOpen((prev) => !prev);
  }, []);

  const retrySummary = useCallback(() => {
    void Haptics.selectionAsync();
    void summary.refetch();
  }, [summary]);

  const handleCopyTranscript = useCallback(async () => {
    void Haptics.selectionAsync();
    try {
      if (!parsed.turns.length) {
        await Clipboard.setStringAsync(rawText);
        toast('Call summary copied', 'info');
        return;
      }
      const fullText = parsed.turns
        .map((t) => `${t.speakerName}: ${t.text}`)
        .join('\n\n');
      await Clipboard.setStringAsync(fullText);
      toast('Transcript copied to clipboard', 'info');
    } catch {
      toast('We couldn’t copy the transcript. Please try again.', 'error');
    }
  }, [parsed.turns, rawText]);

  const subtitle = parsed.hasTranscript
    ? `Spoken reflection · ${parsed.turns.length} turn${parsed.turns.length === 1 ? '' : 's'}`
    : 'Spoken conversation with Memento';

  return (
    <View
      style={[
        styles.cardContainer,
        highlighted && styles.cardHighlighted,
      ]}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <PhoneCall size={iconSize(18)} color={COLORS.brand} strokeWidth={2} />
          </View>
          <View style={styles.headerTextGroup}>
            <View style={styles.titleRow}>
              <Text style={styles.titleText}>Voice Call</Text>
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{parsed.duration}</Text>
              </View>
            </View>
            {/* <Text style={styles.subtitleText}>{subtitle}</Text> */}
          </View>
        </View>

        {timeLabel && <Text style={styles.timeText}>{timeLabel}</Text>}
      </View>

      {/* Summary: generated and saved on the server on first open */}
      {sessionId && parsed.hasTranscript ? (
        <>
          <TouchableOpacity
            onPress={toggleSummary}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isSummaryOpen ? 'Hide call summary' : 'View call summary'}
            accessibilityState={{ expanded: isSummaryOpen }}
            style={styles.toggleBar}
          >
            <Text style={styles.toggleText}>
              {isSummaryOpen ? 'Hide summary' : 'Summary'}
            </Text>
            {isSummaryOpen ? (
              <ChevronUp size={iconSize(16)} color={COLORS.brand} strokeWidth={2.2} />
            ) : (
              <ChevronDown size={iconSize(16)} color={COLORS.textWeak} strokeWidth={2} />
            )}
          </TouchableOpacity>

          {isSummaryOpen && (
            <View style={styles.summaryContent}>
              {summary.data ? (
                <>
                  <Text style={styles.summaryText}>{summary.data.text}</Text>
                  {summary.data.keyPoints.length > 0 && (
                    <View style={styles.keyPointsList}>
                      {summary.data.keyPoints.map((point, index) => (
                        <View key={index} style={styles.keyPointRow}>
                          <View style={styles.keyPointDot} />
                          <Text style={styles.keyPointText}>{point}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              ) : summary.isError ? (
                <TouchableOpacity
                  onPress={retrySummary}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Try summarizing again"
                  style={styles.summaryStatusRow}
                >
                  <Text style={styles.summaryErrorText}>{VOICE_SUMMARY_ERROR_TEXT}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.summaryStatusRow} accessibilityLabel="Summarizing call">
                  <ActivityIndicator size="small" color={COLORS.brand} />
                  <Text style={styles.summaryStatusText}>Summarizing…</Text>
                </View>
              )}
            </View>
          )}
        </>
      ) : null}

      {/* Accordion Toggle Bar (Floor 44dp hit target) */}
      {parsed.hasTranscript ? (
        <TouchableOpacity
          onPress={toggleExpand}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? 'Hide call transcript' : 'View call transcript'}
          accessibilityState={{ expanded: isExpanded }}
          style={styles.toggleBar}
        >
          <Text style={styles.toggleText}>
            {isExpanded ? 'Hide transcript' : 'View transcript'}
          </Text>
          {isExpanded ? (
            <ChevronUp size={iconSize(16)} color={COLORS.brand} strokeWidth={2.2} />
          ) : (
            <ChevronDown size={iconSize(16)} color={COLORS.textWeak} strokeWidth={2} />
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.toggleBar} accessibilityLabel="Transcript unavailable for this call">
          <Text style={styles.unavailableText}>Transcript unavailable for this call</Text>
        </View>
      )}

      {/* Expandable Transcript Content */}
      {isExpanded && parsed.hasTranscript && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />

          <View style={styles.turnsList}>
            {parsed.turns.map((turn, index) => {
              const isUser = turn.speaker === 'user';
              return (
                <View
                  key={index}
                  style={[
                    styles.turnRow,
                    isUser ? styles.turnRowUser : styles.turnRowAssistant,
                  ]}
                >
                  <Text
                    style={[
                      styles.turnSpeaker,
                      isUser ? styles.turnSpeakerUser : styles.turnSpeakerAssistant,
                    ]}
                  >
                    {turn.speakerName}
                  </Text>
                  <View
                    style={[
                      styles.turnBubble,
                      isUser ? styles.turnBubbleUser : styles.turnBubbleAssistant,
                    ]}
                  >
                    <Text style={styles.turnText}>{turn.text}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Action Row */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              onPress={handleCopyTranscript}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Copy full transcript"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.footerAction}
            >
              <Copy size={iconSize(14)} color={COLORS.textWeak} strokeWidth={2} />
              <Text style={styles.footerActionText}>Copy transcript</Text>
            </TouchableOpacity>

            {onReply && (
              <TouchableOpacity
                onPress={onReply}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Reply to call"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.footerAction}
              >
                <CornerDownRight size={iconSize(14)} color={COLORS.textWeak} strokeWidth={2} />
                <Text style={styles.footerActionText}>Reply</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
});

const stylesBase = StyleSheet.create({
  cardContainer: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.strokeWeak,
    borderRadius: radius(20),
    borderWidth: 1,
    marginBottom: 12,
    marginTop: 6,
    overflow: 'hidden',
    padding: responsiveSpace(14),
    // shadowColor: COLORS.shadow,
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.05,
    // shadowRadius: 10,
    // elevation: 2,
  },
  cardHighlighted: {
    borderColor: COLORS.brand,
    // borderWidth: 1.5,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: responsiveSpace(12),
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: 'rgba(233,130,70,0.1)',
    borderRadius: radius(999),
    height: ms(38, 0.2),
    justifyContent: 'center',
    width: ms(38, 0.2),
  },
  headerTextGroup: {
    flex: 1,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: responsiveSpace(8),
  },
  titleText: {
    ...TYPE.bodyStrong,
    color: COLORS.textStrong,
  },
  durationBadge: {
    backgroundColor: 'rgba(233,130,70,0.12)',
    borderRadius: radius(999),
    paddingHorizontal: responsiveSpace(8),
    paddingVertical: responsiveSpace(2),
  },
  durationText: {
    ...TYPE.metadata,
    color: COLORS.brand,
    letterSpacing: 0.2,
  },
  subtitleText: {
    ...TYPE.bodySmall,
    color: COLORS.textWeak,
    marginTop: 2,
  },
  timeText: {
    ...TYPE.metadata,
    color: COLORS.textWeak,
    marginLeft: 8,
  },
  toggleBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    marginTop: responsiveSpace(6),
    paddingHorizontal: responsiveSpace(2),
  },
  toggleText: {
    ...TYPE.buttonSmall,
    color: COLORS.brand,
  },
  summaryContent: {
    backgroundColor: COLORS.fillWeak,
    borderRadius: radius(14),
    gap: responsiveSpace(8),
    marginBottom: responsiveSpace(4),
    paddingHorizontal: responsiveSpace(12),
    paddingVertical: responsiveSpace(10),
  },
  summaryText: {
    ...TYPE.body,
    color: COLORS.textStrong,
  },
  keyPointsList: {
    gap: responsiveSpace(4),
  },
  keyPointRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: responsiveSpace(8),
  },
  keyPointDot: {
    backgroundColor: COLORS.brand,
    borderRadius: radius(999),
    height: 5,
    marginTop: responsiveSpace(8),
    width: 5,
  },
  keyPointText: {
    ...TYPE.bodySmall,
    color: COLORS.textStrong,
    flex: 1,
  },
  summaryStatusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: responsiveSpace(8),
    minHeight: 36,
  },
  summaryStatusText: {
    ...TYPE.bodySmall,
    color: COLORS.textWeak,
  },
  summaryErrorText: {
    ...TYPE.bodySmall,
    color: COLORS.textWeak,
  },
  expandedContent: {
    marginTop: responsiveSpace(2),
  },
  divider: {
    backgroundColor: COLORS.strokeWeaker,
    height: 1,
    marginBottom: responsiveSpace(12),
  },
  unavailableText: {
    ...TYPE.bodySmall,
    color: COLORS.textWeak,
    fontStyle: 'italic',
  },
  turnsList: {
    gap: responsiveSpace(10),
  },
  turnRow: {
    marginBottom: 4,
  },
  turnRowUser: {
    alignItems: 'flex-end',
  },
  turnRowAssistant: {
    alignItems: 'flex-start',
  },
  turnSpeaker: {
    marginBottom: 3,
    paddingHorizontal: 4,
  },
  turnSpeakerUser: {
    ...TYPE.eyebrow,
    color: COLORS.textWeak,
  },
  turnSpeakerAssistant: {
    ...TYPE.eyebrow,
    color: COLORS.brand,
  },
  turnBubble: {
    borderRadius: radius(16),
    maxWidth: '88%',
    paddingHorizontal: responsiveSpace(12),
    paddingVertical: responsiveSpace(9),
  },
  turnBubbleUser: {
    backgroundColor: COLORS.fillWeak,
  },
  turnBubbleAssistant: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.strokeWeaker,
    borderWidth: 1,
  },
  turnText: {
    ...TYPE.body,
    color: COLORS.textStrong,
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: responsiveSpace(16),
    justifyContent: 'flex-end',
    marginTop: responsiveSpace(12),
    paddingTop: responsiveSpace(6),
  },
  footerAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    minHeight: 36,
  },
  footerActionText: {
    ...TYPE.bodySmall,
    color: COLORS.textWeak,
  },
});
