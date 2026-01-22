import { ClerkProvider } from '@clerk/nextjs'
import { Montserrat } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { CookieConsentProvider } from "@/components/providers/cookie-consent-context";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { MaintenanceGate } from "@/components/maintenance-gate";
import { PWAGate } from "@/components/pwa/PWAGate";
import { PWARegister } from "@/components/pwa/PWARegister";

const montserrat = Montserrat({ subsets: ["latin"] });

export const metadata = {
  title: "Project Overwatch",
  description: "ERLC Multi-Server Dashboard",
  manifest: "/manifest.json",
  themeColor: "#111111",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "POW",
  },
  formatDetection: {
    telephone: false,
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          {/* PWA Meta Tags */}
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#111111" />
          <meta name="mobile-web-app-capable" content="yes" />

          {/* iOS PWA Meta Tags */}
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="POW" />
          <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

          {/* Prevent zoom on mobile */}
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        </head>
        <body className={montserrat.className}>
          <MaintenanceGate>
            <CookieConsentProvider>
              <PostHogProvider>
                <PWARegister />
                <PWAGate>
                  {children}
                </PWAGate>
                <CookieConsentBanner />
              </PostHogProvider>
            </CookieConsentProvider>
          </MaintenanceGate>
        </body>
      </html>
    </ClerkProvider>
  );
}

