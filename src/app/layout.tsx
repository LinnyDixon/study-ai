import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./account.css";
import "./navigation.css";
import "./ai-chat.css";
import "./landing.css";
import "./admin/admin.css";
import "./red-theme.css";
import { AppLocaleProvider } from "@/components/app-locale";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: { default: "STUDY AI — Tu espacio personal de estudio", template: "%s | STUDY AI" },
  description: "Lee tus materiales y conversa con una IA de estudio. Un espacio para aprender desde el celular o la computadora.",
  applicationName: "STUDY AI",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/study-ai-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/study-ai-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "STUDY AI", statusBarStyle: "default" },
  robots: { index: true, follow: true },
  openGraph: { siteName: "STUDY AI", type: "website", locale: "es_UY" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><AppLocaleProvider>{children}</AppLocaleProvider></body>
    </html>
  );
}
