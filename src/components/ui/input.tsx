import type { InputHTMLAttributes, LabelHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-md border border-hairline bg-canvas px-3.5 text-[16px] font-normal text-ink placeholder:text-ink/40 focus:outline-2 focus:outline-offset-0 focus:outline-ink",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-md border border-hairline bg-canvas px-3.5 py-3 text-[16px] font-normal text-ink placeholder:text-ink/40 focus:outline-2 focus:outline-offset-0 focus:outline-ink",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("body-sm block text-ink", className)} {...props} />;
}
