import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateBookingSchema } from "@/lib/validations";
import {
  confirmBooking,
  declineBooking,
  completeBooking,
} from "@/controllers/bookingController";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateBookingSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid" }, { status: 400 });

  const uid = session.user.id;
  const res =
    parsed.data.action === "confirm"
      ? await confirmBooking(id, uid)
      : parsed.data.action === "decline"
        ? await declineBooking(id, uid)
        : await completeBooking(id, uid);

  if (!res.ok) {
    const status =
      res.error === "booking_not_found"
        ? 404
        : res.error === "forbidden"
          ? 403
          : 400;
    return NextResponse.json({ error: res.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
