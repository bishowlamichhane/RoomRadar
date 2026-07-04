import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations";
import { registerUser } from "@/controllers/userController";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  const res = await registerUser(parsed.data);
  if ("error" in res)
    return NextResponse.json({ error: res.error }, { status: 409 });
  return NextResponse.json(res.user, { status: 201 });
}
