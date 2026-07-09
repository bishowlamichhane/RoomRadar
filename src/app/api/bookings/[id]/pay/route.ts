import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { payForBooking } from "@/controllers/bookingController";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const res = await payForBooking(id, session.user.id);
  if (!res.ok) {
    const status =
      res.error === "booking_not_found"
        ? 404
        : res.error === "forbidden"
          ? 403
          : 400;
    return NextResponse.json({ error: res.error }, { status });
  }
  if (res.mode === "sandbox") {
    return NextResponse.json({
      ok: true,
      mode: res.mode,
      redirectUrl: res.redirectUrl,
      form: res.form,
    });
  }
  return NextResponse.json({ ok: true, mode: res.mode });
}
