import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone mode: emits a minimal self-contained server for Docker
  output: "standalone",
};

export default nextConfig;
