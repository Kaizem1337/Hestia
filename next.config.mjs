/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // yahoo-finance2 is a server-only dependency; keep it out of the client bundle.
  experimental: {
    serverComponentsExternalPackages: ["yahoo-finance2"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
