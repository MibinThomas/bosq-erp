import type { NextConfig } from "next";

// Fallback for NextAuth during build/prerendering when env variables are not loaded.
// Do not override if VERCEL_URL is present, allowing NextAuth to auto-detect the domain at runtime.
if (!process.env.NEXTAUTH_URL && !process.env.VERCEL_URL) {
  process.env.NEXTAUTH_URL = "https://placeholder.supabase.co";
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
