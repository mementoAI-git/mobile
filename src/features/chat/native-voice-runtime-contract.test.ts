import { describe, expect, test } from 'bun:test';

const repoFile = (path: string) => new URL(`../../../${path}`, import.meta.url);

describe('native voice runtime contract', () => {
  test('uses a full-duplex-capable react-native-audio-api release', async () => {
    const packageJson = await Bun.file(repoFile('package.json')).json();
    const dependency = packageJson.dependencies?.['react-native-audio-api'];
    const major = Number(String(dependency).match(/\d+/)?.[0]);

    expect(dependency).toBeString();
    expect(major).toBeGreaterThanOrEqual(1);
  });

  test('configures native microphone access for conversational audio', async () => {
    const appJson = await Bun.file(repoFile('app.json')).json();
    const plugin = appJson.expo.plugins.find(
      (entry: unknown) => Array.isArray(entry) && entry[0] === 'react-native-audio-api',
    );

    expect(plugin).toEqual([
      'react-native-audio-api',
      {
        iosMicrophonePermission:
          'Allow Memento to access your microphone for voice conversations.',
        androidPermissions: [
          'android.permission.RECORD_AUDIO',
          'android.permission.MODIFY_AUDIO_SETTINGS',
        ],
      },
    ]);
  });

  test('disables RNAudioAPI file decoding that the live PCM pipeline does not use', async () => {
    const appJson = await Bun.file(repoFile('app.json')).json();
    const pluginSource = await Bun.file(
      repoFile('plugins/with-audio-api-ffmpeg-disabled.js'),
    ).text();

    expect(appJson.expo.plugins).toContain('./plugins/with-audio-api-ffmpeg-disabled');
    expect(pluginSource).toContain("ENV['DISABLE_AUDIOAPI_FFMPEG'] ||= '1'");
    expect(pluginSource).toContain('withPodfile');
  });

  test('exposes platform voice-processing recorder options', async () => {
    const recorderDeclaration = await Bun.file(
      repoFile(
        'node_modules/react-native-audio-api/lib/typescript/module/core/AudioRecorder.d.ts',
      ),
    ).text();
    const optionsDeclaration = await Bun.file(
      repoFile('node_modules/react-native-audio-api/lib/typescript/module/types.d.ts'),
    ).text();

    expect(recorderDeclaration).toContain('constructor(options?: AudioRecorderOptions)');
    expect(optionsDeclaration).toContain('iosVoiceProcessing?: boolean');
    expect(optionsDeclaration).toContain('androidInputPreset?: AndroidInputPreset');
    expect(optionsDeclaration).toContain("'voiceCommunication'");
  });

  test('accounts for native playback buffers in Hermes memory pressure', async () => {
    const installerSource = await Bun.file(
      repoFile(
        'node_modules/react-native-audio-api/common/cpp/audioapi/AudioAPIModuleInstaller.h',
      ),
    ).text();
    const createBufferFunction = installerSource.slice(
      installerSource.indexOf('static jsi::Function getCreateAudioBufferFunction'),
    );

    expect(createBufferFunction).toContain('setExternalMemoryPressure');
  });

  test('does not peak-normalize each iOS render quantum', async () => {
    const playerSource = await Bun.file(
      repoFile('node_modules/react-native-audio-api/ios/audioapi/ios/core/IOSAudioPlayer.mm'),
    ).text();

    expect(playerSource).not.toContain('audioBuffer_->normalize()');
  });
});
