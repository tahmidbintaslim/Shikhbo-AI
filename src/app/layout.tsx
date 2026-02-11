import { Inter, Hind_Siliguri, Noto_Sans_Bengali, Outfit } from "next/font/google";
import React from "react";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "./provider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const hindSiliguri = Hind_Siliguri({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["bengali"],
  variable: "--font-hind",
  display: "swap",
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata = {
  title: "Shikhbo AI - Your Virtual Tutor",
  description:
    "AI tutor for students in Bangladesh. Get instant help with class 1–12 subjects in Bangla and English.",
  keywords: [
    "AI",
    "chat",
    "assistant",
    "tutor",
    "education",
    "bengali",
    "bangladesh",
    "multilingual",
    "qwen",
    "huggingface",
  ],
  authors: [{ name: "Shikhbo AI Team" }],
  creator: "Shikhbo AI",
  publisher: "Shikhbo AI",
  applicationName: "Shikhbo AI",
  category: "education",
  classification: "AI Tutor",
  openGraph: {
    title: "Shikhbo AI - Your Virtual Tutor",
    description:
      "AI tutor for students in Bangladesh with Bangla and English support.",
    type: "website",
    locale: "bn_BD",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shikhbo AI - Your Virtual Tutor",
    description:
      "AI tutor for students in Bangladesh with Bangla and English support.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  other: {
    "application/ld+json": JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Shikhbo AI",
      description:
        "AI tutor for students in Bangladesh with Bangla and English support.",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web Browser",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "BDT",
      },
      creator: {
        "@type": "Organization",
        name: "Shikhbo AI Team",
      },
    }),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${outfit.variable} ${hindSiliguri.variable} ${notoSansBengali.variable} antialiased`}
      >
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
