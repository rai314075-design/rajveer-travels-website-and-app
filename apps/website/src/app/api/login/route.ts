import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { signMobileToken } from "@/lib/mobileToken";
export const dynamic = "force-dynamic";


export async function POST(req: NextRequest) {
  const isJson = req.headers.get("content-type")?.includes("application/json") ?? false;
  const body = isJson
    ? await req.json()
    : Object.fromEntries((await req.formData()).entries());
  const { email, password } = body as { email: string; password: string };

  if (!email || !password) {
    if (!isJson) return NextResponse.redirect(new URL("/login?error=missing_fields", req.url));
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    if (!isJson) return NextResponse.redirect(new URL("/login?error=invalid_credentials", req.url));
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    if (!isJson) return NextResponse.redirect(new URL("/login?error=invalid_credentials", req.url));
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  if (user.bannedUntil && user.bannedUntil > new Date()) {
    return isJson ? NextResponse.json({ error: `Your account is suspended until ${user.bannedUntil.toLocaleDateString()}.` }, { status: 403 }) : NextResponse.redirect(new URL("/login?error=account_suspended", req.url));
  }

  // Create a simple session cookie
  const sessionToken = Buffer.from(`${user.id}:${Date.now()}`).toString("base64");
  const response = isJson
    ? NextResponse.json({ token: signMobileToken(user.id), user: { id: user.id, name: user.name, email: user.email } })
    : NextResponse.redirect(new URL("/", req.url));
  response.cookies.set("session_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
  });
  return response;
}
