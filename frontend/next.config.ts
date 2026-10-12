import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  transpilePackages: ["lucide-react"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
