# Dragon's Count - Context for Coding Agents

## Project Overview
This project is a web and mobile application (using Capacitor) designed to keep score for the card game **Tichu**, rebranded as **Dragon's Count** (with subtitle *Tichu Log*).
It tracks games, rounds, and scores for two teams of two players.

## Tech Stack
- **Framework**: React 19, TypeScript, Vite
- **UI Library**: Material UI (MUI) v9 (`@mui/material`, `@mui/icons-material`)
- **Routing**: React Router DOM v7
- **Backend/BaaS**: Firebase v12 (Authentication, Firestore)
- **Localization**: `i18next` & `react-i18next`
- **Mobile**: Capacitor v8 (`@capacitor/android`, `@capacitor/ios`, `@capacitor/app`, `@capacitor/status-bar`, `@capacitor/splash-screen`)
- **Sign-In Plugins**: `@capawesome/capacitor-google-sign-in`, `@capawesome/capacitor-apple-sign-in`

## Architecture & Styling Conventions

### Token/Theme Split
The styling system is split into two layers:

1. **`src/styles/tokens.ts`** — Pure design constants only:
   - `fonts`: family (`Inter`), display (`Anton`), mono, weight scale, size scale, letter-spacing, line-height.
   - `shape`: borderRadius, buttonRadius, smallRadius.
   - **No colors or shadows.** All color and shadow definitions live in the theme.

2. **`src/styles/theme.ts`** — MUI themes (`lightTheme`, `darkTheme`) with:
   - Standard MUI palette (`primary`, `secondary`, `background`).
   - **Custom palette extensions** (declared via `declare module '@mui/material/styles'`):
     - `badgeBg` (`private`, `tag`, `tagText`)
     - `desktopBg`, `desktopBorder`, `desktopFrameShadow`
     - `dynamicHeaderShadow`, `dynamicBottomBarShadow`
     - `roundChipBg`, `roundChipText`
   - Shared component overrides: `MuiButton`, `MuiIconButton` (bordered), `MuiDialog` (responsive sizing via CSS custom property `--max-screen-width`).

3. **`src/styles/commonStyles.ts`** — Reusable `SxProps<Theme>` style objects consumed via spread in `sx` props.
   - **Strict Rule**: No page or component (`.tsx` file) may import `fonts` from `tokens.ts` directly. All typography, font weights, alignments, and sizes must be consumed through the generic style blocks exported from `commonStyles.ts` (e.g., `sx={{ ...scoreFont, mt: 1 }}`).
   - Key exports: `pageRoot`, `contentArea`, `centered`, `dynamicHeader(showShadow)`, `dynamicBottomBar(showShadow)`, `appFrame`, `desktopOuter`, score/typography font blocks, avatar grid styles.

### Typography Font Regime
Standardized scale keys in `tokens.ts`:
- `xs`: `'0.6rem'` — timestamps, tiny labels, badges
- `sm`: `'0.75rem'` — nav labels, history card timestamps, chips
- `md`: `'0.9rem'` — medium emojis, icons
- `normal`: `'1rem'` — standard body, main buttons
- `large`: `'1.2rem'` — list inputs, larger avatar emojis
- `xl`: `'1.4rem'` — large emoji/flag icon size
- `xxl`: `'1.6rem'` — profile small avatars
- `xxxl`: `'1.8rem'` — settings large avatars

**Display Font**: The `Anton` font is used for the app title/branding on the HomePage header (via `fonts.display`).

**Monospace Family**: `fonts.mono` is used exclusively for score display, scoreboard lists, and colons to ensure premium alignment.

### Theme Color Palette
- **Team 1 / Primary (Slate Blue)**: `#1B4F72` (dark: `#5dade2`)
- **Team 2 / Secondary (Red)**: `#EC1C24` (dark: `#ff6f61`)
- **Light mode background**: Near-white `#F9FAFB` (Default), Pure white `#FFFFFF` (Paper)
- **Dark mode background**: Charcoal Black `#121212` (Default), Dark Charcoal `#1A1A1A` (Paper)
- **Game card state colors**: Neutral grayscale (no colored backgrounds for active/completed states)

### Component Layout
- `Box`, `Typography`, `Card`, `List`, `ListItem` are heavily used.
- Page wrappers use `Box` with `boxSizing: 'border-box'`, `width: '100%'`, and `height: '100%'` to prevent overflow in the responsive mobile frame.
- Dialog sizing is controlled globally via `MuiDialog` component overrides, using `--max-screen-width` CSS custom property and `env(safe-area-inset-*)` for native safe areas.

### Aesthetics
The application aims for a highly premium, dynamic, and polished design. Avoid standard plain colors; use the theme palette, dark mode tokens, subtle box-shadows (from theme palette), and `border-radius` defined in tokens.

