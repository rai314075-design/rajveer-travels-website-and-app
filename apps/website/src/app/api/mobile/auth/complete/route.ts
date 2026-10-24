import { createHash, randomBytes } from "node:crypto";
import { getSession } from "@auth0/nextjs-auth0";
import { NextRequest, NextResponse } from "next/server";
import { isAllowedMobileAuthRedirect } from "@/lib/mobileAuthRedirect";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Return a short lived, one-time code after the Auth0 browser session completes. */
export async function GET(request: NextRequest) {
  const redirectUri = request.nextUrl.searchParams.get("redirectUri");
  if (!redirectUri || !isAllowedMobileAuthRedirect(redirectUri)) {
    return NextResponse.json({ error: "Invalid mobile sign-in callback." }, { status: 400 });
  }

  const session = await getSession();
  const auth0Id = session?.user?.sub;
  if (!auth0Id) {
    return NextResponse.json({ error: "Please sign in with Google again." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { auth0Id },
    select: { id: true, bannedUntil: true },
  });
  if (!user || (user.bannedUntil && user.bannedUntil > new Date())) {
    return NextResponse.json({ error: "This account cannot sign in right now." }, { status: 403 });
  }

  const now = new Date();
  await prisma.mobileAuthCode.deleteMany({ where: { expiresAt: { lte: now } } });
  const code = randomBytes(32).toString("base64url");
  const codeHash = createHash("sha256").update(code).digest("hex");
  await prisma.mobileAuthCode.create({
    data: { codeHash, userId: user.id, expiresAt: new Date(now.getTime() + 5 * 60 * 1000) },
  });

  const callback = new URL(redirectUri);
  callback.searchParams.set("code", code);
  const response = NextResponse.redirect(callback);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
