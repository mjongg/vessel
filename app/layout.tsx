import type { Metadata } from "next";
import "./globals.css";
import {ShareSetup} from "./share-setup";

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  title: "Vessel — Your health record",
  description: "Your medical history, ready for your next check-up. Private personal and family health records.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=""/>
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- one serif for headings, loaded once for every page */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"/>
      </head>
      <body className="antialiased"><ShareSetup/>{children}</body>
    </html>
  );
}
