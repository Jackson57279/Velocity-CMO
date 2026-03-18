import type { Metadata } from "next";
import Script from "next/script";
import { Azeret_Mono, Syne } from "next/font/google";

import "./globals.css";

const displayFont = Syne({
  subsets: ["latin"],
  variable: "--font-display",
});

const monoFont = Azeret_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Velocity CMO",
  description: "Autonomous growth analysis for landing pages and startup websites.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/@react-grab/mcp/dist/client.global.js"
            strategy="lazyOnload"
          />
        )}
      </head>
      <body className={`${displayFont.variable} ${monoFont.variable}`}>{children}</body>
    </html>
  )
}
