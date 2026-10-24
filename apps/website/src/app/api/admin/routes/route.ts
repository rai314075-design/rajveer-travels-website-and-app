import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { z } from "zod";
export const dynamic = "force-dynamic";


const routeSchema = z.object({
  source: z.string().trim().min(2),
  destination: z.string().trim().min(2),
  pickupPoint: z.string().trim().max(200).optional().or(z.literal("")),
  dropPoint: z.string().trim().max(200).optional().or(z.literal("")),
  distanceKm: z.number().int().positive(),
  durationMins: z.number().int().positive(),
});

export async function GET() {
  const routes = await prisma.route.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { trips: { where: { isActive: true } } } } },
  });
  return NextResponse.json(routes.map(({ _count, ...route }) => ({ ...route, scheduledTripCount: _count.trips })));
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const body = await req.json();
  const parsed = routeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const route = await prisma.route.create({
    data: {
      ...parsed.data,
      pickupPoint: parsed.data.pickupPoint?.trim() || undefined,
      dropPoint: parsed.data.dropPoint?.trim() || undefined,
    },
  });
  return NextResponse.json(route, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const routeId = new URL(req.url).searchParams.get("id");
  if (!routeId) return NextResponse.json({ error: "Route id is required" }, { status: 400 });

  const route = await prisma.route.findUnique({ where: { id: routeId }, select: { id: true } });
  if (!route) return NextResponse.json({ error: "Route not found" }, { status: 404 });

  await prisma.route.update({ where: { id: routeId }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
