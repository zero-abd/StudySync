import { ThemeProvider } from "@/components/theme-provider"
import type { Metadata } from "next"
import { JetBrains_Mono } from "next/font/google"
import type React from "react"
import "./globals.css"

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Student Dashboard",
  description: "Track your classes, deadlines, and progress",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={jetbrainsMono.className}>
        <ThemeProvider attribute="class" defaultTheme="light">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

