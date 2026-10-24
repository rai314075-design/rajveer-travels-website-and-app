import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomSession } from "@/lib/session";
import { notifyUnpaidBookingCancellation } from "@/lib/adminNotifications";
import { connectMongo } from "@/lib/mongodb";
import Notification from "@/models/Notification";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCustomSession();
  if (!user) return NextResponse.json({ error: "Log in to delete a booking" }, { status: 401 });

  const booking = await prisma.booking.findFirst({
    where: { id: params.id, userId: user.id },
    include: { payment: true, user: true, trip: { include: { bus: true, route: true } } },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  const unpaidActive = ["PENDING", "CONFIRMED"].includes(booking.status) && booking.payment?.status !== "PAID";
  if (!unpaidActive && !["CANCELLED", "REFUNDED"].includes(booking.status)) return NextResponse.json({ error: "This booking cannot be deleted" }, { status: 400 });
  const banUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.seat.updateMany({ where: { bookingId: booking.id }, data: { bookingId: null } });
    await tx.complaint.deleteMany({ where: { bookingId: booking.id } });
    await tx.refundRequest.deleteMany({ where: { bookingId: booking.id } });
    await tx.payment.deleteMany({ where: { bookingId: booking.id } });
    await tx.seatReservation.deleteMany({ where: { bookingId: booking.id } });
    if (unpaidActive) await tx.user.update({ where: { id: user.id }, data: { bannedUntil: banUntil } });
    await tx.booking.delete({ where: { id: booking.id } });
  });

  if (unpaidActive) {
    await notifyUnpaidBookingCancellation({ ownerPhone: booking.trip.bus.ownerPhone, bookingId: booking.id, customerName: booking.user.name, customerPhone: booking.user.phone, busNumber: booking.trip.bus.busNumber });
    await connectMongo();
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    await Notification.create({ userId: user.id, type: "BOOKING_CANCELLED", message: "Your unpaid booking was cancelled. Your account is suspended for 30 days because the bus owner was not contacted." });
    await Notification.insertMany(admins.map((admin) => ({ userId: admin.id, type: "BOOKING_CANCELLED", message: `${booking.user.name} cancelled unpaid booking ${booking.id} without contacting the bus owner.` })));
  }

  return NextResponse.json({ success: true, banned: unpaidActive });
}