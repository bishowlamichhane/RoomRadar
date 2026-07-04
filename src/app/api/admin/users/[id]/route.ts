import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setUserRole, deleteUser } from "@/controllers/userController";
import { ROLES } from "@/lib/constants";
import { z } from "zod";

const roleSchema = z.object({ role: z.enum(ROLES) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  const updated = await setUserRole(id, parsed.data.role);
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  if (session.user.id === id)
    return NextResponse.json({ error: "cannot_delete_self" }, { status: 400 });
  await deleteUser(id);
  return NextResponse.json({ ok: true });
}
