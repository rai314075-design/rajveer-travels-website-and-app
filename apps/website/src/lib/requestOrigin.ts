import type { NextRequest } from "next/server";

/**
 * Resolve the origin the client used to reach Next.js.
 * `request.nextUrl.origin` can be 0.0.0.0 when Next listens on all interfaces,
 * which is a bind address and must not be sent to Auth0 as a callback URL.
 */
export function getRequestOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim();
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim();
  const protocol = forwardedProtocol || request.nextUrl.protocol.replace(/:$/, "");

  if (host && (protocol === "http" || protocol === "https")) {
    try {
      const url = new URL(`${protocol}://${host}`);
      if (isBrowserOrigin(url)) {
        return url.origin;
      }
    } catch {
      // Fall through to Next.js's parsed request URL.
    }
  }

  const requestUrl = new URL(request.nextUrl.origin);
  if (isBrowserOrigin(requestUrl)) return requestUrl.origin;

  const configuredBaseUrl = process.env.AUTH0_BASE_URL;
  if (configuredBaseUrl) {
    try {
      const configuredUrl = new URL(configuredBaseUrl);
      if (isBrowserOrigin(configuredUrl)) return configuredUrl.origin;
    } catch {
      // Fall through to the local development fallback.
    }
  }

  return "http://localhost:5000";
}

function isBrowserOrigin(url: URL): boolean {
  return !url.username && !url.password &&
    url.pathname === "/" && !url.search && !url.hash &&
    (url.protocol === "http:" || url.protocol === "https:") &&
    !["0.0.0.0", "::", "[::]"].includes(url.hostname.toLowerCase());
}
