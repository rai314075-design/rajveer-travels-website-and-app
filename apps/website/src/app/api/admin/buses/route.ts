import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { z } from "zod";
export const dynamic = "force-dynamic";


const busSchema = z.object({
  busNumber: z.string().min(2),
  type: z.enum(["AC_SEATER", "AC_SLEEPER", "NON_AC_SEATER", "NON_AC_SLEEPER"]),
  totalSeats: z.number().int().positive(),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  amenities: z.array(z.string()).optional(),
  upiId: z.string().trim().max(255).optional().or(z.literal("")),
  paymentQrUrl: z.string().trim().max(2048).optional().or(z.literal("")),
  ownerPhone: z.string().trim().max(30).optional().or(z.literal("")),
  pickupLocation: z.string().trim().max(200).optional().or(z.literal("")),
  dropLocation: z.string().trim().max(200).optional().or(z.literal("")),
});

export async function GET() {
  const buses = await prisma.bus.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(buses);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const body = await req.json();
  const parsed = busSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const normalizedData = {
    ...parsed.data,
    description: parsed.data.description?.trim() || null,
    upiId: parsed.data.upiId?.trim() || null,
    paymentQrUrl: parsed.data.paymentQrUrl?.trim() || null,
    ownerPhone: parsed.data.ownerPhone?.trim() || null,
    pickupLocation: parsed.data.pickupLocation?.trim() || null,
    dropLocation: parsed.data.dropLocation?.trim() || null,
  };

  const bus = await prisma.bus.create({ data: normalizedData });
  return NextResponse.json(bus, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { searchParams } = new URL(req.url);
  const busId = searchParams.get("id");
  if (!busId) return NextResponse.json({ error: "Bus id is required" }, { status: 400 });

  const bus = await prisma.bus.findUnique({
    where: { id: busId },
    include: { _count: { select: { trips: true } } },
  });
  if (!bus) return NextResponse.json({ error: "Bus not found" }, { status: 404 });

  // Block deletion if the bus has trips with confirmed bookings
  const tripsWithConfirmedBookings = await prisma.trip.findMany({
    where: { busId: bus.id, isActive: true, bookings: { some: { status: "CONFIRMED" } } },
    include: { _count: { select: { bookings: { where: { status: "CONFIRMED" } } } } },
  });

  if (tripsWithConfirmedBookings.length > 0) {
    return NextResponse.json({ error: "Cancel or move the bookings first" }, { status: 409 });
  }

  await prisma.bus.update({ where: { id: busId }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
