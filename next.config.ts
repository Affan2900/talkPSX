import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Monorepo: parent folder has another lockfile; keep tracing rooted to this app (Vercel + local builds).
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
