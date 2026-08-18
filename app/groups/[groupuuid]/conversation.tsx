import { Redirect, useLocalSearchParams } from "expo-router";

export default function GroupConversationDeepLink() {
  const { groupuuid, messageId } = useLocalSearchParams<{
    groupuuid: string;
    messageId?: string;
  }>();

  return (
    <Redirect
      href={{
        pathname: "/(app)/groups/[groupuuid]",
        params: { groupuuid, ...(messageId ? { messageId } : {}) },
      }}
    />
  );
}
