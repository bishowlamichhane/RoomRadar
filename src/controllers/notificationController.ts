import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

/**
 * Create a notification. Callers inside a transaction should pass the tx
 * client so the notification is written atomically with the state change
 * that produced it.
 */
export async function notify(
  client: Prisma.TransactionClient | typeof prisma,
  args: {
    userId: string;
    type: NotificationType;
    message: string;
    bookingId?: string;
  },
) {
  return client.notification.create({
    data: {
      userId: args.userId,
      type: args.type,
      message: args.message,
      bookingId: args.bookingId ?? null,
    },
  });
}

export async function listNotifications(userId: string, limit = 30) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markRead(id: string, userId: string) {
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n) return { ok: false as const, error: "not_found" as const };
  if (n.userId !== userId)
    return { ok: false as const, error: "forbidden" as const };
  await prisma.notification.update({ where: { id }, data: { read: true } });
  return { ok: true as const };
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return { ok: true as const };
}
