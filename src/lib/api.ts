import { API_BASE } from "./assets";
import type { LovedOnePrayerConfiguration } from "./prayerConfig";
import type {
  GroupDetail,
  HomeCommunity,
  HomePrayerCard,
  LovedOnePhoto,
  MobileHomeResponse,
  PendingGroupInvite,
  PersonalPlan,
  PrayerDeckCard,
  PrayerDeckDetail,
  PrayerFocus,
  PrayerFocusInput,
} from "../types/home";
import type {
  GroupAdminRecord,
  GroupBackgroundResult,
  GroupCreationMetadata,
  GroupInviteResult,
  GroupMember,
  GroupMessage,
  GroupCreatePayload,
  GroupPreviewPayload,
  GroupPreviewResult,
  GroupScripture,
  GroupSettings,
  GroupUpdatePayload,
  PrayerCount,
  PrayerGroup,
  PrayerGroupSurfaceData,
  PrayerResponse,
} from "../features/groups/types";

export interface Community {
  uuid: string;
  name: string;
  location: string;
  city: string;
  state: string;
  tradition: string | null;
  memberCount: number;
  groupCount: number;
  logo?: string | null;
}

async function authenticatedRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const method = options.method || "GET";
  const startedAt = Date.now();

  if (__DEV__) console.info(`[API] → ${method} ${url}`);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (__DEV__) {
      console.error(
        `[API] ✕ ${method} ${url} (${Date.now() - startedAt}ms)`,
        error,
      );
    }
    throw new Error(
      `Could not reach the API at ${API_BASE}. Make sure the backend is running.`,
      { cause: error },
    );
  }

  if (__DEV__) {
    console.info(
      `[API] ← ${response.status} ${method} ${url} (${Date.now() - startedAt}ms)`,
    );
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      (data as { error?: string }).error || `Request failed (${response.status})`,
    ) as Error & { status?: number };
    error.status = response.status;
    if (__DEV__) {
      console.error(`[API] ${response.status} ${method} ${url}`, error.message);
    }
    throw error;
  }
  return data as T;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeScriptureReferences(value: unknown): GroupScripture[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values
    .map((item) => {
      const scripture = asRecord(item);
      if (!scripture) return null;
      const citation = optionalString(scripture.citation)?.trim() || "";
      const text = optionalString(scripture.text)?.trim() || "";
      if (!citation && !text) return null;
      const reason = optionalString(scripture.reason)?.trim();
      return {
        citation,
        text,
        ...(reason ? { reason } : {}),
      };
    })
    .filter((item): item is GroupScripture => Boolean(item));
}

function normalizeGroupSettings(
  value: unknown,
  fallbackTradition?: unknown,
): GroupSettings {
  const source = asRecord(value) || {};
  const settings: GroupSettings = {
    ...source,
    isPublic: source.isPublic === true,
    allowMemberInvites: source.allowMemberInvites === true,
  };
  const tradition =
    optionalString(source.tradition) || optionalString(fallbackTradition);
  settings.tradition = tradition?.toLowerCase() || null;
  return settings;
}

function normalizeCreationMetadata(value: unknown): GroupCreationMetadata | null {
  const source = asRecord(value);
  if (!source) return null;
  const groupType = optionalString(source.groupType)?.trim() || "";
  if (!groupType) return null;
  return {
    groupType,
    contexts: stringArray(source.contexts),
    focuses: stringArray(source.focuses),
  };
}

function normalizeGroupMember(item: unknown, index: number): GroupMember {
  const member = asRecord(item) || {};
  const rawProfile =
    asRecord(member.profile) ||
    asRecord(member.memberProfile) ||
    asRecord(member.user) ||
    (optionalString(member.imageUrl) || optionalString(member.avatar)
      ? member
      : undefined);
  const firstName =
    optionalString(member.firstName) || optionalString(rawProfile?.firstName);
  return {
    memberId: String(member.memberId || member.id || index),
    groupuuid: optionalString(member.groupuuid) || optionalString(member.groupUuid),
    clerkuuid:
      optionalString(member.clerkuuid) || optionalString(member.userId),
    firstName,
    phone: optionalString(member.phone),
    status:
      member.status === "pending" ||
      member.status === "removed" ||
      member.status === "declined"
        ? member.status
        : "active",
    role: member.role === "admin" ? "admin" : "member",
    prayerCategories: stringArray(member.prayerCategories),
    profile: rawProfile
      ? {
          firstName: optionalString(rawProfile.firstName) || firstName,
          lastName: optionalString(rawProfile.lastName),
          avatar:
            optionalString(rawProfile.avatar) ||
            optionalString(rawProfile.imageUrl),
          phoneNumber:
            optionalString(rawProfile.phoneNumber) ||
            optionalString(rawProfile.phone) ||
            optionalString(member.phone),
        }
      : member.status === "pending" || firstName || member.phone
        ? {
            firstName,
            lastName: null,
            avatar: null,
            phoneNumber: optionalString(member.phone),
          }
        : null,
    invitedBy: optionalString(member.invitedBy),
    invitedAt: optionalString(member.invitedAt),
    invitationToken: optionalString(member.invitationToken),
    invitationExpiresAt: optionalString(member.invitationExpiresAt),
    acceptedAt: optionalString(member.acceptedAt),
    declinedAt: optionalString(member.declinedAt),
    createdAt: optionalString(member.createdAt),
    updatedAt: optionalString(member.updatedAt),
    removedAt: optionalString(member.removedAt),
    removedBy: optionalString(member.removedBy),
  };
}

