import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import React from "react";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PinVerse Platform",
  description: "Advanced Pinterest Operations",
  keywords: "Pinterest, marketing, bulk pins, automation, Pinterest tools, content creator, Pinterest scheduler",
  authors: [{ name: "Ecomverse LLC" }],
  openGraph: {
    title: "PinVerse - Pinterest Marketing Tools",
    description: "Powerful Pinterest marketing automation tools for creators and businesses.",
    url: "https://pinverse.io",
    siteName: "PinVerse",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PinVerse - Pinterest Marketing Tools",
    description: "Powerful Pinterest marketing automation tools for creators and businesses.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
