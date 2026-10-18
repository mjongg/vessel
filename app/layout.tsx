import type { Metadata } from "next";
import "./globals.css";
import {ShareSetup} from "./share-setup";

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  title: "Vessel — Your health record",
  description: "Your medical history, ready for your next check-up. Private working prototype with fictional records.",
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
      <body className="antialiased"><ShareSetup/>{children}</body>
    </html>
  );
}