function normalizeGroupAdminRecord(
  value: unknown,
  fallbackGroupuuid: string,
): GroupAdminRecord {
  const group = asRecord(value);
  if (!group) throw new Error("The group response was incomplete.");
  const parent = asRecord(group.parentEntity);
  const parentType =
    parent?.type === "church" || parent?.type === "ngo" ? parent.type : null;
  const scriptures = normalizeScriptureReferences(
    group.scriptureReferences ?? group.scripture,
  );
  return {
    groupuuid: String(group.groupuuid || group.groupUuid || fallbackGroupuuid),
    name: optionalString(group.name) || "Prayer Group",
    description: optionalString(group.description),
    purpose: optionalString(group.purpose),
    scriptureReferences: scriptures,
    backgroundImage:
      optionalString(group.backgroundImage) ||
      optionalString(group.activeBackgroundUrl),
    backgroundImages: stringArray(
      group.backgroundImages || group.backgrounds,
    ),
    creationMetadata: normalizeCreationMetadata(group.creationMetadata),
    admin: optionalString(group.admin),
    parentEntity: parent
      ? {
          type: parentType,
          uuid: optionalString(parent.uuid),
        }
      : null,
    settings: normalizeGroupSettings(group.settings, group.tradition),
    createdAt: optionalString(group.createdAt),
    updatedAt: optionalString(group.updatedAt),
    createdBy: optionalString(group.createdBy),
    deletedAt: optionalString(group.deletedAt),
    memberCount:
      typeof group.memberCount === "number" ? group.memberCount : 0,
    memberClerkIds: stringArray(group.memberClerkIds),
  };
}

function normalizeGroupSurface(
  payload: unknown,
  groupuuid: string,
): PrayerGroupSurfaceData | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const source =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;
  if (!source.group || typeof source.group !== "object") return null;

  const rawGroup = source.group as Record<string, unknown>;
  const viewer =
    source.viewer && typeof source.viewer === "object"
      ? (source.viewer as Record<string, unknown>)
      : {};
  const settings =
    rawGroup.settings && typeof rawGroup.settings === "object"
      ? (rawGroup.settings as Record<string, unknown>)
      : {};
  const scriptures = Array.isArray(rawGroup.scriptureReferences)
    ? rawGroup.scriptureReferences
    : [];
  const firstScripture =
    scriptures[0] && typeof scriptures[0] === "object"
      ? (scriptures[0] as Record<string, unknown>)
      : null;
  const rawMembers = Array.isArray(source.members) ? source.members : [];
  const members = rawMembers.map(normalizeGroupMember);
  const messagePage =
    source.messages &&
    typeof source.messages === "object" &&
    !Array.isArray(source.messages)
      ? (source.messages as Record<string, unknown>)
      : null;
  const rawMessages = Array.isArray(source.messages)
    ? source.messages
    : Array.isArray(messagePage?.items)
      ? messagePage.items
      : [];
  const messages: GroupMessage[] = rawMessages
    .map((item) => {
      const message =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};
      return {
        messageId: String(message.messageId || ""),
        groupUuid: String(message.groupUuid || groupuuid),
        userId: String(message.userId || ""),
        content: String(message.content || ""),
        timestamp: String(
          message.timestamp || message.createdAt || new Date().toISOString(),
        ),
        sequenceNumber:
          typeof message.sequenceNumber === "number"
            ? message.sequenceNumber
            : 0,
      };
    })
    .filter((message) => message.messageId && message.userId);
  const prayerCounts =
    source.prayerCounts && typeof source.prayerCounts === "object"
      ? (source.prayerCounts as Record<string, PrayerCount>)
      : {};
  const activeMembers = members.filter((member) => member.status === "active");
  const isAdmin =
    viewer.isAdmin === true ||
    source.isAdmin === true ||
    rawGroup.isAdmin === true;

  const group: PrayerGroup = {
    groupuuid: String(rawGroup.groupuuid || groupuuid),
    name: String(rawGroup.name || "Prayer Group"),
    purpose: String(rawGroup.purpose || ""),
    description: String(rawGroup.description || ""),
    backgroundImage:
      typeof rawGroup.backgroundImage === "string"
        ? rawGroup.backgroundImage
        : typeof rawGroup.activeBackgroundUrl === "string"
          ? rawGroup.activeBackgroundUrl
        : typeof source.backgroundImage === "string"
          ? source.backgroundImage
          : null,
    backgroundImages: stringArray(
      rawGroup.backgroundImages || source.backgroundImages,
    ),
    tradition:
      typeof settings.tradition === "string"
        ? settings.tradition.toUpperCase()
        : typeof rawGroup.tradition === "string"
          ? rawGroup.tradition.toUpperCase()
          : null,
    scripture: firstScripture
      ? {
          citation: String(firstScripture.citation || ""),
          text: String(firstScripture.text || ""),
          reason:
            typeof firstScripture.reason === "string"
              ? firstScripture.reason
              : undefined,
        }
      : null,
    memberCount:
      typeof rawGroup.memberCount === "number"
        ? rawGroup.memberCount
        : activeMembers.length,
    isAdmin,
    isMember:
      typeof viewer.isMember === "boolean"
        ? viewer.isMember
        : source.isMember !== false,
    canInvite:
      typeof viewer.canInvite === "boolean" ? viewer.canInvite : isAdmin,
    canManageMembers:
      typeof viewer.canManageMembers === "boolean"
        ? viewer.canManageMembers
        : isAdmin,
    canLeave:
      typeof viewer.canLeave === "boolean" ? viewer.canLeave : !isAdmin,
    canCreatePrayerRequests:
      typeof viewer.canCreatePrayerRequests === "boolean"
        ? viewer.canCreatePrayerRequests
        : true,
    memberInvitesLocked: viewer.memberInvitesLocked === true,
  };

  return {
    group,
    members,
    messages: messages.sort((a, b) => a.sequenceNumber - b.sequenceNumber),
    prayerCounts,
    hasMoreMessages:
      typeof messagePage?.hasMore === "boolean"
        ? messagePage.hasMore
        : typeof source.hasMoreMessages === "boolean"
        ? source.hasMoreMessages
        : messages.length >= 10,
    prayerRequestCount:
      typeof messagePage?.totalCount === "number"
        ? messagePage.totalCount
        : typeof source.prayerRequestCount === "number"
          ? source.prayerRequestCount
          : messages.length,
  };
}

