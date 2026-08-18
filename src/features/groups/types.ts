export interface GroupScripture {
  citation: string;
  text: string;
  reason?: string;
}

export interface GroupMemberProfile {
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  phoneNumber?: string | null;
}

export interface GroupMember {
  memberId: string;
  clerkuuid: string | null;
  firstName?: string | null;
  phone?: string | null;
  status: "pending" | "active" | "removed" | "declined";
  role: "member" | "admin";
  prayerCategories: string[];
  profile: GroupMemberProfile | null;
}

export interface GroupMessage {
  messageId: string;
  groupUuid: string;
  userId: string;
  content: string;
  timestamp: string;
  sequenceNumber: number;
}

export interface PrayerCount {
  count: number;
  userPraying: boolean;
}

export interface PrayerResponse {
  prayerText: string | null;
  createdAt: string;
  clerkId: string;
}

export interface PrayerGroup {
  groupuuid: string;
  name: string;
  purpose: string;
  description: string;
  backgroundImage: string | null;
  tradition: string | null;
  scripture: GroupScripture | null;
  memberCount: number;
  isAdmin: boolean;
  isMember: boolean;
  canInvite: boolean;
  canManageMembers: boolean;
  canLeave: boolean;
}

export interface PrayerGroupSurfaceData {
  group: PrayerGroup;
  members: GroupMember[];
  messages: GroupMessage[];
  prayerCounts: Record<string, PrayerCount>;
  hasMoreMessages: boolean;
}

export interface PrayerIntensity {
  category: string;
  intensity: number;
}

export interface GroupInviteResult {
  memberId: string;
  invitationToken: string;
  inviteLink: string;
  firstName?: string;
}

export type TokenProvider = () => Promise<string | null>;
