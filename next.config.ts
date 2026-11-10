import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig: NextConfig = {
  /* config options here */
};

/**
 * NextAuth parses these at module load (also while pages are pre-rendered during the build):
 * a value that doesn't start with "http" gets "https://" in front and must then be a valid URL.
 * Fail early with a clear message instead of a bare "Invalid URL" deep in a page.
 */
function assertAuthUrls() {
  for (const name of ["NEXTAUTH_URL", "NEXTAUTH_URL_INTERNAL", "VERCEL_URL"]) {
    const raw = process.env[name];
    if (raw === undefined || raw === "") continue;
    const candidate = raw.startsWith("http") ? raw : `https://${raw}`;
    try {
      new URL(candidate);
    } catch {
      throw new Error(
        `${name} is not a valid URL (value hidden). Set it to a plain address such as ` +
        `https://erp.example.com — no quotes, spaces, commas or extra text — in the deployment's environment variables.`
      );
    }
  }
}

export default (phase: string): NextConfig => {
  if (phase === PHASE_PRODUCTION_BUILD) {
    assertAuthUrls();
    // NextAuth warns during build/prerendering when NEXTAUTH_URL is missing. Give the build a
    // harmless local value. Never set it at runtime: there, NextAuth must use the real deployment
    // URL (NEXTAUTH_URL, or VERCEL_URL on Vercel), or sign-in redirects would go to the wrong host.
    if (!process.env.NEXTAUTH_URL && !process.env.VERCEL_URL) {
      process.env.NEXTAUTH_URL = "http://localhost:3000";
    }
  }
  return nextConfig;
};
