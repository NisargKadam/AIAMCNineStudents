import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
export const metadata: Metadata = {
  title: {
    default: "AI AMC Nine Student Portal",
    template: "%s · AI AMC Nine",
  },
  description:
    "The learning and community portal for AI AMC — Agentic AI Masterclass.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${mono.variable}`}>
      <body>
        <a
          href="#main-content"
          className="focus:bg-accent sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:m-3 focus:rounded-lg focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        {children}
        <Toaster theme="dark" richColors position="top-right" />
      </body>
    </html>
  );
}
