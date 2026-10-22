import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-control border border-border bg-card px-3.5 py-1 text-body text-ink transition-colors outline-none placeholder:text-ink-muted hover:border-border-strong focus-visible:border-cobalt focus-visible:ring-3 focus-visible:ring-cobalt/20 disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-danger",
        className
      )}
      {...props}
    />
  )
}

export { Input }
