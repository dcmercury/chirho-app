# Expo WebView Wrapper for ChiRho

## Project Info

- **Expo Project:** @thepines/chirho
- **Project ID:** 8fb89930-41e6-4912-809b-eee74fdd71a9
- **Bundle ID:** ai.chirho.app
- **GitHub Repo:** https://github.com/dcmercury/chirho-app
- **Web App URL:** https://chirho.ai
- **Expo Dashboard:** https://expo.dev/accounts/thepines/projects/chirho

## Quick Commands

```bash
cd ~/chirho-app  # Standalone repo

# Development (Expo Go)
npx expo start                    # Start dev server, scan QR

# Build for Simulator
eas build --platform ios --profile simulator

# Build for Physical Device
eas build --platform ios --profile development

# Build for App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

---

## What This Is

A minimal Expo/React Native app that wraps your existing web app (`https://chirho.ai`) in a native WebView. This gives you a native iOS/Android app without rewriting anything - your entire Next.js app runs inside the WebView.

---

## Project Structure

```
dailyoffice/expo-wrapper/
├── App.tsx              # Main app - just a WebView loading your URL
├── app.json             # Expo config (app name, icons, bundle ID)
├── package.json         # Dependencies (expo, react-native-webview)
├── babel.config.js      # Babel config for Expo
├── tsconfig.json        # TypeScript config
├── assets/
│   ├── icon.png         # App icon (1024x1024 recommended)
│   ├── splash.png       # Splash screen image
│   └── adaptive-icon.png # Android adaptive icon
└── README.md
```

---

## How It Works

The entire `App.tsx` is ~60 lines:

```tsx
import { WebView } from "react-native-webview";

const WEB_APP_URL = "https://chirho.ai";

export default function App() {
  return <WebView source={{ uri: WEB_APP_URL }} />;
}
```

That's it. Your web app handles everything - auth, data, UI. The native app is just a container.

---

## Development Workflow

### 1. Prerequisites

- Node.js 18+
- Expo Go app on your phone (from App Store/Play Store)
- Expo account (free): https://expo.dev/signup

### 2. Running Locally

```bash
cd dailyoffice/expo-wrapper

# Install dependencies (first time only)
npm install

# Start Expo dev server
npx expo start
```

This shows a QR code in your terminal.

### 3. Testing on Your Phone (Expo Go)

**iOS:**

1. Open Camera app
2. Point at the QR code
3. Tap the notification to open in Expo Go

**Android:**

1. Open Expo Go app
2. Tap "Scan QR code"
3. Scan the QR code

Your app loads instantly. Changes to `App.tsx` hot-reload.

### 4. Testing in Simulator

```bash
# iOS Simulator (requires Xcode on Mac)
npx expo start --ios

# Android Emulator (requires Android Studio)
npx expo start --android
```

---

## Git Setup

### Add to Existing Repo

The `expo-wrapper/` folder is already inside `dailyoffice/`. Just commit it:

```bash
cd dailyoffice
git add expo-wrapper/
git commit -m "Add Expo wrapper for native app"
git push
```

### Or Create Separate Repo

If you want the wrapper separate:

```bash
cd dailyoffice/expo-wrapper
git init
git add .
git commit -m "Initial commit - ChiRho Expo wrapper"
git remote add origin https://github.com/yourusername/chirho-app.git
git push -u origin main
```

---

## Building for App Store

### 1. Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### 2. Configure EAS

```bash
cd dailyoffice/expo-wrapper
eas build:configure
```

This creates `eas.json` with build profiles.

### 3. Build Profiles

| Profile       | Use Case                       | Command                                          |
| ------------- | ------------------------------ | ------------------------------------------------ |
| `simulator`   | iOS Simulator testing          | `eas build --platform ios --profile simulator`   |
| `development` | Physical device with dev tools | `eas build --platform ios --profile development` |
| `preview`     | Internal testing, ad-hoc       | `eas build --platform ios --profile preview`     |
| `production`  | App Store submission           | `eas build --platform ios --profile production`  |

### 4. Build for iOS

```bash
# Simulator build (for testing in Xcode simulator)
eas build --platform ios --profile simulator

# Development build (for physical device testing)
eas build --platform ios --profile development

# Production build (for App Store)
eas build --platform ios --profile production
```

**Simulator build:** Downloads a `.tar.gz` → extract → drag `.app` onto simulator

### 4. Submit to App Store

```bash
# Submit to TestFlight
eas submit --platform ios

# Or use Expo Launch for hands-off submission
```

### 5. Build for Android

```bash
eas build --platform android --profile production
eas submit --platform android
```

---

## Configuration Reference

### app.json - Key Settings