export async function getMobileHome(
  token: string,
): Promise<MobileHomeResponse> {
  const data = await authenticatedRequest<
    | {
        success?: boolean;
        home: MobileHomeResponse["home"];
        community:
          | HomeCommunity
          | {
              communityuuid: string;
              name: string;
              location: string | null;
              tradition: string | null;
              branding: { logo: string | null } | null;
              activeBackground: { url: string } | null;
              donationLink?: string | null;
              features?: HomeCommunity["features"];
              licenseTier?: string | null;
              canCreateGroups?: boolean;
              createBlockedReason?: HomeCommunity["createBlockedReason"];
              groupLimits?: HomeCommunity["groupLimits"];
              groupsUsed?: number;
            }
          | null;
        plan?: PersonalPlan | null;
        pendingInvites?: PendingGroupInvite[];
      }
    | MobileHomeResponse["home"]
  >("/api/mobile/home", token);
  if (!("home" in data)) {
    return {
      home: {
        ...data,
        prayerFocuses: data.prayerFocuses || [],
        dailyDeck: data.dailyDeck || null,
      },
      community: null,
      plan: null,
      pendingInvites: [],
    };
  }
  const rawCommunity = data.community;
  const community = !rawCommunity
    ? null
    : {
        communityuuid: rawCommunity.communityuuid,
        name: rawCommunity.name,
        location:
          "location" in rawCommunity
            ? rawCommunity.location || undefined
            : undefined,
        tradition: rawCommunity.tradition,
        logo:
          "logo" in rawCommunity
            ? rawCommunity.logo || null
            : "branding" in rawCommunity
              ? rawCommunity.branding?.logo || null
              : null,
        backgroundImage:
          "backgroundImage" in rawCommunity
            ? rawCommunity.backgroundImage || null
            : "activeBackground" in rawCommunity
              ? rawCommunity.activeBackground?.url || null
              : null,
        donationLink: rawCommunity.donationLink || null,
        features: rawCommunity.features,
        licenseTier:
          "licenseTier" in rawCommunity ? rawCommunity.licenseTier : null,
        canCreateGroups: rawCommunity.canCreateGroups,
        createBlockedReason: rawCommunity.createBlockedReason,
        groupLimits: rawCommunity.groupLimits,
        groupsUsed: rawCommunity.groupsUsed,
      };
  return {
    home: {
      ...data.home,
      prayerFocuses: data.home.prayerFocuses || [],
      dailyDeck: data.home.dailyDeck || null,
    },
    community,
    plan: data.plan || null,
    pendingInvites: Array.isArray(data.pendingInvites)
      ? data.pendingInvites
      : [],
  };
}

export async function getPrayerFocuses(token: string): Promise<PrayerFocus[]> {
  const data = await authenticatedRequest<
    | PrayerFocus[]
    | { prayerFocuses?: PrayerFocus[]; focuses?: PrayerFocus[] }
  >("/api/user/prayer-focuses", token);
  if (Array.isArray(data)) return data;
  return data.prayerFocuses || data.focuses || [];
}

export async function createPrayerFocus(
  focus: PrayerFocusInput,
  token: string,
): Promise<PrayerFocus> {
  const data = await authenticatedRequest<
    PrayerFocus | { prayerFocus?: PrayerFocus; focus?: PrayerFocus }
  >("/api/user/prayer-focuses", token, {
    method: "POST",
    body: JSON.stringify(focus),
  });
  if ("focusuuid" in data) return data;
  const created = data.prayerFocus || data.focus;
  if (!created) throw new Error("The prayer focus response was incomplete.");
  return created;
}

