<p align="center">
  <img src="assets/images/icon.png" alt="Pules Logo" width="120" height="120" />
</p>

<h1 align="center">Pules</h1>

<p align="center">
  <strong>A beautiful, distraction-free focus timer for deep work sessions.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#installation">Installation</a> •
  <a href="#development">Development</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#license">License</a>
</p>

---

## ✨ Features

### 🎯 **Focus Timer**
- Beautiful circular timer with gradient progress indicator
- Pulsing glow animation while timing
- Start, pause, resume, and stop controls
- Session topic labeling for better organization
- Background timing support

### 📁 **Folders & Topics**
- Organize your focus sessions into customizable folders
- Color-coded folders and topics for quick identification
- Move topics between folders
- Create, rename, and delete topics easily

### 📊 **Insights & Analytics**
- **Daily Reports** — View your focus time breakdown by day
- **Heatmap Visualization** — Track your consistency over weeks/months
- **Topic Analytics** — Analyze time spent on individual topics
- **Folder Analytics** — See aggregated stats for entire folders
- Current streak tracking to maintain momentum

### 🌙 **Dark & Light Mode**
- Automatic theme detection based on system preferences
- Seamlessly switch between dark and light themes
- Carefully crafted color palettes for both modes

### 💾 **Local Storage**
- All data stored locally using SQLite
- No account required — your data stays on your device
- Fast, offline-first experience

---

## 📱 Screenshots

> *Coming soon*

---

## 🚀 Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- iOS Simulator (macOS) or Android Emulator

### Get Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pules-expo.git
   cd pules-expo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npx expo start
   ```

4. **Run on your device or emulator**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan the QR code with [Expo Go](https://expo.dev/go) on your physical device

---

## 🛠 Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the Expo development server |
| `npm run android` | Run the app on Android |
| `npm run ios` | Run the app on iOS |
| `npm run web` | Run the app in a web browser |
| `npm run lint` | Run ESLint to check code quality |
| `npm run reset-project` | Reset the project to a blank state |

### Building for Production

This project uses [EAS Build](https://docs.expo.dev/build/introduction/) for creating production builds.

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to your Expo account
eas login

# Create a development build
eas build --profile development --platform android

# Create a production build
eas build --profile production --platform android
```

---

## 🧰 Tech Stack

| Technology | Purpose |
|------------|---------|
| [Expo](https://expo.dev) | React Native framework & build tools |
| [React Native](https://reactnative.dev) | Cross-platform mobile development |
| [TypeScript](https://www.typescriptlang.org) | Type-safe JavaScript |
| [Expo Router](https://docs.expo.dev/router/introduction/) | File-based routing |
| [Zustand](https://zustand-demo.pmnd.rs) | Lightweight state management |
| [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) | Local database storage |
| [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) | Smooth animations |
| [React Native Gifted Charts](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts) | Beautiful charts & visualizations |
| [Lucide Icons](https://lucide.dev) | Modern icon library |
| [Google Fonts (Poppins)](https://fonts.google.com/specimen/Poppins) | Typography |

---

## 📂 Project Structure

```
pules-expo/
├── app/                    # App screens (file-based routing)
│   ├── (tabs)/             # Tab navigation screens
│   │   ├── index.tsx       # Timer screen
│   │   ├── folders.tsx     # Folders & topics screen
│   │   └── reports.tsx     # Reports & analytics screen
│   └── analytics/          # Analytics detail screens
├── components/             # Reusable UI components
│   ├── ui/                 # Base UI primitives
│   ├── folders/            # Folder-related components
│   ├── CircularTimer.tsx   # Main timer component
│   ├── SessionList.tsx     # Session history list
│   ├── Heatmap.tsx         # Activity heatmap
│   └── ...
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities & database
│   └── database.ts         # SQLite database operations
├── store/                  # Global state management
│   └── sessions.ts         # Timer & session state
├── constants/              # App constants & theme
└── assets/                 # Images, fonts, icons
```

---

## 🎨 Color Palette

### Light Mode
| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#0ea5e9` | Main accent color |
| Background | `#ffffff` | Page background |
| Foreground | `#0f172a` | Text & icons |

### Dark Mode
| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#38bdf8` | Main accent color |
| Background | `#0f172a` | Page background |
| Foreground | `#f8fafc` | Text & icons |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ and ☕ for focused productivity
</p>
