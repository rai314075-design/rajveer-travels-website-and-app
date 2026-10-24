import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
export const dynamic = "force-dynamic";


/**
 * GET /api/trips/[id]
 *
 * Returns trip details with bus, route, and seat information.
 * Used by the trip detail page for seat selection.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    include: {
      bus: true,
      route: true,
      seats: {
        select: {
          id: true,
          seatNumber: true,
          status: true,
          lockedUntil: true,
        },
      },
    },
  });

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  return NextResponse.json(trip);
}

/**
 * DELETE /api/trips/[id]
 *
 * Permanently deletes a scheduled trip. Admin only.
 * Trips with any booking history are protected so ticket and payment history
 * cannot be removed accidentally.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { bookings: true } },
    },
  });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (trip._count.bookings > 0) {
    return NextResponse.json({ error: "This trip has booking history and cannot be permanently deleted. Cancel or move its bookings first." }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.seatReservation.deleteMany({ where: { scheduleId: params.id } });
    await tx.seat.deleteMany({ where: { tripId: params.id } });
    await tx.trip.delete({ where: { id: params.id } });
  });
  return NextResponse.json({ success: true });
}