```json
{
  "expo": {
    "name": "ChiRho", // Display name
    "slug": "chirho", // URL-safe name
    "version": "1.0.0", // App version
    "ios": {
      "bundleIdentifier": "ai.chirho.app", // Unique ID (reverse domain)
      "supportsTablet": true
    },
    "android": {
      "package": "ai.chirho.app"
    }
  }
}
```

### Changing the URL

Edit `App.tsx` line 14:

```tsx
const WEB_APP_URL = "https://chirho.ai";
```

### Custom Icons

Replace files in `assets/`:

- `icon.png` - 1024x1024, no transparency
- `splash.png` - 1284x2778 (or your splash design)
- `adaptive-icon.png` - 1024x1024 for Android

---

## Expo Launch (Hands-Off App Store Submission)

Expo Launch is a service that handles the entire App Store submission process for you.

**Website:** https://launch.expo.dev

### How It Works

1. **Connect GitHub** → Link your `expo-wrapper` repo to Expo Launch
2. **Configure** → Guided setup for app metadata (name, description, screenshots)
3. **Build** → Uses EAS to build your production app
4. **Submit** → They handle App Store Connect, certificates, review process
5. **Live** → Your app appears in the App Store

### What Expo Launch Handles

- ✅ App Store Connect setup
- ✅ Provisioning profiles & certificates
- ✅ Screenshots & metadata formatting
- ✅ Review process back-and-forth with Apple
- ✅ Updates & versioning

### What You Provide

- Apple Developer Account ($99/year) - you provide credentials
- Your Expo project on GitHub
- App icon (1024x1024)
- App screenshots
- App description & metadata

### When to Use

| Approach        | Best For                                  |
| --------------- | ----------------------------------------- |
| `eas submit`    | You're comfortable with App Store Connect |
| **Expo Launch** | Hands-off, let them handle everything     |

### Try the Demo

https://launch.expo.dev/expo/demo

---

## Push Notifications (Optional)

The WebView alone can't handle native push notifications. To add them, use Expo's notification service.

### Setup

1. **Install packages:**

```bash
cd ~/chirho-app
npx expo install expo-notifications expo-device expo-constants
```

2. **Update `App.tsx`** to handle notifications:

```tsx
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Get push token and send to your backend
async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Permission not granted for push notifications");
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  return token.data; // Send this to your backend
}
```

3. **Send token to your backend:**

```tsx
// In your App component
useEffect(() => {
  registerForPushNotifications().then((token) => {
    if (token) {
      // Option A: Pass token to WebView via URL
      setWebUrl(`https://chirho.ai?pushToken=${token}`);

      // Option B: Use postMessage to send to web app
      webViewRef.current?.postMessage(JSON.stringify({ pushToken: token }));
    }
  });
}, []);
```

### Backend Integration

Your chirho.ai backend needs to:

1. **Receive and store** the Expo push token per user
2. **Send notifications** via Expo's Push API:

```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExponentPushToken[xxxxxx]",
    "title": "Daily Office",
    "body": "Time for Evening Prayer"
  }'
```

### Expo Push API

- **Endpoint:** `https://exp.host/--/api/v2/push/send`
- **Docs:** https://docs.expo.dev/push-notifications/overview/
- **Free tier:** Unlimited pushes

### Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────┐     ┌────────┐
│ Your Backend│ ──► │ Expo Push   │ ──► │ Apple   │ ──► │ User's │
│ (chirho.ai) │     │ Service     │     │ APNs    │     │ iPhone │
└─────────────┘     └─────────────┘     └─────────┘     └────────┘
```

---

## Troubleshooting

### "Server with hostname could not be found"

- Check your URL is correct and accessible
- For local dev, use `http://localhost:3000` (works in simulator only)

### App rejected by Apple

- Ensure your app has real functionality (not just a website)
- Add native features if needed (push notifications, etc.)
- Make sure content complies with App Store guidelines

### WebView not loading

- Check internet connection
- Verify URL is HTTPS (required for production)
- Check for CORS issues on your backend

---

## What You Get

✅ Native iOS app (App Store ready)
✅ Native Android app (Play Store ready)  
✅ Works with Expo Go for instant testing
✅ Hot reload during development
✅ Push notifications (with additional setup)
✅ App icon on home screen
✅ Splash screen on launch
✅ Full-screen experience (no browser chrome)

---

## Current Status

- [x] Expo wrapper created
- [x] Project linked to Expo (@thepines/chirho)
- [x] EAS configured
- [x] Simulator build profile added
- [ ] Test in iOS Simulator
- [ ] Customize icons & splash screen
- [ ] Production build
- [ ] Submit to App Store via Expo Launch

## Next Steps

1. **Test simulator build** → Download .tar.gz, extract, drag to simulator
2. **Customize branding** → Replace icons in `assets/`
3. **Production build** → `eas build --platform ios --profile production`
4. **Submit to App Store** → Use Expo Launch or `eas submit`
