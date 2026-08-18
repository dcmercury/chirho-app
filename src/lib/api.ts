import { API_BASE } from "./assets";
import type {
  GroupDetail,
  HomeCommunity,
  HomePrayerCard,
  MobileHomeResponse,
} from "../types/home";
import type {
  GroupInviteResult,
  GroupMember,
  GroupMessage,
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
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      (data as { error?: string }).error || `Request failed (${response.status})`,
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return data as T;
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
  const members: GroupMember[] = rawMembers.map((item, index) => {
    const member =
      item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : {};
    const rawProfile =
      member.profile && typeof member.profile === "object"
        ? (member.profile as Record<string, unknown>)
        : member.userId
          ? member
          : null;
    return {
      memberId: String(member.memberId || member.id || index),
      clerkuuid:
        typeof member.clerkuuid === "string"
          ? member.clerkuuid
          : typeof member.userId === "string"
            ? member.userId
            : null,
      firstName:
        typeof member.firstName === "string" ? member.firstName : null,
      phone: typeof member.phone === "string" ? member.phone : null,
      status:
        member.status === "pending" ||
        member.status === "removed" ||
        member.status === "declined"
          ? member.status
          : "active",
      role: member.role === "admin" ? "admin" : "member",
      prayerCategories: Array.isArray(member.prayerCategories)
        ? member.prayerCategories.filter(
            (category): category is string => typeof category === "string",
          )
        : [],
      profile: rawProfile
        ? {
            firstName:
              typeof rawProfile.firstName === "string"
                ? rawProfile.firstName
                : null,
            lastName:
              typeof rawProfile.lastName === "string"
                ? rawProfile.lastName
                : null,
            avatar:
              typeof rawProfile.avatar === "string"
                ? rawProfile.avatar
                : typeof rawProfile.imageUrl === "string"
                  ? rawProfile.imageUrl
                  : null,
            phoneNumber:
              typeof rawProfile.phoneNumber === "string"
                ? rawProfile.phoneNumber
                : null,
          }
        : null,
    };
  });
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
            }
          | null;
      }
    | MobileHomeResponse["home"]
  >("/api/mobile/home", token);
  if (!("home" in data)) return { home: data, community: null };
  const rawCommunity = data.community;
  const community =
    rawCommunity && "activeBackground" in rawCommunity
      ? {
          communityuuid: rawCommunity.communityuuid,
          name: rawCommunity.name,
          location: rawCommunity.location || undefined,
          tradition: rawCommunity.tradition,
          logo: rawCommunity.branding?.logo || null,
          backgroundImage: rawCommunity.activeBackground?.url || null,
        }
      : rawCommunity;
  return { home: data.home, community };
}

export async function generateLovedOnePrayer(
  lovedOneId: string,
  backgroundImage: string,
  token: string,
  textOnly: boolean,
): Promise<HomePrayerCard> {
  const data = await authenticatedRequest<{
    prayer: {
      prayeruuid?: string;
      title?: string;
      text?: string;
      textClean?: string;
      verse?: string;
      backgroundImage?: string;
    };
  }>(`/api/user/prayers/loved-one/${lovedOneId}/generate`, token, {
    method: "POST",
    body: JSON.stringify({ textOnly, backgroundImage }),
  });
  const text = data.prayer.textClean || data.prayer.text || "";
  return {
    prayeruuid: data.prayer.prayeruuid,
    title: data.prayer.title || "Prayer",
    verse: data.prayer.verse || "",
    text,
    fullPrayer: text,
    image: data.prayer.backgroundImage || backgroundImage,
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
  categories: string[],
  token: string,
): Promise<void> {
  await authenticatedRequest(
    `/api/user/profile/loved-ones/${lovedOneId}/daily-prayer/config`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        configurations: categories.map((category) => ({
          category: category.toLowerCase(),
          virtues: ["love", "peace", "grace"],
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
      };
    }),
  };
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
