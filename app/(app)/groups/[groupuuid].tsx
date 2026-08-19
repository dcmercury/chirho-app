import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@clerk/expo";
import { useUser } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PrayerGroupSurface } from "../../../src/features/groups/PrayerGroupSurface";

export default function GroupScreen() {
  const { groupuuid, messageId, openRequest } = useLocalSearchParams<{
    groupuuid: string;
    messageId?: string;
    openRequest?: string;
  }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const tokenProvider = useCallback(() => getTokenRef.current(), []);

  if (!groupuuid) return null;

  return (
    <PrayerGroupSurface
      groupuuid={groupuuid}
      tokenProvider={tokenProvider}
      currentUser={{
        id: user?.id,
        firstName: user?.firstName,
      }}
      initialMessageId={messageId}
      initialRequestOpen={openRequest === "true"}
      onLeaveSuccess={() => router.replace("/(app)")}
      onOpenHome={() => router.replace("/(app)")}
    />
  );
}
