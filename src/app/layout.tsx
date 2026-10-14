import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/layout/Header";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "BreatheWay — Clean-Air Walking Routes",
  description:
    "Compare pedestrian routes scored by real-time air quality and road traffic proximity. Find your cleanest path with BreatheWay.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0F766E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans" suppressHydrationWarning>
        {/* Accessible Skip Links */}
        <nav aria-label="Skip links">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:bg-teal-700 focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 font-medium text-sm"
          >
            Skip to main content
          </a>
          <a
            href="#results-panel"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-44 focus:z-[60] focus:px-4 focus:py-2 focus:bg-teal-700 focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 font-medium text-sm"
          >
            Skip to results
          </a>
          <a
            href="#map-container"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-80 focus:z-[60] focus:px-4 focus:py-2 focus:bg-teal-700 focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 font-medium text-sm"
          >
            Skip to map
          </a>
        </nav>

        <Providers>
          <Header />
          <div className="flex-1 flex flex-col relative">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
