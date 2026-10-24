import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { z } from "zod";
export const dynamic = "force-dynamic";


/**
 * GET /api/templates
 *
 * Lists vehicle seat templates for admin use.
 * Optionally filters by vehicleId query parameter.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vehicleId = searchParams.get("vehicleId");

  const templates = await prisma.seatTemplate.findMany({
    where: {
      ...(vehicleId ? { vehicleId } : {}),
    },
    select: {
      id: true,
      vehicleId: true,
      seatNumber: true,
      deck: true,
      type: true,
      rowSpan: true,
      colSpan: true,
      xPosition: true,
      yPosition: true,
    },
    orderBy: [{ vehicleId: "asc" }, { xPosition: "asc" }],
  });
  return NextResponse.json(templates);
}

const createSchema = z.object({
  vehicleId: z.string(),
  seatNumber: z.string().min(1),
  deck: z.enum(["LOWER", "UPPER"]),
  type: z.enum(["SEAT", "SLEEPER"]),
  rowSpan: z.number().int().positive().default(1),
  colSpan: z.number().int().positive().default(1),
  xPosition: z.number().int(),
  yPosition: z.number().int(),
});

/**
 * POST /api/templates
 *
 * Creates a new seat template for a vehicle.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok)
    return NextResponse.json({ error: guard.message }, { status: guard.status });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Ensure the vehicle exists
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: parsed.data.vehicleId },
    select: { id: true },
  });
  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  const template = await prisma.seatTemplate.create({
    data: parsed.data,
  });

  return NextResponse.json(template, { status: 201 });
}