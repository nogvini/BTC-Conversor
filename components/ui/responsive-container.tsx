import * as React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  padding?: "none" | "sm" | "md" | "lg"
  centerContent?: boolean
}

const maxWidthClasses = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  full: "max-w-full",
}

const paddingClasses = {
  none: "px-0",
  sm: "px-2 sm:px-4",
  md: "px-4 sm:px-6",
  lg: "px-4 sm:px-6 md:px-8",
}

export function ResponsiveContainer({
  children,
  className,
  maxWidth = "xl",
  padding = "md",
  centerContent = true,
  ...props
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn(
        "w-full",
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        centerContent && "mx-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
} 