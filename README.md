# Finger-Ups Football

A mobile-first football juggling and shooting game built with React Native + Expo, playable in the browser via GitHub Pages.

🎮 **Play now:** [jonboyle-dev.github.io/finger-upsFootball](https://jonboyle-dev.github.io/finger-upsFootball/)

---

## How to Play

### Juggling
- Tap near the ball to juggle it — keep it in the air!
- Your juggle count climbs with each successful tap
- Drop the ball and you can choose to **Carry On** (keep your score) or **Clear Score** (start fresh)

### Trapping & Shooting
- Once you hit the juggle target (starts at **5**), the **TRAP** button unlocks
- Tap **TRAP** to freeze the ball and enter aiming mode
- **Drag** anywhere on screen to set your aim direction and power
- Use the **CURVE ◀ ▶** buttons to bend the ball left or right
- Tap the screen to shoot — you have **10 seconds** to take your shot

### Scoring
- Score a goal and your juggle target goes up by 5 (5 → 10 → 15 → ...)
- Your **top score** is saved on your device across sessions
- Beat the goalkeeper and the defensive wall to score!

### Tips
- Shoot from **close range with high power** and the ball can fly over the bar
- Click **left of the curve centre** to bend right, **right** to bend left
- The **wall** blocks central shots — use curve to go around it
- The **goalkeeper** keeps moving even while you aim — time your shot!

---

## Features

- ⚽ Realistic ball physics with Magnus effect (curve/spin)
- 🧤 Animated SVG goalkeeper that paces the goal
- 🧱 Defensive 2-player wall with live trajectory preview
- 🏟️ Soccer pitch markings (centre circle, penalty box, spots)
- ⏱️ 10-second shot clock
- 📈 Progressive difficulty — juggle more to earn each shot
- 💾 Persistent top score (saved to device)

---

## Tech Stack

- [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) SDK 54
- [react-native-svg](https://github.com/software-mansion/react-native-svg) for the goalkeeper
- [react-native-web](https://necolas.github.io/react-native-web/) for browser support
- [@react-native-async-storage/async-storage](https://react-native-async-storage.github.io/async-storage/) for score persistence
- GitHub Actions + GitHub Pages for deployment

---

## Local Development

```bash
npm install
npm start        # Expo dev server
npm run web      # Open in browser
npm run android  # Android (requires emulator or device)
npm run ios      # iOS (requires Mac + Xcode)
```

---

## Developer

Built by [JonBoyle-Dev](https://github.com/JonBoyle-Dev) — [JTC Technologies Group](https://jtctech.co.za/)
