import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomSession } from "@/lib/session";
import { z } from "zod";
export const dynamic = "force-dynamic";


const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().max(30).default(""),
  address: z.string().trim().max(500),
  language: z.enum(["ENGLISH", "HINDI"]).default("ENGLISH"),
});

export async function PATCH(req: NextRequest) {
  const sessionUser = await getCustomSession();
  if (!sessionUser) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const parsed = profileSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile details" }, { status: 400 });

  const currentUser = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { phone: true, phoneVerified: true } });
  if (!currentUser) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  const phone = parsed.data.phone.trim().replace(/[^\d+]/g, "");

  // The phone only has to be OTP-verified when it is actually being changed.
  // Saving other fields (name, address, language) must not be blocked by an
  // unverified phone number.
  const phoneChanged = phone !== (currentUser.phone ?? "");
  if (phoneChanged && !currentUser.phoneVerified) {
    return NextResponse.json({ error: "Verify the new phone number with OTP before saving" }, { status: 400 });
  }
  if (phone) {
    const existingPhone = await prisma.user.findFirst({ where: { phone, NOT: { id: sessionUser.id } }, select: { id: true } });
    if (existingPhone) return NextResponse.json({ error: "This phone number already exists. Try another phone number." }, { status: 409 });
  }

  const user = await prisma.user.update({
    where: { id: sessionUser.id },
    data: {
      name: parsed.data.name.trim(),
      phone: phone || null,
      phoneVerified: phoneChanged ? false : currentUser.phoneVerified,
      address: parsed.data.address || null,
      language: parsed.data.language,
    },
    select: { phone: true, address: true, language: true, name: true },
  });

  return NextResponse.json(user);
}

export async function GET() {
  const sessionUser = await getCustomSession();
  if (!sessionUser) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { language: true } });
  return NextResponse.json({ language: user?.language || "ENGLISH" });
}