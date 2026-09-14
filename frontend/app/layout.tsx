import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
import "./globals.css";

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
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
    <html lang="en" className={`h-full antialiased ${robotoMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Google+Sans+Display:ital,wght@0,400;0,500;0,700;1,400;1,500;1,700&family=Google+Sans+Text:ital,wght@0,400;0,500;0,700;1,400;1,500;1,700&family=Google+Sans:ital,wght@0,400;0,500;0,700;1,400;1,500;1,700&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#121410] text-[#D0D0D0]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

