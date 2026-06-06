import { useState, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'companion-warm', name: 'Warm Companion', description: 'A gentle, caring voice for deep personal reflection', gender: 'female' },
  { id: 'guide-analytical', name: 'Analytical Guide', description: 'Clear, structured and calm voice for organizing thoughts', gender: 'male' },
  { id: 'friend-casual', name: 'Casual Friend', description: 'Upbeat, natural and relaxed voice for everyday chats', gender: 'female' },
  { id: 'deep-masculine', name: 'Deep Sage', description: 'Resonant, slow and comforting deep voice', gender: 'male' },
];

const MOCK_AI_RESPONSES = [
  "Hello, I am here. Tell me, what is on your mind today?",
  "That sounds like a meaningful memory. How did that moment make you feel?",
  "I'm listening. Take all the time you need to capture this story.",
  "It is so important to preserve these reflections. What else do you remember about that place?",
  "Your legacy is built of these exact moments. Let's explore that feeling further.",
];

const MOCK_USER_TRANSCRIPTS = [
  "I was thinking about my childhood home...",
  "It was a warm summer evening, and everyone was gathered in the garden...",
  "We laughed so hard until our chests hurt...",
  "I want to make sure my grandchildren know how much we loved that place...",
];

export function useVoiceMode() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeVoice, setActiveVoice] = useState<VoiceOption>(VOICE_OPTIONS[0]);
  const [aiSpeechText, setAiSpeechText] = useState('Ready to connect secure voice link...');
  const [userSpeechText, setUserSpeechText] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  const timerRef = useRef<any>(null);
  const conversationLoopRef = useRef<any>(null);
  const connectTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isMountedRef = useRef(true);

  const clearConnectTimeouts = () => {
    connectTimeoutsRef.current.forEach(clearTimeout);
    connectTimeoutsRef.current = [];
  };

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        connectTimeoutsRef.current = connectTimeoutsRef.current.filter((id) => id !== timeout);
        resolve();
      }, ms);
      connectTimeoutsRef.current.push(timeout);
    });

  const connect = async () => {
    if (isConnecting || isConnected) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsConnecting(true);
    setRecordingTime(0);
    setAiSpeechText('Connecting secure voice link...');
    setUserSpeechText('');

    // Step through realistic secure handshakes
    await sleep(800);
    if (!isMountedRef.current) return;
    setAiSpeechText('Establishing biometric voice pathway...');
    await sleep(800);
    if (!isMountedRef.current) return;
    setAiSpeechText('Linking to Memento AI Brain...');
    await sleep(600);
    if (!isMountedRef.current) return;

    setIsConnecting(false);
    setIsConnected(true);
    setIsAiSpeaking(true);
    setAiSpeechText("Hello, I am here. Tell me, what is on your mind today?");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const disconnect = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setIsConnected(false);
    setIsConnecting(false);
    setRecordingTime(0);
    setIsAiSpeaking(false);
    setAiSpeechText('Call ended.');
    setUserSpeechText('');
    clearConnectTimeouts();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (conversationLoopRef.current) {
      clearTimeout(conversationLoopRef.current);
      conversationLoopRef.current = null;
    }
  };

  const toggleMute = () => {
    Haptics.selectionAsync();
    setIsMuted((m) => !m);
  };

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearConnectTimeouts();
      if (timerRef.current) clearInterval(timerRef.current);
      if (conversationLoopRef.current) clearTimeout(conversationLoopRef.current);
    };
  }, []);

  // Stopwatch timer when connected
  useEffect(() => {
    if (isConnected) {
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected]);

  // Simulate interactive conversational turns
  useEffect(() => {
    if (!isConnected || isMuted) {
      if (conversationLoopRef.current) clearTimeout(conversationLoopRef.current);
      return;
    }

    const runConversationLoop = () => {
      // User speaks after a short pause
      conversationLoopRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        setIsAiSpeaking(false);
        const randomUserText = MOCK_USER_TRANSCRIPTS[Math.floor(Math.random() * MOCK_USER_TRANSCRIPTS.length)];
        setUserSpeechText(randomUserText);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // AI responds to user
        conversationLoopRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;
          setIsAiSpeaking(true);
          const randomAiText = MOCK_AI_RESPONSES[Math.floor(Math.random() * MOCK_AI_RESPONSES.length)];
          setAiSpeechText(randomAiText);
          setUserSpeechText('');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          // Loop back
          runConversationLoop();
        }, 6000);
      }, 7000);
    };

    runConversationLoop();

    return () => {
      if (conversationLoopRef.current) clearTimeout(conversationLoopRef.current);
    };
  }, [isConnected, isMuted]);

  return {
    isConnected,
    isConnecting,
    isMuted,
    recordingTime,
    activeVoice,
    setActiveVoice,
    aiSpeechText,
    userSpeechText,
    isAiSpeaking,
    connect,
    disconnect,
    toggleMute,
  };
}
