import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@auth0/nextjs-auth0";
export const dynamic = "force-dynamic";


// Manual UPI QR payment flow: the bus owner provides UPI/QR details at the bus level.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.sub) return NextResponse.json({ error: "Log in to book a bus" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub }, select: { id: true, phoneVerified: true, emailVerified: true } });
    if (!user || !user.emailVerified || !user.phoneVerified) return NextResponse.json({ error: "Verify your email and phone number before booking" }, { status: 403 });
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { trip: { include: { bus: true } } },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (booking.userId !== user.id) return NextResponse.json({ error: "Booking does not belong to this user" }, { status: 403 });

    const bus = booking.trip.bus;

    return NextResponse.json({
      paymentMethod: "UPI_QR",
      upiId: bus.upiId,
      qrCodeUrl: bus.paymentQrUrl,
      amount: booking.totalAmount.toString(),
      currency: "INR",
      busOwnerPhone: bus.ownerPhone,
      pickupLocation: bus.pickupLocation,
      dropLocation: bus.dropLocation,
      message: "Pay using the UPI ID or QR code shown by the bus owner.",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to prepare payment details" }, { status: 500 });
  }
}
