import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomSession } from "@/lib/session";
import { notifyUserAdminCancellation } from "@/lib/adminNotifications";
import { connectMongo } from "@/lib/mongodb";
import Notification from "@/models/Notification";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getCustomSession();
  if (!sessionUser) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const admin = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { role: true } });
  if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const booking = await prisma.booking.findFirst({
    where: { id: params.id, status: { in: ["CONFIRMED", "PENDING"] } },
    include: { user: true, payment: true },
  });
  if (!booking) return NextResponse.json({ error: "Active booking not found" }, { status: 404 });

  const paid = booking.payment?.status === "PAID";
  await prisma.$transaction(async (tx) => {
    if (paid && !await tx.refundRequest.findUnique({ where: { bookingId: booking.id } })) {
      await tx.refundRequest.create({ data: { userId: booking.userId, bookingId: booking.id, upiId: "ADMIN_INITIATED", amount: booking.totalAmount, cancellationOtp: null } });
    }
    await tx.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
    await tx.seat.updateMany({ where: { bookingId: booking.id }, data: { status: "AVAILABLE", bookingId: null } });
  });

  if (paid) {
    await notifyUserAdminCancellation({ email: booking.user.email, phone: booking.user.phone, name: booking.user.name, bookingId: booking.id, refundAmount: booking.totalAmount.toString() });
    await connectMongo();
    await Notification.create({ userId: booking.userId, type: "BOOKING_CANCELLED", message: `Your booking ${booking.id} was cancelled by Rajveer Travels. Your refund will be processed soon.` });
  }

  return NextResponse.json({ success: true, paid, message: paid ? "Ticket cancelled and refund notification sent." : "Ticket cancelled." });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getCustomSession();
  if (!sessionUser) return NextResponse.json({ error: "Log in to delete a booking" }, { status: 401 });
  const admin = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { role: true } });
  if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { user: true, payment: true, trip: { include: { bus: true, route: true } } },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  // Only allow deletion of cancelled bookings
  if (booking.status !== "CANCELLED") {
    return NextResponse.json({ error: "Only cancelled bookings can be deleted" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.seat.updateMany({ where: { bookingId: booking.id }, data: { bookingId: null } });
    await tx.complaint.deleteMany({ where: { bookingId: booking.id } });
    await tx.refundRequest.deleteMany({ where: { bookingId: booking.id } });
    await tx.payment.deleteMany({ where: { bookingId: booking.id } });
    await tx.seatReservation.deleteMany({ where: { bookingId: booking.id } });
    await tx.booking.delete({ where: { id: booking.id } });
  });

  return NextResponse.json({ success: true });
}