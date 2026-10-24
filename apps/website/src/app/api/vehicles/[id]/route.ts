import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { z } from "zod";
export const dynamic = "force-dynamic";


const updateSchema = z.object({
  name: z.string().min(1).optional(),
  totalDecks: z.number().int().min(1).max(2).optional(),
  busId: z.string().optional(),
});

/**
 * GET /api/vehicles/[id] - Get a specific vehicle
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: params.id },
    include: {
      seatTemplates: true,
    },
  });

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  return NextResponse.json(vehicle);
}

/**
 * PATCH /api/vehicles/[id] - Update a vehicle (admin only)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin(req);
  if (!guard.ok)
    return NextResponse.json({ error: guard.message }, { status: guard.status });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const vehicle = await prisma.vehicle.update({
    where: { id: params.id },
    data: parsed.data,
    include: { seatTemplates: true },
  });

  return NextResponse.json(vehicle);
}

/**
 * DELETE /api/vehicles/[id] - Delete a vehicle (admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin(req);
  if (!guard.ok)
    return NextResponse.json({ error: guard.message }, { status: guard.status });

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: params.id },
    include: {
      trips: {
        where: { isActive: true },
        include: {
          _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
          bookings: { where: { status: "CONFIRMED" }, select: { id: true } },
        },
      },
    },
  });

  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

  // Block deletion if the vehicle has upcoming trips with confirmed bookings
  const tripsWithConfirmedBookings = vehicle.trips.filter(
    (t) => t._count.bookings > 0
  );
  if (tripsWithConfirmedBookings.length > 0) {
    return NextResponse.json(
      { error: "Cancel or move the bookings first" },
      { status: 409 }
    );
  }

  await prisma.vehicle.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}