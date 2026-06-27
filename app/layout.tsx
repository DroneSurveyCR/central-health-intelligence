import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

const serif = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-serif", display: "swap" });
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans", display: "swap" });
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { ToastProvider } from "@/components/Toast";
import { getServerLang } from "@/lib/i18n/getServerLang";

export const metadata: Metadata = {
  title: { default: "Personal Health Intelligence", template: "%s · PHI" },
  description: "Your practice, on one platform.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PHI",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#14834e",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const lang = await getServerLang();
  return (
    <html lang={lang} className={`${serif.variable} ${sans.variable}`}>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <LanguageProvider initialLang={lang}>
          <ToastProvider>
            {children}
            <PWARegister />
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
