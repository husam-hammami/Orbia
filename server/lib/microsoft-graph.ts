import { db } from "../db";
import { microsoftConnections } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0";
const GRAPH_API_URL = "https://graph.microsoft.com/v1.0";

const SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "Calendars.Read",
  "Chat.Read",
  "Chat.ReadWrite",
  "User.Read",
];

export function getAuthUrl(state: string): string {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error("Microsoft OAuth not configured");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    response_mode: "query",
    state,
    prompt: "consent",
  });

  return `${MICROSOFT_AUTH_URL}/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

  const response = await fetch(`${MICROSOFT_AUTH_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      code,
      redirect_uri: redirectUri!,
      grant_type: "authorization_code",
      scope: SCOPES.join(" "),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  const response = await fetch(`${MICROSOFT_AUTH_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: SCOPES.join(" "),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
  };
}

export async function getValidToken(userId: string): Promise<string | null> {
  const [connection] = await db
    .select()
    .from(microsoftConnections)
    .where(and(eq(microsoftConnections.userId, userId), eq(microsoftConnections.status, "active")));

  if (!connection) return null;

  const now = new Date();
  const expiryBuffer = new Date(connection.tokenExpiry.getTime() - 5 * 60 * 1000);

  if (now < expiryBuffer) {
    return connection.accessToken;
  }

  try {
    const refreshed = await refreshAccessToken(connection.refreshToken);
    const newExpiry = new Date(Date.now() + refreshed.expiresIn * 1000);

    await db
      .update(microsoftConnections)
      .set({
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        tokenExpiry: newExpiry,
      })
      .where(eq(microsoftConnections.id, connection.id));

    return refreshed.accessToken;
  } catch (error) {
    console.error("Failed to refresh Microsoft token:", error);
    await db
      .update(microsoftConnections)
      .set({ status: "expired" })
      .where(eq(microsoftConnections.id, connection.id));
    return null;
  }
}

async function graphRequest(token: string, endpoint: string, options?: RequestInit) {
  const response = await fetch(`${GRAPH_API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Graph API error (${response.status}): ${error}`);
  }

  return response.json();
}

export async function getProfile(token: string) {
  return graphRequest(token, "/me");
}

export async function getCalendarEvents(token: string, startDate: string, endDate: string) {
  const params = new URLSearchParams({
    startDateTime: startDate,
    endDateTime: endDate,
    $orderby: "start/dateTime",
    $top: "50",
    $select: "id,subject,start,end,location,organizer,attendees,isOnlineMeeting,onlineMeetingUrl,bodyPreview",
  });

  return graphRequest(token, `/me/calendarView?${params.toString()}`);
}

export async function getRecentChats(token: string) {
  return graphRequest(token, "/me/chats?$top=20&$orderby=lastUpdatedDateTime desc&$expand=lastMessagePreview");
}

export async function getChatMessages(token: string, chatId: string) {
  return graphRequest(token, `/me/chats/${chatId}/messages?$top=30&$orderby=createdDateTime desc`);
}

export async function sendChatMessage(token: string, chatId: string, content: string) {
  return graphRequest(token, `/me/chats/${chatId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      body: { contentType: "text", content },
    }),
  });
}
