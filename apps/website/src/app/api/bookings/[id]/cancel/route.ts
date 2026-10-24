import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyCancellationRequest } from "@/lib/adminNotifications";
import { getCustomSession } from "@/lib/session";
import { z } from "zod";
import { randomInt } from "crypto";
export const dynamic = "force-dynamic";


const schema = z.object({ upiId: z.string().trim().min(3).max(255) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCustomSession();
  if (!user) return NextResponse.json({ error: "Log in to cancel a booking" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "UPI ID is required for the refund" }, { status: 400 });

  const booking = await prisma.booking.findFirst({
    where: { id: params.id, userId: user.id, status: { in: ["CONFIRMED", "PENDING"] } },
    include: { payment: true, trip: { include: { bus: true, route: true } } },
  });
  if (!booking || !booking.payment || booking.payment.status !== "PAID") return NextResponse.json({ error: "A paid booking is required" }, { status: 400 });
  const hoursUntilDeparture = (booking.trip.departureTime.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntilDeparture <= 0) return NextResponse.json({ error: "This trip has already departed" }, { status: 400 });
  if (await prisma.refundRequest.findUnique({ where: { bookingId: booking.id } })) return NextResponse.json({ error: "A cancellation request already exists" }, { status: 409 });

  const lastMinute = hoursUntilDeparture <= 24;
  const amount = booking.totalAmount.mul(lastMinute ? 0.5 : 1);
  const cancellationOtp = String(randomInt(100000, 1000000));
  const refund = await prisma.refundRequest.create({ data: { userId: user.id, bookingId: booking.id, upiId: parsed.data.upiId, amount, cancellationOtp } });
  await notifyCancellationRequest({ busOwnerPhone: booking.trip.bus.ownerPhone, bookingId: booking.id, customerName: user.name, customerEmail: user.email, customerPhone: user.phone || null, otp: cancellationOtp, busNumber: booking.trip.bus.busNumber, source: booking.trip.route.source, destination: booking.trip.route.destination, departureTime: booking.trip.departureTime });
  return NextResponse.json({ success: true, refundId: refund.id, amount: amount.toString(), lastMinute });
}