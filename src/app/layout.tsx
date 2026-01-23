import { Inter, Hind_Siliguri } from "next/font/google";
import React from "react";
import "./globals.css";
import { Providers } from "./provider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });
const hindSiliguri = Hind_Siliguri({
  weight: ["400", "700"],
  subsets: ["bengali"],
});

export const metadata = {
  title: "Shikhbo AI - Your Virtual Tutor",
  description:
    "Educational AI chat assistant for students in Bangladesh - powered by advanced AI models. Multilingual support with voice interaction.",
  keywords: [
    "AI",
    "chat",
    "assistant",
    "tutor",
    "education",
    "bengali",
    "bangladesh",
    "multilingual",
    "voice",
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
      "Educational AI chat assistant for students in Bangladesh with multilingual support.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shikhbo AI - Your Virtual Tutor",
    description:
      "Educational AI chat assistant for students in Bangladesh with multilingual support.",
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
        "Educational AI chat assistant for students in Bangladesh with multilingual support",
      url: "https://shikhbo-ai.vercel.app",
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${hindSiliguri.className}`}>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
