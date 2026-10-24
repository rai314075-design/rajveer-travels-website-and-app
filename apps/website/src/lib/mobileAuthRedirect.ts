/** Restrict the post-Auth0 deep link to this app's callback. */
export function isAllowedMobileAuthRedirect(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.username || url.password || url.search || url.hash) return false;

  if (
    url.protocol === "rajveertravels:" &&
    url.hostname === "auth" &&
    url.pathname === "/callback" &&
    !url.port
  ) {
    return true;
  }

  // Expo Go uses an exp:// URL during local development. Limit it to a local
  // network address and the app's callback route; never allow this in production.
  if (
    process.env.NODE_ENV !== "production" &&
    url.protocol === "exp:" &&
    url.pathname === "/--/auth/callback" &&
    !url.username &&
    !url.password &&
    isPrivateDevelopmentHost(url.hostname) &&
    Boolean(url.port)
  ) {
    return true;
  }

  return false;
}

function isPrivateDevelopmentHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  const private172 = host.match(/^172\.(\d{1,2})\.\d{1,3}\.\d{1,3}$/);
  return Boolean(private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31);
}
