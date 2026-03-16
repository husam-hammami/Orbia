import webPush from "web-push";
import { db } from "../db";
import { pushSubscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    "mailto:orbia@myorbia.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  try {
    const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    const results = await Promise.allSettled(
      subs.map((sub) =>
        webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        ).catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
          }
          throw err;
        })
      )
    );
    const sent = results.filter((r) => r.status === "fulfilled").length;
    console.log(`[push] sent ${sent}/${subs.length} to user ${userId}`);
    return sent;
  } catch (err: any) {
    console.error("[push] sendPushToUser error:", err.message);
    return 0;
  }
}
