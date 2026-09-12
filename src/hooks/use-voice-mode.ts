import { useAudioStream, AudioModule } from 'expo-audio';
import type { AudioStreamBuffer } from 'expo-audio';
import { GoogleGenAI, Modality } from '@google/genai';
import type { LiveServerMessage, Session } from '@google/genai';
import { AudioContext } from 'react-native-audio-api';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { get, post } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { isPermissionGranted } from '@/lib/permission-recovery';
import { logger } from '@/lib/logger';
import {
  getVoiceConnectionFailure,
  type VoiceConnectionFailure,
} from '@/features/chat/voice-entitlement';

const INPUT_SAMPLE_RATE = 16_000;
const OUTPUT_SAMPLE_RATE = 24_000;

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function useVoiceMode({
  memoryId,
  voiceName,
}: { memoryId?: string | null; voiceName?: string } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [aiSpeechText, setAiSpeechText] = useState('Ready to connect secure voice link...');
  const [userSpeechText, setUserSpeechText] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [connectionFailure, setConnectionFailure] = useState<VoiceConnectionFailure | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextPlaybackTimeRef = useRef(0);
  const isMutedRef = useRef(false);
  const isMountedRef = useRef(true);
  const isDisconnectingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const transcriptRef = useRef({ user: '', ai: '' });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackSourcesRef = useRef<Array<{ stop: () => void }>>([]);

  const handleAudioBuffer = useCallback((buffer: AudioStreamBuffer) => {
    if (isMutedRef.current || !sessionRef.current) return;
    sessionRef.current.sendRealtimeInput({
      media: {
        data: bytesToBase64(new Uint8Array(buffer.data)),
        mimeType: `audio/pcm;rate=${buffer.sampleRate}`,
      },
    });
  }, []);

  const { stream } = useAudioStream({
    sampleRate: INPUT_SAMPLE_RATE,
    channels: 1,
    encoding: 'int16',
    onBuffer: handleAudioBuffer,
  });

  const flushTranscripts = useCallback(async () => {
    const messages = Object.entries(transcriptRef.current)
      .filter(([, text]) => text.trim())
      .map(([role, text]) => ({ role, text, is_voice: true }));
    transcriptRef.current = { user: '', ai: '' };
    if (!messages.length || !memoryId) return;

    try {
      await post(endpoint.addMessageToMemory, {
        memory_id: memoryId,
        session_id: sessionIdRef.current,
        messages,
      });
    } catch (error) {
      logger.error('Failed to save voice transcript', error);
    }
  }, [memoryId]);

  const playPcmChunk = useCallback(async (base64Pcm: string) => {
    const context = audioContextRef.current;
    if (!context) return;

    const bytes = base64ToBytes(base64Pcm);
    const samples = new Int16Array(
      bytes.buffer,
      bytes.byteOffset,
      Math.floor(bytes.byteLength / 2),
    );
    const floats = new Float32Array(samples.length);
    for (let index = 0; index < samples.length; index += 1) {
      floats[index] = samples[index] / 32768;
    }

    const audioBuffer = context.createBuffer(1, floats.length, OUTPUT_SAMPLE_RATE);
    audioBuffer.copyToChannel(floats, 0);
    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(context.destination);
    nextPlaybackTimeRef.current = Math.max(nextPlaybackTimeRef.current, context.currentTime);
    source.start(nextPlaybackTimeRef.current);
    nextPlaybackTimeRef.current += audioBuffer.duration;
    playbackSourcesRef.current.push(source);
  }, []);

  const handleLiveMessage = useCallback((message: LiveServerMessage) => {
    const serverContent = message.serverContent;
    const outputAudio = serverContent?.modelTurn?.parts
      ?.map((part) => part.inlineData?.data)
      .filter((data): data is string => Boolean(data));
    outputAudio?.forEach((chunk) => { void playPcmChunk(chunk); });

    const aiText = serverContent?.outputTranscription?.text;
    const userText = serverContent?.inputTranscription?.text;
    if (aiText) {
      transcriptRef.current.ai += aiText;
      setAiSpeechText(transcriptRef.current.ai);
      setIsAiSpeaking(true);
    }
    if (userText) {
      transcriptRef.current.user += userText;
      setUserSpeechText(transcriptRef.current.user);
      setIsAiSpeaking(false);
    }
    if (serverContent?.turnComplete) void flushTranscripts();
  }, [flushTranscripts, playPcmChunk]);

  const disconnect = useCallback(async () => {
    if (isDisconnectingRef.current) return;
    isDisconnectingRef.current = true;
    isMutedRef.current = true;
    try {
      stream.stop();
    } catch {
      // The native stream may already be released during unmount.
    }
    playbackSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Already finished.
      }
    });
    playbackSourcesRef.current = [];
    nextPlaybackTimeRef.current = 0;
    const session = sessionRef.current;
    sessionRef.current = null;
    session?.close();
    await flushTranscripts();
    if (isMountedRef.current) {
      setIsConnected(false);
      setIsConnecting(false);
      setIsAiSpeaking(false);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    isDisconnectingRef.current = false;
  }, [flushTranscripts, stream]);

  const connect = useCallback(async () => {
    if (isConnecting || isConnected || !audioContextRef.current) return;
    setIsConnecting(true);
    isMutedRef.current = false;
    setIsMuted(false);
    setRecordingTime(0);
    setAiSpeechText('Connecting secure voice link...');
    setUserSpeechText('');
    setConnectionFailure(null);
    transcriptRef.current = { user: '', ai: '' };
    sessionIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!isPermissionGranted(permission)) {
        setIsConnecting(false);
        return;
      }

      const tokenResponse = await get<{ token: string }>(endpoint.ephemeralToken);
      const token = tokenResponse.data?.token;
      if (!token) throw new Error('Voice session token was not returned');

      const client = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: 'v1alpha' },
      });
      sessionRef.current = await client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            if (isMountedRef.current) setIsConnected(true);
          },
          onmessage: handleLiveMessage,
          onerror: (error) => {
            logger.error('Live voice session failed', error);
            void disconnect();
          },
          onclose: () => {
            if (isMountedRef.current) void disconnect();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            languageCode: 'en-US',
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName ?? 'Fenrir',
              },
            },
          },
          inputAudioTranscription: { languageCodes: ['en-US'] },
          outputAudioTranscription: { languageCodes: ['en-US'] },
        },
      });

      await audioContextRef.current.resume();
      nextPlaybackTimeRef.current = audioContextRef.current.currentTime;
      await stream.start();
      timerRef.current = setInterval(() => setRecordingTime((time) => time + 1), 1000);
      if (isMountedRef.current) {
        setIsConnected(true);
        setIsConnecting(false);
      }
    } catch (error) {
      const failure = getVoiceConnectionFailure(error);
      if (failure.kind === 'connection-error') {
        logger.error('Failed to connect voice session', error);
      }
      if (isMountedRef.current) setConnectionFailure(failure);
      setIsConnecting(false);
      await disconnect();
    }
  }, [disconnect, handleLiveMessage, isConnected, isConnecting, stream, voiceName]);

  const toggleMute = useCallback(() => {
    Haptics.selectionAsync();
    isMutedRef.current = !isMutedRef.current;
    setIsMuted(isMutedRef.current);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    audioContextRef.current = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
    return () => {
      isMountedRef.current = false;
      void disconnect();
      audioContextRef.current?.close().catch(() => undefined);
    };
  }, [disconnect]);

  return useMemo(
    () => ({
      isConnected,
      isConnecting,
      isMuted,
      recordingTime,
      aiSpeechText,
      userSpeechText,
      isAiSpeaking,
      connectionFailure,
      connect,
      disconnect,
      toggleMute,
    }),
    [
      isConnected,
      isConnecting,
      isMuted,
      recordingTime,
      aiSpeechText,
      userSpeechText,
      isAiSpeaking,
      connectionFailure,
      connect,
      disconnect,
      toggleMute,
    ],
  );
}
