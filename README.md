# Rajveer Travels monorepo

This pnpm workspace contains the Expo app (`apps/app`), the Next.js website and API (`apps/website`), and shared TypeScript and Zod code (`packages/shared`).

## Start both projects

```powershell
pnpm install
pnpm dev
```

The website listens on port 5000 and binds to the local network. Expo starts alongside it. Run `pnpm build` to build the website.

## Connect a physical phone to the local API

Copy `apps/app/.env.example` to `apps/app/.env` and set `EXPO_PUBLIC_API_URL` to `http://<computer-LAN-IPv4>:5000`, for example `http://192.168.1.25:5000`. Find the address with `ipconfig`. Set `JWT_SECRET` in `apps/website/.env.local` to a random 32-byte secret. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Connect both devices to the same network, allow Node.js through Windows Firewall if prompted, then restart Expo after changing the environment file. A phone's `localhost` refers to the phone itself.

Android emulators can use `http://10.0.2.2:5000`; iOS simulators can generally use `http://localhost:5000`.

## Shared code

```ts
import {
  BookingListSchema,
  CreateBookingResponseSchema,
  CreateBookingSchema,
  UserSchema,
} from "@rajveer/shared";
import type { Booking, User } from "@rajveer/shared";
import { api } from "@/lib/api";

const bookings: Booking[] = await api("/api/bookings", { schema: BookingListSchema });
const input = CreateBookingSchema.parse({ tripId, seatTemplateIds });
const result = await api("/api/bookings", {
  method: "POST",
  body: input,
  schema: CreateBookingResponseSchema,
});
```

Both clients call the same Next.js route handlers under `apps/website/src/app/api`. The server validates incoming bodies, accesses Prisma and Neon, and returns JSON; the shared package provides the matching Zod schemas and TypeScript types. The mobile app uses the same `BookingListSchema` and booking request/response schemas. It does not connect to Prisma or the database directly.

## Authentication

The Expo app currently signs in through the Next.js `/api/login` route and sends API calls with `Authorization: Bearer <token>`. That token is a project-issued HS256 JWT signed with the server-only `JWT_SECRET`; it is not an Auth0 access token. Website requests can use the existing Auth0 session cookie. Both authentication paths resolve to the same Prisma user before a protected route reads or writes that user's data.

If native mobile sign-in is changed to Auth0, request an **access token** for the custom API audience and send that token as the bearer value. The Next.js server must then validate its signature with the Auth0 tenant JWKS and check issuer, audience, expiry, and required scopes before mapping the Auth0 `sub` to a Prisma user. Never send an Auth0 ID token as the API bearer token, and never put an Auth0 client secret or the server JWT secret in an `EXPO_PUBLIC_` variable. The Auth0 React Native SDK is not currently configured in `apps/app`.
