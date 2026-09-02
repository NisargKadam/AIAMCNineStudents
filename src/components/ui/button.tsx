import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const styles = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 active:scale-[.98]",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-white shadow-[0_8px_28px_rgba(214,64,26,.25)] hover:bg-[#e34b23]",
        secondary:
          "border border-white/10 bg-white/[.06] text-foreground hover:bg-white/[.1]",
        ghost: "text-muted hover:bg-white/[.06] hover:text-white",
        danger: "bg-red-500/15 text-red-300 hover:bg-red-500/25",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof styles> {
  asChild?: boolean;
}
export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(styles({ variant, size }), className)} {...props} />
  );
}
