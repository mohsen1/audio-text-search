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
  title: {
    default: "Audio Text Search",
    template: "%s | Audio Text Search"
  },
  description: "Transform your audio files into searchable transcriptions with AI-powered accuracy. Upload, transcribe, and find exactly what you're looking for.",
  keywords: ["audio", "transcription", "search", "AI", "speech-to-text", "elevenlabs"],
  authors: [{ name: "Audio Text Search" }],
  creator: "Audio Text Search",
  publisher: "Audio Text Search",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'),
  openGraph: {
    title: "Audio Text Search",
    description: "Transform your audio files into searchable transcriptions with AI-powered accuracy.",
    url: '/',
    siteName: "Audio Text Search",
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Audio Text Search",
    description: "Transform your audio files into searchable transcriptions with AI-powered accuracy.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

import { Providers } from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
