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
      <header className="mb-6 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
          Personal Lending Tracker
        </p>
        <h1 className="text-2xl font-semibold leading-tight text-zinc-900">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm text-zinc-600">{subtitle}</p>
        ) : null}
      </header>
      <section className="rounded-lg border border-zinc-200 bg-white px-4 py-5 shadow-sm">
        {children}
      </section>
    </MobileShell>
  );
}