export async function updatePrayerFocus(
  focusuuid: string,
  updates: Partial<PrayerFocusInput>,
  token: string,
): Promise<PrayerFocus> {
  const data = await authenticatedRequest<
    PrayerFocus | { prayerFocus?: PrayerFocus; focus?: PrayerFocus }
  >(`/api/user/prayer-focuses/${focusuuid}`, token, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  if ("focusuuid" in data) return data;
  const updated = data.prayerFocus || data.focus;
  if (!updated) throw new Error("The prayer focus response was incomplete.");
  return updated;
}

export async function deletePrayerFocus(
  focusuuid: string,
  token: string,
): Promise<void> {
  await authenticatedRequest(`/api/user/prayer-focuses/${focusuuid}`, token, {
    method: "DELETE",
  });
}

export async function getPrayerDeck(
  deckuuid: string,
  token: string,
): Promise<{ deck: PrayerDeckDetail; cards: PrayerDeckCard[] }> {
  const data = await authenticatedRequest<{
    success: true;
    deck: PrayerDeckDetail;
    cards: PrayerDeckCard[];
  }>(`/api/mobile/prayer-decks/${deckuuid}`, token);
  return {
    deck: data.deck,
    cards: [...(data.cards || [])].sort(
      (left, right) => left.deckIndex - right.deckIndex,
    ),
  };
}

export async function retryPrayerDeckItem(
  deckuuid: string,
  subjectId: string,
  token: string,
): Promise<PrayerDeckCard> {
  const data = await authenticatedRequest<{
    success: true;
    card: PrayerDeckCard;
  }>(
    `/api/mobile/prayer-decks/${encodeURIComponent(deckuuid)}/items/${encodeURIComponent(subjectId)}/retry`,
    token,
    { method: "POST" },
  );
  return data.card;
}

export async function generateLovedOnePrayer(
  lovedOneId: string,
  backgroundImage: string,
  token: string,
  textOnly: boolean,
): Promise<HomePrayerCard> {
  const now = new Date();
  const localDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  let timeZone: string | undefined;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    timeZone = undefined;
  }

  const data = await authenticatedRequest<{
    prayer: {
      prayeruuid?: string;
      title?: string;
      text?: string;
      textClean?: string;
      verse?: string;
      tradition?: string;
      timeOfDay?: "morning" | "evening";
      audioUrl?: string | null;
      audioStatus?: "pending" | "ready" | "failed";
      backgroundMusicUrl?: string | null;
      backgroundMusicVolume?: number;
      backgroundImage?: string;
    };
  }>(`/api/user/prayers/loved-one/${lovedOneId}/generate`, token, {
    method: "POST",
    body: JSON.stringify({
      textOnly,
      backgroundImage,
      localDate,
      localHour: now.getHours(),
      timeZone,
    }),
  });
  const text = data.prayer.textClean || data.prayer.text || "";
  const timeOfDay = data.prayer.timeOfDay;
  const titleFromName = data.prayer.title?.match(/\bfor\s+(.+)$/i)?.[1]?.trim();
  return {
    prayeruuid: data.prayer.prayeruuid,
    title: titleFromName || data.prayer.title || "Prayer",
    verse:
      data.prayer.verse ||
      (timeOfDay === "morning"
        ? "Morning Prayer"
        : timeOfDay === "evening"
          ? "Evening Prayer"
          : data.prayer.tradition || "Personal prayer"),
    text,
    fullPrayer: text,
    image: data.prayer.backgroundImage || backgroundImage,
    narrationUrl: data.prayer.audioUrl || null,
    backgroundMusicUrl: data.prayer.backgroundMusicUrl || null,
    backgroundMusicVolume: data.prayer.backgroundMusicVolume,
    audioAvailable: Boolean(data.prayer.audioUrl),
    audioStatus: data.prayer.audioStatus,
  };
}

export async function generatePrayerCardAudio(
  prayeruuid: string,
  token: string,
): Promise<{
  audioStatus: "pending" | "ready" | "failed";
  narrationUrl: string | null;
  backgroundMusicUrl: string | null;
  backgroundMusicVolume: number;
}> {
  const data = await authenticatedRequest<{
    audioStatus?: "pending" | "ready" | "failed";
    status?: "pending" | "ready" | "failed";
    audioUrl?: string | null;
    backgroundMusicUrl?: string | null;
    backgroundMusicVolume?: number;
  }>(`/api/prayers/${prayeruuid}/audio/generate`, token, {
    method: "POST",
  });

  const initialStatus =
    data.audioStatus || data.status || (data.audioUrl ? "ready" : "pending");
  if (initialStatus !== "pending") {
    return {
      audioStatus: initialStatus,
      narrationUrl: data.audioUrl || null,
      backgroundMusicUrl: data.backgroundMusicUrl || null,
      backgroundMusicVolume: data.backgroundMusicVolume ?? 0,
    };
  }

  for (let attempt = 0; attempt < 15; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const prayer = await getPrayer(prayeruuid, token);
    const reportedStatus =
      prayer.audioStatus || (prayer.narrationUrl ? "ready" : "pending");
    const audioStatus =
      reportedStatus === "not_started" ? "pending" : reportedStatus;
    if (audioStatus !== "pending") {
      return {
        audioStatus,
        narrationUrl: prayer.narrationUrl || null,
        backgroundMusicUrl: prayer.backgroundMusicUrl || null,
        backgroundMusicVolume: prayer.backgroundMusicVolume ?? 0,
      };
    }
  }

  return {
    audioStatus: "failed",
    narrationUrl: null,
    backgroundMusicUrl: data.backgroundMusicUrl || null,
    backgroundMusicVolume: data.backgroundMusicVolume ?? 0,
  };
}

export async function addLovedOne(
  firstName: string,
  token: string,
): Promise<{ id: string; firstName: string }> {
  const data = await authenticatedRequest<{
    lovedOne: { id: string; firstName: string };
  }>("/api/user/profile/loved-ones", token, {
    method: "POST",
    body: JSON.stringify({ firstName: firstName.trim() }),
  });
  return data.lovedOne;
}

export async function saveLovedOneConfig(
  lovedOneId: string,
  configurations: LovedOnePrayerConfiguration[],
  token: string,
): Promise<void> {
  await authenticatedRequest(
    `/api/user/profile/loved-ones/${lovedOneId}/daily-prayer/config`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        configurations: configurations.map((item) => ({
          category: item.category.toLowerCase(),
          virtues: item.virtues,
        })),
      }),
    },
  );
}

export async function deleteLovedOne(
  lovedOneId: string,
  token: string,
): Promise<void> {
  await authenticatedRequest(
    `/api/user/profile/loved-ones/${lovedOneId}`,
    token,
    { method: "DELETE" },
  );
}

