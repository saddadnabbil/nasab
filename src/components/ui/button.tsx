import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-sans font-medium transition-[transform,background-color,color,opacity,box-shadow] duration-150 ease-out select-none disabled:pointer-events-none disabled:opacity-40 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary hover:bg-primary/90",
        secondary: "bg-canvas text-ink hover:bg-surface-soft",
        inverse: "bg-canvas text-ink hover:bg-on-inverse-soft/20",
        magenta: "bg-accent-magenta text-on-primary hover:opacity-90",
        danger: "bg-danger text-on-primary hover:bg-danger/90",
        "danger-outline": "bg-canvas text-danger ring-1 ring-danger/30 hover:bg-danger-soft",
        ghost: "bg-transparent text-ink hover:bg-surface-soft",
        outline: "bg-canvas text-ink ring-1 ring-hairline hover:bg-surface-soft",
      },
      size: {
        default: "h-11 rounded-pill px-6 text-[16px] leading-[1.4] sm:text-[18px]",
        sm: "h-9 rounded-pill px-4 text-[14px]",
        lg: "h-12 rounded-pill px-7 text-[18px] sm:text-[20px]",
        icon: "size-10 rounded-full",
        "icon-sm": "size-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
