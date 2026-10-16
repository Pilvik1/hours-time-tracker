export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string | undefined;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 py-2">
      <div className="min-w-0">
        <h1 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  );
}
