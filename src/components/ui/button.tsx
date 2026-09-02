import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const styles = cva(
  "relative inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-[transform,background-color,color,box-shadow,border-color] duration-200 disabled:pointer-events-none disabled:opacity-45 active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-ember text-white shadow-[0_10px_26px_-10px_var(--ember)] hover:brightness-110 hover:shadow-[0_16px_34px_-12px_var(--ember)]",
        secondary:
          "border border-[var(--line-strong)] bg-[var(--raised)] text-ink hover:border-[var(--ink-faint)] hover:bg-[color-mix(in_oklab,var(--raised)_70%,var(--ink)_8%)]",
        ghost: "text-dim hover:bg-[var(--raised)] hover:text-ink",
        outline:
          "border border-[var(--line-strong)] text-ink hover:border-ember hover:text-ember",
        danger:
          "border border-[color-mix(in_oklab,var(--alert)_35%,transparent)] bg-[color-mix(in_oklab,var(--alert)_14%,transparent)] text-[var(--alert)] hover:bg-[color-mix(in_oklab,var(--alert)_24%,transparent)]",
        verified:
          "border border-[color-mix(in_oklab,var(--verified)_35%,transparent)] bg-[color-mix(in_oklab,var(--verified)_13%,transparent)] text-[var(--verified)] hover:bg-[color-mix(in_oklab,var(--verified)_22%,transparent)]",
      },
      size: {
        default: "h-10 px-4 text-sm",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-10",
        "icon-sm": "size-8",
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
