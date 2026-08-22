import { useEffect, useState } from "react";
import { Modal, ScrollView, View } from "react-native";
import { useBackgroundLibrary } from "../../lib/backgroundLibrary";
import {
  dashboardBackgroundGallery,
  selectedDashboardBackgrounds,
} from "../../lib/dashboardBackgrounds";
import type {
  HomeCommunity,
  HomeGroup,
  HomeLovedOne,
  HomeProfile,
  PersonalPlan,
  PrayerFocus,
} from "../../types/home";
import {
  communityAllowsDailyPrayers,
  communityAllowsPersonalPrayer,
} from "../../types/home";
import { useTheme } from "../../theme/ThemeProvider";
import { AccountSection } from "./profile-drawer/AccountSection";
import { CommunitySection } from "./profile-drawer/CommunitySection";
import { DailyPrayerDrawer } from "./DailyPrayerDrawer";
import { DailyPrayersSection } from "./profile-drawer/DailyPrayersSection";
import { DangerZoneSection } from "./profile-drawer/DangerZoneSection";
import { GroupsSection } from "./profile-drawer/GroupsSection";
import { HomeBackgroundSection } from "./profile-drawer/HomeBackgroundSection";
import { LovedOnesSection } from "./profile-drawer/LovedOnesSection";
import { NotificationsSection } from "./profile-drawer/NotificationsSection";
import { PersonalPlanSection } from "./profile-drawer/PersonalPlanSection";
import { PrayerCardsDrawer } from "./profile-drawer/PrayerCardsDrawer";
import { PrayerCardsSection } from "./profile-drawer/PrayerCardsSection";
import { PrayerPreferencesSection } from "./profile-drawer/PrayerPreferencesSection";
import { PrayerFocusesSection } from "./profile-drawer/PrayerFocusesSection";
import { PrivacySection } from "./profile-drawer/PrivacySection";
import { ProfileHeader } from "./profile-drawer/ProfileHeader";
import { InlineError, Section, ToggleRow, useProfileStyles } from "./profile-drawer/ProfileControls";
import { useProfileDrawerController } from "./profile-drawer/useProfileDrawerController";

