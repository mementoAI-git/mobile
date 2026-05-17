# Memento Agent Guidelines

This document serves as a source of truth for the design language, technical architecture, and implementation standards for the Memento mobile application.

## 🎨 Design Philosophy: "The Digital Legacy"

Memento is a premium, editorial-style application. It should feel like a high-end physical journal or a well-curated archive, not a generic SaaS app.

### 1. Typography & Hierarchy
- **Editorial Headers**: Always use `FONTS.serif` (`EBGaramond`) for primary screen titles and large headings.
- **UI & Content**: Use `FONTS.sans` (`Inter`) for body text, labels, and interactive elements.
- **Conciseness**: Keep navigation labels and headers punchy (e.g., "Security" instead of "Account & Security Settings").

### 2. Color System (The "No Generic Colors" Rule)
- **Backgrounds**: Use `COLORS.background` (`#fefbf8`) or `COLORS.onboardingCream`. Avoid pure white backgrounds for screens.
- **Brand**: `COLORS.brand` (`#FF5E00`) is the primary accent.
- **Semantic States**: 
  - **Success**: Deep Green (`#067A57`), never neon green.
  - **Error/Danger**: Deep Earthy Brown (`#4A3728`). **NEVER use standard red.**
  - **Warning**: Gold/Amber (`#8F6C1A`).
- **Patterns**: Most screens should feature the `welcome_bg.png` pattern overlay at very low opacity (`0.03` - `0.05`) to add texture.

### 3. Layout & Components
- **Pill Shapes**: Use `rounded-full` or `32px` corner radius for buttons, inputs, and primary cards.
- **Card Aesthetics**: Cards should have high internal padding (`p-6` or `p-7`) and use the `styles.cardShadow` (subtle elevation, not heavy borders).
- **Safe Areas**: Always wrap screens in `SafeAreaView` with appropriate `edges` (usually `['top']`).

### 4. Micro-Interactions
- **Haptics**: Every button press or selection must trigger `Haptics.selectionAsync()` or `Haptics.impactAsync()`.
- **Animations**: Use `react-native-reanimated`'s `FadeInDown` for entering elements to give a sense of flow.
- **Transitions**: Prefer `LayoutAnimation` or `Animated` components for state changes to avoid "jumpy" UI.

---

## 🛠 Technical Implementation

### 1. Style Tools
- **NativeWind**: Use Tailwind classes for layout and spacing.
- **Theme Tokens**: For colors, always prefer `COLORS.[token]` in the `style` prop or specific themed Tailwind classes (e.g., `text-brand`) over hardcoded hex values.

### 2. Component Patterns
- **Centralized UI**: Use components from `@/components/ui` (`Button`, `TextInput`, `Avatar`, `Badge`) rather than building ad-hoc primitives.
- **Sheet Pattern**: Use the `useUiStore`'s `openSheet` method for all modals and action sheets. Do not implement local modal states for shared actions.

### 3. State & Data Fetching
- **Queries**: All data fetching must live in `src/hooks/queries/`.
- **Global Sync**: Query hooks (like `useProfile`) should automatically update the global `useUserStore` upon success to ensure state hydration across the app.
- **Mutations**: Use `src/hooks/mutations/` for all write operations, ensuring optimistic updates or cache invalidation where appropriate.

### 4. Navigation
- **Expo Router**: Use file-based routing.
- **Deep Linking**: Ensure any navigation logic considers the current segments to avoid redundant redirects.

---

## 🚫 Anti-Patterns (What to Avoid)
- **Hardcoded Colors**: Never use `#ff0000`, `bg-red-500`, or other generic web colors.
- **Standard Modals**: Avoid React Native's default `Modal`. Use the `@gorhom/bottom-sheet` integrated into `SheetManager`.
- **Direct Store Mutation**: Always use store actions (e.g., `setUser`) rather than directly setting state values.
- **Placeholders**: Never use placeholder images. Use `generate_image` or the existing brand assets.
