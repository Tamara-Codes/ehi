import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "EHI Babić — Dnevnik radova",
  description: "Dnevni izvještaji s gradilišta",
  // Required for the app to be "Add to Home Screen"-installable — and on
  // iOS, that installation is a hard prerequisite for push notifications
  // to work at all (Safari refuses to grant notification permission to a
  // plain browser tab; only an installed/home-screen PWA can ask).
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EHI Babić",
  },
};

export const viewport: Viewport = {
  themeColor: "#f2703c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="hr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
