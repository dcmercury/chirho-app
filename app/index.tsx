import { Redirect } from "expo-router";
import { useAuth } from "@clerk/expo";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return <Redirect href="/(app)" />;
  }

  return <Redirect href="/(onboarding)" />;
}
