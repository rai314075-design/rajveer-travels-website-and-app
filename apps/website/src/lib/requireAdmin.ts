import { getSession } from "@auth0/nextjs-auth0";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// Confirms the current Auth0 session maps to a Postgres User with role=ADMIN.
// Every /api/admin/* route calls this first and bails out with 401/403 if it fails.
export async function requireAdmin(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return { ok: false as const, status: 401, message: "Not logged in" };

  const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user || user.role !== "ADMIN") {
    return { ok: false as const, status: 403, message: "Admin access required" };
  }
  return { ok: true as const, user };
}

export async function requireSuperAdmin(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard;
  if (!guard.user.isSuperAdmin) {
    return { ok: false as const, status: 403, message: "Only the first admin can manage admins" };
  }
  return guard;
}
