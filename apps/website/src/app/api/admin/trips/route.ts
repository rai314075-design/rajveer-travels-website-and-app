import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { z } from "zod";
export const dynamic = "force-dynamic";


const tripSchema = z.object({
  busId: z.string(),
  routeId: z.string(),
  vehicleId: z.string().min(1),
  travelDate: z.string(), // ISO date, e.g. "2026-10-05"
  departureTime: z.string(), // full ISO datetime
  arrivalTime: z.string(), // full ISO datetime
  fare: z.number().positive(),
});

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const trips = await prisma.trip.findMany({
    // Include past trips so the admin list matches the dashboard count and
    // gives admins a way to remove old active trips from the schedule.
    where: { isActive: true },
    include: { bus: true, route: true },
    orderBy: { departureTime: "asc" },
  });

  return NextResponse.json(trips);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const body = await req.json();
  const parsed = tripSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const bus = await prisma.bus.findUnique({ where: { id: parsed.data.busId } });
  if (!bus) return NextResponse.json({ error: "Bus not found" }, { status: 404 });

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: parsed.data.vehicleId, isActive: true },
    include: { seatTemplates: true },
  });

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle layout not found" }, { status: 404 });
  }
  if (vehicle.name.trim().toLowerCase() !== bus.busNumber.trim().toLowerCase()) {
    return NextResponse.json({ error: "Choose a seat layout created for this bus" }, { status: 400 });
  }

  // Validate seat numbers up front so admins get a clear message instead of a
  // confusing 409 from the database unique constraint.
  const seenSeatNumbers = new Set<string>();
  const duplicateSeatNumbers = new Set<string>();
  for (const template of vehicle.seatTemplates) {
    const normalizedSeatNumber = template.seatNumber.trim().toUpperCase();
    if (seenSeatNumbers.has(normalizedSeatNumber)) {
      duplicateSeatNumbers.add(template.seatNumber);
    } else {
      seenSeatNumbers.add(normalizedSeatNumber);
    }
  }
  if (duplicateSeatNumbers.size > 0) {
    const count = duplicateSeatNumbers.size;
    return NextResponse.json({
      error: `Your vehicle has ${count} duplicate seat number${count === 1 ? "" : "s"}: ${[...duplicateSeatNumbers].join(", ")}. Each seat number must be unique across all decks. Fix the layout first, then try scheduling again.`,
    }, { status: 409 });
  }

  // Proactively check for overlapping trips on the same bus so admins get a
  // clear 409 instead of a database unique-constraint error.
  const departure = new Date(parsed.data.departureTime);
  const arrival = new Date(parsed.data.arrivalTime);

  const overlappingTrip = await prisma.trip.findFirst({
    where: {
      busId: parsed.data.busId,
      isActive: true,
      departureTime: { lt: arrival },
      arrivalTime: { gt: departure },
    },
  });
  if (overlappingTrip) {
    return NextResponse.json(
      {
        error:
          "This bus already has an active trip scheduled during this time window. Choose a different departure/arrival time or a different bus.",
      },
      { status: 409 }
    );
  }

  try {
    const trip = await prisma.trip.create({
      data: {
        busId: parsed.data.busId,
        routeId: parsed.data.routeId,
        travelDate: new Date(parsed.data.travelDate),
        departureTime: new Date(parsed.data.departureTime),
        arrivalTime: new Date(parsed.data.arrivalTime),
        fare: parsed.data.fare,
        vehicleId: vehicle.id,
        seats: {
          create: vehicle.seatTemplates.map((template) => ({
            seatNumber: template.seatNumber,
          })),
        },
      },
      include: { seats: true },
    });

    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    // Check for P2002 duplicate key violation
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      const errorMessage = (error as any).message || "";

      if (
        errorMessage.includes("tripId") &&
        errorMessage.includes("seatNumber")
      ) {
        return NextResponse.json(
          {
            error:
              "This seat layout contains duplicate seat numbers. The database rejected the trip creation. Open the vehicle layout editor, make each seat number unique across all decks, save the layout, and try again.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          error:
            "A unique constraint was violated while creating the trip. Please check that the bus, route, and seat layout are correct, then try again.",
        },
        { status: 409 }
      );
    }
    console.error("Failed to create trip", error);
    return NextResponse.json({ error: "Could not schedule the trip. Please try again." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const tripId = new URL(req.url).searchParams.get("id");
  if (!tripId) return NextResponse.json({ error: "Trip id is required" }, { status: 400 });

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      _count: { select: { bookings: true } },
      bookings: { where: { status: "CONFIRMED" }, select: { id: true } },
    },
  });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (trip.bookings.length > 0) {
    return NextResponse.json({ error: "Cancel or move the bookings first" }, { status: 409 });
  }

  // Hard delete the whole trip and its dependent rows so the row really leaves
  // the database (not just marked inactive). Match the per-trip endpoint so admin
  // and direct deletion give the same protection against orphaned tickets/payments.
  await prisma.$transaction(async (tx) => {
    await tx.seatReservation.deleteMany({ where: { scheduleId: tripId } });
    await tx.seat.deleteMany({ where: { tripId } });
    await tx.trip.delete({ where: { id: tripId } });
  });
  return NextResponse.json({ success: true });
}
