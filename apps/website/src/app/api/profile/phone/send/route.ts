import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomSession } from "@/lib/session";
export const dynamic = "force-dynamic";


export async function POST(req: NextRequest) {
  const sessionUser = await getCustomSession();
  if (!sessionUser) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const { phone } = await req.json();
  const normalizedPhone = typeof phone === "string" ? phone.trim().replace(/[^\d+]/g, "") : "";
  if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) return NextResponse.json({ error: "Enter a valid phone number with country code, for example +919876543210" }, { status: 400 });
  const existingPhone = await prisma.user.findFirst({ where: { phone: normalizedPhone, NOT: { id: sessionUser.id } }, select: { id: true } });
  if (existingPhone) return NextResponse.json({ error: "This phone number already exists. Try another phone number." }, { status: 409 });

  const missingSettings = [!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && "NEXT_PUBLIC_FIREBASE_API_KEY"].filter(Boolean);
  if (missingSettings.length > 0) return NextResponse.json({ error: `Phone verification is not configured. Missing: ${missingSettings.join(", ")}` }, { status: 503 });

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { phoneOtpSentAt: true } });
  if (user?.phoneOtpSentAt && Date.now() - user.phoneOtpSentAt.getTime() < 60_000) {
    return NextResponse.json({ error: "Please wait a minute before requesting another code" }, { status: 429 });
  }

  const now = new Date();
  await prisma.user.update({
    where: { id: sessionUser.id },
    data: {
      pendingPhone: normalizedPhone,
      phoneOtpSentAt: now,
      phoneOtpAttempts: 0,
    },
  });

  return NextResponse.json({ sent: true, phone: normalizedPhone });
}

export async function DELETE() {
  const sessionUser = await getCustomSession();
  if (!sessionUser) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { pendingPhone: null, phoneOtpSentAt: null, phoneOtpAttempts: 0 },
  });

  return NextResponse.json({ cleared: true });
}
