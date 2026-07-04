# 04 — Authentication (Auth.js / NextAuth v5, credentials)

Self-contained email+password auth with roles. No external providers, no API keys.

## Model requirement
The `User` model (see docs/07) has: `id`, `name`, `email` (unique), `passwordHash`, `role` (`SEEKER | OWNER | ADMIN`), timestamps.

## `src/lib/auth.ts` — the Auth.js config
Create the NextAuth v5 instance. Key points:
- Credentials provider that looks up the user by email and verifies the password with `bcryptjs.compare`.
- JWT session strategy (no DB sessions — simpler with SQLite).
- Put `role` and `id` into the token and expose them on `session.user`.
- Export `handlers`, `auth`, `signIn`, `signOut`.

Shape to implement (adapt to exact v5 beta API; verify against installed version):
```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) { token.id = (user as any).id; token.role = (user as any).role; }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
});
```

## `src/app/api/auth/[...nextauth]/route.ts`
```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

## Registration — `src/app/api/register/route.ts`
- Validate body with `registerSchema` (Zod).
- Reject if email already exists.
- Hash password with `bcrypt.hash(password, 10)`.
- Create user with chosen `role` (only `SEEKER` or `OWNER` allowed from the public form; never let the client set `ADMIN`).
- Return 201 (no password in response).

## Registration & login pages
- `src/app/(auth)/register/page.tsx` — form (name, email, password, role select: Seeker/Owner). POST to `/api/register`, then call client `signIn("credentials", …)` or redirect to `/login`.
- `src/app/(auth)/login/page.tsx` — form (email, password). Use the `signIn` server action or the client `signIn` from `next-auth/react`. On success redirect to `/dashboard` (owner) or `/` (seeker).

## Session access
- **Server components / route handlers**: `const session = await auth();` then read `session?.user`.
- Never trust the client for role — always re-check `session.user.role` server-side in protected controllers.

## Route protection — `src/middleware.ts`
Protect owner and admin areas. Use the `auth` export as middleware wrapper (v5 supports `export default auth((req) => {…})`).

Rules:
- `/dashboard`, `/listings/new`, `/listings/[id]/edit` → require a logged-in user (any role, but edit/new imply OWNER; enforce OWNER in the controller too).
- `/admin` and `/api/admin/*` → require `role === "ADMIN"`.
- Unauthenticated → redirect to `/login`. Wrong role → redirect to `/` (or 403 for API).

```ts
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user ? (req.auth.user as any).role : null;

  const needsAuth = ["/dashboard", "/listings/new"].some(p => nextUrl.pathname.startsWith(p))
    || /^\/listings\/[^/]+\/edit/.test(nextUrl.pathname);
  const needsAdmin = nextUrl.pathname.startsWith("/admin");

  if (needsAdmin && role !== "ADMIN") {
    return Response.redirect(new URL(isLoggedIn ? "/" : "/login", nextUrl));
  }
  if (needsAuth && !isLoggedIn) {
    return Response.redirect(new URL("/login", nextUrl));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/listings/new", "/listings/:id/edit", "/admin/:path*"],
};
```

## Type augmentation
Add `src/types/next-auth.d.ts` to extend `Session`/`User`/`JWT` with `id` and `role` so TypeScript stops complaining. Keep it minimal.

## Defence note
Be ready to explain: password hashing (bcrypt, salted), why JWT sessions, and how role-based access is enforced in both middleware (coarse) and controllers (authoritative).

## Seeded accounts (create in seed, list in README)
- Admin: `admin@roomradar.np` / `admin123`
- Owner: `owner@roomradar.np` / `owner123`
- Seeker: `seeker@roomradar.np` / `seeker123`
(Weak passwords are fine for a local demo; say so in README.)
