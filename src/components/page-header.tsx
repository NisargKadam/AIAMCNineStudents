export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <p className="text-accent mb-2 text-xs font-bold tracking-[.18em] uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-[-.03em] text-balance text-white sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}
