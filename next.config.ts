import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig: NextConfig = {
  /* config options here */
};

export default (phase: string): NextConfig => {
  // NextAuth warns during build/prerendering when NEXTAUTH_URL is missing. Give the build a
  // harmless local value. Never set it at runtime: there, NextAuth must use the real deployment
  // URL (NEXTAUTH_URL, or VERCEL_URL on Vercel), or sign-in redirects would go to the wrong host.
  if (phase === PHASE_PRODUCTION_BUILD && !process.env.NEXTAUTH_URL && !process.env.VERCEL_URL) {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
  }
  return nextConfig;
};
