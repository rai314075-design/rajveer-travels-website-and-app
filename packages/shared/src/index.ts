import { z } from "zod";

/**
 * Prisma returns native JS values that are not plain JSON-native: `Date` objects
 * for timestamp columns and `Decimal`-like objects for `@db.Decimal(10, 2)`
 * columns. When `JSON.stringify` runs over them, Dates become `{}`-ish objects,
 * breaking Zod unions of `string | number` exactly like this 500 report does.
 * Normalize every scalar to a JSON-safe primitive before schema validation.
 */
export const toJsonRow = <T>(row: T): T => {
  const walk = (value: unknown): unknown => {
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(value as Record<string, unknown>)) {
        out[key] = walk((value as Record<string, unknown>)[key]);
      }
      return out;
    }
    return value;
  };
  return walk(row) as T;
};

export const LanguageSchema = z.enum(["ENGLISH", "HINDI"]);
export type Language = z.infer<typeof LanguageSchema>;

export const RouteSummarySchema = z.object({
  id: z.string(),
  source: z.string(),
  destination: z.string(),
  pickupPoint: z.string().nullable(),
  dropPoint: z.string().nullable(),
});
export type RouteSummary = z.infer<typeof RouteSummarySchema>;
export const RouteListResponseSchema = z.object({ routes: z.array(RouteSummarySchema) });
export type RouteListResponse = z.infer<typeof RouteListResponseSchema>;

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  language: LanguageSchema,
  phoneVerified: z.boolean(),
  emailVerified: z.boolean(),
});
export type User = z.infer<typeof UserSchema>;
export const UserResponseSchema = z.object({ user: UserSchema });

export const BookingSchema = z.object({
  id: z.string(),
  status: z.string(),
  totalAmount: z.union([z.string(), z.number()]),
  createdAt: z.string(),
  passengerInfo: z.unknown(),
  payment: z.object({ status: z.string() }).nullable().optional(),
  trip: z.object({
    departureTime: z.string(),
    arrivalTime: z.string(),
    bus: z.object({
      busNumber: z.string(),
      ownerPhone: z.string().nullable(),
      pickupLocation: z.string().nullable(),
      dropLocation: z.string().nullable(),
    }),
    route: z.object({
      source: z.string(),
      destination: z.string(),
      pickupPoint: z.string().nullable(),
      dropPoint: z.string().nullable(),
    }),
  }),
});
export type Booking = z.infer<typeof BookingSchema>;
export const BookingListSchema = z.array(BookingSchema);

export const CreateBookingSchema = z.object({
  tripId: z.string().min(1),
  seatTemplateIds: z.array(z.string().min(1)).min(1).max(6),
});
export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

export const CreateBookingResponseSchema = z.object({
  bookingId: z.string(),
  status: z.string(),
  total: z.number().nonnegative(),
  seats: z.object({ seatNumbers: z.array(z.string()).optional() }),
  ownerName: z.string(),
  ownerPhone: z.string().nullable(),
  message: z.string(),
});
export type CreateBookingResponse = z.infer<typeof CreateBookingResponseSchema>;

export function buildApiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export function parseApiData<T>(data: unknown, schema: { parse(data: unknown): T }): T {
  return schema.parse(data);
}
