/**
 * Dynamic Expo config — wraps app.json.
 *
 * expo-dev-client is scoped to development builds only. The native dev menu,
 * metro runtime bridge, and dev launcher add ~10-15MB to the IPA and must
 * not ship to the store. EAS sets EAS_BUILD_PROFILE during `eas build`, so
 * store profiles (preview / testflight / production) get the plugin stripped
 * while local dev (`npx expo run:ios`, no EAS_BUILD_PROFILE) keeps it.
 *
 * Live Activities (targets/CallActivity) and all other plugins are untouched.
 */
module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE;
  const isStoreBuild =
    profile === 'preview' || profile === 'testflight' || profile === 'production';

  if (!isStoreBuild) return config;

  const plugins = (config.plugins || []).filter((entry) => {
    const name = Array.isArray(entry) ? entry[0] : entry;
    return name !== 'expo-dev-client';
  });

  return { ...config, plugins };
};
