import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { themeNoFlashScript } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Hestia",
  description:
    "Track multi-currency holdings, watchlists and live market prices in one clean dashboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: themeNoFlashScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
