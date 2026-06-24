import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   /* config options here */
   // Allow the network host to access Next dev resources (HMR) during development.
   // Add any other development hosts here if you access the app from other devices.
   allowedDevOrigins: [
      "http://192.168.1.5:3000",
      "http://localhost:3000",
      "http://192.168.1.5:3001",
      "http://localhost:3001",
   ],
   reactCompiler: true,
};

export default nextConfig;
