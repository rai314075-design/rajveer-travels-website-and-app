import { getSession } from "@auth0/nextjs-auth0";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdminsByEmailAndSms } from "@/lib/adminNotifications";
import { z } from "zod";
export const dynamic = "force-dynamic";


const schema = z.object({ bookingId: z.string().min(1), upiId: z.string().trim().min(3).max(255) });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.sub) return NextResponse.json({ error: "Log in to request a refund" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Booking and UPI ID are required" }, { status: 400 });

  const booking = await prisma.booking.findFirst({
    where: { id: parsed.data.bookingId, userId: user.id, status: { in: ["CONFIRMED", "PENDING"] } },
    include: { payment: true, trip: { include: { bus: true, route: true } } },
  });
  if (!booking || !booking.payment || booking.payment.status !== "PAID") return NextResponse.json({ error: "A paid booking is required for a refund" }, { status: 400 });

  const hoursUntilDeparture = (booking.trip.departureTime.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntilDeparture <= 0) return NextResponse.json({ error: "This trip has already departed and cannot be cancelled" }, { status: 400 });
  const lastMinute = hoursUntilDeparture <= 24;
  const requestedAmount = lastMinute ? booking.totalAmount.mul(0.5) : booking.totalAmount;
  const refund = await prisma.refundRequest.create({ data: { userId: user.id, bookingId: booking.id, upiId: parsed.data.upiId, amount: requestedAmount } });
  await notifyAdminsByEmailAndSms("New cancellation request", `Cancellation request ${refund.id}\nCustomer: ${user.name}\nCustomer email: ${user.email}\nCustomer phone: ${user.phone || "Not provided"}\nBooking: ${booking.id}\nRequested refund: INR ${requestedAmount}\nPolicy: ${lastMinute ? "Cancellation within 24 hours of departure: 50% refund" : "Cancellation before the last 24 hours: admin review"}\nUPI: ${refund.upiId}`);
  return NextResponse.json({ success: true, refundId: refund.id }, { status: 201 });
}
