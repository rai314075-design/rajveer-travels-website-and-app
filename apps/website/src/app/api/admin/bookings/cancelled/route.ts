import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request) {
  const sessionUser = await getCustomSession();
  if (!sessionUser) return NextResponse.json({ error: "Log in to delete bookings" }, { status: 401 });

  const admin = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { role: true } });
  if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const result = await prisma.booking.deleteMany({
    where: { status: "CANCELLED" },
  });

  return NextResponse.json({ success: true, deletedCount: result.count });
}