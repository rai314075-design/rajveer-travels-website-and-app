import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomSession } from "@/lib/session";
export const dynamic = "force-dynamic";


export async function POST(req: NextRequest) {
  const sessionUser = await getCustomSession();
  if (!sessionUser) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const { phone, idToken } = await req.json();
  const normalizedPhone = typeof phone === "string" ? phone.trim().replace(/[^\d+]/g, "") : "";
  if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone) || typeof idToken !== "string" || !idToken) return NextResponse.json({ error: "Enter a valid phone number and complete phone verification" }, { status: 400 });
  const existingPhone = await prisma.user.findFirst({ where: { phone: normalizedPhone, NOT: { id: sessionUser.id } }, select: { id: true } });
  if (existingPhone) return NextResponse.json({ error: "This phone number already exists. Try another phone number." }, { status: 409 });

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const missingSettings = [!apiKey && "NEXT_PUBLIC_FIREBASE_API_KEY"].filter(Boolean);
  if (missingSettings.length > 0) return NextResponse.json({ error: `Phone verification is not configured. Missing: ${missingSettings.join(", ")}` }, { status: 503 });

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { pendingPhone: true, phoneOtpSentAt: true, phoneOtpAttempts: true } });
  if (!user?.pendingPhone || user.pendingPhone !== normalizedPhone || !user.phoneOtpSentAt || Date.now() - user.phoneOtpSentAt.getTime() > 10 * 60 * 1000) {
    return NextResponse.json({ error: "The phone verification code is invalid or expired" }, { status: 400 });
  }

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey as string)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    console.error("Firebase phone verification check failed", { status: response.status });
    if (user.phoneOtpAttempts !== undefined && user.phoneOtpAttempts < 5) {
      await prisma.user.update({ where: { id: sessionUser.id }, data: { phoneOtpAttempts: { increment: 1 } } });
    }
    return NextResponse.json({ error: "The phone verification code is invalid or expired" }, { status: 400 });
  }

  const result = await response.json() as { users?: Array<{ phoneNumber?: string }> };
  if (result.users?.[0]?.phoneNumber !== normalizedPhone) {
    if (user.phoneOtpAttempts !== undefined && user.phoneOtpAttempts < 5) {
      await prisma.user.update({ where: { id: sessionUser.id }, data: { phoneOtpAttempts: { increment: 1 } } });
    }
    return NextResponse.json({ error: "The phone verification code is invalid or expired" }, { status: 400 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: sessionUser.id },
    data: { phone: normalizedPhone, phoneVerified: true, pendingPhone: null, phoneOtpSentAt: null, phoneOtpAttempts: 0 },
    select: { phone: true, phoneVerified: true },
  });
  return NextResponse.json(updatedUser);
}
