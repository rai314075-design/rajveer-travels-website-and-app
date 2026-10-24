import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { signMobileToken } from "@/lib/mobileToken";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { code?: unknown } | null;
  if (typeof body?.code !== "string" || body.code.length < 20 || body.code.length > 200) {
    return NextResponse.json({ error: "A valid sign-in code is required." }, { status: 400 });
  }

  const codeHash = createHash("sha256").update(body.code).digest("hex");
  const now = new Date();
  const userId = await prisma.$transaction(async (tx) => {
    const pending = await tx.mobileAuthCode.findUnique({ where: { codeHash } });
    if (!pending || pending.expiresAt <= now) return null;

    // A conditional delete makes the code single-use, including concurrent attempts.
    const consumed = await tx.mobileAuthCode.deleteMany({
      where: { id: pending.id, codeHash, expiresAt: { gt: now } },
    });
    return consumed.count === 1 ? pending.userId : null;
  });

  if (!userId) return NextResponse.json({ error: "This sign-in link has expired or was already used." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true, phoneVerified: true, emailVerified: true, language: true, bannedUntil: true },
  });
  if (!user || (user.bannedUntil && user.bannedUntil > new Date())) {
    return NextResponse.json({ error: "This account cannot sign in right now." }, { status: 403 });
  }

  return NextResponse.json(
    { token: signMobileToken(user.id), user },
    { headers: { "Cache-Control": "no-store" } },
  );
}
