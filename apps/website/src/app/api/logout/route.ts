import { NextRequest, NextResponse } from "next/server";
import { getRequestOrigin } from "@/lib/requestOrigin";

export async function GET(req: NextRequest) {
  // Clear the app's email/password session, then let Auth0's own handler clear
  // its session and perform the identity-provider logout.
  const response = NextResponse.redirect(new URL("/api/auth/logout", getRequestOrigin(req)));
  response.cookies.set("session_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
