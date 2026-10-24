import { cookies, headers } from "next/headers";
import { verifyMobileToken } from "@/lib/mobileToken";
import { prisma } from "@/lib/prisma";
import { getSession } from "@auth0/nextjs-auth0";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  language?: string;
  role?: string;
  bannedUntil?: Date | null;
}

export async function getCustomSession(): Promise<SessionUser | null> {
  const authHeader = headers().get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const userId = verifyMobileToken(authHeader.slice(7).trim());
    if (!userId) return null;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, phoneVerified: true, emailVerified: true, language: true, role: true, bannedUntil: true },
    });
    return user && (!user.bannedUntil || user.bannedUntil <= new Date()) ? user : null;
  }
  // 1Ã¯Â¸ÂÃ¢Æ’Â£ Try our custom session cookie
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (token) {
    try {
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const [userId] = decoded.split(":");
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true, phone: true, phoneVerified: true, emailVerified: true, language: true, role: true, bannedUntil: true },
        });
        if (user && (!user.bannedUntil || user.bannedUntil <= new Date())) return user;
      }
    } catch {
      // ignore malformed token
    }
  }

  // 2Ã¯Â¸ÂÃ¢Æ’Â£ Fallback to Auth0 session
  try {
    const auth0Session = await getSession();
    if (auth0Session?.user?.sub) {
      const user = await prisma.user.findUnique({
        where: { auth0Id: auth0Session.user.sub },
        select: { id: true, name: true, email: true, phone: true, phoneVerified: true, emailVerified: true, language: true, role: true, bannedUntil: true },
      });
      if (user && (!user.bannedUntil || user.bannedUntil <= new Date())) return user;
    }
  } catch {
    // Auth0 not configured or error
  }

  return null;
}
