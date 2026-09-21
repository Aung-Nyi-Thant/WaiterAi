import type { NextConfig } from "next";

const config: NextConfig = {
  turbopack: { root: __dirname },
  serverExternalPackages: ["qrcode", "bcryptjs"],
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
};

export default config;
