import type { Metadata } from "next";
import { Manrope, Noto_Sans_Tamil } from "next/font/google";
import { headers } from "next/headers";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const notoTamil = Noto_Sans_Tamil({
  variable: "--font-tamil",
  subsets: ["tamil"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og.png`;

  return {
    title: "MITO — Tamil Nadu Land Intelligence",
    description: "Evidence-backed land prices, guideline values, planning context and coverage transparency across Tamil Nadu.",
    openGraph: {
      title: "MITO — Tamil Nadu Land Intelligence",
      description: "Understand the evidence behind Tamil Nadu land values.",
      type: "website",
      images: [{ url: socialImage, width: 1680, height: 945, alt: "MITO Tamil Nadu land intelligence map" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "MITO — Tamil Nadu Land Intelligence",
      description: "Understand the evidence behind Tamil Nadu land values.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${notoTamil.variable}`}>{children}</body>
    </html>
  );
}
