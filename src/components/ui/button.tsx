import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative isolate inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-xl border border-transparent text-sm font-semibold tracking-tight shadow-elevation-1 transition-smooth outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-brand-navy via-brand-sky to-brand-sky text-primary-foreground hover:brightness-110 dark:from-brand-sky dark:via-brand-sky dark:to-brand-sky dark:text-brand-navy",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border-2 border-brand-navy/20 bg-card text-brand-navy hover:border-brand-sky hover:bg-secondary hover:text-brand-navy dark:border-brand-sky/30 dark:bg-card/80 dark:text-brand-sky dark:hover:bg-secondary",
        secondary:
          "border-brand-sky/15 bg-secondary text-secondary-foreground hover:bg-brand-sky/15 dark:bg-secondary dark:hover:bg-brand-sky/20",
        ghost:
          "border-transparent bg-transparent shadow-none hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/80",
        link: "border-transparent bg-transparent text-primary shadow-none underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2 has-[>svg]:px-3",
        xs: "h-7 gap-1 rounded-lg px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 rounded-lg px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-2xl px-6 text-base has-[>svg]:px-4",
        icon: "size-11",
        "icon-xs": "size-7 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9 rounded-lg",
        "icon-lg": "size-12 rounded-2xl",
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