## Rebranding & Logo Integration
- **App Name**: *"Dragon's Count"* in all user-visible text. *"Tichu Log"* is retained as a subtitle in legal or minor screens if appropriate.
- **Logo Graphic**: Rendered as a high-resolution graphic in `AuthPage.tsx` using `logoImg`. Do not place redundant typography title labels underneath the logo component, as the logo graphic already integrates this calligraphy.
- **Visual Assets**:
  - **Favicon**: Circular dragon-eye crop at `public/favicon.png` and `public/favicon-32x32.png`.
  - **Main Logo**: Brand logo with calligraphy text at `src/assets/logo.png` and `public/logo.png`.
  - **App Icon**: Tight square crop at `src/assets/app-icon.png` and `public/app-icon.png` (halo-free, subtitle-text-free). Used for web favicons and native platforms (`AppIcon-512@2x.png` for iOS, and mipmaps for Android).
  - **Feature Graphic**: Play Store feature graphic at `public/play_store_feature_graphic.png` (1024x500 px).

## Account Deletion & Security
- **Data Policy**: Account deletion deletes the user document from the `users` table and the authenticated user from Firebase Auth, but leaves all active/completed games intact. This prevents disruptive deletion cascades for other game participants. The policy is explicitly displayed on the account deletion page.
- **Transaction Safety**: When deleting an account, if the Firebase Auth deletion fails, the Firestore user document is restored to prevent orphaned and unresolvable user records.
- **Contact Email**: The official support contact email address is `pibro.apps@gmail.com` and must be used on the static Privacy Policy (`privacy.html`) and Deletion Portal (`delete-account.html`) pages.

## Theme System
- **Three modes**: `light`, `dark`, and `system` (follows OS preference via `prefers-color-scheme` media query).
- **`ThemeContext.tsx`**: Manages `ThemeSetting` (user preference) and `ThemeMode` (resolved actual theme). Syncs with the user's Firestore profile (`profile.theme`). Persists to `localStorage`. Dynamically updates Capacitor `StatusBar` style and background color on native platforms.
- **AuthPage override**: The `AuthPage` always renders in dark theme, regardless of the user's theme setting (handled via `App.tsx` routing logic with a separate `MuiThemeProvider`).
- **Provider hierarchy** (in `main.tsx`): `AuthProvider` → `ThemeProvider` → `App` (theme depends on auth profile).

## Offline Sync & Optimistic Updates
- **`src/contexts/offlineSyncContext.tsx`**: Provides offline-first game and round mutations with optimistic UI updates.
  - Queues writes when offline, replays them on reconnect.
  - Exposes pending operation indicators so the UI can show sync status.
  - The `SettingsPage` includes an offline queue section showing pending operations.

## Component Architecture
Key extracted components (from earlier monolithic page files):
- **`GameCard.tsx`** — Renders a single game card on the HomePage. Shows teams, scores, status badges, tags, and the logged-in user indicator. Three-box footer layout with centered tags.
- **`RoundCard.tsx`** — Renders a single round within a game. Shows player scores, Tichu/Grand Tichu chips, 1-2 finish indicators, round number chip, and timestamp.
- **`RoundEditorDialog.tsx`** — Full-screen dialog for editing/creating a round. Player cards with score inputs, Tichu call toggles, and 1-2 finish selection.
- **`NewGameDialog.tsx`** — Dialog for creating a new game or editing players in an existing game. Supports upgrading guest players to registered accounts with focus/blur UX.
- **`PullToRefresh.tsx`** — Custom pull-to-refresh component for native-feel refresh on HomePage and GamePage.
- **`SearchDialog.tsx`** — Search/filter dialog for games.

## Utility Modules
- **`src/utils/playerPermutation.ts`** — `permutePlayerArray<T>(array, loggedInIndex)`: XOR-based permutation to always show the logged-in user at the top-left position (index 0) in game/round card layouts.
- **`src/utils/date.ts`** — `DateFormatter` class with locale-aware date/time formatting (`formatDateOnly`, `formatTimeOnly`, `formatDateTime`).

## Recent UX & Feature Implementations
Future agents should be aware of these requirements and changes to maintain consistency:

### Avatars
- Users pick from a prefilled list of **120+ animal emojis** (defined in `src/constants.ts` as `AVATAR_EMOJIS`).
- The default for new users is a randomly selected animal emoji (not a fixed default like the dragon).
- The custom emoji text input has been **removed**; only the grid picker remains.
- The avatar grid uses a responsive `auto-fill` CSS grid layout.

### Game Setup (NewGameDialog)
- Players are selected via an autocomplete dropdown.
- Selecting a player auto-focuses the next player's input field.
- Selected players are excluded from subsequent dropdown options.
- Validation ensures no user is chosen twice.
- "Guest name" placeholder reads "enter guest name or choose user".
- **Guest player editing**: Existing games support editing guest players and upgrading them to registered accounts with premium focus/blur UX.

