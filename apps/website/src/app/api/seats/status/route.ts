import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@auth0/nextjs-auth0";
import { z } from "zod";
import type { Deck, SeatType, ReservationStatus } from "@/types/seat";
export const dynamic = "force-dynamic";


const statusSchema = z.object({
  tripId: z.string(),
});

/**
 * GET /api/seats/status?tripId=...
 *
 * Returns the current reservation state for every seat template
 * associated with the given trip/schedule.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  // Status endpoint is public; anyone can check seat availability.
  // No auth required for read-only access.
  const { searchParams } = new URL(req.url);
  const tripId = searchParams.get("tripId");

  if (!tripId) {
    return NextResponse.json(
      { error: "Missing tripId query parameter" },
      { status: 400 }
    );
  }

  const parsed = statusSchema.safeParse({ tripId });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify the trip exists
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true, busId: true },
  });
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  // Fetch seat templates + their reservations in one query
  const seatTemplates = await prisma.seatTemplate.findMany({
    where: {
      vehicle: {
        trips: {
          some: { id: tripId },
        },
      },
    },
    select: {
      id: true,
      seatNumber: true,
      type: true,
      deck: true,
      rowSpan: true,
      colSpan: true,
      xPosition: true,
      yPosition: true,
      reservations: {
        where: { scheduleId: tripId },
        select: {
          status: true,
          lockedAt: true,
          lockedUntil: true,
        },
      },
    },
  });

  // Build the response payload expected by the UI
  const seats = seatTemplates.flatMap((tpl) => {
    const res = tpl.reservations[0];
    if (!res) {
      // Defensive: if no reservation row exists, treat as AVAILABLE
      return [
        {
          seatTemplateId: tpl.id,
          seatNumber: tpl.seatNumber,
          type: tpl.type,
          deck: tpl.deck,
          status: "AVAILABLE" as ReservationStatus,
          lockedAt: null,
          lockedUntil: null,
          rowSpan: tpl.rowSpan,
          colSpan: tpl.colSpan,
          xPosition: tpl.xPosition,
          yPosition: tpl.yPosition,
        },
      ];
    }

    return [
      {
        seatTemplateId: tpl.id,
        seatNumber: tpl.seatNumber,
        type: tpl.type,
        deck: tpl.deck,
        status: res.status as ReservationStatus,
        lockedAt: res.lockedAt ? res.lockedAt.toISOString() : null,
        lockedUntil: res.lockedUntil ? res.lockedUntil.toISOString() : null,
        rowSpan: tpl.rowSpan,
        colSpan: tpl.colSpan,
        xPosition: tpl.xPosition,
        yPosition: tpl.yPosition,
      },
    ];
  });

  return NextResponse.json({ seats });
}