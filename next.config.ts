import type { NextConfig } from "next";

// Fallback for NextAuth during build/prerendering when env variables are not loaded
if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = "https://placeholder.supabase.co";
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
