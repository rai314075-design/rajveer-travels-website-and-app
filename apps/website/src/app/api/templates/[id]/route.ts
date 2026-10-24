import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { z } from "zod";
export const dynamic = "force-dynamic";


/**
 * GET /api/templates/[id] — Get a single seat template
 * PATCH /api/templates/[id] — Update a seat template (admin only)
 * DELETE /api/templates/[id] — Delete a seat template (admin only)
 */

const updateSchema = z.object({
  seatNumber: z.string().min(1).optional(),
  deck: z.enum(["LOWER", "UPPER"]).optional(),
  type: z.enum(["SEAT", "SLEEPER"]).optional(),
  rowSpan: z.number().int().positive().optional(),
  colSpan: z.number().int().positive().optional(),
  xPosition: z.number().int().optional(),
  yPosition: z.number().int().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const template = await prisma.seatTemplate.findUnique({
    where: { id: params.id },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin(req);
  if (!guard.ok)
    return NextResponse.json({ error: guard.message }, { status: guard.status });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const template = await prisma.seatTemplate.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json(template);
  } catch (err: any) {
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin(req);
  if (!guard.ok)
    return NextResponse.json({ error: guard.message }, { status: guard.status });

  try {
    await prisma.seatTemplate.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    throw err;
  }
}