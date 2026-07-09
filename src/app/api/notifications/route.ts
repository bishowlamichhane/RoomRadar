import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  listNotifications,
  markAllRead,
  unreadCount,
} from "@/controllers/notificationController";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [items, unread] = await Promise.all([
    listNotifications(session.user.id),
    unreadCount(session.user.id),
  ]);
  return NextResponse.json({ items, unread });
}

export async function PATCH() {
  // Mark-all-read shortcut.
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await markAllRead(session.user.id);
  return NextResponse.json({ ok: true });
}
