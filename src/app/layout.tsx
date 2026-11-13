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
  icons: { icon: "/study-ai-icon.svg", apple: "/study-ai-icon.svg" },
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
