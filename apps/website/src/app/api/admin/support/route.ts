import { getSession } from "@auth0/nextjs-auth0";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRefundEmail } from "@/lib/adminNotifications";
import { z } from "zod";
export const dynamic = "force-dynamic";


async function adminUser() {
  const session = await getSession();
  if (!session?.user?.sub) return null;
  const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub } });
  return user?.role === "ADMIN" ? user : null;
}

export async function GET() {
  const user = await adminUser();
  if (!user) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const [complaints, refunds] = await Promise.all([
    prisma.complaint.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } }),
    prisma.refundRequest.findMany({ include: { user: true, booking: { include: { trip: { include: { bus: true, route: true } } } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return NextResponse.json({ complaints, refunds });
}

export async function PATCH(req: NextRequest) {
  const user = await adminUser();
  if (!user) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const schema = z.object({ type: z.enum(["COMPLAINT", "REFUND"]), id: z.string(), action: z.enum(["RESOLVE", "PAY", "CANCEL"]), otp: z.string().length(6).optional() });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid support action" }, { status: 400 });

  if (parsed.data.type === "COMPLAINT") {
    if (parsed.data.action !== "RESOLVE") return NextResponse.json({ error: "Invalid complaint action" }, { status: 400 });
    const complaint = await prisma.complaint.update({ where: { id: parsed.data.id }, data: { status: "RESOLVED", resolvedAt: new Date() } });
    return NextResponse.json({ success: true, complaint });
  }

  const refund = await prisma.refundRequest.findUnique({ where: { id: parsed.data.id }, include: { user: true } });
  if (!refund) return NextResponse.json({ error: "Refund request not found" }, { status: 404 });
  if (parsed.data.action === "CANCEL") {
    if (!parsed.data.otp || parsed.data.otp !== refund.cancellationOtp) return NextResponse.json({ error: "The cancellation OTP is incorrect" }, { status: 400 });
    await prisma.$transaction([
      prisma.refundRequest.update({ where: { id: refund.id }, data: { status: "APPROVED" } }),
      prisma.booking.update({ where: { id: refund.bookingId }, data: { status: "CANCELLED" } }),
      prisma.seat.updateMany({ where: { bookingId: refund.bookingId }, data: { status: "AVAILABLE", bookingId: null } }),
    ]);
    return NextResponse.json({ success: true, message: "Cancellation completed." });
  }
  const message = "Your refund has been processed to the UPI ID you provided.";
  const delivered = await sendRefundEmail(refund.user.email, refund.user.name, refund.amount.toString(), message);
  if (!delivered) return NextResponse.json({ error: "Refund email was not sent. Configure RESEND_API_KEY and EMAIL_FROM first." }, { status: 503 });

  const updated = await prisma.refundRequest.update({ where: { id: refund.id }, data: { status: "PAID", adminMessage: message, processedAt: new Date() } });
  await prisma.booking.update({ where: { id: refund.bookingId }, data: { status: "REFUNDED" } });
  await prisma.payment.update({ where: { bookingId: refund.bookingId }, data: { status: "REFUNDED" } });
  return NextResponse.json({ success: true, refund: updated });
}
