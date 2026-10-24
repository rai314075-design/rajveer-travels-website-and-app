import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
export const dynamic = "force-dynamic";

/**
 * GET /api/buses/[id]
 *
 * Returns a specific bus by id.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const bus = await prisma.bus.findUnique({
    where: { id: params.id },
    include: { trips: { include: { route: true } } },
  });

  if (!bus) return NextResponse.json({ error: "Bus not found" }, { status: 404 });

  return NextResponse.json(bus);
}

/**
 * DELETE /api/buses/[id]
 *
 * Deletes (deactivates) a bus from the admin listing. Admin only.
 * Blocked when the bus has active trips with CONFIRMED bookings — the operator
 * must cancel or move those bookings first.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const bus = await prisma.bus.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { trips: true } },
      trips: {
        where: { isActive: true },
        include: {
          _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
          bookings: { where: { status: "CONFIRMED" }, select: { id: true } },
        },
      },
    },
  });

  if (!bus) return NextResponse.json({ error: "Bus not found" }, { status: 404 });

  // Check if any upcoming active trip for this bus has confirmed bookings
  const tripsWithConfirmedBookings = bus.trips.filter((t) => t._count.bookings > 0);
  if (tripsWithConfirmedBookings.length > 0) {
    return NextResponse.json(
      { error: "Cancel or move the bookings first" },
      { status: 409 }
    );
  }

  await prisma.bus.update({ where: { id: params.id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}