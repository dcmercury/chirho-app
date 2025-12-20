# ChiRho - Expo Wrapper

This is a minimal Expo app that wraps the ChiRho web app in a native WebView.

## How it works

- The web app is deployed at `https://chirho.app` (or your Vercel URL)
- This Expo app loads that URL in a WebView
- Users get a native app experience
- All the actual functionality lives in the Next.js web app

## Setup

1. Install dependencies:
   ```bash
   cd expo-wrapper
   npm install
   ```

2. Add assets (copy from public/icons):
   - `assets/icon.png` (1024x1024)
   - `assets/splash.png` (1284x2778)
   - `assets/adaptive-icon.png` (1024x1024)

3. Update the URL in `App.tsx`:
   ```tsx
   const WEB_APP_URL = 'https://your-actual-url.vercel.app';
   ```

## Development

```bash
npm start
```

Then press `i` for iOS simulator or scan QR code with Expo Go.

## Build for App Store (using Expo Launch)

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login to Expo:
   ```bash
   eas login
   ```

3. Build for iOS:
   ```bash
   eas build --platform ios
   ```

4. Submit to App Store:
   ```bash
   eas submit --platform ios
   ```

Or use **Expo Launch** for hands-off submission!

