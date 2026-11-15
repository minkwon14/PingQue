import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets iPhone/iPad on the same Wi-Fi load dev assets from the host's LAN IP.
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
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
