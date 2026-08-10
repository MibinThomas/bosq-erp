import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import { Toaster } from "sonner";

const getMetadataBase = () => {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (envUrl) {
    try {
      const formatted = envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
      const parsed = new URL(formatted);
      if (parsed.hostname) return parsed;
    } catch {}
  }
  if (process.env.VERCEL_URL) {
    try {
      const cleanVercelUrl = process.env.VERCEL_URL.replace(/^https?:\/\//, "");
      return new URL(`https://${cleanVercelUrl}`);
    } catch {}
  }
  return new URL("http://localhost:3000");
};

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "BOSQ ERP - Quotation Management",
  description: "BOSQ ERP Enterprise Quotation, SharePoint Sync, & IDC Revision Audit Log",
  icons: {
    icon: [
      { url: "/assets/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/assets/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/favicon/favicon.ico" }
    ],
    apple: [
      { url: "/assets/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ],
    other: [
      { rel: "manifest", url: "/assets/favicon/site.webmanifest" }
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          {children}
          <Toaster position="top-right" richColors />
        </SessionProvider>
      </body>
    </html>
  );
}
