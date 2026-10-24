import { handleAuth, handleCallback, handleLogin, handleLogout } from "@auth0/nextjs-auth0";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { isAllowedMobileAuthRedirect } from "@/lib/mobileAuthRedirect";
import { getRequestOrigin } from "@/lib/requestOrigin";
import { safeReturnTo } from "@/lib/safeReturnTo";
export const dynamic = "force-dynamic";

function getWebsiteLogoutUrl(req: NextRequest): string {
  // AUTH0_BASE_URL is the website origin configured for the Auth0 SDK. Keeping
  // logout tied to it prevents Auth0 from returning the browser to an Expo URL
  // that may also be present in the tenant's Allowed Logout URLs.
  const configuredBaseUrl = process.env.AUTH0_BASE_URL;
  if (configuredBaseUrl) {
    try {
      const configuredUrl = new URL(configuredBaseUrl);
      if (configuredUrl.protocol === "http:" || configuredUrl.protocol === "https:") {
        return new URL("/", configuredUrl).toString();
      }
    } catch {
      console.error("AUTH0_BASE_URL must be an absolute website URL");
    }
  }

  return new URL("/", getRequestOrigin(req)).toString();
}


// Wraps the Auth0 callback so a matching User row is created in Postgres
// the first time someone logs in (auth0Id, email, name synced from the Auth0 profile).
export const GET = handleAuth({
  callback: async (req: NextRequest, ctx: any) => {
    return handleCallback(req, ctx, {
      // Use the authority that received the callback, so mobile development can
      // use the developer machine's LAN host as well as localhost.
      redirectUri: new URL("/api/auth/callback", getRequestOrigin(req)).toString(),
      afterCallback: async (_req: NextRequest, session: any) => {
        if (session?.user) {
          const email = (session.user.email ?? `${session.user.sub.replace(/[^a-zA-Z0-9]/g, "_")}@phone.local`).toLowerCase();
          const phone = session.user.phone_number ?? null;
          // If this verified Google email already has an email/password account,
          // attach Auth0 to that row so the website and mobile app share one user.
          if (session.user.email_verified === true && session.user.email) {
            const existingEmailAccount = await prisma.user.findUnique({
              where: { email },
              select: { id: true, auth0Id: true },
            });
            if (existingEmailAccount && !existingEmailAccount.auth0Id) {
              await prisma.user.update({
                where: { id: existingEmailAccount.id },
                data: {
                  auth0Id: session.user.sub,
                  emailVerified: true,
                  ...(phone ? { phone, phoneVerified: session.user.phone_number_verified === true } : {}),
                },
              });
              return session;
            }
          }
          await prisma.user.upsert({
            where: { auth0Id: session.user.sub },
            update: {
              name: session.user.name ?? "Traveler",
              // The email is set once at registration and never re-synced, so
              // it cannot drift if the identity provider changes it later.
              ...(phone ? { phone, phoneVerified: session.user.phone_number_verified === true } : {}),
              ...(session.user.email_verified === true ? { emailVerified: true } : {}),
            },
            create: {
              auth0Id: session.user.sub,
              name: session.user.name ?? "Traveler",
              email,
              phone,
              phoneVerified: session.user.phone_number_verified === true,
              emailVerified: session.user.email_verified === true,
              role: email === process.env.ADMIN_EMAIL?.toLowerCase() ? "ADMIN" : "USER",
              isSuperAdmin: email === process.env.ADMIN_EMAIL?.toLowerCase(),
            },
          });
        }
        return session;
      },
    });
  },
  login: (req: NextRequest, ctx: any) => {
    const method = req.nextUrl.searchParams.get("method");
    const mobileRedirect = req.nextUrl.searchParams.get("redirectUri");
    const mobileGoogle = method === "google" && req.nextUrl.searchParams.get("client") === "mobile";
    if (mobileGoogle && (!mobileRedirect || !isAllowedMobileAuthRedirect(mobileRedirect))) {
      return NextResponse.json({ error: "Invalid mobile sign-in callback." }, { status: 400 });
    }
    const mobileReturnTo = mobileGoogle
      ? `/api/mobile/auth/complete?redirectUri=${encodeURIComponent(mobileRedirect!)}`
      : null;
    const returnTo = mobileReturnTo ?? safeReturnTo(req.nextUrl.searchParams.get("returnTo"));
    const connection = method === "google"
      ? process.env.AUTH0_GOOGLE_CONNECTION
      : method === "phone"
        ? process.env.AUTH0_PHONE_CONNECTION
        : undefined;
    const mobileCallback = mobileGoogle
      ? new URL("/api/auth/callback", getRequestOrigin(req)).toString()
      : undefined;

    return handleLogin(req, ctx, {
      returnTo,
      authorizationParams: {
        ...(mobileCallback ? { redirect_uri: mobileCallback } : {}),
        ...(connection ? { connection } : {}),
      },
    });
  },
  logout: async (req: NextRequest, ctx: any) => {
    const response = await handleLogout(req, ctx, {
      returnTo: getWebsiteLogoutUrl(req),
    }) as NextResponse;
    response.cookies.set("session_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return response;
  },
  // Auth0 authorization codes and the transaction (state) cookie are single-use.
  // Replaying a callback — browser refresh/back, double submit, a prefetched
  // link — can fail with `invalid_grant` or a missing state cookie. Avoid sending
  // the visitor into a login-page loop for these stale callback requests.
  onError: (req: NextRequest, error: any) => {
    const cause = error?.cause;
    const isReplay =
      cause?.error === "invalid_grant" ||
      cause?.errorDescription === "Invalid authorization code" ||
      cause?.name === "MissingStateCookieError" ||
      cause?.name === "MalformedStateCookieError" ||
      /invalid_grant|Invalid authorization code|Missing state cookie/i.test(error?.message || "");

    if (isReplay) {
      console.warn("Auth0 callback replayed — redirecting to login");
      return NextResponse.redirect(new URL("/", req.url));
    }

    console.error("Auth0 error", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: error?.status || 500 });
  },
});
