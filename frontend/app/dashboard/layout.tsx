import Dashboard from "@/components/dashboard"
import type { ReactNode } from "react"

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return <Dashboard>{children}</Dashboard>
} 