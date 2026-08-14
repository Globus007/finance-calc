import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { HoneybadgerProvider } from "@/components/honeybadger-provider";
import { TelegramAppChrome } from "@/components/telegram/telegram-app-chrome";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Финансы",
  description: "Личный учёт расходов и доходов (BYN)",
  applicationName: "Финансы",
  icons: {
    icon: [
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Финансы",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    // iOS legacy: modern Safari also reads appleWebApp.capable.
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#F3F0FA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden font-sans">
        {/* SPIKE: telegram-feel-demo — official WebApp JS (no-op outside TG). */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <HoneybadgerProvider>
          <TelegramAppChrome />
          {children}
        </HoneybadgerProvider>
      </body>
    </html>
  );
}
