import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { z } from "zod";
export const dynamic = "force-dynamic";


const vehicleSchema = z.object({
  name: z.string().min(1),
  totalDecks: z.number().int().min(1).max(2),
});

/**
 * GET /api/vehicles
 * Lists all vehicles.
 */
export async function GET() {
  const vehicles = await prisma.vehicle.findMany({
    where: { isActive: true },
    include: {
      seatTemplates: true,
    },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(vehicles);
}

/**
 * POST /api/vehicles
 * Creates a new vehicle (admin only).
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok)
    return NextResponse.json({ error: guard.message }, { status: guard.status });

  const body = await req.json().catch(() => null);
  const parsed = vehicleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const vehicle = await prisma.vehicle.create({
    data: parsed.data,
    include: { seatTemplates: true },
  });

  return NextResponse.json(vehicle, { status: 201 });
}