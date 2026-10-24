import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";


export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, password, phone } = body as {
    name: string;
    email: string;
    password: string;
    phone?: string;
  };

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 });
  }

  // The email is fixed at registration and is stored lowercased so logins and
  // uniqueness checks always agree on the same value.
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use." }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email: normalizedEmail, password: hashed, phone, emailVerified: false },
  });

  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } }, { status: 201 });
}