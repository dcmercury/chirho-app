# ChiRho Native App

Expo/React Native client for [chirho.ai](https://www.chirho.ai).

## Project

- Expo project: `@thepines/chirho`
- EAS project ID: `8fb89930-41e6-4912-809b-eee74fdd71a9`
- iOS bundle ID: `com.thepines.chirho`
- Android package: `ai.chirho.app`
- Backend: `https://www.chirho.ai`
- Realtime: `https://dailyoffice-production.up.railway.app`

## Development

This app uses Expo Router, Clerk phone authentication, native home and prayer
group screens, Expo notifications, and native media modules. It requires a
development build rather than Expo Go.

```bash
npm install
npx expo start --dev-client
```

Environment variables are documented in `.env.example`.

## Verification

```bash
npx tsc --noEmit
npx expo-doctor
npx expo export --platform ios
```

## EAS builds

Generated `ios/` and `android/` directories are intentionally ignored. EAS
uses Continuous Native Generation and applies the plugins in `app.json`.

```bash
# Internal development client
npx eas-cli build --platform ios --profile development

# Internal preview build
npx eas-cli build --platform ios --profile preview

# App Store/TestFlight build
npx eas-cli build --platform ios --profile production

# Submit an existing production build
npx eas-cli submit --platform ios --profile production
```

Production EAS variables:

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_SOCKET_URL`

Never place private API keys in an `EXPO_PUBLIC_*` variable; those values are
embedded in the application bundle.

## Release order

1. Deploy the matching `dailyoffice` API and Railway socket server.
2. Verify Clerk, push registration, universal links, and group realtime.
3. Run local TypeScript, Expo, export, and backend build checks.
4. Commit and push both repositories.
5. Build the production IPA with EAS.
6. Submit the selected build to TestFlight.