function normalizeLovedOnePhoto(value: unknown): LovedOnePhoto | null {
  const photo = asRecord(value);
  const mediauuid =
    optionalString(photo?.mediauuid) || optionalString(photo?.mediaUuid);
  const contentPath =
    optionalString(photo?.contentPath) || optionalString(photo?.url);
  if (!mediauuid || !contentPath) return null;
  return {
    mediauuid,
    contentPath,
    isPrimary: photo?.isPrimary === true || photo?.primary === true,
  };
}

export async function getLovedOnePhotos(
  lovedOneId: string,
  token: string,
): Promise<LovedOnePhoto[]> {
  const payload = await authenticatedRequest<unknown>(
    `/api/user/profile/loved-ones/${encodeURIComponent(lovedOneId)}/photos`,
    token,
  );
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const values = Array.isArray(payload)
    ? payload
    : Array.isArray(root?.photos)
      ? root.photos
      : Array.isArray(data?.photos)
        ? data.photos
        : [];
  return values
    .map(normalizeLovedOnePhoto)
    .filter((photo): photo is LovedOnePhoto => Boolean(photo))
    .slice(0, 3);
}

export async function uploadLovedOnePhoto(
  lovedOneId: string,
  imageData: string,
  token: string,
): Promise<void> {
  await authenticatedRequest(
    `/api/user/profile/loved-ones/${encodeURIComponent(lovedOneId)}/photos`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ imageData }),
    },
  );
}

export async function setLovedOnePrimaryPhoto(
  lovedOneId: string,
  mediauuid: string,
  token: string,
): Promise<void> {
  await authenticatedRequest(
    `/api/user/profile/loved-ones/${encodeURIComponent(lovedOneId)}/photos/${encodeURIComponent(mediauuid)}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ isPrimary: true }),
    },
  );
}

export async function deleteLovedOnePhoto(
  lovedOneId: string,
  mediauuid: string,
  token: string,
): Promise<void> {
  await authenticatedRequest(
    `/api/user/profile/loved-ones/${encodeURIComponent(lovedOneId)}/photos/${encodeURIComponent(mediauuid)}`,
    token,
    { method: "DELETE" },
  );
}

export async function updateProfile(
  updates: Record<string, unknown>,
  token: string,
): Promise<void> {
  await authenticatedRequest("/api/user/profile", token, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function updateAccountName(
  firstName: string,
  lastName: string,
  token: string,
): Promise<void> {
  await authenticatedRequest("/api/user/profile/account", token, {
    method: "PATCH",
    body: JSON.stringify({
      firstName: firstName.trim(),
      lastName: lastName.trim() || null,
    }),
  });
}

export async function uploadAvatar(
  imageData: string,
  token: string,
): Promise<void> {
  await authenticatedRequest("/api/user/profile/avatar", token, {
    method: "POST",
    body: JSON.stringify({ imageData }),
  });
}

export async function selectDashboardBackground(
  imageUrl: string,
  current: string[],
  token: string,
): Promise<void> {
  await authenticatedRequest("/api/user/profile/dashboard-background", token, {
    method: "POST",
    body: JSON.stringify({ action: "select", imageUrl, current }),
  });
}

export async function uploadDashboardBackground(
  imageData: string,
  current: string[],
  token: string,
): Promise<void> {
  await authenticatedRequest("/api/user/profile/dashboard-background", token, {
    method: "POST",
    body: JSON.stringify({ action: "upload", imageData, current }),
  });
}

export async function updateNotificationPreference(
  key: string,
  enabled: boolean,
  token: string,
): Promise<void> {
  await authenticatedRequest("/api/user/settings/notifications", token, {
    method: "PUT",
    body: JSON.stringify({ preferences: { [key]: enabled } }),
  });
}

export async function sendTestNotification(
  notificationType: string,
  token: string,
): Promise<string> {
  const data = await authenticatedRequest<{ message?: string }>(
    "/api/user/settings/notifications/test",
    token,
    {
      method: "POST",
      body: JSON.stringify({ notificationType }),
    },
  );
  return data.message || "Test notification sent.";
}

export async function getGroupAdminDetails(
  groupuuid: string,
  token: string,
): Promise<{ group: GroupAdminRecord; isAdmin: boolean }> {
  const payload = await authenticatedRequest<unknown>(
    `/api/groups/${groupuuid}`,
    token,
  );
  const root = asRecord(payload);
  const source = asRecord(root?.data) || root;
  const rawGroup = source?.group || source;
  return {
    group: normalizeGroupAdminRecord(rawGroup, groupuuid),
    isAdmin: source?.isAdmin === true || root?.isAdmin === true,
  };
}

export async function getGroupMembers(
  groupuuid: string,
  token: string,
): Promise<GroupMember[]> {
  const payload = await authenticatedRequest<unknown>(
    `/api/groups/${groupuuid}/members`,
    token,
  );
  const root = asRecord(payload);
  const source = asRecord(root?.data) || root;
  const rawMembers = Array.isArray(source?.members)
    ? source.members
    : Array.isArray(payload)
      ? payload
      : [];
  return rawMembers
    .map(normalizeGroupMember)
    .filter(
      (member) => member.status === "active" || member.status === "pending",
    );
}

export async function updateGroup(
  groupuuid: string,
  updates: GroupUpdatePayload,
  token: string,
): Promise<GroupAdminRecord> {
  const payload = await authenticatedRequest<unknown>(
    `/api/groups/${groupuuid}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    },
  );
  const root = asRecord(payload);
  const source = asRecord(root?.data) || root;
  return normalizeGroupAdminRecord(source?.group || source, groupuuid);
}

