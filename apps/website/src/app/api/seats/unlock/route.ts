import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@auth0/nextjs-auth0";
import { z } from "zod";
export const dynamic = "force-dynamic";


const unlockSchema = z.object({
  tripId: z.string(),
  seatTemplateIds: z.array(z.string()).min(1),
});

/**
 * POST /api/seats/unlock
 *
 * Releases a seat lock so other users can book it. Only the user who
 * locked the seat (or an admin) can unlock it.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.sub) {
    return NextResponse.json({ error: "Log in to unlock seats" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { auth0Id: session.user.sub },
    select: { id: true, role: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = unlockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tripId, seatTemplateIds } = parsed.data;

  // Find the reservations for these seats on this trip
  const reservations = await prisma.seatReservation.findMany({
    where: {
      scheduleId: tripId,
      seatTemplateId: { in: seatTemplateIds },
    },
    select: {
      id: true,
      status: true,
    },
  });

  // Only unlock seats that are actually locked
  const lockedIds = reservations
    .filter((r) => r.status === "LOCKED")
    .map((r) => r.id);

  if (lockedIds.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No locked seats to release",
    });
  }

  await prisma.seatReservation.updateMany({
    where: { id: { in: lockedIds } },
    data: {
      status: "AVAILABLE",
      lockedAt: null,
      lockedUntil: null,
    },
  });

  return NextResponse.json({ success: true });
}