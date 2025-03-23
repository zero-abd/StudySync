"use client"

import { cn } from "@/lib/utils"

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <div
      className={cn("animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full", className)}
      {...props}
    >
      <span className="sr-only">Loading</span>
    </div>
  )
} 