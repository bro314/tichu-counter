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
- **Mobile**: Capacitor v8 (`@capacitor/android`, `@capacitor/ios`)

## Architecture & Styling Conventions
- **Styling**: We use MUI's `sx` prop with centralized style objects defined in `src/styles/commonStyles.ts` and `src/styles/tokens.ts`.
- **Typography Font Regime**:
  - Standardized scale keys in `tokens.ts`:
    - `xs`: `'0.6rem'` (timestamps, tiny labels, badges)
    - `sm`: `'0.75rem'` (nav labels, history card timestamps, chips)
    - `md`: `'0.9rem'` (medium emojis, icons)
    - `normal`: `'1rem'` (standard body, main buttons)
    - `large`: `'1.2rem'` (list inputs, larger avatar emojis)
    - `xl`: `'1.4rem'` (large emoji/flag icon size)
    - `xxl`: `'1.6rem'` (profile small avatars)
    - `xxxl`: `'1.8rem'` (settings large avatars)
  - **Strict Rule**: No page or component (`.tsx` file) may reference or import `fonts` from `tokens.ts` directly. All typography, font weights, alignments, and sizes must be consumed through generic typography blocks exported from `src/styles/commonStyles.ts` via the spread operator in the `sx` prop (e.g., `sx={{ ...sx.semiboldFont, mt: 1 }}`).
- **Theme Color Palette**:
  - **Team 1 (Slate Blue)**: `#1B4F72` (dm: `#5dade2`)
  - **Team 2 (Red)**: Crimson `#EC1C24` (dm: `#ff6f61`)
  - **Light mode background**: Warm Cream `#F9F6F0` (Default), Soft Cream `#FFF8E1` (Cards/Sheets)
  - **Dark mode background**: Charcoal Black `#121212` (Default), Dark Charcoal `#1A1A1A` (Cards/Sheets)
- **Aesthetics**: The application aims for a highly premium, dynamic, and polished design. Avoid standard plain colors; use gradients, dark modes, subtle box-shadows, and `border-radius` defined in tokens.
- **Component Layout**:
  - `Box`, `Typography`, `Card`, `List`, `ListItem` are heavily used.
  - Page wrappers typically use `Box` with `boxSizing: 'border-box'`, `width: '100%'`, and `height: '100%'` to prevent overflow in the responsive mobile frame.

## Rebranding & Logo Integration
- **App Name**: *"Dragon's Count"* in all user-visible text. *"Tichu Log"* is retained as a subtitle in legal or minor screens if appropriate.
- **Logo Graphic**: Rendered as a high-resolution graphic in `AuthPage.tsx` using `logoImg`. Do not place redundant typography title labels (*"Dragon's Count"* or *"Tichu Log"*) underneath the logo component, as the logo graphic already integrates this calligraphy.
- **Visual Assets**:
  - **Favicon**: Circular dragon-eye crop at `public/favicon.png` and `public/favicon-32x32.png`.
  - **Main Logo**: Brand logo with calligraphy text at `src/assets/logo.png` and `public/logo.png`.
  - **App Icon**: Tight square crop at `src/assets/app-icon.png` and `public/app-icon.png` (halo-free, subtitle-text-free). Used for web favicons and native platforms (`AppIcon-512@2x.png` for iOS, and mipmaps for Android).
  - **Feature Graphic**: Play Store feature graphic at `public/play_store_feature_graphic.png` (1024x500 px).

## Account Deletion & Security
- **Data Policy**: Account deletion deletes the user document from the `users` table and the authenticated user from Firebase Auth, but leaves all active/completed games intact. This prevents disruptive deletion cascades for other game participants. The policy is explicitly displayed on the account deletion page.
- **Transaction Safety**: When deleting an account, if the Firebase Auth deletion fails, the Firestore user document is restored to prevent orphaned and unresolvable user records.
- **Contact Email**: The official support contact email address is `pibro.apps@gmail.com` and must be used on the static Privacy Policy (`privacy.html`) and Deletion Portal (`delete-account.html`) pages.

## Recent UX & Feature Implementations
Future agents should be aware of these recent requirements and changes to maintain consistency:
- **Avatars**: Users pick from a prefilled list of **72 animal emojis**. 
  - The default for new users is a randomly selected animal emoji (not a fixed default like the dragon).
  - The "Custom Emoji" text field is placed at the *top* of the avatar picker.
  - The custom emoji input *replaces* the character when typed (behaves like a single character slot), instead of appending.
- **Game Setup (New Game Dialog)**:
  - Players are selected via an autocomplete dropdown.
  - Selecting a player auto-focuses the next player's input field.
  - Selected players are excluded from subsequent dropdown options.
  - Validation ensures no user is chosen twice.
  - "Guest name" placeholder reads "enter guest name or choose user".
- **Game Page & Rounds**:
  - There is a three-dot menu next to "New Round" which allows deleting a game (with a confirmation dialog).
  - Round headers show the date/time right-aligned.
  - Unselected 1-2 chips match the background color of the player cards.
- **Settings Page**:
  - Implements full-width, border-box sized container layout to ensure `Card` components do not overflow off the right edge of the mobile screen.
  - Settings cards feature premium borders and shadows (`variant="outlined"`, custom `boxShadow`).
- **Navigation**: The bottom button bar uses `PlayArrow` for the active game tab.

## Common Workflows
- **Running Locally**: `npm run dev`
- **Building Mobile**: `npm run mob` (which runs `vite build` and `npx cap sync`)
- **Deploying Live (Firebase)**: `npm run deploy` (deploys to hosting: `tichu-counter-2c9ff.web.app`)

Always maintain the premium feel, use defined tokens in `commonStyles.ts`, and respect the responsive mobile-first constraints (e.g., `maxWidth: 480` on the app frame).

