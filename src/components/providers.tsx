"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ className: "font-sans" }}
        />
      </ThemeProvider>
    </SessionProvider>
  );
}
