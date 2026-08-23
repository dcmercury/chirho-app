import { useEffect, useState, type ReactNode } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useBackgroundLibrary } from "../../lib/backgroundLibrary";
import { useMusicLibrary } from "../../lib/musicLibrary";
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
import { AccountSection } from "./profile-drawer/AccountSection";
import { CommunitySection } from "./profile-drawer/CommunitySection";
import { DailyPrayerDrawer } from "./DailyPrayerDrawer";
import { DailyPrayersSection } from "./profile-drawer/DailyPrayersSection";
import { DangerZoneSection } from "./profile-drawer/DangerZoneSection";
import { GroupsSection } from "./profile-drawer/GroupsSection";
import { HomeBackgroundSection } from "./profile-drawer/HomeBackgroundSection";
import { LovedOnesSection } from "./profile-drawer/LovedOnesSection";
import { LovedOneEditSheet } from "./profile-drawer/LovedOneEditSheet";
import { NotificationsSection } from "./profile-drawer/NotificationsSection";
import { PersonalPlanSection } from "./profile-drawer/PersonalPlanSection";
import { PrayerCardsDrawer } from "./profile-drawer/PrayerCardsDrawer";
import { PrayerCardsSection } from "./profile-drawer/PrayerCardsSection";
import {
  PrayerLengthSection,
  PrayerPreferencesSection,
  TraditionSection,
} from "./profile-drawer/PrayerPreferencesSection";
import { PrayerFocusesSection } from "./profile-drawer/PrayerFocusesSection";
import { ProfileHeader } from "./profile-drawer/ProfileHeader";
import {
  CategoryLabel,
  Section,
  useProfileStyles,
} from "./profile-drawer/ProfileControls";
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
  onCreateGroup?: () => void;
  children?: ReactNode;
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
  onCreateGroup,
  children,
}: ProfileDrawerProps) {
  const styles = useProfileStyles();
  const controller = useProfileDrawerController(visible, onChanged);
  const { urls: libraryUrls } = useBackgroundLibrary();
  const { tracks: musicTracks } = useMusicLibrary();
  const [prayerCardsOpen, setPrayerCardsOpen] = useState(false);
  const [dailyPrayerOpen, setDailyPrayerOpen] = useState(false);
  const [editingLovedOneId, setEditingLovedOneId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!visible) {
      setPrayerCardsOpen(false);
      setDailyPrayerOpen(false);
      setEditingLovedOneId(null);
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
  const editingLovedOne =
    profile.managedLovedOnes.find((person) => person.id === editingLovedOneId) ||
    null;
  const showCreateGroup =
    Boolean(onCreateGroup) &&
    (!community || community.createBlockedReason !== "members");
  const createGroupDisabled = community?.canCreateGroups === false;
  const dailyPrayerAllowed = communityAllowsDailyPrayers(community, plan);

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
            themePending={Boolean(controller.pending.theme)}
            error={controller.errors.account}
            genderError={controller.errors["account-gender"]}
            avatarError={controller.errors.avatar}
            themeError={controller.errors.theme}
            onSave={controller.saveAccount}
            onSaveGender={controller.saveAccountGender}
            onChangeAvatar={() => {
              void controller.pickAvatar();
            }}
            onThemeChange={(enabled) => {
              void controller.setTheme(enabled ? "light" : "dark");
            }}
            privacy={profile.privacy}
            privacyError={firstErrorFor(controller.errors, "privacy")}
            isPrivacyPending={(key) =>
              Boolean(controller.pending[`privacy:${key}`])
            }
            onChangePrivacy={(key, enabled) => {
              void controller.setPrivacy(key, enabled);
            }}
          />
          {personalPrayer || dailyPrayerAllowed ? (
            <CategoryLabel>Prayer life</CategoryLabel>
          ) : null}
          {personalPrayer ? (
            <>
              <TraditionSection
                traditions={profile.traditions}
                pending={Boolean(controller.pending.tradition)}
                error={controller.errors.tradition}
                onSelect={(id) => {
                  void controller.selectTradition(id);
                }}
              />
              <PrayerLengthSection
                value={profile.prayerLength || "medium"}
                pending={Boolean(controller.pending["prayer-length"])}
                error={controller.errors["prayer-length"]}
                onSelect={(length) => {
                  void controller.setPrayerLength(length);
                }}
              />
              <PrayerCardsSection
                count={prayerCount}
                onOpen={() => setPrayerCardsOpen(true)}
              />
              <LovedOnesSection
                lovedOnes={profile.managedLovedOnes}
                avatarById={lovedOneAvatarById}
                error={firstErrorFor(controller.errors, "loved-one")}
                isPending={(id) =>
                  Boolean(controller.pending[`loved-one:${id}`])
                }
                onEdit={(person) => setEditingLovedOneId(person.id)}
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
          {dailyPrayerAllowed ? (
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
          {personalPrayer ? (
            <PrayerPreferencesSection
              visible={visible}
              voices={profile.voices}
              musicTracks={musicTracks}
              backgroundMusicEnabled={profile.backgroundMusicEnabled !== false}
              backgroundMusicId={profile.backgroundMusicId}
              voicePending={Boolean(controller.pending.voice)}
              backgroundMusicPending={Boolean(
                controller.pending["background-music"],
              )}
              voiceError={controller.errors.voice}
              backgroundMusicError={controller.errors["background-music"]}
              onSelectVoice={(id) => {
                void controller.selectVoice(id);
              }}
              onChangeBackgroundMusic={(enabled) => {
                void controller.setBackgroundMusic(enabled);
              }}
              onSelectBackgroundMusic={(track) => {
                void controller.selectBackgroundMusic(
                  track.musicuuid,
                  track.url,
                );
              }}
            />
          ) : null}
          <CategoryLabel>Community</CategoryLabel>
          <Section
            title="Church and groups"
            action={
              showCreateGroup ? (
                <Pressable
                  accessibilityLabel="Start a prayer group"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: createGroupDisabled }}
                  onPress={() => {
                    if (createGroupDisabled) {
                      Alert.alert(
                        "Group limit reached",
                        community?.createBlockedReason === "user_limit"
                          ? "You have reached the group limit for this church."
                          : "This church’s plan does not include more groups.",
                      );
                      return;
                    }
                    onCreateGroup?.();
                  }}
                  style={({ pressed }) => [
                    styles.sectionPlus,
                    pressed && styles.sectionPlusPressed,
                    createGroupDisabled && styles.disabled,
                  ]}
                >
                  <Text style={styles.sectionPlusText}>+</Text>
                </Pressable>
              ) : undefined
            }
          >
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
          <CategoryLabel>App settings</CategoryLabel>
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
          <NotificationsSection
            visible={visible}
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
          <PersonalPlanSection
            plan={plan}
            onOpen={onOpenPlan}
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
        <LovedOneEditSheet
          visible={editingLovedOne !== null}
          person={editingLovedOne}
          pending={
            editingLovedOne
              ? Boolean(controller.pending[`loved-one:${editingLovedOne.id}`])
              : false
          }
          onClose={() => setEditingLovedOneId(null)}
          onChanged={onChanged}
          onGenderChange={controller.setLovedOneGender}
          onRemove={(id, firstName) => {
            setEditingLovedOneId(null);
            controller.confirmRemoveLovedOne(id, firstName);
          }}
        />
        <PrayerCardsDrawer
          visible={prayerCardsOpen}
          count={prayerCount}
          onClose={() => setPrayerCardsOpen(false)}
          onChanged={onChanged}
        />
        <DailyPrayerDrawer
          visible={dailyPrayerOpen}
          lovedOnes={profile.managedLovedOnes}
          avatarById={lovedOneAvatarById}
          onClose={() => setDailyPrayerOpen(false)}
          onComplete={onChanged}
        />
        {children}
      </View>
    </Modal>
  );
}
