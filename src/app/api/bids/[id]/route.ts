import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateBidSchema } from "@/lib/validations";
import {
  acceptBid,
  rejectBid,
  withdrawBid,
} from "@/controllers/bidController";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateBidSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid" }, { status: 400 });

  const uid = session.user.id;
  const res =
    parsed.data.action === "accept"
      ? await acceptBid(id, uid)
      : parsed.data.action === "reject"
        ? await rejectBid(id, uid)
        : await withdrawBid(id, uid);

  if (!res.ok) {
    const status =
      res.error === "bid_not_found"
        ? 404
        : res.error === "forbidden"
          ? 403
          : 400;
    return NextResponse.json({ error: res.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
