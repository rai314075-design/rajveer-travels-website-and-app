/**
 * Deterministic date formatting helpers.
 *
 * `Date.prototype.toLocaleDateString()` depends on the host's time zone and
 * locale, which differ between the server render and the browser. That makes
 * the markup mismatch and triggers a React hydration error. These helpers
 * format in a fixed time zone (UTC) and a fixed locale so the server and the
 * client always produce identical strings.
 */

const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return DATE_FORMAT.format(date);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return DATE_TIME_FORMAT.format(date).replace(",", "");
}