export async function deleteGroup(
  groupuuid: string,
  token: string,
): Promise<void> {
  await authenticatedRequest(`/api/groups/${groupuuid}`, token, {
    method: "DELETE",
  });
}

function parseBackgroundResult(
  payload: Record<string, unknown>,
): GroupBackgroundResult {
  return {
    success: payload.success === true,
    imageUrl:
      optionalString(payload.imageUrl) || optionalString(payload.backgroundImage),
    ...(typeof payload.cached === "boolean" ? { cached: payload.cached } : {}),
    ...(typeof payload.regenerated === "boolean"
      ? { regenerated: payload.regenerated }
      : {}),
    ...(typeof payload.fallback === "boolean"
      ? { fallback: payload.fallback }
      : {}),
    ...(typeof payload.error === "string" ? { error: payload.error } : {}),
  };
}

export async function regenerateGroupBackground(
  groupuuid: string,
  token: string,
): Promise<GroupBackgroundResult> {
  const payload = await authenticatedRequest<Record<string, unknown>>(
    `/api/groups/${groupuuid}/background-image`,
    token,
    { method: "POST", body: JSON.stringify({ action: "generate" }) },
  );
  return parseBackgroundResult(payload);
}

export async function selectGroupBackground(
  groupuuid: string,
  imageUrl: string,
  token: string,
): Promise<GroupBackgroundResult> {
  const payload = await authenticatedRequest<Record<string, unknown>>(
    `/api/groups/${groupuuid}/background-image`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ action: "select", imageUrl }),
    },
  );
  return parseBackgroundResult(payload);
}

export async function uploadGroupBackground(
  groupuuid: string,
  imageData: string,
  token: string,
): Promise<GroupBackgroundResult> {
  const payload = await authenticatedRequest<Record<string, unknown>>(
    `/api/groups/${groupuuid}/background-image`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ action: "upload", imageData }),
    },
  );
  return parseBackgroundResult(payload);
}

export async function previewGroupContent(
  input: GroupPreviewPayload,
  token: string,
): Promise<GroupPreviewResult> {
  const payload = await authenticatedRequest<Record<string, unknown>>(
    "/api/groups/preview",
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return {
    purpose: optionalString(payload.purpose) || "",
    scriptureReferences: normalizeScriptureReferences(
      payload.scriptureReferences,
    ),
  };
}

export async function createGroup(
  input: GroupCreatePayload,
  token: string,
): Promise<{ groupuuid: string; name: string }> {
  const data = await authenticatedRequest<{
    group?: { groupuuid?: string; name?: string };
  }>("/api/groups", token, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      description: input.description || input.name,
      purpose: input.purpose,
      scriptureReferences: input.scriptureReferences,
      creationMetadata: input.creationMetadata,
    }),
  });
  const groupuuid = data.group?.groupuuid;
  if (!groupuuid) throw new Error("The group could not be created.");
  return { groupuuid, name: data.group?.name || input.name };
}

export async function leaveGroup(
  groupuuid: string,
  token: string,
): Promise<void> {
  await authenticatedRequest(`/api/groups/${groupuuid}/leave`, token, {
    method: "POST",
  });
}

export async function getPrayerGroupSurface(
  groupuuid: string,
  token: string,
): Promise<PrayerGroupSurfaceData> {
  try {
    const aggregate = await authenticatedRequest<unknown>(
      `/api/mobile/groups/${groupuuid}`,
      token,
    );
    const normalized = normalizeGroupSurface(aggregate, groupuuid);
    if (normalized) return normalized;
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status === 401 || status === 403) throw error;
  }

  const [groupData, membersData, messagesData, countsData, backgroundData] =
    await Promise.all([
      authenticatedRequest<Record<string, unknown>>(
        `/api/groups/${groupuuid}`,
        token,
      ),
      authenticatedRequest<{ members?: unknown[] }>(
        `/api/groups/${groupuuid}/members`,
        token,
      ),
      authenticatedRequest<{ messages?: unknown[] }>(
        `/api/groups/${groupuuid}/chat/messages?limit=10`,
        token,
      ),
      authenticatedRequest<{ prayerCounts?: Record<string, PrayerCount> }>(
        `/api/groups/${groupuuid}/chat/prayers`,
        token,
      ),
      authenticatedRequest<{ imageUrl?: string }>(
        `/api/groups/${groupuuid}/background-image`,
        token,
      ).catch(() => ({ imageUrl: undefined })),
    ]);

  const normalized = normalizeGroupSurface(
    {
      group: groupData.group,
      isAdmin: groupData.isAdmin,
      isMember: true,
      members: membersData.members || [],
      messages: messagesData.messages || [],
      prayerCounts: countsData.prayerCounts || {},
      backgroundImage: backgroundData.imageUrl,
      hasMoreMessages: (messagesData.messages || []).length >= 10,
    },
    groupuuid,
  );
  if (!normalized) throw new Error("The group response was incomplete.");
  return normalized;
}

export async function getGroupMessages(
  groupuuid: string,
  token: string,
  options: { limit?: number; before?: string } = {},
): Promise<GroupMessage[]> {
  const query = new URLSearchParams({
    limit: String(options.limit || 10),
  });
  if (options.before) query.set("before", options.before);
  const data = await authenticatedRequest<{ messages?: GroupMessage[] }>(
    `/api/groups/${groupuuid}/chat/messages?${query.toString()}`,
    token,
  );
  return data.messages || [];
}

