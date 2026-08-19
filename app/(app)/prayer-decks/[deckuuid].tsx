import { useLocalSearchParams, useRouter } from "expo-router";
import { PrayerDeckScreen } from "../../../src/components/home/PrayerDeckScreen";

export default function PrayerDeckRoute() {
  const { deckuuid } = useLocalSearchParams<{ deckuuid: string }>();
  const router = useRouter();

  return (
    <PrayerDeckScreen
      deckuuid={deckuuid || ""}
      onClose={() => router.back()}
    />
  );
}
