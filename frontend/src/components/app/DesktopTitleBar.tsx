import { BrandMark } from "./BrandMark";

export function DesktopTitleBar() {
  return (
    <div className="desktop-drag-region flex h-[38px] shrink-0 items-center border-b border-border bg-background pl-3 pr-36 select-none">
      <BrandMark className="size-5" />
      <span className="ml-2 text-[12px] font-semibold tracking-tight text-foreground">Hours</span>
      <span className="ml-2 text-[10px] text-muted-foreground">Private time tracking</span>
    </div>
  );
}
