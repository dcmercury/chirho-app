import { Modal, ScrollView, View } from "react-native";
import type {
  HomeCommunity,
  HomeGroup,
  HomeLovedOne,
  HomeProfile,
} from "../../types/home";
import { AccountSection } from "./profile-drawer/AccountSection";
import { CommunitySection } from "./profile-drawer/CommunitySection";
import { DailyPrayersSection } from "./profile-drawer/DailyPrayersSection";
import { DangerZoneSection } from "./profile-drawer/DangerZoneSection";
import { GroupsSection } from "./profile-drawer/GroupsSection";
import { LovedOnesSection } from "./profile-drawer/LovedOnesSection";
import { NotificationsSection } from "./profile-drawer/NotificationsSection";
import { PrayerPreferencesSection } from "./profile-drawer/PrayerPreferencesSection";
import { PrivacySection } from "./profile-drawer/PrivacySection";
import { ProfileHeader } from "./profile-drawer/ProfileHeader";
import { Section, styles } from "./profile-drawer/ProfileControls";
import { useProfileDrawerController } from "./profile-drawer/useProfileDrawerController";

interface ProfileDrawerProps {
  visible: boolean;
  profile: HomeProfile | null;
  lovedOnes: HomeLovedOne[];
  groups: HomeGroup[];
  community: HomeCommunity | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
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

export function ProfileDrawer({
  visible,
  profile,
  lovedOnes,
  groups,
  community,
  onClose,
  onChanged,
}: ProfileDrawerProps) {
  const controller = useProfileDrawerController(visible, onChanged);

  if (!profile) return null;
  const lovedOneAvatarById = Object.fromEntries(
    lovedOnes.map((person) => [person.id, person.avatar]),
  );

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <ProfileHeader
            profile={profile}
            onClose={onClose}
          />
          <AccountSection
            account={profile.account}
            avatar={profile.avatar}
            visible={visible}
            pending={Boolean(controller.pending.account)}
            avatarPending={Boolean(controller.pending.avatar)}
            error={controller.errors.account}
            avatarError={controller.errors.avatar}
            onSave={controller.saveAccount}
            onChangeAvatar={() => {
              void controller.pickAvatar();
            }}
          />
          <LovedOnesSection
            lovedOnes={profile.managedLovedOnes}
            avatarById={lovedOneAvatarById}
            error={firstErrorFor(controller.errors, "loved-one")}
            isPending={(id) => Boolean(controller.pending[`loved-one:${id}`])}
            onRemove={controller.confirmRemoveLovedOne}
          />
          <Section title="Community and groups">
            <CommunitySection
              visible={visible}
              community={community}
              searchPending={Boolean(controller.pending["community:search"])}
              leavePending={Boolean(controller.pending["community:leave"])}
              error={firstErrorFor(controller.errors, "community")}
              isJoinPending={() => Boolean(controller.pending["community:join"])}
              onSearch={controller.searchCommunity}
              onJoin={controller.joinAndActivateCommunity}
              onLeave={controller.confirmLeaveCommunity}
            />
            <GroupsSection
              groups={groups}
              error={firstErrorFor(controller.errors, "group")}
              isPending={(groupuuid) =>
                Boolean(controller.pending[`group:${groupuuid}`])
              }
              onLeave={controller.confirmLeaveGroup}
            />
          </Section>
          <PrayerPreferencesSection
            traditions={profile.traditions}
            voices={profile.voices}
            traditionPending={Boolean(controller.pending.tradition)}
            voicePending={Boolean(controller.pending.voice)}
            traditionError={controller.errors.tradition}
            voiceError={controller.errors.voice}
            onSelectTradition={(id) => {
              void controller.selectTradition(id);
            }}
            onSelectVoice={(id) => {
              void controller.selectVoice(id);
            }}
          />
          <DailyPrayersSection
            dailyPrayers={profile.dailyPrayers}
            isPending={(period) =>
              Boolean(controller.pending[`daily-${period}`])
            }
            getError={(period) => controller.errors[`daily-${period}`]}
            onChange={(period, next) => {
              void controller.updateDailyPrayer(profile.dailyPrayers, period, next);
            }}
          />
          <NotificationsSection
            notifications={profile.notifications}
            error={firstErrorFor(controller.errors, "notification")}
            isPending={(key) =>
              Boolean(controller.pending[`notification:${key}`])
            }
            onChange={(key, enabled) => {
              void controller.setNotification(key, enabled);
            }}
          />
          <PrivacySection
            privacy={profile.privacy}
            error={firstErrorFor(controller.errors, "privacy")}
            isPending={(key) => Boolean(controller.pending[`privacy:${key}`])}
            onChange={(key, enabled) => {
              void controller.setPrivacy(key, enabled);
            }}
          />
          <DangerZoneSection
            signOutPending={Boolean(controller.pending["sign-out"])}
            deletePending={Boolean(controller.pending["account:delete"])}
            error={firstErrorFor(
              controller.errors,
              "sign-out",
              "account:delete",
            )}
            onSignOut={() => {
              void controller.signOutAccount();
            }}
            onDeleteAccount={controller.confirmDeleteAccount}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}
