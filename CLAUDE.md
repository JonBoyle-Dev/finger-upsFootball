# Finger-Ups Football

Mobile-first football juggling and shooting game. React Native + Expo, playable in-browser via GitHub Pages (`react-native-web`).

## Structure
```
finger-upsFootball/
├── App.tsx
├── index.ts
├── app.json / eas.json         # Expo config + EAS build profiles
├── metro.config.js / babel.config.js / polyfills.js
├── src/
│   ├── components/
│   │   └── GameCanvas.tsx      # Main game surface — ball physics, goalkeeper, wall, shot clock
│   ├── hooks/
│   │   └── usePhysics.ts       # Ball trajectory + Magnus effect (curve/spin)
│   └── screens/
└── assets/                     # icon, splash, soccerball
```

## Stack
React Native + Expo SDK 54, TypeScript, `react-native-svg` (goalkeeper), `react-native-web` (browser build), `@react-native-async-storage/async-storage` (score persistence). Deployed via GitHub Actions → GitHub Pages.

## Core mechanics
- **Juggling** — tap near the ball to keep it airborne; juggle count must hit a rising target (starts at 5, +5 per goal) before TRAP unlocks.
- **Shooting** — TRAP freezes the ball, drag sets aim/power, CURVE buttons bend the shot, 10-second shot clock.
- **Persistence** — top score only, saved on-device via AsyncStorage.

## Local dev
```bash
npm install
npm start        # Expo dev server
npm run web       # Browser (matches GitHub Pages build)
npm run android
npm run ios
```

## Deployment
GitHub Pages build lives at `jonboyle-dev.github.io/finger-upsFootball`, built via GitHub Actions from `main`.
