import type { Metadata } from "next";
import { Inter, Inter_Tight, IBM_Plex_Mono, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-display",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-space",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-mono",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

const SITE_URL = "https://geoclass.nelsonizah.com";
const DESCRIPTION =
  "Draw an area, pull cloud-free satellite imagery, and classify land cover, vegetation and water in the browser. Export to GeoTIFF, GeoJSON or PDF.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "GeoClass — Satellite land cover analysis",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "GeoClass",
    title: "GeoClass — Satellite analysis, without the GIS overhead",
    description: DESCRIPTION,
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "GeoClass over a satellite view of the Niger–Benue confluence at Lokoja",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GeoClass — Satellite analysis, without the GIS overhead",
    description: DESCRIPTION,
    images: ["/og.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${inter.variable} ${interTight.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-[#0D1316] text-[#FFFFFF]" suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
