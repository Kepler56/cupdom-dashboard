/**
 * The portal's one surface primitive. 16 px radius and a warm border — the
 * charte's geometry, in one place, so no module invents its own.
 */
export function Card({
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={['rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5', className ?? ''].join(' ')}>
      {(title || action) && (
        <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title && <h2 className="font-display text-base font-bold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
