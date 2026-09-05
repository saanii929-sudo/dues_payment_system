import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components ("use cache", PPR) is intentionally left disabled.
  // This app is almost entirely authenticated, tenant-scoped financial data
  // with no static/marketing surface to benefit from it, and it would
  // require auditing every data read to avoid caching one tenant's data for
  // another. See ARCHITECTURE.md.
  experimental: {
    serverActions: {
      // Headroom for official student list CSV/XLSX uploads (Phase 2+).
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
