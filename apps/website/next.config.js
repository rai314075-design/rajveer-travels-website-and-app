/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@rajveer/shared"],
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};
module.exports = nextConfig;
