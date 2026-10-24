import { getSession } from "@auth0/nextjs-auth0";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
export const dynamic = "force-dynamic";


const schema = z.object({ channel: z.enum(["EMAIL", "SMS"]) });

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.sub) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose email or SMS" }, { status: 400 });
  if (parsed.data.channel === "SMS" && !user.phone) return NextResponse.json({ error: "Add a phone number to your profile before choosing SMS" }, { status: 400 });
  const updated = await prisma.user.update({ where: { id: user.id }, data: { notificationChannel: parsed.data.channel }, select: { notificationChannel: true } });
  return NextResponse.json(updated);
}
