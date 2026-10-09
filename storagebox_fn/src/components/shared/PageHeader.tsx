import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between lg:mb-8">
      <div className="grid gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
        {description && <div className="text-base text-muted-foreground md:text-lg">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-semibold md:text-xl">{children}</h2>
      {actions}
    </div>
  );
}
