import type { NextConfig } from "next";

function hostnameOf(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

// Dev-server only: hostnames (no scheme/port) allowed to load dev assets. Besides
// LAN ranges and Cloudflare quick tunnels, the PUBLIC_ORIGIN host and any extra
// comma-separated ALLOWED_DEV_ORIGINS entries are allowed automatically.
const publicHost = process.env.PUBLIC_ORIGIN ? hostnameOf(process.env.PUBLIC_ORIGIN.trim()) : null;
const extraDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "192.168.*.*",
    "10.*.*.*",
    "172.*.*.*",
    "*.local",
    "*.trycloudflare.com",
    ...(publicHost ? [publicHost] : []),
    ...extraDevOrigins,
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
