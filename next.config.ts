import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "uploadthing.com"
      },
      {
        protocol: "https",
        hostname: "utfs.io"
      }
    ]
  }
};

export default nextConfig;
