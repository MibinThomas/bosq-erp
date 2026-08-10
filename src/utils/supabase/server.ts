import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};
