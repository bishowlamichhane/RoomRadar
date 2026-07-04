import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { z } from "zod";
import { registerSchema } from "@/lib/validations";

export async function registerUser(data: z.infer<typeof registerSchema>) {
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) return { error: "email_taken" as const };
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
    },
    select: { id: true, name: true, email: true, role: true },
  });
  return { user };
}

export async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { listings: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function setUserRole(id: string, role: string) {
  return prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, role: true },
  });
}

export async function deleteUser(id: string) {
  await prisma.user.delete({ where: { id } });
  return { ok: true as const };
}