### Game Page & Rounds
- **Reverse chronological layout**: Newest rounds appear at the top, with an absolute top shadow overlay for scroll indication.
- There is a three-dot menu next to "New Round" which allows deleting a game (with a confirmation dialog).
- Round cards show a styled round number chip (themed `roundChipBg`/`roundChipText` palette colors).
- Round headers show the date/time right-aligned.
- Unselected 1-2 chips match the background color of the player cards.
- **Logged-in user indicator**: The current user's avatar is shown at top-left of game cards, round cards, and round editor.
- **Pull-to-refresh**: Both HomePage and GamePage support pull-to-refresh for reloading data.

### Settings Page
- Implements full-width, border-box sized container layout to ensure `Card` components do not overflow off the right edge of the mobile screen.
- Settings cards feature premium borders and shadows (`variant="outlined"`, custom `boxShadow`).
- Includes **theme picker** (Light / Dark / System) synced with user profile.
- Shows **offline sync queue** status when pending operations exist.

### Navigation
- The bottom button bar uses `PlayArrow` for the active game tab.

## Mobile Platform Notes

### Android
- **Current version**: versionCode `8`, versionName `1.1.1`
- Portrait-only orientation enforced via `AndroidManifest.xml` (`screenOrientation="portrait"`).
- Hardware back button handling via `@capacitor/app` plugin.

### iOS
- Portrait-only orientation (landscape orientations removed from `Info.plist`).
- `UIRequiresFullScreen` set to `true` in `Info.plist` to fix iPad interface orientation warnings.
- Splash image consolidated: all scale slots point to a single `splash-2732x2732.png` to reduce bundle size.
- Swipe-to-go-back gesture support.
- **WebView compatibility**: Firebase auth uses conditional `popupRedirectResolver` to work correctly in Capacitor WebView. IndexedDB-based persistence is bypassed on native platforms in favor of in-memory persistence to avoid iOS simulator hangs.

### Cross-Platform
- Status bar dynamically styled based on resolved theme (light/dark) via `@capacitor/status-bar`.
- Capacitor plugins: `@capacitor/app`, `@capacitor/splash-screen`, `@capacitor/status-bar`, `@capawesome/capacitor-apple-sign-in`, `@capawesome/capacitor-google-sign-in`.

## Common Workflows
- **Running Locally**: `npm run dev`
- **Building Mobile**: `npm run mob` (which runs `vite build` and `npx cap sync`)
- **Deploying Live (Firebase)**: `npm run deploy` (deploys to hosting: `tichu-counter-2c9ff.web.app`)

## Test Account
- **Email**: `ben@test.de`
- **Password**: `testben`

## Tournament Feature
The tournament layer organizes teams and automates match scheduling for Group and KO (single-elimination) formats.

### Core Data Models
- **`Tournament`**: Represents the tournament container. Tracks `status` (`preparation`, `creation`, `execution`, `finished`), format (`group` | `ko`), admin UIDs, and structure settings (`groupCount`, `groups`, `bracket`).
- **`TournamentTeam`**: Subcollection of a tournament, representing a registered pair of players (either user accounts or guests) with a team name unique within the tournament.
- **`KOBracket` & `TournamentGroup`**: Represent the matchups and groups.

### Navigation and Routing
- A 4th tab "Tournaments" is added to the bottom navigation.
- **`/tournaments`** → list of all tournaments with status indicators.
- **`/tournament/:id`** → main tournament page dynamically rendering based on phase:
  - `preparation`: Admin/self-registration of teams and player selection.
  - `creation`: Admin-only setup (number of groups, seeding, bracket generation and preview).
  - `execution` / `finished`: Renders group lists or KO round brackets.
- **`/tournament/:id/group/:groupName`** and **`/tournament/:id/round/:roundIndex`** → detail pages containing games and ranking tables.

### Rules and Logic
- **Admin Write Access**: Tournament creators and admins have full write access to the tournament's games and rounds, even if they are not players in those games.
- **KO Game Advancement**: On Game completion, the client triggers `handleKOGameFinished` in `tournamentService.ts`, which automatically advances the winning team to the next round in the bracket and schedules the next match when both opponents are ready.
- **QR Code Sharing**: In `EditTournamentDialog.tsx`, a local client-side QR Code is generated using `qrcode.react` pointing to the tournament's production URL (`https://dragons-count.de/tournament/:id`).

Always maintain the premium feel, use defined tokens in `commonStyles.ts`, consume colors exclusively from the MUI theme palette (never hardcode mode-dependent colors inline), and respect the responsive mobile-first constraints (e.g., `--max-screen-width` CSS custom property on the app frame).
