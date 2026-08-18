import { Redirect, useLocalSearchParams } from "expo-router";

export default function SharedGroupRedirect() {
  const { groupuuid } = useLocalSearchParams<{ groupuuid: string }>();
  return (
    <Redirect
      href={{
        pathname: "/(app)/groups/[groupuuid]",
        params: { groupuuid },
      }}
    />
  );
}
