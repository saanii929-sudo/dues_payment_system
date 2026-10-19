import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import { Notification } from "@/models";
import type { SessionUser } from "@/lib/permissions/roles";

export interface NotificationSummary {
  id: string;
  type: string;
  channel: string;
  status: string;
  createdAt: string;
}

export async function listRecentNotifications(
  user: SessionUser,
  limit = 10,
): Promise<NotificationSummary[]> {
  await connectToDatabase();
  const notifications = await Notification.find({ recipientUserId: user.userId })
    .sort({ createdAt: -1 })
    .limit(limit);

  return notifications.map((notification) => ({
    id: notification._id.toString(),
    type: notification.type,
    channel: notification.channel,
    status: notification.status,
    createdAt: notification.createdAt.toISOString(),
  }));
}
