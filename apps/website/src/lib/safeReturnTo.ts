const AUTH_ROUTES = new Set(["/login", "/register", "/api/logout"]);

/** Accept only same-site paths and never return an authenticated user to an auth route. */
export function safeReturnTo(value?: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }

  try {
    const base = "https://return.invalid";
    const target = new URL(value, base);
    if (target.origin !== base) return "/";

    const path = target.pathname.replace(/\/+$/, "") || "/";
    if (AUTH_ROUTES.has(path) || path.startsWith("/api/auth/")) return "/";

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}
