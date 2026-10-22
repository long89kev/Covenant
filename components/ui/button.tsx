import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-control border border-transparent text-body font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-cobalt text-white hover:bg-cobalt-hover",
        outline: "border-border bg-card text-ink hover:border-border-strong hover:bg-subtle",
        secondary: "bg-cobalt-soft text-cobalt-ink hover:bg-[#dde6ff]",
        ghost: "text-ink-secondary hover:bg-subtle hover:text-ink",
        destructive: "border-danger/40 bg-danger-soft text-danger-ink hover:border-danger hover:bg-[#fbe1e5]",
        link: "text-cobalt-ink underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-10 gap-2 px-4 py-2 pointer-coarse:min-h-11",
        xs: "min-h-7 gap-1 px-2 text-small [&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-8 gap-1.5 px-3 text-small pointer-coarse:min-h-11 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-11 gap-2 px-5 text-[15px]",
        icon: "size-10 pointer-coarse:size-11",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
