import { API_BASE } from "./assets";

export interface GroupInviteScripture {
  citation?: string | null;
  text?: string | null;
  reason?: string | null;
}

export interface GroupInvitation {
  token: string;
  groupName: string;
  groupuuid: string;
  inviterName: string | null;
  expiresAt: string;
  purpose?: string | null;
  scriptureReferences?: GroupInviteScripture[] | null;
  description?: string | null;
  createdAt?: string;
  memberCount?: number;
  firstName?: string | null;
  phoneLastFour?: string | null;
  adminName?: string | null;
  backgroundImage?: string | null;
}

export interface AcceptGroupInvitationResult {
  success: boolean;
  redirectUrl?: string;
  groupName?: string;
  hasExistingAccount?: boolean;
}

export class GroupInviteApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GroupInviteApiError";
    this.status = status;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!response.ok) {
    throw new GroupInviteApiError(
      data.error || `Request failed (${response.status})`,
      response.status,
    );
  }
  return data as T;
}

function invitePath(token: string): string {
  return `/api/groups/invite/${encodeURIComponent(token)}`;
}

function authenticatedHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getGroupInvitation(
  token: string,
  signal?: AbortSignal,
): Promise<GroupInvitation> {
  const response = await fetch(`${API_BASE}${invitePath(token)}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  const data = await parseResponse<{ invitation: GroupInvitation }>(response);
  return data.invitation;
}

export async function acceptGroupInvitation(
  invitationToken: string,
  sessionToken: string,
): Promise<AcceptGroupInvitationResult> {
  const response = await fetch(`${API_BASE}${invitePath(invitationToken)}`, {
    method: "POST",
    headers: {
      ...authenticatedHeaders(sessionToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "accept" }),
  });
  return parseResponse<AcceptGroupInvitationResult>(response);
}

export async function declineGroupInvitation(
  invitationToken: string,
  sessionToken: string,
): Promise<{ success: boolean; declined?: boolean }> {
  const response = await fetch(`${API_BASE}${invitePath(invitationToken)}`, {
    method: "POST",
    headers: {
      ...authenticatedHeaders(sessionToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "deny" }),
  });
  return parseResponse<{ success: boolean; declined?: boolean }>(response);
}

export async function updateGroupPrayerCategories(
  groupuuid: string,
  prayerCategories: string[],
  sessionToken: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/groups/${encodeURIComponent(groupuuid)}/members`,
    {
      method: "PATCH",
      headers: {
        ...authenticatedHeaders(sessionToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prayerCategories }),
    },
  );
  await parseResponse<{ success: boolean }>(response);
}
