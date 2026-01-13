"use client"

import { ThemeProvider } from "next-themes"
import { QueryProvider } from "@/context/TanstackProvider"
import PWARegister from "./pwa-register"
import { Toaster } from "@/components/ui/sonner"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryProvider>
        <PWARegister />
        {children}
        <Toaster position="top-center" />
      </QueryProvider>
    </ThemeProvider>
  )
}
