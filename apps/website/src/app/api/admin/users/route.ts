import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSuperAdmin } from "@/lib/requireAdmin";
import { z } from "zod";
export const dynamic = "force-dynamic";


const promoteSchema = z.object({ email: z.string().email() });

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isSuperAdmin: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ users, canManageAdmins: guard.user.isSuperAdmin });
}

export async function POST(req: NextRequest) {
  const guard = await requireSuperAdmin(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const parsed = promoteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "A valid email is required" }, { status: 400 });

  const user = await prisma.user.updateMany({
    where: { email: parsed.data.email, isSuperAdmin: false },
    data: { role: "ADMIN" },
  });
  if (user.count === 0) {
    return NextResponse.json({ error: "User not found or already the first admin" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}