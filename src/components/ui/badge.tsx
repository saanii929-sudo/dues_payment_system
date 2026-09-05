import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        success: "bg-success-muted text-success",
        pending: "bg-pending-muted text-pending",
        danger: "bg-danger-muted text-danger",
        neutral: "bg-surface-muted text-ink-muted",
        info: "bg-accent-muted text-accent",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
