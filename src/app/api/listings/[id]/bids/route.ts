import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { placeBidSchema } from "@/lib/validations";
import {
  placeBid,
  listBidsForListing,
  getBidSummary,
} from "@/controllers/bidController";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  // Public summary anyone can see; the full bid list is owner-only.
  const summary = await getBidSummary(id, session?.user?.id ?? null);
  if (!summary)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const url = new URL(_req.url);
  if (url.searchParams.get("all") === "1") {
    if (!session?.user)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const bids = await listBidsForListing(id);
    return NextResponse.json({ summary, bids });
  }
  return NextResponse.json({ summary });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = placeBidSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400 },
    );

  const result = await placeBid(id, session.user.id, parsed.data);
  if (!result.ok) {
    const status =
      result.error === "listing_not_found"
        ? 404
        : result.error === "self_bid" || result.error === "not_biddable"
          ? 403
          : 400;
    return NextResponse.json(
      { error: result.error, minNext: result.minNext },
      { status },
    );
  }
  return NextResponse.json({ ok: true, bidId: result.bidId }, { status: 201 });
}
