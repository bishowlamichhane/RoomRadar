import { NextRequest, NextResponse } from "next/server";
import { predictSchema } from "@/lib/validations";
import { predict } from "@/controllers/predictController";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = predictSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  return NextResponse.json(predict(parsed.data));
}
