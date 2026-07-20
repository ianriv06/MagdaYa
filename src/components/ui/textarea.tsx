import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, id, ...props }: TextareaProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          "w-full min-h-24 px-4 py-3 rounded-2xl border-2 border-border bg-surface text-ink placeholder:text-muted/70 focus:outline-none focus:border-brand transition-colors resize-none",
          className
        )}
        {...props}
      />
    </div>
  );
}
