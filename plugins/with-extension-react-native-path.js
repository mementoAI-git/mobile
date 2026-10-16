const { withPodfile } = require('expo/config-plugins');

// EAS build machines set USE_CCACHE=1, so React Native's post_install hook
// compiles and links every target with
// $(REACT_NATIVE_PATH)/scripts/xcode/ccache-clang.sh and defines
// REACT_NATIVE_PATH project-wide as ${PODS_ROOT}/../../node_modules/react-native.
// App extensions (expo-share-intent's ShareExtension, @bacons/apple-targets'
// CallActivity) are not CocoaPods targets, so PODS_ROOT is empty there and the
// compiler path becomes /../../node_modules/..., failing the archive.
//
// This adds a post_install step giving every target CocoaPods does not
// configure its own REACT_NATIVE_PATH. A target-level value wins over React
// Native's project-level one. Doing it in post_install sees every target,
// whichever config plugin created it.
const MARKER = '# with-extension-react-native-path';
const EXTENSION_REACT_NATIVE_PATH = '$(SRCROOT)/../node_modules/react-native';
const POST_INSTALL = 'post_install do |installer|';

const STEP = `
    ${MARKER}: app extensions aren't CocoaPods targets, so React Native's
    # \${PODS_ROOT}-based REACT_NATIVE_PATH (used by the ccache compiler) is empty there.
    pod_target_uuids = installer.aggregate_targets.flat_map(&:user_targets).map(&:uuid)
    installer.aggregate_targets.map(&:user_project).uniq(&:path).each do |project|
      project.native_targets.each do |target|
        next if pod_target_uuids.include?(target.uuid)
        target.build_configurations.each do |config|
          config.build_settings['REACT_NATIVE_PATH'] = '${EXTENSION_REACT_NATIVE_PATH}'
        end
      end
      project.save
    end
`;

function addExtensionReactNativePath(podfile) {
  if (podfile.includes(MARKER)) return podfile;
  const hook = podfile.indexOf(POST_INSTALL);
  if (hook === -1) {
    throw new Error(
      `with-extension-react-native-path: no "${POST_INSTALL}" in the Podfile; ` +
        'app extensions would fail to build on EAS with ccache.',
    );
  }
  const insertAt = hook + POST_INSTALL.length;
  return podfile.slice(0, insertAt) + STEP + podfile.slice(insertAt);
}

module.exports = function withExtensionReactNativePath(config) {
  return withPodfile(config, (modConfig) => {
    modConfig.modResults.contents = addExtensionReactNativePath(modConfig.modResults.contents);
    return modConfig;
  });
};

module.exports.EXTENSION_REACT_NATIVE_PATH = EXTENSION_REACT_NATIVE_PATH;
module.exports.addExtensionReactNativePath = addExtensionReactNativePath;
