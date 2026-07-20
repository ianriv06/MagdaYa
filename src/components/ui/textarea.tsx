import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, id, ...props }: TextareaProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-ink">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          "w-full min-h-24 px-4 py-3 rounded-lg border border-border bg-white text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors resize-none",
          className
        )}
        {...props}
      />
    </div>
  );
}
