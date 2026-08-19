export interface GroupScripture {
  citation: string;
  text: string;
  reason?: string;
}

export interface GroupSettings {
  isPublic: boolean;
  allowMemberInvites: boolean;
  tradition?: string | null;
  [key: string]: unknown;
}

export interface GroupCreationMetadata {
  groupType: string;
  contexts: string[];
  focuses: string[];
}

export interface GroupAdminRecord {
  groupuuid: string;
  name: string;
  description: string | null;
  purpose: string | null;
  scriptureReferences: GroupScripture[];
  backgroundImage: string | null;
  creationMetadata: GroupCreationMetadata | null;
  admin: string | null;
  parentEntity: {
    type: "church" | "ngo" | null;
    uuid: string | null;
  } | null;
  settings: GroupSettings;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: string | null;
  deletedAt: string | null;
  memberCount: number;
  memberClerkIds: string[];
}

export interface GroupUpdatePayload {
  purpose?: string | null;
  scriptureReferences?: GroupScripture[] | null;
  settings?: GroupSettings;
}

export interface GroupBackgroundResult {
  success: boolean;
  imageUrl: string | null;
  cached?: boolean;
  regenerated?: boolean;
  fallback?: boolean;
  error?: string;
}

export interface GroupPreviewPayload {
  groupType: string;
  contexts: string[];
  focuses: string[];
}

export interface GroupPreviewResult {
  purpose: string;
  scriptureReferences: GroupScripture[];
}

export interface GroupMemberProfile {
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  phoneNumber?: string | null;
}

export interface GroupMember {
  memberId: string;
  groupuuid?: string | null;
  clerkuuid: string | null;
  firstName?: string | null;
  phone?: string | null;
  status: "pending" | "active" | "removed" | "declined";
  role: "member" | "admin";
  prayerCategories: string[];
  profile: GroupMemberProfile | null;
  invitedBy?: string | null;
  invitedAt?: string | null;
  invitationToken?: string | null;
  invitationExpiresAt?: string | null;
  acceptedAt?: string | null;
  declinedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  removedAt?: string | null;
  removedBy?: string | null;
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
  prayerRequestCount: number;
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
