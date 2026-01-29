import type { Metadata } from "next";
import { Rajdhani, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Cam Analysis",
  description: "Camera intelligence dashboard for NVR feeds"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="noir"
      className={`${spaceGrotesk.variable} ${rajdhani.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
