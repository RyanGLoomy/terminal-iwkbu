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
   // reactCompiler: true causes hydration error #418 in production builds
   // (Next.js 16 + Turbopack + React 19). See: vercel/next.js#87696.
   // Re-enable once the upstream bug is fixed.
   // reactCompiler: true,
   experimental: {
      // Tree-shake import per-ikon dari lucide-react (dipakai di banyak file).
      optimizePackageImports: ["lucide-react"],
   },
};

export default nextConfig;
