import { Pressable, Text, View } from "react-native";
import type { HomeGroup } from "../../../types/home";
import { InlineError, ManageAvatar, styles } from "./ProfileControls";

export function GroupsSection({
  groups,
  isPending,
  error,
  onLeave,
}: {
  groups: HomeGroup[];
  isPending: (groupuuid: string) => boolean;
  error?: string;
  onLeave: (groupuuid: string, name: string) => void;
}) {
  return (
    <>
      {groups.map((group) => {
        const pending = isPending(group.groupuuid);
        return (
          <View key={group.groupuuid} style={styles.manageRow}>
            <ManageAvatar label={group.name} source={group.image} />
            <View style={styles.manageCopy}>
              <Text style={styles.manageName}>{group.name}</Text>
              <Text style={styles.manageMeta}>
                {group.members} {group.members === 1 ? "member" : "members"}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={`Leave ${group.name}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: pending }}
              disabled={pending}
              onPress={() => onLeave(group.groupuuid, group.name)}
              style={pending && styles.disabled}
            >
              <Text style={styles.remove}>Leave</Text>
            </Pressable>
          </View>
        );
      })}
      <InlineError message={error} />
    </>
  );
}