export async function sendGroupMessage(
  groupuuid: string,
  content: string,
  token: string,
): Promise<GroupMessage> {
  const data = await authenticatedRequest<{ message: GroupMessage }>(
    `/api/groups/${groupuuid}/chat/messages`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ content: content.trim() }),
    },
  );
  return data.message;
}

export async function getGroupPrayerCounts(
  groupuuid: string,
  token: string,
): Promise<Record<string, PrayerCount>> {
  const data = await authenticatedRequest<{
    prayerCounts?: Record<string, PrayerCount>;
  }>(`/api/groups/${groupuuid}/chat/prayers`, token);
  return data.prayerCounts || {};
}

export async function getPrayerResponses(
  groupuuid: string,
  messageId: string,
  token: string,
): Promise<PrayerResponse[]> {
  const query = new URLSearchParams({
    previousPrayers: "true",
    messageId,
  });
  const data = await authenticatedRequest<{
    previousPrayers?: PrayerResponse[];
  }>(`/api/groups/${groupuuid}/chat/prayers?${query.toString()}`, token);
  return data.previousPrayers || [];
}

export async function acknowledgeOfferedPrayer(
  groupuuid: string,
  messageId: string,
  prayerId: string,
  token: string,
): Promise<string[]> {
  const data = await authenticatedRequest<{ acknowledgedBy?: string[] }>(
    `/api/groups/${groupuuid}/chat/prayers`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        messageId,
        acknowledgePrayerId: prayerId,
      }),
    },
  );
  return data.acknowledgedBy || [];
}

export async function deleteGroupMessage(
  groupuuid: string,
  messageId: string,
  token: string,
): Promise<void> {
  const query = new URLSearchParams({ messageId });
  await authenticatedRequest(
    `/api/groups/${groupuuid}/chat/messages?${query.toString()}`,
    token,
    { method: "DELETE" },
  );
}

export async function deleteOfferedPrayer(
  groupuuid: string,
  prayerId: string,
  token: string,
): Promise<void> {
  const query = new URLSearchParams({ prayerId });
  await authenticatedRequest(
    `/api/groups/${groupuuid}/chat/prayers?${query.toString()}`,
    token,
    { method: "DELETE" },
  );
}

export async function reportGroupContent(
  groupuuid: string,
  payload: {
    contentType: "request" | "response";
    contentId: string;
    reason: string;
  },
  token: string,
): Promise<void> {
  await authenticatedRequest(`/api/groups/${groupuuid}/reports`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function blockGroupMember(
  blockedClerkId: string,
  token: string,
): Promise<void> {
  await authenticatedRequest("/api/user/blocks", token, {
    method: "POST",
    body: JSON.stringify({ blockedClerkId }),
  });
}

export async function prayForGroupMessage(
  groupuuid: string,
  messageId: string,
  token: string,
  prayerText?: string,
): Promise<number> {
  const data = await authenticatedRequest<{ prayerCount?: number }>(
    `/api/groups/${groupuuid}/chat/prayers`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        messageId,
        ...(prayerText?.trim() ? { prayerText: prayerText.trim() } : {}),
      }),
    },
  );
  return data.prayerCount || 0;
}

export async function generateGroupPrayer(
  groupuuid: string,
  payload:
    | {
        type: "request";
        categories: string;
        memberName?: string | null;
        requestContext?: string;
        groupPurpose?: string | null;
        groupName: string;
      }
    | {
        type: "response";
        prayerRequest: string;
        memberName?: string | null;
        categories?: string[];
      },
  token: string,
): Promise<string> {
  const data = await authenticatedRequest<{ prayerText?: string }>(
    `/api/groups/${groupuuid}/chat/generate-prayer`,
    token,
    { method: "POST", body: JSON.stringify(payload) },
  );
  if (!data.prayerText) throw new Error("No prayer text was generated.");
  return data.prayerText;
}

export async function inviteGroupMember(
  groupuuid: string,
  firstName: string,
  phone: string,
  skipSMS: boolean,
  customMessage: string | undefined,
  token: string,
): Promise<GroupInviteResult> {
  return authenticatedRequest<GroupInviteResult>(
    `/api/groups/${groupuuid}/members`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        firstName: firstName.trim(),
        phone,
        skipSMS,
        ...(customMessage?.trim()
          ? { customMessage: customMessage.trim() }
          : {}),
      }),
    },
  );
}

export async function removeGroupMember(
  groupuuid: string,
  memberId: string,
  token: string,
): Promise<void> {
  await authenticatedRequest(
    `/api/groups/${groupuuid}/members/${memberId}`,
    token,
    { method: "DELETE" },
  );
}

