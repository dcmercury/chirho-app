import { Pressable, Text, View } from "react-native";
import { useTheme } from "../../../../theme/ThemeProvider";
import type { GroupMember } from "../../types";
import { GroupAvatar } from "../GroupAvatar";
import {
  GroupDrawerError,
  GroupDrawerSection,
  useGroupDrawerStyles,
} from "./GroupDrawerControls";

interface MembersSectionProps {
  members: GroupMember[];
  currentUserId?: string | null;
  canManageMembers: boolean;
  isPending: (memberId: string) => boolean;
  getError: (memberId: string) => string | undefined;
  onRemove: (member: GroupMember, name: string) => void;
}

export function MembersSection({
  members,
  currentUserId,
  canManageMembers,
  isPending,
  getError,
  onRemove,
}: MembersSectionProps) {
  const styles = useGroupDrawerStyles();
  const { colors } = useTheme();
  return (
    <GroupDrawerSection title="Members">
      {members.length === 0 ? (
        <Text style={styles.empty}>No members yet.</Text>
      ) : (
        members.map((member) => {
          const name = getMemberName(member);
          const phone = member.profile?.phoneNumber || member.phone;
          const pending = isPending(member.memberId);
          const canRemove =
            canManageMembers &&
            member.clerkuuid !== currentUserId &&
            member.role !== "admin";

          return (
            <View key={member.memberId}>
              <View style={styles.memberRow}>
                <GroupAvatar
                  borderColor={colors.glassBorder}
                  name={name}
                  size={34}
                  style={styles.memberAvatar}
                  uri={member.profile?.avatar}
                />
                <View style={styles.memberCopy}>
                  <Text numberOfLines={1} style={styles.memberName}>
                    {name}
                  </Text>
                  <Text style={styles.memberMeta}>
                    {member.status === "pending" && phone
                      ? `${phone} · pending`
                      : `${member.role} · ${member.status}`}
                  </Text>
                </View>
                {canRemove ? (
                  <Pressable
                    accessibilityLabel={`Remove ${name}`}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: pending }}
                    disabled={pending}
                    onPress={() => onRemove(member, name)}
                    style={[
                      styles.removeButton,
                      pending && styles.disabled,
                    ]}
                  >
                    <Text style={styles.removeText}>
                      {pending ? "Removing…" : "Remove"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <GroupDrawerError message={getError(member.memberId)} />
            </View>
          );
        })
      )}
    </GroupDrawerSection>
  );
}

function getMemberName(member: GroupMember) {
  return (
    [member.profile?.firstName || member.firstName, member.profile?.lastName]
      .filter(Boolean)
      .join(" ") || "Invited member"
  );
}
