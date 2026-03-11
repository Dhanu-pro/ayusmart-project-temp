import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const badgeVariants: Record<BadgeVariant, string> = {
  default: "border-transparent bg-slate-900 text-white",
  secondary: "border-transparent bg-slate-100 text-slate-900",
  destructive: "border-transparent bg-rose-600 text-white",
  outline: "text-slate-900 border-slate-300",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
