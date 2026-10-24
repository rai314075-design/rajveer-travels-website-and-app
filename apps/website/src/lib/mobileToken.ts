import jwt from "jsonwebtoken";

// Signed session token for the mobile app, sent as "Authorization: Bearer <token>".
// Signed with JWT_SECRET (already in .env.example) so it cannot be forged.

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not set");
  return value;
}

export function signMobileToken(userId: string): string {
  return jwt.sign({ sub: userId, typ: "mobile" }, secret(), { algorithm: "HS256", expiresIn: "30d" });
}

/** Returns the user id if the token is valid and unexpired, otherwise null. */
export function verifyMobileToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload === "object" && payload.typ === "mobile" && typeof payload.sub === "string") return payload.sub;
    return null;
  } catch {
    return null;
  }
}
