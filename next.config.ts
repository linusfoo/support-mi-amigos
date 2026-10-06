import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep postgres external so OpenNext ships its "workerd" build (cloudflare:sockets)
  // instead of the Node build, whose TLS options Workers doesn't implement.
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
