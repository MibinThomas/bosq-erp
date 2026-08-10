import { createBrowserClient } from "@supabase/ssr";

const getValidUrl = (url: string | undefined, fallback: string) => {
  if (!url) return fallback;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname || parsed.hostname.length === 0) return fallback;
    return url;
  } catch {
    return fallback;
  }
};

const supabaseUrl = getValidUrl(process.env.NEXT_PUBLIC_SUPABASE_URL, "https://placeholder.supabase.co");
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder-key";

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );

