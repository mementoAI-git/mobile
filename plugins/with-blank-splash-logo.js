const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

// expo-splash-screen's Android theme always references @drawable/splashscreen_logo,
// but only generates it when the plugin has an `image`. Memento's splash is a
// plain white screen, so provide an empty white drawable instead.
const BLANK_SPLASH_LOGO = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <solid android:color="#FFFFFF" />
  <size android:width="1dp" android:height="1dp" />
</shape>
`;

module.exports = function withBlankSplashLogo(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const drawableDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app/src/main/res/drawable',
      );
      fs.mkdirSync(drawableDir, { recursive: true });
      fs.writeFileSync(path.join(drawableDir, 'splashscreen_logo.xml'), BLANK_SPLASH_LOGO);
      return modConfig;
    },
  ]);
};