export async function getGroupDetail(
  groupuuid: string,
  token: string,
): Promise<{ group: GroupDetail; prayers: HomePrayerCard[] }> {
  const [groupData, prayerData] = await Promise.all([
    authenticatedRequest<{ group: GroupDetail }>(
      `/api/groups/${groupuuid}`,
      token,
    ),
    authenticatedRequest<{
      prayers: {
        prayeruuid?: string;
        prayerText?: {
          title?: string;
          text?: string;
          textClean?: string;
          verse?: string;
        };
        audio?: {
          enabled?: boolean;
          settings?: {
            backgroundMusicUrl?: string | null;
            backgroundMusicVolume?: number;
          };
          files?: { narration?: string | null };
        };
        backgroundImage?: string;
        createdAt?: string;
      }[];
    }>(
      `/api/groups/${groupuuid}/prayers`,
      token,
    ),
  ]);
  return {
    group: groupData.group,
    prayers: (prayerData.prayers || []).map((prayer, index) => {
      const text =
        prayer.prayerText?.textClean || prayer.prayerText?.text || "";
      return {
        prayeruuid: prayer.prayeruuid,
        title: prayer.prayerText?.title || "Group prayer",
        verse: prayer.prayerText?.verse || "",
        text,
        fullPrayer: text,
        image: prayer.backgroundImage || `/cover${(index % 6) + 1}.jpg`,
        date: prayer.createdAt,
        narrationUrl: prayer.audio?.files?.narration || null,
        backgroundMusicUrl: prayer.audio?.settings?.backgroundMusicUrl || null,
        backgroundMusicVolume: prayer.audio?.settings?.backgroundMusicVolume,
        audioAvailable:
          prayer.audio?.enabled === true &&
          Boolean(prayer.audio?.files?.narration),
      };
    }),
  };
}

export async function listPrayerCards(
  token: string,
  options: { before?: string } = {},
): Promise<{
  cards: HomePrayerCard[];
  hasMore: boolean;
  nextBefore?: string;
}> {
  const query = new URLSearchParams({ limit: "30" });
  if (options.before) query.set("before", options.before);
  const data = await authenticatedRequest<{
    cards?: HomePrayerCard[];
    hasMore?: boolean;
    nextBefore?: string;
  }>(`/api/mobile/prayers?${query.toString()}`, token);
  return {
    cards: data.cards || [],
    hasMore: Boolean(data.hasMore),
    nextBefore: data.nextBefore,
  };
}

export async function deletePrayerCard(
  prayeruuid: string,
  token: string,
): Promise<void> {
  await authenticatedRequest(`/api/prayers/${prayeruuid}`, token, {
    method: "DELETE",
  });
}

export async function publishPrayerCard(
  prayeruuid: string,
  token: string,
): Promise<void> {
  await authenticatedRequest(`/api/prayers/${prayeruuid}`, token, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getPrayer(
  prayeruuid: string,
  token: string,
): Promise<HomePrayerCard> {
  const data = await authenticatedRequest<{
    prayer: {
      prayeruuid: string;
      prayerText?: {
        title?: string;
        text?: string;
        textClean?: string;
        verse?: string;
      };
      audio?: {
        enabled?: boolean;
        generationStatus?: "pending" | "ready" | "failed";
        settings?: {
          backgroundMusicUrl?: string | null;
          backgroundMusicVolume?: number;
        };
        files?: { narration?: string | null };
      };
      backgroundImage?: string;
      createdAt?: string;
    };
  }>(`/api/prayers/${prayeruuid}`, token);
  const prayer = data.prayer;
  const text = prayer.prayerText?.textClean || prayer.prayerText?.text || "";
  return {
    prayeruuid: prayer.prayeruuid,
    title: prayer.prayerText?.title || "Prayer",
    verse: prayer.prayerText?.verse || "",
    text,
    fullPrayer: text,
    image: prayer.backgroundImage || "/cover1.jpg",
    date: prayer.createdAt,
    narrationUrl: prayer.audio?.files?.narration || null,
    backgroundMusicUrl: prayer.audio?.settings?.backgroundMusicUrl || null,
    backgroundMusicVolume: prayer.audio?.settings?.backgroundMusicVolume,
    audioAvailable:
      prayer.audio?.enabled === true && Boolean(prayer.audio?.files?.narration),
    audioStatus: prayer.audio?.generationStatus,
  };
}

export async function trackPrayerShare(
  prayeruuid: string,
  token: string,
): Promise<void> {
  await authenticatedRequest(
    `/api/prayers/${prayeruuid}/analytics/share`,
    token,
    { method: "PUT" },
  );
}

export async function deleteAccount(token: string): Promise<void> {
  await authenticatedRequest("/api/user/profile", token, { method: "DELETE" });
}

export async function searchCommunities(query: string): Promise<{
  communities: Community[];
  error?: string;
}> {
  const response = await fetch(
    `${API_BASE}/api/mobile/communities/search?q=${encodeURIComponent(query)}`,
  );
  const data = await response.json();
  if (data.success) {
    return {
      communities: data.communities || [],
      error: data.error,
    };
  }
  return {
    communities: [],
    error: data.error || "Search temporarily unavailable",
  };
}

export async function joinCommunity(
  communityuuid: string,
  token: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/mobile/communities/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ communityuuid }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to join community");
  }
}

export async function setActiveCommunity(
  communityuuid: string | null,
  token: string,
): Promise<void> {
  await authenticatedRequest("/api/user/settings", token, {
    method: "PUT",
    body: JSON.stringify({ communityuuid }),
  });
}

export async function updatePersonalPlan(
  action: "start_trial" | "subscribe_placeholder" | "cancel",
  token: string,
): Promise<PersonalPlan> {
  const data = await authenticatedRequest<{ plan: PersonalPlan }>(
    "/api/user/plan",
    token,
    {
      method: "POST",
      body: JSON.stringify({ action }),
    },
  );
  return data.plan;
}

export async function registerPushToken(
  pushToken: string,
  platform: "ios" | "android",
  token: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/mobile/push-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pushToken, platform }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to register push token");
  }
}

export function clerkErrorMessage(err: unknown, fallback: string): string {
  const anyErr = err as {
    errors?: { longMessage?: string; message?: string }[];
    message?: string;
  };
  return (
    anyErr?.errors?.[0]?.longMessage ||
    anyErr?.errors?.[0]?.message ||
    anyErr?.message ||
    fallback
  );
}
