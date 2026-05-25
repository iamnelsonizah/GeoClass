import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeoClass - Land Cover Analysis Workspace",
  description: "A geospatial workspace for land cover classification, remote sensing review, and environmental reporting with Google Earth Engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
