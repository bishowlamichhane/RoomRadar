import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteListing } from "@/controllers/listingController";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const res = await deleteListing(id, session.user.id, true);
  if ("error" in res)
    return NextResponse.json(
      { error: res.error },
      { status: res.error === "not_found" ? 404 : 403 },
    );
  return NextResponse.json({ ok: true });
}
