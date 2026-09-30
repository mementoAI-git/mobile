const { withPodfile } = require('@expo/config-plugins');

const PODFILE_ANCHOR =
  "podfile_properties = JSON.parse(File.read(File.join(__dir__, 'Podfile.properties.json'))) rescue {}";
const FFMPEG_DISABLE_SETTING = [
  '# Memento uses RNAudioAPI for live PCM capture/playback only. Disable its optional',
  '# FFmpeg file/URL decoder backend so unused decoder objects and frameworks are not linked.',
  "ENV['DISABLE_AUDIOAPI_FFMPEG'] ||= '1'",
].join('\n');

function disableAudioApiFfmpeg(contents) {
  if (contents.includes("ENV['DISABLE_AUDIOAPI_FFMPEG']")) return contents;
  if (!contents.includes(PODFILE_ANCHOR)) {
    throw new Error('Unable to configure RNAudioAPI: Expo Podfile properties anchor was not found.');
  }
  return contents.replace(PODFILE_ANCHOR, `${PODFILE_ANCHOR}\n\n${FFMPEG_DISABLE_SETTING}`);
}

module.exports = function withAudioApiFfmpegDisabled(config) {
  return withPodfile(config, (modConfig) => {
    modConfig.modResults.contents = disableAudioApiFfmpeg(modConfig.modResults.contents);
    return modConfig;
  });
};

module.exports.disableAudioApiFfmpeg = disableAudioApiFfmpeg;