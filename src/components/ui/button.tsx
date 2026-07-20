import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  loading,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        {
          "bg-brand text-white hover:bg-brand-dark shadow-sm shadow-brand/20":
            variant === "primary",
          "bg-ink text-white hover:bg-ink/90": variant === "secondary",
          "bg-transparent text-ink hover:bg-black/5": variant === "ghost",
          "bg-danger text-white hover:bg-danger/90": variant === "danger",
          "border-2 border-border bg-surface text-ink hover:border-ink/30":
            variant === "outline",
          "h-9 px-3 text-sm": size === "sm",
          "h-12 px-5 text-base": size === "md",
          "h-14 px-6 text-lg": size === "lg",
        },
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
