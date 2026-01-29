import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PinVerse - Pinterest Marketing Tools for Creators",
  description: "Powerful Pinterest marketing automation tools. Create bulk pins, schedule content, and grow your Pinterest traffic with AI-powered tools.",
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
        </ThemeProvider>
      </body>
    </html>
  );
}
