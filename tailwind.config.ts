import type { Config } from 'tailwindcss';
import { platformSelect } from 'nativewind/theme';

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
        background: 'var(--surface-background)',
        card:       'var(--surface-card)',
        'card-raised': 'var(--surface-raised)',
        'card-overlay': 'var(--surface-overlay)',
        'active-fill': 'var(--active-fill)',
        'active-text': 'var(--active-text)',
        'media-surface': '#12131A',
        'danger-fill': '#C73A3A',

        // web: --fill-neutral-weak/weaker/strong (rgba(23,11,0,*))
        'fill-weak':    'var(--fill-weak)',
        'fill-weaker':  'var(--fill-weaker)',
        'fill-chat-user': 'rgba(224,148,67,0.14)',
        'fill-strong':  'var(--fill-strong)',

        // ── Brand (Orange) ─────────────────────────────────────────
        // Canonical brand color: #E98246 (rgb 233, 130, 70)
        brand: {
          DEFAULT: '#E98246',
          strong:  '#E98246',
          weak:    'rgba(233,130,70,0.8)',
          tint:    'rgba(233,130,70,0.2)',
          subtle:  'rgba(233,130,70,0.05)',
        },

        // ── Text ───────────────────────────────────────────────────
        // web: --brown-1000/700/500/100 (warm brown-tinted rgba, NOT grey)
        text: {
          strong:   'var(--theme-text-strong)',    // --theme-text-neutral-strong
          base:     'var(--ink-body)',   // --theme-text-neutral-weak
          weak:     'var(--theme-text-weak)',   // --theme-text-neutral-weaker
          /** Mobile-only step (0.3) — web uses disabled (0.1) as the next step */
          muted:    'var(--theme-text-muted)',
          disabled: 'var(--theme-text-disabled)',    // --theme-text-neutral-disabled
          inverse:  '#FFFFFF',
          brand:    '#E98246',              // --theme-text-brand-strong
          success:  'var(--semantic-success)',              // --green-1000
          error:    'var(--semantic-error)',              // brick red — aligned with web
          warning:  'var(--semantic-warning)',             // --amber-1000
          info:     'var(--semantic-info)',             // --blue-1000
        },

        // ── Stroke / Border ────────────────────────────────────────
        // web: --stroke-neutral-strong/weak/weaker
        stroke: {
          strong:  'var(--stroke-strong)',   // --stroke-neutral-strong
          weak:    'var(--stroke-weak)',    // --stroke-neutral-weak
          weaker:  'var(--stroke-weaker)',   // --stroke-neutral-weaker
          brand:   '#E98246',              // --stroke-brand-strong
        },

        // ── Status ─────────────────────────────────────────────────
        success: { weak: 'var(--semantic-success-fill)',  strong: 'var(--semantic-success)' },
        error:   { weak: 'var(--semantic-error-fill)',   strong: 'var(--semantic-error)' },
        warning: { weak: 'var(--semantic-warning-fill)',  strong: 'var(--semantic-warning)' },
        info:    { weak: 'var(--semantic-info-fill)',  strong: 'var(--semantic-info)' },
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
        // SF Pro Rounded is provided by iOS; Android keeps bundled Inter.
        sans: platformSelect({
          ios: ['ui-rounded'],
          android: ['Inter_400Regular'],
          default: ['ui-rounded', 'Inter_400Regular', 'system-ui', 'sans-serif'],
        }),
        'sans-medium':  ['Inter_500Medium',  'system-ui', 'sans-serif'],
        'sans-semi':    ['Inter_600SemiBold','system-ui', 'sans-serif'],
        'sans-bold':    ['Inter_700Bold',    'system-ui', 'sans-serif'],
        serif:          ['EBGaramond_400Regular', 'serif'],
        'serif-medium': ['EBGaramond_500Medium',  'serif'],
        mono:           ['AzeretMono_400Regular',  'monospace'],
        /** Geist — geometric sans used by web for UI numerics/code contexts */
        geist:          ['Geist_400Regular', 'system-ui', 'sans-serif'],
        'geist-medium': ['Geist_500Medium',  'system-ui', 'sans-serif'],
        'geist-semi':   ['Geist_600SemiBold','system-ui', 'sans-serif'],
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
