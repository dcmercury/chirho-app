import { useLocalSearchParams } from "expo-router";
import { GroupInviteScreen } from "../../../src/features/group-invite/GroupInviteScreen";

export default function GroupInviteRoute() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  return <GroupInviteScreen token={token || ""} />;
}
