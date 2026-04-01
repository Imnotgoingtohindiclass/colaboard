import type { Metadata } from "next";
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
  title: "colaboard",
  description: "Draw together in real time. Free collaborative whiteboard with no sign-up required. Features live cursors, chat, and CRDT-based sync.",
  keywords: ["whiteboard", "collaborative", "real-time", "drawing", "CRDT", "Yjs"],
  authors: [{ name: "colaboard" }],
  openGraph: {
    title: "colaboard",
    description: "Draw together in real time. No sign-up required.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "colaboard",
    description: "Real-time collaborative whiteboard",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-900 overflow-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
