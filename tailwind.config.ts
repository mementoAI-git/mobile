import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Page / Surface ─────────────────────────────────────────
        // App page background: warm journal cream | card: white
        background: '#ffffff',
        card:       '#ffffff',

        // web: --fill-neutral-weak/weaker/strong (rgba(23,11,0,*))
        'fill-weak':    'rgba(23,11,0,0.04)',
        'fill-weaker':  'rgba(23,11,0,0.02)',
        'fill-strong':  'rgba(23,11,0,0.9)',

        // ── Brand (Orange) ─────────────────────────────────────────
        // web: --orange-1000: #FF5E00 (the true brand accent)
        brand: {
          DEFAULT: '#FF5E00',
          strong:  '#FF5E00',
          weak:    'rgba(255,94,0,0.8)',
          tint:    'rgba(255,94,0,0.2)',
          subtle:  'rgba(255,94,0,0.05)',
        },

        // ── Text ───────────────────────────────────────────────────
        // web: --brown-1000/700/500/100 (warm brown-tinted rgba, NOT grey)
        text: {
          strong:   'rgba(23,11,0,0.9)',    // --text-neutral-strong
          base:     'rgba(23,11,0,0.65)',   // --text-neutral-weak
          weak:     'rgba(23,11,0,0.45)',   // --text-neutral-weaker
          /** Mobile-only step (0.3) — web uses disabled (0.1) as the next step */
          muted:    'rgba(23,11,0,0.3)',
          disabled: 'rgba(23,11,0,0.1)',    // --text-neutral-disabled
          inverse:  '#FFFFFF',
          brand:    '#FF5E00',              // --text-brand-strong
          success:  '#067A57',              // --green-1000
          error:    '#C73A3A',              // brick red — aligned with web
          warning:  '#8F6C1A',             // --amber-1000
          info:     '#1A80F7',             // --blue-1000
        },

        // ── Stroke / Border ────────────────────────────────────────
        // web: --stroke-neutral-strong/weak/weaker
        stroke: {
          strong:  'rgba(23,11,0,0.45)',   // --stroke-neutral-strong
          weak:    'rgba(23,11,0,0.1)',    // --stroke-neutral-weak
          weaker:  'rgba(23,11,0,0.04)',   // --stroke-neutral-weaker
          brand:   '#FF5E00',              // --stroke-brand-strong
        },

        // ── Status ─────────────────────────────────────────────────
        success: { weak: 'rgba(10,204,146,0.05)',  strong: '#067A57' },
        error:   { weak: 'rgba(199,58,58,0.05)',   strong: '#C73A3A' },
        warning: { weak: 'rgba(255,192,46,0.05)',  strong: '#8F6C1A' },
        info:    { weak: 'rgba(26,128,247,0.06)',  strong: '#1A80F7' },
        stat: {
          pink:   '#D91DAA',
          purple: '#6621F0',
          yellow: '#FF8C00',
        },

        // ── Sand palette ───────────────────────────────────────────
        // web: --color-sand-1 through sand-12 (step 9 intentionally absent)
        sand: {
          '1':  '#fefbf8',
          '2':  '#fbf5eb',
          '3':  '#f5eee3',
          '4':  '#f5e7d1',
          '5':  '#ebd2a9',
          '6':  '#ddbf8f',
          '7':  '#cfab6f',
          '8':  '#b5955e',
          '10': '#846633',
          '11': '#5c4114',
          '12': '#412c09',
        },

        // ── Blue ramp ──────────────────────────────────────────────
        // web: --color-blue-1..7 (steps 5, 8, 9 absent — mirrors web exactly)
        blue: {
          '1': '#f1f6fd',
          '2': '#e9f1fc',
          '3': '#d8e7f9',
          '4': '#adcff4',
          '6': '#52a1dd',  // focus/active ring — web's --ring / --primary
          '7': '#4284b6',  // shadcn Button default bg on web
        },

        // ── Gray ramp ──────────────────────────────────────────────
        // web: --color-gray-50..950
        gray: {
          '50':  '#fafafa',
          '200': '#eaecf0',
          '300': '#d0d5dd',
          '400': '#667085', // intentionally same as 500 — mirrors web inconsistency
          '500': '#667085',
          '600': '#475467',
          '700': '#344054',
          '800': '#1d2939',
          '900': '#101828',
          '950': '#1e1e1e',
        },

        // ── Onboarding (Groot) palette ────────────────────────────
        // Full 13-token set matching web's --onboarding-* CSS vars
        onboarding: {
          cream:         '#FAF7F2',
          'warm-white':  '#FFFCF8',
          sand:          '#F0E9DF',
          'sand-dark':   '#E4D9CC',
          amber:         '#C8956C',
          'amber-light': '#E8B99A',
          'amber-pale':  '#F5E6DA',
          brown:         '#4A3728',  // --onboarding-brown-dark (darker)
          'brown-dark':  '#7A5C45',  // --onboarding-brown (lighter)
          'text-primary':   '#2C1F15',
          'text-secondary': '#7A6A5E',
          'text-muted':     '#B0A098',
          'green-soft':     '#8BAF8B',
        },
      },

      fontFamily: {
        // All loaded via expo-google-fonts in _layout.tsx
        sans:           ['Inter_400Regular', 'system-ui', 'sans-serif'],
        'sans-medium':  ['Inter_500Medium',  'system-ui', 'sans-serif'],
        'sans-semi':    ['Inter_600SemiBold','system-ui', 'sans-serif'],
        'sans-bold':    ['Inter_700Bold',    'system-ui', 'sans-serif'],
        serif:          ['EBGaramond_400Regular', 'serif'],
        'serif-medium': ['EBGaramond_500Medium',  'serif'],
        mono:           ['AzeretMono_400Regular',  'monospace'],
        averia:         ['AveriaSerifLibre_400Regular', 'serif'],
        'averia-bold':  ['AveriaSerifLibre_700Bold',    'serif'],
        /** Geist — geometric sans used by web for UI numerics/code contexts */
        geist:          ['Geist_400Regular', 'system-ui', 'sans-serif'],
        'geist-bold':   ['Geist_700Bold',    'system-ui', 'sans-serif'],
        /** Georgia — system serif used on web for category card subtitles (18px) */
        georgia:        ['Georgia', 'serif'],
      },

      borderRadius: {
        // web: rounded-4xl = 32px (pill for buttons/inputs/badges)
        '4xl':  '32px',
      },

      boxShadow: {
        // web: --shadow-sm / --shadow-btn / --shadow-drop-down
        sm:       '0px 1px 2px 0px rgba(16,24,40,0.05)',
        btn:      '0px 2px 4px -2px rgba(0,0,0,0.08), 0px 4px 8px -2px rgba(0,0,0,0.04)',
        dropdown: '2px 4px 12px 0px rgba(0,0,0,0.25)',
        card:     '0px 1px 3px 0px rgba(16,24,40,0.06)',
      },

      minHeight: {
        tap: '44px', // iOS HIG minimum tap target
      },
    },
  },
  plugins: [],
};

export default config;
