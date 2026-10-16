import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <img src="/hours-mark.svg" alt="" aria-hidden="true" className={cn("size-6", className)} />
  );
}
