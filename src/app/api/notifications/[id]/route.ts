import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markRead } from "@/controllers/notificationController";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const res = await markRead(id, session.user.id);
  if (!res.ok) {
    const status = res.error === "not_found" ? 404 : 403;
    return NextResponse.json({ error: res.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