interface ProfileDrawerProps {
  visible: boolean;
  profile: HomeProfile | null;
  lovedOnes: HomeLovedOne[];
  prayerFocuses: PrayerFocus[];
  groups: HomeGroup[];
  community: HomeCommunity | null;
  plan: PersonalPlan | null;
  onClose: () => void;
  onDismiss?: () => void;
  onChanged: () => Promise<void>;
  onOpenPlan: () => void;
  onBecameIndependent: () => void;
  onManageLovedOnePhotos: (lovedOne: {
    id: string;
    firstName: string;
  }) => void;
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
  prayerFocuses,
  groups,
  community,
  plan,
  onClose,
  onDismiss,
  onChanged,
  onOpenPlan,
  onBecameIndependent,
  onManageLovedOnePhotos,
}: ProfileDrawerProps) {
  const styles = useProfileStyles();
  const { appearance } = useTheme();
  const controller = useProfileDrawerController(visible, onChanged);
  const { urls: libraryUrls } = useBackgroundLibrary();
  const [prayerCardsOpen, setPrayerCardsOpen] = useState(false);
  const [dailyPrayerOpen, setDailyPrayerOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPrayerCardsOpen(false);
      setDailyPrayerOpen(false);
    }
  }, [visible]);

  if (!profile) return null;
  const personalPrayer = communityAllowsPersonalPrayer(community, plan);
  const prayerCount =
    profile.stats.find((stat) => stat.label.toLowerCase() === "prayers")
      ?.value || "0";
  const lovedOneAvatarById = Object.fromEntries(
    lovedOnes.map((person) => [
      person.id,
      person.primaryPhoto?.contentPath || person.avatar,
    ]),
  );

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onDismiss={onDismiss}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <ProfileHeader
            profile={profile}
            onClose={onClose}
            onOpenPrayerCards={
              personalPrayer ? () => setPrayerCardsOpen(true) : undefined
            }
          />
          <AccountSection
            account={profile.account}
            avatar={profile.avatar}
            visible={visible}
            pending={Boolean(controller.pending.account)}
            genderPending={Boolean(controller.pending["account-gender"])}
            avatarPending={Boolean(controller.pending.avatar)}
            error={controller.errors.account}
            genderError={controller.errors["account-gender"]}
            avatarError={controller.errors.avatar}
            onSave={controller.saveAccount}
            onSaveGender={controller.saveAccountGender}
            onChangeAvatar={() => {
              void controller.pickAvatar();
            }}
          />
          <PersonalPlanSection
            plan={plan}
            onOpen={onOpenPlan}
          />
          <Section title="Appearance">
            <ToggleRow
              disabled={Boolean(controller.pending.theme)}
              label="Light theme"
              onValueChange={(enabled) => {
                void controller.setTheme(enabled ? "light" : "dark");
              }}
              value={appearance === "light"}
            />
            <InlineError message={controller.errors.theme} />
          </Section>
          {personalPrayer ? (
            <>
          <PrayerCardsSection
            count={prayerCount}
            onOpen={() => setPrayerCardsOpen(true)}
          />
          <LovedOnesSection
            lovedOnes={profile.managedLovedOnes}
            avatarById={lovedOneAvatarById}
            error={firstErrorFor(controller.errors, "loved-one")}
            isPending={(id) => Boolean(controller.pending[`loved-one:${id}`])}
            onManage={(id, firstName) =>
              onManageLovedOnePhotos({ id, firstName })
            }
            onGenderChange={controller.setLovedOneGender}
            onRemove={controller.confirmRemoveLovedOne}
          />
          <PrayerFocusesSection
            focuses={prayerFocuses}
            isPending={(focusuuid) =>
              Boolean(controller.pending[`prayer-focus:${focusuuid}`])
            }
            getError={(focusuuid) =>
              controller.errors[`prayer-focus:${focusuuid}`]
            }
            onSave={controller.savePrayerFocus}
            onRemove={controller.confirmRemovePrayerFocus}
          />
            </>
          ) : null}
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
              onLeave={(name) =>
                controller.confirmLeaveCommunity(name, onBecameIndependent)
              }
            />
            <GroupsSection
              groups={groups}
              error={firstErrorFor(controller.errors, "group")}
              isPending={(groupuuid) =>
                Boolean(controller.pending[`group:${groupuuid}`])
              }
              onLeave={(groupuuid, name) =>
                controller.confirmLeaveGroup(groupuuid, name, () => {
                  if (!community) onBecameIndependent();
                })
              }
            />
          </Section>
          {personalPrayer ? (
          <PrayerPreferencesSection
            visible={visible}
            traditions={profile.traditions}
            voices={profile.voices}
            backgroundMusicEnabled={profile.backgroundMusicEnabled !== false}
            traditionPending={Boolean(controller.pending.tradition)}
            voicePending={Boolean(controller.pending.voice)}
            backgroundMusicPending={Boolean(
              controller.pending["background-music"],
            )}
            traditionError={controller.errors.tradition}
            voiceError={controller.errors.voice}
            backgroundMusicError={controller.errors["background-music"]}
            onSelectTradition={(id) => {
              void controller.selectTradition(id);
            }}
            onSelectVoice={(id) => {
              void controller.selectVoice(id);
            }}
            onChangeBackgroundMusic={(enabled) => {
              void controller.setBackgroundMusic(enabled);
            }}
          />
          ) : null}
          <HomeBackgroundSection
            error={firstErrorFor(controller.errors, "dashboard-background")}
            images={dashboardBackgroundGallery(
              community?.backgroundImage,
              profile.dashboardBackgrounds,
              libraryUrls,
            )}
            onSelect={(url) => {
              void controller.selectHomeBackground(
                url,
                selectedDashboardBackgrounds(
                  community?.backgroundImage,
                  profile.dashboardBackgrounds,
                ),
              );
            }}
            onUpload={() => {
              void controller.uploadHomeBackground(
                selectedDashboardBackgrounds(
                  community?.backgroundImage,
                  profile.dashboardBackgrounds,
                ),
              );
            }}
            pending={Boolean(controller.pending["dashboard-background:select"])}
            selectedUrls={selectedDashboardBackgrounds(
              community?.backgroundImage,
              profile.dashboardBackgrounds,
            )}
            uploadPending={Boolean(
              controller.pending["dashboard-background:upload"],
            )}
          />
          {communityAllowsDailyPrayers(community, plan) ? (
            <DailyPrayersSection
              dailyPrayers={profile.dailyPrayers}
              isPending={(period) =>
                Boolean(controller.pending[`daily-${period}`])
              }
              getError={(period) => controller.errors[`daily-${period}`]}
              onChange={(period, next) => {
                void controller.updateDailyPrayer(
                  profile.dailyPrayers,
                  period,
                  next,
                );
              }}
              onOpenWizard={() => setDailyPrayerOpen(true)}
            />
          ) : null}
          <NotificationsSection
            notifications={profile.notifications}
            isSuperadmin={profile.isSuperadmin}
            error={firstErrorFor(
              controller.errors,
              "notification",
              "notification-test",
            )}
            isPending={(key) =>
              Boolean(controller.pending[`notification:${key}`])
            }
            isTestPending={(key) =>
              Boolean(controller.pending[`notification-test:${key}`])
            }
            onChange={(key, enabled) => {
              void controller.setNotification(key, enabled);
            }}
            onTest={(key, label) => {
              void controller.testNotification(key, label);
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
        <PrayerCardsDrawer
          visible={prayerCardsOpen}
          count={prayerCount}
          onClose={() => setPrayerCardsOpen(false)}
          onChanged={onChanged}
        />
        <DailyPrayerDrawer
          visible={dailyPrayerOpen}
          lovedOnes={profile.managedLovedOnes}
          onClose={() => setDailyPrayerOpen(false)}
          onComplete={onChanged}
        />
      </View>
    </Modal>
  );
}
