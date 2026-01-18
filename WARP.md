# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

### Setup & dev server
- Install dependencies:
  - `npm install`
- Start the Expo dev server (all platforms menu):
  - `npm start`
  - Equivalent to `npx expo start`.

### Platform-specific entry
- Android dev client / emulator:
  - `npm run android`
- iOS simulator / dev client:
  - `npm run ios`
- Web (React Native Web):
  - `npm run web`

### Linting
- Run ESLint via Expo:
  - `npm run lint`
- ESLint is configured in `eslint.config.js` using `eslint-config-expo` with `dist/*` ignored.

### Starter reset script
- Reset the project to a blank Expo Router app and optionally keep the current code under `app-example/`:
  - `npm run reset-project`
- This runs `scripts/reset-project.js`, which:
  - Moves or deletes the current `app/`, `components/`, `hooks/`, `constants/`, and `scripts/` directories.
  - Recreates a minimal `app/index.tsx` and `app/_layout.tsx`.

### Tests & builds
- There is **no test runner configured** (no `test` script in `package.json`). Add a tool such as Jest or Vitest before expecting `npm test` or single-test commands to work.
- There are **no custom build scripts** in `package.json`. Use standard Expo build tooling (e.g. `npx expo run:ios`, `npx expo run:android`, or EAS CLI) as needed; nothing in this repo constrains those workflows.

## Architecture overview

### High-level structure
- This is an Expo Router React Native app created by `create-expo-app` with the tabs starter.
- Key directories:
  - `app/`: file-based routing entry point for Expo Router.
  - `components/`: shared UI and behavior components.
  - `hooks/`: theming/color-scheme helpers.
  - `constants/`: theme constants (colors, fonts).
  - `scripts/`: maintenance scripts such as `reset-project.js`.
- TypeScript is configured in `tsconfig.json` extending `expo/tsconfig.base` with `strict: true` and a root alias `@/*` pointing at the repo root.

### Routing & navigation (Expo Router)
- Root layout: `app/_layout.tsx`
  - Wraps the app in `@react-navigation/native` `ThemeProvider`, selecting `DarkTheme` vs `DefaultTheme` based on `useColorScheme()` from `hooks/use-color-scheme`.
  - Declares an Expo Router `Stack` with:
    - A `(tabs)` group screen (tabs navigator) with `headerShown: false`.
    - A `modal` screen presented modally.
  - Exports `unstable_settings = { anchor: '(tabs)' }` so the tabs group is the primary entry.
- Tabs layout: `app/(tabs)/_layout.tsx`
  - Defines an Expo Router `Tabs` navigator.
  - Uses `HapticTab` as `tabBarButton` for per-press haptics.
  - Uses `IconSymbol` for tab icons, with colors derived from `Colors` based on the current color scheme.
  - Screens:
    - `app/(tabs)/index.tsx` — home screen with a parallax header and onboarding-style content.
    - `app/(tabs)/explore.tsx` — exploration screen that documents template features.
- Modal screen: `app/modal.tsx`
  - Simple modal using `ThemedView` / `ThemedText` and `Link` to navigate back to the root (`/`).

**Route files and directory names are part of the routing contract.** When adding or renaming screens, use Expo Router conventions (e.g. folders, `(group)` syntax) rather than manual navigation configuration.

### Styling, theming, and color schemes
- Theme constants live in `constants/theme.ts`:
  - `Colors.light` and `Colors.dark` define shared semantic colors (text, background, tints, tab icons).
  - `Fonts` is a `Platform.select` mapping that picks appropriate font stacks for iOS, web, and default/native platforms.
- Theming hooks and components:
  - `hooks/use-color-scheme.ts` re-exports React Native's `useColorScheme()`.
  - `hooks/use-theme-color.ts`:
    - Accepts optional `light`/`dark` overrides and a semantic color key.
    - Chooses the color from `Colors[theme][colorName]` when overrides are not provided.
  - `components/themed-view.tsx` (`ThemedView`): wraps React Native `View` and applies a themed `backgroundColor` via `useThemeColor`.
  - `components/themed-text.tsx` (`ThemedText`): wraps `Text` and applies themed color plus variant styles (`default`, `title`, `defaultSemiBold`, `subtitle`, `link`).

When introducing new UI, prefer using `ThemedView`, `ThemedText`, and `use-theme-color` to stay consistent with the app’s light/dark behavior.

### Reusable UI & behavior components
- `components/parallax-scroll-view.tsx` (`ParallaxScrollView`):
  - Wraps an `Animated.ScrollView` from `react-native-reanimated`.
  - Provides a parallax header (`headerImage` + `headerBackgroundColor`) and a padded content area using `ThemedView`.
  - Uses `useScrollOffset`, `interpolate`, and `useAnimatedStyle` to translate/scale the header on scroll.
- `components/ui/collapsible.tsx` (`Collapsible`):
  - A disclosure widget composed from `ThemedView`, `ThemedText`, `IconSymbol`, and `TouchableOpacity`.
  - Tracks open/closed state locally and rotates the chevron icon accordingly.
- `components/ui/icon-symbol.ios.tsx` and `components/ui/icon-symbol.tsx` (`IconSymbol`):
  - Platform-specific implementation:
    - iOS: uses `expo-symbols` `SymbolView` for native SF Symbols.
    - Android/web: maps a subset of SF Symbol-like names to Material Icons via `@expo/vector-icons/MaterialIcons`.
  - Callers use SF Symbol-style `name` props; mapping is handled internally.
- `components/haptic-tab.tsx` (`HapticTab`):
  - Wraps `@react-navigation/elements` `PlatformPressable` to add light haptic feedback on iOS tab presses via `expo-haptics`.
  - Used as `tabBarButton` in the tabs layout.
- `components/external-link.tsx` (`ExternalLink`):
  - Wraps Expo Router `Link` and uses `expo-web-browser` to open links in an in-app browser on native platforms while preserving normal behavior on web.
- `components/hello-wave.tsx` (`HelloWave`):
  - Simple animated `Text` using `react-native-reanimated` with a keyframe-like waving animation.

These components are the primary building blocks for interactive and themed UI in this template; prefer extending them over re-implementing similar patterns.

### Expo configuration
- `app.json` defines the Expo app configuration:
  - App identity: `name`, `slug`, `scheme` (`pulesexpo`), and `version`.
  - Platform settings for iOS, Android (adaptive icons, edge-to-edge), and web (static export, favicon).
  - Plugins:
    - `expo-router` — enables file-based routing.
    - `expo-splash-screen` — configured with light/dark backgrounds and a shared splash image.
  - `experiments`:
    - `typedRoutes: true` — enables typed routes in Expo Router; changing route file structure impacts inferred route types.
    - `reactCompiler: true` — enables the React Compiler (for React 19); be cautious with non-standard patterns that might confuse the compiler.

## TypeScript & module resolution
- `tsconfig.json`:
  - Extends `expo/tsconfig.base` and enables `strict` TypeScript checks.
  - Configures a path alias:
    - `@/*` → `./*` (repo root).
- Imports in the existing codebase assume this alias (e.g. `import { Colors } from '@/constants/theme';`).

When adding new files, you can import from anywhere in the repo using the `@/` alias instead of long relative paths.
