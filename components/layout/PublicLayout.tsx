import MobileShell from "./MobileShell";

type PublicLayoutProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export default function PublicLayout({
  title,
  subtitle,
  children,
}: PublicLayoutProps) {
  return (
    <MobileShell>
      <header className="mb-8 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
          Personal Lending Tracker
        </p>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-zinc-900">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm leading-relaxed text-zinc-600">{subtitle}</p>
        ) : null}
      </header>
      <section className="rounded-2xl border border-zinc-200/70 bg-white/90 px-5 py-6 shadow-sm backdrop-blur">
        {children}
      </section>
    </MobileShell>
  );
}
