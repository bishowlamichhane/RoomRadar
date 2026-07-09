import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { bookingSchema } from "@/lib/validations";
import { requestTour } from "@/controllers/bookingController";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400 },
    );

  const res = await requestTour(id, session.user.id, parsed.data);
  if (!res.ok) {
    const status =
      res.error === "listing_not_found"
        ? 404
        : res.error === "self_booking"
          ? 403
          : 400;
    return NextResponse.json({ error: res.error }, { status });
  }
  return NextResponse.json({ ok: true, bookingId: res.bookingId }, { status: 201 });
}
