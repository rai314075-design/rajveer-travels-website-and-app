import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomSession } from "@/lib/session";
import { sendBookingCreatedAlerts } from "@/lib/adminNotifications";
import { BookingListSchema, CreateBookingResponseSchema, CreateBookingSchema, toJsonRow } from "@rajveer/shared";

export const dynamic = "force-dynamic";

class BookingRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function GET() {
  try {
    const sessionUser = await getCustomSession();
    if (!sessionUser) return NextResponse.json({ error: "Log in to view bookings" }, { status: 401 });

    const rows = await prisma.booking.findMany({
      where: { userId: sessionUser.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        payment: { select: { status: true } },
        totalAmount: true,
        createdAt: true,
        passengerInfo: true,
        trip: {
          select: {
            departureTime: true,
            arrivalTime: true,
            bus: { select: { busNumber: true, ownerPhone: true, pickupLocation: true, dropLocation: true } },
            route: { select: { source: true, destination: true, pickupPoint: true, dropPoint: true } },
          },
        },
      },
    });
    // Prisma returns Date objects and Decimal wrappers for timestamp and decimal
    // columns — plain JSON only accepts string/number, so normalize first.
    return NextResponse.json(BookingListSchema.parse(toJsonRow(rows)));
  } catch (error) {
    console.error("Unable to load bookings", error);
    return NextResponse.json({ error: "Unable to load bookings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const sessionUser = await getCustomSession();
  if (!sessionUser) return NextResponse.json({ error: "Please log in to book a ticket" }, { status: 401 });
  if (!sessionUser.emailVerified || !sessionUser.phoneVerified) {
    return NextResponse.json({ error: "Verify your email and phone before booking a ticket." }, { status: 403 });
  }

  const parsed = CreateBookingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: parsed.data.tripId },
        include: { bus: true, route: true, vehicle: { include: { seatTemplates: true } } },
      });
      if (!trip) throw new BookingRequestError("Trip not found", 404);

      const templateSeatNumbers = new Map((trip.vehicle?.seatTemplates || []).map((seat) => [seat.id, seat.seatNumber]));
      const seatNumbers = parsed.data.seatTemplateIds.map((id) => templateSeatNumbers.get(id)).filter((seat): seat is string => Boolean(seat));
      if (seatNumbers.length !== parsed.data.seatTemplateIds.length) throw new BookingRequestError("One or more selected seats are invalid", 400);

      const seats = await tx.seat.findMany({ where: { tripId: trip.id, seatNumber: { in: seatNumbers } } });
      if (seats.length !== seatNumbers.length || seats.some((seat) => seat.status !== "AVAILABLE")) {
        throw new BookingRequestError("One or more selected seats are no longer available", 409);
      }

      const booking = await tx.booking.create({
        data: {
          userId: sessionUser.id,
          tripId: trip.id,
          passengerInfo: { seatNumbers },
          totalAmount: Number(trip.fare) * seats.length,
          status: "CONFIRMED",
        },
      });
      await tx.seat.updateMany({ where: { id: { in: seats.map((seat) => seat.id) } }, data: { status: "BOOKED", bookingId: booking.id } });
      // Also update the seat reservation status so the /api/seats/status endpoint
      // returns BOOKED for all users (including the booker and admin).
      await tx.seatReservation.updateMany({
        where: {
          scheduleId: trip.id,
          seatTemplateId: { in: parsed.data.seatTemplateIds },
        },
        data: { status: "BOOKED" },
      });

      return { booking, bus: trip.bus, route: trip.route, departureTime: trip.departureTime };
    });

    try {
      await sendBookingCreatedAlerts({
        bookingId: result.booking.id,
        customerName: sessionUser.name,
        customerEmail: sessionUser.email,
        customerPhone: sessionUser.phone || null,
        busNumber: result.bus.busNumber,
        busOwnerPhone: result.bus.ownerPhone,
        pickupLocation: result.bus.pickupLocation,
        dropLocation: result.bus.dropLocation,
        departureTime: result.departureTime,
        source: result.route.source,
        destination: result.route.destination,
      });
    } catch (error) {
      console.error("Booking saved but notification delivery failed", error);
    }
    const response = CreateBookingResponseSchema.parse({
      bookingId: result.booking.id,
      status: result.booking.status,
      total: Number(result.booking.totalAmount),
      seats: result.booking.passengerInfo,
      ownerName: result.bus.operator,
      ownerPhone: result.bus.ownerPhone,
      message: "Your ticket is booked. The bus owner will call you soon.",
    });
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof BookingRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unable to create booking", error);
    return NextResponse.json({ error: "Unable to create booking" }, { status: 500 });
  }
}
