# Rajveer Travels mobile app

Expo and React Native client for the Rajveer Travels monorepo. The app uses the Next.js API in `apps/website` and the shared workspace package.

## Run from the repository root

```powershell
pnpm install
pnpm dev
```

To start only the mobile app:

```powershell
pnpm --filter rajveer-travels-app dev
```

Expo automatically selects an available Metro port, so another project using 8081 or 8082 will not block startup. Open the QR code from the current Expo terminal after starting the app; an already-open app can keep trying to connect to an old Metro URL.

Set `EXPO_PUBLIC_API_URL` in `apps/app/.env` to the website API base URL. For a physical device on the same Wi-Fi, use your computer's LAN IPv4 address and the website's development port, for example `http://192.168.1.5:5000`. Do not use `localhost` from a phone. The template is in `.env.example`.

## Checks

```powershell
pnpm --filter rajveer-travels-app typecheck
pnpm --filter rajveer-travels-app lint
```
