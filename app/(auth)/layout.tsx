import { Point } from '@/components/atoms/Point';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="trame-point flex min-h-dvh items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-extrabold text-ink sm:text-3xl">CUPDOM</span>
          <span className="text-ink"><Point size={10} /></span>
        </div>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6">{children}</div>
      </div>
    </main>
  );
}
