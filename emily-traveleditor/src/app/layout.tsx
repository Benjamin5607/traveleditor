import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ChunkErrorRecovery from "../components/ChunkErrorRecovery";
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
  title: "Emily Travel Editor",
  description: "Groq-powered travel mood picker for Emily's themed recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ChunkErrorRecovery />
        {children}
      </body>
    </html>
  );
}
