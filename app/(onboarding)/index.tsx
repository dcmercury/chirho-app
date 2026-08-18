import { useLocalSearchParams } from "expo-router";
import { OnboardingScreen } from "../../src/components/onboarding/OnboardingScreen";

export default function OnboardingIndex() {
  const params = useLocalSearchParams<{ inviteToken?: string | string[] }>();
  const inviteToken = Array.isArray(params.inviteToken)
    ? params.inviteToken[0]
    : params.inviteToken;

  return <OnboardingScreen inviteToken={inviteToken} />;
}
