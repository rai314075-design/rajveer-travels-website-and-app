import { getCustomSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdminsByEmailAndSms } from "@/lib/adminNotifications";
import { z } from "zod";
export const dynamic = "force-dynamic";


const schema = z.object({
  category: z.enum(["BUS", "SERVICE", "DRIVER", "PAYMENT", "OTHER"]),
  message: z.string().trim().min(10).max(2000),
  bookingId: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  const sessionUser = await getCustomSession();
  if (!sessionUser) return NextResponse.json({ error: "Log in to send a complaint" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a category and enter at least 10 characters" }, { status: 400 });

  if (parsed.data.bookingId) {
    const booking = await prisma.booking.findFirst({ where: { id: parsed.data.bookingId, userId: user.id }, select: { id: true } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const complaint = await prisma.complaint.create({ data: { userId: user.id, bookingId: parsed.data.bookingId || null, category: parsed.data.category, message: parsed.data.message } });
  await notifyAdminsByEmailAndSms(
    "New Rajveer Travels complaint",
    `New complaint ${complaint.id}\nCustomer: ${user.name}\nCustomer email: ${user.email}\nCustomer phone: ${user.phone || "Not provided"}\nCategory: ${complaint.category}\nBooking: ${complaint.bookingId || "Not provided"}\nMessage: ${complaint.message}`,
  );
  return NextResponse.json({ success: true, complaintId: complaint.id }, { status: 201 });
}

