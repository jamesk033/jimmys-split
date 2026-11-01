import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ServiceWorkerRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  title: { default: "Jimmy's Split", template: "%s · Jimmy's Split" },
  description: "The lifting log by ICT_Jimmy. Run an Upper / Lower split forever: pre-lift checklist, check off sets, set next workout's weights, post-lift and refuel. Free.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://jimmys-split.vercel.app")),
  openGraph: {
    type: "website",
    siteName: "Jimmy's Split",
    title: "Jimmy's Split: the lifting log by ICT_Jimmy",
    description: "Upper / Lower forever. Check off every set. Free.",
  },
  twitter: { card: "summary_large_image", title: "Jimmy's Split: the lifting log by ICT_Jimmy", description: "Upper / Lower forever. Check off every set. Free." },
  applicationName: "Jimmy's Split",
  appleWebApp: { capable: true, title: "Jimmy's Split", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#050506",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh">
        {children}
        <ServiceWorkerRegister />
        {/* Vercel's cookie-free page views and load speed. They only send data on the live site. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
