import { Stack, Redirect } from "expo-router";
import { useAuth } from "@clerk/expo";

export default function AppLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
