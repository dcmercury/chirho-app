import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { useTheme } from "../../../theme/ThemeProvider";
import type {
  GroupMember,
  PrayerGroup,
  TokenProvider,
} from "../types";
import { GroupActionsSection } from "./group-drawer/GroupActionsSection";
import { GroupBackgroundSection } from "./group-drawer/GroupBackgroundSection";
import { GroupDangerZoneSection } from "./group-drawer/GroupDangerZoneSection";
import { GroupDrawerHeader } from "./group-drawer/GroupDrawerHeader";
import {
  GroupDrawerError,
  useGroupDrawerStyles,
} from "./group-drawer/GroupDrawerControls";
import { GroupPurposeSection } from "./group-drawer/GroupPurposeSection";
import { GroupSettingsSection } from "./group-drawer/GroupSettingsSection";
import { InviteSection } from "./group-drawer/InviteSection";
import { MembersSection } from "./group-drawer/MembersSection";
import { useGroupDrawerController } from "./group-drawer/useGroupDrawerController";
import {
  groupBackgroundGallery,
  selectedGroupBackgrounds,
} from "../../../lib/groupBackgrounds";
import { useBackgroundLibrary } from "../../../lib/backgroundLibrary";

interface MembersSheetProps {
  visible: boolean;
  group: PrayerGroup;
  members: GroupMember[];
  currentUserId?: string | null;
  tokenProvider: TokenProvider;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  onExit: () => void;
}

export function MembersSheet({
  visible,
  group,
  members,
  currentUserId,
  tokenProvider,
  onClose,
  onChanged,
  onExit,
}: MembersSheetProps) {
  const styles = useGroupDrawerStyles();
  const { colors } = useTheme();
  const controller = useGroupDrawerController({
    visible,
    group,
    members,
    tokenProvider,
    onChanged,
    onExit,
  });
  const drawerGroup = controller.group;
  const { urls: libraryUrls } = useBackgroundLibrary();
  const displayName = drawerGroup?.name || group.name;
  const settingsPending = Boolean(
    controller.pending["settings:tradition"] ||
      controller.pending["settings:invites"],
  );

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <GroupDrawerHeader
            groupName={displayName}
            memberCount={controller.members.length}
            onClose={onClose}
          />
          {controller.loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : null}
          <GroupDrawerError message={controller.errors.load} />
          {drawerGroup && controller.isAdmin ? (
            <>
              <GroupPurposeSection
                addPending={Boolean(controller.pending["scripture:add"])}
                canRegenerate={controller.canRegeneratePurpose}
                isRemovePending={(index) =>
                  Boolean(controller.pending[`scripture:remove:${index}`])
                }
                onAddScripture={controller.addScripture}
                onBeginPurposeEdit={controller.beginPurposeEdit}
                onCancelPurposeEdit={controller.cancelPurposeEdit}
                onCloseScriptureForm={controller.closeScriptureForm}
                onOpenScriptureForm={controller.openScriptureForm}
                onPurposeDraftChange={controller.setPurposeDraft}
                onRegenerate={controller.regeneratePurpose}
                onRemoveScripture={controller.confirmRemoveScripture}
                onSavePurpose={controller.savePurpose}
                onScriptureDraftChange={controller.setScriptureDraft}
                purpose={drawerGroup.purpose}
                purposeDraft={controller.purposeDraft}
                purposeEditing={controller.purposeEditing}
                purposeError={controller.errors.purpose}
                purposePending={Boolean(controller.pending.purpose)}
                regeneratePending={Boolean(
                  controller.pending["scripture:regenerate"],
                )}
                scriptureDraft={controller.scriptureDraft}
                scriptureError={firstErrorFor(
                  controller.errors,
                  "scripture:add",
                  "scripture:remove",
                  "scripture:regenerate",
                )}
                scriptureFormOpen={controller.scriptureFormOpen}
                scriptures={drawerGroup.scriptureReferences}
              />
              <GroupSettingsSection
                error={firstErrorFor(controller.errors, "settings")}
                invitesPending={settingsPending}
                memberInvitesLocked={group.memberInvitesLocked}
                onMemberInvitesChange={controller.setMemberInvites}
                onSelectTradition={controller.selectTradition}
                settings={drawerGroup.settings}
                traditionPending={settingsPending}
              />
            </>
          ) : null}
          <MembersSection
            canManageMembers={controller.isAdmin}
            currentUserId={currentUserId}
            getError={(memberId) =>
              controller.errors[`remove:${memberId}`]
            }
            isPending={(memberId) =>
              Boolean(controller.pending[`remove:${memberId}`])
            }
            members={controller.members}
            onRemove={controller.confirmRemove}
          />
          {controller.canInvite ? (
            <InviteSection
              groupName={displayName}
              groupuuid={group.groupuuid}
              onChanged={async () => {
                await onChanged();
                await controller.refresh();
              }}
              tokenProvider={tokenProvider}
              visible={visible}
            />
          ) : null}
          {drawerGroup && controller.isAdmin ? (
            <GroupBackgroundSection
              error={firstErrorFor(
                controller.errors,
                "background",
              )}
              images={groupBackgroundGallery(
                drawerGroup.backgroundImage,
                drawerGroup.backgroundImages,
                libraryUrls,
              )}
              onRegenerate={controller.regenerateBackground}
              onSelect={controller.selectBackground}
              onUpload={controller.uploadBackground}
              pending={Boolean(controller.pending.background)}
              selectedUrls={selectedGroupBackgrounds(
                drawerGroup.backgroundImage,
                drawerGroup.backgroundImages,
              )}
              uploadPending={Boolean(
                controller.pending["background:upload"] ||
                  controller.pending["background:select"],
              )}
            />
          ) : null}
          {controller.canLeave ? (
            <GroupActionsSection
              error={controller.errors.leave}
              onLeave={controller.confirmLeave}
              pending={Boolean(controller.pending.leave)}
            />
          ) : null}
          {drawerGroup && controller.isAdmin ? (
            <GroupDangerZoneSection
              error={controller.errors.delete}
              onDelete={controller.confirmDelete}
              pending={Boolean(controller.pending.delete)}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function firstErrorFor(
  errors: Record<string, string | undefined>,
  ...prefixes: string[]
) {
  return Object.entries(errors).find(
    ([key, message]) =>
      Boolean(message) &&
      prefixes.some(
        (prefix) => key === prefix || key.startsWith(`${prefix}:`),
      ),
  )?.[1];
}
