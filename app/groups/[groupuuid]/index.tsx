import { Redirect, useLocalSearchParams } from "expo-router";

export default function GroupDeepLink() {
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
