import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/trips/search?source=&destination=&date=YYYY-MM-DD
 *
 * JSON version of the /search page's query (same filters), for the mobile app.
 * Public, like the search page. Owner phone numbers are intentionally not included.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source")?.trim();
  const destination = searchParams.get("destination")?.trim();
  const date = searchParams.get("date")?.trim();
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  const trips = await prisma.trip.findMany({
    where: {
      ...(date && {
        travelDate: {
          gte: new Date(`${date}T00:00:00`),
          lte: new Date(`${date}T23:59:59`),
        },
      }),
      route: {
        isActive: true,
        ...(source && { source: { equals: source, mode: "insensitive" } }),
        ...(destination && { destination: { equals: destination, mode: "insensitive" } }),
      },
      bus: { isActive: true },
      isActive: true,
      departureTime: { gt: new Date() },
    },
    include: { bus: true, route: true },
    orderBy: { departureTime: "asc" },
  });

  return NextResponse.json({
    trips: trips.map((trip) => ({
      id: trip.id,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      travelDate: trip.travelDate,
      fare: Number(trip.fare),
      bus: {
        operator: trip.bus.operator,
        busNumber: trip.bus.busNumber,
        type: trip.bus.type,
        description: trip.bus.description,
        upiId: trip.bus.upiId,
        paymentQrUrl: trip.bus.paymentQrUrl,
      },
      route: {
        source: trip.route.source,
        destination: trip.route.destination,
        pickupPoint: trip.route.pickupPoint,
        dropPoint: trip.route.dropPoint,
      },
    })),
  });
}
