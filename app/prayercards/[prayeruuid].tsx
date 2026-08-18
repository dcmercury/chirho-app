import { Redirect, useLocalSearchParams } from "expo-router";

export default function SharedPrayerRedirect() {
  const { prayeruuid } = useLocalSearchParams<{ prayeruuid: string }>();
  return (
    <Redirect
      href={{
        pathname: "/(app)/prayers/[prayeruuid]",
        params: { prayeruuid },
      }}
    />
  );
}
