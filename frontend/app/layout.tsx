import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "GeoClass - Satellite Land Cover Workspace",
  description: "A geospatial workspace for land cover classification, satellite remote sensing, and environmental analysis with Google Earth Engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#121316] text-neutral-300 font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

