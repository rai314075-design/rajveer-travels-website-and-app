// Base URL of the Next.js website and API. On a physical phone, use your
// computer's LAN IP in apps/app/.env; localhost points back to the phone.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000').replace(/\/+$/, '');
