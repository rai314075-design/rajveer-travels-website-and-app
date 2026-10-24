import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { connectMongo } from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { sendAdminBookingAlerts } from "@/lib/adminNotifications";
import { getSession } from "@auth0/nextjs-auth0";
export const dynamic = "force-dynamic";


// Manual UPI QR confirmation flow. The user pays via bus owner details, then confirms payment.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.sub) return NextResponse.json({ error: "Log in to confirm a booking" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub }, select: { id: true, phoneVerified: true, emailVerified: true } });
    if (!user || !user.emailVerified || !user.phoneVerified) return NextResponse.json({ error: "Verify your email and phone number before booking" }, { status: 403 });
    const { bookingId, paymentReference } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    const existingBooking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { userId: true } });
    if (!existingBooking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (existingBooking.userId !== user.id) return NextResponse.json({ error: "Booking does not belong to this user" }, { status: 403 });

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
      include: {
        seats: true,
        user: true,
        trip: {
          include: {
            bus: true,
            route: true,
            vehicle: { include: { seatTemplates: true } },
          },
        },
      },
    });

    // Find seat template IDs for the booked seat numbers
    const bookedSeatNumbers = new Set(booking.seats.map((s) => s.seatNumber));
    const bookedSeatTemplateIds = booking.trip.vehicle?.seatTemplates
      ?.filter((tpl) => bookedSeatNumbers.has(tpl.seatNumber))
      .map((tpl) => tpl.id) || [];

    await prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        status: "PAID",
        razorpayPaymentId: paymentReference || "UPI_MANUAL",
      },
      create: {
        bookingId: booking.id,
        amount: booking.totalAmount,
        status: "PAID",
        razorpayOrderId: `manual_${booking.id}`,
        razorpayPaymentId: paymentReference || "UPI_MANUAL",
      },
    });

    await prisma.seat.updateMany({
      where: { bookingId: booking.id },
      data: { status: "BOOKED" },
    });
    // Also mark the seat reservations as BOOKED so /api/seats/status returns
    // BOOKED for everyone (booker, admin, and all other users).
    if (bookedSeatTemplateIds.length > 0) {
      await prisma.seatReservation.updateMany({
        where: {
          scheduleId: booking.trip.id,
          seatTemplateId: { in: bookedSeatTemplateIds },
        },
        data: { status: "BOOKED" },
      });
    }

    await connectMongo();
    await Notification.create({
      userId: booking.userId,
      type: "BOOKING_CONFIRMED",
      message: `Your Rajveer Travels booking ${booking.id} is confirmed via UPI payment.`,
    });

    await sendAdminBookingAlerts({
      bookingId: booking.id,
      customerName: booking.user.name,
      customerEmail: booking.user.email,
      customerPhone: booking.user.phone,
      busNumber: booking.trip.bus.busNumber,
      busOwnerPhone: booking.trip.bus.ownerPhone,
      pickupLocation: booking.trip.bus.pickupLocation,
      dropLocation: booking.trip.bus.dropLocation,
      departureTime: booking.trip.departureTime,
      source: booking.trip.route.source,
      destination: booking.trip.route.destination,
    });

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      paymentMethod: "UPI_QR",
      paymentReference: paymentReference || "UPI_MANUAL",
      busUpiId: booking.trip.bus.upiId,
      busOwnerPhone: booking.trip.bus.ownerPhone,
      pickupLocation: booking.trip.bus.pickupLocation,
      dropLocation: booking.trip.bus.dropLocation,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Payment confirmation failed" }, { status: 500 });
  }
}
