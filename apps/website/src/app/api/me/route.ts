import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// GET /api/me — the signed-in user's profile (used by the mobile app).
export async function GET() {
  const sessionUser = await getCustomSession();
  if (!sessionUser) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, name: true, email: true, phone: true, address: true, language: true, phoneVerified: true, emailVerified: true },
  });
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  return NextResponse.json({ user });
}
