import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role ?? null;

  const needsAuth =
    ["/dashboard", "/listings/new"].some((p) =>
      nextUrl.pathname.startsWith(p),
    ) || /^\/listings\/[^/]+\/edit/.test(nextUrl.pathname);
  const needsAdmin = nextUrl.pathname.startsWith("/admin");

  if (needsAdmin && role !== "ADMIN") {
    return Response.redirect(
      new URL(isLoggedIn ? "/" : "/login", nextUrl),
    );
  }
  if (needsAuth && !isLoggedIn) {
    return Response.redirect(new URL("/login", nextUrl));
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/listings/new",
    "/listings/:id/edit",
    "/admin/:path*",
  ],
};
