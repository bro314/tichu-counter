# Tichu Counter - Context for Coding Agents

## Project Overview
This project is a web and mobile application (using Capacitor) designed to keep score for the card game **Tichu**.
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
- **Aesthetics**: The application aims for a highly premium, dynamic, and polished design. Avoid standard plain colors; use gradients, dark modes, subtle box-shadows, and `border-radius` defined in tokens.
- **Component Layout**:
  - `Box`, `Typography`, `Card`, `List`, `ListItem` are heavily used.
  - Page wrappers typically use `Box` with `boxSizing: 'border-box'`, `width: '100%'`, and `height: '100%'` to prevent overflow in the responsive mobile frame.

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

Always maintain the premium feel, use defined tokens in `commonStyles.ts`, and respect the responsive mobile-first constraints (e.g., `maxWidth: 480` on the app frame).
