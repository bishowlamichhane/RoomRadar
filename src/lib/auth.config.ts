import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe subset of the Auth.js config used ONLY by `middleware.ts`.
 * Do NOT import Prisma, bcrypt, or anything Node-only from this file — it
 * has to fit inside Vercel's 1 MB Edge Middleware bundle.
 *
 * The Credentials provider (which needs Prisma + bcrypt) is added on top of
 * this base config inside `src/lib/auth.ts`, which runs in the Node runtime.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [], // real providers added in auth.ts (Node runtime only)
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
