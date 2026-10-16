const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  ...expoConfig,
  {
    rules: {
      'expo/no-dynamic-env-var': 'off',
      'react/no-unescaped-entities': 'off',
      'react-hooks/globals': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/use-memo': 'off',
    },
  },
  {
    // Taps must go through the voice-aware wrappers so Memento can press
    // them by voice ("tap Save"). Error level: --quiet hides warnings.
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    ignores: [
      'src/components/ui/Touchable.tsx',
      'src/components/ui/Button.tsx',
      'src/components/settings/SettingsHubRow.tsx',
      'app/voice-call.tsx',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['TouchableOpacity', 'Pressable'],
              message:
                "Import TouchableOpacity and Pressable from '@/components/ui/Touchable' so voice can press them.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
      },
    },
  },
  {
    ignores: [
      '.expo/**',
      'dist/**',
      '.worktrees/**',
      '.husky/**',
      'android/**',
      'ios/**',
      'node_modules/**',
    ],
  },
]);
