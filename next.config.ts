import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site (no server features), so it can be hosted anywhere.
  output: "export",
};

export default nextConfig;
