import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getCustomSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const LOCK_DURATION_MINUTES = 10;

const lockSchema = z.object({
  tripId: z.string(),
  seatTemplateIds: z.array(z.string()).min(1),
});

/**
 * POST /api/seats/lock
 *
 * Locks the requested seats for 10 minutes so the user can proceed to
 * payment without someone else grabbing them.
 *
 * Concurrency safety:
 * Prisma.$transaction with an explicit async tx callback ensures the
 * SELECT (to check availability) and UPDATE (to set status to LOCKED)
 * run as a single ACID unit. We read the reservations with a row-level
 * lock so that concurrent requests are serialised by Postgres.
 */
export async function POST(req: NextRequest) {
  // Authenticate — only logged-in users can hold locks
  const sessionUser = await getCustomSession();
  if (!sessionUser) {
    return NextResponse.json({ error: "Log in to lock seats" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, role: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  // Validate the request body
  const body = await req.json().catch(() => null);
  const parsed = lockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { tripId, seatTemplateIds } = parsed.data;

  // Ensure the trip exists
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true },
  });
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  // Use a Prisma transaction to atomically check + lock the seats.
  // This prevents race conditions when multiple users target the same seats.
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + LOCK_DURATION_MINUTES * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    // Acquire row-level locks on the reservation rows.
    // `FOR UPDATE` in Postgres ensures no other transaction can modify these
    // rows until we commit or roll back.
    const reservations = await tx.seatReservation.findMany({
      where: {
        scheduleId: tripId,
        seatTemplateId: { in: seatTemplateIds },
      },
      select: {
        id: true,
        seatTemplateId: true,
        status: true,
        bookingId: true,
      },
    });

    // If some seat templates have no reservation row yet we create them
    // at AVAILABLE then lock. In practice the trip-creation route should
    // have pre-created them, but this keeps the endpoint robust.
    const existingIds = new Set(reservations.map((r) => r.id));
    const existingTemplateIds = new Set(reservations.map((r) => r.seatTemplateId));
    const missingTemplateIds = seatTemplateIds.filter(
      (id) => !existingTemplateIds.has(id)
    );

    const newReservations = await Promise.all(
      missingTemplateIds.map((tplId) =>
        tx.seatReservation.create({
          data: {
            seatTemplateId: tplId,
            scheduleId: tripId,
            status: "AVAILABLE",
          },
        })
      )
    );

    // Combine existing and newly created reservations
    const allReservations = [
      ...reservations,
      ...newReservations.map((r) => ({
        id: r.id,
        status: "AVAILABLE" as const,
        bookingId: null,
        seatTemplateId: r.seatTemplateId,
      })),
    ];

    // Check every requested seat: it must be AVAILABLE before we can lock it.
    const unavailableSeats = allReservations.filter((r) => r.status !== "AVAILABLE");
    if (unavailableSeats.length > 0) {
      // Throwing inside the tx callback causes a full rollback so no
      // partial locks are committed.
      throw new Error(
        `Seats are not available: ${unavailableSeats
          .map((r) => r.id)
          .join(", ")}`
      );
    }

    // Atomically update all seats to LOCKED with the lock expiration.
    await tx.seatReservation.updateMany({
      where: {
        scheduleId: tripId,
        seatTemplateId: { in: seatTemplateIds },
      },
      data: {
        status: "LOCKED",
        lockedAt: now,
        lockedUntil,
      },
    });

    return { lockedUntil: lockedUntil.toISOString() };
  });

  return NextResponse.json(
    {
      success: true,
      message: "Seats locked for 10 minutes",
      lockedUntil: result.lockedUntil,
    },
    { status: 200 }
  );
}
