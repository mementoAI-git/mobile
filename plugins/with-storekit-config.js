const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const STOREKIT_SOURCE = 'storekit/Memento.storekit';
// Scheme file references are resolved from the .xcodeproj package, not from
// xcshareddata/xcschemes. The generated catalog sits beside Memento.xcodeproj.
const STOREKIT_SCHEME_REFERENCE = '../Memento.storekit';

function installStoreKitConfiguration(projectRoot, platformProjectRoot, projectName) {
  const source = path.join(projectRoot, STOREKIT_SOURCE);
  const destination = path.join(platformProjectRoot, 'Memento.storekit');
  const scheme = path.join(
    platformProjectRoot,
    `${projectName}.xcodeproj`,
    'xcshareddata',
    'xcschemes',
    `${projectName}.xcscheme`,
  );

  if (!fs.existsSync(source)) {
    throw new Error(`Missing local StoreKit catalog: ${source}`);
  }
  if (!fs.existsSync(scheme)) {
    throw new Error(`Missing shared iOS run scheme: ${scheme}`);
  }

  fs.copyFileSync(source, destination);

  let contents = fs.readFileSync(scheme, 'utf8');
  const reference = [
    '      <StoreKitConfigurationFileReference',
    `         identifier = "${STOREKIT_SCHEME_REFERENCE}">`,
    '      </StoreKitConfigurationFileReference>',
  ].join('\n');
  const existingReference = /[\t ]*<StoreKitConfigurationFileReference\b[\s\S]*?<\/StoreKitConfigurationFileReference>/;

  if (existingReference.test(contents)) {
    contents = contents.replace(existingReference, reference);
  } else {
    contents = contents.replace(
      /([\t ]*)<\/LaunchAction>/,
      `${reference}\n$1</LaunchAction>`,
    );
  }
  fs.writeFileSync(scheme, contents);
}

module.exports = function withStoreKitConfig(config) {
  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      installStoreKitConfiguration(
        modConfig.modRequest.projectRoot,
        modConfig.modRequest.platformProjectRoot,
        modConfig.modRequest.projectName,
      );
      return modConfig;
    },
  ]);
};

module.exports.installStoreKitConfiguration = installStoreKitConfiguration;
