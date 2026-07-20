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
        "inline-flex items-center justify-center gap-2 font-bold rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        {
          "bg-brand text-white hover:bg-brand-dark": variant === "primary",
          "bg-ink text-white hover:bg-ink/90": variant === "secondary",
          "bg-transparent text-ink hover:bg-subtle": variant === "ghost",
          "bg-danger text-white hover:bg-danger/90": variant === "danger",
          "border border-border bg-surface text-ink hover:bg-subtle":
            variant === "outline",
          "h-9 px-3 text-sm": size === "sm",
          "h-12 px-5 text-[15px]": size === "md",
          "h-14 px-6 text-base": size === "lg",
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
