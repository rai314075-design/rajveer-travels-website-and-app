import { NextResponse } from "next/server";
import { RouteListResponseSchema } from "@rajveer/shared";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Public list of active routes for the website and mobile app. */
export async function GET() {
  const routes = await prisma.route.findMany({
    where: { isActive: true },
    select: {
      id: true,
      source: true,
      destination: true,
      pickupPoint: true,
      dropPoint: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(RouteListResponseSchema.parse({ routes }), {
    headers: { "Cache-Control": "no-store" },
  });
}
