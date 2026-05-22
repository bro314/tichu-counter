# Dragon's Count (Tichu Log)

A premium, cross-platform mobile and web application for tracking scores in the card game **Tichu**.

## Features
- **Score Tracking**: Effortlessly calculate rounds, Tichu/Grand Tichu calls, and 1-2 victories.
- **Player Profiles**: Customize display names and choose from 72 animal avatars (or use custom emojis).
- **Match History**: Keep a persistent history of all your active and finished games.
- **Cloud Sync**: Powered by Firebase Firestore, ensuring your games are always backed up and synchronized.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite
- **UI**: Material UI (MUI) v9
- **Backend**: Firebase (Auth & Firestore)
- **Mobile**: Capacitor (iOS & Android)
- **Localization**: i18next

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
npm install
```

### Running Locally
```bash
npm run dev
```

### Building for Mobile
We use Capacitor to wrap the web app for iOS and Android.
```bash
# Build the web bundle and sync to native platforms
npm run mob
```

For platform-specific syncing:
```bash
npm run ios
npm run android
```

## Contributing / Context for Coding Agents
If you are an AI coding assistant working on this repository, please review `AGENT.md` in the root directory for essential architectural context, stylistic guidelines, and a history of recent feature implementations.
